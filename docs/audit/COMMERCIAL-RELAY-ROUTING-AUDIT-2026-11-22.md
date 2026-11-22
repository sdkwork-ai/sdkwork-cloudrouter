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
| 流式下游取消丢失已产生用量 | 已修复（共享用量累加器），含单测 |
| 账号 `timeout_ms` 被当作流总时限 | 已修复（总时限改用 runtime stream ceiling），含测试 |

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

**T. 流式下游取消丢失已产生用量（已修复）**
- 位置：`crates/sdkwork-cloudrouter-edge-runtime/src/invocation_stream.rs`
- 事实：`DownstreamStreamState::drop` 抢先以 `partial_usage: None` 完成终止态，
  而累加器在 producer 任务里；客户端断开（关标签、Agent 取消、连接复位）时
  producer 正阻塞在上游读取，因此 drop 几乎总是先赢 —— 已产生的 token 不计费，
  预扣冻结到 30 分钟 TTL 才释放。反复取消即成为免单通道。
- 修复：用量累加器改为 producer 与下游共享的 `Arc<Mutex<..>>`，drop 时读取
  当前部分用量并随 `Cancelled` 上报；锁中毒只降级为"缺快照"，不在请求路径 panic。
- 测试：`dropping_the_downstream_body_reports_observed_partial_usage`（单元），
  `invocation_router_bills_partial_usage_when_the_client_disconnects_mid_stream`
  （端到端：读到首帧后断开 body，断言 usage recorder 收到 streaming 事实且
  输出 token 为估算正值、输入 token 由请求体估算补足）。

**U. 账号 `timeout_ms` 被当作流总时限（已修复）**
- 位置：`invocation_stream.rs::InvocationStreamTimeouts`、`invocation_http.rs`
- 事实：`ai_upstream_account.timeout_ms` 语义是"等待上游响应头"的超时，却被
  `from_account_timeout` 当成整条流的总时限。配了 30 s 账号超时的账号，任何长
  Agent/编码流都会在第 30 秒被硬截断（`stage: "total"`），而运行时给流的预算是
  30 分钟。
- 修复：流时限只取运行时 stream ceiling（`for_stream_ceiling`），账号超时仅继续
  约束响应头等待；`DeferredStreamInvocation::stream_timeout()` 随之删除，
  避免再被误用。
- 测试：`stream_ceiling_sets_the_total_deadline`、
  `per_frame_deadlines_never_exceed_the_ceiling`，以及
  `invocation_router_times_out_an_unpolled_stream_and_releases_idempotency`
  （改为用 `stream_response_timeout` 配置短 ceiling 来验证"未消费流到期释放幂等锁"）。

**M. `credential_rotation` 只被搬运，未被消费**
`account.credential_rotation` 从快照一路带到 `InvocationAccount`，但
dispatch 不读取，按策略轮换（per_request/per_attempt）实际未生效。

**N. 诊断文案误导**
503 文案中的 `model_routes_loaded=0` 是恒真值（`loader.rs` 明确
`model_upstream_routes: Vec::new()`，模型路由由 account route 推导）。

### 4.3 待复核 / 待修复（审计提出）

- 流中失败对熔断/健康不可见（收到响应头即记成功）。
- 粘性绑定无 `expires_at`，命中后单一候选，熔断打开即 503 且不回退常规路由。
- 2xx 无 `usage` 时非流式静默零计费。
- API Key pepper 不可轮换；429 计入全局熔断。
- 请求级总超时分支未记录 attempt（熔断漏记）。
- 指标读 adapter 带内状态而非 effective status；幂等等待窗口过短。

## 5. 后续路线

1. ~~记账与响应正确性~~（4.1-G）、~~内存预扣容量~~（4.1-H）、
   ~~`supplier_type` 寻址~~（4.1-J）、~~`least_cost` 真实比价~~（4.1-L）、
   ~~非幂等 POST 重放~~（4.1-O）、~~Base URL 出站校验~~（4.1-P）、
   ~~托管密钥归属~~（4.1-Q）、~~错误语义与 `on_error` 可观测~~（4.1-R/S）、
   ~~流式取消用量~~（4.1-T）、~~流总时限~~（4.1-U）：已完成。
2. **流生命周期端到端测试**：~~客户端断开的计费闭环~~（已补，见 4.1-T）。
   剩余：超时/上游中断的结算断言（当前由同一 `settle_partial_then_fail` 路径
   覆盖，缺独立用例），以及 precharge hold 释放的余额断言。
3. **剩余正确性**：粘性绑定 `expires_at` 与熔断时回退常规路由；流中失败对
   熔断/健康可见；请求级总超时分支记 attempt；指标读 adapter 带内状态；
   2xx 无 `usage` 时的非流式计费兜底。
4. **剩余安全**：POST 跨账号重试的上游幂等键；API Key pepper key ring。
5. **性能**：定价解析请求内 memo + `visible_model_prices` 索引；
   `list_upstream_account_routes` 返回 `Arc`（消费者在 `sdkwork-models`，需跨仓协同）。
6. **运营与发布**：`ai_model_mapping_rule` 后台 CRUD、relay 协议组绑定、
   采购成本价导入、runbook、经 `bin/` 发布并线上回归。

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
cargo test  -p sdkwork-cloudrouter-edge-runtime  --test invocation_router        # 29 passed
cargo test  -p sdkwork-cloudrouter-edge-runtime  --test openai_chat_route        # 3 passed
cargo test  -p sdkwork-cloudrouter-edge-runtime  --lib                          # 110 passed
```

## 7. 风险提示

- 会话期间 `main` 被外部进程推进了 3 个提交，工作树改动被扫入其中一条
  OAuth 重构提交；本文件所列改动均已在工作树复核，提交归属需人工确认。
- 未对生产环境执行任何变更；发布须经 `bin/` 入口并显式授权。
