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
| `supplier_type=official|relay` 未参与运行时决策 | 待修复（已定位） |
| 中转站 chat 资源授权缺失、模型名改写缺省错误 | 待修复（已定位） |
| `least_cost` 用静态系数而非真实采购价 | 待修复（已定位） |

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

### 4.2 待修复（已定位，附证据）

**I. 定价解析每请求重复上百次全扫**
`upstream_route_selector.rs::ensure_route_is_priced` 对每个候选的每条 route
逐 meter 做多次 `visible_model_prices`（双遍 + 逐行克隆），chat 复合计量
3 档；选中后 preflight 与 finalization 再各算一遍。另
`catalog.rs` 的 `list_upstream_account_routes` 返回 `to_vec()`，每次深拷贝
整张账号路由表，而快照本身已有 `Arc<[..]>`。

**J. `supplier_type` 未参与运行时决策**
`ai_upstream_supplier.supplier_type in ('official','relay')` 只用于种子写入与
后台校验；路由、分发、模型名推导均不区分。后果：中转站默认收到去厂商前缀的
native id（`deepseek-flash` 而非 `deepseek/deepseek-flash`），
`ai_model_mapping_rule` 为 0 行且后台只有 GET/resolve、无 CRUD。

**K. 中转站 chat 资源授权缺失（数据）**
生产库 12 条 relay supplier binding 全部指向媒体资源组
（`relay.bytedance.media`、`relay.cn/global.visual_generation`），没有任何
relay chat 授权；即使启用 relay 账号，chat 请求也会在
`binding_matches_api_scope` / `binding_matches_capability` 处被拒。

**L. `least_cost` 用静态系数**
`upstream_account_route_planner.rs::order_accounts` 只比较
`contract_cost_multiplier × 成员/分组系数`，不查询 `ai_model_pricing`
（该表已有 `supplier_code`/`account_id`/`price_side=2` 维度，生产库
`price_side=2` 为 0 行）。

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
cargo test  -p sdkwork-cloudrouter-router-service --lib                        # 748 passed
cargo test  -p sdkwork-cloudrouter-router-service --test invocation_dispatch   # 31 passed
cargo test  -p sdkwork-cloudrouter-router-service --test invocation_pipeline   # 4 passed
cargo test  -p sdkwork-cloudrouter-router-service --lib provider_request       # 8 passed
cargo test  -p sdkwork-cloudrouter-router-service --lib response_memory_budget # 4 passed
cargo test  -p sdkwork-cloudrouter-router-service --lib openai_relay_execution # 8 passed
cargo test  -p sdkwork-cloudrouter-router-service --test openai_chat_api       # 42 passed
cargo test  -p sdkwork-cloudrouter-edge-runtime  --lib                         # 109 passed
```

## 7. 风险提示

- 会话期间 `main` 被外部进程推进了 3 个提交，工作树改动被扫入其中一条
  OAuth 重构提交；本文件所列改动均已在工作树复核，提交归属需人工确认。
- 未对生产环境执行任何变更；发布须经 `bin/` 入口并显式授权。
