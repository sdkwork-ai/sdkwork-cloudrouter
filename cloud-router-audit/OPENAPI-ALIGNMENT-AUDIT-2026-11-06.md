# open-api 全链路对齐审计（2026-11-06）

**审计对象**：`apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json`
（173 路径 / **218 操作**）
**审计范围**：契约 → 路由 manifest → 分类器 → taxonomy → 种子 → 资源组授权 → 上游 Base URL/中转 → 计费矩阵
**基线审计**：`cloud-router-audit/OPENAPI-FULL-AUDIT-2026-09-29.md`（当时 122 路径 / 167 操作）

---

## 一、结论速览

| # | 发现 | 性质 | 状态 |
|---|---|---|---|
| F1 | `apis/open-api` 与 `apis/manifest.json` 落后于 SDK 契约（5 个治理扩展未回填） | 仓库状态缺陷 | ✅ 已修复 |
| F2 | `minimax` 默认组只授权 `official.minimax.music`，5 个已发布端点 50201 | 真实路由断链 | ✅ 已修复 + 回归守卫 |
| F3 | 11 个厂商 / 19 个协议的 LLM 上游 Base URL 缺失协议前缀（或主机错误） | 真实中转断链 | ✅ 已修复 |
| F4 | `audit-model-route-reachability` 把 `primaryCapability=streaming` 误判为不可达 | 审计工具误报 | ✅ 已修复 |
| F5 | 19 个 vendor-utility 操作仍为 `declared-unrouted` | 已登记设计取舍 | 保持（见 §六） |
| F6 | 3 个管理面操作本地合成 501 | 契约已声明 501 | 保持（见 §六） |
| F7 | `x-sdkwork-api-authority` 存在 `.ai` / `-open-api` / `<capability>-open-api` 三种写法 | 公共命名歧义 | 待业主决策（见 §七） |

- 路由层：218 / 218 操作在 `generated_open_http_route_manifest.rs` 与 SDK route manifest 中逐条一致（method/path/operationId/tag 全等）。
- 分类层：218 / 218 操作可被分类器识别；199 条走已编目路由，19 条为已登记 `declared-unrouted`（无死接口）。
- 种子层：134 / 134 `api_endpoint` 资源均被默认混合组授权（修复后）。
- 计费层：`openapi_billing_matrix` 218 操作全部有计费形态，金标矩阵 15/15 通过。
- 厂商契约层：`audit-vendor-openapi-conformance` 33/33（20 OK + 13 WIRE_EQUIVALENT）。

---

## 二、逐层矩阵

| 层 | 检查 | 结果 |
|---|---|---|
| 契约 ↔ 路由 manifest | 218 vs 218，opId/tag/auth 全等 | ✅ |
| 契约 ↔ 分类器 | `/v1/**` 122 条全部有臂；vendor-native 77 条已路由 + 19 登记 | ✅ |
| 分类 ↔ taxonomy/seed | 134 个 `api_endpoint`，0 个 taxonomy 未知 | ✅ |
| seed ↔ 默认组授权 | 修复前 129/134（5 个 minimax 缺失）；修复后 134/134 | ✅ |
| 上游 Base URL | 修复前 19 个协议对错误；修复后按 catalog `host+pathPrefix` 组合 | ✅ |
| 计费矩阵 | Free 132 / 计费 76 / 不可售 1 / 按次 9 | ✅ |
| 厂商契约一致性 | xAI / Runway / ElevenLabs / BFL / Google | ✅ |
| 模型路由可达性 | 321/321（修复审计误报后） | ✅ |

---

## 三、F1：materialize 契约落后

**证据（修复前）**

```
$ node scripts/materialize-apis-contracts.mjs --check
apis contract stale: apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json (run pnpm api:materialize:write)
apis/manifest.json is stale (run pnpm api:materialize:write)
```

**根因**：`sdks/cloudrouter-open-sdk/openapi/cloudrouter-open-sdk.openapi.json`
（mtime 02:15）已重新生成，但 `apis/` 材化副本（mtime 01:57）未回填。

**差异**：仅 218 操作 × 5 个治理扩展（`x-sdkwork-api-surface`、
`x-sdkwork-auth-mode`、`x-sdkwork-request-context`、`x-sdkwork-required-surface`、
`x-sdkwork-source-route-crate`），共 +1090 行；路径、操作、schema 无变化。

**修复**：`pnpm api:materialize:write`。

**复核**：`materialize --check`、`api:standard-extensions:check`、
`api:http-route-manifest:check`、`check-api-operation-patterns`、
`check-api-response-envelope` 全部通过。

---

## 四、F2：MiniMax 默认组授权缺口

**证据（live dev DB）**

```
per-api-chain-audit: FAILED (6 of 134)
  minimax.text_to_speech / image_generation / video_generation /
  video_generation_task_query / video_file_retrieve
    x default-group-grant: NOT granted ... (50201)
```

**根因**：`ai_routing_seed.rs::VENDOR_RESOURCE_GROUP_BINDINGS`
把 `minimax` 绑定到 `official.minimax.music`（仅 music 资源）。默认混合组是
app-session 唯一解析到的组，loader 又按组授权裁剪账号 `apiScope`，因此其余
5 个已发布 MiniMax 端点必然 `50201`。

**修复**：绑定改为 `official.minimax.full`（含 6 个 api 资源），并同步镜像
`ai_routing_seed_coverage_e2e.rs`。

**回归守卫**：新增 `default_group_grants_every_seeded_api_endpoint`，断言默认组
展开后的资源集覆盖全部 134 个 `api_endpoint`。

**消融自证**：
- 旧绑定 `.music` → FAILED，精确点名 5 条：
  `api.minimax.text_to_speech`、`image_generation`、`video_generation`、
  `video_generation_task_query`、`video_file_retrieve`；
- 恢复 `.full` → passed。

> live dev DB 尚未重新 seed，因此 `audit-api-chain-reachability` 仍会报旧值
> （含 `black_forest_labs.video_generation`，该资源在 seed 中早已授权，属于 DB
> 落后）。seed 收敛性由 `ai_routing_seed_idempotency` 4/4 在隔离 schema 上证明。

---

## 五、F3：上游 Base URL / 版本前缀

**证据（修复前，`audit-upstream-dial-url-shape`，live DB）**

```
OK 9 / PREFIX-MISSING 12 / HOST-WRONG 7
destructive: 19   vendors: alibaba, baidu, bytedance, deepseek, meituan,
                  minimax, moonshot, stepfun, tencent, xiaomi, zhipu
```

典型错误：

| vendor | 协议 | 实际拨号 | 应为 |
|---|---|---|---|
| alibaba | openai_compatible | `…/v1/chat/completions` | `…/compatible-mode/v1/chat/completions` |
| baidu | openai_compatible | `…/v1/chat/completions` | `…/v2/chat/completions` |
| bytedance | openai_compatible | `…/v1/chat/completions` | `…/api/v3/chat/completions` |
| zhipu | anthropic_messages | `…/v1/messages` | `…/api/anthropic/v1/messages` |
| deepseek | anthropic_messages | `…/v1/messages` | `…/anthropic/v1/messages` |
| tencent | openai_compatible | `api.hunyuan.cloud.tencent.com/…` | `tokenhub.tencentmaas.com/v1/…` |

**根因（两层）**

1. 官方 vendor seed 只写 `endpoint.base_url` 裸主机，未把 catalog 的
   `protocolBaseUrls.<proto> = {host, pathPrefix}` 投影到
   `ai_upstream_supplier.protocols`，`resolve_upstream_base_url` 的协议跳因此为空。
2. 三个 transport（relay / invocation pipeline / edge passthrough）的
   “去重 `/v1`” 只识别以 `/v1` 结尾的 base，`/api/v3`、`/v2`、
   `/api/paas/v4`、`/v1beta/openai` 会被再次拼上 `/v1`。

**修复**

- `ai_routing_seed.rs` 新增 `vendor_protocol_base_urls`，逐 vendor 投影
  catalog 的协议 Base URL；同时修正 4 个历史主机：
  `minimax api.minimax.cn`、`tencent tokenhub.tencentmaas.com`、
  `xiaomi api.xiaomimimo.com`、`meituan api.longcat.chat`。
- 新增共享判定 `sdkwork_cloudrouter_http::path_carries_version_prefix` /
  `upstream_path_without_version_duplication`，三处 transport 统一使用；
  Anthropic 面（`/anthropic`、`/apps/anthropic`、`/step_plan`）不属于版本前缀，
  继续保留入站 `/v1`。
- OpenAI 兼容面（`openai.*`）不只 chat：images / audio / video / embeddings /
  files / batches 等全部由同一个 OpenAI 兼容 Base URL 提供服务。
  `protocol_code_from_api_code` 对 `openai.*` 与 `*.embeddings` 返回
  `OpenaiChatCompletions`，否则 ByteDance `/api/v3`、Zhipu `/api/paas/v4`、
  Alibaba `/compatible-mode/v1` 的图片模型会被拼成
  `<host>/v1/images/generations`。厂商原生码（`bytedance.image_generation`、
  `kling.text_to_video` 等）仍返回 `None`，由自身 path template 携带前缀。
- `audit-upstream-dial-url-shape.mjs` 改为按 `supplier.protocols` 解析真实
  Base URL，并按真实入站路径建模；`--self-test` 9/9 复现厂商文档 URL。

**验证**

- `cargo test -p sdkwork-cloudrouter-http --lib`：58 passed
- `cargo test -p sdkwork-cloudrouter-router-service --lib`：**661 passed, 0 failed**
- `cargo test -p sdkwork-cloudrouter-edge-runtime --lib`：**103 passed, 0 failed**
- `cargo test -p sdkwork-cloudrouter-router-service --test ai_routing_seed_idempotency`（真实 PG，隔离 schema）：4 passed
- `cargo test -p sdkwork-cloudrouter-router-service --test openapi_billing_matrix`：15 passed
- `cargo test -p sdkwork-cloudrouter-router-service --test openai_contract_classification_coverage`：3 passed
- `node scripts/dev/audit-upstream-dial-url-shape.mjs --self-test`：9/9

### F4：模型路由审计误报（工具修复）

`audit-model-route-reachability` 把 `primaryCapability = "streaming"` 的
`vidu/vidu-s1` 报为 `NO_GENERIC_ENDPOINT_FOR_PRIMARY_CAPABILITY`。实际上
`model_endpoint_descriptor` 对未知 capability 走 catch-all，绑定
`openai.chat_completions`（或 vendor-native chat），模型可达。
`PRIMARY_TO_FAMILY` 增加 `streaming` / `tool` → `chat` 后：**321/321 reachable**。

> 说明：`minimax.music_generation` 的 seed `pathTemplate` 仍登记
> `/v1/music/generations`，而契约发布 `/minimax/v1/music_generation`。这是
> 2026-09-16 审计明确接受的**别名集**（`/v1/music_generation`、
> `/v1/music/generations`、`/v1/music/generation` 三臂同码）；运行时按入站
> standard path 原样回放，因此两条路径都能拨通。本次不改，避免推翻已登记取舍。

---

## 六、F5 / F6：保持项（已登记，不建议代改）

### F5 19 个 vendor-utility 操作（`declared-unrouted`）

| 命名空间 | 操作数 | 内容 |
|---|---|---|
| anthropic | 10 | files（list/upload/get/delete/content）、messages/batches（create/list/get/cancel）、count_tokens |
| google | 9 | cachedContents（list/create/get/delete）、files（list/upload/get/delete）、models/{model}:countTokens |

登记理由：`no taxonomy route, no api_endpoint seed, no resource grant, no price`；
运行时按校验员（`per_api_chain_e2e`）断言 fail-closed。`POST /anthropic/v1/messages/batches`
另在 `openapi_billing_matrix` 中登记为“不可售”（批次结果回收链路未落地）。

把它们接通需要新增产品能力（文件生命周期、批次结果回收、缓存计费），
不是补一条 relay 臂能解决的，按 `SOUL.md`「stop on ambiguity」保持登记。

### F6 3 个管理面 501

`GET /v1/models/{model}`、`GET /v1/audio/voices/{voice_id}`、
`POST /v1/realtime/client_secrets` 由 `apply_declared_not_implemented_defaults`
合成 501；契约本身声明了 501，故不违约束，但 200 分支永不可达。
其中 `GET /v1/models/{model}` 可像列表一样本地合成（候选改进，未在本次改动）。

---

## 七、F7：`x-sdkwork-api-authority` 三值并存

| 位置 | 值 |
|---|---|
| `apis/open-api` + SDK openapi（文档级） | `sdkwork-cloudrouter.ai` |
| 门户 `apps/.../public/openapi.json`（操作级） | `sdkwork-cloudrouter-open-api` |
| route manifest / `apis/manifest.json` | `sdkwork-cloudrouter-open-api` |
| route crates（capability manifest） | `sdkwork-cloudrouter.<capability>-open-api` |

统一属于公共命名/权威归属变更，按 `AGENTS.md` Human Review Rules 需人工确认，
本次仅记录，不改。

---

## 八、把修复应用到运行库

代码改动只改 seed 定义；已有数据库要等下一次启动 seed 才会收敛。二选一：

```bash
pnpm db:upgrade                 # 规范入口：installer upgrade（会跑 seed 收敛）
# 或启动任一网关（启动时 UpgradeRequired 会重新导入 seed）
```

本次审计环境的 dev PostgreSQL 在重启后长时间处于 crash recovery，未能在审计窗口内
完成 re-seed；因此 `audit-api-chain-reachability` 的 live 结果仍显示旧值
（5 个 minimax + 1 个 BFL video）。seed 收敛性由
`ai_routing_seed_idempotency`（隔离 schema、真实 PG）4/4 证明，
静态 seed 模型为 134/134 全授权。

## 九、复现命令

```bash
# 契约与路由
pnpm api:materialize:check
pnpm api:standard-extensions:check
pnpm api:http-route-manifest:check
node tools/check-cloudrouter-ai-routing-consistency.mjs --root .
node tools/audit-vendor-door-coverage.mjs --root .
node tools/audit-vendor-openapi-conformance.mjs
node cloud-router-audit/openapi-classification-coverage.mjs

# 真实 DB（需 SDKWORK_DATABASE_URL / dev Postgres）
node scripts/dev/audit-api-chain-reachability.mjs --list-gaps
node scripts/dev/audit-model-route-reachability.mjs
node scripts/dev/audit-upstream-dial-url-shape.mjs
node scripts/dev/audit-upstream-dial-url-shape.mjs --self-test

# Rust
cargo test -p sdkwork-cloudrouter-router-service --lib ai_routing_seed
cargo test -p sdkwork-cloudrouter-router-service --lib upstream_base_url
cargo test -p sdkwork-cloudrouter-router-service --test openapi_billing_matrix
cargo test -p sdkwork-cloudrouter-router-service --test openai_contract_classification_coverage
cargo test -p sdkwork-cloudrouter-router-service --test ai_routing_seed_idempotency
cargo test -p sdkwork-cloudrouter-edge-runtime --lib provider_passthrough_transport
```
