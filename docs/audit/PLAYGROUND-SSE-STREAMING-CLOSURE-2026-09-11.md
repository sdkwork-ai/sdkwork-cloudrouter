# Playground SSE 流式「请求成功但无返回」——闭环交付报告

- 日期：2026-09-11
- 范围：跨仓修复 `sdkwork-agents` + `sdkwork-web-framework`（用户已授权「跨仓全修 + 真增量流式」）
- 受影响链路：Playground → CloudRouter 网关（联邦装配 agents app-api）→ agents 服务 → `/v1/chat/completions` 上游
- 结论：**4 处断点全部闭环，端到端真增量流式已由测试守卫；可交付。**

---

## 1. 症状与判定

**症状**：`POST /app/v3/api/ai/agents/agent.chat.default/sessions/{id}/turns?stream=true`
请求「发送成功」但 UI 长时间无任何增量返回（请求一直 pending）；刷新页面后会话内容可见。

**判定**：刷新后可见 ⇒ 服务端确实产出了完整回答并落库；前端无增量 ⇒ **响应体被整体缓冲到结束才吐出**，
或 **服务端从未发出 delta 帧**。二者在本链路里同时存在。

---

## 2. 根因链（4 处断点）

### 断点 1（根因）agents 服务丢弃流式 sink

`sdkwork-agents/crates/sdkwork-intelligence-agents-service/src/cloud_router_executor.rs`

- `CloudRouterFirstTurnExecutor::complete_with_stream_sink` 命中云路由分支时，
  直接调用 `complete_cloud_router_turn(input)` —— **sink 被丢掉**；
- `build_chat_completion_request` 把请求体硬编码为 `stream: Some(false)`。

⇒ `stream_deltas` / `stream_events` 恒空 ⇒ `push_delta` 永不触发 ⇒ SSE 只发出 1 个
`completion` 帧（且是在上游全部完成后）。Playground 走的就是云路由分支，**必中**。

**修复**：新增 `complete_cloud_router_turn_with_sink`，把请求体改为 `stream: true`，
手写 reqwest SSE 读取 `/v1/chat/completions`，逐帧解码 `choices[].delta.content`
并**在收到即调用 `sink.push_delta`**；上游不支持流式时降级回缓冲路径并整段代发一次 delta。

> 注：open-sdk 的 Rust 客户端没有流式方法；**不为此扩张 API 契约并重生成 SDK**，
> 改为在 agents 服务内做受限的 SSE 解析（`decode_chat_completion_stream_line`），
> 契约面零变更。

### 断点 2 SSE 首帧不及时下发

`sdkwork-agents/crates/sdkwork-intelligence-agents-service/src/http.rs`

- handler 会先 `await` 第一个信号才构造响应；上游首 token 慢时，HTTP 响应头长时间不返回
  ⇒ 浏览器/XHR 侧表现为「请求无返回」。

**修复**：`TURN_STREAM_FIRST_SIGNAL_GRACE = 500ms`。首个信号及时到达 → 保持原字节序
（不破坏既有 `http_axum_contracts` 断言）；超时 → 先下发 `: stream-open` 注释帧，
让响应头与连接立刻建立。同时补反代友好头 `X-Accel-Buffering: no` +
`Cache-Control: no-cache, no-transform`。

> 设计取舍：`: stream-open` **只在超时分支**下发。若在首帧前无条件插入，
> 会改变既有 `app_turn_stream_*` 契约测试承诺的字节序。

### 断点 3 幂等拦截器整体吞掉 SSE

`sdkwork-web-framework/crates/sdkwork-web-core/src/interceptors.rs`

- `Idempotency` 的 `after` 阶段用 `axum::body::to_bytes(body, max_cached_response_bytes)`
  把响应体整体读进内存做缓存 —— 对流式响应是致命缓冲（超限还会报 `payload_too_large`）。

**修复**：`after` 分支开头做 SSE 豁免（`is_event_stream_response` → 释放幂等键并 `return Ok(())`）。

> 注意：该路径当前需 `Idempotency-Key` 头或 `require_for_retryable_commands` 才触发，
> 属**防御性修复**：一旦 SSE 路由纳入幂等策略即会退化为全缓冲。

### 断点 4 前端流式分支不落最终文本

`sdkwork-agents/apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-chat/src/services/ChatService.ts`

- 流式分支只在收到 delta 时写文本；`ChatView.onComplete` 只更新消息 id
  ⇒ 若运行时不产生 delta（或端口降级为缓冲），气泡永久空白。

**修复**：记录 `sawDelta`；`!port.sendMessageStream || !sawDelta` 时用 `response.content` 兜底，
且**不会**与已流式写入的文本重复。同时补 `options.signal` 中止判定。

---

## 3. 验证矩阵

| # | 门禁 | 命令 | 结果 |
|---|------|------|------|
| 1 | 新增 e2e 流式回归 | `cargo test -p sdkwork-intelligence-agents-service --lib -- streams_account_pool_deltas` | **1 passed** |
| 2 | 变异测试（证明 #1 是真守卫） | 临时回退 `complete_with_stream_sink` → 丢 sink | **立即失败**并给出准确诊断；已完整还原（`MUTATION` 残留扫描为空） |
| 3 | 幂等豁免契约 | `cargo test -p sdkwork-web-core --lib -- idempotency` | **11 passed** |
| 4 | web-framework 全量 | `cargo test -p sdkwork-web-core` | **209 passed / 0 failed** |
| 5 | agents SSE 契约 | `cargo test -p sdkwork-intelligence-agents-service --test http_axum_contracts` | 82 passed / 2 failed（**均为既存基线**，见 §5.1） |
| 6 | agents lib 全量 | `cargo test -p sdkwork-intelligence-agents-service --lib` | 225 passed / 27 failed（**均为既存基线**，见 §5.2） |
| 7 | 集成测试编译 | `cargo test -p sdkwork-intelligence-agents-service --test live_turns_sse_test --no-run` | **编译通过**（本轮修复的 `CreateTurnCommand` 字面量生效） |
| 8 | 前端类型检查 | `pnpm exec tsc --noEmit`（sdkwork-agents-pc） | `ChatService.ts` **零错误**（`--listFiles` 确认在检查程序内） |
| 9 | 前端单测 | `pnpm exec tsx --test tests/chat-resilience.test.ts` | **9 passed / 0 failed**（含新增 2 条） |
| 10 | 本仓编译门禁 | `cargo check --workspace`（sdkwork-cloudrouter） | **Finished `dev` profile，零 error**（已检查 `sdkwork-api-agents-assembly` 与 `sdkwork-routes-cloudrouter-app-api`）；沙箱故障见 §4.2 |

**变异测试细节（#2）**：把 `complete_with_stream_sink` 换回旧实现后，测试失败信息为

```
no delta reached the sink while the upstream stream was open:
content="cloud router turn failed: provider_error: ... serialization error:
invalid type: string \"data: {...}\", expected struct OpenAiChatCompletion"
runtime_mode="managed-agent-inference-error" stream_deltas=[]
```

—— 说明该测试确实卡在「upstream 仍被 hold 住时首 delta 必须已到 sink」这一语义上，
不是恒真断言。

---

## 4. 环境受限项（已取证，非仓库缺陷）

### 4.1 `lzma-sys` 阻塞 `--features codex-test`

`codex-test = ["sdkwork-agents-runtime-facade/codex-provider"]` 是 **test-only** feature。带上它会在本机
拉入 `lzma-sys 0.1.20`，其 build script 编 `xz-5.2` 时报

```
fatal error C1083: Cannot open compiler generated file: '...\out\xxx.o': Permission denied
```

已排除的因素：`-j 1` / `NUM_JOBS=1` / `CFLAGS=/FS` 仍复现；OUT_DIR 对普通进程可写。
⇒ 裁决为**本机 MSVC 14.44 + 沙箱环境限制**。**未修改任何依赖或 vendored 源码。**

### 4.2 `sdkwork-cloudrouter` 全工作区 `cargo check` 在沙箱内随机失败（**已排除，最终绿灯**）

同一命令三次沙箱内运行，**失败点每次不同**，且全部是「向 `target/` 写构建产物 → `os error 5 拒绝访问`」：

| 运行 | 失败产物 | crate |
|------|----------|-------|
| 1 | `<hash>-jitterentropy-health.c` 的 `.o` | `aws-lc-sys` |
| 2 | `aws_sdk_ssooidc-dfdd26d8a2db6507.d` | `aws-sdk-ssooidc` |
| 3 | `libsdkwork_api_promotion_assembly-35c5ac63f8eb770c.rmeta` | `sdkwork-api-promotion-assembly` |

**判别依据**：真实代码错误会确定性复现并指向同一处；三次落在三个无关 crate 的不同产物上
⇒ **环境级文件写入拦截**（沙箱对 `target/` 的写拦截），非代码缺陷。

**结论（已闭环）**：非沙箱下同一命令 **`Finished dev profile in 34.45s`，零 error**；
随后沙箱内复跑 **`Finished dev profile in 1.47s`（缓存命中）** 亦为绿灯。
即 **本仓全工作区编译门禁最终通过**，前期失败纯属沙箱瞬时写拦截。
凡本机 `cargo` 出现 `os error 5` / `C1083 Permission denied` 落在 `target/` 下，
应判定为环境噪声并重试，**不要**误判为代码缺陷。

### 4.3 本仓与本次改动的依赖关系（为何仍需关注本仓门禁）

`sdkwork-cloudrouter/Cargo.toml` 直接 path 依赖：

- `sdkwork-web-core`（`../sdkwork-web-framework/crates/sdkwork-web-core`）
- `sdkwork_api_agents_assembly` → `../sdkwork-agents/crates/sdkwork-api-agents-assembly`

即**我改的两个 crate 都会进本仓网关构建**。承载 Playground 联邦路由的正是
`crates/sdkwork-routes-cloudrouter-app-api`（`src/agents_runtime.rs`、`src/manifest_composition.rs`）。
因此本仓编译门禁属**必过项**，不属可选项。

---

## 5. 既存基线缺陷（已上报，未擅自扩大改动）

### 5.1 `http_axum_contracts` 剩余 2 条失败

- `app_project_session_should_materialize_canonical_agent_engine_identity`（503 ≠ 201）
- `app_provider_session_without_live_evidence_is_unknown_not_ready`

二者 detail 均为 `codex provider is not enabled in this build` ⇒ 同 §4.1，缺 test-only feature。
**与本改动无关。**

另：`http_axum_contracts.rs:5283` 的陈旧 problem-detail 断言本轮已修（见 §6.2）。

### 5.2 `--lib` 27 条失败

- `provider_session_sync::tests::*`（24 条）+ `runtime_facade_bridge::tests::*`（2 条）：
  `codex provider is not enabled in this build`
- `http::tests::*model_selection*`（2 条）：400 ≠ 200，需 codex 目录

全部同源，**与本次 SSE 改动零交集**。

### 5.3 `sdkwork-web-framework` 的 `openapi_authority` 门禁失败（**非本改动**）

`cargo test --workspace` 报 `sdkwork-routes-web-framework-backend-api --test openapi_authority`
→ `committed_openapi_authority_matches_runtime_contract` 失败：
`apis/backend-api/web-framework/openapi.json is stale`。

**取证过程**：备份已提交文件 → 运行被忽略的
`materialize_openapi_authority_file -- --ignored` 重新生成 → 结构化 JSON diff → 立即还原。

**diff 结论**：漂移全部是 **operationId 重命名 + `limit` 遗留别名**，与拦截器无关：

| 位置 | committed | runtime（工作区在途） |
|------|-----------|----------------------|
| control_nodes POST | `webFramework.controlNodes.create` | `...register` |
| cors_policies PUT | `...corsPolicies.update` | `...upsert` |
| optional_features GET | `...optionalFeatures.list` | `...snapshot` |
| rate_limit_policies PUT | `...rateLimitPolicies.update` | `...upsert` |
| runtime_defaults GET | `...runtimeDefaults.retrieve` | `...snapshot` |
| 多个分页列表 | 无 | 新增 `deprecated: true` 的 `limit` 查询参数 |

⇒ 属**兄弟仓在途改动**（改了路由清单但未重生成 authority）。该文件已按 md5
`5ba44ab530c5886576ff7db9b3395967` 原样还原，`git status` 对该文件为 clean。
按「跨仓发现只记录、上报，不擅自处置」纪律**未修复**。

**建议处置**（由 web-framework 归属人执行）：

```bash
cargo test -p sdkwork-routes-web-framework-backend-api \
  materialize_openapi_authority_file -- --ignored
```

---

## 6. 改动清单

### 6.1 `sdkwork-agents`（8 文件，+1034 / −48）

| 文件 | 变更 |
|------|------|
| `crates/sdkwork-intelligence-agents-service/src/cloud_router_executor.rs` | +895 / −33 —— 真增量流式核心 |
| `crates/sdkwork-intelligence-agents-service/src/http.rs` | +50 / −11 —— 首帧宽限 + 反代友好头 |
| `crates/sdkwork-intelligence-agents-service/tests/http_axum_contracts.rs` | +9 / −2 —— 修陈旧断言 |
| `crates/sdkwork-intelligence-agents-service/tests/live_turns_sse_test.rs` | +6 —— 补 `CreateTurnCommand` 字段 |
| `crates/sdkwork-intelligence-agents-service/tests/agent_business_service_contracts.rs` | +5 —— 同上 |
| `crates/sdkwork-intelligence-agents-service/tests/resource_user_state_postgres_live.rs` | +12 —— 同上（4 处） |
| `apps/sdkwork-agents-pc/packages/sdkwork-agents-pc-chat/src/services/ChatService.ts` | +14 / −2 —— 最终文本兜底 |
| `apps/sdkwork-agents-pc/tests/chat-resilience.test.ts` | +43 —— 2 条新测试 |

### 6.2 `sdkwork-web-framework`（2 文件，+184 / −0）

| 文件 | 变更 |
|------|------|
| `crates/sdkwork-web-core/src/interceptors.rs` | +38 —— SSE 幂等豁免 |
| `crates/sdkwork-web-core/src/pipeline_contract_tests.rs` | +146 —— 2 条契约测试（含对照） |

### 6.3 本仓 `sdkwork-cloudrouter`（1 文件，仅新增文档）

| 文件 | 变更 |
|------|------|
| `docs/audit/PLAYGROUND-SSE-STREAMING-CLOSURE-2026-09-11.md` | 本报告 |

> **本仓零代码改动**：Playground 路由经联邦装配进入网关，本次修复全在依赖层。

> `pipeline_contract_tests.rs` 的判别器设计：`CACHE_LIMIT_BYTES = 16`，流式载荷 76 字节。
> 若豁免失效走缓冲路径，必然报 `payload_too_large` ⇒ 该断言就是「流式分支真生效」的判别器。

---

## 7. 落地（rollout）要求

1. **必须重建**：`sdkwork-agents`（service 二进制）与 `sdkwork-web-framework`（web-core 为编译期依赖），
   以及依赖它们的 `sdkwork-cloudrouter` 网关镜像。三者需同批次发布，**不可只更新网关**。
2. **网关无需改代码**：Playground 路由经联邦装配进入，本次改动全在依赖层。
3. **反代/Ingress 需允许流式**：已补 `X-Accel-Buffering: no` + `Cache-Control: no-transform`；
   若前置 nginx，仍需确认 `proxy_buffering off` 作用于该路由。
4. **前端需重新构建** `sdkwork-agents-pc`（`ChatService.ts` 变更）。
5. **不需要重新生成任何 SDK**：本轮零 API 契约变更。

---

## 8. 残余风险

| 风险 | 等级 | 说明 / 缓解 |
|------|------|-------------|
| 本仓全工作区编译 | ✅ 已取得绿灯 | §3 第 10 项；前期沙箱 `os error 5` 见 §4.2，属环境噪声 |
| 上游 SSE 解码为手写解析 | 低 | 已补 5 条单测 + 降级路径；畸形帧被忽略而非中断流 |
| 幂等豁免为防御性修复 | 低 | 已加对照测试防止误关停 Stage 9 缓存 |
| 兄弟仓在途改动（operationId）未同步 authority | 低 | §5.3，属他人归属，已给修复命令 |
| `: stream-open` 仅超时下发 | 低 | 已由既有字节序契约测试守住 |
