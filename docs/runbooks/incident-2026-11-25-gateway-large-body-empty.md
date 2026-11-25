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

**一句话**：中转站对 `POST /v1/*` 的请求体在**超过 262144 字节**时会在网关内部某一步被消费掉，
下游 CloudRouter 只看到空请求体，于是返回
`400 40002 request body is empty for openai.chat_completions`。
客户端和 nginx 都是清白的。

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

> 代码侧（`sdkwork-web-framework`、`sdkwork-api-cloud-gateway`、`sdkwork-cloudrouter` 的
> `main`）在上述链路中**没有** 262144 字节的请求体上限，也没有"读失败后继续用空 body"
> 的实现；且三个仓库的本地 `main` 与 `origin/main` 一致（无未推送提交），部署镜像即这些
> 提交。因此**确切的消费点仍需一次带埋点的构建（0.1.133）来承接**，见 §5。

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

## 5. 下一步（按顺序）

| 优先级 | 动作 | 说明 |
|--------|------|------|
| **P0** | 构建 `0.1.133`（仅加埋点）并部署 | 在两个位置各打一条 WARN：`enforce_request_body_limit` 结束时的 `buffered_len`（含原始 `content-length`）、`dispatch_application_request` 进入 `oneshot` 前的 `body.size_hint()`；再补一条 `invocation_body_from_http` 读取前的 `size_hint`。即可一次性锁定消费点 |
| **P0** | 埋点确认后修消费点 + 回归用例 | 用例直接复用 §4.3 的判据，把 `262144`/`262145` 固化为边界回归 |
| **P1** | `invocation_body_from_http` 的诚实化 | `declared_content_length > 0 && bytes.is_empty()` 时应返回 5xx `request_body_not_delivered`（而不是 400 误导性 "request body is empty"），并保留 `declared/read` 两个数字 |
| **P1** | 客户端止血 | 在修复上线前，让会话在 **< 256 KiB 请求体**内完成（提前压缩/裁剪上下文，或拆分会话）；这是唯一不依赖发版的缓解手段 |
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
