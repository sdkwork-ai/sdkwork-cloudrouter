# 优惠券商业化就绪报告（Cloud Router）

> 结论先行：**资产型券（算力券 / 会员积分券 / 现金券 / 订阅券）已达到可商业化状态**；**订单抵扣券（满减/折扣）的 promotion 引擎、order 改价、API/SDK 均已就绪，但支付/取消回调与 checkout UI 尚未接线，不能宣称端到端可售**。本报告给出可复核证据与上线边界。

## 1. 商业化范围

| 能力 | 状态 | 说明 |
|---|---|---|
| 算力券 `token_bank_credit` → Token Bank | ✅ 可商业化 | 规则整数额度 → 账本微积分（×1e6），bonus 合并 |
| 会员积分券 `points_credit` → 会员积分 | ✅ 可商业化 | 整数积分 + points lot 生命周期 |
| 现金券 `cash_credit` → 现金 | ✅ 可商业化 | 最小货币单位 + 券币种（USD 不再入 CNY） |
| 订阅券 `subscription` → 会员订阅 | ✅ 可商业化 | 套餐/周期/日配额/总配额 |
| 订单抵扣券 `FIXED` / `PERCENTAGE` | ⛔ 后端就绪，端到端未完成 | 缺支付/取消回调、checkout UI |
| 领取型券（realtime / batch） | ✅ 可商业化 | 领取码可兑换、消费既有 user_coupon、不重复计数 |
| 券中心“发现/领取/我的券/面值” | ✅ 可商业化 | 目录、wallet、权益快照、状态/码字段已对齐 |
| 兑换审计 / 防刷 | ✅ 可商业化 | 成功/失败 attempt、失败码 taxonomy、10 分钟 20 次限流 |
| 权益发放汇总 | ✅ 后端能力 | 按类型/币种聚合，报表页待接 |

## 2. 账户与单位矩阵

| 券种 | 目标账户 | 规则单位 | 订单/账本单位 | 账本业务类型 |
|---|---|---|---|---|
| 算力券 | Token Bank | 整数算力额度 | 微积分 | `TOKEN_BANK_GRANT` |
| 会员积分券 | Points | 整数积分 | 整数积分 | `POINTS_EARN` |
| 现金券 | Cash | 最小货币单位 | 最小货币单位 + 币种 | `CASH_ADJUSTMENT` |
| 订阅券 | Membership | 套餐/周期/配额 | membership 履约 | `GrantCouponSubscriptionCommand` |
| 订单抵扣券 | 订单金额 | `discount_amount` 最小单位 | order breakdown | `promotion_discount_application` |

## 3. 可复核证据

```bash
# promotion 单测
cargo test -p sdkwork-commerce-promotion-repository-sqlx --lib          # 94
cargo test -p sdkwork-commerce-promotion-service --lib                  # 45
cargo test -p sdkwork-routes-promotion-app-api                          # 6

# promotion 真实 PostgreSQL（一次性 promotion_it 库）
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/promotion_it \
  cargo test -p sdkwork-commerce-promotion-repository-sqlx --test pg_coupon_lifecycle

# order 单测 / 真实 PG / 端口
cargo test -p sdkwork-order-repository-sqlx --lib                       # 42
SDKWORK_DATABASE_TEST_POSTGRES_URL=postgres://.../promotion_it \
  cargo test -p sdkwork-order-repository-sqlx --test order_discount_postgres
cargo test -p sdkwork-order-integration-promotion                       # 1

# order service 封装
pnpm exec vitest run apps/sdkwork-order-common/packages/sdkwork-order-service/tests/order-discount-service.test.ts

# Cloud Router
pnpm typecheck
node --import tsx --test commerce-business-runtime.test.ts               # 22
pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test               # 214
node ../sdkwork-specs/tools/check-i18n-standard.mjs --root .             # 8500
```

真实 PG 覆盖：

- realtime claim → `CL...` → order redeem → 130,000,000 微积分；
- batch 码池 → 预生成码 → 兑换；
- 会员积分券 50；
- USD 现金券 10050 / USD；
- 订阅券 1000 配额 / 30 天 / 每日 100；
- 过期领取券拒绝且 `redeemed_quantity` 不变；
- NEW_USER 人群不符拒绝且不扣库存；
- 库存 `(9,1,1)`、单条 user_coupon、attempt 成功证据；
- order 重放不改库存/券行；
- FIXED ¥30 apply → 3000 最小单位、预算 `(97000,3000)`；
- apply replay 不重复预留；reverse → 预算 `(100000,0)`、券 `claimed`；
- settle → 预算 `(97000,0,3000)`、application `settled`、replay 0；
- 20 次失败后限流；
- 权益发放汇总：算力 240,000,000 微积分 ×2、积分 50、现金 10050 USD、订阅 1000。

## 4. 上线边界与运营建议

### 可以上线

- 算力券、会员积分券、现金券、订阅券的创建、发码/领取、兑换、履约、审计、防刷。
- 券中心的发现、领取、我的券、面值/单位/币种展示。
- 运营可按 `promotion_code_redemption_attempt.failure_code` 处理客诉：
  `code_unavailable` / `issue_limit_reached` / `per_user_limit_reached` / `idempotency_conflict` / `redemption_in_progress` / `benefit_invalid` / `rate_limited` / `coupon_not_redeemable` / `coupon_expired` / `audience_not_eligible` / `internal_error`。

### 暂不可上线

- 订单抵扣券（FIXED/PERCENTAGE）：后台创建会显示“结算页尚未接入”的警告；在完成以下接线前**不要对用户售卖**：
  1. 手动取消订单调用 `release_discounts(order)`（超时过期已由 expiration scheduler 释放；promotion 过期清扫为兜底）；
  2. checkout 页面选择/输入券并调用 `POST /app/v3/api/orders/{orderId}/discount`。

### 已知 P1

- 多币种现金钱包流水仍按 CNY 展示（现金账户本身按券币种入账正确）。
- app offers/wallet 的 promotion app SDK 需重新生成（`x-sdkwork-permission` 元数据缺失）。
- 权益发放汇总只有 repository 能力，后台报表页未接。
- promotion 直兑写路径已下线，OpenAPI 仍保留 `codes.redemptions.create`，建议标 deprecated。

## 5. 关键修复索引

- 算力券 110 → 0.00011：promotion 规则积分 ×1e6。
- 现金券 USD → CNY：order 快照/路由/账本/展示全链路携带币种。
- 券中心 500：改走 order-owned 兑换链路 + 稳定幂等键。
- 领取券不可兑：redeem 回查 `promotion_user_coupon.coupon_code`，消费既有券；order replay 按订单号+码找回。
- 券中心“我的券”为空：app wallet list/retrieve 实现 + `content/items` 兼容 + status/code 映射。
- 抵扣 apply 真实 PG 500：`FOR UPDATE OF c` + 补 `owner_user_id`。
- 抵扣金额 100x：apply replay 与 admin settle/release 都改用 `contract_money_minor_units`。
- app 用户券金额 100x：app 路由 `minor_units_to_major_string`。
- order 改价：`apply_order_discount` 累加折扣、重算 payable、锁定 order + breakdown。
- 订单抵扣路由：`POST /orders/{orderId}/discount` + OpenAPI + SDK + service 封装。
