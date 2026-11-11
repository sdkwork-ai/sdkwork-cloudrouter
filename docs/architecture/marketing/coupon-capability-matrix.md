# 优惠券中心：能力矩阵与数据库/Rust/API 回归报告

> 状态：v1 · 2026-11-10（第 4 轮回归）
> 配套文档：[体系对齐与路线](coupon-system-conformance.md) · [视觉与交互规范](coupon-center-design-system.md)
> 用途：一次看清「每个能力由谁提供、现在到哪一步、卡在什么上」。**本文只做矩阵与判定，不复述设计论证。**

---

## 1. 数据库设计

### 1.1 表清单与归属

| 表 | 作用 | 主键/唯一 | 索引是否覆盖热路径 | 状态 |
|---|---|---|---|---|
| `promotion_campaign` | 活动 | `uk(tenant,campaign_no)` | 列表 `(tenant,org,status,starts_at DESC)` ✓ | 在用 |
| `promotion_offer` | 优惠定义 | `uk(tenant,offer_no)` | 列表 ✓；`campaign_id` 无过滤索引 ✗ | 在用 |
| `promotion_offer_version` | 冻结规则版本 | `uk(tenant,offer_id,version_no)` | ✓ | 在用（`published_at` 从未写入） |
| `promotion_coupon_stock` | 券库存池 | `uk(tenant,stock_no)` + 2 个 CHECK | (`tenant,offer_id,status`) ✓ | 在用（`locked_quantity` 恒 0） |
| `promotion_code_batch` | 生成批次 | `uk(tenant,batch_no)`、`uk(tenant,idempotency_key)` | (`tenant,org,stock_id,status,created_at DESC`) ✓ | 在用（无 `failed` 状态） |
| `promotion_code` | 券码 | `uk(tenant,promotion_code)` | **`UPPER(BTRIM())` 查找走不了索引 ✗ → 本轮补函数索引** | 在用（明文存储，S2 迁移） |
| `promotion_user_coupon` | 钱包券 | `uk(tenant,coupon_no)`、`uk(tenant,coupon_code)`、`uk(tenant,idempotency_key)` | 领取列表按 `owner_user_id` ✓；按 `subject_id` ✗ | 在用 |
| `promotion_coupon_ledger_entry` | 库存流水 | `uk(tenant,idempotency_key)` | 无 `organization_id` → 后台需 JOIN 库存才能按组织过滤 ✗ → **本轮补列+回填+索引** | 在用 |
| `promotion_discount_application` | 核销事实 | `uk(tenant,application_no)`、`uk(tenant,idempotency_key)` | 无 `(tenant,user_coupon_id)` ✗ | 在用（`settled/released` 永不写入） |
| `promotion_distribution_task` / `_record` | 定向发放 | 各自唯一键 | ✓ / 记录表**只写不读** | 在用 |
| `promotion_member_card` / `_consumption` | 订阅券载体 | `uk(tenant,user_coupon_id)` / `uk(tenant,idempotency_key)` | ✓ | 在用（**未登记进 contract 注册表 → 本轮补**） |
| `promotion_code_redemption_attempt` | **兑换尝试台账（本轮新增）** | `uk(tenant,id)` + outcome CHECK | code/hash/subject/failure 四类索引 | **本轮落地** |

### 1.2 完整性判定（DB 约束 vs 应用 vs 无）

| 不变量 | 当前 | 本轮后 |
|---|---|---|
| 库存不超卖 | DB CHECK + CAS（双保险） | 不变 |
| 单券不可并发双兑 | 行锁 + CAS | 不变 |
| **一单不可叠加两张不可组合券** | 无 | **应用层：双方均须 `COMBINABLE`（已落地）** |
| 计数与明细一致 | 无对账 | 后台库存页有"账不平"标记；对账作业待 S5 |
| 码大小写唯一 | 唯一索引区分大小写 | 查找函数索引已补；**归一化唯一**待数据核查后加 |
| 兑换尝试有证据 | 无 | **已落地（成功同事务、失败独立事务）** |
| 码只能受控访问且留痕 | 无（列表直接返回明文、导出无审计） | **已落地**：列表掩码 + 揭示/导出走审计接口 |
| 码身份不可逆推、查找走索引、大小写唯一 | 明文查找全表扫描 | **已落地**：`code_hash`（sha256 归一化）+ 唯一约束 + 哈希首查；明文保留仅供审计化揭示/导出（生产实测 100/100 行可回填、0 重复） |
| 时间窗 `end > start` | 仅出码批次校验 | 待 S5（DB CHECK） |
| 金额单位唯一 | 混用（major/minor/资产单位） | **未动**，需单位决策 |

### 1.3 迁移卫生

- `0001` 基线 + `0002`（本轮前）+ `0003`（本轮）：均 `reversible:false` + forward-fix 说明，基线折叠标记保持一致。
- 已修：基线里两处与 `0002` 冲突的旧约束已折叠，`member_card*` 已登记进 `schema.yaml` / `table-registry.json`。
- 待办：`TEXT` 时间/金额尚未迁 `TIMESTAMPTZ`/`NUMERIC`（order/membership 已迁），属 S5/S6。

---

## 2. Rust 逻辑（状态机 / 并发 / 幂等）

| 关注点 | 判定 | 证据 |
|---|---|---|
| 单次码并发双兑 | ✅ 行锁 + CAS + CHECK | `postgres_promotion.rs` 核销路径 |
| 库存末位并发 | ✅ 谓词 + CHECK；无限库存按设计跳过数量守卫 | 同上 |
| 每人限领 | ✅ 改为读库存 `per_user_limit`（此前硬编码 1） | 前轮 |
| 幂等重放 | ✅ 同事务写 `commerce_idempotency_key`；重放返回原响应 | — |
| 幂等键跨意图冲突 | ⚠️ 三张表各自 `(tenant,key)` 唯一，复用键会永久 500 | 待 S5 加 scope |
| 失败重试 | ✅ 失败不落任何状态（本轮起落"失败尝试"） | 本轮 |
| 会员卡额度并发 | ✅ 行锁 + 求和 + CHECK；守卫结果已校验 | 前轮 |
| 生命周期扫描 | ✅ 事务级 advisory lock（此前会话锁泄漏会永久停摆） | 前轮 |
| 核销后链路失败 | ⚠️ 券已消耗、下游失败无补偿（无 outbox/saga） | S4 |
| 孤儿订单 | ⚠️ 兑换失败时订单已建（paid+unfulfilled） | 待 S1（与尝试台账同批） |

**结论：promotion 内部（不跨服务）的并发与幂等是可靠的；缺口集中在"跨服务一致性"和"事后证据"。**

---

## 3. API

### 3.1 两个 surface 的能力对照

| 能力 | app-api | backend-api | 判定 |
|---|---|---|---|
| 券码兑换 / 预览 | ✅ 真实实现 | ✗ 无 | 后台无法代客兑换/补偿 |
| 领取 | ✅ 实现（前轮修好 INSERT） | ✗ 无 | 后台不能代发单张 |
| 钱包券列表 | ✅ | ✅（列表） | 均无详情/作废/延期 |
| 优惠/库存/批次/发放 | ✗ | ✅ 列表 + 创建 | 无编辑、无停发、无重试 |
| 核销结算/释放/回滚 | ❌ 404 桩 | ✗ 无 | **两面都没有** |
| 会员卡 | ✅ 列表/详情/消耗 | ✗ 无 | 后台无卡运营 |
| 兑换尝试 | — | ✅ **本轮新增** | 证据层闭环 |
| 权限 | ⚠️ 全部缺失（规范冲突） | ✅ read/manage | 需裁决 |
| 错误码 | ⚠️ 业务失败全收敛为 409/40901 | 同 | 需错误码注册表 |
| 分页 | ⚠️ 伪分页（固定 page=1） | ✅ | — |
| int64/金额/时间标记 | — | int64 ✅；金额/时间 ✗ | 需单位与 wire 决策 |

### 3.2 本轮契约改动

- 新增 `redemptionAttempts.list`（后台）。
- `ProblemDetail` 补 `i18nKey`/`locale`/`instance`/`operationId`（运行时会发、契约未声明）。
- `ownerUserIds` 修正为 int64 字符串；5 个请求 schema 闭合 `additionalProperties`（上一轮）。
- 后端 SDK 已再生成并通过 `--check`。

---

## 4. 前后端能力矩阵（运营视角）

| 运营动作 | 后台现状 | 缺口 |
|---|---|---|
| 建券（5 种权益） | ✅ | 金额/门槛/封顶字段被硬编码为 0 |
| **改券** | ❌ | `offers.update` 存在，UI 未接；无 `version` 乐观锁 |
| 复制券 | ✅（但重置发放配置） | 复制语义未提示 |
| 停用/启用券 | ✅（本轮加确认） | — |
| 删券 | ✅ | 活动中的券不可删，需先停用（已有引导） |
| 建库存池 | ✅ | 库存本身不可停发（改由"批次停用未使用券码"止损） |
| 生成券码（系统/自定义） | ✅ | 无失败态、无重新生成；**已具备单码/批次停用** |
| 查看券码 | ✅（列表掩码 + 逐行揭示留痕） | 无详情抽屉（可选） |
| 导出券码 | ✅（服务端审计导出 + 5000 截断提示） | 明文落库待 S2 二期 |
| 查看领取记录 | ✅ | **已具备作废与延期**；无重发（补发待 S5） |
| 查看核销记录 | ✅ | **已按订单/券/用户券筛选**；无对账汇总 |
| **查看兑换失败** | ✅ | — |
| 定向发放 | ✅ | 无逐人结果、无重试（S1） |
| 库存对账 | ✅（对账条 + 账不平） | 无跨批次汇总 |
| 活动管理 | ✅ CRUD | 无券关联下钻；更新未带 version |
| 报表 | ⚠️ 8 个计数 | 无核销率/GMV/让利额/时间范围 |

---

## 5. 本轮判定
| 层 | 判定 |
|---|---|
| 数据库 | **可上线**：新增证据表 + 两个设计缺陷修复（流水 organization_id、码查找索引）+ 注册表补齐；金额/时间类型迁移与归一化唯一索引待办 |
| Rust 逻辑 | **可上线**：promotion 内部并发/幂等可靠；跨服务补偿（S4）与孤儿订单（S1）待办 |
| API | **可上线**：后台新增尝试查询、ProblemDetail 补全；app-api 权限与错误码需决策后统一改造 |
| 前后端能力 | **已具备商业化闭环的最小集**：建券→发码→兑换→证据→对账；缺改券、作废/补发、报表三类能力 |

### 已落地（累计）

| 层 | 交付 | 验证 |
|---|---|---|
| DB | 迁移 `0003`～`0008`：尝试台账、审计事件（动作 11 类）、作废列与扫描索引、预算账户/流水+结算预留列+库存预算上限、`code_hash` 回填与唯一约束、补发血缘；order 侧 `0021` 失败履约证据；全部折叠进基线并登记注册表 | `Database framework standard passed`（两仓） |
| Rust | 成功尝试同事务 / 失败尝试独立事务；失败码 7 类；只落哈希+末 4 位 | 仓储 83 / 服务 45+4 / 路由 17+19 / 宿主 1 |
| Rust | 乐观锁语义 404→409；错误映射 `conflict→409`/`invalid-state→422` | 映射单测 |
| Rust | 止损：单码/批次停用、作废/延期、过期扫描（锁 420） | 同上 |
| Rust | S4：申请原子预留 → 结算/释放；过期预留扫描（集合式、锁 430）；退回释放预留 | 同上 |
| Rust | 金额条款：`NONE/FIXED/PERCENTAGE` 校验 + 整数 minor 计算（`i128`、半进位、封顶、门槛）；订单总额按生产实测 `NUMERIC(20,0)` minor 读取 | 折扣计算 8 组表驱动 |
| Rust | S2：`code_identity()` 统一写入；兑换按哈希索引首查、未命中回退并在同事务修复 | 生产只读演练：100/100 可回填、0 重复；SQL==Rust==Node |
| Rust | 补发：单事务"审计→停用→插入（继承库存/版本/批次/类型/窗口/maxClaims）"，响应只回掩码 | 仓储 79 / 服务 34 / 路由 16+17 |
| Rust/API | 报表：闭区间窗口、基点整数、分币种金额、Top5、只读事务 | 仓储 83 / 服务 45 / 路由 17+19；SDK 33 ops |
| API | 尝试查询、揭示/导出、停用×2、作废/延期、结算/释放、补发、报表、库存预算上限与预算快照、列表掩码 | SDK `--check (33 operations)` |
| 前端 | 兑换尝试页、券编辑、码脱敏+揭示+审计导出、作废/延期/停用/批量停用、补发、核销三过滤、预算使用率/超限/录入、结算/释放、满减/折扣条款作者化、经营报表页 | 营销包 **214 tests / 23 files**、typecheck、i18n 7007 files |
| order/Rust | 跨服务补偿：履约失败落证据（尽力、不替换业务错误）、`failed` 可重试自愈、成功时清除证据 | 仓储 41 / 服务 9 / 路由 42 |

**至此原计划六项能力全部落地**：数据库设计 · 状态机与并发 · 权益/叠加/预算 · 券码生成与防滥用 · 审计与运营 · 契约与后台完备性。剩余为**交付复核**（§5.1）。

**已确认接受的取舍**：券码明文仍保留在 `promotion_code.promotion_code`，因为审计化「揭示/导出」必须返回原值；本期通过 `code_hash` 承担唯一性与查找、并已具备掩码/权限/审计三层管控。若要彻底移除明文，需要引入**加密列 + 密钥托管**（KEK 归属是运维决策），不在本期擅自实施。

### 5.1 交付复核结果（已执行）

**迁移实跑（隔离库，非生产数据）**

在 PostgreSQL 18.6 上新建临时库，先跑 promotion 基线，再**按序重跑** `0001`–`0008`（验证幂等），随后叠加 order 基线与 `0021`：

| 步骤 | 结果 |
|---|---|
| `0001_promotion_baseline.sql` | 仅 NOTICE，无错误 |
| `0001`–`0008` 迁移文件逐个 `ON_ERROR_STOP=1` | 8/8 `exit=0`（全部为 `already exists, skipping`） |
| order 基线 + `0021` | 通过；`commerce_order` 新增 2 列 + 部分索引 |
| 临时库 | 用完即删；复核 `pg_database` 仅剩生产库 |

**对象与约束实测**

| 断言 | 结果 |
|---|---|
| `code_hash`/`code_last4` NOT NULL + `uk_promotion_code_hash` 存在 | ✅ |
| `INSERT` 不带 `code_hash` | ❌ 被 `NOT NULL` 拒绝（符合预期） |
| `ABC123XY` 与 `abc123xy` 同租户两次插入 | ❌ 第二次被 `uk_promotion_code_hash` 拒绝（**大小写唯一生效**） |
| 预算账户 `available+reserved+used > total` | ❌ 被 `chk_pba_amounts` 拒绝 |
| 失败尝试缺少 `failure_code` | ❌ 被 `chk_pca_failure` 拒绝 |
| 审计动作 CHECK | 11 类齐全 |
| 4 张新表 | 全部存在 |

**本轮复核发现并修复的两个交付缺陷**

1. **PG 版本可移植性**：`0007` 原本直接调用 `sha256(bytea)`——这是 **PostgreSQL 18 新增内置函数**，PG ≤17 会直接失败。已改为运行期解析：优先内置 `sha256`，回退 pgcrypto `digest(...)`，两者都不可用时抛出**明确异常**而非"函数不存在"。
2. **迁移不可重跑**：`0007` 的 `ADD CONSTRAINT uk_promotion_code_hash` 无守卫，在"基线已含该约束 + 再跑迁移"的场景会中断。已用 `pg_constraint` 存在性判断包住，`0007` 现可幂等重跑。

**仍需人工确认的三项**（不阻塞代码，阻塞发布口径）

- app-api 权限规范冲突（生成器要求 `x-sdkwork-permission`，`PERMISSION_STANDARD_SPEC` 禁止 app-api 使用）——需规范所有者裁定；
- 金额口径：历史 `discount_value`/`minimum_amount` 为十进制主单位，新列一律 `*_minor`；两者边界已显式转换，但"是否统一到 minor"仍待拍板；
- 券码明文加密的 KEK 归属（运维决策）。

### 5.2 生产事故与修复：订单→账户账本的调用方式（2026-11-11）

**现象**：`POST /app/v3/api/orders/coupon_redemptions` 返回 500（`code=50001`），traceId `0722c0da-…`。

**根因**（与券码逻辑无关）：订单履约需要把权益写入账户账本，而 `sdkwork-order-integration-account` 的适配器默认走 **HTTP**（`SDKWORK_ORDER_ACCOUNT_LEDGER_ADAPTER` 未设置 → `http`），HTTP 适配器要求 `SDKWORK_ACCESS_TOKEN`；生产既没有该 token，也**没有独立的账户 HTTP 服务**（只有 gateway / knowledgebase-rpc / redis / postgres 四个容器），因此在发请求前就 hard-fail：

```
error_code="storage"
error=SDKWORK_ACCESS_TOKEN is required for account value ledger commands; …
```

**影响**：2 张券被消耗（`083A1A1230A04AF6`、`3C763DB9F5C64E21`，`claimed_quantity` 已达 `max_claims`），2 张订单 `fulfillment_status=failed`（失败原因已落库），`acct_ledger_entry` **0 行**（说明该链路从未在线上成功跑通过）。

**修复（架构层）**：既然 account 模块与 order 模块在同一进程、同一 PostgreSQL，直接调用 Rust 仓储即可，不该绕一圈 HTTP：

| 变更 | 内容 |
|---|---|
| 默认值 | `store`（进程内，走同一 `acct_*` 仓储）；仅当数据库引擎非 PostgreSQL（客户端 SQLite）时保留 `http` |
| `http` | 降级为**显式**开启，并要求 `SDKWORK_ACCESS_TOKEN` + `SDKWORK_ACCOUNT_BACKEND_API_ORIGIN` |
| 失败时机 | `http` 适配器缺 token 时在**启动**即失败（不再等到首次核销、券已消耗后才 500） |
| 库内 panic | 两处 `panic!`（非 PostgreSQL 池）改为返回明确错误，符合 RUST_CODE_SPEC |
| 单一决策点 | 两个端口构建器共用 `account_ledger_adapter_mode()`，并有 6 条单测覆盖默认/显式/非法值 |

**遗留**：订单路径 `redeem_promotion_code_for_order` 不写 `promotion_code_redemption_attempt`（只有独立的 `/promotion/codes/redeem` 写），因此最常用的核销路径缺少失败证据——应补。

### 5.3 契约检查遗留（requires a naming decision）

`check-api-operation-patterns.mjs` 仍以退出码 1 结束，原因是两个**历史**字段（各在权威契约与派生镜像中出现一次，共 4 条）：

| 字段 | 实情 | 建议 |
|---|---|---|
| `PromotionOverview.discountApplications` | 是**计数**，不是金额 | 改名为 `discountApplicationCount`（含 `count` 段即可被规则正确识别） |
| `PromotionCouponLedgerEntry.balanceAfter` | 是会员卡**额度余额**（`total_quota - used`），不是金额 | 改名为 `quotaBalanceAfter` 或 `remainingQuantityAfter`（需含 `count/quantity` 段） |

两者都是**公开 wire 字段改名**，按 `AGENTS.md`「changing public naming」必须经人工评审，因此本轮**未擅自修改**；已在前端/后端保持现状（当前格式化逻辑按计数与额度处理，语义正确）。

---

## 6. 回归命令（每次改动后按层跑）

```bash
# DB
cd sdkwork-promotion && node ../sdkwork-specs/tools/check-database-framework-standard.mjs --root .
# Rust
cargo test -p sdkwork-commerce-promotion-repository-sqlx
cargo test -p sdkwork-commerce-promotion-service
cargo test -p sdkwork-routes-promotion-backend-api
cd ../sdkwork-order && cargo test -p sdkwork-order-service --test account_value_fulfillment_standard
# API
cd ../sdkwork-promotion && node tools/promotion_sdk_generate.mjs --check
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
# 前端
cd ../sdkwork-cloudrouter/apps/sdkwork-cloudrouter-pc && pnpm typecheck
pnpm --filter @sdkwork/cloudrouter-pc-admin-marketing test
node ../../../sdkwork-specs/tools/check-i18n-standard.mjs --root D:\sdkwork-space\sdkwork-cloudrouter
```
