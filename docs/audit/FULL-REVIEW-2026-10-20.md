# Cloud Router 全量技术与产品审计（2026-10-20）

> **整改跟踪：** 本报告是 2026-10-20 的快照。逐项修复状态与剩余项见
> [REMEDIATION-2026-10-21.md](REMEDIATION-2026-10-21.md)。已修复项以整改记录为准。

Status: audit record  
Owner: sdkwork-platform  
Scope: `sdkwork-cloudrouter` @ `main` (`05659a2e`), working tree clean  
Authorities: `docs/product/prd/PRD.md`, `docs/architecture/tech/TECH_ARCHITECTURE.md`,
`../sdkwork-specs/{API_SPEC,PAGINATION_SPEC,DATABASE_SPEC,RUST_CODE_SPEC,SECURITY_SPEC}.md`

## 0. 结论（先看这里）

1. **核心网关是真实实现，不是"假成功"**：`/v1` OpenAI 兼容推理、路由选择、账号池、
   凭据加密、计费/结算、管理端分析、就绪探针均有可执行代码与部分真实 PostgreSQL 测试；
   未配置能力返回 501/503 且生产启动 fail-closed，没有发现"返回 200 但没做事"的主链路。
2. **当前不具备商业化上线能力**：发布证据为空（checksum/signature/packages 全部未生成）、
   许可与版本分层未在服务端生效、SLA/SOC2 承诺无证据、Chat 能力不在对外契约内、
   支付意图写入与联邦 schema 不一致。仓库自己的 `REVIEW-20260714` 仍列有多个 P0。
3. **本次新发现 5 个必修 P0/P1（此前审查未记录）**：
   - 管理端 6 个分页 DTO 实际只接受 `pageSize`、拒绝规范的 `page_size`，导致生成 SDK
     调用定价/充值/推荐/营销列表接口 **必然 400**（P0）。
   - `pnpm api:materialize:check` 在 main 上 **红**（exit 1），API 溯源链不可复现（P0）。
   - 支付意图写入了 `sdkwork-payment` 基线不存在的列和非法状态，干净库上支付不可用（P0）。
   - `ai_resource_binding` 唯一索引因可空列失效，每次保存资源绑定都新增重复行（P1→数据面）。
   - 运行态 SSE tail 在单副本 >64 并发时退化为 Postgres+Redis 忙循环（P1，集群场景）。
4. **SQLite 结论**：服务端 SQLite 已按 PRD 非目标移除且无静默回退；
   但 `pnpm dev:desktop:sqlite` 是"已接线、必然失败"的命令——不存在 client-local
   SQLite schema 模块，desktop 覆盖层无法初始化。属于**未实现的已发布命令**，需实现或删除。
5. **分页结论**：keyset/cursor 实现（usage logs、gateway traces、storage、chat）
   正确且有边界；但存在 6 个 `pageSize` 违规、3 处快增长表 OFFSET + `COUNT(*) OVER()`、
   2 处无 LIMIT 的物化读取，且 `check-pagination.mjs` 对上述问题**全部漏检**。

---

## 1. 审计方法与基线证据

### 1.1 已执行的检查（只读）

| 命令 | 结果 |
| --- | --- |
| `node ../sdkwork-specs/tools/check-pagination.mjs --root .` | **passed**（但见 §4 漏检） |
| `node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .` | passed |
| `node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .` | passed |
| `node ../sdkwork-specs/tools/check-database-framework-standard.mjs --root .` | passed |
| `node ../sdkwork-specs/tools/check-rust-crate-naming-standard.mjs --root .` | 0 errors / 0 warnings（44 crates） |
| `node ../sdkwork-specs/tools/check-rust-manifest-standard.mjs --root .` | 0 errors / 0 warnings |
| `check-rust-backend-composition` / `workspace-member-protocol` / `dependency-list-completeness` | passed |
| `check-source-config-standard` / `check-i18n-standard`(6884 files) / `check-cors-standard` | passed |
| `check-route-path-collisions` | passed |
| `node tools/generate-cloudrouter-http-route-manifest-rs.mjs --check` | app 31 / backend 121 / open 172，ok |
| `node scripts/dev/audit-api-chain-reachability.mjs` | passed 112/112 |
| `node scripts/materialize-apis-contracts.mjs --check` | **FAILED (exit 1)**：`apis/open-api/...` stale，`apis/manifest.json` stale |
| `cargo check --workspace --all-targets` | 放弃（会编译全部 sibling 测试目标，>60min）；改用聚焦 lib 检查 |
| `cargo check -p sdkwork-cloudrouter-router-service -p sdkwork-cloudrouter-edge-runtime -p sdkwork-routes-cloudrouter-app-api -p sdkwork-routes-cloudrouter-backend-api --lib` | **Finished（11m10s），0 error**；日志中 0 条属于 `sdkwork-cloudrouter-*` 的 warning（633 行警告全部来自 sibling 仓库） |

### 1.2 代码规模

- Rust：`crates/` 44 crates、`services/` 5 个服务，主服务
  `sdkwork-cloudrouter-router-service` 约 9 MB 源码，PostgreSQL 适配器约 1.17 MB。
- API：app 31 / backend 121 / open 172 = **324** 个操作。
- 数据库：根 baseline 78 张表（manifest 声明 39 张物化表）+ 6 个模块 baseline + 26 个增量迁移。

### 1.3 结论分级

- **P0**：直接导致功能不可用、资金/数据错误、或阻断发布。
- **P1**：高并发/多副本/数据增长下必然出问题，或契约与实现不一致。
- **P2**：可维护性、文档失真、边界风险。

---

## 2. P0 —— 必须在上线前修复

### P0-1 管理端分页参数与规范相反：`pageSize` 可用、`page_size` 400

**证据**

- DTO 对 HTTP query 使用了容器级 camelCase，且 `deny_unknown_fields`：
  - `services/sdkwork-cloudrouter-router-service/src/api/admin_marketing.rs:53-58`（`AdminMarketingListQueryRequest`）
  - 同文件 `:60-66`（`RechargePackageListQueryRequest`）、`:86-94`（`ExchangeRuleListQueryRequest`）
  - `src/api/admin_pricing.rs:68-78`（`AdminPricingListQueryRequest`）、`:158-166`（`PriceBookListQueryRequest`）
  - `src/api/admin_referral.rs:51-56`（`AdminReferralListQueryRequest`）
- 这些 DTO 通过 `axum::extract::Query` 解析：`admin_marketing.rs:173,223,380,406`、
  `admin_pricing.rs:471,686,879,1323,1514`。
- OpenAPI 契约声明的是 snake_case：
  `/backend/v3/api/pricing/plans` 参数 = `page,page_size`；
  `/backend/v3/api/billing/exchange_rules` = `source_asset_type,target_asset_type,status,page,page_size`；
  `/backend/v3/api/recharges/packages` = `page,page_size,status`（`generated/openapi/cloudrouter-backend-openapi.json`）。
- 生成的 TS SDK 按契约序列化 `page_size`：
  `sdks/cloudrouter-backend-sdk/cloudrouter-backend-sdk-typescript/generated/server-openapi/src/api/pricing.ts:30`
  `{ name: 'page_size', value: params?.pageSize, ... }`（recharges/billing/ai 等同理）。

**影响**

`?page_size=20` 被 serde 视为未知字段 → 400；只有驼峰别名形式的查询参数能工作。
即：OpenAPI 契约、生成 SDK、TECH_ARCHITECTURE §6 全部与实现冲突；
管理端"定价 / 充值套餐 / 兑换规则 / 推荐策略 / 营销活动"列表经 SDK 调用时 100% 失败。
`check-pagination.mjs` 只看字面量 `pageSize` 字段，识别不到 `rename_all`，因此门禁全绿。

**修复**

1. 所有 HTTP query DTO 移除容器级 `rename_all`（仅保留 JSON body 的 camelCase），
   或对 `page_size` 显式 `#[serde(rename = "page_size")]`。
2. 增加契约-实现一致性测试：对每个 OpenAPI 声明的 query 参数，用 snake_case 发一次请求并断言非 400。
3. 强化 `check-pagination.mjs`：容器 `rename_all` 检测 + 路由↔OpenAPI 参数比对。

**严重度：P0（功能不可用 + 标准违规）。**

### P0-2 API 溯源链在 main 上断裂

**证据**

```
node scripts/materialize-apis-contracts.mjs --check
→ exit 1
  apis contract stale: apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json
  apis/manifest.json is stale
```

**根因（已定位）**

`scripts/materialize-apis-contracts.mjs:14-15` 把 SDK 副本视为源、`apis/` 视为目标；
而 `tools/sync-cloudrouter-api-standard-extensions.mjs:421-424` 只写 `apis/` 的 open-api 副本。
两个门禁方向相反，**不可能同时为绿**。

**影响**

- `apis/manifest.json` 的 sha256 与真实文件不一致，任何"契约未被篡改"的证明失效。
- 发布/生成/SDK 审计无法复现同一份权威文档；属于供应链与合规级问题。

**修复**：统一单一写入方向（推荐 `apis/` 为源、生成物单向派生），重新执行
`pnpm api:materialize:write` 并提交；在 CI 中把该命令设为必过。

**严重度：P0（发布门禁 + 契约可信度）。**

### P0-3 支付意图写入与联邦 `commerce_payment_intent` schema 不一致

**证据**

- CloudRouter 写入 23 列：
  `services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/postgres/payment_intent_runtime_store.rs:241-245`
  含 `merchant_order_no, subject, provider, supplier_code, scene_code, metadata_json,
  provider_native_json, next_action_json, captured_amount, refunded_amount`。
- 权威基线（sibling `sdkwork-payment`）只定义 17 列、使用 `provider_code`，且
  `status CHECK (… 'created','pending','processing','succeeded','failed','canceled','closed')`：
  `../sdkwork-payment/database/ddl/baseline/postgres/0001_payment_baseline.sql:82-101`。
- CloudRouter 写入 `requires_confirmation` / `requires_action`：
  `src/application/payment_intent_runtime.rs:291,393` —— 不在 CHECK 列表内。
- 归属声明明确说 `sdkwork-payment` 先建表：
  `database/modules/payment-control-plane/README.md:24-39`。
- 唯一边界测试 `tests/postgres_payment_refund_cap_e2e.rs` 在无 `SDKWORK_DATABASE_URL` 时跳过。

**影响**

在按联邦基线初始化的干净库上，每一次支付意图 INSERT 都会因 `42703`（列不存在）
或 `23514`（CHECK 违反）失败。行为是 fail-closed（不会错扣钱），但**支付功能整体不可用**。

**修复**

1. 由 `sdkwork-payment` 提供前向迁移补齐列并扩展状态枚举；或 CloudRouter 改为写既有 17 列。
2. 把该 e2e 测试设为 CI 必跑（不得静默 skip）。
3. 增加"跨仓 schema 契约测试"：解析两侧 baseline，断言所有 INSERT 列存在。

**严重度：P0（核心商业功能不可用）。**

---

## 3. P1 —— 高并发/数据增长/契约一致性

### P1-1 int64 响应字段实际输出为 JSON number，契约声明 string

**证据**

- `src/ports/app_routing_read_store.rs:135,137,144,145`（`status/tokens/request_bytes/response_bytes`）、
  `:158-159`（`requests/latency`）、`:97-98`（`member_account_count/available_account_count`）
  均为 `i64`，无 `serde_int64`。
- OpenAPI：`AppRoutingRequestTrace.requestBytes` = `type:string, format:int64, x-sdkwork-int64-string:true`。
- 生成类型：`sdks/cloudrouter-app-sdk/.../types/app-routing-request-trace.ts:20` → `requestBytes: string`。

**影响**：运行时是 number、类型声明是 string；消费端字符串格式化/`.trim()` 会崩，
超过 2^53 的值静默丢精度。违反 API_SPEC §13.6。

**修复**：8 个字段加 `#[serde(with = "sdkwork_utils_rust::serde_int64")]`，并加序列化黄金测试。

### P1-2 三个 create 接口返回 200，契约声明 201

`src/api/admin_storage.rs:230-249`（`create_quota_policy`）、`:281-300`（`create_reconciliation_run`）、
`:302-330`（`create_gc_job`）都用 `Json(success_envelope(...))`。OpenAPI 对这三个 POST 声明 `201`。
`check-api-operation-patterns` 只读契约，看不到 handler 状态码。

### P1-3 SSE tail 在 >64 并发时退化为忙循环（CPU + DB 连接池打满）

**证据**

- `src/infrastructure/redis_runtime_stream_bus.rs:233`：`try_acquire_owned()` 尝试获取
  阻塞读许可（上限 64，`:18`）。
- 许可耗尽时走 `:267-282` 的 **非阻塞** `XREAD`（无 `BLOCK`），立即返回 `Ok(())`。
- 调用方 `src/api/app_runtime.rs:5406-5417` 只在 `Err` 时 `sleep`；`Ok` 时立即回到
  `:5377` 的 `list_runtime_events_from_event_no`（最多 1000 页，`:5429`）。

**影响**：单副本 65 个以上并发 SSE 订阅时，每个订阅变成"Redis 轮询 + Postgres 查询"死循环；
16 连接/副本的池会被占满，新请求拿不到连接，流也无法完成——典型高并发活锁，
单机测试不可见。

**修复**：降级路径必须 `sleep(剩余等待预算)` 或返回 `Polled` 让调用方统一等待；
为 tail 循环设置最小轮询间隔；把阻塞读许可改为排队而不是降级。

### P1-4 `Server` 模式 Redis 不可达时静默回退进程内 stream bus

**证据**：`crates/sdkwork-routes-cloudrouter-app-api/src/routes.rs:1306-1312` 回退
`InMemoryRuntimeStreamBus`；`:1331-1336` 的
`allow_in_memory_runtime_stream_bus_fallback` 明确包含 `DeploymentMode::Server`；
Cloud 模式则 fail-closed（`:1313-1316`）。

**影响**：多副本 standalone 部署在未显式配置 Redis、且默认 `127.0.0.1:6379` 不可用时，
`claim_execution` 变成进程内锁（`application/runtime_stream_bus.rs:106-133`）：
同一 `invocation_id` 可被两个副本同时执行 → 重复上游调用与重复计费；取消信号不跨副本。
同文件 `notifiers: Mutex<HashMap<...>>`（`:66`）只在 `release_execution`（`:171`）清理，
tail 侧 `wait_for_event` 会为任意 invocation id 建条目且永不回收，长进程内存单调增长。

**修复**：从回退白名单移除 `Server`；`notifiers` 增加 TTL 清扫。

### P1-5 配置出站代理时绕过生产 IP 策略（SSRF）

**证据**

- `crates/sdkwork-cloudrouter-edge-runtime/src/invocation_dispatcher.rs:571-587`：
  有代理时 `OutboundConnector::Tunnelled(Tunnel::new(proxy, proxy_connector))`，
  注释称"tunnelled target keeps the full outbound-policy chain"，但实际只剩
  `validated_provider_uri`（`:606-626`）→ `validate_outbound_url`，即只校验 URL 字面量
  （scheme/host 字符串，`crates/sdkwork-cloudrouter-security/src/outbound_target.rs:149-173`）。
- 无代理时才会安装 `OutboundDnsResolver`（`crates/sdkwork-cloudrouter-http/src/outbound_dns.rs:41-70`）
  做连接时 IP 校验。

**影响**：租户管理员可配置一个解析到 `10.x` / `127.0.0.1` / `169.254.169.254` 的域名，
经运维代理 CONNECT 到内网或云元数据。直连路径是安全的，代理路径不是。

**修复**：CONNECT 前本地解析并校验目标 IP（或给 `Tunnel` 注入策略解析器）；
代理出口加 ACL；对租户可控目标禁用代理模式。

### P1-6 请求日志页全租户扫描 + 窗口计数 + OFFSET

**证据**：`src/infrastructure/sql/postgres/admin_record_store.rs:14-31`
（对全部 trace 做 `ROW_NUMBER() OVER (PARTITION BY request_id …)`，无时间下界）、
`:59-63`（对全部 usage 聚合）、`:131`（`COUNT(*) OVER()`）、`:171-172`
（`ORDER BY started_at DESC … LIMIT $6 OFFSET $7`）。

**影响**：第 1 页就要对整个租户历史排序 + 计数；百万级 trace 时必然超
`statement_timeout`（30s）或占满内存。违反 PAGINATION_SPEC §2/§6 的"O(page size)"要求。

**修复**：`(started_at,id)` keyset + 时间窗 CTE；去掉窗口 total 或改为维护计数。

### P1-7 Chat 能力不在权威契约、路由清单与 App SDK 内

**证据**

- 运行时挂载：`services/.../api/app_chat.rs:209-229`；
  PostgreSQL 存储与 `FOR UPDATE`：`.../postgres/app_chat_store.rs:278-289,867-878`。
- App OpenAPI 只有 25 个 path、31 个操作，**没有任何 `/app/v3/api/chat/*`**
  （`generated/openapi/cloudrouter-app-openapi.json`；`apis/app-api/...` 同样没有）。
- App SDK 域仅 `ai/iam/notification/runtime/system`。
- 云网关按 route manifest 派发，manifest 无 chat → 云 profile 下 404。
- TECH_ARCHITECTURE §3 却声称"App SDK 暴露 `pageInfo.nextCursor` 用于 Chat 历史"
  （`TECH_ARCHITECTURE.md:186-201`）。

**影响**：PRD §4 的"First-Party Chat"在对外产品面不可达；"100% 操作可溯源到 OpenAPI +
生成 SDK"的 PRD 指标不成立；文档与实现矛盾。

**修复**：把 chat 路由写入 route manifest + authored OpenAPI，重新生成 App SDK 并加
cloud-profile 派发测试；或在 PRD 中正式降级为"未发布内部能力"。

### P1-8 记账上下文构建失败时静默丢弃用量事实

**证据**：`src/application/gateway_accounting_retry.rs:340-349` 与 `:363-374`：
`GatewayAccountingRecordContext::from_trace/from_usage` 失败时只 `mark_dual_failure()`
并返回 `Ok(())`——没有主写、没有重试信封；调用方因此不会累加失败计数，
`invocation/billing_transaction.rs` 的 fail-closed 守卫也不会触发。

**影响**：一个非法归属字段（如 `gateway_instance_id <= 0`）会让该实例**所有**用量事实消失。
异步结算模式下预扣是真实账本借记，而结算 worker 是唯一冲销者 → 永久多扣。

**修复**：返回 `Err` 或写入无 trace 的重试信封，让调用方计数并 fail-closed。

### P1-9 后付费结算的批次幂等键不稳定（重复扣款风险）

**证据**

- 结算在同一事务内 `FOR UPDATE SKIP LOCKED` 取最多 N 条：`usage_settlement_store.rs:247-258`。
- 实际借记走**另一个事务**的账本端口：`append_user_token_bank`（`:713-762`）。
- 恢复探针 `has_existing_request_settlement` 只识别
  `cloudrouter:<request>:{consumption, adjust-debit, …, async-adjust-*}`（`:559-607`）。
- 一次性后付费分支却用批次号做键：`usage-settlement-<id>` / 多事实时
  `usage-settlement-batch-<sha256(sorted ids)>`（`:1144-1155`）——**不在探针列表内**，且随成员集合变化。

**影响**：账本提交成功、结算事务回滚后重试，若批次成员变化会生成新的 `business_no`，
绕过 `uk_acct_ledger_entry_business_no`，重叠事实被二次扣款。

**修复**：借记键按单条 usage fact 生成；或让恢复探针按
`request_no + asset + business_type` 判定。

### P1-10 软删除 + 非部分唯一索引：删除后无法复用编码

**证据**：删除为软删除（`admin_upstream_store/supplier.rs:280-287`、`account.rs:313-334`、
`account_group.rs:274-296`）；但唯一索引无 `WHERE deleted_at IS NULL`：
`database/ddl/baseline/postgres/0001_cloudrouter_baseline.sql:1077`
（`uk_ai_upstream_supplier_tenant_code`）、`:1200`、`:1286`、`:2229`、`:2260`。

**影响**：删除供应商/账号/账号组后，用同一 `*_code` 重建会 23505 失败，只能手工改库。

**修复**：唯一索引加 `WHERE deleted_at IS NULL`（baseline + 前向迁移 + contract 同步）。

### P1-11 `ai_resource_binding` 唯一约束失效，每次保存都插入重复行

**证据**

- 唯一索引包含可空列：
  `0001_cloudrouter_baseline.sql:767`
  `(tenant_id, organization_id, binding_scope, supplier_id, account_group_id, account_id,
  resource_id, resource_code, resource_group_code)`；其中 `supplier_id/account_group_id/
  account_id/resource_id` 可空（`:747-753`）。
- 写入只填当前 scope 的列：`admin_upstream_store/supplier_resource.rs:72-93`
  （只填 `supplier_id`）、`account_resource.rs:73-95`（`'account', $8, NULL`）。
- PostgreSQL 唯一索引默认 NULL 互不相等 → `ON CONFLICT (...) DO UPDATE` **永不命中**。
- `retire_omitted` 只软删"不在本次请求里"的编码（`supplier_resource.rs:156-185`），
  本次仍存在的编码对应的旧行全部保留。

**影响**：每次 `PUT resources` 都新增 N 行活跃绑定，`version` 不递增；
读路径返回重复项（`:193-211` 带 `LIMIT MAX_NESTED_ITEMS`，足够多时还会截断）。
路由候选被重复放大，数据面持续膨胀。

**修复**：改为按 scope 的部分唯一索引（对空列 `COALESCE` 成 `''`），
或 PG15+ `NULLS NOT DISTINCT`；同时给 `ai_model_access_policy`（`:596`）做同样处理。

### P1-12 流式任务在进程优雅退出时丢失终态事件

**证据**：`src/api/app_runtime.rs:1259` 每请求 `tokio::spawn` 一个最长 30 分钟的 drain 任务，
不保存句柄；`crates/sdkwork-cloudrouter-edge-runtime/src/invocation_stream.rs:71,87`
每个流再 spawn 两个任务；`crates/sdkwork-cloudrouter-http/src/shutdown.rs:84-102`
在 grace 结束后 abort 运行时。

**影响**：滚动发布/缩容时，进行中的流不会写终态事件 → `ai_runtime_invocation` 停留非终态，
用量不结算。属于集群高频变更窗口内的资金/状态一致性问题。

**修复**：用 `JoinSet`/注册表跟踪并在 grace 内 drain；终态写入幂等且可被 sweeper 补偿。

### P1-13 代理化 SSE 转发存在无界行缓冲

`src/api/openai_relay_execution.rs:111`：`state.pending_line.push(byte)` 无上限，
只有遇 `\n` 才释放（`:99-108`）。上游若长时间不换行，缓冲区在 30 分钟流生命周期内无限增长。
**修复**：超过 1 MiB 直接透传或分段重写。

---

## 4. 分页标准（PAGINATION_SPEC）专项

### 4.1 合规项（已逐条核验）

- `usage logs`、`gateway traces`、`routing traces`、`storage` 四类列表使用正确的
  反向元组 keyset + `LIMIT page_size+1` + 不透明 base64url cursor；cursor 解析有长度/范围校验，
  无 `unwrap`/panic。
- `chat conversations/messages`（虽然不在 SDK 内）使用 `page_size+1`、opaque cursor、
  陈旧游标检测。
- 25 个 snake_case 查询 DTO 正确接受 `page/page_size`，默认 20、上限 200。
- 未发现 `collect::<Vec<_>>()` 后再 `skip/take` 的进程内分页（唯一例外见 4.2）。

### 4.2 违规/风险项

| 项 | 证据 | 级别 |
| --- | --- | --- |
| 6 个 DTO 只接受 `pageSize` | 见 P0-1 | P0 |
| `/backend/v3/api/system/records` 全租户扫描 + `COUNT(*) OVER()` + OFFSET | `admin_record_store.rs:14-31,131,171-172` | P1 |
| runtime invocations / events OFFSET + 窗口计数 | `app_runtime_store.rs:33-44,289-306` | P1 |
| notifications OFFSET + 全量排序（无匹配索引） | `app_notification_store.rs:35,107-112`；索引 `0001:2523` 不匹配排序键 | P1 |
| 7 个在线列表端点未进入 OpenAPI（chat、finance ledger、usage statements、announcements、payment attempts、price books） | 由 `.route(` 与 OpenAPI path 差集得出 | P2 |
| 价格册明细无 LIMIT 物化 | `admin_pricing_store.rs:2344-2360` | P2 |
| 结算看板无 LIMIT 物化 | `settlements-dashboard-repository-sqlx/src/postgres.rs:125-145` | P2 |
| cache keys 本地分页为 `skip/take` + 数字 offset 游标 | `application/cache_runtime.rs:664-698,300-305` | P2 |
| 契约缺 `page_size.default` / 未声明 mode | 15 个操作 | P2 |

### 4.3 门禁缺口（为何全绿）

`check-pagination.mjs` 只做文本/契约结构检查，不做 SQL 语义与实现对齐：

1. 识别不到容器级 `#[serde(rename_all = "camelCase")]`；
2. `collect-then-skip` 正则要求 `collect` 在 `skip/take` 之前；
3. 完全不解析 SQL：OFFSET、`COUNT(*) OVER()`、无界 CTE 都可通过；
4. 不做"路由 ↔ OpenAPI 参数"比对，因此 P0-1 与 7 个未文档化端点全部漏检；
5. 不校验每个操作的 mode/default 是否声明。

**建议**：把上述 5 条加入门禁，并在 CI 中对"契约声明的每个 query 参数"做一次真实请求冒烟。

---

## 5. 数据库与 SQLite / PostgreSQL 专项

### 5.1 PostgreSQL：完整，但存在漂移

- **正面**：78 张表全部 `TIMESTAMPTZ`；77/78 有 tenant+org 作用域（例外
  `sdkwork_node_registry` 为集群级，合理）；191 条 INSERT/UPDATE 的列与 schema 零漂移；
  session 守卫完整（`statement_timeout=30s`、`idle_in_transaction_session_timeout=120s`、
  `acquire_timeout=10s`，`infrastructure/sql/pool.rs:18-25,149`）；Chat 序号分配用
  `FOR UPDATE` 串行化（`app_chat_store.rs:278-289`）；结算/异步任务用
  `FOR UPDATE SKIP LOCKED`。
- **迁移元数据**：`metadata.json` 只有 4 条，但规范允许写在文件头；`db framework` 检查通过，
  **不是缺陷**。
- **漂移 1**：`ai_metering_usage.failure_message` 根契约/基线 `VARCHAR(1024)`
  （`0001_cloudrouter_baseline.sql:545`），ai-metering 模块基线 `VARCHAR(500)`
  （`modules/ai-metering/ddl/baseline/postgres/0001_ai_metering_baseline.sql:85`）。
  两者都是 `CREATE TABLE IF NOT EXISTS`，安装顺序决定宽度。当前写入方
  `truncate_message` 截断到 500 字符（`usage_settlement_store.rs:1196-1198`），
  因此**暂无 22001 风险**，但属确定性 schema 漂移（P2）。
- **漂移 2**：根 baseline 重复创建 39 张模块表（与 `database/README.md:13` 的
  "不重复声明"矛盾），`database.manifest.json` 只声明 39 张物化表。已有前车之鉴：
  `0041`/`0042` 记录过 `ai_mcp_*` 因 `IF NOT EXISTS` 先到先得导致的 release 事故。
  需要明确"谁先安装"并加基线等价比对门禁（P1）。
- **补丁缺口**：`payment_intent_runtime_store` 依赖的表在本仓无 DDL，完全依赖 sibling；
  但写入列与 sibling 不符（见 P0-3）。
- **跨模块直读**：`app_runtime_store.rs:1041,1074,1108` 查询 `ai_agent_session/ai_agent_run`
  ——本仓 schema 与 6 个模块都未声明，也没有就绪探针覆盖；只能假定 sibling agents 模块已安装（P2）。

### 5.2 SQLite：服务端已移除，客户端未实现

- PRD §3 明确"服务端 SQLite 回退"是非目标（`PRD.md:70`）；TECH_ARCHITECTURE
  声明 PostgreSQL 唯一权威，且每个服务入口先 `require_postgres_server_database` 再开池
  （`edge-runtime/src/runtime.rs:2568-2575` 等）。
- 全仓唯一 `rusqlite` 在 `external/cc-switch/src-tauri/Cargo.toml:78`，是 git submodule，
  不是 workspace 成员；`crates/`、`services/` 无任何 `sqlite` feature。
- **但是**：`pnpm dev:desktop:sqlite` 是真实接线的命令
  （`scripts/lib/cloud-router-dev-main.mjs:61-64` 注入 `sqlite://target/dev/cloudrouter.sqlite`），
  最终会被上述 Postgres 守卫拒绝；同时本仓没有 `client-local` 数据库模块
  （规范要求 `ddl/baseline/sqlite` + `migrations/sqlite` + `local-data-policy.yaml`），
  desktop 覆盖层没有 schema 可初始化。

**结论**：PostgreSQL 完整；SQLite 在"服务端不静默回退"这一点上正确，
但"desktop SQLite 可运行"尚未实现。**`dev:desktop:sqlite` 必须实现或删除**，
否则是对外承诺的虚假命令（P2，产品诚信类）。

---

## 6. 并发 / 内存 / 高可用专项

### 6.1 已确认的良好实现

- 无 `std` 锁跨 `.await`：`cache_runtime`、`site_settings_cache`、`billing_subject_cache`、
  `circuit_breaker`、`idempotency`、`tenant_inflight` 均将同步临界区与 await 分离。
- 上游响应体硬上限：`ProviderResponseMemoryBudget`（默认 64 MiB / 上限 256 MiB /
  进程预算 512 MiB，`application/invocation/response_memory_budget.rs`）+ `Limited`；
  适配器 HTTP 120s 超时 + `Limited`。
- 流式背压真实存在：`mpsc::channel(1)` + 每帧 `oneshot`，下游 drop 时取消上游；
  首帧 30s / 空闲 30s / 总 1800s 截止。
- 出站 IO 均有超时（OTLP、内部网关、支付 60s+4 MiB、Redis 命令、SQL 池）。
- 工作器有 shutdown 广播与有界批次（结算 200、记账重试 32/200）。

### 6.2 风险项

| 项 | 证据 | 级别 |
| --- | --- | --- |
| 请求体 25 MiB 在准入控制前整体缓冲（公共路径在鉴权后，内部通道在鉴权前） | `config/src/request_limits.rs:27`；`invocation_http.rs:125-133` | P1 |
| 无进程级入站并发/字节预算（全仓无 `ConcurrencyLimitLayer`） | 同上 | P1 |
| 代理路径绕过连接时 IP 校验 | P1-5 | P1 |
| 工作器固定间隔重试、无退避/抖动 | `edge-runtime/src/runtime.rs:2684-2692,2723-2730,2751-2758` | P2 |
| 上游重试固定 backoff、无抖动、忽略 `Retry-After`、429 也重试 | `provider/openai_compatible_relay.rs:1784-1792` | P2 |
| PG 池默认 16/副本，无 `replicas × pool` 与服务端上限校验 | `config/src/database.rs:64` | P2 |
| `site_settings_cache` 满时 `clear()` 全清，跨租户抖动 | `application/site_settings_cache.rs:371-375` | P2 |
| 记账重试 `run_once()` 放在 `select!` 中，非 cancel-safe | `runtime.rs:2846-2849` | P2 |
| 公共监听无 header-read 超时/连接数上限（依赖 ingress） | `http/src/shutdown.rs:72-82` | P2 |

---

## 7. API / SDK / 契约专项

### 7.1 合规项

- 信封：221 个 `-> Response` 处理器全部返回 `SdkWorkApiResponse` 或 `ProblemDetail`；
  错误为 `application/problem+json`；无 2xx 非零 `code`。
- app 50/50、backend 66/66 int64 字段在 OpenAPI 中为 string + `x-sdkwork-int64-string` + pattern。
- open-api 172/172 声明 `x-sdkwork-wire-protocol: external`，未混入 SDKWork 信封。
- 删除一律 204、PUT/PATCH 语义正确；列表统一 `items + pageInfo`。
- 前端无裸 `fetch`/`axios`/手写鉴权头；无 Vite alias 重定向 `@sdkwork/*`。

### 7.2 缺陷

| 项 | 证据 | 级别 |
| --- | --- | --- |
| 27 个已挂载路由不在 OpenAPI/route manifest/SDK（chat 5、invite 1、announcement 2、finance 2、payment attempts 1、price books 6、iam api keys 2、`/v1/user/balance`、`/v1/vendors`） | `.route(` 与 OpenAPI path 差集；`sdks/_route-manifests/*.json` | P1 |
| 路由清单由 OpenAPI 生成、又用清单校验 OpenAPI（循环自证） | `tools/generate-cloudrouter-http-route-manifest-rs.mjs:8-28`；`sync-cloudrouter-api-standard-extensions.mjs:391-410` | P1（门禁失效） |
| SDK 全部 324 个操作的 `x-sdkwork-api-authority` 为点号别名（`sdkwork-cloudrouter.app/.backend/.ai`），规范要求 lower-kebab `sdkwork-cloudrouter-{app,backend,open}-api` | 三个 `sdk-manifest.json` + OpenAPI | P1 |
| 64 个成功路径直接 `Json(success_envelope(..))`：body `traceId` 为新 UUID，且无 `x-sdkwork-trace-id` 头，无法与日志/错误关联 | `api/response.rs:67-69` vs `:492-501` | P2 |
| 4 个重复的 `serialize_i64_as_string` 未用规范 helper | `ports/admin_dashboard_read_store.rs:36` 等 | P2 |
| 前端把 int64 字符串 `Number.parseInt`（定价/会员/社区共 6 处） | `admin-pricing/src/{rulesPage,rateCardsPage,plansPage}.tsx`、`pricingService.ts:1084`、`membershipsService.ts:1036`、`CommunityOverviewPage.tsx:67-75` | P2 |
| 部分 4xx `detail` 直接 Display 错误 | `admin_storage.rs:606-612`、`upstream/shared.rs:480-492` | P2 |
| 未文档化端点无分页 mode/default/max | 见 §4.2 | P2 |

---

## 8. 安全专项

### 8.1 已验证的强项

- API Key：HMAC-SHA256 + 服务端 pepper，256-bit CSPRNG，按哈希查找；
  吊销/过期在快照查询中强制（`queries/snapshot.rs:1404-1408`）。
- 凭据：AES-256-GCM、随机 96-bit nonce、AAD 绑定 tenant/org/account/credential、
  key-id 环、解密失败 fail-closed（`infrastructure/crypto.rs:111-180,230-298`）。
- 常量时间比较：`Mac::verify_slice`；密码 PBKDF2-HMAC-SHA256 210k 迭代。
- 不信任客户端身份头；投影头在装配层剥离；重复头报 40001。
- 直连 SSRF：HTTPS-only、拒绝 IP 字面量/内网名、连接时校验 DNS 解析结果、不跟随重定向、
  响应体限流、CRLF 安全头构造、转发前剥离 `authorization/x-api-key`。
- 浏览器侧：不使用 Cookie（无 CSRF 面）、CORS 显式白名单 + credentials、CSP/XFO/nosniff。
- 仓库无真实生产密钥；历史默认值在启动时被拒绝（`security_startup_guard.rs:71-121`）。

### 8.2 风险项

| 项 | 证据 | 级别 |
| --- | --- | --- |
| 代理路径 SSRF | P1-5 | P1 |
| 无 kid 的 App session token 走全局共享密钥回退，claims 可声明任意租户；`TODO(security)` 仍在 | `http/src/auth.rs:928-944` | P2（当前无生产签发方，属潜在跨租户伪造） |
| `kid` 未校验长度/字符集，签名前即触发 DB 查询（未认证放大 + 存在性 oracle） | `auth.rs:922-938` | P2 |
| trusted-subject HMAC 不绑定 body、无 nonce，±300s 可重放 | `auth.rs:1603-1618,1414-1428` | P2 |
| 任意租户管理员可解密上游明文凭据，无二次认证/审计/限流 | `backend-api/src/upstream/account.rs:472-496` | P2 |
| 部分 admin 查询仅按 tenant 过滤（pricing/referral/marketing），若数据属组织级则跨组织 | `admin_pricing_store.rs:280`、`admin_referral_store.rs:126`、`admin_marketing_store.rs:796` | P2（需产品确认数据归属） |
| compose 示例数据库口令为弱默认值且不在启动守卫清单 | `docker/.env.example:46` | P2 |

---

## 9. 商业化落地能力评估

### 9.1 结论：**不具备**

`preLaunch: true`、`publish.status: DRAFT`、`version 0.4.12`
（`agent.app.config.json`）与现实一致。PRD 的阶段表也把
"Production hardening / Commercial beta / GA" 标为 Planned（`PRD.md:229-236`）。

### 9.2 阻断项（按优先级）

| # | 阻断 | 证据 |
| --- | --- | --- |
| 1 | **没有可交付、可验证的制品**：5 个 artifact 的 `sha256` 为空、`signature` 为 null、版本仍是 0.3.0；install package 全部 `enabled:false` | `deployments/artifacts/checksums.json:1-40`；`agent.app.config.json` |
| 2 | **K8s 镜像 tag 落后**：`0.4.7` vs manifest `0.4.12` | `deployments/kubernetes/cloud-router-standalone.yaml:70` |
| 3 | **支付不可用**（P0-3）与**管理端列表 400**（P0-1） | 见 §2 |
| 4 | **许可/版本分层未在服务端生效**：`Edition` 只传给 portal 字符串，无任何功能/租户数门禁 | `crates/sdkwork-cloudrouter-license/src/lib.rs`；`standalone-gateway/src/main.rs:109-111` |
| 5 | **对外承诺无证据**：SLA 99.5/99.9 + 60s 探针无实现；SOC2 目标 2027；SAML/SCIM 不存在 | `docs/legal/SLA.md:33-67`、`docs/legal/TIER_MATRIX.md:74-79`、`docs/compliance/SOC2-compliance-readiness.md` |
| 6 | **Chat 不在产品契约**（P1-7） | 见 §3 |
| 7 | **DR/HA 未演练**：无 PITR、无 restore drill、无多副本故障注入证据 | `deployments/runbooks/disaster-recovery-plan.md:5-10,44-50` |
| 8 | **数据驻留/data policy 未实现**：无 `data_policy`/`residency` 符号，region 只影响计费与选择 | REQ-2026-0001 AC9；`upstream_route_selector.rs:794-846` |
| 9 | **计量口径与定价文档不一致**：PRICING 宣称 tiktoken；实际仅失败流用 `ascii/4 + wide*3/4` 估算（主路径仍用 provider usage） | `PRICING.md:106-116`；`usage_extraction.rs:710-745` |
| 10 | **发布门禁红**（P0-2） | 见 §2 |

### 9.3 改进方案（可执行路线）

**阶段 0（3–5 天）——修复立即不可用项**

1. 修 P0-1 的 6 个 DTO，补契约-实现参数测试；重新生成 SDK。
2. 修 P0-2：统一 API 物化方向，跑 `pnpm api:materialize:write` 并提交。
3. 修 P1-1（8 个 int64 字段）、P1-2（3 个 201）。
4. 删除或实现 `dev:desktop:sqlite`（推荐删除命令并保留文档说明）。

**阶段 1（1–2 周）——数据与资金正确性**

5. P0-3：与 `sdkwork-payment` 对齐 intent schema/status；把 e2e 设为 CI 必跑。
6. P1-11：重写 `ai_resource_binding` 唯一索引（部分索引 + `COALESCE`），补迁移与数据修复脚本。
7. P1-10：所有软删除表唯一索引加 `WHERE deleted_at IS NULL`。
8. P1-8：记账上下文失败改为 Err + 重试信封；补失败注入测试。
9. P1-9：借记键按 usage fact 生成；补"提交后事务回滚"故障注入测试。
10. P1-6/P1-7：records 改 keyset；chat 进契约或降级 PRD。

**阶段 2（2–4 周）——并发/高可用/安全**

11. P1-3：修 SSE 降级忙循环；P1-4：Server 模式禁止内存回退 + notifiers 清扫。
12. P1-5：代理路径 CONNECT 前本地解析校验；补 DNS rebinding/元数据负向测试。
13. P1-12：流任务 JoinSet + 优雅 drain + 终态补偿 sweeper。
14. 入站并发/字节预算 + header-read 超时 + 连接数上限。
15. 池容量公式 `replicas × max_connections ≤ PG max_connections` 写入启动校验。

**阶段 3（2–4 周）——商业化门禁**

16. 产出真实 checksum/signature/SBOM，启用 install packages，镜像 tag 由 manifest 渲染并加 CI 相等校验。
17. 服务端 edition 门禁：路由/租户数/SSO 能力按授权控制；否则重写 TIER_MATRIX。
18. 撤回未实现的 SLA/SOC2/SAML 承诺，或补齐探针与审计证据。
19. 数据驻留字段 + 路由过滤 + 审计。
20. DR 演练（PITR、restore、RPO/RTO）与至少 2 副本故障注入，保留证据。
21. 计量：provider usage 为唯一权威；失败流估算写入审计字段；补 CJK/流式回归。

**阶段 4——门禁加固（持续）**

22. `check-pagination.mjs` 增加容器 rename 检测、SQL 语义、路由↔契约参数比对。
23. 增加跨仓 schema 契约测试（CloudRouter 写入列 ⊆ 联邦基线）。
24. 增加"OpenAPI 声明的 query 参数必须被 handler 接受"的契约测试。
25. 所有 e2e 不得因缺少 `SDKWORK_DATABASE_URL` 静默跳过；CI 必跑。

---

## 10. 与 PRD / 技术架构的偏差清单

| 文档声明 | 代码现实 |
| --- | --- |
| TECH §6：生成传输序列化 `page_size`，HTTP 用 snake_case | 6 个 DTO 只认 `pageSize`（P0-1） |
| TECH §3：App SDK 暴露 Chat 的 `cursor/pageSize/pageInfo.nextCursor` | Chat 不在 OpenAPI/SDK/manifest（P1-7） |
| PRD §6：100% 列表使用有界存储级分页 | records/notifications/runtime 用 OFFSET + 窗口计数（P1-6 等） |
| PRD §3：发布物 checksum/signature/SBOM 100% | checksums 为空、signature 为 null、版本 0.3.0 |
| TECH §5：支付意图持久化后转 `requires_action` | 联邦基线 CHECK 不接受该状态（P0-3） |
| TECH §6：Payment 列表用 `createSdkWorkPagedListSession` | PC 端无该调用，页面自设 `initialPageSize` |
| PRICING：tiktoken 计量 | 仅失败流用字符估算（主路径用 provider usage） |
| TECH §2：服务端 SQLite 已完全移除 | 是；但 `dev:desktop:sqlite` 仍作为可用命令存在 |
| REVIEW-20260714：provider egress 缺 DNS rebinding 防御/解析 IP 固定 | 直连路径已实现（`outbound_dns.rs`）；代理路径仍缺（P1-5） |

---

## 11. 附：本次审计确认"没有问题"的关键项

- 聚焦 `cargo check --lib` 在 11m10s 内 Finished，0 error；`sdkwork-cloudrouter-*`
  自身无编译警告（警告全部来自 sibling 仓库）。
- 全仓无 `todo!`/`unimplemented!`（`external/cc-switch` 除外），无"返回成功但不做事"的主链路。
- 未配置能力返回 501/503，生产启动对未计量 relay 直接 fail-closed
  （`runtime.rs:379-395`）。
- Chat 序号分配、结算 claim、异步任务 claim 的锁语义正确。
- 金额无浮点运算；`DecimalValue` 为定标 i128 + checked 运算；DB 为 `NUMERIC(38,12)`。
- 用量/评级/计费行有唯一键 + `ON CONFLICT` 幂等 + 载荷相等校验。
- 前端无裸 HTTP、无本地 SDK fork、无客户端分页切片。
- 标准门禁（命名、manifest、i18n、CORS、source-config、依赖完整性）全部通过。

---

## 12. 复现与复检命令

```bash
pnpm install
node ../sdkwork-specs/tools/check-pagination.mjs --root .
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
node ../sdkwork-specs/tools/check-database-framework-standard.mjs --root .
node tools/generate-cloudrouter-http-route-manifest-rs.mjs --check
node scripts/materialize-apis-contracts.mjs --check      # 预期当前失败
cargo check -p sdkwork-cloudrouter-router-service --lib
cargo test -p sdkwork-cloudrouter-router-service --test admin_marketing_api
```

**建议新增的回归用例**

1. `GET /backend/v3/api/pricing/plans?page=1&page_size=20` → 200（当前 400）。
2. `POST /backend/v3/api/storage/quotas` → 201（当前 200）。
3. `AppRoutingRequestTrace` 序列化后 `requestBytes` 为 JSON 字符串。
4. 在联邦基线上执行一次 `insert_payment_intent`（当前列/状态不匹配）。
5. 连续两次 `PUT /upstream_suppliers/{id}/resources` 后活跃绑定行数不增长。
6. 删除供应商后用同一 `supplier_code` 重建成功。
7. 65 个并发 SSE tail 下 Postgres QPS 不随订阅数线性增长。
8. 代理模式下配置解析到 `10.0.0.1` 的上游域名被拒绝。
