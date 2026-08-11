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
- **生产环境的种子账户均为 inactive**（`configureBeforeActivation` 模式），必须自行创建并激活。
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
1. **创建机构账户**：机构、直连、生产环境，按 PSP 填入真实凭据（见下）；
   **先以「停用」创建 → 点 Test（dry-run 校验凭据）→ 通过后编辑为「启用」**
   （前端保存启用时会自动先校验再激活）。
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
- 主凭据：商户 API 私钥（PEM）；Webhook 密钥：API v3 Key；
  证书：平台证书（PEM）；商户证书序列号（元数据）
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

测试支付要求该方式的机构账户已配置真实或 PSP 沙箱凭据，且已为该方式创建启用
状态的支付通道（测试支付走与真实支付相同的通道路由）；否则创建会失败。

测试订单的有效期为 15 分钟（与提供商收银窗口 900 秒一致），二维码在对话框内
显示剩余支付时间，过期后需重新创建。

**支付成功回调必须可达**（否则扫码支付成功但状态不会更新）：

- 平台侧：机构账户 metadata 配置 `notifyUrl`，或部署环境配置
  `ORDER_PAYMENT_WEBHOOK_BASE_URL`（指向订单网关
  `POST /app/v3/api/orders/payments/webhooks/{providerCode}`）。
- PSP 侧：在微信商户平台/支付宝开放平台把该回调地址配置到对应商户号/应用。
- 未配置时：微信 Native 创建会直接报「notify_url is required」；
  支付宝当面付可以创建并支付成功，但因没有异步通知，状态会停留在
  pending 直到二维码过期——两种情况都应先补齐回调配置再测试。

## 5. 操作自检清单

| 检查项 | 位置 | 期望 |
|---|---|---|
| 账户 Test 通过 | 机构账户 → Test | 绿色「凭据验证通过」 |
| 账户状态 | 机构账户列表 | Active |
| 启用通道 | 支付通道列表 | 状态启用、账户/方式正确 |
| 意图创建 | 支付意图列表 | 用户端支付后出现记录 |
| 支付成功 | 意图状态 | succeeded（沙箱需模拟回调） |
| Webhook 收到 | Webhook 事件 | 有对应事件且 processed |
| 对账可跑 | 对账任务 | queued → succeeded（由 Cloud Router 对账 worker 消费） |

## 6. 常见问题

- **「模拟成功回调」按钮不显示**：仅对 `created/pending/processing` 状态的记录显示；
  意图/尝试需处于未完成状态。
- **模拟回调报「未找到开发或沙箱机构账户」**：先在机构账户工作区创建
  environment 为 development/sandbox 的账户。
- **生产账户 Test 失败**：核对凭据类型与字段（Stripe 是 `sk_live_` 密钥；
  支付宝/微信为 PEM 私钥 + 公钥/平台证书，非密钥字符串）。
- **对账任务一直 queued**：对账 worker 只认领账单已导入（`parse_status='parsed'`）
  的 run。先确认对账 worker 已启用
  （`SDKWORK_CLOUDROUTER_PAYMENT_RECONCILIATION_ENABLED=true` + 租户范围），
  再确认该 run 对应周期的机构账单已由账单下载/解析管线导入；账单未就绪时
  run 保持 queued 属正常等待，无需干预。
