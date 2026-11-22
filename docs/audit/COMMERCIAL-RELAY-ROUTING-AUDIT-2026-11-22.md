# 商业化中转站路由审计与加固（2026-11-22）

## 1. 背景

2026-11-22 生产环境 `POST /v1/chat/completions` 全量失败，对外暴露为
`code=50001 / status=501` 的通用错误。定位过程中确认：单实例告警全绿、日志
只有一条降级 WARN，实际原因是路由形态在进程启动期被一次性锁定，与数据库
配置无关。本文记录该链路的根因、已实施修复、已验证缺陷与后续路线。

审计范围：`sdkwork-cloudrouter` 的开放面调用管道（`/v1/*`）、路由选择、
上游密钥解析、分发与记账；不含前端与支付。

## 2. 结论摘要

| 类别 | 状态 |
| --- | --- |
| 启动期路由形态锁定（本次事故根因） | 已修复，含单测 |
| 缺失转发通道被报成 501 且无日志 | 已修复（503 + error 日志） |
| 中转站端点指向自身造成的环回 | 已修复（分发前拒绝），含单测 |
| 上游错误体回显平台上游密钥 | 已修复（非 2xx 脱敏），含单测 |
| POST 请求在账号失效时不做故障转移 | 已修复（仅"执行前拒绝"状态转移），含单测 |
| 记账钩子失败覆盖厂商 200 | 已修复，含单测 |
| 非流式并发被内存预算钳到 2 | 已修复（按声明大小预扣），含单测 |
| 定价解析每请求重复上百次全扫 | 待修复（已定位） |
| `supplier_type=official|relay` 未参与运行时决策 | 已修复，含单测 |
| 中转站模型名改写缺省错误 | 已修复（按 supplier_type 寻址），含单测 |
| 中转站 LLM 协议组未开箱绑定 | 设计如此：由后台按声明协议派生（运营动作） |
| `least_cost` 用静态系数而非真实采购价 | 已修复（按采购价排序，混币回退），含单测 |
| 非幂等 POST 在 relay 层被静默重试 | 已修复（仅 429 可重放），含测试 |
| 账号/供应商 Base URL 写入无出站校验 | 已修复（配置期拒绝 + 分发期复检），含单测 |
| 托管密钥引用可跨账号解析 | 已修复（归属校验），含单测 |
| Routing 错误 502/503 口径分裂 | 已修复（统一 503），含单测 |
| `on_error` 失败被静默吞掉 | 已修复（逐钩子 error 日志） |

## 3. 事故根因

`crates/sdkwork-cloudrouter-edge-runtime/src/runtime.rs`
`openai_runtime_relay_secret_resolver` 在启动快照没有任何托管密钥时返回
`None`；`router_with_database_runtime_routes` 用
`secret_resolver_configured = provider_secret_resolver.is_some()` 决定挂载
"计量调用管道"还是 `build_openai_runtime_relays` 的静态 relay 路由。

而种子数据把所有上游账号初始化为 `disabled`，全新部署启动快照因此必然为空：

1. 启动 → 0 条可用账号路由 → 0 条托管密钥 → 静态 relay 路由；
2. 静态 relay 无 relay 配置 → `/v1/chat/completions` 命中
   `streaming_relay_not_configured` / `provider_relay_not_configured`；
3. 运维启用账号并上传凭据后，15s 目录刷新只更新**数据**，不重建**路由**，
   因此线上仍返回 501，直到进程重启；
4. `sdkwork-web-core` 的 `normalize_problem_response` 把该 501 归一化为
   `50001`，`client_safe_detail` 再把 detail 替换为 "An internal error
   occurred"，可诊断信息全部丢失。

该链路与 ADR-20260728「`ai_upstream_account_credential` 是唯一密钥权威」
相冲突：密钥是否存在是**数据状态**，不应成为**部署形态**的选择依据。

## 4. 已验证缺陷

### 4.1 已修复

**A. 启动期路由形态锁定**
- 位置：`runtime.rs::openai_runtime_relay_secret_resolver`
- 修复：恒构造 resolver（空集合也 `Some`）；数据库运行期因此恒挂计量管道。
- 影响：新装/清库后启用账号可在下一个刷新周期生效，无需重启；凭据缺失降级为
  单请求的精确错误，而不是整个开放面 501。

**B. 转发通道缺失的错误语义**
- 位置：`services/.../api/openai_chat.rs`（streaming / 非 streaming 两处）
- 修复：`501 Not Implemented` → `503 Service Unavailable`，并补
  `tracing::error!`（原先只写 request trace，`RUST_LOG=info` 下不可见）。

**C. 中转站自环**
- 位置：`services/.../application/invocation/provider_request.rs`
- 修复：上游 base URL 的 host 等于本次请求的 `Host` / `x-forwarded-host`
  时拒绝分发（`Routing` 错误）。种子里的 `birdcoder-global`、
  `sdkwork-global` 就指向本网关公网域名，启用即递归。
- 测试：`upstream_targeting_the_serving_gateway_is_detected`、
  `unrelated_upstream_hosts_are_not_rejected`。

**D. 上游错误体回显平台密钥**
- 位置：`services/.../api/openai_relay_execution.rs::guarded_openai_json_response`
- 事实：计量管道已在 `invocation_http` 对非 2xx 响应体脱敏，静态 relay 路径
  原样回传，供应商拒绝时回显的 `sk-...`/`Bearer ...` 会到达租户。
- 修复：非 2xx 时对 JSON 字符串值递归脱敏，结构与非敏感文案不变。
- 测试：`provider_error_bodies_do_not_leak_upstream_credentials`。

**E. POST 账号失效不做故障转移**
- 位置：`services/.../application/invocation/dispatch_executor.rs`
- 事实：`should_try_next` 要求 `replay_is_safe`，POST 因此只在"请求未发出"时
  换候选；上游 401/403/404/429 时直接失败，多账号池形同虚设。
- 修复：新增"执行前拒绝"判定（401/402/403/404/429）允许跨候选转移；
  5xx/超时仍保持单次，避免上游重复执行与重复计费。
- 测试：`non_idempotent_chat_post_fails_over_after_dead_credential`、
  `..._after_rate_limit`、`..._does_not_replay_after_server_error`。

**F. 既定契约与测试漂移（回归中发现）**
- 位置：`tests/invocation_dispatch.rs`
- 事实：`retries_rebuild_provider_request_and_secret_for_each_attempt` 在
  基线 HEAD 即失败：实现按"同一请求内复用已解析凭据、401/403 才清除重解析"
  的既定注释工作，测试却断言每次尝试换新密钥。
- 处理：按代码内契约改写为 `retries_reuse_the_same_credential_for_the_same_account`，
  并新增跨候选凭据轮换用例 `retries_keep_the_same_credential_until_the_provider_rejects_it`。

**G. 记账钩子失败覆盖厂商 200（已修复）**
- 位置：`pipeline.rs::finish_after`
- 事实：`after` 钩子按注册逆序执行，记账/遥测/粘性钩子晚于响应规范化注册，
  因此先失败；`finish_after` 立即返回，`normalized_response` 仍为 `None`，
  HTTP 层合成 502，厂商已成功的响应被丢弃。
- 修复：`InvocationInterceptor::finalizes_response()` 标记 + `finish_after`
  在钩子失败时先驱动响应规范化再返回错误；`execute()` 与
  `execute_for_response()` 统一走同一条 after 链。
- 测试：`accounting_failure_keeps_the_successful_provider_response`。

**H. 非流式并发被内存预算钳到 2（已修复）**
- 位置：`response_memory_budget.rs`、`invocation_dispatcher.rs`
- 事实：预扣恒为 `响应上限 × 4`（默认 256 MiB），默认 512 MiB 预算只能容纳
  2 个并发非流式响应，第 3 个立即 `Saturated` → 503。
- 修复：新增 `try_reserve_for_declared`，按上游 `content-length` 预扣
  （1 MiB 下限、响应上限封顶）；无声明长度时仍按上限 × 4。
- 测试：`declared_payload_sizes_get_proportional_reservations`。

**J. `supplier_type` 未参与运行时决策（已修复）**
- 位置：快照 `load_upstream_supplier_model_access`、`UpstreamAccountRouteCatalog::supplier_type`、
  `route_planning.rs::default_provider_model`、`provider_request.rs::normalized_provider_model`
- 修复：快照同行加载 `supplier_type` 并建索引；候选携带类型；官方供应商收到
  vendor-native id（`deepseek-flash`），中转站收到全限定 catalog key
  （`deepseek/deepseek-flash`）；显式模型映射规则优先于两者。
- 测试：`provider_model_normalization_covers_every_separator_spelling`、
  `relay_suppliers_keep_the_qualified_catalog_key`。

### 4.2 待修复（已定位，附证据）

**I. 定价解析每请求重复上百次全扫**
`upstream_route_selector.rs::ensure_route_is_priced` 对每个候选的每条 route
逐 meter 做多次 `visible_model_prices`（双遍 + 逐行克隆），chat 复合计量
3 档；选中后 preflight 与 finalization 再各算一遍。另
`catalog.rs` 的 `list_upstream_account_routes` 返回 `to_vec()`，每次深拷贝
整张账号路由表，而快照本身已有 `Arc<[..]>`。

**K. 中转站 chat 授权的真实形态（设计如此，非缺陷）**
生产库 12 条 relay supplier binding 全部指向媒体资源组
（`relay.bytedance.media`、`relay.cn/global.visual_generation`）。种子注释
（`ai_routing_seed.rs` 第 44x 行）明确：LLM 面已标准化，**不为中转站另建 LLM
资源组**，而是复用官方供应商已有的协议面资源组，授权由中转站声明的
`protocols` 经后台映射（`llmProtocols.ts`）派生。因此"开箱即用"的中转站
chat 需要运维在供应商资源页绑定协议组（`/upstream_suppliers/{id}/resources`），
属于产品/运营决策而非代码缺陷。

**L. `least_cost` 用静态系数（已修复）**
- 位置：`upstream_route_selector.rs`（`resolve_route_procurement_cost`、
  `order_routes_by_procurement_cost`、`candidate_uses_least_cost`）
- 修复：定价门在判定"可计费"的同时返回该候选的采购单价（复用同一次
  `PriceService::resolve`，不新增解析）；`least_cost` 分组按采购价稳定排序，
  无采购价的候选保持在有价候选之后，混币种（无汇率）时保持原顺序；客户计费
  仍不依赖采购价。
- 测试：`cheapest_procurement_price_wins_and_unpriced_candidates_trail`、
  `candidates_share_the_planner_order_when_no_procurement_price_exists`、
  `mixed_currency_prices_are_not_ranked`。

**O. 非幂等 POST 在 relay 层被静默重试（已修复）**
- 位置：`infrastructure/provider/openai_compatible_relay.rs::send_openai_json_with_runtime`
- 事实：请求级重试策略默认 2 次，`is_retryable_status` 覆盖 408/409/425/5xx：
  上游可能已执行生成并被计费，重发同一 POST 会让平台付两次而调用方只收到一个
  响应；同一缺陷在调用管道侧早已用 `request_allows_replay` 规避，两条路径语义
  不一致。
- 修复：仅 `429`（生成前拒绝，必然未执行）允许重放；其余可重试状态原样返回，
  由路由层换账号（那是另一个上游请求）。
- 测试：`openai_compatible_relay_does_not_replay_a_non_idempotent_post_after_5xx`、
  `openai_compatible_relay_replays_a_rate_limited_post_within_the_configured_attempts`。

**P. 账号/供应商 Base URL 写入无出站边界校验（已修复）**
- 位置：`admin_upstream_store/shared.rs::validate_upstream_base_url`，
  账号 `validate_account_command` 与供应商 `save` 调用
- 事实：端点写入有 HTTPS/userinfo/query 校验，但账号 `default_base_url` 与
  `protocols[].baseUrl`、供应商 `default_base_url` 完全未校验，可写入
  `http://127.0.0.1`、`169.254.169.254` 等；运行期虽会二次拦截，但配置已落库。
- 修复：配置期按 Production 出站策略校验（HTTPS、禁 userinfo/fragment/query、
  禁内网与 IP 字面量），与既有 webhook 校验同源；本地开发上游走显式的
  development-only 构造器，不经过后台 API。
- 测试：`accepts_public_https_upstreams`、`rejects_urls_that_breach_the_egress_boundary`。

**Q. 托管密钥引用无归属校验（已修复）**
- 位置：`ports/provider_secret_resolver.rs`（`managed_credential_id`、
  `ensure_managed_secret_belongs_to_account`），`secrets.rs` 与
  `dispatch_executor.rs` 两条解析路径均调用
- 事实：resolver 是跨租户共享的 `secret_ref → 明文` 映射；路由由目录、粘性绑定、
  故障转移候选等多个快照拼装，陈旧的 `secret_ref` 可能解析到**另一个账号/租户**的
  凭据（当前无用户可控路径，属契约缺陷）。
- 修复：托管引用（`managed://upstream-account-credential/<id>`）必须与所选中账号的
  `credential_id` 一致，否则拒绝；外部引用（`vault://…`、环境注入）不受此约束。
- 测试：`managed_reference_must_name_the_selected_account_credential`、
  `external_references_are_not_governed_by_the_managed_invariant`。

**R. Routing 错误 502/503 口径分裂（已修复）**
- 位置：`response_normalization.rs::status_code_for_error`
- 事实：管道把 `Routing` 映射为 502，而 HTTP 层与用量/轨迹记录同一失败为 503，
  客户端看到的与事故报告记录的不一致。
- 修复：`Routing` 统一为 503（容量/路由不可用，可重试）；上游故障仍为 502。
- 测试：`routing_failures_map_to_service_unavailable`。

**S. `on_error` 失败被静默吞掉（已修复）**
- 位置：`pipeline.rs::notify_error`
- 事实：`let _ = ... .on_error(...)` 让释放预扣、退款、清租约的失败完全无日志，
  资金/配额会冻结到 TTL 结束且无告警。
- 修复：逐钩子记录 `error`（含拦截器名、pipeline 错误码、request_id）。

**M. `credential_rotation` 只被搬运，未被消费**
`account.credential_rotation` 从快照一路带到 `InvocationAccount`，但
dispatch 不读取，按策略轮换（per_request/per_attempt）实际未生效。

**N. 诊断文案误导**
503 文案中的 `model_routes_loaded=0` 是恒真值（`loader.rs` 明确
`model_upstream_routes: Vec::new()`，模型路由由 account route 推导）。

### 4.3 审计提出、待复核

- 流式下游断开时 `DownstreamStreamState::drop` 抢先以
  `partial_usage: None` 完成，导致已产生用量丢失、预扣冻结至 TTL。
- 账号 `timeout_ms` 被当作整条流的总时限，长流在第 30 秒被截断。
- 流中失败对熔断/健康不可见（收到响应头即记成功）。
- 粘性绑定无 `expires_at`，命中后单一候选，熔断打开即 503 且不回退常规路由。
- 2xx 无 `usage` 时非流式静默零计费。
- API Key pepper 不可轮换；`secret_ref` 无租户维度；429 计入全局熔断。

## 5. 后续路线

1. ~~**记账与响应正确性**：修正 `finish_after`/`ResponseNormalization` 顺序，
   保证厂商 2xx 不被记账失败覆盖~~（已完成，见 4.1-G）。
2. ~~**容量（内存预扣）**：按声明大小预扣，消除"默认 2 并发"~~（已完成，见 4.1-H）。
   剩余：定价解析请求内 memo、`list_upstream_account_routes` 返回 `Arc`
   （消费者位于 `sdkwork-models`，需跨仓协同）。
3. **relay 语义**：快照补 `supplier_type`，按类型决定默认 provider model；
   补 `ai_model_mapping_rule` 后台 CRUD；新增 relay chat 资源组与 supplier
   binding；`least_cost` 改为按真实采购价排序。
4. **安全**：POST 跨账号重试的幂等键约束；账号 `default_base_url` 写入校验；
   凭据解析加租户维度；pepper key ring。
5. **数据与发布**：种子修订、采购价导入、`route_explain` 逐组验证、通过
   `bin/` 入口发布并回归。

## 6. 验证记录

构建环境：本机 Windows MSVC 链接器无法在临时目录创建文件（`LNK1104`），
因此全部验证在 WSL（Ubuntu 22.04，rustc 1.99.1）执行：

```bash
cargo check -p sdkwork-cloudrouter-router-service -p sdkwork-cloudrouter-edge-runtime
cargo test  -p sdkwork-cloudrouter-router-service --lib                        # 757 passed
cargo test  -p sdkwork-cloudrouter-router-service --test invocation_dispatch   # 31 passed
cargo test  -p sdkwork-cloudrouter-router-service --test invocation_pipeline   # 4 passed
cargo test  -p sdkwork-cloudrouter-router-service --test upstream_route_selector # 61 passed
cargo test  -p sdkwork-cloudrouter-router-service --test sql_pricing_catalog_contract # 14 passed
cargo test  -p sdkwork-cloudrouter-router-service --test app_runtime_api       # 58 passed
cargo test  -p sdkwork-cloudrouter-router-service --test routing_decision_log_recording # 5 passed
cargo test  -p sdkwork-cloudrouter-router-service --test openai_chat_api       # 42 passed
cargo test  -p sdkwork-cloudrouter-router-service --test openai_responses_api  # 12 passed
cargo test  -p sdkwork-cloudrouter-router-service --test openai_embeddings_api # 9 passed
cargo test  -p sdkwork-cloudrouter-edge-runtime  --lib                         # 109 passed
```

## 7. 风险提示

- 会话期间 `main` 被外部进程推进了 3 个提交，工作树改动被扫入其中一条
  OAuth 重构提交；本文件所列改动均已在工作树复核，提交归属需人工确认。
- 未对生产环境执行任何变更；发布须经 `bin/` 入口并显式授权。
