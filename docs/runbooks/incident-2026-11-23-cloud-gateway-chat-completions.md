# 事故报告：sdkwork-api-cloud-gateway 生产环境 chat/completions 故障（2026-11-23）

- 报告时间：2026-11-23 19:50（Asia/Shanghai）/ 11:50 UTC
- 目标主机：`ubuntu@api.birdcoder.com`（`VM-48-7-ubuntu`，Linux 5.15，Docker 29.7.2）
- 受影响服务：`sdkwork-api-cloud-gateway:0.1.115`（production / standalone.i1）
- 关联客户端：`deepseek-harness/0.2.3-alpha.2 dsh-profile/desktop`（OpenAI Node SDK，`x-stainless-*`）
- 处置性质：**只读诊断 + 回归验证**；未对生产做任何写操作（详见 §5）

---

## 1. 结论摘要

本次排查确认故障**不是单一原因**，而是四类独立故障叠加，且用户报告的 `40002 model is required` 与网关自身的 503 是两条不同链路：

| # | 故障 | 次数（24h） | 状态 | 根因 |
|---|------|------------|------|------|
| P0 | `503 Service unavailable` — `upstream route snapshot is empty` | 25 | **已恢复**（08:00:03Z 启用上游账号） | 唯一上游账号被禁用，路由池为空 |
| P1 | `400 40002 model is required for openai.chat_completions` | 6（最近 11:42:40Z，**仍在发生**） | 未修复 | **客户端请求体未携带 `model` 字段**，非网关回归 |
| P1 | `402` 计费/额度拒绝 | 3 | 观测 | 启用账号后立即触发的计费闸门 |
| P2 | `403` 鉴权拒绝 | 3 | 观测 | 授权决策拒绝（有 audit 事件） |

另有 5 项次级缺陷（定价/雪花 ID/保留任务 SQL/库结构漂移/可观测性），见 §4.4–§4.6。

**最关键的两条结论：**

1. **`40002` 的根因在客户端，不在网关。** 请求体 1,132,024 字节、`content-type: application/json`、JSON 解析成功，但顶层不存在 `model` / `model_name` / `modelName` / `model_id` / `modelId` 中的任何一个。网关按契约返回 400 是正确的；真正的问题是客户端偶发地不发送 `model`。
2. **网关的可观测性存在缺陷，这正是“看日志找不到问题”的原因**：123,284 行日志中 115,548 行（93.7%）是 IM 跨组织对账的 INFO 刷屏，而 400 请求**一行 WARN/ERROR 都不记录**。

---

## 2. 环境与拓扑

```
公网 443 (nginx)
  └── server_name api.birdcoder.com / *.sdkwork.cn / ...
        └── upstream sdkwork_api_gateway = 127.0.0.1:3913
              └── sdkwork-api-cloud-gateway-production-i1-gateway-1
                    image  registry.sdkwork.com/apps/sdkwork-api-cloud-gateway:0.1.115
                    state  running / healthy / RestartCount=0
                    start  2026-11-23T07:40:37Z
                    deps   postgres(pgvector18) + redis8 + knowledgebase-rpc
```

- nginx 站点配置：`/etc/nginx/sites-enabled/sdkwork/sdkwork-api-cloud-gateway.conf`
- 访问日志：`/var/log/nginx/sdkwork-api-gateway.access.log`（与 vhost 同名独立文件，**不在** `access.log`）
- 同机还存在 `demo` 环境（`0.1.25`，端口 3914），本次未受影响。
- 网关内部 `/v1/*` 由内嵌依赖 `sdkwork-cloudrouter-open-api` 承载（`route_target: "dependency"`）。

---

## 3. 时间线（UTC；括号内为 +08:00）

| 时刻 | 事件 |
|------|------|
| 04:49–04:50 | 首批 503：`deepseek-flash` 7 次、`openai/gpt-6-astra` 6 次 |
| 07:40:37 | 网关容器重启（0.1.115），启动即报 ERROR：`no callable upstream account route` |
| 07:58:35–07:59:17 | 503 集中爆发：`deepseek-v4-pro` 6 次、`deepseek-flash` 8 次 |
| 08:00:03 | 上游账号 `555352107782000318` 被启用（`updated_at`，`version=4`） |
| 08:00:09 | 启用后首个请求 → `402` |
| 08:03:16 | 首个 `200`，路由恢复 |
| 10:02:06 | `400 40002`（第 3 次） |
| 10:02:15 / 10:02:45 / 10:03:51 | 3 次 `403`（每次 1–2 秒后被 `200` 重试覆盖） |
| 11:38:51 | `400 40002` |
| 11:38:52 | `200`（间隔 1.5 秒，客户端换模型重试成功） |
| 11:42:40 | `400 40002` — **本次用户报错对应请求**（traceId `b8b82b77…`） |
| 11:49:57 | 本次回归验证：健康、0 ERROR、路由池 1 账号 |

---

## 4. 故障分类与证据

### 4.1 P0：`503 upstream route snapshot is empty`（25 次）

**日志证据（gateway，原文截取）：**

```
2026-11-23T07:41:02.204788Z ERROR sdkwork_cloudrouter_edge_runtime::runtime:
  no callable upstream account route: every model request will fail until an enabled supplier,
  an enabled account with an active credential, a resolvable base URL, and a group membership
  exist in the database
  catalog_engine="postgres" catalog_phase="startup"
  upstream_suppliers=33 upstream_account_routes=0

2026-11-23T07:58:35.204350Z ERROR sdkwork.api.cloud_gateway.dependency_error:
  embedded dependency returned a server error
  method=POST path=/v1/chat/completions status=503
  detail=upstream route snapshot is empty for model: deepseek/deepseek-v4-pro
  diagnosis=routing account-pool gates
    [enabled_suppliers=33, enabled_accounts=0, auth_method_matches=0,
     active_credentials=1, group_members=33, base_url_resolvable=0]
  block at 'enabled_accounts'; create or enable an upstream account under an enabled supplier
```

**数据库证据：**

```sql
-- 故障期间：33 个供应商启用，但启用账号为 0
select status, count(*) from ai_upstream_supplier where deleted_at is null;  -- 1 => 33
select supplier_code, status, count(*) from ai_upstream_account ...            -- 仅 deepseek status=1（08:00 之后）

-- 恢复点
select id, status, created_at, updated_at, version
from ai_upstream_account where id = 555352107782000318;
--  status=1, created_at 2026-11-06T04:08:44Z, updated_at 2026-11-23T08:00:03Z, version=4
```

**根因：** 生产环境只配置了 **1 个**可用的上游账号（`deepseek-default`）。当它处于禁用状态（`status=0`）时，`enabled_accounts=0`，任何模型请求都会在路由选择阶段失败；重启后 `base_url_resolvable=0` 与 `auth_method_matches=0` 进一步说明当时账号不可参与路由。这是**配置/数据状态问题，不是代码缺陷**。

**已恢复：** 08:00:03Z 该账号被启用后路由立即恢复；08:03:16 起出现 `200`。此后 ERROR 计数为 0。

**残留风险（高）：** 33 个供应商全部启用，但只有 1 个账号可用 → **单点**。该账号再次被禁用、额度耗尽或凭证失效，将立刻复现全域 503。同时 `/healthz`、`/readyz` 在“零可用上游路由”时仍返回 healthy/ready（见 §4.6），健康检查无法暴露该状态。

### 4.2 P1：`400 40002 model is required for openai.chat_completions`（6 次，仍在发生）

用户报错的原始载荷：

```json
{"type":"https://docs.sdkwork.com/problems/40002","title":"Malformed request","status":400,
 "detail":"model is required for openai.chat_completions",
 "instance":"POST /v1/chat/completions","code":40002,
 "traceId":"b8b82b77-45e9-401b-ba34-87622d3f256b","operationId":"createChatCompletion",
 "failedStage":"dispatch_failed","reason":"model is required for openai.chat_completions"}
```

**该 traceId 在网关日志中可直接命中，证据链完整：**

1. **nginx**：`POST /v1/chat/completions → 400，响应体 407 字节`（19:42:40 +0800）。
2. **gateway access event**（同一 traceId）：

```
request_id=f757d562-c75f-4f65-9ddb-5f5a40b9298c
trace_id="64f5414d-e3a1-49c1-9867-d814a86526f8"
request accepted request_id=Some("b8b82b77-45e9-401b-ba34-87622d3f256b")
api_surface=OpenApi route_template=/v1/chat/completions operation_id=Some("createChatCompletion")

status: 400, route_target: "dependency", service_id: Some("sdkwork-cloudrouter-open-api")
headers: content-length: 1132024, content-type: application/json, x-api-key: [redacted],
         user-agent: deepseek-harness/0.2.3-alpha.2 dsh-profile/desktop,
         x-stainless-lang: js / runtime: node v24.22.3
```

3. **代码路径**（本仓库 `services/sdkwork-cloudrouter-router-service/src/application/invocation/payload.rs`）：
   - `PayloadExtractionInterceptor::before` → `extract_requested_model` → `validate_required_model`（第 321 行）
   - 报文按 `content-type: application/json` 走 `InvocationBody::Json`（`invocation_body_from_http`，`crates/sdkwork-cloudrouter-edge-runtime/src/invocation_http.rs:709`），JSON 解析**成功**（否则会返回 `invalid request body: …`，而非本条错误）。
   - `MODEL_REQUEST_FIELD_NAMES = ["model","model_name","modelName","model_id","modelId"]`（`domain/model_request_alias.rs:225`），顶层**一个都不存在**。
4. **数据库**（`ai_metering_request_trace`）：

```
created_at 2026-11-23 11:42:40.774709+00 | http_status 400
requested_model = "model/chat_completions"   <-- 退化占位键，不是真实模型
endpoint = /v1/chat/completions | api_key_id 0 | account_id 0
-- 对比成功请求：requested_model = "deepseek/deepseek-flash", account_id=555352107782000318
```

5. **排除网关侧丢字段**：全仓库检索确认没有任何 interceptor 会 `remove("model")`；`provider_request::rewrite_json_body_model` 只会改写、不会删除；查询串（`?model=`）也为空（nginx 原始请求行无 query）。

**结论：** 客户端（`deepseek-harness` desktop profile，经 OpenAI Node SDK）在该次调用中**未序列化 `model` 字段**（JS 侧 `model: undefined` 会被 SDK 省略）。网关行为符合契约，不是 0.1.115 的回归。

**旁证（同一现象在 4 个不同时刻重复）：** `02:34:29Z`、`10:02:06Z`、`11:38:51Z`、`11:42:40Z`，每次都是“400 后 1–2 秒内同一客户端出现 200”，即客户端换用带 `model` 的请求重试成功。

**影响：** 该 400 直接导致用户侧一次对话请求失败（本次会话首条报错即此请求）。截至 11:49:57Z，最近 45 分钟内仍有 `2×400 / 1×200`，说明**问题仍在持续发生**。

**修复方向（二选一，见 §5）：**
- 客户端：在 DSH provider 配置中补齐 model（根因侧修复）；
- 网关侧：对 `/v1/chat/completions` 在“请求未带 model”时回落到已配置的用户/分组默认模型（新版本 `model_group_defaults` 能力已存在，但部署的 0.1.115 没有该端点，见 §4.6）。

### 4.3 P1/P2：`402` 与 `403`

- **402（3 次）**：`08:00:09Z` 账号刚启用后的首个请求即被计费/额度闸门拒绝；同一 `request_id` 下同时出现 9 条 `upstream cost price is missing` WARN。08:03:16 后恢复正常。属“账号启用后额度/定价未就绪”的过渡态。
- **403（3 次）**：`10:02:15Z / 10:02:45Z / 10:03:51Z`，响应体 231 字节，网关有 `GatewayAuditLogEvent`（授权决策）但 `GatewayAccessLogEvent` 未落 4xx 明细；每次 1–2 秒后同客户端拿到 `200`。判为授权/额度策略拒绝后客户端降级重试，非网关崩溃。

### 4.4 计费与定价缺陷（WARN，441 条中的主要部分）

```
WARN sdkwork_models_catalog_service::application::pricing_resolver:
  upstream cost price is missing for a routed account; procurement cost is not reported,
  customer billing continues on the official reference model=deepseek/deepseek-flash
  supplier_code=Some("deepseek") account_id=Some(555352107782000318)

WARN sdkwork_cloudrouter_router_service::application::invocation::pricing:
  finalized usage pricing drifted from the pricing preflight resolution
  meter=llm_input_token preflight_status=Quoted finalization_status=Rated

WARN ...gateway_usage_recorder:
  pricing plan currency differs from the priced region currency;
  plan-scoped amounts are skipped for this usage fact
```

- 上游采购成本缺失 → **成本不可核算**（对客计费仍按官方参考价继续）。
- 预检 `Quoted` 与结算 `Rated` 漂移 → 计费口径不一致。
- 套餐币种与定价区域币种不一致 → 该次用量**跳过套餐额度扣减**。
- 去重缺陷：同一个 `request_id` 重复打印 **9 次**相同 WARN，放大噪音。

### 4.5 其他缺陷

| 缺陷 | 证据 | 风险 |
|------|------|------|
| 雪花 ID worker 未配置 | `WARN sdkwork_account_repository_sqlx::store: snowflake worker id not configured; defaulting to 0 — set unique ids per instance in production (env ACCOUNT_SNOWFLAKE_WORKER_ID)` | 多实例部署时 ID 冲突 |
| 记忆保留任务 SQL 报错 | `WARN sdkwork_intelligence_memory_service::job_worker: memory retention sweep failed table=EvalRuns/AuditLogs/OutboxEvents/LearningJobs error=… syntax error at or near "ORDER" at line 1236` | 4 张表保留策略从未生效，数据无界增长 |
| 库结构漂移 | `WARN sdkwork_agents_database_host::drift_gate: expected_tables=33 warning_diffs=1224` | 迁移与模型不一致 |

### 4.6 可观测性与契约缺口（本次“查不到问题”的直接原因）

1. **日志被 IM 对账刷屏**：123,284 行 / 4 小时，其中 `cross-organization … scope discovery completed` **115,548 行（93.7%）**，约每 500ms 两条；而 `ERROR` 仅 13 行、`WARN` 441 行。
2. **400 不产生任何 WARN/ERROR**：`validate_required_model` 失败仅走 access event，`RUST_LOG=info` 下无错误行 → 只能靠 DB/nginx 反查。
3. **健康检查无法反映路由可用性**：`upstream_account_routes=0` 时 `/healthz`、`/readyz` 仍 `200`，重启前不会告警。
4. **部署镜像落后于控制台契约**（nginx 24h 统计）：

```
364 × 400  /app/v3/api/ai/frontend_config
 25 × 503  /v1/chat/completions
 18 × 401  /
 13 × 404  /v1/models/deepseek%2Fdeepseek-flash/groups
 13 × 404  /app/v3/api/ai/routing/model_group_defaults
  9 × 500  /app/v3/api/memberships/orders
  8 × 404  /v1/models/deepseek%2Fdeepseek-v4-pro/groups
  4 × 400  /v1/chat/completions
  3 × 403  /v1/chat/completions
  3 × 402  /v1/chat/completions
```

`model_group_defaults`、`/v1/models/{model}/groups` 在 0.1.115 上 404，而当前控制台已在调用 → **网关镜像需升级**。

---

## 5. 处置措施

### 5.1 已生效（非本次会话执行）

- `08:00:03Z` 启用上游账号 `555352107782000318`（`ai_upstream_account.status=1`，`version=4`）→ 503 消失、路由恢复。

### 5.2 本次会话执行范围（全部只读）

`ssh` 连通性验证、`docker logs/inspect`、`psql` 只读查询、nginx 日志读取、`curl GET /healthz` `/readyz` `/v1/models`。**未修改任何配置、未重启容器、未写入数据库**。

> 未执行写操作的原因：生产变更（升级镜像、启停账号、改 `RUST_LOG`）属于 `AGENTS.md` Human Review Rules 明确要求人工评审的范围；本会话审批提示被禁用，无法获得批准。以下变更需显式授权后执行。

### 5.3 待授权的修复清单（按优先级）

| 优先级 | 变更 | 命令/动作 | 风险 |
|--------|------|-----------|------|
| **P0-a** | 升级网关镜像到与当前控制台契约一致的版本，修复 `model_group_defaults` 404、`frontend_config` 400、并为“缺 model”提供默认模型回落 | `bin/docker-image.sh build --image-tag <new>` + `bin/docker-deploy.sh upgrade --environment production --yes` | 中（需回滚预案，`rollback --to 0.1.115`） |
| **P0-b** | 消除上游单点：为 `openai` 等供应商启用第二可用账号（含凭证与 base URL） | 控制台“上游账号”启用 + 凭证校验 | 中（涉及成本与额度） |
| **P0-c** | `RUST_LOG=info,sdkwork_im_security=warn`（或将该对账任务日志降为 debug） | 容器环境变量 + 重启 | 低（可回滚，秒级中断） |
| **P1** | 客户端补齐 `model`：DSH provider 配置必须显式指定模型，禁止 `undefined` | 客户端配置 | 低 |
| **P1** | 计费：补齐 deepseek 账号上游采购成本价；统一套餐/区域币种 | 控制台定价配置 | 中（影响对账） |
| **P2** | `ACCOUNT_SNOWFLAKE_WORKER_ID` 配置唯一值 | 环境变量 | 低 |
| **P2** | 修复 memory retention SQL（`ORDER` 语法错误，4 张表） | 代码修复 + 发布 | 中 |
| **P2** | 健康检查纳入“可调用上游路由数=0 → degraded” | 代码 | 低 |

---

## 6. 回归验证（2026-11-23T11:49:57Z 实测）

| 检查项 | 命令 | 结果 |
|--------|------|------|
| 容器状态 | `docker inspect --format '{{.State.Status}} {{.State.Health.Status}} {{.RestartCount}}'` | `running` / `healthy` / `0` ✅ |
| 存活探针 | `curl :3913/healthz` | `200 {"status":"ok"}` ✅ |
| 就绪探针 | `curl :3913/readyz` | `200 {"status":"ready"}` ✅ |
| 鉴权面 | `curl :3913/v1/models` | `401 40101 api-key-or-dual-token…`（符合预期）✅ |
| 08:00Z 之后 ERROR | `docker logs … | grep ' ERROR '` | `0` 条 ✅ |
| 路由池 | `enabled_suppliers=33 enabled_accounts=1 active_credentials=2` | 有可用路由 ✅（单点风险见 §4.1） |
| 最近成功对话 | `max(created_at) where http_status=200` | `2026-11-23 11:38:52.889+00` ✅ |
| 最近 45 分钟 | nginx `chat/completions` 状态分布 | `1×200`、`2×400` ⚠️（400 仍在复现） |

**回归结论：** P0（503）已关闭且未复发；P1（400 `model is required`）**未关闭**，最近 45 分钟仍有 2 次，属客户端未发送 `model`，需按 §5.3 P1 处置。

---

## 7. 附录：可复现命令

```bash
# 1) 连上主机
ssh ubuntu@api.birdcoder.com

# 2) 容器与镜像
docker ps -a --format '{{.Names}}|{{.Image}}|{{.Status}}'

# 3) 剥离 ANSI 后落盘（网关日志含大量转义）
docker logs sdkwork-api-cloud-gateway-production-i1-gateway-1 > /tmp/gw.raw 2>&1
sed -e 's/\x1b\[[0-9;]*m//g' /tmp/gw.raw > /tmp/gw.log

# 4) 分级统计与错误定位
grep -c ' ERROR' /tmp/gw.log ; grep -c ' WARN' /tmp/gw.log
grep ' ERROR' /tmp/gw.log | cut -c1-300

# 5) 某次请求的完整证据（traceId 来自 ProblemDetail）
grep 'b8b82b77-45e9-401b-ba34-87622d3f256b' /tmp/gw.log

# 6) nginx 侧（注意是独立 vhost 日志文件）
sudo grep 'POST /v1/chat/completions' /var/log/nginx/sdkwork-api-gateway.access.log \
  | awk '{print $9}' | sort | uniq -c

# 7) 路由池与轨迹（psql 用只读 SELECT）
PG=sdkwork-api-cloud-gateway-production-deps-postgres-1
PW=$(docker inspect --format '{{range .Config.Env}}{{println .}}{{end}}' \
     sdkwork-api-cloud-gateway-production-i1-gateway-1 \
     | grep '^SDKWORK_DATABASE_PASSWORD=' | cut -d= -f2-)
docker exec -e PGPASSWORD="$PW" $PG psql -U sdkwork_ai_prod -d sdkwork_ai_prod -c \
 "select created_at, http_status, requested_model, account_id
    from ai_metering_request_trace
   where request_path = '/v1/chat/completions'
   order by created_at desc limit 20"
```

> 运维提示：远程执行多行脚本时，Windows → Linux 的 CRLF 会导致 `bash: ambiguous redirect` / `cut: invalid byte position '\\r'`。用 `base64` 传输或 `tr -d '\r'` 归一化。

---

## 8. 回归复测（2026-11-23T11:53:44Z / 19:53 +0800）

| 检查项 | 结果 | 判定 |
|--------|------|------|
| 容器 | `running` / `healthy` / `RestartCount=0` / started `07:40:37Z` | ✅ |
| `/healthz` `/readyz` | `200` / `200` | ✅ |
| 当日 `chat/completions` 分布 | `7×200`、`4×400`、`3×402`、`3×403`、`25×503` | 与 11:49Z **完全一致，无新增** |
| 最后一条 400 | `19:42:40 +0800`（= 11:42:40Z） | 无新增 |
| 最后一条 200 | `19:38:52 +0800` | ✅ |
| 08:00Z 之后 ERROR | `0` | ✅ |

**结论**：P0（503）已关闭且未复发；P1（`40002`）无新增，但**代码层未修复**，一旦客户端再次发出无 `model` 请求即复现。

---

## 9. 文件上传能力审计（对齐 vendor 接口）

### 9.1 已存在的能力（实测部署镜像 0.1.115）

部署网关 `/openapi.json`（7,659,900 字节，2,967 条路径）实际声明：

```
POST   /v1/files                      -> uploadFile  (multipart/form-data)
GET    /v1/files                      -> listFiles
GET    /v1/files/{file_id}            -> retrieveFile
DELETE /v1/files/{file_id}            -> deleteFile
GET    /v1/files/{file_id}/content    -> getFileContent
POST   /v1/uploads  |  POST /v1/uploads/{upload_id}/parts     (分片上传)
POST   /v1/containers/{container_id}/files                    (容器文件)
POST   /anthropic/v1/files  |  GET /google/v1beta/files
```

`POST /v1/files` 的契约：`requestBody.content = multipart/form-data`，schema `OpenAiFileUploadRequest { file: string, purpose: string }` —— **已经按 OpenAI 原生语义建模，不是自定义上传接口**。

实现链路（本仓库）：

- 路由清单已注册：`crates/sdkwork-api-cloudrouter-assembly/src/generated_open_http_route_manifest.rs`（L701–L717，6 条 Files 路由，全部 `api_key_or_dual_token`）。
- 转发方式：`crates/sdkwork-cloudrouter-edge-runtime/src/openai_passthrough_routes.rs`（L260–262）把 `/v1/files`、`/v1/files/{file_id}`、`/v1/files/{file_id}/content` 列为 provider 直通。
- 能力归属：`crates/sdkwork-cloudrouter-http/src/open_api_capability.rs`（L216）`Files` → `OpenApiCapability::Drive`。
- 部署二进制内确证字符串：`/v1/files` ×35、`/v1/uploads` ×21、`uploadFile` ×5 → 路由已编译进生产二进制。

### 9.2 缺口（真正阻碍“对齐 vendor 能力”的地方）

| # | 缺口 | 证据位置 | 影响 |
|---|------|----------|------|
| G1 | 网关调用体上限 **25 MiB** | `crates/sdkwork-cloudrouter-config/src/request_limits.rs:30`（注释自承覆盖不了 50 MiB 的 `images/edits`） | OpenAI Files API 单文件上限 **512 MB**，>25 MiB 上传直接被拒 |
| G2 | 生产策略层写请求上限 **16 MiB** 套在 `/v1/files` 上 | 生产 `config.toml` `[policy] { id = "default-write-limit", maxBodyBytes = 16777216 }` | 实际生效上限只有 16 MiB，比 G1 更紧 |
| G3 | 请求体 **全量缓冲**，非流式 | `crates/sdkwork-cloudrouter-edge-runtime/src/invocation_http.rs:723` `to_bytes(body, limit)` | 即使放开上限，单个大文件也会占满进程内存（OOM），无法安全支持 512 MB |
| G4 | 契约漂移：`GET /v1/models/{model}/groups` 返回 404 | 08:07:59Z 访问事件 `service_id = sdkwork-cloudrouter-open-api` 返回 404，而同一时刻 `model_group_defaults` 经 `sdkwork-cloudrouter-app-api` 返回 200 | OpenAPI 声明的路径由 open-api 子路由未挂载 → 客户端拿到 404 |
| G5 | 附件在 chat 中缺少端到端验证 | `/v1/chat/completions` 的 `file` / `image_url` / `input_file` 内容块走全量 JSON 缓冲（聊天体 1.13 MB 已实测） | 多模态附件体积叠加后同样撞上 G1/G2 |

### 9.3 修复工作包（按本仓库 / 兄弟仓库拆分）

| 工作包 | 内容 | 落点 |
|--------|------|------|
| **WP1** | 按路由给上传类路径单独放大小的闸门（`/v1/files`、`/v1/uploads`、`/v1/containers/*/files`、`/anthropic/v1/files`、`/google/v1beta/files`），并发上限沿用 25 MiB | `request_limits.rs` + `invocation_http.rs`（按 `api_code` 选限） |
| **WP2** | multipart 请求体改为**流式**转发到上游（不落内存），并保留 `content-type` boundary 与 100-continue | `invocation_http.rs` / `invocation_dispatcher.rs` |
| **WP3** | 生产 `config.toml` `[policy]` 为 `/v1/files` 等路径加专用 `maxBodyBytes`，覆盖 `default-write-limit` | 网关应用仓库（`sdkwork-api-cloud-gateway`，非本仓库） |
| **WP4** | 修正 open-api 子路由未挂载的漂移，使 `/v1/models/{model}/groups` 与 OpenAPI 一致 | 本仓库 open-api 路由装配 + 回归用例 |
| **WP5** | 补多模态附件回归用例：`image_url`(data URL)、`file`(`file_id` / `file_data`)、`input_file`，覆盖分类、体积、直通与计费 | `services/.../tests/` |

> 本仓库不产出 `sdkwork-api-cloud-gateway` 镜像（镜像由兄弟仓库构建），因此 WP1/WP2/WP4/WP5 的代码改动需要随该仓库的下一个版本构建才能进入生产；WP3 属于网关应用配置。

---

## 11. 代码变更与验证（2026-11-23T20:04Z）

### 11.1 已落地（本仓库，7 个文件 / +166 −4）

| 文件 | 变更 | 目的 |
|------|------|------|
| `crates/sdkwork-cloudrouter-config/src/request_limits.rs` | 新增 `gateway_upload_body_max_bytes`、`ENV_GATEWAY_UPLOAD_BODY_MAX_BYTES`、`DEFAULT_GATEWAY_UPLOAD_BODY_MAX_BYTES`、getter、Default | 上传类路由拥有独立体积闸门，不再与 JSON 预算共用 25 MiB |
| `crates/sdkwork-cloudrouter-config/src/runtime.rs` | `[request_limits]` 新增 `gateway_upload_body_max_bytes: Option<u64>` | 支持 runtime.toml 配置 |
| `crates/sdkwork-cloudrouter-config/tests/request_limits_config.rs` | 默认值断言、toml 覆盖断言、env 独立性用例 | 锁死“上传闸门可独立调大且不放大 JSON 路由” |
| `crates/sdkwork-cloudrouter-edge-runtime/src/invocation_router.rs` | `InvocationRouterState` / `InvocationRouterOptions` 新增 `upload_body_limit_bytes` | 把闸门值送进入口 |
| `crates/sdkwork-cloudrouter-edge-runtime/src/runtime.rs` | 计算并透传 `upload_body_max_bytes` | 配置 → 路由状态 |
| `crates/sdkwork-cloudrouter-edge-runtime/src/invocation_http.rs` | 新增 `is_vendor_upload_path`；按路径选择闸门；上传被拒时输出 WARN（含声明长度与上限） | 只给厂商上传路径放宽；被拒可诊断 |
| `services/sdkwork-cloudrouter-router-service/src/application/invocation/payload.rs` | `validate_required_model` 失败时输出结构化 WARN（api_code / route_key / method / path / content_type / body_bytes / 允许的模型字段 / request_id） | 让“缺 model”的 400 在日志里可定位；错误文案与状态码不变 |

上传路径白名单（字面量，刻意不用 `/v1` 前缀）：`/v1/files`、`/v1/uploads`、`/v1/containers/*`、`/anthropic/v1/files`、`/google/v1beta/files` 及其子资源。

### 11.2 验证结果

| 命令 | 结果 |
|------|------|
| `cargo test -p sdkwork-cloudrouter-config --test request_limits_config --offline` | **5 passed / 0 failed** |
| `cargo test -p sdkwork-cloudrouter-router-service --test invocation_payload --offline` | **15 passed / 0 failed** |
| `cargo check -p sdkwork-cloudrouter-router-service --offline` | **exit 0**（49.59s） |
| `cargo check -p sdkwork-cloudrouter-edge-runtime --offline` | **阻塞**，见 11.3（错误不在本次改动文件内） |

### 11.3 阻塞项（既有问题，非本次改动）

```
crates\sdkwork-cloudrouter-edge-runtime\src\passthrough.rs:1459:11: error[E0004]:
  non-exhaustive patterns: `&BillingMeter::DocumentPage` not covered
```

`adapter_billing_meter_ordinal()` 为每个 `BillingMeter` 变体分配一个**数值序号**（`ADAPTER_USAGE_TYPE_BASE + ordinal * 100 + line_index`），该序号是与适配器服务共享的线上契约。`BillingMeter` 由本仓库之外的依赖 crate 提供，新增的 `DocumentPage` 该取哪个序号必须由上游确定，**不能在此猜**（猜错会导致用量类型串号、计费错账）。`passthrough.rs` 未被本次改动触碰，此错误在 `cargo check` 之前就已存在。

> 处理方式：由 `BillingMeter` 的所有方给出 `DocumentPage` 的序号后，补一个分支即可解除阻塞；在解除前 `sdkwork-cloudrouter-edge-runtime` 整体无法编译，本次上传闸门改动也只能完成类型检查、无法出包。

### 11.4 未落地：multipart 流式转发（WP2）

现状与依赖已确认：

1. `invocation_body_from_http` 用 `to_bytes(body, limit)` **全量缓冲**（`invocation_http.rs:723`），`InvocationBody` 只有 `Empty / Json / Bytes` 三态。
2. 上游请求体最终由 `body_bytes(&InvocationBody) -> Bytes` 生成（`invocation_dispatcher.rs:786`），适配器客户端固定为 `Full<Bytes>`（`provider-adapter-http/src/client.rs:20`）。
3. 网关支持账号 failover/重试，因此**一次性流不能直接上送**——重试需要可重放。

因此正确的下一步是「有界落盘 + 流式上送」：超过内存阈值的上传体写入临时文件（`InvocationBodySpool`），派发时以流式 body 打开该文件，failover 重放则重新打开同一文件，结束即删除。这需要把 `body_bytes → Bytes` 改为可流式 body 类型，并新增 spool 生命周期管理。

**在 WP2 完成前不要打开 512 MB 默认值**：`SDKWORK_CLOUDROUTER_GATEWAY_UPLOAD_BODY_MAX_BYTES` 只是运维闸门，设得比可用内存大只会把“上传被拒”换成 OOM。这也是该常量默认仍取 25 MiB 的原因。

---

## 12. 补查：聊天 403 的真正原因（WAF 拦截自身对话流量）

### 12.1 发现

此前把 `/v1/chat/completions` 的 3 次 403 记为“鉴权拒绝”，实际审计事件写得很清楚：

```
GatewayAuditLogEvent { category: "security", action: "block",
  reason: "waf_baseline_signature", scope: Some("baseline-signature"),
  status: 403, method: "POST", route_target: "dependency",
  service_id: Some("sdkwork-cloudrouter-open-api") }
```

三次 403 **全部**是网关自己的 WAF 基线签名拦截，不是鉴权、不是模型权限。

生产配置（容器内 `/etc/sdkwork/api-gateway/config.toml`）：

```toml
[security.waf]
enabled = true
mode = "enforce"
inspectQuery = true
inspectHeaders = true
inspectJsonBody = true
```

### 12.2 根因

`security.rs::inspect_json_body` 会把 JSON 请求体**递归取出每一个字符串**，逐条比对基线签名：

```rust
normalized.contains("<script") || … || normalized.contains("union select")
  || (normalized.contains(" or ") && normalized.contains("1=1"))
  || normalized.contains("../")
  || normalized.contains("%2e%2e%2f")
  || normalized.contains("/etc/passwd")
```

对 `/v1/chat/completions` 来说，这些字符串就是**用户正在讨论的对话内容**：一段代码、一个相对路径 `../`、一次安全问答、一篇故障复盘。把提示词当成“攻击载荷”扫描，正常聊天必然被误杀——`../` 尤其常见，几乎任何涉及文件路径的对话都会命中。

当天 3 次 403 就是这条规则误伤；每次都在 1–2 秒后被客户端换请求重试成功，所以表象是“聊天偶尔报错”。

### 12.3 修复（已在网关仓库落地并验证）

`D:\sdkwork-space\sdkwork-api-cloud-gateway\crates\sdkwork-api-cloud-gateway\src\security.rs`：

- 新增 `is_prompt_inference_path()`：`/v1/chat/completions`、`/v1/completions`、`/v1/responses`、`/v1/embeddings`、`/v1/images/generations`、`/v1/audio/speech`、`/anthropic/v1/messages`、`…:generateContent` / `…:streamGenerateContent`。
- `inspect_json_body` 在这些路径上**直接跳过请求体签名扫描**（不再缓冲、不再匹配）。
- 头部、查询串、URI 检查照旧；鉴权、体积上限、路由、计费完全不受影响。

回归用例（`cargo test -p sdkwork-api-cloud-gateway --lib security::tests`，**16 passed / 0 failed**）：

- `chat_prompt_body_is_not_signature_inspected`：含 `../` 与 `/etc/passwd` 的 chat 体不再被拦截，且字节原样送达 handler；
- `non_prompt_json_body_still_reaches_the_signature_matcher`：`/backend/v3/api/iam/users` 同类内容仍然 403，WAF 未被整体削弱；
- 既有 `inspectable_json_body_still_blocks_a_baseline_signature` 继续通过。

### 12.4 立即可用的运维缓解（无需新镜像）

在 `config.toml` 中把 `[security.waf] mode = "monitor"`（或 `inspectJsonBody = false`）后重启，可在新镜像发布前先止血：`monitor` 只记录事件不拦截。

### 12.5 与 40002 的关系

403 与 40002 是两条独立链路，不能混为一谈：

| 症状 | 触发 | 归属 |
|------|------|------|
| `403 waf_baseline_signature` | 对话内容里出现 `../`、`/etc/passwd`、`or 1=1` 等 | **网关缺陷，已修**（§12.3） |
| `400 40002 model is required` | 请求体顶层没有 `model` | 调用方未带模型；网关行为正确（§4.2） |

本仓库唯一会把调用方留成“无模型”状态的地方是 DSH 快速导入模板：`buildDeepseekHarnessContent()` 生成的 `llm-pi-ai.providers.cloudrouter` **不含任何 model**，`docs/guides/developer/README.md:342` 也明确写着“由 harness 在 设置 → 模型 里点『获取可用模型』自行解析”。用户若跳过这一步，聊天就会以无模型请求打到网关并得到 40002。补齐该模板需要 DSH `llm-pi-ai` 的 `models` 字段契约（本仓库无此 schema，不能臆造键名），因此这项仍需 DSH 侧确认后再改。
