# Admin 支付中心：支付记录与退款记录查询能力

Status: implemented
Owner: sdkwork-cloudrouter (admin UI) + sdkwork-payment (backend read contract)
Date: 2026-11-14

## 1. 目标

Admin 支付中心原先只有配置类页面（服务商、支付方式、通道、路由规则、账户），
运行态记录页（支付意图 / 退款）能力薄弱：没有服务端筛选、没有时间范围、搜索只过滤
当前页、金额按原始整数展示、记录之间不可互查、不能导出。支付运营与财务对账因此无法
在控制台内完成闭环查询。

本变更把「支付记录」「退款记录」两块提升到可商业化交付的查询能力，做法是对齐 Stripe
Dashboard / Adyen CAU / 支付宝商户平台的记录页基线。

## 2. 行业基线差距与处理

| 能力 | 行业基线 | 变更前 | 现在 |
| --- | --- | --- | --- |
| 创建时间范围筛选 | 必备（今日/近 7 天/近 30 天/自定义） | 无 | `created_after` / `created_before`（RFC 3339），UI 提供起止时间 |
| 状态筛选 | 必备 | 无（仅当前页文本搜索） | 服务端 `status` 枚举 |
| 服务商筛选 | 必备 | 无 | 服务端 `provider_code` |
| 币种筛选 | 常见 | 无 | 服务端 `currency_code`（大小写不敏感） |
| 退款原因筛选 | 财务常用 | 无 | 服务端 `reason_code`（五类枚举） |
| 自由文本搜索 | 覆盖全部结果集 | 仅过滤已加载页 | 服务端 `q`：意图号 / 订单号 / 归属用户；退款单号 / 订单号 |
| 总数与分页 | 服务端 total + 页码 | 有 total，但搜索不跨页 | 筛选与搜索都走服务端，分页语义一致 |
| 金额展示 | 最小货币单位 → 本地货币格式 | 原始整数 / 错误小数 | 统一 `formatPaymentAmount`：按币种指数换算 + 货币符号 |
| 记录互查 | 支付 → 尝试 / 退款 | 明细仅字段列表 | 支付明细内置尝试与退款；退款明细含生命周期 |
| 结果导出 | CSV（当前筛选全集） | 无 | 服务端逐页取全量（上限 5,000 行），UTF-8 BOM |
| 列表总数 | 必备 | 仅有页码 | 分页栏显示「总计 N 条 · 显示 x-y」 |
| 结果集汇总 | 必备（财务口径） | 无 | 服务端聚合：记录数、按币种金额合计、按状态/原因计数；筛选变化即重算 |
| 支付尝试筛选 | 常见 | 无 | 状态 / 服务商 / 意图 ID 服务端筛选（契约已支持） |
| 回调事件筛选 | 常见 | 无 | 状态 / 服务商 / 事件类型 服务端筛选（契约已支持） |
| 对账任务筛选 | 常见 | 无 | 状态 / 服务商 / 支付账户 服务端筛选（契约已支持） |
| 空/错误/清空筛选 | 必备 | 无清空入口 | 一键清空筛选 + 空态与错误态 |

## 3. 契约变更（sdkwork-payment backend-api）

`GET /backend/v3/api/payments/intents`

- 新增 `provider_code`、`currency_code`、`created_after`、`created_before`
- `q` 由契约声明变为实际实现：`payment_intent_no` / `order_id` / `owner_user_id` 的
  `LOWER(...) LIKE` 匹配
- `deleted_at IS NULL` 谓词补齐，软删除记录不再出现在运营列表

`GET /backend/v3/api/payments/refunds`

- 新增 `provider_code`、`currency_code`、`reason_code`、`created_after`、`created_before`
- 保留既有 `q`（退款单号 / 订单号）

金额语义

- `Refund.amount` 原本以 `CAST(amount AS TEXT)` 返回 `"1250.00"`（NUMERIC 文本），
  与 schema 声明的「整数最小单位」不一致；现统一为 `CAST(amount AS BIGINT)::TEXT`
  （`"1250"`），与支付意图、支付尝试、仓储读模型一致。
- OpenAPI 为 `PaymentIntent.amount`、`PaymentAttempt.amount`、`Refund.amount`
  补充「integer in the currency's smallest unit」描述。

参数规则

- 时间边界按 `API_SPEC.md` §14.1.1 命名（`created_after` 含、`created_before` 不含），
  在路由层用 `chrono` 校验并归一化为 UTC；非法/倒置窗口返回 400（`validation`），
  不再让非法时间串落到 SQL 变成 500。
- 空字符串等价于「未筛选」（`normalize_filter_value`），避免未填写的输入框把结果集收窄为零。

## 4. 前端变更

- `AdminResourceCenter`（`sdkwork-cloudroutes-pc-commons`）：新增
  - `filters[].kind`：`text` / `date` / `datetime-local` / `number`（默认仍为 select）
  - `searchMode: 'server'`：搜索词防抖后随 `load` 下发为 `search`，服务端模式下不再客户端过滤
  - `resolveToolbarActions(query)`：需要当前筛选快照的工具栏动作（导出）
  - 文本/日期筛选 350ms 防抖提交；条件变化回到第 1 页；「清空筛选」按钮
  - 全部为可选扩展，既有页面行为不变
- `sdkwork-cloudrouter-pc-admin-payments`：
  - `services/paymentRecordsQuery.ts`：筛选 → 列表查询参数（含 datetime-local → UTC）
  - `services/paymentRecordsExport.ts`：CSV（RFC 4180）、逐页取全量、文件名、下载
  - `paymentMoney.ts`：最小货币单位 → 货币格式（零/三位小数币种、超大金额字符串运算）
  - 支付记录 / 退款记录页：服务端筛选 + 服务端搜索 + 导出 + 金额格式
  - 支付尝试 / 回调事件 / 对账任务页：使用后端已支持的筛选参数（状态、服务商、
    意图 ID、事件类型、支付账户），此前这些列表无法按条件查询
  - 分页栏显示筛选结果总数（来自 `pageInfo.totalItems`），与「显示 x-y」并存
  - 支付明细：状态、金额、支付尝试、退款；退款明细：状态、金额、生命周期
  - i18n：中英文新增筛选/导出/明细文案，菜单与标题改为「支付记录」「退款记录」

## 5. 结果集汇总（聚合 KPI）

列表页顶部汇总条的数据来自服务端聚合端点，而不是对当前页求和：

- `GET /backend/v3/api/payments/intents/summary`：与列表同参，返回
  `totalCount`、`totalAmounts[{currencyCode, amount, count}]`、`statusCounts[{status, count}]`；
- `GET /backend/v3/api/payments/refunds/summary`：额外返回 `reasonCounts[{reasonCode, count}]`；
- 金额仍是整数最小单位字符串，计数是 int64 安全字符串（与 `pageInfo.totalItems` 一致）；
- SQL 使用与列表完全相同的谓词集合 + `GROUP BY`，避免"筛选后总计"与列表口径漂移；
- 前端 `PaymentRecordsSummary` 在筛选/搜索提交后重取，保留上一次成功结果直到新结果返回，
  失败时显示"汇总数据暂不可用"而不影响列表本身。

## 6. 明确不在本次范围

- 汇总指标（GMV、成功率、退款率）：需要后端聚合端点，避免用「当前页」口径冒充全量口径
- 保存的筛选视图、定时报表、结算单下载
- 退款取消（后端当前只支持重试）

这些进入后续迭代，前置条件是后端提供聚合/命令契约。

## 7. 验证

后端（`sdkwork-payment`）：

```bash
cargo check -p sdkwork-routes-payment-backend-api
cargo test -p sdkwork-routes-payment-backend-api --lib
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
node ../sdkwork-specs/tools/check-pagination.mjs --workspace .
node tools/payment_sdk_generate.mjs --check
```

前端（`sdkwork-cloudrouter`）：

```bash
node scripts/typecheck-owned-sources.mjs
node --import tsx --test packages/sdkwork-cloudrouter-pc-admin-payments/payment-records-query.test.ts
pnpm vitest run payment-records-query-ui.test.tsx --config vite.config.ts --configLoader native \
  --pool vmThreads --mode standalone.test
node ../sdkwork-specs/tools/check-i18n-standard.mjs --root .
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
```

已知基线问题（非本次引入，均在本次改动文件之外）：

- `cargo test -p sdkwork-routes-payment-backend-api --lib` 中
  `subject::tests::tenant_session_is_accepted_with_tenant_level_scoping` 在 HEAD 上已失败
  （`subject.rs` 未在本次改动中变更）。
- `node scripts/typecheck-owned-sources.mjs` 的 14 条诊断全部来自
  `packages/sdkwork-cloudroutes-pc-commons/src/documents-admin-client.ts`（documents SDK 漂移，
  该文件未在本次改动中变更）。
- `check-component-port-bindings.mjs` 的 3 条违规全部来自 H5 packages 的
  `contracts.layerRole: "frontend-adapter"`（与支付无关）。
