# 收银台免登录支付契约（匿名收银台）

状态：**已定稿**（2026-11-14）。决策方：产品负责人。
适用仓库：`sdkwork-cloudrouter`、`sdkwork-order`、`sdkwork-payment`、`sdkwork-iam`、`sdkwork-utils`。

本文是收银台免登录改造的**唯一契约来源**。任何实现与本文冲突，以本文为准；修改本文需同步修改五个仓库。

---

## 1. 已锁定决策

| 决策 | 结论 |
|---|---|
| 移动端扫码是否要求登录 | **不要求**（免登录支付） |
| 是否做「扫码自动登录」 | **不做**。支付授权不等于用户身份认证 |
| 授权载体 | 订单级签名能力令牌（capability token），只证明「这一单可被支付」 |
| 代付 | **允许**。任何人持链接均可付款，订单归属不变 |
| 支付成功后 | **不强制登录**，仅引导「登录后管理订单」 |
| 令牌里的裸订单号 | **禁止**。URL 只出现令牌 |
| 微信 H5 支付 / 支付宝手机网站支付 | 已开通并已配置，可直接使用 |
| 余额支付 | 匿名态**不提供**（余额必须实名） |

### 为什么不是「自动登录」

1. 二维码会被截图、转发、投屏。把会话放进二维码，等于把整站身份（余额、订单、密钥）交给任何拿到图片的人；把「只能付这一单」的令牌放进去，最大损失是「别人帮你付了钱」。
2. 扫码设备通常不是下单设备（PC 下单 → 手机扫），手机上本来没有会话。「自动登录」只能靠「拿订单号换会话」，是用弱凭证换强凭证，安全性低于本方案。
3. 订单已有归属（`commerce_order.owner_user_id`），支付只需知道「哪一单」，无需知道「你是谁」。

---

## 2. 令牌格式（规范性）

实现：`sdkwork_utils_rust::commerce_cashier_token`。

```
cashier_token = "v1" "." base64url(utf8 json claims) "." base64url(hmac_sha256("v1." + payload, tenant_key))
```

claims（JSON，camelCase）：

| 字段 | 类型 | 说明 |
|---|---|---|
| `tenantId` | string | 归属租户，验签密钥必须属于该租户 |
| `orderId` | string | 订单主键 |
| `outTradeNo` | string | 商户流水号，建支付时与库中比对 |
| `amount` | string | **最小单位十进制字符串**（API_SPEC §13.6，禁止浮点） |
| `currencyCode` | string | ISO-4217 |
| `scene` | string | `checkout` / `virtual` / `recharge`，仅用于渲染 |
| `audience` | string | 固定 `cashier` |
| `issuedAt` `expiresAt` | i64 | unix 秒 |
| `tokenId` | string | 审计关联 + 幂等键派生 |

### 强制规则

- **验签顺序固定**：形状 → 版本 → 长度 → 签名 → JSON → claims 校验 → audience → 过期。签名通过前不解析任何内容。
- **版本前缀参与签名域**，防止 `v2` 降级重放为 `v1`。
- **按租户取密钥**（SECURITY_SPEC §1.1）。密钥所属租户与 claims 租户不一致 → fail-closed。
- **`secret` 为空即拒绝**（签发与验签都一样），禁止静默退化为不校验。
- **TTL = min(订单剩余有效期, 收银台 15 分钟 TTL)**；订单进入终态（已支付/已关闭/已退款）后令牌立即失效。
- `amount` 必须是纯数字字符串；`orderId`/`outTradeNo`/`tokenId` 非空。

### 对外错误收敛

所有校验失败对外**统一表现为 404**（不区分未知/被篡改/已过期），内部保留具体变体用于审计与测试。

### 2.1 租户密钥派生（强制）

```rust
sdkwork_utils_rust::derive_cashier_token_key(secret, tenant_id) -> [u8; 32]
// info = "tenant={tenant_id};purpose=cashier-token"
// salt = "sdkwork.commerce.cashier-token.v1"
```

- **签发方与所有校验方必须调用同一个函数**。任一方自行派生都会导致全量令牌不可校验。
- 密钥材料来自**专用部署密钥** `SDKWORK_COMMERCE_CASHIER_TOKEN_SECRET`（≥ 32 字节）。
- **不得复用支付渠道凭据主密钥**：order / iam 服务需要校验令牌，但它们没有任何理由持有能解密 PSP 商户私钥的密钥。共用主密钥会把每个校验方变成凭据解密方，属于权限放大。
- 未配置该密钥 → 不签发令牌，收银台保持登录态（见 §2.2）。
- 配置了但长度不足 → 硬失败，不得静默降级。

### 2.2 灰度模型：令牌即开关

| 部署状态 | 链接形态 | 收银台行为 |
|---|---|---|
| 未配置 `SDKWORK_COMMERCE_CASHIER_TOKEN_SECRET` | `{base}/cashier/{orderId}?scene=..&outTradeNo=..` | 无法签发令牌；H5 换令牌 404 → **收银台错误提示，不跳登录** |
| 已配置 | `{base}/cashier/{token}` | 免登录 |
| 已配置（旧链接） | `{base}/cashier/{orderId}?scene=..&outTradeNo=..` | H5 调 `POST /cashier/links` 换取令牌后免登录；换取失败同样显示错误提示，**不跳登录** |

- **令牌是否存在就是逐链接的灰度开关**，不需要额外的全局 feature flag。
- 旧链接不要求重新出码：H5 入口用 `orderId + outTradeNo` 换取令牌（见 §4.4），
  已打印/已发出的二维码在配置密钥后同样免登录。
- 顺序约束：`SDKWORK_COMMERCE_CASHIER_TOKEN_SECRET` 必须在 S5（H5 宿主支持 `/cashier/:token`）上线**之后**才能配置。提前配置会让扫码落到只认 orderId 的旧路由。

### 2.3 租户密钥 epoch 与轮换

实现：`sdkwork_utils_rust::derive_cashier_token_key_with_epoch`。

- 根密钥仍是部署密钥 `SDKWORK_COMMERCE_CASHIER_TOKEN_SECRET`（≥32 字节；容器安装在
  `scripts/generate-dev-secrets.mjs` 中自动生成 64 hex，不需要人工填写）。
- 租户签名密钥 = `HKDF(根密钥, "tenant={tenant};[epoch={n};]purpose=cashier-token")`；
  **epoch 1 保留原派生**，因此存量令牌不失效。
- 令牌 claims 增加 `epoch`；校验方用**令牌里携带的 epoch** 派生密钥，所以 IAM/订单
  校验令牌时不需要读 commerce 库。篡改 epoch 只会让验签失败。
- **轮换 = 租户 epoch + 1**（支付中心 → 支付设置 → 收银台密钥，一键刷新）。新令牌立即
  使用新 epoch；旧 epoch 已签发的令牌在 15 分钟 TTL 内继续校验，因此不需要宽限表、
  不需要重启、多副本天然一致。
- 解析顺序：租户行 → 平台 `0` 行 → epoch 1。表
  `commerce_payment_cashier_token_setting` 只存**公开 epoch 与轮换元数据**，不存密钥；
  数据库备份/只读账号无法伪造收银台令牌。
- 管理面：`GET /backend/v3/api/payments/cashier_token_settings` 与
  `POST /backend/v3/api/payments/cashier_token_settings/rotate`；复用
  `commerce.payments.domain_settings.read|update` 权限，响应永不返回密钥。

---

## 3. 链接形态变更

| | 旧（登录态） | 新（匿名） |
|---|---|---|
| 收银台 URL | `{base}/cashier/{orderId}?scene=..&outTradeNo=..` | `{base}/cashier/{token}` |
| 构建函数 | `build_commerce_cashier_url_with_base` | `build_commerce_cashier_token_url_with_base` |
| 是否含裸订单号 | 是 | **否** |
| 是否含 query 参数 | 是 | **否**（全部绑定进令牌） |

- 旧函数保留，供登录态路径与灰度回退使用。
- 旧链接 `/cashier/{orderId}?outTradeNo=..` 保留 30 天。H5 入口用
  `POST /app/v3/api/cashier/links` 把 `orderId + outTradeNo` 换成令牌后再渲染匿名
  收银台；换取失败（无密钥、流水号不匹配、订单不存在）才回落到登录态。不要求
  运营重新生成已发出的二维码。

### 三处链接生成点 → 一个收敛点（已实现）

三个入口都会产出 `cashierUrl` / `qrCodePayload`，但**都收敛到同一个富化函数**：

```
owner_order_payment_params(...)            // 仍是旧链接
        ↓
POST /orders/{id}/payments  ─┐
GET  /orders/{id}/payments  ─┤→ enrich_owner_order_payment_postgres → *_locked
GET  /orders/{id} (record)  ─┘        ↓
                              铸造令牌 + 覆盖 cashierUrl / qrCodePayload
                                        ↓
                             apply_default_h5_return_url(带令牌)
                                        ↓
                             apply_configured_h5_cashier_url(带令牌)
```

| # | 位置 | 处理 |
|---|---|---|
| 1 | `owner_payment_params::owner_order_payment_params` | **不改**，继续产出旧链接，作为无密钥时的回退 |
| 2 | `owner_order_checkout::enrich_owner_order_payment_postgres_locked` | 单点铸造令牌并覆盖链接（含幂等重放与支付记录富化两条入口） |
| 3 | `owner_order_checkout::apply_configured_h5_cashier_url` | 令牌链接优先；无令牌时保持原有「按配置域名重拼」行为 |
| 4 | `owner_order_checkout::apply_default_h5_return_url` | 令牌存在时 `return_url` 用令牌链接 |

优先序（不可调换）：**令牌链接 > 运营配置域名 > 部署默认域名 > 渠道返回链接**。

只改一处的好处：不存在「某个入口忘了签发」导致同一订单在不同页面给出不同形态链接的静默不一致。

---

## 4. 匿名端点契约

四个端点全部：`RouteAuth::Public`、OpenAPI `security: []`、`x-sdkwork-auth-mode: anonymous`；生成的 SDK 自动跳过凭证。

| 方法 | 路径 | 用途 | 幂等 |
|---|---|---|---|
| GET | `/app/v3/api/cashier/{token}` | 收银台视图 | — |
| POST | `/app/v3/api/cashier/{token}/payments` | 创建支付 | **服务端派生**（`tokenId` + method） |
| GET | `/app/v3/api/cashier/{token}/status` | 轮询支付状态 | — |
| POST | `/app/v3/api/cashier/links` | 旧链接换令牌（`orderId` + `outTradeNo`） | 每次签发新 `tokenId`，无需客户端幂等键 |

> 建支付路由**不声明** `x-sdkwork-idempotent` / `with_idempotent`，因为该标记要求客户端提供 `Idempotency-Key` 头。匿名收银台的幂等键必须由服务端派生：客户端一旦能自选幂等键，重试即可绕过幂等再建一笔支付。换令牌接口同理不读取客户端幂等键。

实现状态：路由、处理器、白名单 DTO 与 OpenAPI 均已落地；限流键策略见 §6。

### 4.1 响应白名单（`data.item`）

允许：`orderId`（雪花字符串）、`orderSn`、`subject`、`amount`、`currencyCode`、`expireTime`、`status`、`payable`、`allowedMethods`、`scene`。

**禁止返回**：下单人手机号/昵称/地址、`userId`、`ownerUserId`、`organizationId`、余额、历史订单、收货信息全文、任何密钥或内部 id。

> 归属字段（`owner_user_id` / `organization_id`）由服务端从订单行读出，仅用于构造支付命令，**不进入任何对外 DTO**。匿名路径是「以订单名义收款」，不是「扩大调用者可读范围」。

### 4.2 建支付请求

```
POST /app/v3/api/cashier/{token}/payments
{ "paymentMethod": "wechat_pay" | "wechat_h5" | "alipay" | "alipay_wap" }
```

- 服务端**不接受** `orderId` / `amount` / `openid` 参数：前两者取自令牌并与库中订单比对，openid 只能来自 §5.1 的令牌绑定。
- 幂等键 = `tokenId + paymentMethod`（服务端派生，客户端不可指定）。
- `wechat_jsapi` 在 S4 完成 openid 令牌绑定后才加入可接受集合；在此之前请求该方式返回 400。
- `wechat_h5` 需要 `client_ip`，由服务端从可信代理解析后注入 `metadata.client_ip`。
- `balance` 永不提供（身份绑定工具）。

### 4.3 错误码

| 场景 | HTTP | code |
|---|---|---|
| 令牌无效/篡改/未知订单 | 404 | 40401 |
| 令牌过期 | 404 | 40401（对外与未知等价） |
| 订单已支付/已关闭 | 409 | 40902 |
| 金额或币种与订单不一致 | 409 | 40903 |
| 支付方式不可用（含 `balance`、未上线的 `wechat_jsapi`） | 400 | 40001 |
| 限流 | 429 | 42901 |

### 4.4 旧链接换令牌

```
POST /app/v3/api/cashier/links
{ "orderId": "...", "outTradeNo": "..." }

201 { "code": 0, "data": { "item": { "token": "v1...." } }, "traceId": "..." }
```

- 校验：`outTradeNo` 必须与订单的 `request_no`、`order_no`，或该订单最近一次
  `commerce_payment_attempt.out_trade_no` 之一常量时间相等。
- `orderId` 单独永远不够；任何不匹配（未知订单、流水号错误、未配置密钥）统一
  `404` / `40401`，不区分原因，避免被用作订单枚举或时序探测。
- 令牌 TTL 15 分钟；订单终态由收银台视图的 `payable` 与建支付路由的 `409` 共同兜底。
- H5 宿主只在路径段不是 `v1.` 令牌且 URL 带 `outTradeNo` 时调用；换取失败**显示收银台错误提示，不跳登录**（见 §4.5）。
- **换令牌无支付副作用**：只签发短期令牌，不创建支付意图/尝试。刷新或多开页面会得到不同
  `tokenId`，但建支付仍由订单服务按「订单 + 支付方式 + 支付元数据」复用已有 pending
  attempt 兜底，同一设备/渠道在 attempt 有效期内不会重复建单；`wechat_h5` 的渠道交易按
  `client_ip` 绑定，换网络时重建 attempt 是该渠道的要求，不是幂等缺口。

---

### 4.5 前端永不跳登录（强制）

收银台入口的解析结果**没有 login 分支**，只有 `resolved / pending / failed`：

| 解析结果 | 渲染 |
|---|---|
| 令牌格式 | 免登录收银台 |
| 旧链接（orderId + outTradeNo） | 换令牌中（loading）→ 成功即免登录收银台 |
| 换令牌失败 / 缺流水号 / 缺订单号 | **收银台错误外壳** + toast 提示 + 「重新加载」 |

理由：扫码的付款人没有账号上下文，把支付页变成登录表单一不能推进支付，二会让人以为必须注册。

**禁止**以下实现（曾被误用，属回归）：

- 解析失败后渲染 `OrderRouteShell`（会套 `AppAuthGate`）
- 在解析结果里保留 `kind: 'login'`
- 用 401/403 驱动跳转到 `/sign-in`

回归测试：`apps/sdkwork-cloudrouter-h5/tests/h5-cashier-routes.test.mjs`
断言源码中不存在 `kind: 'login'` 且未渲染 `AppAuthGate` 路径。

---

## 5. 三种扫码场景（渠道矩阵）

来源判定沿用现有 UA 规则（`PaymentEnvironment`），**不改**。

| # | 来源 | UA | 可见方式 | 实际 wire method | 说明 |
|---|---|---|---|---|---|
| 1 | 微信扫码 | `MicroMessenger` | 仅微信 | `wechat_jsapi` | 需 `snsapi_base` 取 openid，**不建会话** |
| 2 | 支付宝扫码 | `AlipayClient` | 仅支付宝 | `alipay_wap` | 页内跳转，不需要 openid |
| 3 | 浏览器/其它 App | 其它 | 微信 + 支付宝 | 微信 → `wechat_h5`；支付宝 → `alipay_wap` | 手机浏览器**不能**出二维码给自己扫 |
| 4 | 桌面浏览器 | 非移动 | 微信 + 支付宝 | `wechat_pay`(native) / `alipay`(native) | 现状不变，出二维码给手机扫 |

### 5.1 微信授权（场景 1）

现有 `oauth/wechat/payment/start` 要求登录态，因此新增**独立的匿名公开入口**（保持原 `start` 的会话语义不变，回归测试 `wechat_payment_oauth_start_keeps_requiring_dual_token` 继续有效）：

```
GET /app/v3/api/oauth/wechat/payment/cashier/start?cashierToken=<token>&redirect=<相对路径>
```

- 用令牌里的 `tenantId` 取该租户的微信 OAuth 配置（不依赖会话）；令牌无效/篡改/过期 → 404。
- `snsapi_base` 静默授权，回调换 openid 后**不创建 IAM 会话**。
- openid 绑定方式（已实现）：回调把 `tokenId` 记在 HttpOnly cookie 中，随后用**租户密钥**对
  `cashier-openid|<tokenId>|<openid>` 做 HMAC-SHA256，重定向回收银台时带上
  `openid` 与 `openidBinding` 两个参数。
- 订单侧建支付时用同一密钥重算并比对 `openidBinding`，不一致即拒绝。
  这样客户端无法自选 openid，也无法把为另一张令牌签发的 openid 挪用到本令牌上。
- 消息格式由 `sdkwork_utils_rust::cashier_openid_binding_message` 单点定义，避免签发/校验两侧格式漂移。

### 5.2 场景 3（手机浏览器）的修复

修复前：手机浏览器选微信 → wire method 仍是 `wechat_pay`（native），前端拿不到可跳转链接，退化为「请在微信中打开」的死路。

已实现：匿名收银台按环境收敛方法并为每种方法请求正确的渠道产品——手机浏览器下
- 微信 → `wechat_h5`（`/v3/pay/transactions/h5` → `h5_url`，需 `client_ip`，由服务端从可信代理解析后注入 `metadata.client_ip`）；
- 支付宝 → `alipay_wap`；
- 微信内 → `wechat_jsapi`（需 §5.1 的令牌绑定）；
- 支付宝内 → `alipay_wap`。

订单侧的可接受方法白名单已包含 `wechat_h5` 与 `wechat_jsapi`。

### 5.3 富化失败时不得降级成旧链接

令牌是在「渠道富化」阶段铸造的。若富化失败（渠道未配置、渠道故障），回退路径必须**补铸令牌**，
否则扫码链接会悄悄退回 `{base}/cashier/{orderId}`，再次变成登录墙。

已实现：`apply_cashier_capability_to_outcome` 对未富化的结果补铸能力令牌；币种从支付尝试行读取，
取不到则保持原样（绝不臆造金额或币种）。

---

## 6. 审计与风控

- 审计字段：`tokenId`、`orderId`、`tenantId`、`method`、`result`、IP、UA；**永不记录令牌原文**。
- 告警：同一 `tokenId` 短时间内多 IP 支付尝试、单令牌建支付失败次数超阈值。
- 限流键不使用原始令牌：用 `sha256(token)` 前 16 字节做键。

## 6.1 平台前置条件：网关必须能解密渠道凭据

统一网关（`sdkwork-api-cloud-gateway`）组合了 order/payment 面，因此**必须**在进程启动时安装支付凭据解密器
（`SDKWORK_PAYMENT_CREDENTIAL_MASTER_KEY_FILE` 指向的主密钥）。否则租户渠道凭据无法解密，
渠道注册表里没有适配器，每一次结账都会落到「未富化回退」。

该缺陷对**登录态收银台同样成立**，不是匿名通道特有的。判据（dev 实测）：

```
网关日志: payment provider is not configured（provider=alipay）
DB:       commerce_payment_attempt 已创建，status=pending
返回:     paymentParams 只有 cashierScene/cashierUrl/... 没有 payUrl
```

修复方式：网关启动时若检测到主密钥文件则安装 `LocalFilePaymentCredentialCipher`（幂等、缺失即跳过）。
在修复前，匿名通道仍可完整走到「创建支付尝试」，但拿不到渠道拉起参数。

---

## 7. 验收（每条都要有自动化测试）

### 7.0 可执行冒烟测试（运维/交付用）

```bash
node scripts/anonymous-cashier-smoke.mjs \
  --api http://127.0.0.1 --host api-dev.birdcoder.com \
  --order-id <uuid> --out-trade-no <流水号> [--create-payment] [--method alipay_wap]
# 或：pnpm test:anonymous-cashier -- --api ... --order-id ... --out-trade-no ...
```

逐条打印 PASS/FAIL 并以非零码失败，覆盖：

1. 旧链接对（orderId + outTradeNo）换到 `v1.` 令牌
2. 篡改令牌被拒（404）
3. 令牌在**无任何凭证头**的情况下读到收银台视图
4. 视图只含白名单字段（显式检查 `ownerUserId`/`organizationId`/`userId`/`phone`/`address`/`balance` 等）
5. 可选：从令牌建支付，且返回的 `cashierUrl` 仍是令牌形态
6. 匿名状态接口可用

自签名证书的 dev 环境加 `--insecure`（仅 dev）。

**契约层（sdkwork-utils）**
1. 令牌往返、篡改、跨租户密钥、过期、audience 不符、版本降级、空密钥 → 全部拒绝。
2. 令牌 URL 不含裸 `orderId`、不含 `scene=`/`outTradeNo=` query。
3. 空令牌 → 不生成 URL。

**签发层（sdkwork-payment）**
4. 默认域名下 `qrCodePayload` 带令牌。
5. **配置 H5 域名后 `cashierUrl` 仍带令牌**（防第 2 处覆盖）。
6. 支付宝 WAP `return_url` 带令牌（防第 3 处丢失）。

**接口层（sdkwork-order）**
7. 匿名可读收银台视图；响应不含 §4.1 禁止字段。
8. 篡改令牌 / 改金额 / 换订单 → 404 或 409，且无信息泄露。
9. 重复建支付 → 幂等，不产生第二笔。
10. 订单终态 → 不可支付。
10.1 旧链接换令牌：`orderId + outTradeNo` 匹配 `request_no` / `order_no` / 最近一次支付尝试的 `out_trade_no` → 201 签发令牌；任一不匹配 / 无密钥 → 404。

**宿主层（sdkwork-cloudrouter H5）**
11. 未登录打开 `/cashier/{token}` 直接渲染收银台，不出现登录面。
12. `/me/orders/*` 未登录仍走登录（不回归）。
13. 旧 `/cashier/{orderId}?outTradeNo=..` 未登录打开时先换令牌、直接渲染收银台；换取失败回落登录态。裸 `/cashier/{orderId}`（无 `outTradeNo`）仍走登录。

**端到端（真机）**
14. 微信扫 → 只出现微信 → 完成支付。
15. 支付宝扫 → 只出现支付宝 → 完成支付。
16. Safari/Chrome 扫 → 两种都在 → 各自能拉起并回落。

---

## 8. 落地顺序

| 阶段 | 仓库 | 内容 | 依赖 |
|---|---|---|---|
| S1 ✅ | sdkwork-utils | 令牌编解码 + 租户密钥派生 + 令牌版链接构建（23 测试通过，clippy 干净） | — |
| S2 ✅ | sdkwork-payment | 签发点接入：结算富化单点铸造令牌，令牌链接覆盖渠道返回与旧链接，WAP `return_url` 携带令牌（75 测试通过，新增 12 条） | S1 |
| S3 ✅ | sdkwork-order | 三个匿名端点 + 读模型 + 路由清单 + OpenAPI（58 单元测试、契约校验器全绿） | S1、S2 |
| S3.5 ✅ | sdkwork-order | `api:materialize` + `sdk:generate` 重新生成 `sdkwork-order-app-sdk`；匿名端点带 `skipAuth: true` | S3 |
| S4 ✅ | sdkwork-iam | 独立公开入口 `oauth/wechat/payment/cashier/start` + `openidBinding` 令牌绑定；订单侧校验（58 测试、IAM 37+31 测试） | S3 |
| S5 ✅ | sdkwork-cloudrouter H5 | `/cashier/{token}` 免登录分派 + 匿名收银台页 + 微信 JSAPI 授权跳转（typecheck + 79 测试） | S3、S4 |
| S6 ✅ | sdkwork-payment / order | 富化失败时补铸令牌，避免扫码降级为登录墙 | S2、S3 |
| S7 ✅ | sdkwork-order / cloudrouter H5 | 会员 H5 链接补签令牌 + 旧链接换令牌接口 + H5 入口分派（cargo 单元测试、H5 81 测试、typecheck） | S5、S6 |
| S8 ✅ | payment / order / IAM / cloudrouter | 租户密钥 epoch 派生 + 支付中心状态/一键刷新 + 安装自动生成根密钥 + 令牌 epoch 兼容 | S5–S7 |

灰度：S5 上线时用宿主配置开关，令牌链接与旧链接并行 30 天；S7 起旧链接在配置密钥后
也能换取令牌免登录，换取失败才回落登录态。

---

## 9. 非目标

- 不做扫码自动登录。
- 匿名态不开放订单详情、订单中心、退款申请。
- 不把支付成功自动转移订单归属（代付只记录付款关系）。
- 不改桌面端二维码交互。
