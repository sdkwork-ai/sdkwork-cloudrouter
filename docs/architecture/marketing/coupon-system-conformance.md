# 优惠券中心（券码体系）专业度对齐：现状评估、目标设计与落地路线

> 状态：评审稿 · 2026-11-10
> 范围：`sdkwork-promotion`（券引擎，系统记录归属方）· `sdkwork-order`（兑换履约）· `sdkwork-account`（资金账户）· `sdkwork-membership`（订阅履约）· `sdkwork-cloudrouter`（后台运营台）
> 方法：DDL 与仓库 SQL 交叉核对 + 状态机/并发静态证明 + 契约与后台能力盘点。所有结论均可回溯到 `path:line`（详见三份审计附录）。

---

## 0. 结论（TL;DR）

**当前实现是「发券台账」（offer → stock → code → wallet coupon → ledger），不是「折扣平台」。**

它已经具备：券码生成（含自定义码）、库存池、领取/兑换/核销、库存流水、权益分发（Token Bank / 积分 / 现金 / 订阅）、幂等键、乐观并发守卫、版本化规则、后台只读+创建能力。

它缺的是商业化必需的四层：

| 层 | 缺什么 | 直接后果 |
|---|---|---|
| **证据层** | 兑换尝试台账（成功/失败）、审计事件、`trace_id` 贯通 | 客诉无法裁决、刷码无法识别、失败无 SLO |
| **资金层** | 预算账户（预留→核销→释放）、钱包面值快照、币种一致性 | 按金额让利的活动是**无上限负债**；退款金额算错 |
| **规则层** | 人群资格、商品/品类范围、叠加与最优价、每活动/每用户上限 | 「限品类」「仅新客」「不可叠加」写在字段里但**从未执行** |
| **治理层** | 码密文落库/加密导出、可见性权限分离、作废/补发、对账与报表 | 一次 CSV 导出即泄露全部券负债；无法止损、无法结账 |

并且存量代码里存在 **6 个会让核心链路直接 500 的 P0 缺陷**（见 §3 P0-1…P0-6），其中一个使「领取」100% 不可用。

---

## 1. 参考模型（我们比对的是什么）

以四类成熟实现为基准，取它们的交集能力面：

- **Stripe Promotion Codes**：码哈希查找、`max_redemptions`、每客户上限、`first_time_transaction`、`expires_at`、metadata。
- **Shopify Discounts**：`usageLimit` / `appliesOncePerCustomer` / `combinesWith`（叠加矩阵）/ `productSelection`（品类、单品）/ 唯一码批量导出。
- **微信支付商户券 / 支付宝券**：券库存与码模式（平台生成 / 商户上传 / 单码共享）、回调事件 id 与签名、模板参数与核销方式。
- **Amazon 促销码 / Talon.One / Voucherify**：单次认领码、激活/取消窗口、**预算账户与「预留→结算→回滚」流水**、包含失败记录的兑换流水、码级归因、叠加与最优价引擎。

这四者的交集就是本文的目标模型：**码是资产、钱有预算、规则可执行、动作有证据、运营可止损**。

---

## 2. 现状全景

```
campaign ──< offer ──< offer_version(不可变) ──< coupon_stock ──< code ──< user_coupon ──< discount_application
                               │                     │                              │
                               └── rule_json(权益)   └── coupon_ledger_entry        └── budget? ✗
                                                                                    └── attempt? ✗
order ──(兑换)──> order.coupon_redemption ──> promotion.redeem ──> account(acct_*) / membership
```

- 表：13 张（`promotion_*`），**零外键**，全部 `TEXT` 时间与金额。
- 跨域：order 通过进程内 RPC 调 promotion 仓储；资金写 `acct_*`（promotion 直兑路径写的是**不存在的** `commerce_account*`）。
- 契约：app-api 9 个操作、backend-api 22 个操作。
- 后台：13 个页面，读多写少；无编辑/作废/导出/对账/报表。

---

## 3. 差距矩阵（按商业风险排序）

### P0 — 会造成直接资金损失或功能不可用

| ID | 缺陷 | 证据 | 后果 | 归属 |
|---|---|---|---|---|
| **P0-1** | 领取流水 INSERT 写了不存在的列（`organization_id`/`ledger_no`/`updated_at`），且漏 `uuid`/`business_no` | `postgres_promotion.rs:2693-2735` vs `0001_promotion_baseline.sql:286-310` | **「领取」100% 报错**，公开券无法领取 | promotion |
| **P0-2** | `organization_id` 以 NULL 绑定进 `NOT NULL` 列（user_coupon / member_card / application） | `postgres_promotion.rs:1998,2670,3384` vs `0001_organization_id_not_null.up.sql:51-79` | 无组织上下文的用户兑换/核销 23502 | promotion |
| **P0-3** | 后台定向发券写入 `status=1`（VARCHAR）、`subject_type='USER'`（读路径全用 `'user'`）、流水大写枚举 | `promotion_admin_management.rs:911-913` vs `postgres_promotion.rs:27,225` | 定向发放的券**不可见、不可核销**，且让钱包列表 500 | promotion |
| **P0-4** | 批量/发放幂等重放把 TEXT 主键按 `i64` 解码 | `promotion_admin_management.rs:717,922` | 重试返回 500 而非原始资源 | promotion |
| **P0-5** | 无「一单一张券」不变量：不同券可同时核销到同一订单 | `0001:344-345` 无 `(tenant,order_id)` 唯一；`postgres_promotion.rs:769-830` | **同一订单重复让利**，毛利直接流失 | promotion |
| **P0-6** | 兑换失败后订单已落库为「已支付未履约」，无取消/补偿 | `recharge_router.rs:1519-1524` → 兑换失败 → `:1581` | 客户侧「付了钱没权益」，退款队列增长 | order |
| **P0-7** | 券码明文落库 + 后台 CSV 明文导出（无审计、无权限分离） | `0001:180-191`；`promotion_admin.rs:580`；后台 `MarketingListView` 导出 | 一次导出/备份/log 泄露全部券负债；卡组织/合作方合规阻塞 | promotion + cloudrouter |
| **P0-8** | `promotion_discount_application` 永不进入 `settled`/`released`；release/settle/rollback 路由是 404 桩 | `postgres_promotion.rs:1496-1561`；`promotion_router.rs:740-783` | 取消/退款后折扣仍占用，财务无法结账 | promotion |

### P0 状态（截至本轮）

| ID | 状态 | 落地位置 / 说明 |
|---|---|---|
| P0-1 领取流水 SQL | ✅ 已修 | 列集对齐 DDL，补 `uuid`/`business_no`，与兑换流水同形 |
| P0-2 org NULL | ✅ 已修 | 统一 `organization_binding()` → 平台哨兵 `'0'`（14 处 INSERT） |
| P0-3 定向发放枚举 | ✅ 已修 | `claimed` / `user` / `debit` / `distribution`，并补 `uuid`、`source_*` |
| P0-4 幂等重放解码 | ✅ 已修 | TEXT 主键按 `String` 解码，重试返回原资源 |
| P0-5 一单一张券 | ✅ 已修（规则版） | 核销前校验同单已生效 application：双方均须 `COMBINABLE`，否则 409；完整叠加矩阵/最优价见 S3 |
| P0-9 核销记录缺 `uuid`/`discount_type` | ✅ 已修 | `discount_type` 取自冻结的 offer 版本；补 `uuid` |
| P0-6 兑换失败孤儿订单 | ⬜ 待修 | order 侧：兑换失败后取消/补偿订单（S1 一并处理） |
| P0-7 码明文与明文导出 | ⬜ 待修 | S2：`code_hash` + 归一化唯一索引 + 审计化导出与揭示 |
| P0-8 核销不结算 | ⬜ 待修 | S4：`settled/released` 状态机 + 预算联动 |
### P1 — 商业化能力缺口

| ID | 缺口 | 说明 | 归属 |
|---|---|---|---|
| P1-1 | 无兑换尝试台账（成功 + 失败 + 失败原因） | 客诉、刷码识别、与渠道对账全部无据；失败只存在于用户屏幕 | promotion |
| P1-2 | 无预算账户与预算流水 | 按金额让利＝无上限负债；百分比券尤其危险 | promotion |
| P1-3 | `audience_scope`/`goods_scope`/`combinability` 是**装饰字段** | 领取/核销从不读取 → 「限品类」「仅新客」「不可叠加」形同虚设 | promotion |
| P1-4 | 无作废 / 补发 / 停发 | 券泄露无法止损；丢券只能手工改库；库存创建后不可关闭 | promotion + cloudrouter |
| P1-5 | 无过期扫描（user_coupon / application） | `expired` 状态永不写入，钱包与报表长期偏大 | promotion |
| P1-6 | 幂等键跨意图共享（钱包券/流水/核销三张表各自 `(tenant,key)` 唯一） | 同键复用到不同意图 → 永久 500，只能换键 | promotion |
| P1-7 | 无 outbox / 补偿事务 | 券已消耗、下游失败 → 无重试、无死信、无对账 | promotion |
| P1-8 | 无钱包面值/币种快照 | 规则版本一改，历史券面值随之变化；跨币种不校验 | promotion |
| P1-9 | 码查找 `UPPER(BTRIM(...))` 无法走索引；大小写重复码可共存 | 兑换退化为全表扫描；`ABC10`/`abc10` 歧义 | promotion |
| P1-10 | 后台无编辑、无预算/人群/叠加/门槛的可编辑项 | 定价写错只能删了重建，而活动中的券不可删 | cloudrouter |
| P1-11 | 后台状态筛选词表错误（领取/核销两页恒返回 0 行） | 客服据此误判「客户没领过」 | cloudrouter |
| P1-12 | 分页把 int64 字符串当 number，永远无法跳页 | 5000 张码的批次要翻 50+ 页 | cloudrouter |
| P1-13 | app-api 全部操作缺 `x-sdkwork-permission`，app SDK 无法生成 | 移动端无法以标准方式接入 | promotion |
| P1-14 | 订阅券与会员套餐身份未绑定（已在本轮补上三字段） | 订阅券核销被订单侧拒 | promotion + cloudrouter |

### P2 — 体系化与长期演进

- 枚举无 CHECK/字典、状态无闭集；批次无 `failed` 状态；`CURRENT_TIMESTAMP` 直写 TEXT。
- 时间/金额仍为 `TEXT`（order 已迁 `TIMESTAMPTZ`/`NUMERIC`，promotion 未迁）。
- 零外键、无软删/保留策略、无租户 RLS、账本表缺 `organization_id`。
- 无码级归因（渠道/合作方）、无展示素材（多语言/模板）、无外部平台绑定与重试。
- 报表只有 8 个不可下钻的计数；无核销率/GMV/让利额。

---

## 4. 目标设计（增量，不重写）

### 4.1 新增表（按优先级）

```sql
-- 证据层：每一次兑换尝试（成功与失败都落库，失败必须独立事务持久化）
CREATE TABLE promotion_code_redemption_attempt (
  id TEXT PRIMARY KEY, uuid VARCHAR(64) NOT NULL UNIQUE,
  tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL DEFAULT '0',
  code_id TEXT, stock_id TEXT, offer_id TEXT, user_coupon_id TEXT, order_id TEXT,
  submitted_code_hash VARCHAR(128) NOT NULL, submitted_code_suffix VARCHAR(8) NOT NULL,
  subject_type VARCHAR(32) NOT NULL, subject_id TEXT NOT NULL,
  channel VARCHAR(32) NOT NULL DEFAULT 'code',
  outcome VARCHAR(16) NOT NULL,            -- succeeded | failed
  failure_code VARCHAR(64),                -- code_unavailable | expired | exhausted | per_user_limit | idempotency_conflict | benefit_invalid | internal
  request_no VARCHAR(128) NOT NULL, idempotency_key VARCHAR(200) NOT NULL,
  trace_id VARCHAR(128) NOT NULL DEFAULT '',
  occurred_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX idx_pcra_code    ON promotion_code_redemption_attempt (tenant_id, code_id, occurred_at DESC);
CREATE INDEX idx_pcra_hash    ON promotion_code_redemption_attempt (tenant_id, submitted_code_hash, occurred_at DESC);
CREATE INDEX idx_pcra_subject ON promotion_code_redemption_attempt (tenant_id, subject_type, subject_id, occurred_at DESC);
CREATE INDEX idx_pcra_failure ON promotion_code_redemption_attempt (tenant_id, outcome, failure_code, occurred_at DESC);

-- 资金层：预算账户 + 流水（预留 → 结算 / 释放）
CREATE TABLE promotion_budget_account (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL DEFAULT '0',
  budget_no VARCHAR(128) NOT NULL, offer_id TEXT NOT NULL, offer_version_id TEXT, stock_id TEXT,
  currency_code CHAR(3) NOT NULL,
  total_amount_minor BIGINT, available_amount_minor BIGINT NOT NULL,
  reserved_amount_minor BIGINT NOT NULL DEFAULT 0, used_amount_minor BIGINT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'active', version BIGINT NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  CONSTRAINT uk_pba_no UNIQUE (tenant_id, budget_no),
  CONSTRAINT chk_pba_total CHECK (total_amount_minor IS NULL OR total_amount_minor >= 0),
  CONSTRAINT chk_pba_split CHECK (available_amount_minor >= 0 AND reserved_amount_minor >= 0 AND used_amount_minor >= 0)
);
CREATE TABLE promotion_budget_ledger_entry (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL DEFAULT '0',
  budget_account_id TEXT NOT NULL, application_id TEXT,
  direction VARCHAR(16) NOT NULL, amount_minor_delta BIGINT NOT NULL,
  available_after_minor BIGINT NOT NULL, reserved_after_minor BIGINT NOT NULL, used_after_minor BIGINT NOT NULL,
  source_type VARCHAR(64) NOT NULL, source_id TEXT NOT NULL,
  request_no VARCHAR(128) NOT NULL, idempotency_key VARCHAR(200) NOT NULL,
  occurred_at TEXT NOT NULL, created_at TEXT NOT NULL,
  CONSTRAINT uk_pble_req UNIQUE (tenant_id, request_no)
);

-- 规则层：资格与范围（offer_version 冻结，改规则必须发新版本）
CREATE TABLE promotion_offer_audience_rule (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL DEFAULT '0',
  offer_version_id TEXT NOT NULL,
  rule_type VARCHAR(32) NOT NULL,   -- new_user | first_order | member_level | segment | channel | region
  operator VARCHAR(16) NOT NULL, rule_value VARCHAR(256),
  created_at TEXT NOT NULL,
  CONSTRAINT uk_poar UNIQUE (tenant_id, offer_version_id, rule_type, operator, rule_value)
);
CREATE TABLE promotion_offer_scope (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL DEFAULT '0',
  offer_version_id TEXT NOT NULL, scope_type VARCHAR(32) NOT NULL, -- all | category | spu | sku | channel
  scope_id TEXT, match_mode VARCHAR(8) NOT NULL DEFAULT 'include', created_at TEXT NOT NULL,
  CONSTRAINT chk_pos_scope CHECK ((scope_type = 'all' AND scope_id IS NULL) OR (scope_type <> 'all' AND scope_id IS NOT NULL))
);

-- 治理层：审计事件（谁在何时导出/揭示/作废/补发）
CREATE TABLE promotion_audit_event (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL DEFAULT '0',
  actor_id TEXT NOT NULL, action VARCHAR(64) NOT NULL,  -- codes.export | codes.reveal | codes.void | coupon.reissue | stock.close
  aggregate_type VARCHAR(32) NOT NULL, aggregate_id TEXT NOT NULL,
  subject_count BIGINT NOT NULL DEFAULT 0, detail_json TEXT,
  trace_id VARCHAR(128) NOT NULL DEFAULT '', occurred_at TEXT NOT NULL
);

-- 可靠性：事务内 outbox
CREATE TABLE promotion_event_outbox (
  id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, organization_id TEXT NOT NULL DEFAULT '0',
  event_type VARCHAR(64) NOT NULL, aggregate_type VARCHAR(32) NOT NULL, aggregate_id TEXT NOT NULL,
  payload_json TEXT NOT NULL, status VARCHAR(16) NOT NULL DEFAULT 'pending',
  attempt_count INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT, last_error VARCHAR(512),
  occurred_at TEXT NOT NULL, published_at TEXT
);
```

### 4.2 不变量（必须同时被 DB 与应用守住）

| # | 不变量 | 现状 | 目标 |
|---|---|---|---|
| I1 | 单次码不可并发双兑 | 行锁 + CAS（已具备） | 保留，补 `(tenant, code_id, subject_id)` 唯一兜底 |
| I2 | 库存不超卖 | CAS + CHECK（已具备） | 保留；无限库存显式建模，不用 `0` 表达 |
| I3 | **一单至多一张券**（叠加例外见 I4） | **缺失** | `(tenant, order_id)` 唯一（若不支持叠加）或叠加矩阵校验 |
| I4 | 叠加只按 `combinability`/`stack_strategy` 允许的组合 | **缺失** | 核销时读取同单已生效的 application 集合求交 |
| I5 | 折扣金额不超过预算 | **缺失** | 预算账户 `reserved+used <= total` 原子守卫 |
| I6 | 兑换尝试必有证据 | **缺失** | 成功同事务写、失败独立事务写 |
| I7 | 券码不可逆推 | **缺失** | `code_hash` + `last4`，明文仅在加密导出工件中 |
| I8 | 计数与明细一致（claimed = count(wallet)） | **缺失** | 对账作业 + 修订流水（不原地改计数） |
| I9 | 金额单位唯一（minor units + ISO-4217） | **混乱**（TEXT、major/minor 混用） | 所有金额列 `*_minor BIGINT` + `currency_code CHAR(3)` |
| I10 | 状态闭集 | **缺失** | 每列 CHECK 或字典表 |

### 4.3 券码形态（自由定义 + 防枚举并存）

```
[前缀][随机体][校验位]    例：LAUNCH-7F3K-9QW2-8   （去除 0/O/1/I/L 等歧义字符）
[自定义全码]              例：VIP2026            （管理员定义，唯一且大小写归一）
```
- 生成：`Crockford Base32`（32 字符、无歧义）+ 末尾 1 位校验（mod-37），长度 8–32，支持 `-` 分组。
- 自定义：4–64 位 `A-Z0-9-_`，入库前 `UPPER(TRIM())`，同租户内唯一（归一化唯一索引）。
- 查找：`code_hash = sha256(UPPER(TRIM(submitted)))` 命中唯一索引，不再全表扫描。
- 展示：后台默认掩码（`LAUN********QW2-8`）；「揭示」与「导出」是**两个独立权限**，且都写 `promotion_audit_event`。

---

## 5. 落地路线（每阶段可独立上线、可回滚）

| 阶段 | 内容 | 交付物 | 验收 |
|---|---|---|---|
| **S0（本轮）** | 6 个 P0 中的 S 级缺陷：领取流水 SQL、org 哨兵、定向发放枚举、幂等重放解码、扫描锁泄漏、后台状态筛选/分页/导出告知 | 代码 + 测试 | `cargo test` 全绿；后台筛选返回正确行；导出有明确告知 |
| **S1** | 兑换尝试台账 + 失败原因码 + 后台「尝试查询」页 | 迁移 0003 + 仓储 + 两个读接口 + 页面 | 失败兑换可被检索；原因码覆盖 6 类 |
| **S2** | 码治理：`code_hash` 落库 + 归一化唯一索引 + 揭示/导出（含审计与权限分离） | 迁移 0004 + 双写回填 + 接口 + 后台 | 明文不再出现在列表 wire；导出留痕；大小写重复码被拒 |
| **S3** | 一单一张券 + 叠加矩阵 + 门槛/封顶生效 | 核销规则 + 应用唯一键 | 同单双券被拒；`EXCLUSIVE` 生效 |
| **S4** | 预算账户与流水（预留→结算/释放）+ 取消/退款联动 | 迁移 0005 + 规则改造 + 结算作业 | 超额让利被拒；取消订单释放预算 |
| **S5** | 作废/补发/停发 + 过期扫描 + 对账报表 | 状态机补齐 + 作业 + 报表接口/页面 | 泄露券可一键作废；`claimed = count(wallet)` 可对账 |
| **S6** | 人群/范围/归因/展示素材/外部平台绑定 | 规则表 + 评估器 + 绑定表 | 「仅新客/限品类」可被验证拒绝 |

---

## 6. 验收与回归基线（每阶段必跑）

```bash
# 券引擎
cd sdkwork-promotion
cargo test -p sdkwork-commerce-promotion-repository-sqlx
cargo test -p sdkwork-commerce-promotion-service
cargo test -p sdkwork-routes-promotion-backend-api
node ../sdkwork-specs/tools/check-database-framework-standard.mjs --root .

# 履约
cd sdkwork-order && cargo test -p sdkwork-order-service --test account_value_fulfillment_standard

# 运营台
cd sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc
pnpm typecheck && pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
node ../../../sdkwork-specs/tools/check-i18n-standard.mjs --root D:\sdkwork-space\sdkwork-cloudrouter
```

**对账 SQL（上线后每日）**

```sql
-- 1. 计数漂移
SELECT s.id, s.claimed_quantity,
       (SELECT COUNT(*) FROM promotion_user_coupon c WHERE c.stock_id = s.id) AS wallet_rows
FROM promotion_coupon_stock s
WHERE s.claimed_quantity <> (SELECT COUNT(*) FROM promotion_user_coupon c WHERE c.stock_id = s.id);

-- 2. 未履约券订单（P0-6 兜底）
SELECT o.id, o.status, o.fulfillment_status, oi.sku_snapshot_json
FROM commerce_order o JOIN commerce_order_item oi ON oi.order_id = o.id
WHERE o.subject = 'coupon_recharge' AND o.fulfillment_status = 'unfulfilled' AND o.status = 'paid';

-- 3. 失败兑换分布（S1 后）
SELECT failure_code, COUNT(*) FROM promotion_code_redemption_attempt
WHERE outcome = 'failed' AND occurred_at >= TO_CHAR(NOW() - INTERVAL '1 day', 'YYYY-MM-DD HH24:MI:SS')
GROUP BY 1 ORDER BY 2 DESC;
```

---

## 7. 本轮已落地（对照上一轮）

| 已完成 | 说明 |
|---|---|
| 兑换 409 根因 | 时间戳文本比较 → 时刻比较（含领取、预览、池码、会员卡扫描、核销窗口） |
| 生成/兑换对齐 | 批次窗口规范化、offer/版本/容量/窗口出码前校验、`per_user_limit` 生效、码大小写归一 |
| 自定义全码 | 契约 + 服务 + 仓储 + 迁移 + 后台表单（一行一码，4–64 位，唯一） |
| 多用途码 | `max_claims` 可配置（公共共享码） |
| 领取链路 | 补 `uuid`（`promotion_user_coupon`）、预览接口去递归、库存约束大小写修正（迁移 0002） |
| 现金券履约 | 订单侧 unit code 写币种 + 历史订单加载回退 |
| 订阅券 | 权益规则补 `productId/skuId/packageId`（订单侧必需），`quarter` 提前拒绝并从下拉移除 |

**仍在队列**：上文 §3 中除「本轮已落地」外的全部 P0/P1，按 §5 的 S1–S6 推进。

### 第二轮（本轮）追加落地

| 缺陷 | 修复 | 证据 |
|---|---|---|
| 领取流水 INSERT 引用不存在的列 | 列集对齐 `promotion_coupon_ledger_entry`，补 `uuid`/`business_no` | `cargo test -p sdkwork-commerce-promotion-repository-sqlx` → 31 passed |
| `organization_id` 绑 NULL | 统一 `organization_binding()` → `'0'`，覆盖 14 处 INSERT | 同上（含源码扫描测试） |
| 定向发券枚举错值 | `claimed` / `user` / `debit` / `distribution` + `uuid` + `source_*` | 同上 |
| 幂等重放解码 TEXT→i64 | 改 `String` | 同上 |
| 会员卡扫描锁泄漏 | `pg_try_advisory_xact_lock` + 事务内两次扫描，异常必释放 | 同上 |
| 会员卡消耗守卫未校验 | 校验 `rows_affected() != 1` → 409 | 同上 |
| 核销记录缺 `uuid`/`discount_type` | 补 `uuid`；`discount_type` 取自冻结版本 | 同上 |
| 一单多券可重复让利 | 核销前 `ensure_order_has_no_conflicting_application`：双方均须 `COMBINABLE` | 同上 + §5 S3 |
| 契约：`ownerUserIds` 声明为 number、5 个请求 schema 未闭合 | 改为 int64 字符串；补 `additionalProperties: false` | `promotion_sdk_generate.mjs --check` passed |
| 后台：领取/核销页状态筛选恒 0 行；分页无法跳页；导出静默明文 | 见 `console-p0` 交付（状态词表按域声明、int64 分页解析 + 跳页、导出显式确认与计数） | `pnpm typecheck` + 营销包测试 + i18n 标准检查 |

**未改动但已定位（需要独立决策）**：app-api 的 `x-sdkwork-permission` 与 `PERMISSION_STANDARD_SPEC` 互相冲突（生成器要求、权限分级规范禁止），需规范所有者裁定；金额字段的 minor/major 语义需统一后再打 `x-sdkwork-money-unit`（否则会固化一个错误的单位）。

---

## 附录：审计来源

1. `db-audit`：DDL/索引/完整性/迁移卫生（13 张表逐列、14 条不变量判定、9 条热路径索引分析）。
2. `state-audit`：状态机、并发证明/反证、幂等键、卡死态、审计链完整性。
3. `console-audit`：13 个页面/8 个抽屉、23 条运营缺口、金额单位与格式化风险、18 条 UX/一致性缺陷。
4. `contract-audit`：操作面/错误码/契约规则/SDK 生成就绪度（本轮未合并，待补充）。

每一条断言的 `path:line` 证据保存在各审计报告中；本文件只做收敛与排序，不重复粘贴。
