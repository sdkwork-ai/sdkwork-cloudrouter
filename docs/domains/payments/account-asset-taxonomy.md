# Cloud Router 账户资产与订单主题词表（Taxonomy）

状态：active
Owner：SDKWork maintainers
Updated：2026-11-14
Authority：[`sdkwork-order/specs/ACCOUNT_VALUE_ORDER_SPEC.md`](../../../../sdkwork-order/specs/ACCOUNT_VALUE_ORDER_SPEC.md) §2–§3（跨仓库唯一口径）

本文件只做 Cloud Router 侧的落地映射与现状盘点，不重复规范条文。若与 order/account 规范冲突，以规范为准。

## 1. 账户资产（Account Assets）

账户账本只有三种资产（`CommerceAccountAssetType`，见 `sdkwork-account/crates/sdkwork-contract-service`）：

| 资产代码 | en-US 展示 | zh-CN 展示 | 记账单位 | 说明 |
| --- | --- | --- | --- | --- |
| `token_bank` | Compute Credits | 算力额度 | 微积分（1 算力额度 = 1e6 微积分） | AI 算力预付费资产，扣费与充值主资产 |
| `points` | Membership Points | 会员积分 | 整数积分 | 会员/营销积分，与算力额度**不可混名** |
| `cash` | Cash balance | 现金余额 | 货币最小单位 | 可提现余额 |

`subscription`（会员订阅）**不是账户资产**：它是会员服务履约的权益，不得写入 `acct_ledger_entry`。券种里它可以存在，但只能走会员履约端口。

## 2. 订单主题（Order Subjects）→ 资产 → 账本类型

| 订单主题 | 目标资产 | 履约账本 `business_type` | 说明 |
| --- | --- | --- | --- |
| `points_recharge` | `points` | `points_recharge` | 会员积分充值（历史默认值，**不是** Token Bank） |
| `token_bank_recharge` | `token_bank` | `token_bank_purchase_credit` | 算力额度直充 |
| `token_bank_plan_purchase` | `token_bank` | `token_bank_grant` | 算力额度套餐首购 |
| `token_bank_plan_renewal` | `token_bank` | `token_bank_grant` | 算力额度套餐续订 |
| `account_recharge_package` | 套餐目标资产 | 按资产：`token_bank_purchase_credit` / `points_recharge` / `cash_adjustment` | 运营价值包 |
| `coupon_recharge` | 券权益资产 | `token_bank_grant` / `points_earn` / `cash_adjustment` / 会员服务 | 兑换码 |
| `refund_request` | 原订单资产 | `token_bank_hold_release` / `points_cloudback` / `cash_adjustment` | 退款申请 |
| `cash_withdrawal` | `cash` | 提现链路 | 提现申请 |
| `membership` | 订阅（权益） | 会员服务（无账本行） | 会员购买 |
| `product` / `virtual_goods` / `app_template` | — | 商品/外部履约 | 非账户价值订单 |

## 3. 各端展示来源（单一目录，禁止各自维护）

| 端 | 订单主题标签 | 资产标签 | 状态 |
| --- | --- | --- | --- |
| PC 后台（交易中心/订单监管） | `@sdkwork/order-pc-core/subject` → 各包 `orders.subject_*` | `orders.target_asset_*` | 已统一 |
| PC 控制台（账单/收银台） | 同左 + `console/order-subjects.ts`（i18next） | `console.tokenBank.*` | 已统一 |
| H5（订单中心/收银台） | `orders.subject_*`（H5 i18n 包） | `orders.target_asset_*` | 已统一 |
| 小程序 | 不直接展示订单主题（经 H5 WebView） | 营销文案 | 已统一用词 |
| Flutter | 同小程序（H5 bridge） | 营销文案 | 已统一用词 |
| HarmonyOS | 无账户/订单界面 | — | 无资产概念（不适用） |

规则：

- 任何端都不得直接渲染 `commerce_order.subject` 或 `business_type` 原始码。
- 同一概念只允许一个展示名：`token_bank` 只能是 Compute Credits / 算力额度；`points` 只能是 Membership Points / 会员积分。
- 新增主题或资产时，先改 order 规范词表，再改各端目录，最后补回归测试。

## 4. 已知历史债务（Cloud Router 侧）

| # | 债务 | 影响 | 处置 |
| --- | --- | --- | --- |
| CR1 | 算力额度充值套餐的汇率仍以 `target_asset_type = points` + `basePointsPerCny` 存储 | 契约层把算力额度叫成 points，容易被误解为会员积分 | 需要一次 `commerce_exchange_rule` + 充值设置字段的迁移，改名为 token_bank / baseCreditsPerCny |
| CR2 | Token Plan 购买弹窗仍调用 `getCloudRouterPointsRechargeService()`（硬编码 `subject=points_recharge`、`targetAsset=points`），H5 套餐购买同理 | **算力额度购买实际入账到会员积分账户**（order 规范 §13 D7） | ✅ 已修复，见 §4.1 |
| CR3 | `points_cloudback`（应为 `points_clawback`）是账本已落库的拼写 | 会员积分冲正类型无法按规范名统计 | 需要账本类型回填迁移（order 规范 D1） |
| CR4 | 小程序/Flutter 的 `/#/orders` bridge 与 H5 `/me/orders` 不一致；小程序把 `coupons → recharge`、`ledger/invoices → orders` 折叠 | 订单/账单入口打开错误页面 | 见 CR7（路由对齐，单独修复） |
| CR5 | `console/subscription-catalog.ts` 是未被 `resources/index.ts` 合并的孤儿资源包；`console.memberships.points.*` 与 `dashboard.pointsBalance` 无消费者 | 同一批标签存在第二来源 / 死键 | 纳入合并或评审后移除 |
| CR6 | 后台财务流水的 `token_bank` 金额按 `acct_ledger_entry.amount` 原值展示，而 Token Bank 账本按微积分（1e6）记账（见 coupons 事故记录 §5.3） | 若库中存在不同写入尺度，管理端可能显示 0.00011 而非 110 | 确认库内尺度后，统一在 SQL 或前端按资产换算 |
| CR7 | 小程序 `coupons → recharge`、`ledger/invoices → orders` 折叠；小程序/Flutter 打开 `/#/orders` 而 H5 挂载在 `/me/orders` | 订单/账单入口打开错误页面 | 路由对齐（单独修复） |

### 4.1 已修复（2026-11-14）

**CR2（算力额度购买入账到会员积分账户）** — 已修复，并已从活跃债务清单移除。

订单后端补齐了 account-value 充值的服务端定价与 `mobile_cashier_h5` 收银台深链，前端随之切换：

- PC Token Plan 购买、Playground token plan 购买改用 `token_bank_recharge`（新增 `getCloudRouterTokenBankRechargeService()`）；
- H5 套餐购买改用 `token_bank_plan_purchase` + `planCode`/`planPeriod`；
- 客户端不再提交 `grantAmount`，改由服务端按汇率/套餐/计划定价（篡改客户端无法增发额度）；
- 会员积分的控制台钱包充值保持不变（仍是 `points_recharge`）；
- 存量订单不迁移 subject，历史行仍按其原 subject 展示与入账。

## 5. 回归检查

- `apps/sdkwork-cloudrouter-pc/commerce-order-subject-i18n.test.ts`：订单主题/资产标签、收银台 scene、各端词表一致性。
- `sdkwork-order`：`pnpm --filter @sdkwork/order-pc-admin-trade test`（主题/资产目录完整性）。
- `sdkwork-utils`：`cargo test -p sdkwork-utils-rust commerce_checkout`（收银台 scene 覆盖全部充值主题）。
