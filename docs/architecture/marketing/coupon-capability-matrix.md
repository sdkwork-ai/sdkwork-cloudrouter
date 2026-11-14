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
| **人群资格（新客/回流）** | 仅存字段 | **应用层：claim/redeem/apply 按用户已支付订单数校验（已落地）** |
| **商品范围（充值/订阅）** | 仅存字段 | **应用层：订单抵扣 apply 按订单 subject 校验（已落地）** |
| 计数与明细一致 | 无对账 | 后台库存页有"账不平"标记；对账作业待 S5 |
| 码大小写唯一 | 唯一索引区分大小写 | 查找函数索引已补；**归一化唯一**待数据核查后加 |
| 兑换尝试有证据 | 无 | **已落地（成功同事务、失败独立事务；order 路径成功尝试也已写入）** |
| 码只能受控访问且留痕 | 无（列表直接返回明文、导出无审计） | **已落地**：列表掩码 + 揭示/导出走审计接口 |
| 码身份不可逆推、查找走索引、大小写唯一 | 明文查找全表扫描 | **已落地**：`code_hash`（sha256 归一化）+ 唯一约束 + 哈希首查；明文保留仅供审计化揭示/导出（生产实测 100/100 行可回填、0 重复） |
| 时间窗 `end > start` | 仅出码批次校验 | 待 S5（DB CHECK） |
| 金额单位唯一 | 混用（major/minor/资产单位） | **券权益已对齐**：算力券规则=整数算力额度，订单/账本=微积分；会员积分=整数；现金=最小单位。其余营销金额列仍待统一 |

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

### 5.3 生产缺陷与修复：算力券 110 额度只入账 +0.00011（2026-11-11）

**现象**：运营创建面值 110 的算力券（`token_bank_credit`），用户兑换后 Token Bank 流水为 `+0.00011`，期望 `+110`。

**根因**：券规则 `grantAmount`/`bonusAmount` 是**整数算力额度**（运营输入 110 就是 110 算力额度），而 Token Bank 账户账本以**微积分**记账（1 算力额度 = 1e6 微积分）。promotion 的订单权益解析把 110 原样交给订单/账户，账本于是只增加 110 微积分 = 0.00011 算力额度。赠送额度也走同一条路径，因此同样缩小 1e6 倍。

**修复**：

| 层 | 变更 |
|---|---|
| promotion 订单权益 | `parse_order_coupon_benefit` 先合并 `grantAmount + bonusAmount`（整数算力额度），再 `checked_mul(1_000_000)` 转微积分；legacy 无规则券同样处理。溢出在核销前以 validation 拒绝。 |
| promotion 直兑入账 | `credit_coupon_benefit_in_tx` 与 `map_redemption_preview` 对 Token Bank 使用同一微积分口径。 |
| order 客户端 | `@sdkwork/order-service`、H5 `normalizeCouponRedemptionResult`、小程序 `formatTokenBankPoints`、Flutter `formatTokenBankPoints` 都把 Token Bank 微积分换算回算力额度展示；PC/H5/小程序/Flutter 兑换结果不再显示裸微积分或误除 100。 |
| 后台展示 | 兑换尝试台账按微积分格式化算力额度；券详情/表单明确「算力券（算力额度）」与「会员积分券（会员积分）」两套口径。 |
| 回归 | promotion `coupon_benefit`：110 → 110_000_000、110+20 → 130_000_000、legacy 500 元 → 5_000_000_000 微积分、溢出拒绝；order-service：110000000 微积分 → 110。 |

**口径结论**：`token_bank_credit` = 算力券 → Token Bank 算力额度；`points_credit` = 会员积分券 → 会员积分（Points）账户。两者不是重复券种，此前是把会员积分券误标成「算力额度券」才看起来重复。

**存量账务**：修复只改变后续核销的换算，已写入 `acct_ledger_entry` 的 `+0.00011` 历史流水不会被重放。若该券已核销且余额需要补正，应以 `token_bank_grant` 业务类型补记差额（110 算力额度 − 已入账 0.00011 = 109.99989 算力额度，即 109_999_890 微积分），并在来源备注写清原订单号/券码后四位；不要直接改账本行。

### 5.4 商业化落地复核（2026-11-12）

本轮新增修复：

| 问题 | 修复 | 验证 |
|---|---|---|
| 现金券币种在订单层丢失：promotion 携带 `currencyCode`，order 集成丢弃并按 CNY 建单，USD 现金券会入 CNY 现金账户 | `CouponRedemptionBenefit::CashCredit` 增加 `currency_code`；订单快照写入/读取 `currencyCode`；专用与通用兑换路由都以券币种建单；PC/H5/小程序/Flutter 按币种展示 | promotion `order_cash_credit_parses_grant_amount_with_offer_currency`；order `coupon_snapshot_preserves_cash_currency...`；order-service/PC/H5 测试 |
| 券中心兑换仍走 promotion 直兑路由（写不存在的 `commerce_account`，必然 500） | Cloud Router 券中心通过 `createSdkworkCouponController` 覆盖 `redeemCoupon`，改走 order-owned 兑换链路（与钱包一致） | Cloud Router `commerce-business-runtime.test.ts`；`pnpm typecheck` |
| promotion 直兑路由写不存在的 `commerce_account` | 已下线写入路径：`redeem_promotion_code` 返回 409 `promotion direct code redemption is retired; redeem ... through the order coupon redemption API`，不再以 storage 500 暴露 | promotion 单元测试 `order_failure_attempt_is_written_after_rollback_and_direct_is_retired` |
| `goods_scope` 仅存库不生效 | 订单抵扣 apply 读取订单 `subject` 并在核销前校验 `ALL/RECHARGE/SUBSCRIPTION`；未知值 fail-closed | promotion `goods_scope_limits_order_discount_application` |
| `audience_scope` 仅存库不生效 | claim/redeem/apply 统一按用户已支付订单数校验 `ALL/NEW_USER/RETURNING_USER`；订单域不可用时非 ALL 场景 fail-closed | promotion `audience_scope_requires_the_matching_paid_order_history` |
| order 路径兑换未进 attempt 台账 | `redeem_promotion_code_for_order` 在兑换事务内写成功 attempt，失败后在事务外写 failure attempt（含 order id）；后台兑换记录可见成功/失败 | promotion `order_redemption_writes_success_attempt_evidence`、`order_redemption_writes_failure_attempt_after_rollback` |
| 券码可被高频暴力尝试 | preview/redeem（direct + order）在事务内按 subject 统计最近 10 分钟 failed attempt，≥20 次直接拒绝；后台 attempts 页新增 `rate_limited` / `coupon_expired` / `coupon_not_redeemable` / `audience_not_eligible` 文案 | promotion `redemption_paths_enforce_a_failure_rate_limit`、`every_redemption_rejection_maps_to_its_documented_failure_code`；Cloud Router admin 214 |
| 订单抵扣 apply 在真实 PG 必然失败 | `load_user_coupon_for_discount_apply` 的 `FOR UPDATE` 锁到 LEFT JOIN 可空侧；`promotion_discount_application` insert 漏 `owner_user_id`（NOT NULL）；replay 用 `stored_money_minor_units` 把已是最小单位的金额再 ×100 | 真实 PG 集成测试 `claim_then_redeem_consumes_one_coupon_and_one_stock_unit` 覆盖 apply + budget + replay |
| app 用户券金额 100x | app user coupon 的 `amount` 是最小单位，PC 用 `formatMoney` 按 major 渲染；app 路由新增 `minor_units_to_major_string` 转换 | promotion app route `minor_units_are_rendered_as_major_units_for_the_app_surface` |
| 订单抵扣 settle/release 金额 100x | `promotion_discount_application.discount_amount` 已是整数最小单位，admin settle/release 又用 `money_cents` 按 major 解析；改为 `contract_money_minor_units` | 真实 PG 集成测试 settle：预算 `(97000, 0, 3000)`、application `settled`、replay 0 |
| 订单侧无法按抵扣改价 | 新增 `PostgresCommerceOrderStore::apply_order_discount`：锁定 order + `order_total` breakdown，累加折扣、重算 payable、校验订单状态与上限 | 真实 PG `order_discount_postgres`：3000→7000、再 500→3500/6500、超额拒绝、paid 拒绝 |
| order 无 promotion 抵扣端口 | 新增 `PromotionDiscountPort`（apply / settle-by-order / release-by-order）+ `PromotionDiscountAdapter` + `OrderServiceHost` 注入；金额只接受整数最小单位 | order integration `applied_discount_amount_is_read_as_integer_minor_units` |
| 无“订单应用券”路由 | 新增 `POST /app/v3/api/orders/{orderId}/discount`：promotion apply → order 改价；改价失败时 release 补偿；route manifest、OpenAPI、生成的 order app SDK 均已更新 | order app `cargo check`、`api:assembly:validate`、api pattern/envelope checks passed；SDK 生成 `orders.discount.create` |
| checkout 前端无调用入口 | order service 新增 `applySdkworkOrderDiscount`，封装生成的 `orders.discount.create`，校验必填并归一化最小单位金额 | order-service vitest `order-discount-service.test.ts` 2 passed |
| 支付成功不结算抵扣预算 | `settle_owner_order_after_payment_success_with_registry` 在履约后调用 `promotion_discount_port.settle_discounts(order)`；失败记录错误但不阻断已成功支付的 webhook ack | order service 50 单测 + payment notify 10 + account value 12 passed |
| 超时订单不释放抵扣预算 | expiration scheduler 在过期订单关闭支付/释放库存后调用 `promotion_discount_port.release_discounts(order)`，失败仅告警；promotion 过期清扫兜底 | order host `cargo check` 通过 |

#### 5.4.1 真实 PostgreSQL 集成回归

`crates/sdkwork-commerce-promotion-repository-sqlx/tests/pg_coupon_lifecycle.rs` 在一次性 `promotion_it` 库上重建 public schema（baseline + 0001–0008）并执行：

```bash
DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/promotion_it \
  cargo test -p sdkwork-commerce-promotion-repository-sqlx --test pg_coupon_lifecycle
```

覆盖并通过：

- realtime claim 生成 `CL...` 码；
- wallet list 权益快照（算力券 110+20=130）；
- offer catalog 可见、剩余库存 9；
- 用领取码走 order 路径兑换 → `130_000_000` 微积分；
- 库存 `(available, claimed, redeemed) = (9, 1, 1)`，只扣一次；
- 只存在一条 `promotion_user_coupon`，状态 `redeemed`；
- 成功 attempt 记录 `token_bank_credit / 130000000`；
- 同一 order id 重放 → `replayed=true`，库存/券行不变；
- batch 码池领取到预生成码并可兑换；
- 会员积分券 → `points_credit / 50`；
- USD 现金券 → `grant_units=10050, currency_code=USD`；
- 过期领取券 → 拒绝且 `redeemed_quantity` 不变；
- FIXED ¥30 订单抵扣 apply → `discount_amount=3000` 最小单位，预算 `(97000, 3000)`，replay 不重复预留；
- 抵扣冲正 → 预算恢复 `(100000, 0)`、application `released`、券回到 `claimed`，replay 不重复释放；
- 支付结算 → 预算 `(97000, 0, 3000)`、application `settled`、replay settle 0；
- NEW_USER 券被已有支付订单的用户拒绝，库存不消耗；
- 订阅券 → `package_id=1 / duration=30 / daily=100 / total=1000`；
- 权益发放汇总 → 算力券 `240000000` 微积分×2、积分 `50`、现金 `10050 USD`、订阅配额 `1000`；
- 20 次失败后 preview 被限流拒绝。
| realtime 领取券不可兑换，claim→redeem 重复插行/计数 | `redeem` 先回查 `promotion_user_coupon.coupon_code`，消费既有领取券（`status='redeemed'`、不新插行），并跳过 claim 已计过的库存/券码计数；order replay 按订单号+券码找回；券中心 `claimed/pending/issued` 归一为 available，并兼容 app `code` 字段 | promotion `claimed_coupon_redemption_consumes_the_existing_row`、`order_redemption_replay_finds_a_claimed_coupon_by_order_and_code`；Cloud Router typecheck/commerce tests |
| 券中心“我的券”始终为空 | app API `userCoupons.wallet.list`/`retrieve` 原为 stub（返回空/404），且 app 返回 `data.items`、PC 只读 `content`；已实现 wallet list/retrieve（复用 `list_promotion_user_coupons` 并按 id 查找），PC 同时兼容 `content`/`items` | promotion app routes compile；Cloud Router `pnpm typecheck`、`commerce-business-runtime.test.ts` 22 passed |
| 券中心“可领取”目录为空 | app `offers.list`/`offers.retrieve` 原为 stub；新增 tenant-scoped offer catalog 查询（active offer + 有效 stock 聚合，含 claim 窗口/剩余量/每人限领/权益条款），offers 路由改为 authenticated（`x-route-scope: console` + dual token） | promotion `cargo check`、`api:assembly:validate` passed |
| 券中心资产券面值显示 `—` | app user coupon 与 offer catalog 都从冻结的 `rule_json` 派生 `benefitKind/benefitAmount/benefitCurrencyCode`；券中心按“算力额度 / 会员积分 / 现金币种 / 配额”展示，折扣券回退到金额 | promotion `user_coupon_benefit_display_is_derived_from_frozen_rule_terms`；app route `user_coupon_response_keeps_the_frozen_benefit_snapshot`、catalog benefit test；Cloud Router typecheck |

> offers 改为 authenticated 后需要重新生成 promotion app SDK；当前 `pnpm sdk:check` 被既有 `codes.redemptions.create missing permission` 契约缺口阻塞，生成器未完成。该权限补齐后需重新生成并验证 Cloud Router 的 offers 调用头。
| 券中心/领取记录对资产券显示 0 CNY | 券中心列表/详情已对 0 面值改为空值占位；实际面值仍需 promotion 契约补字段（见下） | — |

### 5.5 仍未闭环的商业化缺口（按优先级）

| 缺口 | 现状证据 | 影响 | 建议 |
|---|---|---|---|
| **订单抵扣券未接结算** | `postgres_checkout.rs` 的 `discount_amount` 恒为 `"0"`，checkout 输入无 `couponCode`；promotion 的 apply/settle/release 只有独立接口 | 满减/折扣券创建后无法在结算页使用，属不可售能力 | 下一阶段在 order checkout 增 promotion 抵扣端口（quote 预留 → 下单绑定 → 支付成功 settle → 取消/超时 release），或在接入前隐藏 `FIXED/PERCENTAGE` 创建入口 |

### 5.6 商业化验证矩阵

| 层 | 命令/范围 | 最近结果 |
|---|---|---|
| promotion 仓储单测 | `cargo test -p sdkwork-commerce-promotion-repository-sqlx --lib` | 94 passed |
| promotion 服务单测 | `cargo test -p sdkwork-commerce-promotion-service --lib` | 45 passed |
| promotion app routes | `cargo test -p sdkwork-routes-promotion-app-api` | 6 passed |
| promotion 真实 PG | `--test pg_coupon_lifecycle`（四类券/人群/限流/apply/settle/release/reverse/replay/发放汇总） | 1 passed |
| order 仓储单测 | `cargo test -p sdkwork-order-repository-sqlx --lib` | 42 passed |
| order 改价真实 PG | `--test order_discount_postgres`（累加/超额/paid 拒绝） | 1 passed |
| order promotion 端口 | `cargo test -p sdkwork-order-integration-promotion` | 1 passed |
| order service 封装 | `applySdkworkOrderDiscount` vitest | 2 passed |
| order API 契约 | pattern / envelope / assembly / SDK 生成 | passed |
| Cloud Router | typecheck / admin 214 / commerce 22 / i18n 8500 | passed |

**商业化判定**：
- **资产型券（算力/会员积分/现金）**：账户映射、单位、币种、生命周期、审计、防刷、各端展示均已通过真实 PG + 分层测试，可商业化。
- **订阅券**：属于权益型券，由会员服务履约，不进入账户账本（`CommerceAccountAssetType` 只有 Cash / Points / TokenBank），因此不参与账户映射与账本单位校验。
- **订单抵扣券**：promotion 引擎（apply/预算/settle/release/reverse）、order 改价、API/SDK/service 均已验证；缺支付/取消回调与 checkout UI，尚不能宣称端到端可售。

### 5.7 契约检查遗留（requires a naming decision）

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
