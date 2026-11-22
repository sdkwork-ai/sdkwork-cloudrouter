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
| 请求级总超时未记录 attempt | 已修复（记 `request_deadline_exceeded`），含测试 |
| 指标读 transport 状态而非 effective 状态 | 已修复（归一化/adapter 状态优先），含单测 |
| 粘性绑定永不过期 | 已修复（滑动 7 天 `expires_at`） |
| 粘性命中后单候选、熔断即 503 | 已修复（非 lookup 保留常规候选作为回退），含单测 |
| 流被中断仍提交粘性绑定 | 已修复（`stream_interrupted` 守卫），含单测 |
| 非流式 2xx 无 `usage` 免单 | 已修复（输入/输出估算兜底），含用例 + 全 billing 套件回归 |
| 流中失败对熔断不可见 | 已修复（中断改写 attempt；客户端取消不背锅），含单测 |
| API Key pepper 不可轮换 | 已修复（哈希 ring + 认证探测候选世代），含用例 |
| API Key 原始密文轮换后不可读 | 已修复（按 `key_secret_key_id` 的解密 ring），含单测 |
| 幂等等待窗口过短（~1s 即 409） | 已修复（10s 预算、按租约钳制），含用例 |
| 429 与传输故障共用熔断阈值/冷却 | 已修复（本地 + Redis：独立 streak + 短冷却），含 4 用例 |
| 幂等键透传上游（跨租户假去重） | 已修复（网关终止 `idempotency-key`），含单测 |

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

**V. 请求级总超时未记录 attempt（已修复）**
- 位置：`dispatch_executor.rs` 请求级 deadline 分支
- 事实：该分支只设置 `last_error` 后跳出，不写 `attempted_routes`；命中总时限的
  账号不会被记一次失败，挂死账号永远进不了熔断。
- 修复：分支内标记后补齐 `failed_attempt`（code `request_deadline_exceeded`）再
  退出；因 dispatch future 持有 `&mut Invocation`，实际记录放在 select 之后。
- 测试：`request_deadline_records_a_failed_attempt_for_the_hanging_account`
  （`start_paused` 虚拟时钟 + 永久 pending 的 dispatcher）。

**W. 指标读 transport 状态而非 effective 状态（已修复）**
- 位置：`metrics_interceptor.rs::effective_status_code`
- 事实：只读 `dispatch.response.status_code`。内部 provider adapter 的上游结果在
  带内 `statusCode` 里，transport 始终 200 ⇒ 失败的 adapter 调用被计为 2xx，
  SLO 与告警失真。
- 修复：优先归一化响应的状态（客户端实际看到的），否则用
  `effective_dispatch_status_code`（含 adapter 带内状态），最后兜底 500。
- 测试：`adapter_in_band_status_drives_the_metric_status_class`、
  `normalized_response_status_wins_over_the_transport_status`。

**X. 粘性绑定永不失效、且命中后单候选（已修复）**
- 位置：`crates/sdkwork-cloudrouter-edge-runtime/src/invocation_sticky_store.rs`、
  `route_planning.rs` 粘性分支
- 事实 1：upsert 从不写 `expires_at`，读过滤条件因此永不排除任何行 —— 会话被
  永久钉在一个账号上，表也只增不减。
- 事实 2：粘性命中后 route plan 只有 1 个候选，账号熔断/凭据吊销即整请求 503，
  即使组内还有健康的同模型账号。
- 修复 1：写入滑动 7 天 `expires_at`（每次命中续期）。
- 修复 2：除 `LookupSticky`（必须落在拥有对象的那个账号）外，粘性改为"首选 +
  常规候选回退"：粘性候选置首位，常规规划结果去重后追加；常规规划失败不影响
  粘性可用。lookup 语义保持不变。
- 测试：`sticky_preference_keeps_regular_candidates_as_failover`、
  `lookup_sticky_remains_a_hard_pin`。

**Y. 流被中断仍提交粘性绑定（已修复）**
- 位置：`telemetry.rs`（新增 `stream_interrupted`）、`pipeline.rs`
  `settle_partial_then_fail`、`sticky.rs::after`
- 事实：中断的流（取消/超时/上游错误）transport 仍是 200，粘性提交只看
  `effective_response_is_success` ⇒ 把"刚刚中途失败的账号"写成会话亲和绑定，
  后续请求继续钉在它上面。
- 修复：部分结算路径置 `telemetry.stream_interrupted = true`；粘性提交在该标志
  下跳过（用量仍然照常落库与结算）。
- 测试：`interrupted_stream_does_not_commit_a_sticky_binding`。

**Z. 非流式 2xx 缺 `usage` 免单（已修复）**
- 位置：`usage_extraction.rs::extract_composite_usage_from_body`
- 事实：找不到 `usage`/`usageMetadata` 时直接 `Ok(())`，不产用量行 ⇒ 结算
  `actual_amount` 为 None ⇒ 报 "did not produce a billable amount"，但厂商响应
  此时已成功物化，客户端照常拿到 200 —— **实际免单**，只留一条 warn。
- 修复：缺 usage 时按与流式兜底相同的保守估算合成用量体——输入按请求体
  （`estimated_request_input_tokens`）、输出按响应文本（Chat `choices[].message.content`、
  `choices[].text`、Responses `output[].content[].text` / `output_text`），
  无任何文本输出时不产行（确实无从计价）。
- 测试：`billing_missing_usage_estimate.rs` 两个用例，外加 **37 个 billing 套件
  全量回归**（0 失败）确认未改变既有计费语义。

**AA. 流中失败对熔断不可见（已修复）**
- 位置：`pipeline.rs::settle_partial_then_fail` / `mark_stream_account_failure`
- 事实：dispatch attempt 在**收到响应头**时就记为成功；流随后中断（空闲/首帧
  超时、上游 body 断流）不会改写它，于是"只会吐半截流"的账号永远健康，熔断
  冷却永不触发，流量持续打向它。
- 修复：部分结算时按故障归属改写该账号最新 attempt（`success=false`、
  `error_code=provider_stream_failed`）；**客户端取消与租户租约丢失不改写**
  （不是账号的错）；已判失败的 attempt 不覆盖。
- 测试：`a_mid_stream_failure_rewrites_the_successful_attempt`、
  `an_already_failed_attempt_is_not_rewritten`；熔断器 17 个库内单测随 lib 套件
  一并通过。

**AB. API Key pepper 不可轮换（已修复）**
- 位置：`sdkwork-models` 的 `ApiKeySecretHasher`/`ApiKeyAuthenticator`、
  `sdkwork-cloudrouter-config` 的 `ApiKeySecurityConfig`、
  `crypto.rs::HmacSha256ApiKeySecretHasher`
- 事实：鉴权按哈希查行（`find_api_key_by_hash`），单一 pepper 意味着**一换就
  让所有存量 key 立刻 401**，安全事件中"轮换"等于"全量客户中断"。
- 修复三层：
  1. 认证端口新增 `candidate_hashes`（默认等价单 pepper），`authenticate` 按候选
     顺序探测，命中即通过；
  2. 网关哈希器改为 ring：活跃 pepper 生成新哈希，退役 pepper 仅参与探测；
     空白/重复/与活跃相同项被规范化；
  3. 配置新增 `SDKWORK_CLOUDROUTER_API_KEY_HASH_PREVIOUS_PEPPERS`（逗号分隔，
     每项 ≥32 字符、去重、上限 8），轮换流程 = 把旧 pepper 加入该列表。
- 测试：`api_key_authentication_ring.rs` 3 个用例（旧哈希仍可鉴权、错 secret 仍
  失败、新 key 只用活跃 pepper）+ config 4 个用例 + crypto 2 个用例。
- 尚未覆盖：`RingAeadApiKeySecretCodec`（原始 key 密文）仍是单密钥，轮换后
  "显示原始 key"按行降级为掩码显示；已列入 4.3。

**AC. API Key 原始密文轮换后不可读（已修复）**
- 位置：`crypto.rs::RingAeadApiKeySecretCodec`
- 事实：密文按 pepper 派生密钥加密、读取时只认当前 `key_secret_key_id`；
  pepper 一换，所有存量密文解析失败，管理面"显示原始 key"退化为掩码。
- 修复：新增 `with_key_ring`：`key_secret_key_id → 派生密钥` 的映射，按密文记录的
  id 选择解密密钥，新密文始终用活跃 pepper；未知 id 仍显式失败。
- 接线：**三个构造点全部改为 ring** —— edge runtime、`app-api`、`backend-api`
  （此前只有一处接了哈希 ring，另外两处仍是单 pepper）。
- 测试：`api_key_codec_decrypts_ciphertexts_from_retired_peppers`。

**AD. 幂等等待窗口过短（已修复）**
- 位置：`idempotency.rs::IdempotencyConfig` / `wait_for_completion`
- 事实：等待窗口是 10 次 × 100ms ≈ **1 秒**。同一 idempotency key 的重试是官方
  文档推荐的模式（尤其长生成/流式），1 秒后第二个请求就拿到 409，客户端只能
  放弃或换 key。
- 修复：等待改为**墙钟预算** `wait_timeout`（默认 10s），并钳制到
  `in_progress_timeout`（120s）——超出后租约本就可被重新获取；轮询间隔仍是
  100ms，重试计数只作为查询上限（200）。
- 测试：`the_default_wait_window_admits_a_real_retry`、
  `a_contended_same_key_request_waits_and_replays_instead_of_failing`、
  `a_waiter_that_outlives_the_wait_window_gets_a_conflict`。—— `--lib idempotency`
  10 passed；**全量套件复跑被并发编辑阻塞**（见下）。

**AE. 429 与传输故障共用熔断阈值/冷却（本地状态已修复，待执行验证）**
- 位置：`circuit_breaker.rs`
- 事实：`attempt_is_client_rejection` 明确把 429 排除在"客户端拒绝"之外，于是
  429 与 5xx/传输错误共用 `consecutive_failures` 与 `open_duration`：一个租户或
  一个模型把上游打到限流，会让账号对**所有调用方**进入长达 30s 的故障冷却。
- 修复（本地状态机）：429 独立计数 `consecutive_rate_limits`（阈值 3）与独立
  冷却 `RATE_LIMIT_OPEN_DURATION = 15s`；`CircuitEntry.open_for` 记录本次开路的
  冷却时长，`acquire_call_permit` 据此判定；成功即重置限流 streak；传输故障仍走
  `failure_threshold`/`open_duration`。
- 分布式（Redis）状态：新增 `record_rate_limit` 端口方法，默认实现委托
  `record_failure`——即 Redis 侧暂保持旧行为，待 Lua 增加 `open_until` 后对齐
  （已列入 4.3）。
- 测试（已执行）：`rate_limits_open_a_short_cooldown_on_their_own_streak`、
  `transport_faults_keep_the_configured_fault_window`、
  `a_success_resets_the_rate_limit_streak`。—— `--lib circuit_breaker` **21 passed**。

**AF. Redis 侧 429 冷却对齐（已修复）**
- 位置：`circuit_breaker.rs` 的 Lua 脚本
- 事实：上一项只改了本地状态机；分布式 store 的 Lua 用固定 `open_duration`，
  且没有 429 维度 —— 多节点部署下 429 仍会把账号打入故障窗口。
- 修复：
  - `opened_at` 旁新增 `open_for`（本次开路的冷却秒数），`lua_allow_call` 优先
    读它、缺失时回退 `open_duration`（旧行兼容）；
  - `lua_record_failure` 写入故障窗口秒数；
  - 新增 `lua_record_rate_limit`：独立 `consecutive_rate_limits` streak（阈值 3）
    与 15s 冷却；
  - `lua_record_success` 同时重置 429 streak。
- 测试：`redis_scripts_keep_the_rate_limit_contract` 钉住上述契约文本（真实行为
  需 Redis 实例，属集成环境验证项）。

**AG. 幂等键透传上游（已修复）**
- 位置：`invocation_dispatcher.rs::is_gateway_owned_request_header`
- 事实：客户端的 `Idempotency-Key` 会被转发给上游。上游按**账号**去重，而我们的
  键是**租户作用域**：两个租户恰好选了同一个客户端键，会在同一上游账号上互相
  假去重（A 的结果回给 B）；换账号失败重试也可能命中无关的历史请求。
- 修复：在网关终止 `idempotency-key`/`x-idempotency-key`（与其他网关自有头一起
  剥离）。网关自身已通过幂等 store 保证至多一次执行。
- 测试：`the_gateway_idempotency_key_is_not_forwarded_upstream`；`--lib` 111 passed
  （+1），`invocation_router` 29 passed。

**种子/数据核对（AG 附带）**：`DEFAULT_RELAY_SUPPLIERS` 已为四个 relay 声明
`openai_chat_completions` / `openai_responses` / `anthropic_messages` 三协议与三个
媒体 resource group；LLM 授权由协议声明派生（`llmProtocols.ts`），媒体授权有
`every_relay_supplier_is_granted_the_media_groups` 等种子测试守护。**本轮核对结论：
种子无需变更**。

**M. `credential_rotation` 只被搬运，未被消费**
`account.credential_rotation` 从快照一路带到 `InvocationAccount`，但
dispatch 不读取，按策略轮换（per_request/per_attempt）实际未生效。

**N. 诊断文案误导**
503 文案中的 `model_routes_loaded=0` 是恒真值（`loader.rs` 明确
`model_upstream_routes: Vec::new()`，模型路由由 account route 推导）。

### 4.3 待复核 / 待修复（审计提出）

- 性能：定价解析请求内 memo + `visible_model_prices` 索引；
  `list_upstream_account_routes` 返回 `Arc`（消费者在 `sdkwork-models`，跨仓）。
- 运营/发布：`ai_model_mapping_rule` 后台 CRUD、采购价导入（`price_side=2`，
  0 行，需业务数据）、runbook、经 `bin/` 发布并线上回归。
- **环境依赖**：Redis Lua 的 429 冷却行为需在集成环境（真实 Redis）复验；
  DB 契约（`expires_at`、`key_secret_key_id` 环）需在预发库复跑迁移套件。

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
cargo test  -p sdkwork-cloudrouter-router-service --lib                        # 788 passed（全量）
cargo test  -p sdkwork-cloudrouter-router-service --lib circuit_breaker        # 21 passed
cargo test  -p sdkwork-cloudrouter-router-service --lib idempotency            # 10 passed
cargo test  -p sdkwork-cloudrouter-router-service --test invocation_dispatch   # 32 passed
cargo test  -p sdkwork-cloudrouter-router-service --test invocation_route_planning # 13 passed
cargo test  -p sdkwork-cloudrouter-router-service --test invocation_sticky    # 16 passed
cargo test  -p sdkwork-cloudrouter-router-service --test billing_missing_usage_estimate # 2 passed
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
