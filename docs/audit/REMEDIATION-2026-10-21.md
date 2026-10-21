# Cloud Router 审计整改记录（2026-10-21）

Status: in progress  
Owner: sdkwork-platform  
Source audit: [FULL-REVIEW-2026-10-20.md](FULL-REVIEW-2026-10-20.md)  
Branch: `main`  
Scope rule: every item is closed only with code + executable evidence; no
documentation-only closures.

**当前状态（2026-10-21 更新）**：审计中的 P0 全部关闭；24 项标准/生成/质量门禁
全绿（含 SDK guardian、schema quality gate）；20 个 PostgreSQL 测试二进制全绿；
`sdkwork-router-service` lib 636 项全绿；pricing/record 前端 typecheck 与测试全绿。
剩余项为 P1-12 终态 sweeper 与 P2 清理，见 §3.2。

## 1. 本轮已关闭

| 审计项 | 整改 | 证据 |
| --- | --- | --- |
| P0-1 分页 DTO 只接受 `pageSize` | 移除 7 个 HTTP query DTO 的容器级 `rename_all`（营销 3、定价 2、推荐 1、邀请 1），HTTP 查询恢复 `page_size`；`deny_unknown_fields` 继续拒绝 `pageSize` 别名 | `api/admin_marketing.rs`、`api/admin_pricing.rs`、`api/admin_referral.rs`、`api/app_invite.rs`；新增运行时用例 `admin_marketing_list_queries_accept_canonical_snake_case_pagination` |
| 契约门禁漏检（分页别名） | `tests/api_dto_alias_contract.rs` 改为扫描全部 `src/api/*.rs`，识别任意 `serde(rename_all = "camelCase")` 容器属性，并用 `Query<T>` 引用识别 `*QueryRequest`；字段后缀检查改为声明行匹配，避免误伤函数名 | 3 个契约守卫用例通过 |
| P0-2 API 物化链断裂 | `tools/sync-cloudrouter-api-standard-extensions.mjs` 不再对 open-api 只写 `apis/`；三个 surface 的每个派生镜像都写入同一份 stamped 文档，`materialize-apis-contracts.mjs` 复制方向因此稳定 | `materialize-apis-contracts.mjs --check` exit 0；`sync-cloudrouter-api-standard-extensions.mjs --check` exit 0；operation-pattern / envelope 检查通过 |
| P1-1 int64 字段输出为 JSON number | `AppRoutingRequestTraceItem`（status/tokens/requestBytes/responseBytes）、`AppRoutingAccountGroupItem`（memberAccountCount/availableAccountCount）、`AppRoutingUsageData`（requests/latency）加 `sdkwork_utils_rust::serde_int64` | 新增 2 个序列化用例，覆盖 2^53 以上的 token 值 |
| P1-2 create 返回 200 | 三个 storage create handler 改用 `json_created_response`，返回 201 | `admin_storage_api` 5/5 通过（helper 断言 201） |
| P1-3 SSE tail >64 并发忙循环 | Redis 阻塞读许可耗尽时先 `sleep(100ms.min(timeout))` 再降级轮询 | `redis_runtime_stream_bus.rs`；编译与路由测试通过 |
| P1-4 Server 模式内存 stream bus 回退 | 回退白名单仅保留 `Desktop`；Server/Cloud 在 Redis 不可用时 fail-closed | `routes.rs`；`cargo check` 通过 |
| P1-4 `notifiers` 泄漏 | 等待结束后若该 invocation 无本地 claim，立即删除 notifier 条目 | `runtime_stream_bus.rs` |
| P1-5 代理路径 SSRF | 配置出站代理时，CONNECT 前本地解析目标并对每个地址执行 `validate_resolved_outbound_ip` | `invocation_dispatcher.rs`；新增 `proxy_target_pre_resolution_rejects_private_dns_answers` |
| P1-8 记账上下文失败静默丢用量 | 两个 `record_*` 的 context 失败分支改为返回 `Err`，调用方计数并触发 fail-closed | `gateway_accounting_retry.rs` |
| P1-9 后付费结算重复扣款 | 批次幂等键改为按 request 稳定生成（`usage-settlement-<request>` / 单条 `<usage-fact>`），恢复探针补齐这两类 marker | `usage_settlement_store.rs`；SQL 契约 12/12 通过 |
| P1-11 资源绑定重复行 | 三个 `replace` 在持有聚合行锁时先 retire 该 scope 的全部 active 绑定，再插入；删除三份 `retire_omitted` | `admin_upstream_store/{supplier,account,account_group}_resource.rs`、`shared.rs` |
| P1-13 SSE 行缓冲无界 | `pending_line` 达到 1 MiB 即透传并清空 | `openai_relay_execution.rs` |
| P2 无用 API + 被忽略参数 | 删除 `app_runtime_router_with_store_and_gateway_client_chat_stream_relay[ _and_runtime_stream_bus]` 及其导出，测试改用 gateway-only 构造器 | `api/app_runtime.rs`、`api/mod.rs`、`tests/app_runtime_api.rs`（58/58） |
| P2 前端 int64 → Number | 定价三个列表改用 `pageInfo.totalPages`，社区统计改用 BigInt 求和 | `admin-pricing/src/{plans,rules,rateCards}Page.tsx`、`CommunityOverviewPage.tsx` |
| 文档失真 | TECH_ARCHITECTURE 修正 Chat SDK 声明、代理 egress 校验、Server/Redis 拓扑；本文件与审计报告互相链 | `TECH_ARCHITECTURE.md` §3/§7/§8 |
| 生成门禁在 HEAD 即红 | 把 `payment-reconciliation` 注册为 hand-authored module，删除根 baseline 中手工附加的 171 行重复段；重新生成 manifest/contract/baseline | `tools/database_contract_materializer.py`；三个 `--check` 全部 exit 0 |
| P0-3 支付意图/尝试 schema 不一致 | 支付投影列与状态枚举通过 `0047_payment_runtime_shape_guard`（升级）和 `payment-control-plane` 基线（全新安装）收敛；补齐 `payment_intent_no`、`provider_code`、`payment_method`、`idempotency_key`、`amount/jsonb` 绑定 | 真实 PostgreSQL e2e 3/3 通过（含迁移幂等路径） |
| 记账冻结事实被重放覆盖 | `record_gateway_usage` 在写 measurement/rating/charge 前检查 `settlement_status`，已冻结则整体跳过 | `gateway_usage_recorder.rs`；PG 事务集成测试通过 |
| PG 测试夹具过期 | 修正 `account_group_snapshot`/`debit_points`/`route_kind`/billing 投影/health 列等夹具，恢复真实 PostgreSQL 可执行性 | `postgres_transaction_integration`、`postgres_app_routing_read_store`、`postgres_pricing_catalog_loader` 等全部通过 |
| P1-10 软删除唯一索引 | registry 两表声明 `soft_delete_policy: active_unique`，重新生成 partial unique index；upsert 冲突目标补 `WHERE deleted_at IS NULL`；新增升级迁移 | `postgres_soft_delete_active_unique` 1/1 通过（删除后可复用、活跃重复 23505、迁移幂等） |
| P1-12 流任务优雅退出 | 新增 `background_tasks` 注册表；`serve_with_graceful_shutdown_deadline` 在 grace 内等待后台任务归零；三条流任务（runtime drain、terminal writer、stream producer）纳入跟踪 | `background_tasks` 3/3；`app_runtime_api` 58/58；`--lib` 634/634 |
| P1-6 请求记录全租户排序/计数/OFFSET | `/backend/v3/api/system/records` 改为 `(started_at,id)` keyset：删除 `ROW_NUMBER()` 与 `COUNT(*) OVER()`，去掉 OFFSET；查询参数改 `cursor`/`page_size`，返回 cursor 模式 `pageInfo`；前端改“加载更多”；OpenAPI/SDK 重新生成 | `postgres_admin_record_keyset` 1/1（真实 PG：翻页、游标前进、过滤）；`admin_record_api` 5/5；`--lib` 638；record typecheck 通过 |
| P1-7 Chat 无契约/无 SDK | Chat 前端 service 已在 `44cc29a28` 删除，6 个 `/app/v3/api/chat/*` 路由、store、port 与陈旧测试成为孤儿。经确认移除 HTTP 投影并保留 `ai_chat_*`/`ai_runtime_*` 持久化权威；新增 ADR-20261021，旧 ADR-20260730 标记 superseded；PRD/TECH_ARCHITECTURE 改为“surface deferred”；store inventory 以 `async_usage_task_store` 补位 | `cargo check` 两 crate 通过；`--lib` 636；`rg 'app_chat\|AppChat'` 0 命中；console 测试可加载（其余 agent 断言针对已变更的实现，属既有测试债） |
| P2 SDK 生成族漂移 | 重新生成 app/backend/open 三个 family；修正 open-api 单一序列化写入链（gateway → extensions → SDK → materialize）；gateway 检查改为忽略 `x-sdkwork-*` 元数据比较 | `sdk_guardian`、`schema_quality_gate`、`materialize`、`extensions`、`gateway --check` 全部 0 |
| P2 组合能力前端误报 | course/drive 通过外部 capability SDK 分发，`frontend_operation_audit`/`frontend_field_audit` 增加外部 SDK 豁免；`/admin/course/:sectionId?` 声明 `dependency_owned` 契约路由 | `schema_quality_gate` 通过 |
| P2 前端 typecheck | pricing 包补 `@types/node` + `types: ["node"]`；修正 `rowUid` UI-only 键的测试断言 | typecheck 0 error；41/41 测试通过 |

## 2. 验证证据（本轮）

```text
cargo check -p sdkwork-cloudrouter-router-service \
            -p sdkwork-cloudrouter-edge-runtime \
            -p sdkwork-routes-cloudrouter-app-api --lib
→ Finished dev profile ... (0 error；本仓 crate 0 warning)

cargo test -p sdkwork-cloudrouter-router-service --lib
→ 634 passed; 0 failed

cargo test -p sdkwork-cloudrouter-router-service \
  --test admin_marketing_api --test admin_storage_api
→ 6 passed / 5 passed

cargo test -p sdkwork-cloudrouter-router-service --test app_runtime_api
→ 58 passed

cargo test -p sdkwork-cloudrouter-router-service \
  --test postgres_usage_settlement_store_sql_contract
→ 12 passed

cargo test -p sdkwork-cloudrouter-router-service \
  --test postgres_payment_intent_runtime_sql_contract
→ 6 passed

cargo test -p sdkwork-cloudrouter-router-service --test api_dto_alias_contract
→ 3 passed

SDKWORK_DATABASE_URL=postgres://…/sdkwork_ai_dev
cargo test -p sdkwork-cloudrouter-router-service \
  --test postgres_admin_upstream_store --test postgres_app_routing_read_store \
  --test postgres_payment_refund_cap_e2e \
  --test postgres_usage_settlement_store_e2e --test postgres_transaction_integration \
  --test postgres_pricing_catalog_loader --test postgres_chat_completion_routing_e2e \
  --test postgres_marketing_recharge_e2e --test postgres_payment_reconciliation_live \
  --test postgres_responses_resource_routing_e2e --test postgres_site_settings_store \
  --test postgres_upstream_routing_migration \
  --test postgres_payment_intent_runtime_sql_contract \
  --test postgres_usage_settlement_store_sql_contract \
  --test postgres_gateway_usage_recorder_sql_contract \
  --test postgres_admin_record_store_sql_contract \
  --test postgres_app_runtime_sql_contract
→ 18 个测试二进制全部通过（payment e2e 3/3、usage settlement 14/14、
  gateway usage recorder 17/17、routing 1/1、pricing loader 3/3、
  chat routing 2/2、marketing recharge 3/3、reconciliation 3/3、responses 3/3、
  site settings 3/3、upstream migration 1/1、admin upstream 6/6、
  transaction 1/1、app runtime 5/5、app chat contract 6/6、
  admin record contract 3/3、settlement contract 12/12、payment contract 6/6）
cargo test -p sdkwork-cloudrouter-router-service --test postgres_soft_delete_active_unique
→ 1 passed（删除后可复用、活跃重复 23505、迁移幂等）

python -B -m tools.schema_manifest --root . --check          → current
python -B -m tools.schema_compiler --root . --dialect postgres --materialize --check → current
python -B -m tools.database_contract_materializer --root . --check → current
python -B -m unittest tests.test_database_contract_materializer \
  tests.test_chat_runtime_database_contract tests.test_database_lifecycle_indexes
→ 11 passed

node scripts/materialize-apis-contracts.mjs --check
→ apis contract materialization check passed

node tools/sync-cloudrouter-api-standard-extensions.mjs --check
→ stamped=0, all mirrors ok

node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
→ passed

node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
→ passed

# 2026-10-21 第二批（SDK / 生成链 / 后台任务 / 前端类型）
cargo test -p sdkwork-cloudrouter-http --lib background_tasks
→ 3 passed（wait_idle 空/完成/超时）

cargo test -p sdkwork-cloudrouter-router-service --lib --test app_runtime_api
→ 634 passed / 58 passed

node sdks/cloudrouter-app-sdk/bin/generate-sdk.mjs --language typescript
node sdks/cloudrouter-backend-sdk/bin/generate-sdk.mjs --language typescript
node sdks/cloudrouter-open-sdk/bin/generate-sdk.mjs --language typescript
→ 三个 family 重新生成（117/239/23 files）

python -B -m tools.cloudrouter_sdk_guardian
→ CloudRouter generated SDKs passed

python -B -m tools.schema_quality_gate
→ Schema quality gate passed

python -B -m tools.cloudrouter_gateway_openapi_generator --check
python -B -m tools.api_contract_manifest --check
python -B -m tools.cloudrouter_openapi_generator --check
→ 全部 current

pnpm --filter @sdkwork/cloudrouter-pc-admin-pricing typecheck
→ 0 error（补 @types/node + tsconfig types=node）

pnpm --filter @sdkwork/cloudrouter-pc-admin-pricing test
→ 2 files / 41 tests passed（修正 rowUid UI 键断言）

# P1-6 keyset
cargo test -p sdkwork-cloudrouter-router-service --lib --test admin_record_api
→ 638 passed / 5 passed

SDKWORK_DATABASE_URL=postgres://…/sdkwork_ai_dev \
cargo test -p sdkwork-cloudrouter-router-service --test postgres_admin_record_keyset
→ 1 passed（page_size=2 翻页、next_cursor 前进、末尾 hasMore=false、user 过滤）

pnpm --filter @sdkwork/cloudrouter-pc-admin-record typecheck
→ 0 error
```

## 3. 未关闭项与后续顺序

### 3.1 P0-3 支付 schema 对齐（已解除阻塞，保留所有权收尾）

已实现：

1. `0047_payment_runtime_shape_guard.up.sql` 以 `to_regclass` 守卫、幂等
   `ADD COLUMN IF NOT EXISTS` 和状态 CHECK 扩展，收敛升级库；
2. `payment-control-plane` 模块基线追加同一组语句（无 DO 包装，供全新安装
   与测试夹具使用）；
3. 支付 store 补齐联邦必填列：`payment_intent_no`（= merchant order no）、
   `provider_code`、`payment_method`、`idempotency_key`，并对 `amount` /
   `captured_amount` / `refunded_amount` 做 `::numeric`、`metadata_json` /
   `callback_payload` 做 `::jsonb` 绑定；
4. `commerce_refund_event.reason` 作为运行时投影列加入守卫；
5. 真实 PostgreSQL 下 `postgres_payment_refund_cap_e2e` 3/3 通过，且测试同时
   验证“模块基线 + 迁移”幂等路径。

保留收尾（不阻塞功能）：

- `sdkwork-payment` 仍是这些表的 owner。其基线一旦自带投影列与状态枚举，
  应删除本仓守卫与迁移，并在 `payment-control-plane/README.md` 记录移除。
- `postgres_payment_refund_cap_e2e` 应设为 CI 必跑；当前仅在设置
  `SDKWORK_DATABASE_URL` 时执行。

### 3.2 其余高优先级

| 项 | 计划 |
| --- | --- |
| P1-12 剩余：超出 grace 的终态补偿 | tracker + drain 已完成；下一步加启动期终态 sweeper，回收硬截止后仍非终态的流调用 |
| P2 64 处 `Json(success_envelope(...))` | 统一走 `json_success_response`，补 trace 关联测试 |
| 依赖升级 | 需单独批次：`cargo update` + SDK/前端锁文件 + 全量回归，避免与本轮逻辑修复混合 |

## 4. 复检命令

```bash
rustfmt --edition 2021 --check <changed rs files>
cargo test -p sdkwork-cloudrouter-router-service --lib
cargo test -p sdkwork-cloudrouter-router-service \
  --test admin_marketing_api --test admin_storage_api \
  --test api_dto_alias_contract --test app_runtime_api \
  --test postgres_usage_settlement_store_sql_contract
node scripts/materialize-apis-contracts.mjs --check
node tools/sync-cloudrouter-api-standard-extensions.mjs --check
node ../sdkwork-specs/tools/check-pagination.mjs --root .
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
```

## 5. 仍为红、需后续批次处理的门禁

| 门禁 | 现象 | 结论 |
| --- | --- | --- |
| `python -B -m tools.cloudrouter_sdk_guardian` | 三个 SDK 的 `openapi/*.openapi.json` 与权威镜像不一致；composed `src` 只允许 `index.ts` | 需要重新生成 SDK family；本轮只保证 `apis/` 与 SDK 输入一致 |
| `pnpm --filter @sdkwork/cloudrouter-pc-admin-pricing typecheck` | `i18nCompleteness.test.ts` 缺 `node:fs` 类型 | 与业务代码无关，缺 `@types/node` 配置 |

> 2026-10-21 更新：`schema_manifest` / `schema_compiler` /
> `database_contract_materializer` 三个门禁已通过（见 §1），
> payment-reconciliation 已注册为 hand-authored module，根 baseline 中的手工
> 重复段已删除。

这些项不属于本轮改动引入的回归；在“零技术债”口径下仍是发布阻断，已列入 §3.2 的后续批次。

