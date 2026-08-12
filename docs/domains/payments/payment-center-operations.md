# 支付中心完整配置操作指南

> 面向管理员的支付可用配置手册：从沙箱验证到生产 PSP 接入的完整操作路径。
> 涉及页面：管理后台 → 支付中心（`/admin/payments/*`）。

## 1. 配置对象关系

```
机构账户 (Provider Account)  ← 持有真实/沙箱凭据，可测试、轮换
   └─> 支付方式 (Payment Method)  ← 展示给用户的支付方式（methodKey）
   └─> 支付通道 (Payment Channel) ← 账户 × 方式 × 场景 × 币种 × 国家的具体路由通道
   └─> 路由规则 (Route Rule)      ← 按市场/币种/平台/优先级选择通道（可选）
支付意图 (Intent) ← 用户端发起支付时由订单网关创建，按通道路由
   └─> 支付尝试 (Attempt) → PSP 回调 (Webhook) → 意图成功
   └─> 对账任务 (Reconciliation Run) ← 创建后入队，由 Cloud Router 对账 worker 执行
```

关键事实：

- **沙箱（development/sandbox）不需要任何真实凭据**。种子数据预置了全链路：
  沙箱账户 `bootstrap-sandbox-default`（Dev、Active）、支付方式 `sandbox_test`、
  通道 `bootstrap-sandbox-test`（scene api、CNY）。
- **种子 PSP 账户（含生产模板）一律 active、开箱即用**：stripe/alipay/wechat_pay
  的 bootstrap 账户由支付服务在启动时自动填充**真实格式测试凭据**（可解析的 RSA
  私钥 PEM、`sk_test_` 密钥、32 位 API v3 Key），并写入
  `commerce_payment_provider_credential`（与管理员保存相同加密链路），因此一分钱
  测试点击后直接**真实调用 PSP**（微信/支付宝/Stripe 真实 API）。替换成真实商户
  凭据（机构账户编辑保存）即时生效，**无 Test → Activate 激活门**。
- **沙箱"支付成功"通过「模拟成功回调」驱动**：admin 支付中心的支付意图/支付尝试页，
  对 pending/processing 状态的记录提供行操作「模拟成功回调」，向后端 `dev/sandbox_trigger`
  入队一条沙箱回调，由订单网关消费后把该笔支付标记为 succeeded。
- 意图创建在**用户端**（订单网关），admin 侧只能查看与追踪。
- 对账任务创建后状态为 `queued`，由 **Cloud Router 对账 worker**
  （`SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_ENABLED=true` 启用）周期认领执行：
  对账 worker 只认领账单已导入且 `parse_status='parsed'` 的 run，读取内部
  `commerce_payment_attempt`/`commerce_refund` 账本生成差异，并把
  matched/mismatched/unmatched 计数与差异金额写回 run；账单尚未导入的 run
  保持 `queued` 等待下一周期。执行结果见支付中心 run 状态与
  `commerce_payment_reconciliation_item` 差异明细。

## 2. 路线 A：沙箱全链路验证（推荐先做）

### 第 1 步：确认沙箱机构账户
1. 进入 **支付中心 → 机构账户**（`/admin/payments/providerAccounts`）。
2. 列表应有种子账户 `bootstrap-sandbox-default`（环境 Dev、状态 Active、主密钥已配置）。
3. 若缺失，点 **创建账户**：
   - 账户编号：如 `sandbox-001`；机构：Sandbox；模式：直连；环境：开发环境
   - 商户 ID：任意（如 `sandbox_merchant`）
   - 主凭据：任意值（沙箱不校验，填 `sandbox` 即可）
   - 先以「停用」创建 → 点 **Test**（沙箱必通过）→ 编辑改为「启用」。

### 第 2 步：确认支付方式
- **支付方式** 页应存在 `sandbox_test`（种子，Active）。
- 缺失则新建：方式键 `sandbox_test`、显示名、机构 Sandbox、状态启用。

### 第 3 步：确认支付通道
- **支付通道** 页应存在 `bootstrap-sandbox-test`（场景 api、CNY、Active）。
- 缺失则新建：通道编号 `sandbox-test-01`；机构账户选沙箱账户；支付方式选 `sandbox_test`；
  场景 web（或 api）；币种 `CNY`；国家 `CN`；优先级 `100`；状态启用。

### 第 4 步（可选）：路由规则
- **路由规则** 页 → 新建规则：规则编号 `rule-sandbox-01`、通道选沙箱通道、币种 CNY、
  优先级 100、状态启用。

### 第 5 步：发起一笔沙箱支付
- 在用户端（控制台钱包/充值/下单）发起支付，订单网关创建支付意图。
- admin **支付意图** 页应出现新记录（状态 pending/processing、机构 sandbox）。

### 第 6 步：模拟成功回调（沙箱闭环）
- 在 **支付意图** 页（或 **支付尝试** 页），对 pending/processing 的行点 **「模拟成功回调」**。
- 确认后系统自动：找到 development/sandbox 机构账户 → 按意图关联的尝试
  （out_trade_no）入队沙箱回调 → 订单网关处理后支付置为 succeeded。

### 第 7 步：验证全链路
| 页面 | 期望 |
|---|---|
| 支付意图 | 状态 → succeeded |
| 支付尝试 | 出现对应尝试记录（机构交易号/外部交易号） |
| Webhook 事件 | 出现 `sdkwork.sandbox.triggered` 事件记录 |
| 对账任务 | 新建对账（机构沙箱、沙箱账户、manual、当天周期、CNY）→ 状态 queued |

## 3. 路线 B：生产环境接入

### 通用步骤
1. **创建/编辑机构账户**：机构、直连、生产环境，按 PSP 填入真实凭据（见下）。
   账户创建默认即为**启用**；保存凭据即时生效（加密入库），无激活门。
   种子生产账户（`bootstrap-payment-provider-*`）已启用并带真实格式测试凭据，
   直接编辑替换为真实商户凭据即可。
2. **确认支付方式**：种子已含 `stripe_card`、`alipay_*`、`wechat_*` 等 13 种方式。
3. **新建支付通道**：绑定账户 + 方式 + 场景 + 币种 + 国家 + 优先级。
4. **（可选）新建路由规则**：按市场/币种/平台路由。
5. **PSP 后台配置回调地址**：Webhook 端点指向订单网关
   `POST /app/v3/api/orders/payments/webhooks/{providerCode}`。
6. 用户端发起真实支付验证。

### Stripe
- 主凭据：`sk_live_xxx`（Stripe Dashboard → API Keys）
- Webhook 密钥：`whsec_xxx`（Dashboard → Webhooks 创建端点后获取）
- 商户 ID：任意内部标识；结算币种/国家：如 `USD`/`US`
- Dashboard Webhook 订阅：`payment_intent.succeeded` / `payment_intent.payment_failed` 等

### 支付宝
- 主凭据：商户应用私钥（PEM）；证书：支付宝公钥（PEM）
- App ID（元数据）；签名类型 RSA2；回调地址（notify URL）
- 通道方式：`alipay_qr`（当面付，扫码）/`alipay_wap`（H5 跳转）/`alipay_pc`
  （PC 表单）/`alipay_app`（App SDK，返回 `orderStr`）/`alipay_jsapi`
  （需 buyer_id）等，场景对应
- 支付宝开放平台配置回调

### 微信支付
对齐官方 API v3「证书密钥概览」/「如何使用微信支付公钥验签」最新凭据体系：

- **主凭据（请求签名）**：商户 API 私钥（PEM，`apiclient_key.pem`）；
  Webhook 密钥：**API v3 Key**（32 位，解密回调通知）；
  商户证书序列号（元数据，`metadata.merchantSerialNo`，取自商户 API 证书，
  放在请求头 `Authorization` 的 `serial_no`）
- **验签凭据（二选一，`metadata.signVerifyMode`）**：
  - `wechatpay_public_key`（**默认、官方推荐、新商户默认**）：微信支付公钥
    `pub_key.pem`（SPKI 公钥，无过期时间），公钥 ID（`PUB_KEY_ID_` 前缀）填
    `metadata.wechatpayPublicKeyId`；证书槽填公钥 PEM。获取路径：商户平台 →
    账户中心 → API 安全 → 微信支付公钥 → 申请公钥
  - `platform_certificate`：平台证书 `wechatpay_cert.pem`（X.509，5 年有效期，
    过期前需轮换），证书序列号填 `metadata.platformCertificateSerialNo`；
    证书槽填证书 PEM。获取路径：平台证书工具或 `GET /v3/certificates`
- **验签规则**：回调/应答头 `Wechatpay-Serial` 携带公钥 ID 或平台证书序列号，
  系统按配置的序列号匹配后，用对应公钥/证书对
  `{Wechatpay-Timestamp}\n{Wechatpay-Nonce}\n{body}\n` 做 SHA256withRSA 验签；
  已配置序列号时强制匹配（不匹配即验签失败），响应签名验证覆盖 2xx 应答
  （账单文件下载与空响应体跳过）
- 通道方式：`wechat_native`（扫码）/`wechat_jsapi`（公众号/小程序，需 openid）/
  `wechat_h5`（移动浏览器，需 client_ip 且商户号需配置 H5 域名白名单）/
  `wechat_app`（App SDK，返回 PayReq 参数）等
- 微信商户平台配置支付回调

### 各通道参数产出（与官方产品对齐）
| 通道 | 上游接口 | 收银参数 |
|---|---|---|
| `wechat_native` | `/v3/pay/transactions/native` | `qrCodeUrl`（code_url，扫码） |
| `wechat_jsapi` | `/v3/pay/transactions/jsapi` | `jsapiPayload`（wx.requestPayment 键集，需 openid） |
| `wechat_h5` | `/v3/pay/transactions/h5` | `payUrl`（h5_url，需 client_ip + 域名白名单） |
| `wechat_app` | `/v3/pay/transactions/app` | `appPayload`（PayReq 键集：appid/partnerid/prepayid/package=Sign=WXPay） |
| `alipay_qr` | `alipay.trade.precreate` | `qrCodeUrl`（qr_code，扫码优先） |
| `alipay_wap` | `alipay.trade.wap.pay` | `payUrl`/`payForm`（H5 收银台） |
| `alipay_pc` | `alipay.trade.page.pay` | `payUrl`/`payForm`（PC 收银台表单） |
| `alipay_app` | `alipay.trade.app.pay` | `orderStr`（App SDK 调起串） |
| `stripe_*` | PaymentIntent | `clientSecret` + `publishableKey`（前端 Stripe.js 卡支付表单，测试卡 4242...） |

## 4. 一分钱测试（扫码 / 跳转支付自检）

**支付方式** 页对支持扫码支付或网页跳转支付的方式提供行操作「一分钱测试」：创建
一笔 0.01 元的测试支付，通过**手机扫码**或**点击跳转到支付渠道收银台**完成支付，
验证完整支付链路（创建 → 支付 → 状态轮询 → 成功）。按钮仅在方式为**启用**状态
且满足以下能力时显示。

支持方式（与支付产品能力对齐）：

| 方式键 | 产品能力 | 支付形态 |
|---|---|---|
| `wechat_native` | 微信 Native 扫码 | 二维码扫码（`/v3/pay/transactions/native` → `code_url`） |
| `alipay_qr` | 支付宝当面付 | 二维码扫码（`alipay.trade.precreate` → `qr_code`） |
| `alipay_wap` | 支付宝手机网站支付 | 点击跳转 H5 收银台（`alipay.trade.wap.pay` → 跳转链接/表单） |
| `alipay_pc` | 支付宝 PC 网站支付 | 点击打开 PC 收银台表单自动提交（`alipay.trade.page.pay` → 表单） |
| `stripe_card` 等 `stripe_*` | Stripe 卡支付 | 对话框内 Stripe.js 卡表单直接支付（`clientSecret` + `publishableKey`，测试卡 `4242 4242 4242 4242`） |
| `sandbox_test` | 本地沙箱 | 对话框内「模拟支付成功」（sandbox webhook 回调，无需任何凭据） |

对话框按支付形态自动展示：二维码方式显示扫码区；跳转方式显示「打开支付页面」
按钮（新窗口打开支付渠道收银台）；Stripe 方式显示卡支付表单；沙箱方式显示
「模拟支付成功」；扫码+跳转并存时同时展示。微信/支付宝/Stripe 支付后若渠道
回调未达，可点「查询支付渠道状态」主动向 PSP 确认并更新本地状态。

**通道覆盖**：四个支付服务商均支持一分钱测试——微信（`wechat_native` 扫码）、
支付宝（`alipay_qr` 扫码 / `alipay_wap`、`alipay_pc` 网页收银台）、Stripe
（`stripe_*` 卡支付）、沙箱（`sandbox_test` 本地模拟）。`wechat_jsapi/h5/app`、
`alipay_app/jsapi` 需要 payer 标识（openid/buyer_id）或 App 唤起，属于 C 端
支付场景，不提供 admin 网页测试。

其他方式**不显示**「一分钱测试」按钮：

- `stripe_*`、`wechat_jsapi/h5/app`、`alipay_app/jsapi`：返回跳转链接/JSAPI/SDK
  调用参数或需要 payer 标识（openid/buyer_id），无法直接扫码或跳转测试
  （`wechat_h5` 另受域名白名单限制，暂不支持测试）；
- `sandbox_test`：沙箱提供商没有真实支付创建能力，支付成功通过「模拟成功回调」
  驱动（见路线 A 第 6 步），不提供扫码或跳转支付。

测试支付走与真实支付相同的通道路由。bootstrap 种子账户自带真实格式测试凭据且
处于启用状态，因此**开箱即可测**：点击后直接真实调用 PSP（微信
`/v3/pay/transactions/native`、支付宝 `alipay.trade.precreate`、Stripe
PaymentIntent）；凭据为测试格式时 PSP 会返回其真实认证错误（如微信
`SIGN_ERROR`、Stripe `Invalid API Key`），替换为真实凭据后即为真实成功。
以测试格式凭据调用失败时，错误信息会原样返回给管理员，便于核对字段。

测试订单的有效期为 15 分钟（与提供商收银窗口 900 秒一致），二维码在对话框内
显示剩余支付时间，过期后需重新创建。

**支付成功回调必须可达**（否则扫码支付成功但状态不会更新）：

- 平台侧：机构账户 metadata 配置 `notifyUrl`，或部署环境配置
  `ORDER_PAYMENT_WEBHOOK_BASE_URL`（指向订单网关
  `POST /app/v3/api/orders/payments/webhooks/{providerCode}`）；
  Cloud Router 自有回调链路的标准化配置见
  [§5 支付通知（notify）标准](#5-支付通知notify标准)。
- PSP 侧：在微信商户平台/支付宝开放平台把该回调地址配置到对应商户号/应用。
- 未配置时：微信 Native 创建会直接报「notify_url is required」；
  支付宝当面付可以创建并支付成功，但因没有异步通知，状态会停留在
  pending 直到二维码过期——两种情况都应先补齐回调配置再测试。

## 5. 支付通知（notify）标准

支付/退款通知的完整处理已**统一到 sdkwork-order 订单网关**，Cloud Router 不再
挂载任何 PSP 回调路径（历史 transit 链已清除）。

### 5.1 权威实现（sdkwork-order）

| 通知类型 | 端点 | 积木规范 | 编排入口 |
|---|---|---|---|
| 支付通知 | `POST /app/v3/api/orders/payments/webhooks/{providerCode}` | `crates/sdkwork-order-service/specs/payment-notify.spec.json` | `process_payment_notify` |
| 退款通知 | `POST /app/v3/api/orders/refunds/webhooks/{providerCode}` | `crates/sdkwork-order-service/specs/refund-notify.spec.json` | `process_refund_notify` |

- 支付通知：验签 → 规范化 → 幂等入库 → 按业务类型分发履约（积分/账户价值/
  会员/实物/外部），失败/关闭通知幂等标记订单；at-least-once 语义（PSP 重发
  经重放路径重新结算，各步幂等）。
- 回调免平台登录/双 token：webhook 路由为 `RouteAuth::Public`（匿名可达），PSP
  签名校验即身份认证，回调 URL 无需也无法携带平台会话凭据（框架对 public 路由
  跳过凭据解析、认证、授权与租户隔离阶段）。
- 退款通知：独立 URL 与独立 flow；按 `refund_no` 关联退款单并推进退款状态机，
  订单 `refund_status` 终态幂等（`refunded` 不被 `refund_failed` 覆盖）。

### 5.2 补偿轮询 worker（通知失败兜底）

通知接口失败（丢失/未送达）时，由订单网关内置补偿 worker 兜底：每 30 秒认领
`pending/processing` 支付与 `submitted/processing` 退款，查询 PSP 真实状态，
并以合成事件（`query:{provider}:{out_trade_no}:{mapped_status}`）复用同一
notify 积木完成状态同步与履约（幂等事件 id + 终态保护 + 履约键，webhook 已
成功后 worker 查询成为重放，绝不重复成功）。默认关闭，生产按需启用：
`SDKWORK_ORDER_PAYMENT_COMPENSATION_WORKER_ENABLED=1`（其余配置项见
sdkwork-order `TECH_ARCHITECTURE.md` §9）。

### 5.3 下单侧 notifyUrl（Cloud Router 支付意图 API）

`POST /payments/v3/payment_intents` 仍接受显式 `notifyUrl` 透传（绝对
http/https、≤2048、无 fragment），随请求传递给 PSP 适配器；标准 notify URL
的构造与注册由订单网关 checkout 负责（`ORDER_PAYMENT_WEBHOOK_BASE_URL`）。
`businessType`（默认 `order`）保留为订单侧履约分发的标准约定。

## 6. 操作自检清单

| 检查项 | 位置 | 期望 |
|---|---|---|
| 账户状态 | 机构账户列表 | Active（种子账户开箱即 Active） |
| 账户凭据 | 机构账户 → 编辑 → 读取 | 已填充（启动自动填充测试凭据，或已替换为真实凭据） |
| 账户 Test 通过 | 机构账户 → Test | 绿色「凭据验证通过」（dry-run 诊断工具，非激活前置） |
| 启用通道 | 支付通道列表 | 状态启用、账户/方式正确 |
| 意图创建 | 支付意图列表 | 用户端支付后出现记录 |
| 支付成功 | 意图状态 | succeeded（沙箱需模拟回调） |
| Webhook 收到 | Webhook 事件 | 有对应事件且 processed |
| 对账可跑 | 对账任务 | queued → succeeded（由 Cloud Router 对账 worker 消费） |

## 7. 常见问题

- **「模拟成功回调」按钮不显示**：仅对 `created/pending/processing` 状态的记录显示；
  意图/尝试需处于未完成状态。
- **模拟回调报「未找到开发或沙箱机构账户」**：先在机构账户工作区创建
  environment 为 development/sandbox 的账户。
- **一分钱测试返回 PSP 认证错误**（如微信 `SIGN_ERROR`、Stripe `Invalid API Key`、
  支付宝签名失败）：说明链路已真实走到 PSP 网关，账户当前使用启动自动填充的
  测试凭据；在机构账户编辑中替换为真实商户凭据即可变为真实成功。
- **生产账户 Test 失败**：核对凭据类型与字段（Stripe 是 `sk_live_` 密钥；
  支付宝/微信为 PEM 私钥 + 公钥/平台证书，非密钥字符串）。
- **对账任务一直 queued**：对账 worker 只认领账单已导入（`parse_status='parsed'`）
  的 run。先确认对账 worker 已启用
  （`SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_ENABLED=true` + 租户范围），
  再确认该 run 对应周期的机构账单已由账单下载/解析管线导入；账单未就绪时
  run 保持 queued 属正常等待，无需干预。

## 8. 金额单位约定（防回归）

支付域金额的存储与传递**统一使用最小单位整数文本**（minor units，如 ¥0.01 = `"1"`、
¥12.50 = `"1250"`），贯穿订单、支付意图、支付尝试、退款、对账全链路：

- **写入端**：一律 bind 整数 minor 文本。用户输入的"元"单位小数（`"12.50"`）只在
  入口转换一次（`decimal_amount_minor_units` / `major_decimal_to_minor_string`）。
- **读取端**：`NUMERIC(18,2)` 列（intent/attempt/refund）统一用
  `CAST(amount AS BIGINT)::TEXT` 投影（整数无损）；`TEXT` 列（breakdown）用
  `CAST(... AS TEXT)` + `normalize_stored_money_amount`。
- **`normalize_stored_money_amount` 语义**：整数透传；**小数全零（`"1.00"`）视为整数
  本身**（NUMERIC 读回形态，绝不能当"元"乘 100）；小数非零（`"0.01"`）为 legacy
  major 污染，按"元"转分。
- **禁止**：在读取端把 `"X.00"` 当 major 元换算（100 倍膨胀，曾导致退款金额放大）；
  禁止 `CAST(numeric_col AS TEXT)` 后直接 `parse::<i64>`（`"1250.00"` 解析失败）。
