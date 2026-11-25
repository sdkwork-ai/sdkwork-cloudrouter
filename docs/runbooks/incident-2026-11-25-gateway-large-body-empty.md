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

### 5.1 已落地（兄弟仓库 `sdkwork-log`，提交 `dc89d05`）

捕获改为**旁路 tee**：转发给下游的永远是原始字节流，日志只保留有界前缀。

| 文件 | 变更 |
|------|------|
| `crates/sdkwork-log-tower-adapter/src/capture.rs` | 新增 `RequestCaptureBody<B>`：逐帧原样透传，最多把 `max_body_bytes` 字节写入共享缓冲；错误帧原样上抛 |
| `crates/sdkwork-log-tower-adapter/src/middleware.rs` | 删除"按上限决定是否读取、再用手里的捕获结果重建请求"的逻辑，改为 `AxumBody::new(RequestCaptureBody::new(body, ..))`；`request_body` 在 save 任务里从共享缓冲生成 |
| `crates/sdkwork-log-tower-adapter/src/lib.rs` | 导出 `RequestCaptureBody`；`DEFAULT_MAX_BODY_BUFFER_BYTES` 文档改为"保留前缀"而非"超限跳过" |
| `crates/sdkwork-log-tower-adapter/Cargo.toml` + `Cargo.lock` | dev-dependencies 补 `async-trait` 与 `sdkwork-log-store-sqlx` 的 `postgres` feature（否则测试图里 `DatabasePool` 没有变体） |

修复后语义：

- 任意大小 / 任意 framing（含 chunked）的请求体 **逐字节**到达 handler；
- 日志行只保存 ≤ 256 KiB 的红acted 前缀（`[TRUNCATED]` 标记），内存与存储仍有界；
- 传输错误按原样上抛，不再出现"静默空 body"。

验证命令与结果：

| 命令 | 结果 |
|------|------|
| `cargo test -p sdkwork-log-tower-adapter --lib --offline` | **9 passed / 0 failed**（含新增 `oversized_request_body_is_forwarded_byte_for_byte`、`small_request_body_is_forwarded_and_recorded_in_full`） |
| `cargo test -p sdkwork-log-tower-adapter --offline` | **全绿**（含既有持久化集成用例） |
| `cargo check -p sdkwork-api-log-assembly` | **exit 0** |
| `cargo check -p sdkwork-log-tower-adapter --lib` | **exit 0** |

> 未能在本机编译 `sdkwork-cloudrouter-edge-runtime` 做端到端确认：该 crate 存在既有阻塞
> （`passthrough.rs` 对 `BillingMeter::DocumentPage` 的非穷尽匹配，与本修复无关）。
> 本修复没有改动该层的公共 API（仅新增一个导出类型），消费侧无需改动。

### 5.2 上线所需动作（还需一次发版）

1. bump `release.currentVersion` 后用 `bin/docker-image.sh build` 重建网关镜像（镜像内嵌 `sdkwork-log` 的编译产物）。
2. `bin/docker-deploy.sh upgrade --environment production --yes`。
3. 回归判据（§4.3）：`262146 / 268301 / 1422525` 应返回 `503 50301 model is not available…`（说明 body 已送达），
   `≤262144` 仍正常；同时确认 request log 行仍按前缀记录、`Permanent` 保留策略不变。

### 5.3 同模式缺陷（已发现，本次未改）

| 位置 | 问题 |
|------|------|
| `sdkwork-webserver/.../data_plane/subrequest.rs:242` | `Ok(collected) => Some(..), Err(_) => None`，同样是"读取失败后继续用空 body" |
| `sdkwork-webserver/.../data_plane/cgi_cache.rs:206` | 同上 |
| `invocation_body_from_http` | 建议把 `declared_content_length > 0 && bytes.is_empty()` 判为 5xx `request_body_not_delivered`，而不是误导性的 400 "request body is empty" |

### 5.4 修复上线前的客户端止血

在 **< 256 KiB 请求体**内完成会话（提前压缩/裁剪上下文，或拆分会话）——这是唯一不依赖发版的规避手段。

---

## 附录 A：原始排查计划（已被 §3.4 直接确认取代）

| 优先级 | 动作 | 说明 |
|--------|------|------|
| ~~P0~~ | ~~构建 `0.1.133`（仅加埋点）并部署~~ | 已不需要：消费点由 §3.4 的代码审阅 + 边界实验直接确认 |
| ~~P0~~ | ~~埋点确认后修消费点 + 回归用例~~ | 已由 §5.1 完成 |
| **P1** | 客户端止血 | 见 §5.4 |
| **P1** | `invocation_body_from_http` 的诚实化 | 见 §5.3 |
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
