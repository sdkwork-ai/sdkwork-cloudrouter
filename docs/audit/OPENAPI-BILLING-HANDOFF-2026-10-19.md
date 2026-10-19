# Open-API 计费对齐交接单（2026-10-19）

> 关联主审计：[OPENAPI-BILLING-MATRIX-ALIGNMENT-2026-10-18.md](OPENAPI-BILLING-MATRIX-ALIGNMENT-2026-10-18.md)
> 商业化报告：[OPENAPI-BILLING-COMMERCIAL-READINESS-2026-10-19.md](OPENAPI-BILLING-COMMERCIAL-READINESS-2026-10-19.md)
> 异步对账设计：[../design/ASYNC-USAGE-RECONCILIATION.md](../design/ASYNC-USAGE-RECONCILIATION.md)
> Vendor 落地方案与决策：[../design/VENDOR-BILLING-ROLLOUT-DECISIONS.md](../design/VENDOR-BILLING-ROLLOUT-DECISIONS.md)

## 1. 当前结论

- **可售 166/176（94.3%）**，剩余 **10 个**全部 fail-closed，不存在静默免费路径。
- 176 = **118 Free + 44 计量可售 + 1 音效 + 3 已补价按次 + 5 未定价按次 + 5 已登记不可售**。
- 计费回归 **58 个 target / 410 passed**；router-service `--lib` **599**；edge-runtime `--lib` **101**；clippy 0；fmt 干净。
- 41 把锁的变异证据在主审计第五节；就绪计数由
  `commercial_readiness_counts_are_exactly_166_of_176` 钉住。

## 2. 本轮已交付的基础设施

| 能力 | 位置 | 状态 |
| --- | --- | --- |
| 对账表 `ai_metering_async_task` | `database/migrations/postgres/0046_ai_metering_async_task.up.sql` | 已落地，`db:validate` / `db:plan` 通过 |
| 幂等入队 / 租约领取 / 终态 store | `src/ports/async_usage_task_store.rs`、`src/infrastructure/{in_memory_async_usage_task_store,sql/postgres/async_usage_task_store}.rs` | 已实现 |
| 创建响应 → 任务注册器 | `src/application/async_usage_registration.rs` | 已实现，2 条单测 |
| claim → poll → settle/reschedule/expire 编排 | `src/application/async_usage_task_worker.rs` | 已实现，3 条单测 |
| 服务端工具费率 | `sdkwork-models` 的 6 个 OpenAI 模型 + `openai/vector-stores` + `deepseek/web_tools` | 已发布并通过目录审计 |
| 货币 → Token Bank 换算 | `admin_marketing_recharge.rs`（严格汇率、零金额免费、微积分 ceil） | 已实现，未知正币种 fail-closed |
| Token Bank 原子捕获 | `sdkwork-account` 的 `SettleAccountHoldCommand.settled_amount` + `settle_account_hold` | 已实现，部分捕获/余额退回单事务，账号侧 2 条单测 |
| 过期 hold 追收 | `edge-runtime/gateway_billing_account.rs` 的 `hold_is_gone` + `hold-expired-capture` 后缀；对账查询已识别该后缀 | 已实现，hold 过期不再丢单；单测 + 源码契约测试 |
| 超额应收 | `GatewayBillingStore::mark_usage_uncollected` + 结算拦截器 | 已实现：hold 已捕获而差额扣费失败 ⇒ `uncollected_overage` 终态，worker 不会误标已结算 |
| 向量库存储可测量性 | `usage_extraction::storage_line` | 缺 `usage_bytes` ⇒ 记账失败；显式 0 字节 ⇒ waive |

## 3. 剩余 10 个 operation 的阻塞

### A. 异步结果回收（5 个，缺 executor 与应用接线）

`POST /v1/batches`、`POST /anthropic/v1/messages/batches`、
`POST /v1/threads/runs`、`POST /v1/threads/{thread_id}/runs`、
`POST /v1/threads/{thread_id}/runs/{run_id}/submit_tool_outputs`。

已有：表、store、注册器、worker 编排。
仍缺：

1. `AsyncUsageTaskExecutor` 的 provider 实现：
   - OpenAI batch：`GET /v1/batches/{id}` 轮询，完成后流式读
     `GET /v1/files/{output_file_id}/content` 的 JSONL，按 `custom_id` 求和；
   - Anthropic batch：对应的 results URL；
   - background Responses / threads run：完成态响应里的 `usage`。
2. 把 `AsyncUsageRegistrar` 挂到创建成功后的响应（拿到 upstream id 才入队）。
3. 在 `app_runtime` 启动 worker（feature flag），并复用上游账号凭证解析。
4. 解除 `unmetered_batch_submission` / background / run 的预检守卫。

在 1–3 完成前不得解除拒单，否则批任务会变成未计量放行。

### B. 向量库存储（1 个）

`POST /v1/vector_stores/{id}/file_batches`。

`POST /v1/vector_stores/{id}/files` 已关闭：目录已补
`storage_gb_day`（$0.10/GB/day），按 `usage_bytes` 收首日存储；
`billing_vector_store_storage` 验证 2 GB → $0.20。

仍缺：

1. `file_batches` 响应没有字节数，需要批量逐文件读取后登记存储；
2. 长生命周期文件的按天 worker（首日之后）；
3. 删除/缩容的停止计费与退款条款。

当前 `file_batches` 返回 501，不把批量摄取伪装成按次。

### C. midjourney / nano-banana（4 个，跨仓资源与 API 权威）

`POST/GET /midjourney/v1/images/generations`、`POST/GET /nano-banana/v1/images/generations`。

- 本仓没有对应 supplier/account/resource 绑定；
- nano-banana 的 `dispatch_nano_banana` 驱动 `/nano-banana` 路径，而已接通的
  Gemini 原生入口是 `/google/v1beta/models/nano-banana:generateImages`，
  属于跨仓 API 权威冲突（见 `data/ai-routing/declared-unrouted.json`）；
- midjourney 没有官方按张 API 价目。

需要 sdkwork-generations / 产品确认入口归属后，再补资源、账号能力与目录价；
不能在本仓凭空造价。

## 4. 复现与验证

```bash
# 计费回归（58 target / 409 passed）
cargo test -p sdkwork-cloudrouter-router-service \
  --test billing_batch_embed --test billing_vector_store_search \
  --test billing_vector_store_storage --test billing_hosted_tools \
  --test billing_deepseek_web_tools --test billing_media_entrypoints \
  --test billing_token_entrypoints --test billing_quantity_families \
  --test openapi_billing_matrix

# 单测 / 静态门
cargo test -p sdkwork-cloudrouter-router-service --lib        # 599
cargo test -p sdkwork-cloudrouter-edge-runtime --lib          # 100
cargo clippy -p sdkwork-cloudrouter-router-service -p sdkwork-cloudrouter-edge-runtime --lib --tests
cargo fmt --check -p sdkwork-cloudrouter-router-service -p sdkwork-cloudrouter-edge-runtime
pnpm db:validate
node tools/check-cloudrouter-ai-routing-consistency.mjs

# 目录侧（sdkwork-models）
node tools/validate-catalog.mjs
node tools/catalog-audit.mjs
node tools/build-index.mjs --check
python tools/report-unreachable-pricing.py --check
```

## 5. 标准门禁结果（2026-10-19）

通过：

- `check-rust-crate-naming-standard`
- `check-rust-manifest-standard`
- `check-rust-backend-composition`
- `check-api-operation-patterns`
- `check-api-response-envelope`
- `audit-repository-baseline --only branch-main`
- `sync-agent-main-branch-standard --check`
- `sync-agent-destructive-operation-standard --check`
- `sync-agent-rollback-restriction-standard --check`
- `check:pnpm-script-standard`

遗留（非本轮计费改动）：`check:agent-workflow-standard` 报
`.github/workflows/package.yml` 缺少 50 个 `workflow_dispatch` 依赖 ref 输入，
`dependency_refs_json` 只读了 `vars.*`。`sdkwork.workflow.json` 本身与依赖
对齐工具 dry-run 一致，问题在发布工作流入口的生成/同步层。按 `AGENTS.md`
的 release governance 要求，不手改 `.github/workflows/package.yml`；需用
官方 workflow 生成器或人工审核后同步。

## 6. 不可售 ≠ 免费送

剩余 10 个均由预检/守卫 fail-closed，不产生用量事实也不免费放行。任何解除
守卫的改动必须先让对应 `billing_*` 测试从"拒单"变为"可结算"，并同步
`commercial_readiness_counts_are_exactly_166_of_176` 与商业化报告。
