# Cloud Router 优惠券体系设计

> 领域：commerce.marketing（营销中心）
> 状态：v1（一期落地：发放型券全链路；二期预留：订单抵扣型券）
> 适用范围：sdkwork-cloudrouter（营销中心前端）、sdkwork-promotion（促销领域）、sdkwork-order（订单履约）、sdkwork-account（账户体系）

## 1. 背景与现状

### 1.1 现状

营销中心创建优惠券（offer）目前仅支持 **2 种券权益**：

| kind | 中文名 | 目标 | 说明 |
|---|---|---|---|
| `token_bank_credit` | 充值余额券（金额） | Token Bank 账户 | 兑换后向 Token Bank 发放算力额度（即"充值券"） |
| `subscription` | 订阅权益券 | 订阅能力 | 兑换后激活指定套餐的限额订阅（即"订阅券"） |

### 1.2 现状问题

1. **账户覆盖不全**：账户体系有现金（Cash）、积分（Points）、Token Bank 三种资产，但券只覆盖 Token Bank 与订阅能力，现金账户、积分账户没有对应券。
2. **表单交互朴素**：券类型为普通下拉选择，无类型引导、无字段联动；「优惠内容」与「抵扣规则」概念混淆（发放型券上同时展示 discountType/discountValue/minimumAmount，这些字段对发放型券无实际语义）。
3. **抵扣能力是空壳**：`promotion_offer_version` 的 `minimum_amount`/`maximum_discount_amount` 仅存库回显；`promotion_discount_application` 表与 apply/reverse 函数已存在（状态机 `applied → settled/reversed/released`），但订单侧从未接入，满减/折扣计算未落地。
4. **积分换算率硬编码**：旧版积分兑换链路 `(金额分 / 10)`，即 0.1 元 = 1 积分（`coupon_credit_points`、`legacy_coupon_credit_units` 两处）。

### 1.3 设计目标

- 参考行业（美团、淘宝/天猫、京东、云厂商代金券）的专业券体系设计，覆盖**账户维度**（现金 / 积分 / Token Bank / 订阅）与**优惠形式**（满减 / 折扣 / 立减 / 兑换发放）两个正交维度。
- 创建优惠券表单达到行业最佳实践：**类型卡片化选择 → 动态字段联动 → 分区组织 → 强校验**。
- 保持向后兼容：旧数据（rule_json 无 `kind`）继续按 legacy TokenBankCredit 解析。

## 2. 券体系总览

### 2.1 券类型矩阵（benefit × 账户）

券按「优惠形式」分为 **3 大类 6 种类型**：

| 类别 | kind | 名称 | 目标账户 | 关键字段 | 一期/二期 |
|---|---|---|---|---|---|
| 发放型·资产 | `token_bank_credit` | Token Bank 额度券（充值券） | Token Bank | `grantAmount` + `bonusAmount`（赠送额度，可选） | ✅ 一期（增强） |
| 发放型·资产 | `points_credit` | 积分券 | Points 积分账户 | `grantPoints` | ✅ 一期（新增） |
| 发放型·资产 | `cash_credit` | 现金券 | Cash 现金账户 | `grantAmount`（币种取 offer 的 currencyCode） | ✅ 一期（新增） |
| 发放型·权益 | `subscription` | 订阅权益券 | 订阅能力 | productId/skuId/packageId/period/durationDays/dailyQuota/totalQuota | ✅ 一期（现有） |
| 抵扣型·订单 | `order_fixed_discount` | 满减券 | 订单支付 | `minimumAmount`（门槛）+ `discountValue`（减额） | ⏳ 二期 |
| 抵扣型·订单 | `order_percent_discount` | 折扣券 | 订单支付 | `percent`（折扣比例）+ `maximumDiscountAmount`（上限） | ⏳ 二期 |

### 2.2 设计决策

1. **发放型与抵扣型分离**：发放型券走「兑换发放」链路（redeem → 资产入账/订阅开通）；抵扣型券走「订单抵扣」链路（discount_application → 订单金额计算）。两类共享 offer/stock/code 发放层，但履约路径不同。
2. **bonus 在 promotion 侧合并**：Token Bank 额度券的赠送额度由促销领域在兑换时合并为总发放额（`grant_units = grantAmount + bonusAmount`）返回订单侧，订单侧无感知 → 改动面最小、向后兼容。
3. **积分/现金券复用订单闭环**：`CouponRecharge` 订单 → 支付成功 → `redeem_coupon_and_fulfill_account_value_order` → `fulfill_account_value_order` 通用入账。account 仓库无需改动（`POINTS_EARN` / `CASH_ADJUSTMENT` 业务类型已存在；积分发放自动走 points lot 生命周期）。
4. **抵扣型券复用 discount_application 骨架**：表、状态机、apply/reverse 函数、幂等均已就绪，二期补齐订单侧金额计算与 settle/release/rollback 闭环。

## 3. 领域模型（4 层）

```
offer（券定义） → stock（库存） → code / user_coupon（发放） → 履约（redemption / discount_application）
```

| 层 | 表/实体 | 职责 |
|---|---|---|
| 定义层 | `promotion_offer` + `promotion_offer_version` | 券的名称、类型、受众、组合规则、有效期；权益存于 `rule_json.couponBenefit` |
| 库存层 | `promotion_coupon_stock` | 库存类型（LIMITED/UNLIMITED）、券码模式（REALTIME/BATCH）、总量、每人限领、领取时间窗 |
| 发放层 | `promotion_code` / `promotion_code_batch` / `promotion_user_coupon` | 券码池与用户券（claimed/redeemed/expired/disabled/voided/cancelled 状态机） |
| 履约层 | `promotion_discount_application` / 账户台账 | 发放型：兑换发放到账户；抵扣型：订单金额抵扣 |

### 3.1 券权益（benefit）字段规范

存储格式（`promotion_offer_version.rule_json` 的 `couponBenefit` 判别式 JSON）：

```jsonc
// token_bank_credit（充值券，可带赠送额度）
{ "kind": "token_bank_credit", "targetAsset": "token_bank", "grantAmount": "500", "bonusAmount": "50" }

// points_credit（积分券）
{ "kind": "points_credit", "grantPoints": "1000" }

// cash_credit（现金券，币种取 offer.currencyCode）
{ "kind": "cash_credit", "grantAmount": "100.00" }

// subscription（订阅权益券）
{ "kind": "subscription", "productId": "...", "skuId": "...", "packageId": "1002",
  "period": "month", "durationDays": 30, "dailyQuota": "1000", "totalQuota": "30000" }
```

### 3.2 校验规则

| 类型 | 规则 |
|---|---|
| 通用 | `grantAmount`/`grantPoints` 为正数；金额最多两位小数；积分与 Token Bank 额度为整数最小单位 |
| `token_bank_credit` | `grantAmount > 0`；`bonusAmount` 可选且 `>= 0`（为空视为 0） |
| `cash_credit` | `grantAmount > 0`；币种复用 offer 的 `currencyCode`（非空） |
| `points_credit` | `grantPoints > 0` |
| `subscription` | productId/skuId 非空；packageId > 0；period 与 durationDays 匹配（day=1/week=7/month∈[28,31]/year∈[365,366]）；`total_quota ≤ daily_quota × duration_days`；day 券 `total_quota == daily_quota` |

## 4. 账户映射

| 账户/能力 | 资产代码 | 单位 | 对应券类型 | 入账业务类型 |
|---|---|---|---|---|
| 现金账户 | `cash` | 货币（CNY 等） | `cash_credit` 现金券 | `CASH_ADJUSTMENT` |
| 积分账户 | `points` | POINT | `points_credit` 积分券 | `POINTS_EARN`（自动 points lot） |
| Token Bank 账户 | `token_bank` | TOKEN_BANK | `token_bank_credit` 充值券 | `TOKEN_BANK_GRANT` |
| 订阅能力 | —（membership 服务） | — | `subscription` 订阅券 | membership 开通（`GrantCouponSubscriptionCommand`） |

积分说明：积分券发放的是**积分数量**（POINT 单位，整数），与旧版「金额 → 积分」的硬编码换算（0.1 元 = 1 积分）无关；旧版换算仅作为 legacy 数据兼容保留。

## 5. 履约链路

### 5.1 发放型券（一期，全链路已落地）

```
用户兑换（App）
  → 创建 CouponRecharge 订单（target_asset = TokenBank/Points/Cash，payment_required 可选）
  → 支付成功回调 settle_owner_order_after_payment_success
  → redeem_coupon_and_fulfill_account_value_order
      → CouponRedemptionPort::redeem_coupon（幂等 key: coupon-recharge:redeem:{order_id}）
          → promotion 仓库核销：校验 → 写 user_coupon(claimed→redeemed) → 券台账 → 计数更新
          → 返回 PromotionOrderCouponBenefit（token_bank 合并 bonus；points/cash 原样）
      → 校验 benefit 与订单快照一致（防权益变更）
      → fulfill_account_value_order（reserve → ledger credit → commit，失败自动补偿冲账）
          → AccountValueLedgerPort → account 仓库 append_ledger_entry
```

订阅券走 `redeem_coupon_and_fulfill_order`（reserve → membership `fulfill_coupon_subscription` → commit/release）。

### 5.2 抵扣型券（二期规划，骨架已就绪）

```
用户下单（checkout）
  → 匹配可用抵扣券（offer × 商品范围 × 门槛 × 人群）
  → POST /app/v3/api/promotions/discount_applications（apply）
      → promotion_discount_application(applied) + user_coupon → used
  → 订单金额计算：payable = original − Σdiscount（FIXED 满减 / PERCENT 折扣 + 上限）
  → 订单支付成功结算 → discount_application → settled
  → 退款/取消 → released / reversed / rollback（状态机：applied → settled/reversed/released）
```

二期待办（落点清单）：
1. sdkwork-order：checkout 阶段接入 discount_application 查询与金额计算（`OrderAmountBreakdown` 已支持 discount_amount 标量）
2. sdkwork-order：settle 阶段调用 `settlements`、`releases`、`rollback`（当前 handler 为 stub、路由未注册）
3. sdkwork-promotion：实现 settle/release/rollback 仓库函数与 `PromotionRepositoryPort::apply_discount` 实现者
4. 前端：抵扣券类型卡片字段（门槛/减额/折扣/上限）启用

## 6. 幂等与审计

- 所有写操作统一走 `commerce_idempotency_key`（60s 锁 TTL / 24h 记录 TTL），ID 由 `stable_storage_id` 确定性派生；新链路必须沿用。
- 券台账 `promotion_coupon_ledger_entry`（direction IN/OUT、business_type claim/redeem/...）记录库存全生命周期。
- 账户侧复式记账（acct_journal + acct_journal_line + acct_ledger_entry）与 outbox 事件持久化。
- 前端创建三步（offer → stock → codeBatch）无跨步事务，失败重试提示先刷新列表确认（`retryHint`）。

## 7. 前端创建表单（行业最佳实践）

创建优惠券表单按「类型选择 → 优惠内容 → 使用条件 → 发放设置 → 使用规则」组织：

1. **基本信息**：券名称、券类型（**卡片式选择器**：图标 + 名称 + 目标账户标签 + 一句话说明）、描述。
2. **优惠内容**（随类型动态联动）：
   - 充值券：发放额度、赠送额度（可选）、币种
   - 积分券：发放积分
   - 现金券：发放金额、币种
   - 订阅券：产品/SKU/套餐/周期/时长/日配额/总配额
   - 满减/折扣券（二期）：门槛、减额/折扣比例、折扣上限
3. **使用条件**：商品范围（ALL/RECHARGE/SUBSCRIPTION）、有效期（起止）。
4. **发放设置**：库存类型、券码模式、总量、每人限领、领取时间窗、初始批次。
5. **使用规则**：人群定向（ALL/NEW_USER/RETURNING_USER）、叠加规则（EXCLUSIVE/COMBINABLE）、优先级。

校验要点：金额两位小数、整数单位（积分/额度）、bonus ≥ 0、配额与时长关系、时间窗先后、限量库存必填总量、批次模式必填批次数量。

## 8. 兼容性

- 旧 `rule_json`（空/无 `kind`）→ legacy TokenBankCredit（`discount_value` 金额 → 积分换算），解析层保持不变。
- `token_bank_credit` 新增 `bonusAmount` 为可选字段；缺省时行为与旧版完全一致。
- 订单侧 `CreateCouponRechargeOrderCommand` 新增 benefit 入参，缺省保持 TokenBankCredit，既有调用方无需改动。
- 账户侧无 schema 变更（资产 CHECK 白名单 cash/points/token_bank 不变，业务类型常量已齐备）。

## 9. 验收清单

- [ ] 营销中心可创建 4 种发放型券（充值券含赠送额度、积分券、现金券、订阅券）
- [ ] 券类型卡片化选择、字段联动、分区组织、强校验
- [ ] 积分券/现金券兑换后分别入账积分账户（POINTS_EARN + points lot）与现金账户（CASH_ADJUSTMENT）
- [ ] 充值券含 bonus 时兑换总额 = grantAmount + bonusAmount
- [ ] 旧数据（无 kind 的 rule_json）仍按 legacy 解析
- [ ] 全链路幂等（redeem/fulfill 双 idempotency key）与台账记录
