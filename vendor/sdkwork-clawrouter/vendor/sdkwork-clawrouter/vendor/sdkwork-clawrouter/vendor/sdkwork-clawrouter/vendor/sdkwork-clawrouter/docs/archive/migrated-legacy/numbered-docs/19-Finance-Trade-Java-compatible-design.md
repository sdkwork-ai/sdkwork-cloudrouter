# Finance / Trade Java 兼容设计

> 版本：0.1
> 日期：2026-04-28
> 范围：账户、订单、支付、退款、发票、优惠券、VIP/充值、积分流水、服务订单派发

## 1. 结论

支付、订单、账户、优惠券、VIP、充值、积分、退款、发票等资金和交易能力必须以 Java 端设计为标准。`sdkwork-clawrouter` 的数据库设计采用 Java Entity first：

1. 新增任何资金/交易/营销/VIP/账户模型前，先在 `legacy-java-plus-entity` 检索是否已有 `Plus*` Entity。
2. 如果 Java 端已有实体，则 schema registry 只登记既有 `plus_*` 表为 L0 legacy compatible。
3. 物理表结构、字段类型、枚举、唯一约束、索引和生命周期都以 Java Entity 为准。
4. app 端 API 走 `legacy-java-plus-app-api` 的 `/app/v3/api/*` 标准路径。
5. backend 管理端 API 走 `legacy-java-plus-backend-api` 的 `/backend/v3/api/*` 标准路径。
6. `commerce_*` 只能保存用量结算、账单投影、导出和对账证据，不替代 `plus_order`、`plus_payment`、`plus_refund`、`plus_invoice`、`plus_account`、`plus_vip_*`；卡券营销事实统一进入 `promotion_*`。

## 2. 禁止同义主表

以下类型不得在 claw-router 中新建同义主表：

| 禁止方向 | 原因 | 正确事实来源 |
| --- | --- | --- |
| `commerce_order`、`router_order`、`sdkwork_order` | 会绕开 Java 订单状态机 | `plus_order`、`plus_order_item` |
| `commerce_payment`、`router_payment` | 会绕开支付渠道、回调幂等和对账链路 | `plus_payment`、`plus_payment_webhook_event` |
| `commerce_refund` | 会绕开退款状态机和支付单关联 | `plus_refund` |
| `commerce_invoice` | 会造成发票和账单投影混淆 | `plus_invoice`、`plus_invoice_item`、`plus_invoice_record` |
| `commerce_account`、`router_account` | 会造成余额双写和资金风险 | `plus_account`、`plus_account_history` |
| 非 `promotion_` 命名的卡券主表 | 会造成优惠券核销状态双写 | `promotion_offer`、`promotion_coupon_stock`、`promotion_code`、`promotion_user_coupon`、`promotion_discount_application` |
| `commerce_vip` | 会造成会员权益和充值包双主数据 | `plus_vip_*` |

## 3. Java 实体覆盖

### 3.1 账户与账本

| 表 | Java Entity | API |
| --- | --- | --- |
| `plus_account` | `com.sdkwork.spring.ai.plus.entity.account.PlusAccountEntity` | `/app/v3/api/account`、`/app/v3/api/wallet`、`/backend/v3/api/account` |
| `plus_account_history` | `com.sdkwork.spring.ai.plus.entity.account.PlusAccountHistoryEntity` | `/backend/v3/api/account/history` |
| `plus_account_exchange_config` | `com.sdkwork.spring.ai.plus.entity.account.PlusAccountExchangeConfigEntity` | `/backend/v3/api/account/exchange-config` |
| `plus_ledger_bridge` | `com.sdkwork.spring.ai.plus.entity.account.PlusLedgerBridge` | `/backend/v3/api/account/ledger-bridge` |

账户余额、积分、token、充值、扣费、退款、转账必须通过 Java 账户服务产生账户流水，不允许直接 update 余额。

### 3.2 订单与购物车

| 表 | Java Entity | API |
| --- | --- | --- |
| `plus_order` | `com.sdkwork.spring.ai.plus.entity.trade.PlusOrder` | `/app/v3/api/orders`、`/backend/v3/api/trade/order` |
| `plus_order_item` | `com.sdkwork.spring.ai.plus.entity.trade.PlusOrderItem` | `/backend/v3/api/trade/order/item` |
| `plus_shopping_cart` | `com.sdkwork.spring.ai.plus.entity.trade.PlusShoppingCart` | `/backend/v3/api/trade/shopping/cart` |
| `plus_shopping_cart_item` | `com.sdkwork.spring.ai.plus.entity.trade.PlusShoppingCartItem` | `/backend/v3/api/trade/shopping/cart/item` |
| `plus_order_dispatch_rule` | `com.sdkwork.spring.ai.plus.entity.trade.PlusOrderDispatchRule` | `/backend/v3/api/trade/order/dispatch-rule` |
| `plus_order_worker_dispatch_profile` | `com.sdkwork.spring.ai.plus.entity.trade.PlusOrderWorkerDispatchProfile` | `/backend/v3/api/trade/order/worker-dispatch-profile` |

`plus_order_dispatch_rule` 和 `plus_order_worker_dispatch_profile` 已存在于 Java 端，因此服务订单派发、接单容量、评级、并发控制都登记为既有 Java 兼容表，不在 claw-router 中新增派发表。

### 3.3 支付与退款

| 表 | Java Entity | API |
| --- | --- | --- |
| `plus_payment` | `com.sdkwork.spring.ai.plus.entity.trade.PlusPayment` | `/app/v3/api/payments`、`/backend/v3/api/trade/payment` |
| `plus_payment_webhook_event` | `com.sdkwork.spring.ai.plus.entity.trade.PlusPaymentWebhookEvent` | `/backend/v3/api/trade/payment` + worker |
| `plus_refund` | `com.sdkwork.spring.ai.plus.entity.trade.PlusRefund` | `/backend/v3/api/trade/refund` |

支付回调幂等以 `plus_payment_webhook_event.provider + event_id/nonce` 为准。Claw Router 侧只保存必要的 usage settlement 引用，不复制支付渠道明细和 webhook payload 明文。

### 3.4 发票

| 表 | Java Entity | API |
| --- | --- | --- |
| `plus_invoice` | `com.sdkwork.spring.ai.plus.entity.invoice.PlusInvoice` | `/app/v3/api/invoice`、`/backend/v3/api/system/invoice` |
| `plus_invoice_item` | `com.sdkwork.spring.ai.plus.entity.invoice.PlusInvoiceItem` | `/app/v3/api/invoice`、`/backend/v3/api/system/invoice` |
| `plus_invoice_record` | `com.sdkwork.spring.ai.plus.entity.invoice.PlusInvoiceRecord` | `/app/v3/api/invoice`、`/backend/v3/api/system/invoice` |

`commerce_usage_statement` 是账单投影，不是发票。发票抬头、税号、开票项目、开票记录仍以 `plus_invoice*` 为准。

### 3.5 优惠券、VIP 与充值

| 表 | Java Entity | API |
| --- | --- | --- |
| `promotion_offer` | `sdkwork-appbase` promotion offer model | `/app/v3/api/promotions/offers`、`/backend/v3/api/promotions/offers` |
| `promotion_coupon_stock` | `sdkwork-appbase` promotion stock model | `/backend/v3/api/promotions/coupon_stocks` |
| `promotion_code`、`promotion_user_coupon` | `sdkwork-appbase` promotion code and wallet models | `/app/v3/api/promotions/codes/redemptions`、`/app/v3/api/promotions/user_coupons/wallet` |
| `promotion_discount_application` | `sdkwork-appbase` promotion checkout application model | `/app/v3/api/promotions/discount_applications`、`/backend/v3/api/promotions/discount_applications` |
| `plus_vip_recharge` | `com.sdkwork.spring.ai.plus.entity.vip.PlusVipRecharge` | `/backend/v3/api/vip/recharge` |
| `plus_vip_recharge_pack` | `com.sdkwork.spring.ai.plus.entity.vip.PlusVipRechargePack` | `/backend/v3/api/vip/recharge/pack` |
| `plus_vip_recharge_method` | `com.sdkwork.spring.ai.plus.entity.vip.PlusVipRechargeMethod` | `/app/v3/api/vip/purchase`、`/backend/v3/api/vip/recharge` |
| `plus_vip_point_change` | `com.sdkwork.spring.ai.plus.entity.vip.PlusVipPointChange` | `/app/v3/api/vip/points`、`/backend/v3/api/vip/point/change` |
| `plus_vip_user`、`plus_vip_level`、`plus_vip_benefit*` | Java `entity.vip` 包 | `/app/v3/api/vip`、`/backend/v3/api/vip/*` |

优惠券核销、VIP 权益、充值包、积分变动都以 Java 服务的状态机为准。Claw Router 的定价计划可以绑定 VIP、用户或 API Key 分组，但不得复制 VIP 或优惠券主数据。

## 4. 与 Claw Router 计费域的边界

Claw Router 可以新增和维护以下标准表：

- `ai_usage_fact`：请求用量事实。
- `commerce_usage_settlement`：用量结算桥接证据，引用 `plus_account_history`、`plus_order`、`plus_payment`。
- `commerce_usage_statement` / `commerce_usage_statement_item`：账期账单投影。
- `commerce_billing_export`：导出文件清单和审计证据。

这些表只能引用 Java 资金事实，不拥有资金事实。所有真实余额、支付、订单、退款、发票、优惠券、VIP、积分最终仍回到 `plus_*` 表和 Java service。

## 5. Schema Registry 门禁

资金/交易域新增表必须通过以下检查：

1. `rg "@Table\\(name = \"plus_" legacy-java-plus-entity/src/main/java` 已检索。
2. 若 Java 已存在实体，schema registry 只能添加 `profile: legacy_compatible`、`compliance_level: L0`、`generated_by_this_project: false`、`compatibility_rule: keep_physical_structure_identical`。
3. 若 Java 不存在实体，必须说明为什么不能扩展现有 Java 服务，并明确该表只是投影、审计、导出、对账或网关专属事实。
4. 新表名不得使用 `commerce_order`、`commerce_payment`、`commerce_refund`、`commerce_invoice`、`commerce_account`、`commerce_vip` 等同义主表名称；卡券营销只能使用 `promotion_*`。
5. app/backend API 必须记录真实 Java 路径，不能新增与 Java 标准路径冲突的自由切换阻断点。
