# SDKWork Cloud Router 深度审计报告

> 日期：2026-08 ｜ 审计范围：sdkwork-cloudrouter 全仓库（Rust 后端 / React PC 前端 / OpenAPI 契约 / 生成 SDK / 数据库 / 部署）
> 方法：本人逐项源码验证 + 6 路并行子代理深度审计（全部 6 路已并入） + 项目自带验证门全部实跑
> 已修复：CRITICAL-支付时间戳硬编码（payment_aggregate.rs 6 处 → current_timestamp_string()，cargo check 通过）
> 权威基准：PRD（docs/product/prd/PRD.md）、TECH_ARCHITECTURE.md、sdkwork-specs（API_SPEC/PAGINATION_SPEC/SECURITY_SPEC/IAM_SPEC/DATABASE_SPEC/PERFORMANCE_SPEC）

---

## 0. 结论摘要（TL;DR）

| 维度 | 结论 |
|---|---|
| 功能完整性 | 主体功能真实实现且工程质量高（路由/计费/结算/Chat/分析），但存在**契约-实现断链**（Chat 无 OpenAPI/SDK、open-api int64 三方矛盾、未入契约的挂载路由）+ **结算链路断裂**（baseline 缺结算三列，worker 全新安装静默禁用） |
| 虚假实现 | **SQLite 是"名义支持、实际死代码"**：`pnpm dev:desktop:sqlite` 与桌面 SQLite 配置无法运行，所有运行路径强制 PostgreSQL |
| 验证门 | 项目自己的 11 项验证门中 **5 项 FAIL**（int64 契约、standard-extensions drift、rust 架构守卫、schema 质量门、db contract materializer）——与 CHECK_RESULT.md"全部通过"的声称不符 |
| 安全 | **3 项 CRITICAL**：API Key 明文落库+列表回显、支付后端零细粒度授权+凭据明文可读、App session token 共享密钥回退 |
| 并发/内存 | 生产路径设计严谨（Redis Lua 熔断、租约 fencing、keyset 分页、内存预算）；发现 usage logs OFFSET、InMemory stream bus 泄漏、CircuitBreaker 全局 Mutex 热点 |
| 商业化 | **不具备商业化落地条件**（preLaunch 自认 + REQ-2026-0001 未闭合 + 4 门红 + 3 CRITICAL 安全 + 缺生产负载证据） |

---

## 1. 验证门实测结果（全部本人运行）

| 验证器 | 结果 | 备注 |
|---|---|---|
| `check-pagination.mjs` | ✅ PASS | |
| `check-api-response-envelope.mjs` | ✅ PASS | |
| `check-api-operation-patterns.mjs` | ❌ **FAIL（69 字段）** | open-api 面 int64 契约违规（见 §3） |
| `check-component-port-bindings.mjs` | ✅ PASS | |
| `check-permission-composition.mjs` | ✅ PASS | |
| `cloudrouter_sdk_guardian` | ✅ PASS | |
| `api:materialize:check` | ✅ PASS | |
| `sync-cloudrouter-api-standard-extensions.mjs --check` | ❌ **FAIL** | 4 文件 drift（app/backend OpenAPI 缺 request-context stamp） |
| `rust_backend_architecture_guardian` | ❌ **FAIL** | admin/standalone gateway 未按薄路由架构再导出 route crate |
| `schema_quality_gate` | ❌ **FAIL** | communityService.ts 15+ 前端操作缺契约 |
| `database_contract_materializer --check` | ❌ **FAIL** | generated schema/baselines 与 schema.yaml 契约过期（5 文件 stale） |

→ **当前工作树无法通过自身声明的验证组合**（TECH_ARCHITECTURE §10），与 CHECK_RESULT.md"标准管线全部通过"矛盾。部分门红源于工作树存在 108 个未提交文件（契约链半同步态）。

---

## 2. 虚假实现 / 名义实现（用户重点关切）

### 2.1 SQLite：名义支持，实际完全未实现（CRITICAL-合规）

**证据链（全部本人验证）**：
1. workspace `Cargo.toml:134`：`sqlx = { ..., features = ["runtime-tokio", "postgres"] }` — **仅 postgres 特性**，全仓无任何 crate 启用 `sqlite` feature（grep 所有 crates/services Cargo.toml 为 0）。
2. 全仓 Rust 无任何 `SqlitePool`/`AnyPool` 构造点；`sdkwork-database-sqlx` 有 sqlite feature 但本仓从未启用。
3. 每个运行路径都拒绝 SQLite：
   - `crates/sdkwork-cloudrouter-edge-runtime/src/runtime.rs:2255` `require_postgres_server_database`（2 个调用点 1365/1902）
   - `crates/sdkwork-routes-cloudrouter-app-api/src/routes.rs:928`、`backend-api/src/routes.rs:999`：`!matches!(config.engine, DatabaseEngine::Postgres)` 拒绝
   - `services/sdkwork-cloudrouter-installer/src/main.rs:61`：仅 Postgres 才初始化
   - `router-service/.../sql/pool.rs:79`、`runtime_id.rs:24,31`：硬编码 `StandardDatabaseEngine::Postgres`
   - `services/sdkwork-cloudrouter-standalone-gateway/src/lib.rs:28`：`Some("postgresql")` 硬编码
4. 但**配置层与开发脚本声称支持 SQLite**（虚假面）：
   - `crates/sdkwork-cloudrouter-config/src/database.rs`：`DatabaseEngine::Sqlite` 可解析、桌面 profile 默认生成 SQLite TOML（`default_runtime_database_config` :354-360）、帮助文案"Desktop deployments default to SQLite"
   - `package.json:26` `dev:desktop:sqlite` → `scripts/lib/cloud-router-dev-main.mjs:21,57-60` 传 `--database-url sqlite://target/dev/cloudrouter.sqlite` → 运行期必被 `require_postgres_server_database` 拒绝
   - `CHECK_RESULT.md` 声称"desktop packages default to a local SQLite database in the OS user data directory" — **与运行代码矛盾**
5. 本仓无 Tauri shell（无 tauri.conf.json），desktopAppId 对应的桌面壳在别处；本仓内不存在可运行 SQLite 数据路径。

**结论**：对齐 PRD 的部分是正确的（PRD 明确"服务端 SQLite 是 non-goal，PostgreSQL 唯一权威"；TECH_ARCHITECTURE §2 也声明"本服务 SQL 基础设施未实现 SQLite"）。但**配置/脚本/打包文档层的 SQLite 声称是虚假实现**：`pnpm dev:desktop:sqlite` 是死命令，桌面默认 SQLite TOML 与实际运行路径矛盾。要么（a）彻底移除 SQLite 配置面与死脚本并改文档，要么（b）在独立客户端模块真实实现（不属本仓服务器）。

### 2.2 其它名义/残缺实现（HIGH/MEDIUM）

- **Chat 表面无契约**：`/app/v3/api/chat/*`（conversations/messages/turns）已挂载生产路由（`sdkwork-routes-cloudrouter-app-api/src/routes.rs:169,287,478-487`），但 app-api OpenAPI **0 条 chat 路径**、生成 SDK 无对应方法 → 前端无法通过 SDK 调用、无文档、无验证门覆盖。
- **挂载未入契约路由集群**（API/SDK 子代理核实）：app `app_invite.rs:93`（/invites/issue）、`app_routing_strategy.rs:81`、`app_settlements.rs:57-61`；backend `admin_announcement.rs:106-110`、`admin_catalog.rs`、`admin_mcp.rs`、`admin_finance.rs`、`admin_marketing.rs`、`admin_user.rs:113-116`（遗留 user/apikey 面）；open `gateway_balance.rs:107`（/v1/user/balance）、`openai_vendors.rs:74`（/v1/vendors）、`payment_aggregate.rs:234-248`（/payments/v3/*）。
- **标准扩展 stamp 未同步**：`sync-cloudrouter-api-standard-extensions.mjs --check` 4 文件 drift，openapi 已重生成但未重新 stamp `x-sdkwork-request-context`。

---

## 3. API/契约/SDK 审计（子代理 4 + 本人验证）

### CRITICAL

1. **open-api 面 int64 契约违规（69 个字段，201 条验证器输出，实测 FAIL）**
   - `apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json` 与 `sdks/cloudrouter-open-sdk/openapi/cloudrouter-open-sdk.openapi.json`：`OpenAiFile.bytes`、`OpenAiUpload.bytes`、`AnthropicFile.size_bytes`、`OpenAiVectorStore.usage_bytes/bytes`、`OpenAiModel.created`、`OpenAiChatCompletion.created`、全部 `*_at` 时间戳、`OpenAiChatCompletionRequest.seed`、`Vidu*Request.seed`、`MidjourneyImageGenerationRequest.seed` 等 **69 个字段**为 `type: integer, format: int64`，违反 API_SPEC §13.6（MUST 为 `type: string, format: int64` + decimal pattern + `x-sdkwork-int64-string`）。
   - **影响**：生成 TS SDK 将 `seed`/`bytes` 等类型为 `number`，浏览器在 >2^53 时静默舍入；`seed` 合法范围 0..2^64-1 必然越界。
   - **根因（规范冲突）**：open-api 面是 OpenAI/Anthropic 等上游 wire 的精确镜像（上游就是 integer，API_SPEC §4.5.2 vendor-compat 要求"上游 wire 精确"），但 §13.6 与验证器不豁免 external 操作 → **OpenAPI(integer) ≠ TS SDK(string) ≠ Rust 解析(i64)** 三方断裂（`sdkwork-sdk-generator/.../typescript/config.ts:121-123` 无条件 int64→string；Rust `api/openai_contract.rs:232` `seed: Option<i64>`）。外部集成方按 SDK 类型传 `"123"` 会 HTTP 400。
   - **修复**：需 spec+validator+generator 三方协同——验证器为 `x-sdkwork-wire-protocol: external` 操作豁免 int64-string；生成器对 external 面保留 number；或服务端对 int64 字段双格式解析。属发布前阻断项。

2. **契约-实现不符：资源目录 DTO int64 序列化为 number**
   - `crates/sdkwork-routes-cloudrouter-backend-api/src/upstream/resource_catalog.rs:36,49-50`：`sort_order: Option<i64>`、`resource_count: i64` 直接 `Serialize` → 线上 number；OpenAPI 契约声明 `type: string, format: int64`（backend-sdk 类型说谎）。

### HIGH

3. **Chat 端点缺 OpenAPI/SDK 契约**（见 §2.2）
4. **PageInfo.totalItems 缺 int64 标记**：`apis/backend-api/...openapi.json:6009-6011` 等仅 `type: string + pattern`，无 `format: int64` + `x-sdkwork-int64-string`（模板 `templates/openapi/components/schemas/page-info.yaml:20-24` 齐全，材料化丢失）。
5. **契约链半同步**：`apis/backend-api/...openapi.json`、`apis/manifest.json`、`generated/openapi/cloudrouter-backend-openapi.json`、`generated/schema/postgres/schema.sql` 等 108 个文件未提交；standard-extensions stamp 未重跑（4 文件 drift）。

### 合规亮点（验证通过）
- app/backend 面 38/36 个 int64 字段全部 string 合规，0 违规；TS SDK `id: string`；前端 313 个 TS 文件 0 处 id→number。
- 响应信封 100% 合规（88 backend/28 app 2xx 经 SdkWorkApiResponse allOf），错误码 40001-79999 标准区间；`pageSize→page_size` wire 映射正确。
- route-manifest ↔ OpenAPI 0 差异（app 29/backend 99/open 160）；open-api 160 操作全部带 `x-sdkwork-wire-protocol: external`。
- materialize/envelope/route-manifest 生成门全绿。

---

## 4. 分页审计（子代理 3，PAGINATION_SPEC §12 pre-launch 零债务要求）

### CRITICAL
1. **高流量计量表 OFFSET 分页**（本人验证）：
   - `router-service/.../postgres/usage_logs_read_store.rs:15-31,63,159-160`：`ROW_NUMBER() OVER (PARTITION BY ...)` 在租户全量 trace 集上开窗 + `COUNT(*) OVER() AS total` + `LIMIT $8 OFFSET $9`（`/backend/v3/api/system/records` 与 `/app/v3/api/ai/usage/logs`）。
   - 违反 PAGINATION_SPEC §6（大表 keyset）、§12（pre-launch 禁高流量表 OFFSET）；窗口函数物化全租户结果 → 内存/CPU 随总量增长（OOM 风险维度）。
   - 同型：`admin_record_store.rs:159`、`app_notification_store.rs:111`（notifications OFFSET，§3 明确 cursor 优先）。
   - 修复：改 keyset `(started_at,id)` 谓词 + `LIMIT page_size+1`；totalItems 用估算或去掉；OpenAPI mode 改 cursor。

### MEDIUM
2. Chat conversations 列表 OFFSET + 不稳定排序（`app_chat_store.rs:90-96`，`ORDER BY updated_at DESC` 无 id tie-breaker 场景）+ 无契约（见 §2.2）。
3. `totalItems` 无 int64 标记（见 §3 HIGH-4）。
4. 未复用 `sdkwork-utils-rust::http_api` 共享分页工具（`api/response.rs:517,571`）。

### 合规亮点
- 消息列表 keyset `(message_no,id) < ($5,$6)` + base64url 不透明 cursor ✓（`app_chat_store.rs:61-66`、`app_chat.rs:747-775`）；traces keyset ✓；缓存 Redis SCAN 不透明 cursor ✓。
- 无违禁 wire 别名（pageSize/limit/page_no/per_page/size）；前端无 listAll/slice 分页；生产 Rust 无进程内分页。
- `check-pagination.mjs` PASS（启发式门通过，但深审发现人工项）。

---

## 5. 安全审计（子代理 5 + 本人验证）

### CRITICAL

1. **API Key 明文落库为默认 + App 列表/详情回显完整 rawKey**（本人验证）
   - `crates/sdkwork-cloudrouter-config/src/api_key.rs:14-19`：`ApiKeySecretStorageMode::Plaintext` 是 `#[default]`。
   - `api_key_command_store.rs:383-425` INSERT 直接写 `key_secret_plaintext`；`queries/snapshot.rs:1102-1105` 把**全租户明文 key 载入每个网关进程内存**。
   - `services/.../api/app_api_keys.rs:681`：列表/详情响应带 `raw_key` 全文；前端 `ApiKeysView.tsx:578` 列表内联明文回显可反复复制。
   - 违反 IAM_SPEC §5（write-only/哈希存储）。修复：生产强制 ciphertext + 启动拒绝 plaintext；列表契约移除 rawKey（仅 create 一次性返回）；快照不装载明文。

2. **支付 provider account 后端零细粒度授权 + GET /credentials 返回明文**（跨 sdkwork-payment 仓库，本人验证）
   - `../sdkwork-payment/crates/sdkwork-routes-payment-backend-api/src/http_route_manifest.rs:92-138`：全部 `HttpRoute::dual_token(...)` 无 `required_permission`；`subject.rs:20-32` 仅 `can_access_backend_api()` 成员级检查。
   - 任何组织成员可 POST/PATCH/DELETE `/backend/v3/api/payments/provider_accounts`、`test`、`credentials.rotate`；**GET /credentials 返回解密明文（Stripe sk_、支付宝 RSA 私钥、微信证书）**；删除/轮换无 step-up。
   - 与 TECH_ARCHITECTURE §7「Payment backend remains the authorization boundary」声明相反。

3. **App session token 共享全局 HMAC 密钥回退**
   - `crates/sdkwork-cloudrouter-http/src/auth.rs:803-827,837-867,966-998`：租户无 per-tenant key 时用全局 `AppSessionConfig` 密钥签名；`kid` 未命中回退共享密钥；legacy v1 token 仍接受。共享密钥泄漏可伪造任意租户 token。

### HIGH（摘录）
- 前端 localStorage 明文存 accessToken+authToken+refreshToken（`app-session-token.ts:404-428`）+ 静态页无 CSP。
- 支付表单回读完整明文凭据（外部包 ProviderAccountForm.tsx:230-252,857-869）。
- API key 撤销为快照式生效（15s-180s 窗口，`catalog.rs` CATALOG_REFRESH_FALLBACK_TICKS=12），热路径不复查 status/revoked。
- Admin 面粗粒度 `cloudrouter.admin.access` 代替细粒度 commerce/billing 权限（前后端授权模型不一致）。
- **IDOR/越权集群**：chain policy 读取无租户谓词（`admin_chain_policy_store.rs:37-54`）+ 租户可写 GLOBAL scope 遮蔽平台策略（:113-185）；service node 平台实例可被租户改（`admin_service_node_store.rs:201-278`）；usage retention backfill 忽略租户谓词（`usage_retention_store.rs:43-57`）；transaction center 平台('0')行可被租户改（:101-128）；catalog 全局行可被租户写（8 处）。
- 8 条错误链把 raw sqlx 错误（含 SQL 片段）返客户端（`problem_from_wire_code("5000", format!("{context}: {error}"))`，如 `admin_mcp_store.rs:1691-1693`）。

### MEDIUM（摘录）
- API key 管理端点无速率限制；query 型上游鉴权明文密钥进 URL（`provider_request.rs:172-178`）；快速导入深链明文 key 拼 URL；内部网关防重放默认进程内（多实例失效）；多处按 id 直改语句缺 tenant 谓词（纵深不足）；vite `loadEnv` 未收紧前缀。

### 安全合规亮点（子代理核实）
- 上游凭据 AES-256-GCM + HKDF 域分离 + AAD 绑定租户/账号 + keyring 轮换 + 指纹（`infrastructure/crypto.rs:66-181`）；Debug 全 REDACTED。
- API key HMAC-SHA256(pepper) + OS CSPRNG（BCryptGenRandom//dev/urandom）32 字节；恒定时间比较。
- SSRF 双层防护：URL 策略（HTTPS-only、禁 IP 字面量、内网域名黑名单含 169.254 metadata）+ DNS 解析时 IP 校验且拒绝混合公/私答案（`outbound_dns.rs:51-71`）；hyper-rustls + webpki + 生产 https_only。
- SQL 租户谓词纪律好：Chat/用量/上游账户/结算/支付全部绑定 tenant+org(+user)；SQL 注入 0 发现（45+ store 全 bind）。
- 日志/响应统一脱敏（`redaction.rs`）、审计覆盖关键操作且不含密钥、生产 fail-closed（web framework 强制、占位密码拒绝）。

---

## 6. 前端审计（子代理 6）

### HIGH
1. `membershipsService.ts:930-958,1059,1071-1082`：计划权益服务端 id(int64) `Number.parseInt` → `Set<number>` → 重新 String 化提交，`string→number→string` 往返，>2^53 静默舍入回放错误 id。
2. `app-session-token.ts:404-428`：refreshToken 明文 localStorage（见 §5 HIGH）。
3. `ApiKeysView.tsx:578,583`：列表行明文回显 rawKey（见 §5 CRITICAL-1）。

### MEDIUM（摘录）
- quick-import 裸 `fetch()` 手写 `Authorization: Bearer` 探测外部网关、无超时（可辩护但需 timeout）。
- Rankings `pageSize:200` 拉全量 + 过滤全客户端 + 并行第二次请求（PAGINATION_SPEC §8）；存储 Reconciliation/GC 任务列表不分页；7 处引用映射一次拉 200 无 hasMore 续页；community 成员列表无分页参数。
- 9 处 `totalItems` 经 `Number(String(v))` 无 isSafeInteger 防护。
- vite 自定义 resolver 回退兄弟包 src 直接编译 + 兼容别名（DEPENDENCY_MANAGEMENT_SPEC §1.3.1 禁用形态）；`useSyncExternalStore` 手工复刻 + alias。
- tsconfig 未开 exactOptionalPropertyTypes/noUncheckedIndexedAccess；无 ESLint（lint=typecheck）。

### 合规亮点
- 三面（app/backend/open）全部走生成 SDK；无 raw fetch/axios 业务调用、无 SDK fork、无 listAll、无手拼分页别名；int64 生成 SDK 全 string，服务层 int64-string 助手 + BigInt；生产代码零 `any`。
- 所有交互列表逐页请求并消费服务器 pageInfo；无 Array.slice 本地分页；loading/error/empty/retry 齐全、竞态防护（requestIdRef/cancelled）纪律优秀；无 dangerouslySetInnerHTML、无硬编码密钥。

---

## 7. 后端核心/并发/内存/性能（子代理 1 完整报告 + 本人复核）

### 7.0 CRITICAL（本人复核确认 + **已修复**）

**支付/退款 6 个 handler 硬编码时间戳 `requested_at = "2026-05-29T00:00:00Z"`** ✅ 已修复
- 原状：`services/.../api/payment_aggregate.rs:289,338,402,447,492,536`（create/cancel intent、confirm、capture、create/cancel refund）全部传固定常量；经 `payment_intent_runtime.rs:284-285`、`payment_refund_runtime.rs:250-251` 持久化到 `created_at/updated_at/started_at`（`payment_intent_runtime_store.rs:240-241,489-490`）。
- 影响：所有金钱记录时间戳冻结在 2026-05-29——排序、幂等窗口、过期计算、审计时间线、结算/对账匹配全部错乱（**错误计费**）。已挂载生产路由（app-api routes.rs:429）。
- **修复（本次已实施）**：6 处改为 `current_timestamp_string()`（UTC 实时墙钟，与其它 api 模块同款格式），并补齐私有 helper；`cargo check -p sdkwork-cloudrouter-router-service --lib` 通过（exit 0，仅 1 个与本次无关的既有 dead_code 警告）。

### 7.1 功能完整性核对（vs PRD/TECH_ARCHITECTURE）
- 路由生命周期 9 步（认证→归一化→组解析→快照→候选拒绝→策略→端点排序→校验 egress→记录）均有对应实现：`upstream_route_selector.rs`（组/策略/绑定按 tenant 过滤）、`upstream_account_route_planner.rs`、`invocation/pipeline.rs`、`provider_adapter_dispatch.rs`。
- 路由选择错误语义正确：ModelForbidden 硬失败、PricingUnavailable 软失败、多组回退（`upstream_route_selector.rs:213-249`）。
- 计费/用量/结算/对账 worker 齐全且带配置边界（`usage_settlement_worker.rs`、`payment_reconciliation_worker.rs`、`gateway_accounting_retry.rs`）。
- 全库无 `todo!`/`unimplemented!`/`panic!("not implemented")` 生产桩；唯一假实现：MCP `check_health` 无探测 stub（`admin_mcp_store.rs:550-597`，MEDIUM）+ 若干硬编码占位（余额 `'0'`、`active_users==total_users`）。

### 7.2 并发/死锁审计
- **无跨 .await 持 std 锁**：核查 `Mutex`/`RwLock` 使用点均不跨 await；无嵌套锁。
- Chat 并发写正确：`FOR UPDATE` 锁行 + 聚合计数器 + 唯一索引兜底 + 失败关闭（`app_chat_store.rs:279-474`；迁移 0022 修 NULL-distinct）。
- Redis 协调全部 Lua 原子（熔断状态转移、流总线 renew）。
- **HIGH-性能**：`CircuitBreakerInterceptor` 全局 `Mutex<HashMap>`（`circuit_breaker.rs:257-258`）单锁热路径争用。
- **MEDIUM-泄漏**：`InMemoryRuntimeStreamBus` 三个 HashMap 永不清理过期条目（`runtime_stream_bus.rs:61-65,80-87`）——长跑进程按 invocation 数线性增长（OOM 风险）；生产 Redis 版有 TTL 兜底。

### 7.3 内存/OOM 审计
- 请求体 1MiB / 响应 64MiB 默认 256MiB 上限 + ProviderResponseMemoryBudget；结算 snapshot 16KiB / retry envelope 32KiB / 桌面队列 1025 拒收 —— PRD 容量护栏落实。
- **HIGH-扩展性**：路由/定价快照**全量装载**（`queries/snapshot.rs` 无 LIMIT + `catalog.rs load_full`）→ 每网关进程内存随全平台目录总量增长；大规模集群需按租户分区或分页装载。
- **HIGH-分页内存**：usage logs `ROW_NUMBER() OVER()` 全窗口物化（见 §4 CRITICAL）。
- **MEDIUM**：`usage_logs_read_store.rs` 多个 `LIKE '%..%'` 无索引；`iam_auth_token_authenticator.rs:56-100` 每次请求 1-2 次 IAM 全库解析无缓存 + 每请求克隆全量账户组。
- 流式转发按 chunk 增量（`Limited` body + deadline body），无整响应缓冲；但 adapter SSE 路径 body 无 idle/total 截止（`provider-adapter-http/client.rs:202-210`，MEDIUM）。

### 7.4 性能/高可用/正确性（子代理 1 关键 HIGH/MEDIUM 摘录）
- **HIGH-SSRF**：`edge_server.rs:1248-1255,1441-1467` tool-api（SDK 生成器）未配置 base URL 时由请求 `Host` 头派生目标，`is_safe_http_host` 放行私网/环回/169.254 → 客户端可让边缘带生成器密钥向任意主机 POST（条件开启）。
- **HIGH-路径穿越**：`provider_passthrough_transport.rs:89-94,251-258` 不拒 `..` 段 → `/provider/tencent-cloud/../../<任意路径>` 带共享凭据转发（relay 路径缺口）。
- **HIGH-IP 安全控制失效**：`invocation_http.rs:153,387,588-589` `extract_client_ip` 硬编码 `trust_forwarded_headers=false` 且 `axum::serve` 未注入 `ConnectInfo` → `client_ip` 恒 None → IP 白名单拒绝所有流量、IP DENY/按 IP 限流永不命中（**两项安全控制静默失效**）。
- ~~**HIGH-租户隔离**：`auth.rs:300-326` 无边界模式回退 `from_headers` 直接解析客户端 `x-sdkwork-tenant-id` 等且**不校验 HMAC**~~ → **已修复（2026-08-16）**：`TrustedRequestSubject::resolve_optional` 删除客户端投影头回退（fail-closed），无边界模式下 subject 只能来自已验签的 app-session 边界或扩展上下文；`from_headers` 仅保留为边界验签后的服务端内部握手；新增回归测试 `trusted_request_subject_never_resolves_from_client_supplied_headers`（29 集成 + 45 lib 测试通过）。
- **HIGH-降级**：`RedisConfig::from_env_or_runtime_toml(...).ok().flatten()` 吞 Err + Redis 失败静默回退本地计数/内存流总线 → 多副本下配额按节点放大、去重失效、事件丢失。
- **HIGH-重试**：legacy relay `openai_compatible_relay.rs:1444-1517` 对 POST 429/5xx 无幂等键重试（双重计费风险）；全量管道路径正确（仅 GET/HEAD/OPTIONS 重试）。
- **HIGH-溢出**：`admin_ip_rate_limit.rs:270-285` `amount * 86_400` 无 checked_mul（debug panic/release 回绕绕过封顶）。
- **MEDIUM**：`next_recharge_package_sequence` 用 `SELECT MAX(external_id)+1`（违反项目自身禁 MAX+1 规则，并发重复）；`admin_chain_policy_store.rs:51-52,117-166` DB 错误 `.ok().flatten()` 吞成"无策略"（fail-open）；PATCH 读全量→内存合并→整文档覆盖无事务（并发丢字段，6 处）；`app_chat_store.rs:1361-1366` streaming 完成路径普通减法可把 token 总计驱动为负；`admin_catalog_store.rs` 多写非事务 + `load_category` 只扫前 200 行 → 写入后读 404；`dashboard_overview_read_store.rs:191-233` 7 条独立查询无快照事务。
- **MEDIUM-错误泄漏（系统性约 20 处）**：handler 拼 `sqlx::Error` 原文进响应（`redacted_store_error` 未全量使用）。
- **MEDIUM-指标**：`metrics.rs:170-177` `/metrics` 无 token 放行；`health.rs:9-43` readyz 无注册检查返回 200。
- **MEDIUM-int64**：ports 层约 30 个 i64 字段以 JSON number 序列化（违反 §13.6，浏览器 >2^53 丢精度）。
- **MEDIUM**：store 层 LIMIT/OFFSET 未钳制（负数 page_size 等价 LIMIT ALL，仅 HTTP 层有上限）；SSE 中断不写 `event:error` 帧（客户端无法区分）；adapter 错误体前 500 字符反射 + 脱敏只覆盖 sk-/sp-/Bearer（`x-api-key`、`AIza…` 不掩码）；`mask_ip_target` 恒等函数（声称脱敏实际未脱敏）；`locale.rs` >64KiB 响应体被 `Body::empty()` 替换（错误细节丢失）。

### 7.5 结论
核心调用/计费/Chat/HA 主链路工程质量高、与文档一致（fencing 租约、FOR UPDATE 序号、容量护栏、REPEATABLE READ 分析、Redis 必需、无服务端 SQLite 全部落实）；**商业化前关键风险集中在：支付时间戳 CRITICAL、管理配置边界与 legacy 回退路径的 HIGH 安全缺口、多节点降级路径的静默失效、IP 安全控制因 ConnectInfo 缺失而失效**。修复 CRITICAL + 全部 HIGH 后主链路具备进入 production hardening 的基础；负载/内存/恢复证据仍按 PRD 补齐。

---

## 8. 数据库审计（本人验证；子代理 2 补充并入）

### 8.1 PostgreSQL（权威引擎）——高质量基线
- 62 表 / 132 索引 / 26 FK / CHECK 约束齐全；复合 FK 带租户作用域（`0001_cloudrouter_baseline.sql`）；迁移 0015-0028 成对 up/down、带用途注释与可逆标记；0022 修 NULL-distinct 并发竞态（`conversation_id` 等 NOT NULL + 作用域唯一索引兜底）。
- 事务：计费批量单事务 + ON CONFLICT 幂等键（`gateway_usage_recorder.rs:212-259`）；Chat 锁行分配序号；分析单 REPEATABLE READ 快照事务（子代理 4 核实）。
- 连接池：acquire_timeout 10s、max_connections 16（桌面 8）；就绪门含 3 manifest 表清单 + 13 关键列 + 9 关键索引 + runtime ID 租约 + Redis（`pool.rs:158-320`）。
- 索引覆盖：计量表（tenant+org+started_at 变体 7 个）、会话/用量/结算均有专用索引；Chat 表作用域唯一索引齐全（`pool.rs:45-55` 就绪门强制）。

### 8.2 SQLite——未实现（与共享库能力对比）
- **共享库有完整实现但本仓未启用**：`../sdkwork-database/crates/sdkwork-database-sqlx/src/sqlite.rs` 提供生产级 SQLite 池（WAL、busy_timeout、foreign_keys、mmap、decimal 函数注册），`any.rs` 提供 AnyPool。**但 cloudrouter 仓从未启用 `sqlite` feature**（全仓 Cargo.toml grep = 0），无任何 `SqlitePool` 构造点，所有运行路径强制 PostgreSQL（见 §2.1 证据链）。
- 结论：SQLite 在**平台层可用**、在**本应用层未实现**；本仓的 SQLite 配置面/死脚本/文档声称属于虚假实现，需清理或真实接线。

### 8.3 数据库层问题（子代理 2 完整报告并入 + 本人复核）

**CRITICAL-1（本人复核确认）：主 baseline 缺失结算三列 → 结算 worker 在全新安装被静默禁用**
- 根 baseline `0001_cloudrouter_baseline.sql` 的 `ai_metering_usage`（:460-506）只有 `settlement_status`/`settlement_id`/`pricing_snapshot`，**缺 `settled_at`/`failure_code`/`failure_message`**（grep `settled_at` 全 baseline 0 命中）。
- 结算三列**只存在于未接线的 ai-metering 模块 baseline**（`database/modules/ai-metering/ddl/baseline/postgres/0001_ai_metering_baseline.sql:80-82`）。
- 结算 store SQL 引用这三列（`usage_settlement_store.rs:221` `settled_at IS NULL`、`:314-322` 写 failure_code/failure_message）→ 全新安装上必失败。
- **静默禁用路径**：`edge-runtime/runtime.rs:2300-2324` `maybe_spawn_postgres_usage_settlement_worker` 在 `postgres_usage_settlement_schema_ready`（pool.rs:370-377 校验 5 列）失败时仅 `tracing::warn!` 后 `return Ok(None)`——**启用状态下结算 worker 静默不启动**，计费/结算永不发生（收入静默丢失）。修复：将结算三列并入根 baseline 或接线 ai-metering 模块，并把 schema 缺失改为启动失败（fail-closed）。

**CRITICAL-2（本人复核确认）：ai-metering 模块未接线 → 其 baseline/迁移永不执行**
- 根 manifest `database/database.manifest.json` 的 `modules` 仅 `["gateway-iam","operations"]`，**不含 ai-metering**；全仓仅 ai-metering 自身 manifest 引用自己。
- ai-metering `migrations/postgres/` 目录为空（仅 README）；其 baseline（含结算三列）不参与 migrator 生命周期。
- 后果：`ai_metering_usage`/`ai_metering_request_trace` 由根 baseline 创建（缺结算列），模块 baseline 永不执行 → 与 CRITICAL-1 叠加构成结算链路断裂。修复：根 manifest 声明 ai-metering 模块（或合并其 DDL 进根 baseline）并消除双 baseline 漂移。

**CRITICAL-3**：SQLite 路径不可运行（见 §2.1，与子代理判定一致——子代理指出官方自审计 `isImplemented: false` 佐证）。

**HIGH（子代理 2）**：
- 内存路由目录全量快照（含 API key 明文驻留内存，`queries/snapshot.rs:1103` `key_secret_plaintext`；`load_upstream_account_routes` 巨型递归 CTE）——大规模租户下 OOM 风险（见 §7.3 扩展性项，交叉确认）。
- baseline↔migration↔contract 漂移（`database_contract_materializer --check` 5 文件 stale 实测）。
- usage logs 高流量表 OFFSET+全量 COUNT（见 §4 CRITICAL）。
- **迁移折叠不完整**（本人复核）：baseline 只折叠了 0024（`protocols` 列 :1156）/0028（`default_base_url` :1152），**0020/0025/0026/0027 未折叠**（`is_default`/model allowlist/endpoint vendors 全 0 命中）；`0019` 迁移用 `organization_id TEXT NOT NULL DEFAULT '0'` 加列，与 baseline 的 `BIGINT` 契约类型冲突（:12 等）。
- **官方自审计佐证（`generated/audit/standard-alignment-facts.json`）**：`postgresPairs.complete: false`（0002-0010 等缺 down、down 文件无 CLI 消费者/无 rollback）；`tableConsistency.counts: ddl=53/registry=38/schemaYaml=0, consistent: false`（P0 项 pending）；高流量表未分区（TECH-35 策略已文档化，P0 pending）；**Redis HA `isHa: false`**（replicas=3 + sentinel 声明但 `hasReplicaConfiguration: false`、`runtimeSupportsSentinel: false`、`hasWritablePrimaryDiscovery: false`，P0 pending）——部署级 HA 实际未闭合。

**MEDIUM（子代理 2）**：
- 迁移 `0015` 缺 down（0019 已声明 forward-fix 非缺陷）；`next_recharge_package_sequence` MAX+1；store 层 LIMIT 未钳制；`admin_catalog_store` 多写非事务；dashboard 7 查询无快照事务；租约分配器运行时 DDL（文档自认 P0）。

**LOW（子代理 2）**：若干行解码吞错、LIKE 未转义、mask_ip_target 恒等、自定义 CSS 存储型 XSS 面等（与 §7 后端核心 LOW 交叉）。

### 8.4 数据库总体评价（含子代理 2 结论）
PostgreSQL 完成度约 **85-90%**：设计成熟（schema 契约链、62 表/132+ 索引/26 FK、事务幂等、就绪门），但存在 baseline↔migration↔contract 漂移、迁移折叠不完整、0019 TEXT/BIGINT 类型冲突与**结算链路断裂（CRITICAL）**。SQLite 完成度约 **10-15%**：属配置/文档层变体而非可运行数据路径——**项目官方自审计 `standard-alignment-facts.json` 亦确认 `clientLocalSqlite.isImplemented: false`、`p0-client-local-sqlite-runtime` 状态 pending**（与 §2.1 一致）。大规模高并发设计基本满足，但**内存路由目录全量快照 OOM 风险**（含 API key 明文驻留内存）与**结算默认不可用**是两个阻塞项；官方 P0 清单另有 4 项 pending：client-local-sqlite、redis-ha（isHa=false）、表计数一致性、高流量表分区。未覆盖项（子代理标注）：两个路由 crate 的 worker 完整 SQL 体未穷尽、未做真实 DB 运行验证、外部仓库不在范围。

---

## 9. 商业化落地能力评估（结论：**不具备**，差距清单）

### 直接证据
1. `sdkwork.app.config.json`：`publish.preLaunch: true`、`status: DRAFT`——官方自认未发布。
2. `REQ-2026-0001 Commercial Production Readiness`（status: in-progress）：明确列出未闭合的 P0 阻塞项。
3. `REVIEW-20260714`：**"The application is not eligible for production deployment, high-availability claims, commercial availability claims, or client-local SQLite claims."**
4. **官方自审计 `generated/audit/standard-alignment-facts.json` 的 p0Status：11 项 P0 中 4 项 pending**——client-local-sqlite-runtime（isImplemented=false）、redis-ha-manifest（isHa=false，sentinel 声明但不工作）、table-count-consistency（ddl 53/registry 38/schemaYaml 0 漂移）、high-traffic-table-partition（高流量表未分区）。
5. 4+1 项验证门 FAIL（int64 契约 69 字段、架构守卫、schema 门、extensions drift、db contract materializer）。
6. 6 项 CRITICAL（安全 3 + 数据库 2 + 计费 1 已修复）。
7. 灾备计划自认 RTO/RPO 未建立、备份恢复未演练；负载/soak/多副本/故障注入证据缺失（PRD 成功指标全部为"需证据"状态）。
8. 产品截图全为占位符；README 声称 release 0.3.0 但契约链未提交（108 文件）。

### 商业化差距矩阵（对照 REQ-2026-0001 验收标准）

| 领域 | 差距 | 优先级 |
|---|---|---|
| 密钥安全 | API key 明文默认存储+列表回显；生产未强制 ciphertext | P0 |
| 支付授权 | 后端零细粒度授权；凭据明文读取；无 step-up | P0 |
| 契约链 | open-api int64 三方矛盾；Chat/挂载路由无契约；stamp drift | P0 |
| 分页 | usage logs/records 高流量表 OFFSET | P0 |
| 租户隔离 | chain policy IDOR、GLOBAL 遮蔽、平台行可写、retention 越权 | P0 |
| token | 共享签名密钥回退；无服务端撤销；localStorage 明文 | P0 |
| 运行时 | 租约注册 DDL 违反最小权限（TECH_ARCHITECTURE 自认） | P0 |
| 高可用 | 无生产负载/soak/故障注入/备份恢复/多副本证据；Redis 队列容量策略未批 | P0 |
| 交付 | 4 门红 + 108 文件未提交（半同步态） | P0 |
| 前端 | localStorage token、id 精度往返、无虚拟滚动、vite resolver 违规 | P1 |
| 质量 | 无 ESLint、tsconfig 严格性未拉满 | P1 |

---

## 10. 改进方案（按优先级）

### P0（发布阻断，立即修复）
0. **支付时间戳**：`payment_aggregate.rs` 6 处硬编码 `requested_at` 改为 `current_timestamp_string()`（错误计费）。✅ **已修复**
0a. **结算链路断裂（新确认 CRITICAL）**：根 baseline 补 `settled_at`/`failure_code`/`failure_message` 三列（或接线 ai-metering 模块）；`maybe_spawn_postgres_usage_settlement_worker` 的 schema 缺失从 warn+禁用改为启动失败（fail-closed）；消除根 baseline 与 ai-metering baseline 双源漂移。
1. **密钥安全**：生产 profile 强制 `SDKWORK_CLOUDROUTER_API_KEY_SECRET_STORAGE=ciphertext` 并拒绝 plaintext 启动；App 列表/详情契约移除 `rawKey`（仅 create 一次性返回）；快照停止装载明文列；存量行迁移密文。
2. **支付授权**（跨 sdkwork-payment）：route manifest 按 OpenAPI `x-sdkwork-permission` 补 `.with_required_permission(...)`；凭据读取独立权限码 + step-up；补录 delete 权限目录。
3. **open-api int64**：验证器豁免 external 操作或生成器保留 number；统一 OpenAPI/SDK/Rust 三方类型；重生成 10 语言 SDK。
4. **分页**：usage logs/records/notifications 改 keyset cursor + OpenAPI mode=cursor；消除 `COUNT(*) OVER()` 全量计数。
5. **租户隔离**：chain policy/service node/retention/catalog/transaction center 补租户+平台权限区分；拒绝租户写 GLOBAL scope。
6. **契约链**：Chat 等已挂载端点补 OpenAPI + SDK；或从生产组合摘除；重跑 sync `--apply` stamp；提交 108 文件变更集；4 门转绿。
7. **token**：移除共享签名密钥回退（fail closed）；验证 kid 属主=claims.tenant；前端 token 迁 httpOnly cookie/safeStorage。

### P1（上线前）
8. 补契约-实现一致性：resource_catalog DTO 改 serde_int64；PageInfo.totalItems 补 format+marker。
9. 错误脱敏：8 条 5000 链统一 `redact_error_message`。
10. API key 管理端点速率限制；撤销热路径黑名单。
11. SQLite 死命令/死配置清理（移除 dev:desktop:sqlite 与桌面 SQLite TOML 声称）或真实实现客户端模块。
12. InMemoryRuntimeStreamBus 清理过期条目；CircuitBreaker 分片锁。
13. 前端：memberships id 全 string；Rankings/引用映射按 §11 登记或改服务端聚合；vite resolver 合规化；ESLint + tsconfig 严格旗标。

### P2（证据与治理）
14. 生产负载/soak/故障注入/备份恢复/多副本证据（PRD 成功指标逐一闭合）。
15. 租约注册 DDL 移交 migrator（最小权限运行时角色）。
16. Redis 队列容量/保留/恢复策略批审；灾备演练。
17. 产品截图/文档补全；发布流程原子化（重生成→stamp→materialize→commit→门绿→打包）。

---

## 11. 附：验证命令记录

```text
node sdkwork-specs/tools/check-pagination.mjs --workspace .            → PASS
node sdkwork-specs/tools/check-api-response-envelope.mjs --workspace . → PASS
node sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .→ FAIL (201 int64)
node sdkwork-specs/tools/check-component-port-bindings.mjs --root .    → PASS
node sdkwork-specs/tools/check-permission-composition.mjs --root .     → PASS
python -B -m tools.cloudrouter_sdk_guardian                             → PASS
pnpm api:materialize:check                                              → PASS
node tools/sync-cloudrouter-api-standard-extensions.mjs --check        → FAIL (4 files)
python -B -m tools.rust_backend_architecture_guardian                   → FAIL
python -B -m tools.schema_quality_gate                                  → FAIL
```
