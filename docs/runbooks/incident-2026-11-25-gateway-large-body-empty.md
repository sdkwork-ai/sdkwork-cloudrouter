# 事故报告：中转站 `/v1/*` 大于 256 KiB 的请求体在网关内被丢弃（2026-11-25）

- 报告时间：2026-11-25 15:10（Asia/Shanghai）/ 07:10 UTC
- 目标主机：`ubuntu@api.birdcoder.com`（`VM-48-7-ubuntu`）
- 受影响服务：`sdkwork-api-cloud-gateway:0.1.132`（production / standalone.i1）
- 关联客户端：`deepseek-harness/0.2.3-alpha.2 dsh-profile/desktop`（OpenAI Node SDK 7.19.0）
- 处置性质：只读诊断 + 一张**已删除**的临时诊断 Key（见 §6）

---

## 1. 结论摘要

| 结论 | 状态 | 证据 |
|------|------|------|
| 不是前端/客户端问题 | **已排除** | 客户端声明的 `content-length` 被 nginx 完整接收并转发；网关自身的请求体缓冲层成功读满该长度（§3.1） |
| 不是 nginx 问题 | **已排除** | 直连 `127.0.0.1:3913` 与经 `https://api.birdcoder.com` 行为完全一致；nginx error log 无相关记录（§3.2） |
| 是网关（中转站）后端缺陷 | **已确认** | CloudRouter 调用管线拿到的请求体长度为 **0**，而请求头里的 `content-length` 为真实长度（§3.3） |
| 触发条件是**体积**，不是内容 | **已确认** | 边界精确落在 **262144 字节**：262126 正常，262146 失败（§4） |
| 影响范围是全部 `/v1/*` | **已确认** | chat / embeddings / responses / audio 全部复现；`images/generations` 亦受影响（§4.2） |
| 之前的"guard 修复"没有解决该问题 | **已确认** | 部署版已把 `/v1` 声明为 external protocol，guard 不再介入（`tenant_id` 探测不再返回 40001），但丢包依旧 |
| **根因：请求日志捕获层把请求体读掉后转发了空 body** | **已定位并修复** | `sdkwork-log-tower-adapter` 的 `RequestLoggingMiddleware` 只在声明长度 ≤ 捕获上限（默认 **256 KiB**）时缓冲请求体，然后用缓冲结果重建转发请求；**超限时它根本没读 body，却仍然转发 `AxumBody::empty()`**。CloudRouter 把这一层套在整个 `/v1` 路由上（`runtime.rs:2258`） |

**一句话**：CloudRouter 套在 `/v1/*` 上的**请求日志捕获层**，只在请求体声明长度 ≤ 256 KiB 时才读取并转交请求体；
超过上限时它既不读、也不转交，直接把**空 body** 交给下游。CloudRouter 的 payload 提取因此读到 0 字节，返回
`400 40002 request body is empty for openai.chat_completions`。客户端和 nginx 都是清白的。

---

## 2. 用户可见症状

```json
{"type":"https://docs.sdkwork.com/problems/40002","title":"Malformed request","status":400,
 "detail":"request body is empty for openai.chat_completions",
 "instance":"POST /v1/chat/completions","code":40002,
 "traceId":"b0f4d6d4-651c-4c1d-8424-da18a26359b2","operationId":"createChatCompletion",
 "failedStage":"dispatch_failed","reason":"request body is empty for openai.chat_completions"}
```

同一会话、同一 Key、同一模型，"短对话能通、长对话必失败"，表现为"时好时坏"。

---

## 3. 证据链

### 3.1 客户端与网关缓冲层（排除客户端）

生产网关访问事件（`GatewayAccessLogEvent`，原始请求头快照）：

```
POST /v1/chat/completions status=400
content-length: 1422525   content-type: application/json
user-agent: deepseek-harness/0.2.3-alpha.2 ... x-stainless-lang: js / node v24.22.3
```

网关随后打出的结构化 WARN（来自 `payload.rs` 的 `validate_required_model`）：

```
required route received an empty request body
stage="payload_extraction" api_code=openai.chat_completions
route_key=openai/model/chat_completions method=POST path=/v1/chat/completions
content_type="application/json" declared_content_length=1422525 body_bytes=0
```

- `declared_content_length` 取的是**网关自身把请求体读入内存后写回的** `content-length`
  （`enforce_request_body_limit` 会用缓冲长度覆盖该头）。它对 chunked 请求会新增该头：
  实测 chunked 300 KB 探测得到 `declared_content_length=300086`，证明
  **网关缓冲层确实按完整长度读入了请求体**。
- 因此客户端发送完整、网关接收完整，**唯一异常发生在网关把请求交给依赖之后**。

### 3.2 nginx（排除反向代理）

- vhost：`/etc/nginx/sites-enabled/sdkwork/sdkwork-api-cloud-gateway.conf`
  （`proxy_http_version 1.1`、请求体缓冲默认开启、`client_max_body_size 100m`）。
- 1.4 MB 请求体经公网 HTTPS 入口可完整到达网关鉴权层（返回 401 而非 body 错误）。
- 直连 `127.0.0.1:3913` 与经 nginx 的失败点、失败体积**完全一致**；nginx error log 无记录。

### 3.3 网关内部（定位窗口）

`/v1/*` 的实际链路：

```
nginx → gateway(0.1.132)
  ├ traffic_middleware / security_middleware(WAF，prompt 路径跳过)
  ├ RequestBodyLimitLayer + enforce_request_body_limit   ← 此处已读满请求体
  └ composed API host（Web Framework 18 阶段管线，guard 对 /v1 已跳过）
        └ cloudrouter assembly `/{*path}` → dispatch_application_request
              └ open_api_capability_router(capability)
                    └ cloudrouter 调用路由 `/{*path}` → handle_invocation
                          └ invocation_body_from_http → to_bytes  ← 此处得到 0 字节
```

**排除项（逐项实测）**

| 环节 | 结论 | 实测 |
|------|------|------|
| Web Framework 请求体 guard | 与本次无关 | `/v1` 不再触发 40001（external protocol 生效）；`/app` 路径 8 MB 请求体可被 guard 正常读取并回填 |
| 框架 content-length 策略 | 非本次阈值 | 26 MB 请求返回 `request content length exceeds API policy`（16 MiB），不是 256 KiB |
| 网关策略写入上限 | 非本次阈值 | 30 MB 返回 `request_body_too_large`（25 MiB `default-write-limit`） |
| CloudRouter 调用体上限 | 非本次阈值 | 配置/默认为 25 MiB（`DEFAULT_GATEWAY_INVOCATION_BODY_MAX_BYTES`） |
| WAF `inspectJsonBody` | 非本次阈值 | 上限 1 MiB 且 chat/audio/embeddings/responses 均属 prompt 路径，直接跳过 |

> 代码侧（`sdkwork-web-framework`、`sdkwork-api-cloud-gateway`）在上述链路中**没有**
> 请求体上限，也没有"读失败后继续用空 body"的实现；三个仓库的本地 `main` 与
> `origin/main` 一致（无未推送提交），部署镜像即这些提交。
>
> **消费点已确认在 CloudRouter 侧**：见 §3.4。

### 3.4 根因：请求日志捕获层（`sdkwork-log-tower-adapter`）

CloudRouter 的 edge runtime 把请求日志捕获层套在**整个 open-api 路由**上：

```rust
// crates/sdkwork-cloudrouter-edge-runtime/src/runtime.rs:2249-2258
let open_log_assembly = sdkwork_api_log_assembly::assemble_backend_business_router_with_pool(
    &context.database_pool,
    "sdkwork-cloudrouter-open",
    Some(open_retention_policy),       // 外部消费者计费流量 → Permanent 保留
    Some(open_surface_resolver),       // 全部标为 OpenApi
    context.trust_forwarded_headers,
).await?;
let gateway_router = gateway_router.layer(open_log_assembly.capture_layer);
```

该层的默认捕获上限 `DEFAULT_MAX_BODY_BUFFER_BYTES = 256 * 1024` —— 与实测边界完全一致。
修复前的实现（`crates/sdkwork-log-tower-adapter/src/middleware.rs`）：

```rust
let body_hint = request.body().size_hint();
let capture_request_body = body_hint
    .upper()
    .map(|upper| upper <= max_body_bytes as u64)
    .unwrap_or(true);                       // 声明长度超限 ⇒ 不捕获
let request_body_bytes = if capture_request_body {
    match body.collect().await { Ok(c) => Some(c.to_bytes()), Err(..) => None }  // 失败 ⇒ None
} else {
    None                                    // 超限 ⇒ None（body 未被读取，也没有被转交）
};
let rebuilt = Request::from_parts(
    parts,
    request_body_bytes.map(AxumBody::from).unwrap_or_else(AxumBody::empty),  // ⇒ 空 body
);
```

即：**日志层按"上限"决定是否读，但无论读没读，转发给下游的 body 都只来自那次捕获**。
当声明长度超过 256 KiB 时，捕获被跳过，下游因此收到空 body；而 `content-length` 头原样保留，
于是 CloudRouter 的 payload 提取读到 0 字节 —— 与全部实测现象一一对应：

| 观察 | 解释 |
|------|------|
| ≤ 262144 正常、> 262144 必失败 | 声明长度与捕获上限比较 |
| 所有 `/v1/*` 都受影响 | 该层套在整个 open-api 路由上 |
| 网关日志 `declared_content_length` 仍是真实长度 | 日志层只重建 body，不改头 |
| `/app` 8 MB 请求体能被 guard 读到 | `/app` 不经过这一层（guard 属于框架管线，且在其之前） |
| 之前"guard 修复"无效 | 消费点根本不在 guard |

**这是"观测型读取不得破坏数据面"的典型违例**：请求体只能读一次，读它的任何步骤
（请求日志、审计、上下文构建）都必须把同样的字节交还下游，或者根本不碰这条流。

---

## 4. 可复现的最小实验

### 4.1 边界（直连 127.0.0.1:3913，真实鉴权）

| 请求体字节 | 结果 |
|-----------|------|
| 1,110 | `503 50301 model is not available ...`（模型已从 body 解析出来） |
| 133,259 | 同上 |
| 200,086 | 同上 |
| 250,086 | 同上 |
| 261,986 / 262,086 / 262,106 / 262,126 | 同上（正常） |
| **262,146** | **`400 40002 request body is empty`** |
| 262,166 / 262,186 / 262,286 / 262,386 | 同上（失败） |
| 268,387 / 400,086 / 1,422,611 | 同上（失败） |
| chunked（无 content-length）300,086 | 同上（失败）→ 说明判据是**实际字节数**，与 framing 无关 |
| 经 `https://api.birdcoder.com` 268,387 | 同上（失败）→ nginx 无关 |

**边界：≤ 262144（256 KiB）通过，> 262144 丢包。**

### 4.2 跨接口验证（同一 Key、同一请求体尺寸 300 KB）

| 路径 | 结果 | 含义 |
|------|------|------|
| `/v1/chat/completions` | `400 request body is empty for openai.chat_completions` | 丢包 |
| `/v1/embeddings` | `400 request body is empty for openai.embeddings` | 丢包 |
| `/v1/responses` | `400 request body is empty for openai.responses` | 丢包 |
| `/v1/audio/speech` | `400 request body is empty for openai.audio.speech` | 丢包 |
| `/v1/images/generations` | `503 ... no upstream account routes are configured` | 该路由 model 非必需，空 body 不触发 400，故表现不同，但同样未携带 body |

结论：**不是单个接口的问题，而是 `/v1/*` 共用链路上的问题。**

### 4.3 判定探针（无需真实业务模型）

用任意可用 Key，把 `model` 设为一个不存在的值（`zz-probe/nonexistent-model`）：

- body 正常送达 → `503 50301 model is not available for route planning`
- body 被丢弃 → `400 40002 request body is empty`

不会调用上游、不产生费用，可安全用于回归。

---

## 5. 修复与验证

### 5.1 已落地（兄弟仓库 `sdkwork-log`，提交 `dc89d05` + `d18fb4a` + `82fee4a`）

捕获策略按"声明长度"分流，两条路径都保证 payload 不丢：

| 声明长度 | 读取方式 | 转发给下游 | 日志行 |
|----------|----------|-----------|--------|
| ≤ 捕获上限（默认 256 KiB） | 一次性缓冲 | 用同一份字节回放（与修复前一致） | 完整 body（redacted） |
| > 上限，或长度未知（chunked） | **不预读**，改用旁路 tee | **原始字节流逐帧透传** | 有界前缀（`[TRUNCATED]`） |
| ≤ 上限但读取失败（传输错误） | 已消耗、无法回放 | **502 `request body could not be read`**（不再静默空 body） | 记录 502 |

| 文件 | 变更 |
|------|------|
| `crates/sdkwork-log-tower-adapter/src/capture.rs` | 新增 `RequestCaptureBody<B>`：逐帧原样透传，最多把 `max_body_bytes` 字节写入共享缓冲；错误帧原样上抛 |
| `crates/sdkwork-log-tower-adapter/src/middleware.rs` | 删除"无论读没读都用捕获结果重建请求"的逻辑：≤上限走缓冲回放，>上限/未知长度走 tee，读取失败返回 502；`request_body` 在 save 任务里从共享缓冲生成 |
| `crates/sdkwork-log-tower-adapter/src/lib.rs` | 导出 `RequestCaptureBody`；`DEFAULT_MAX_BODY_BUFFER_BYTES` 文档改为"保留前缀"而非"超限跳过" |
| `crates/sdkwork-api-log-assembly/src/bootstrap.rs` | 捕获预算上调为 **1 MiB** 且可配置（`SDKWORK_LOG_CAPTURE_BODY_MAX_BYTES`），并应用到它交给宿主的每一个捕获层；非法值回落默认 |
| `crates/sdkwork-log-tower-adapter/Cargo.toml` + `Cargo.lock` | dev-dependencies 补 `async-trait` 与 `sdkwork-log-store-sqlx` 的 `postgres` feature（否则测试图里 `DatabasePool` 没有变体） |

修复后语义：

- 任意大小 / 任意 framing（含 chunked）的请求体 **逐字节**到达 handler；
- 小 body 仍完整入账（不影响既有审计口径），大 body 只保留有界前缀，内存与存储有界；
- 传输错误不再被"翻译"成空 body：要么原样上抛，要么显式 502。

验证命令与结果：

| 命令 | 结果 |
|------|------|
| `cargo test -p sdkwork-log-tower-adapter --lib --offline` | **11 passed / 0 failed**（含 `oversized_request_body_is_forwarded_byte_for_byte`、`megabyte_scale_bodies_are_forwarded_without_loss`（1 MiB / 8 MiB）、`bodies_within_a_raised_capture_budget_are_recorded_in_full`、`small_request_body_is_forwarded_and_recorded_in_full`） |
| `cargo test -p sdkwork-api-log-assembly --lib --offline` | **3 passed / 0 failed**（捕获预算解析：默认 1 MiB、可配置、非法值回落） |
| `cargo test -p sdkwork-log-tower-adapter --offline` | **全绿**（含既有持久化集成用例） |
| `cargo check -p sdkwork-api-log-assembly` | **exit 0** |
| `cargo check -p sdkwork-log-tower-adapter --lib` | **exit 0** |

> 未能在本机编译 `sdkwork-cloudrouter-edge-runtime` 做端到端确认：该 crate 存在既有阻塞
> （`passthrough.rs` 对 `BillingMeter::DocumentPage` 的非穷尽匹配，与本修复无关）；本机
> Windows 链接 `aws-lc-sys` 时还遇到一次 `LNK1104` 临时文件错误（环境问题）。
> 本修复没有改动该层的公共 API（仅新增一个导出类型），消费侧无需改动。

### 5.2 上线所需动作（还需一次发版）

1. bump `release.currentVersion` 后用 `bin/docker-image.sh build` 重建网关镜像（镜像内嵌 `sdkwork-log` 的编译产物）。
2. `bin/docker-deploy.sh upgrade --environment production --yes`。
3. 回归判据（§4.3）：`262146 / 268301 / 1422525` 应返回 `503 50301 model is not available…`（说明 body 已送达），
   `≤262144` 仍正常；同时确认 request log 行仍按前缀记录、`Permanent` 保留策略不变。

### 5.3 全量审计：框架里"读请求体"的位置（本次逐一核对）

请求体只能被读一次，所以每个读者都必须满足三者之一：不读、读满后**原样回填**、或用 **tee** 旁路。
本次按此标准核对了全工作区所有请求方向的读取点：

| 位置 | 读取方式 | 判定 |
|------|----------|------|
| `sdkwork-log-tower-adapter`（请求日志） | 见 §5.1 | ❌→✅ **本次根因，已修** |
| `sdkwork-web-core` `client_context_guard` | 声明超限先拒绝；否则读满后 `Request::from_parts(parts, Body::from(bytes))` 回填；读取失败即拒绝 | ✅ 安全；且对 `/v1` 等 external protocol 前缀整段跳过，根本不读 |
| gateway `security::inspect_json_body`（WAF） | 读满后回填；超限 413；prompt 推理路径整段跳过 | ✅ 安全 |
| gateway `runtime::enforce_request_body_limit` | 读满后重建 body，并用缓冲长度覆盖 `content-length` | ✅ 安全（**只保护到"交给依赖"为止**——本次问题正发生在它之后） |
| gateway `comments_proxy` | 读满后自行转发 | ✅ 区域内安全 |
| cloudrouter `invocation_body_from_http` | 链路末端读一次，立即构造 `InvocationBody` | ✅ 安全（应当是最后一位读者） |
| cloudrouter `handle_internal_invocation` | 读满 → HMAC 校验 → `Body::from(body)` 回填 | ✅ 安全 |
| cloudrouter `edge_server` portal tool API | 读一次后自行处理 | ✅ 区域内安全 |
| `sdkwork-kernel` 幂等中间件（`idempotency.rs`） | 读满后 `Body::from(body.clone())` 回填；读取失败返回 413 | ✅ 安全 |
| `sdkwork-webserver/.../data_plane/subrequest.rs:242` | `Ok(..) => Some(bytes), Err(_) => None`，随后按该 `Option` 重建请求 | ❌ **同型缺陷**（反向代理数据面） |
| `sdkwork-webserver/.../data_plane/cgi_cache.rs:206` | 同上形状 | ❌ **同型缺陷** |

### 5.4 建议固化为框架规则（防复发）

1. 任何读取请求体的中间件，转发给下游的 body **必须**来自同一份字节（缓冲回放）**或**原始流（tee）。
2. **禁止**这种写法：`collect()`/`to_bytes()` 得到 `Option<Bytes>`，再 `unwrap_or_else(Body::empty)` 重建请求 ——
   失败与"超限跳过"两种情况都会让下游收到空 body。读取失败应当是显式错误（4xx/5xx），超限应当是 tee。
3. 观测类中间件（request log / audit / trace / 上下文构建）默认按"旁路"实现；只有需要完整审计 body 时才做
   有界预读，且预读上限必须与 `content-length` 判定一致。
4. 回归判据统一用"真实字节是否到达 handler"，而不是"状态码看起来对"：本次 `400` 的文案一直指向调用方，
   正是缺少这类判据。
5. `invocation_body_from_http` 仍建议补齐诚实化：`declared_content_length > 0 && bytes.is_empty()` 时返回
   5xx `request_body_not_delivered`（一并记录 declared/read 两个数字），而不是 `400 request body is empty`。

### 5.5 请求体大小上限链（从外到内）与"调大"的正确位置

丢包已由 tee 消除，剩下的只是"**收不收**"（413）而不是"丢不丢"。各环节当前值：

| 环节 | 当前值 | 配置位置 | 超限表现 | 调大方式 |
|------|--------|----------|----------|----------|
| nginx `client_max_body_size` | 100 MB | vhost | nginx 413 | 改 vhost |
| 网关 `[request] maxBodyBytes` | 32 MiB | `config.toml` | `413 request_body_too_large` | 改配置 + 重启 |
| 网关策略 `default-write-limit` | 25 MiB | `config.toml [policy]` | 同上 | 改配置 + 重启 |
| 框架 content-length 策略 | **16 MiB**（production 默认） | `RequestSizeLimitPolicy::default()`；可被**租户运行时档案** `max_content_length` 覆盖 | `413 request content length exceeds API policy` | 管理端写租户运行时档案（`maxContentLength`），或调整代码默认值 |
| CloudRouter 调用体预算 | 25 MiB | `SDKWORK_CLOUDROUTER_GATEWAY_INVOCATION_BODY_MAX_BYTES` / runtime.toml | `400 request body exceeds the maximum allowed size of N bytes` | 环境变量 / runtime.toml |
| **请求日志捕获预算** | **1 MiB**（本次由 256 KiB 上调） | `SDKWORK_LOG_CAPTURE_BODY_MAX_BYTES`（默认 `DEFAULT_CAPTURE_BODY_MAX_BYTES`） | **不拒绝、不丢包**，只截断记录 | 环境变量 |

要点：

1. 真正决定"能否收下"的最紧一环是**框架的 16 MiB**，其次才是网关与 CloudRouter 的 25 MiB；nginx 与网关请求上限更宽。
2. 要让单个请求超过 16 MiB：优先写**租户运行时档案**的 `max_content_length`（管理端能力，无需发版）；超过 25 MiB 还需同步调大网关 `[policy]` 与 CloudRouter 调用体预算。
3. 网关与 CloudRouter 都是**整包内存缓冲**，上限与并发数共同决定内存占用，不要盲目调大。
4. 日志捕获预算**不再参与**"能否收下"，只决定审计里能保留多少字节；1 MiB 已覆盖常见长对话 prompt，可按磁盘预算继续调大。

### 5.6 响应流审计与修复（与请求流同一套规则）

响应体同样只能被读一次；"读完用空 body 顶上"会把上游真实答案变成空响应。

| 位置 | 修复前 | 现在 |
|------|--------|------|
| `sdkwork-web-core::problem::enrich_problem_response`（problem+json 富化） | 先读后判；读失败 → `Err` → 调用方用通用 problem 覆盖，**丢掉上游 detail** | ✅ **已修**：先用 `may_buffer_whole` 判预算，放不下→不读、原样透传 |
| `sdkwork-web-core::problem::normalize_problem_response` | 继承上面的失败路径 | ✅ 随上一条改善（只有"已判定可缓冲但传输失败"才回退通用 problem） |
| `sdkwork-web-core::interceptors` 幂等 `after`（响应写入重放缓存） | 超过缓存上限 → `Err` → 整个响应用 problem 覆盖 | ✅ **已修**：放不下→释放租约、原样透传（不再吞掉响应） |
| gateway `dependency_error_observer` | 读失败 → `Body::empty()`，**丢掉上游错误详情** | ✅ **已修**：放不下→原样转发；仅传输失败时返回显式 502 problem |
| cloudrouter-http `locale::read_problem_payload` | 读失败 → `Body::empty()` | ✅ **已修**：放不下→跳过本地化、响应原样；传输失败→显式 problem |
| `sdkwork-log` `CaptureBody`（响应 tee） | 一直是旁路 tee | ✅ 安全（不变） |
| cloudrouter `invocation_http::normalize_gateway_error_protocol` | 读 64 KiB 后**有意**改写为协议错误信封 | ✅ 安全（有意替换，不是静默丢失） |
| `sdkwork-api-cloudrouter-assembly::provision_accounts_after_registration` | 注册成功的响应体读取失败 → `Body::empty()`：**2xx 却返回空 body** | ✅ **已修**：先判预算→放不下则跳过开通并原样返回；传输失败→显式 502 |
| `sdkwork-webserver` `data_plane/subrequest.rs` | 尺寸/未知长度分支本就原样透传；仅传输失败分支 → `Body::empty()` | ✅ **已修**：传输失败→显式 502 problem |
| `sdkwork-webserver` `data_plane/cgi_cache.rs` | 同上（尺寸分支已透传未缓存） | ✅ **已修**：传输失败→显式 502 problem（并保留 HEAD 抑制语义） |

### 5.7 框架级契约（已写入标准，防止再犯）

规则已固化到两处权威：

- **跨仓权威**：`sdkwork-specs/WEB_FRAMEWORK_SPEC.md` **§11.1「Non-Destructive Body Observation」**
  + §14 回归要求（提交 `28158a2`）；
- **框架仓标准**：`sdkwork-web-framework/specs/WEB_FRAMEWORK_STANDARD.md` **§10.1** + §11（提交 `6a700ca`）。

并配套可执行契约模块 `sdkwork_web_core::body_contract`：

- `may_buffer_whole(body, budget)`：**在读取之前**判断"这个 body 能否整包缓冲并回放"。
  未声明长度（chunked/streaming）一律判为不可，从而强制走"不读 / tee"。
- 模块文档（`crates/sdkwork-web-core/src/body_contract.rs`）写明两种合法形态（回放 / 透传）、
  禁止写法（`unwrap_or_else(Body::empty)` 重建消息）、以及这次的故障成因。

**落地提交与验证（全量）**

| 仓库 | 提交 | 内容 |
|------|------|------|
| `sdkwork-specs` | `28158a2` | §11.1 规范 + §14 回归要求 |
| `sdkwork-web-framework` | `6a700ca`、`89e546d` | body_contract、problem/interceptors 响应修复、标准 §10.1、响应侧回归用例 |
| `sdkwork-log` | `dc89d05`、`d18fb4a`、`82fee4a` | 请求日志 tee、混合回放、捕获预算 1 MiB 可配 |
| `sdkwork-cloudrouter` | `884074d7`、`d41f9e9f`、`44507a5b`、`919de7ad`、`0c9b44e8`、`38d806dc`、`7bafaf6f` | locale 本地化、注册响应、请求日志接入说明、runbook |
| `sdkwork-webserver` | `24ad62db` | subrequest / cgi_cache 传输失败显式 502 |
| `sdkwork-api-cloud-gateway` | `c2bec55`、`2c94b16` | 依赖错误体观测、`Cargo.lock` 锁定一致性 |

| 验证命令 | 结果 |
|---|---|
| `cargo test -p sdkwork-web-core --lib` | **258 passed / 0 failed**（含 `body_contract` 契约用例与 `problem::tests::oversized_problem_body_is_left_untouched`） |
| `cargo test -p sdkwork-log-tower-adapter --lib` | **11 passed**（含 1 MiB / 8 MiB 逐字节转发） |
| `cargo test -p sdkwork-api-log-assembly --lib` | **3 passed**（捕获预算） |
| WSL `cargo test -p sdkwork-cloudrouter-http --lib locale` | **16 passed**（含 `oversized_problem_body_is_left_untouched`） |
| WSL `cargo test -p sdkwork-api-cloud-gateway --lib dependency_error_observer` | **2 passed**（超预算 5xx 原样透传 / 预算内逐字节回放） |
| WSL `cargo check -p sdkwork-cloudrouter-http` | **exit 0**（连带 `sdkwork-web-bootstrap`、`sdkwork-iam-web-adapter`） |
| WSL `cargo check -p sdkwork-api-cloudrouter-assembly` | **exit 0**（连带 `sdkwork-cloudrouter-edge-runtime` 全模块） |
| WSL `cargo check -p sdkwork-api-cloud-gateway --lib` | **exit 0** |
| WSL `cargo check -p sdkwork-api-webserver-standalone-gateway` | **exit 0** |
| WSL `cargo metadata --locked`（gateway） | **exit 0** |
| `node ../sdkwork-specs/tools/check-body-read-contract.mjs --workspace .` | **exit 0**（全工作区 3 处带理由白名单，0 违规） |
| `node --test tools/check-body-read-contract.test.mjs` | **7 passed** |

> Windows 本机因 MSVC `lib.exe` 无法创建临时文件（`LNK1104`，环境问题）无法编译含 C 依赖的 crate，
> 因此跨仓库验证统一在 WSL/Linux 完成——这也与生产镜像的构建环境一致。

### 5.8 穷尽核对结果：0 处待修

对"读取后可能丢内容"的形态做了三轮全工作区扫描（排除 `external/`、`target/`、`tests/` 目录）：

| 扫描 | 判据 | 命中 | 结论 |
|------|------|------|------|
| ① 请求方向读取 | `to_bytes(` / `BodyExt::collect` / `body_hint` / `AxumBody::empty` | 423 处 `to_bytes` 调用点 | 逐点分类见 §5.3；请求侧破坏点只有 request log 一处（已修），其余为回填/拒绝/末端单次读取 |
| ② 响应方向读取 | `response.into_body()` / `body_mut()` / `into_parts()` | 257 处 | 破坏性"读完用空 body 顶上"共 **4 处**，全部定位并处置（见 §5.6） |
| ③ 空 body 重建 | `from_parts(parts, Body::empty())` | 4 处 | 3 处属设计（①`drain_bounded_request_body` 把 body 取成 `collected` 交给调用方；②`drain_bounded_request_body` 有意丢弃；③WebSocket 101 无 body），1 处真缺陷（注册响应）已修 |

结论：**请求流与响应流的"读取后丢内容"形态已全部处置，待修 0 处。**

### 5.9 修复上线前的客户端止血

在 **< 256 KiB 请求体**内完成会话（提前压缩/裁剪上下文，或拆分会话）——这是唯一不依赖发版的规避手段。
（发版后该限制消失：`/v1` 链路可正常接收至框架 16 MiB / 网关与 CloudRouter 25 MiB。）

### 5.10 商业化交付清单

| 交付项 | 状态 |
|--------|------|
| 根因定位（可复现、边界精确 262144） | ✅ |
| 非破坏性读取契约（跨仓规范 §11.1 + 框架标准 §10.1 + 可执行模块 `body_contract`） | ✅ |
| 全工作区穷尽核对（请求 423 点 / 响应 257 点 / 空 body 重建 4 点） | ✅ 0 处待修 |
| 修复实现（6 个仓库）+ 回归用例 | ✅ 全部已提交并推送 `main` |
| 跨仓编译验证（WSL/Linux：cloudrouter-http、cloudrouter-assembly、gateway、webserver） | ✅ |
| 单测（web-core 258、log-adapter 11、log-assembly 3） | ✅ |
| 运行手册（证据链 / 复现脚本 / 尺寸上限链 / 提交清单 / 交付清单） | ✅ |
| 版本号 + release notes | ✅ `0.1.134`（gateway `4d52eee`，已推送）；同时修正 `--locked` 依赖图（`2c94b16`） |
| release 二进制（WSL/Linux，`--release`） | ✅ `sdkwork-api-cloud-gateway` 38.8 MB（8m07s）、sidecar `sdkwork-intelligence-knowledgebase-rpc-bin` 41.2 MB（5m52s） |
| 安装包产出（`package-server.mjs`，无需 Docker） | ✅ `dist/server/sdkwork-api-cloud-gateway-0.1.134-linux-x64-standalone-server.tar.gz`（71 MB，**validated**；含两个二进制、config、模型数据、`checksums.sha256`）——这正是 `docker build` 的上下文输入 |
| 镜像构建 `registry.sdkwork.com/apps/sdkwork-api-cloud-gateway:0.1.134` | ⛔ 仅剩 `docker build` 一步：本机 Windows 无 `docker`、WSL 无 daemon → 需 Docker 构建机或经 `DOCKER_HOST=ssh://主机` |
| 生产部署 + 冒烟 + 回滚预案 | ⏳ 待人工确认窗口（回滚目标 `0.1.132`） |

**构建/部署命令卡（在具备 Docker 的 Linux 构建机上执行）**

```bash
# 1) 构建（tag 来自 agent.app.config.json -> release.currentVersion = 0.1.134）
bin/docker-image.sh build --image-tag 0.1.134
bin/docker-image.sh push  --image-tag 0.1.134     # 推到 registry.sdkwork.com

# 2) 部署（生产变更需 --yes 与人工确认窗口）
bin/docker-deploy.sh upgrade --environment production --image-tag 0.1.134 --yes

# 3) 冒烟（判据见 §4.3：262146 / 268301 / 1422525 应返回 503 model is not available…）
bin/docker-deploy.sh status --environment production

# 4) 回滚预案
bin/docker-deploy.sh rollback --environment production --to 0.1.132 --yes
```

> 备选：若构建机与生产主机之间可 SSH，也可用 `DOCKER_HOST=ssh://ubuntu@api.birdcoder.com`
> 借生产主机 daemon 构建（脚本用 `spawn docker`，会继承该环境变量）。但这会把一次完整
> release 编译压在生产机上，**只在确认窗口内、并接受短时资源争用时**才使用。

**构建能力实测矩阵（2026-11-25）**

| 环境 | `cargo` | `docker` | 可用于 |
|------|---------|----------|--------|
| 本机 Windows | ✗ | ✗ | 仅代码/校验 |
| WSL `Ubuntu-22.04` | ✓ `cargo 1.99.1` | CLI 有、**daemon 无** | 只能产出 release 二进制 |
| 生产主机 `api.birdcoder.com` | ✗ | ✓ `docker 29.7.2`（8 核 / 30 GB） | 只能 `docker build` |

因此只有两种可行路径：

- **A（推荐）**：一台同时具备 `cargo` + `docker` 的 Linux/CI 构建机，直接
  `bin/docker-image.sh build --image-tag 0.1.134`；镜像上下文需要两个 release 二进制
  （`sdkwork-api-cloud-gateway` 与 sidecar `sdkwork-intelligence-knowledgebase-rpc-bin`）。
- **B（两段式）**：WSL 内 `cargo build --release` 产出上述两个二进制 → 以
  `DOCKER_HOST=ssh://ubuntu@api.birdcoder.com` 运行同一个打包脚本，让 `docker build` 在主机
  daemon 上完成（上下文含二进制，随 SSH 传输）。属生产资源争用，需窗口。
- **C（CI）**：`gh` 已登录 `sdkwork-ai`，`package.yml` 支持 `workflow_dispatch`
  （`tag` / `package_version` / `deployment_profile` / `runtime_target` / `platform` /
  `architecture`）。**但当前不可用**：仓库只有 `SDKWORK_RELEASE_SIGNING_PRIVATE_KEY` 与
  `SDKWORK_RELEASE_TOKEN` 两个 secret，缺 `SDKWORK_CONTAINER_REGISTRY_USERNAME` /
  `SDKWORK_CONTAINER_REGISTRY_PASSWORD`（容器发布钩子需要），且没有任何 repo vars
  （`dependency_refs_json` 里的 `SDKWORK_*_REF` 全为空）。补上这两组配置即可用 CI 出镜像。

---

## 附录 A：原始排查计划（已被 §3.4 直接确认取代）

| 优先级 | 动作 | 说明 |
|--------|------|------|
| ~~P0~~ | ~~构建 `0.1.133`（仅加埋点）并部署~~ | 已不需要：消费点由 §3.4 的代码审阅 + 边界实验直接确认 |
| ~~P0~~ | ~~埋点确认后修消费点 + 回归用例~~ | 已由 §5.1 完成 |
| **P1** | 客户端止血 | 见 §5.9 |
| **P1** | `invocation_body_from_http` 的诚实化 | 见 §5.4 第 5 条 |
| **P2** | 观测补齐 | 网关访问事件记录"缓冲后长度"，使此类问题不必再靠 WARN 反推 |

---

## 6. 本次处置范围（可审计）

- **只读**：`docker logs/inspect`、`psql SELECT`、nginx 配置与日志读取、`curl` 探测。
- **一次临时写入**：为完成鉴权定位，在 `iam_gateway_api_key` 插入了一张诊断 Key
  （`id = 990000000000000777`，`name = zz-diagnostic-body-probe`，`status = 1`，
  绑定既有 tenant/user/account_group，`key_secret_mode = 'none'`），
  **全部探测在同一个脚本内完成并立即 `DELETE`**（`trap` 兜底），已复核删除。
- 未修改任何配置文件、未重启任何容器、未改动既有 Key、订单、账单或路由数据。
- 诊断过程中使用的请求均指向不存在的模型，**未产生任何上游调用**。

---

## 7. 附录：复现命令（可在网关主机执行）

```bash
# 判据探针（需要一张有效 Key；用不存在的 model，不产生上游调用）
KEY='<valid-key>'
for size in 250000 262126 262146 300000; do
  python3 -c "import json,sys;sys.stdout.write(json.dumps({'model':'zz-probe/nonexistent-model','messages':[{'role':'user','content':'x'*$size}]}))" > /tmp/p.json
  echo -n "bytes=$(stat -c%s /tmp/p.json) -> "
  curl -s -H 'Host: api.birdcoder.com' -H 'content-type: application/json' \
       -H "x-api-key: $KEY" --data-binary @/tmp/p.json \
       http://127.0.0.1:3913/v1/chat/completions \
    | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('code'),d.get('detail'))"
done

# 网关侧对照日志
docker logs sdkwork-api-cloud-gateway-production-i1-gateway-1 --since 10m 2>&1 \
  | sed -e 's/\x1b\[[0-9;]*m//g' | grep 'received an empty request body' | cut -c1-400
```





