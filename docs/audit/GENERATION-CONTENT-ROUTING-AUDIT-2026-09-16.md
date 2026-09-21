# 灵感内容生成 · 端到端链路审计（2026-09-16）

> **时点审计快照（已归档）**：本文记录 2026-09-16 的审计发现，含当时尚未修复的缺陷（如 `anthropic.claude_code`/`gemini.live` 的 pathTemplate 漂移、`openai.videos` 拼写、vidu 模型名 fixture、Suno 音乐路由等）。这些问题已在后续版本逐一修复，正文中的"❌/缺陷"条目不再反映现状。现行对齐状态以校验门 `tools/check-cloudrouter-ai-routing-consistency.mjs`、审计 `scripts/dev/audit-api-chain-reachability.mjs` 与 `scripts/dev/audit-model-route-reachability.mjs`、运行时探针 `crates/sdkwork-cloudrouter-edge-runtime/tests/per_api_chain_e2e.rs` 的持续全绿为准。本文保留作缺陷模式与排查方法的历史证据。

审计范围：`灵感`（AgentsWorkbench inspiration）暴露的各类内容生成能力，逐类型核查
「入口 → 前端提交 → 生成服务 App API → CloudRouter 网关 → 路由账户/定价 → 第三方厂商 API」
全链路是否存在缺陷、是否真的能打到目标路由账户并执行厂商调用。

涉及仓库（均为 `D:\sdkwork-space\*`）：

| 仓库 | 承担环节 |
| --- | --- |
| `sdkwork-agents` | 灵感页、生成页、统一输入框、generations 前端 SDK |
| `sdkwork-generations` | `/app/v3/api/generations/**` 生成服务、厂商适配器骨架 |
| `sdkwork-cloudrouter` | 入站面分类、provider-native 分类器、路由账户选择、定价前置、透传 |
| `sdkwork-web-framework` | 入站面分类与凭据解析（`sdkwork-web-core`） |

---

## 0. 结论速览

链路分 6 段：**S1 灵感入口 · S2 前端提交 · S3 生成服务 API · S4 网关入站面 · S5 路由账户与定价 · S6 厂商 API**

| 能力 | S1 入口 | S2 提交 | S3 服务 API | S4 网关入站 | S5 账户/定价 | S6 厂商 API | 端到端 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 图片生成 | ✅ | ✅（model 丢失） | ✅ | ✅ | ✅ | ⚠️ 模型被替换 | **可用** |
| 视频生成 | ✅ | ✅（model 丢失） | ✅ | ⚠️ vidu/volcengine 缺前缀 | ⚠️ | ⚠️ 字段错映射 | **部分可用** |
| 音乐生成 | ⚠️ 无卡片 | ❌ 塌缩为图片 | ✅ | ⚠️ minimax 缺前缀 | ❌ suno 无资源 | — | **不可用** |
| 配音/语音 | ⚠️ 无卡片 | ❌ 塌缩为图片 | ✅ | ⚠️ volcengine 缺前缀 | ⚠️ elevenlabs/volcengine 无资源 | — | **不可用** |
| 音效 | ❌ 无入口 | ❌ 无入口 | ✅ | ✅ | ❌ elevenlabs 无资源 | — | **不可用** |
| 数字人 | ⚠️ 无卡片 | ❌ 塌缩为图片 | ❌ 契约缺失→404 | ✅ | ❌ kling.avatar 无资源 | — | **不可用** |
| 动作模仿 | ⚠️ 无卡片 | ❌ 塌缩为图片 | ❌ 契约缺失→404 | ⚠️ vidu 缺前缀 | ❌ 无资源 | — | **不可用** |

**一句话结论**：七类能力里只有**图片生成**真正端到端可用；**视频生成**在东家前缀放行的路径上可用但参数映射有错；
其余五类（音乐 / 配音 / 音效 / 数字人 / 动作模仿）**全链路至少断两环，当前无法调用任何第三方 API**。

---

## 1. 链路定义（含证据锚点）

```
灵感页 InspirationView
  └─ CreativeInputBox（7 种 creationType）
       └─ sessionStorage: pending_creative_prompt / pending_creative_mode   ← settings 在此丢失
            └─ 生成页 CreativeView.handleSend
                 └─ CreativeService.generateContent                          ← mode 在此塌缩
                      └─ AgentsGenerationsService.create
                           └─ POST /app/v3/api/generations/{images|videos|music|voice|...}
                                └─ sdkwork-generations 厂商适配器
                                     └─ HTTP → CloudRouter 入站（面分类 → 凭据 → 路由清单）
                                          └─ provider-native 分类器 → api_code
                                               └─ 路由账户选择（策略排序 + 凭证轮换）
                                                    └─ PricingPreflight（fail-closed）
                                                         └─ 第三方厂商 API
```

---

## 2. 逐类型核查

### 2.1 图片生成 —— 可用

| 段 | 结论 | 证据 |
| --- | --- | --- |
| S1 | ✅ 灵感卡片直达 | `sdkwork-agents/.../sdkwork-agents-pc-inspiration/src/components/InspirationFeatureCards.tsx:17`（`id: 'image'`） |
| S2 | ✅ 提交为 `text_to_image` | `...-creative/src/services/CreativeService.ts:97,122` |
| S3 | ✅ 已实现 | `sdkwork-generations/.../service/handlers.rs:31-34` `POST /app/v3/api/generations/images/text_to_image` |
| S4 | ✅ `/v1` 在 open-api 白名单 | `sdkwork-cloudrouter/.../standalone-gateway/src/main.rs:19` |
| S5 | ✅ seed 资源齐备 | `data/ai-routing/resources/*.json` 含 openai/gemini/kling/jimeng/volcengine/vidu 图片资源 |
| S6 | ⚠️ 模型被硬编码默认值替换 | 见 P1-1 |

### 2.2 视频生成 —— 部分可用

| 段 | 结论 | 证据 |
| --- | --- | --- |
| S1 | ✅ 卡片直达 | `InspirationFeatureCards.tsx:18`（`id: 'video'`） |
| S2 | ✅ `text_to_video` | `CreativeService.ts:97,122` |
| S3 | ✅ 已实现 | `handlers.rs:36-48` |
| S4 | ⚠️ `/kling/v1`、`/suno/v1` ✅；**`/vidu/**`、`/volcengine/**` 不在白名单** | `main.rs:18-28` |
| S6 | ⚠️ `video_extend` 字段错映射、vidu 尾帧丢弃 | 见 P1-2 |

### 2.3 音乐生成 —— 不可用

| 段 | 结论 | 证据 |
| --- | --- | --- |
| S1 | ⚠️ 灵感卡片区只有 5 张，**无音乐卡**；仅能从输入框内 7 项下拉进入 | `InspirationFeatureCards.tsx:13-19` vs `CreativeInputBox.tsx:38-46` |
| S2 | ❌ `mode='music'` 被归一为 `'image'`，实际发出 `text_to_image` | `CreativeService.ts:97` |
| S3 | ✅ `/music/text_to_music`、`/lyrics_to_music` 已实现 | `handlers.rs:59-66` |
| S4 | ⚠️ `/suno/v1` ✅；**`/minimax/v1` 不在白名单** | `main.rs:18-28` |
| S5 | ❌ **`suno` 无 seed 资源**；minimax 有 | `data/ai-routing/resources/core-resources.json`（无 `vendor.suno`） |

### 2.4 配音 / 语音 —— 不可用

| 段 | 结论 | 证据 |
| --- | --- | --- |
| S1 | ⚠️ 无卡片，仅下拉 | 同 2.3 |
| S2 | ❌ 塌缩为图片 | `CreativeService.ts:97` |
| S3 | ✅ `/voice/{speech,transcription,translation}` 已实现 | `handlers.rs:68-83` |
| S4 | ✅ `/v1/audio/speech`、`/elevenlabs/v1` ✅；`/volcengine` ❌ | `main.rs:19,21` |
| S5 | ⚠️ openai ✅；**`elevenlabs` / `volcengine.speech` 无 seed 资源** | seed 无 `vendor.elevenlabs`、无 `api.volcengine.speech` |

### 2.5 音效 —— 不可用

| 段 | 结论 | 证据 |
| --- | --- | --- |
| S1 | ❌ **`CREATION_TYPES` 与灵感卡片均无"音效"项** | `CreativeInputBox.tsx:38-46`（7 项无 sfx） |
| S2 | ❌ 无入口 | — |
| S3 | ✅ `POST /app/v3/api/generations/sound_effects` 已实现 | `handlers.rs:68-71` |
| S4 | ✅ `/elevenlabs/v1/sound-generation` 在白名单且带契约 | `main.rs:21` |
| S5 | ❌ **`elevenlabs.sound_generation` 无 seed 资源** | seed 无 `vendor.elevenlabs` |

### 2.6 数字人 —— 不可用（四道门全断）

| 段 | 结论 | 证据 |
| --- | --- | --- |
| S1 | ⚠️ 无卡片，仅下拉（`digital_human`） | `CreativeInputBox.tsx:42` |
| S2 | ❌ 塌缩为图片 | `CreativeService.ts:97` |
| S3 | ❌ **路由已注册，但契约缺失 → 框架 404** | `handlers.rs:51-54` 注册 `POST /app/v3/api/generations/videos/avatar`；`sdks/sdkwork-generations-app-sdk/openapi/sdkwork-generations-app-api.openapi.json` 对 `videos/avatar` 命中数 **0** |
| S4 | ✅ `/kling/v1/videos/avatar` 在契约/清单/分类器 | `cloudrouter-open-api.openapi.json`、`generated_open_http_route_manifest.rs:165`、`passthrough.rs:1855` |
| S5 | ❌ **`kling.avatar` 无 seed 资源** | `data/ai-routing/resources/*.json` 无该资源 |

> S3 的 404 机制：`build.rs` 从 openapi 生成 `APP_ROUTES`，框架在 `sdkwork-web-core/src/interceptors.rs:899-908`
> 对未登记路由返回 `not_found("route is not registered in the gateway route manifest")`。
> 路由在 `build_app_routes()` 里存在但不在 `APP_ROUTES` 里注册，等于**存在但不可达**。

### 2.7 动作模仿 —— 不可用

| 段 | 结论 | 证据 |
| --- | --- | --- |
| S1 | ⚠️ 无卡片，仅下拉（`action`） | `CreativeInputBox.tsx:43` |
| S2 | ❌ 塌缩为图片 | `CreativeService.ts:97` |
| S3 | ❌ 契约缺失 → 404 | `handlers.rs:55-58` 注册 `/videos/motion_mimicry`；openapi 命中数 **0** |
| S4 | ⚠️ `/kling/v1/videos/motion-control` ✅；`/vidu/ent/v2/template` ❌（前缀缺失） | `main.rs:18-28` |
| S5 | ❌ **`kling.motion_control` / `vidu.motion_sync` 无 seed 资源** | seed 无对应资源 |

---

## 3. 缺陷清单

### P0 —— 能力不可达（阻断级）

| # | 位置 | 问题 | 影响 |
| --- | --- | --- | --- |
| P0-1 | `CreativeService.ts:97` | `const normalizedMode = mode === 'video' ? 'video' : 'image';` —— 非 video 一律塌缩为 image；`...-core/src/sdk/generationsService.ts:22-23` 的类型 `modality: "image" \| "video"` 从 TS 层就把其余模态封死 | 音乐/配音/数字人/动作模仿**静默降级成"文生图"**，用户无任何报错 |
| P0-2 | `InspirationFeatureCards.tsx:13-19` vs `CreativeInputBox.tsx:38-46` | 灵感卡片 5 项，输入框类型枚举 7 项，**且两者都无"音效"** | 音乐/配音/数字人/动作模仿无法从卡片直达；音效**无任何前端入口** |
| P0-3 | `sdkwork-generations/.../handlers.rs:51-58` + `sdks/*/openapi/sdkwork-generations-app-api.openapi.json` | `/videos/avatar`、`/videos/motion_mimicry` 在路由器注册但**不在 OpenAPI** → 不进 `APP_ROUTES` → 框架 404 | 数字人/动作模仿**后端不可达** |
| P0-4 | `sdkwork-cloudrouter/.../standalone-gateway/src/main.rs:18-28` | `OPEN_API_PREFIXES` 缺 `/volcengine`、`/vidu`、`/minimax` | 这些前缀的请求被 `classify_api_surface` 判为 `Unknown` → `interceptors.rs:925` 返回 `missing_credentials`，**在进入路由前就被 401 拒绝**。受影响：volcengine 语音/视频、vidu 全部端点、minimax 音乐 |
| P0-5 | `sdkwork-cloudrouter/data/ai-routing/resources/*.json` | taxonomy/分类器/契约已新增 `kling.avatar`、`kling.motion_control`、`vidu.motion_sync`、`volcengine.speech`、`suno.*`、`elevenlabs.*`，但 **seed 资源未同步**（`ai_routing_seed.rs:18-28` 用 `include_str!` 把这 3 个 JSON 作为唯一来源） | 无资源 = 无账户授权范围、无价 → `PricingPreflightInterceptor` 是 **fail-closed**（`pricing.rs:113-121`「refusing to dispatch billable traffic without a complete price」）→ **拒绝派发** |

### P1 —— 功能/数据正确性

| # | 位置 | 问题 | 影响 |
| --- | --- | --- | --- |
| P1-1 | `sdkwork-generations/.../provider-adapter/src/vendor.rs:262` `model: String::new()` | `GenerationCommandInputs.model` **恒为空**（`from_command` 后无人赋值） | ① `model_or_default(inputs, default)`（`image.rs:170,310`、`video.rs:239,268,523,636`、`sfx.rs:98`、`voice.rs:104,145,184`）恒返回硬编码默认模型，**用户/前端选择的模型不生效**；② `(!inputs.model.is_empty()).then(...)` 恒 `None`，字段**直接从请求体消失**（`image.rs:235`、`music.rs:142`、`video.rs:218`）；③ `usage.model` 恒 `None`，计费/用量记录丢模型。仅 kling avatar/motion（`video.rs:411,455`）与 vidu template（`video.rs:493`）走 `selection.model`，正确 |
| P1-2 | `sdkwork-generations/.../video.rs:215-223` | `video_extend` 把 `inputs.first_reference_image()` 同时赋给 `image` 与 **`video`** 字段 | "扩展视频"实际把**图片 URL 传给 video 字段**，上游语义错误 |
| P1-3 | `sdkwork-generations/.../video.rs:578-592` | `let image_tail = images.pop(); let _ = image_tail;` | vidu start-end 的**尾帧被丢弃**，请求只收到前 N-1 张图 |
| P1-4 | `sdkwork-agents/.../InspirationView.tsx:60` + `.../CreativeView.tsx:248,294` | `handleInputSubmit(value, mode)` 丢弃 `CreativeInputBox.onSubmit` 的第三个参数 `settings`；`handleSend` 里 `settings` 恒 `undefined`，`settings?.model` 恒 `undefined` | 灵感页提交时**比例/时长/参考图/角色图/动作视频等全部丢失**，模型回落为默认 |
| P1-5 | `sdkwork-generations/.../generations_service.rs:375-378,585-594` + `video.rs:65-67` | `refresh_pending_generation` 用 `record.source_provider` 去匹配 `resolve_provider_by_vendor`，但 `GenerationProvider::vendor()` 返回**适配器默认 vendor** | 非默认 vendor（kling/vidu/volcengine/nano-banana）的 pending 记录 `GET /generations/{id}` **恒 404** |
| P1-6 | `sdkwork-cloudrouter/tools/sync-cloudrouter-api-standard-extensions.mjs --check` | **门禁红（exit 1）**，6 个文件 drift：`apis/{app,backend,open}-api/.../*.openapi.json`、`generated/openapi/cloudrouter-{app,backend}-openapi.json`、`sdks/_route-manifests/open-api/*.route-manifest.json` | 标准扩展字段与清单不同步；`open-api` 的 drift 与本轮新增 5 条路由同源 |
| P1-7 | `passthrough.rs:1824-1883` / `provider_native_classifier.rs:176-254` / `ai_route_taxonomy.rs:437-578` | 同一份「标准路径 → api_code」映射**存在三份拷贝**，靠人工同步 | 漏同步即静默回退成合成键（如 `kling.v1.videos.generations`），不可路由/不可计价，且无门禁拦截 |
| P1-8 | `sdkwork-generations` 全仓 | 异步生成**无轮询调度器、无 webhook 接收**（`jobs/` 仅 README；`generation_dispatch_job` 表在 DDL 里但 Rust 侧 0 命中） | 任务状态只能靠读路径惰性拉取；无后台推进 |

### P2 —— 一致性 / 技术债

| # | 位置 | 问题 |
| --- | --- | --- |
| P2-1 | `sdkwork-web-framework/.../route_manifest.rs:200` `WebApiSurface::Unknown => {}` | 面校验门禁**对未知前缀的路由静默放行**，正是 P0-4 能长期潜伏的原因 |
| P2-2 | `sdkwork-cloudrouter` 新增测试 `audio_vendor_routing_e2e.rs`、`avatar_motion_routing_e2e.rs`（**未跟踪文件**） | 两者均自建内存 catalog，**grep `ai_routing_seed`/`data/ai-routing` 零命中** → 无法暴露 P0-5；`media_routing_e2e.rs` 的 diff 也只加了 speech 目录与价格数据、**没有对应用例** |
| P2-3 | `crates/sdkwork-cloudrouter-edge-runtime/src/provider_account_auth.rs:1-19` | `render_provider_account_auth` 全仓无调用者，靠 `#![allow(dead_code)]` 掩盖 |
| P2-4 | `sdkwork-generations/.../routes-generations-backend-api/src/handlers.rs:41,60,83,109` | 4 个 backend 端点全为 `// TODO` + 编造返回值 |
| P2-5 | `sdkwork-generations/.../bootstrap.rs:763-778` `NoopAssetPort` | `save_to_assets` 恒返回 Err；`auto_save_results` 全仓无调用点（死代码） |
| P2-6 | `...-commons/src/components/CreativeInputBox.tsx:55-81` `MOTION_TEMPLATES`、`staticCreativeModelCatalog.ts:68-80` | 动作模仿模板与数字人封面用 unsplash 外链假图；`mockSessions.ts` 为无引用孤儿文件 |
| P2-7 | `staticCreativeModelCatalog.ts:119-128` | `digital_human: []`、`action: []` 的远程模态查询恒为空，注释自陈「模型目录暂无对应 facet」 |
| P2-8 | `sdkwork-generations/.../gateway.rs:44-55` | `GENERATIONS_MEDIA_GATEWAY_*` 在 `sdkwork-generations/etc/topology/*.env` **零配置**（仅代码内有默认值），与网关端口耦合靠隐式约定而非显式配置 |
| P2-9 | `crates/sdkwork-api-cloudrouter-assembly/Cargo.toml` vs `src/feeds_open_runtime.rs:91-108` | 该 crate 的 `sdkwork-web-bootstrap` 依赖未启用 `redis` feature，而 `feeds_open_runtime.rs` 调用了被 `#[cfg(feature = "redis")]` 门控的三个 `shared_*_store` → 现 HEAD 上 `cargo check -p sdkwork-api-cloudrouter-assembly`（**不带 `--test`**）就 exit 101（E0425）。连带使 `bootstrap.rs` 的入站前缀覆盖断言在本机默认 features 下够不着 |
| P2-10 | `data/ai-routing/resources/vendor-native-resources.json` vs `passthrough.rs` / `provider_native_classifier.rs` | seed 的 `pathTemplate` 与实际接收入口漂移 2 处：`anthropic.claude_code` 登记 `/v1/claude/code`（arm 实际接受 `/v1/claude-code/sessions`）、`gemini.live` 登记 `/v1beta/models/{model}:liveGenerateContent`（arm 实际接受 `/v1beta/live/sessions`）。`pathTemplate` 不参与路由匹配（`ai_routing_seed.rs` 只要求它以 `/` 开头，随后 upsert 进 `api_endpoint` 表），但它是**资源目录对外展示的入口描述** → 登记了一个不存在的入口 |

---

## 4. 已推翻 / 修正的中间判断

审计过程中出现过两个过早结论，此处更正，避免后续误用：

| 原判断 | 更正 | 依据 |
| --- | --- | --- |
| 云路由未覆盖 `/kling/v1/images/generations`（生成服务 `gateway.rs:504` 使用）→ 必然 404 | **不成立**。`/kling/v1` 在 `OPEN_API_PREFIXES` 内，OpenApi 面对**未登记路径**走 `state.route_auth.or_else(...)` 的柔性分支（`interceptors.rs:716,768-780`），不触发 404；分类器映射到 `kling.image_generation`，seed 有该资源 → kling 图片/轮询**可用** | `main.rs:22`、`interceptors.rs:716` |
| 生成服务默认网关 `127.0.0.1:3900` 与 standalone 网关默认 bind `3905` 不匹配 → 必然连不上 | **不成立**。topology 环境把 `SDKWORK_CLOUDROUTER_ROUTER_APPLICATION_PUBLIC_INGRESS_BIND` 定为 `...:3900`（`etc/topology/*.env`），并由 `scripts/lib/cloud-router-topology.mjs:149,301` 传出 → 默认值恰好吻合。真正的风险是 P2-8 的隐式约定 | `etc/topology/cloud.development.env:18,34` |

---

## 5. 复现与验证命令

```bash
# 1) 契约标准扩展门禁（当前红，exit 1）
cd D:/sdkwork-space/sdkwork-cloudrouter
node tools/sync-cloudrouter-api-standard-extensions.mjs --check

# 2) 契约 / 路由清单三方一致性（当前绿）
node tools/generate-cloudrouter-http-route-manifest-rs.mjs --check
node scripts/materialize-apis-contracts.mjs --check
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .

# 3) 数字人/动作模仿契约缺失（命中数应为 0）
cd D:/sdkwork-space/sdkwork-generations
grep -c "videos/avatar\|motion_mimicry" \
  sdks/sdkwork-generations-app-sdk/openapi/sdkwork-generations-app-api.openapi.json

# 4) seed 资源缺口（应无输出）
cd D:/sdkwork-space/sdkwork-cloudrouter
grep -l "suno\|elevenlabs\|kling.avatar\|motion_control\|motion_sync" data/ai-routing/resources/*.json

# 5) 入站前缀缺口
grep -n "OPEN_API_PREFIXES" -A 12 \
  crates/sdkwork-api-cloudrouter-standalone-gateway/src/main.rs

# 6) model 字段恒空
grep -n "model: String::new()" \
  ../sdkwork-generations/crates/sdkwork-generations-provider-adapter/src/vendor.rs
```

---

## 6. 修复建议（按依赖顺序）

1. **P0-5 / P1-7（路由数据与映射）**：把 `kling.avatar`、`kling.motion_control`、`vidu.motion_sync`、
   `volcengine.speech`、`suno.*`、`elevenlabs.*` 补进 `data/ai-routing/resources/`（新增
   `vendor.suno`、`vendor.elevenlabs`），并在 `resource-groups/` 里挂进对应厂商组；
   同时把三份「标准路径 → api_code」映射合并为**单一权威**（建议以 `ai_route_taxonomy` 为准，
   `passthrough.rs` 改为引用），并加一条「每个 api_code 必须在 taxonomy 与 seed 同时存在」的门禁校验。
2. **P0-4（入站前缀）**：在 `OPEN_API_PREFIXES` 补 `/volcengine`、`/vidu`、`/minimax`，
   并给 `validate_route_auth_for_surfaces` 补规则：manifest 里的 open-api 路由若分类为 `Unknown`
   必须报错，消除 P2-1 的静默放行。
3. **P0-3（生成服务契约）**：把 `/videos/avatar`、`/videos/motion_mimicry` 补进
   `sdkwork-generations-app-api.openapi.json`，重新生成 SDK 与 `APP_ROUTES`，
   并加门禁：`build_app_routes()` 的路径集合必须等于 `APP_ROUTES`。
4. **P0-1 / P0-2 / P1-4（前端）**：把 `CREATION_TYPES` 提升为灵感卡片与输入框共用的单一枚举
   （补 `sfx`），`CreativeService.generateContent` 保留原始 mode（按 mode → modality/operationType 查表），
   `GenerationCommandInput` 放宽为完整模态联合类型；灵感页把 `settings` 一并写入 sessionStorage 并传递给 `handleSend`。
5. **P1-1 / P1-2 / P1-3（生成服务适配器）**：`GenerationCommandInputs.model` 改为由
   `VendorSelection.model` 填充；修 `video_extend` 的字段映射；保留 vidu 尾帧。
6. **P1-6**：重跑 `sync-cloudrouter-api-standard-extensions.mjs` 并提交 stamp 结果。

---

## 7. 未覆盖 / 待运行期验证

本审计的缺陷结论来自静态代码与契约核对。**仍未执行真实厂商调用**（打真实 `api.elevenlabs.io`
之类的外部端点），以下需运行期确认：

- P0-5 的定价 fail-closed 是否在真实部署中拒绝（取决于该环境是否已由管理员配置对应 rate card）。
- 各厂商 passthrough 的 `base_url` 与凭证是否已在目标环境为 `kling` / `vidu` / `suno` / `elevenlabs` 配好路由账户。
- 生成服务异步任务的端到端时延与超时行为。

**已由第三轮补齐**：三个 e2e 测试（`media_routing_e2e.rs`、`audio_vendor_routing_e2e.rs`、
`avatar_motion_routing_e2e.rs`）已在真实工具链下编译并执行，共 **14 passed / 0 failed**。
它们走的是真实链路——Bearer API-key 鉴权 → 账户组池 → 路由策略/规则 → 路由账户
（`base_url` + `secret_ref`）→ 密钥解析 → **真实 HTTP 调用打到本地 mock 上游** → 响应透传，
并逐条断言转发路径与 `Authorization` 头。因此「从入站面到第三方 API 的最后一跳」在
**除厂商主机名之外的全部环节**已被实证；未覆盖的只剩「真实厂商不接受我们的凭证/请求形态」这一类
外部事实。详见第 8.1 节。

---

## 8. 修复落地状态（2026-09-16 同日）

本节记录第 3 节缺陷清单的处置结果。**第 5 节里「当前红」的门禁已转绿**，以本节为准。

| # | 状态 | 落点 |
| --- | --- | --- |
| P0-1 mode 塌缩 | ✅ 已修 | `sdkwork-agents` `be0a8c4`：`CreativeService.generateContent` 去掉 `mode === 'video' ? 'video' : 'image'`，改走共享查表；`AgentsGenerationsService.create` 的 4 路 if/else（含 `images.textToImage` 兜底）换成 13 个操作各一个 sender |
| P0-2 入口不一致 / 缺音效 | ✅ 已修 | 同上：`creationTypes.ts` 成为唯一创作类型枚举，灵感卡片由它派生；补 `sfx`（含模型目录 `sound_effects` 模态与输入框分支） |
| P0-3 契约缺失→404 | ✅ 已修 | `sdkwork-generations` `29a1b84`：补齐 `/videos/avatar`、`/videos/motion_mimicry`；新增 `tools/check_generations_route_contract.mjs` 双向门禁并挂入 `_sdkwork:check` |
| P0-4 入站前缀 401 | ✅ 已修 | `sdkwork-cloudrouter` `c035da4b`：`OPEN_API_PREFIXES` 补 `/volcengine` `/vidu` `/minimax`；`bootstrap.rs` 的手写样例路径断言改为**对生成清单的全量覆盖断言** |
| P0-5 seed 资源缺失→定价 fail-closed 拒派发 | ✅ 已修 | 同上：补 `vendor.suno` / `vendor.elevenlabs`、8 条厂商原生 api_endpoint、厂商组与绑定、本地化名 |
| P1-1 `model` 恒空 | ✅ 已修 | `sdkwork-generations` `7898d3c`：`from_command(command, &selection)` 必填 selection，`model` 取剥前缀后的值 |
| P1-2 `video_extend` 字段错映射 | ✅ 已修 | 同上：改为要求真实源视频，缺失时 `InvalidInput` |
| P1-3 vidu 尾帧被丢弃 | ✅ 已修 | 同上：改发显式 `[start, end]` 对 |
| P1-4 灵感页丢 `settings` | ✅ 已修 | `sdkwork-agents` `be0a8c4`：两侧统一走 commons 的 `writeCreativeHandoff` / `consumeCreativeHandoff` |
| P1-6 标准扩展门禁红 | ✅ 已修 | `c035da4b`：重跑 stamper（app-api/backend-api 两份契约此前整体丢失 `x-sdkwork-*` 扩展），`--check` 现 exit 0 |
| P1-5 非默认 vendor 轮询 404 | ✅ 已修 | `sdkwork-generations` `a4b32b5`：`resolve_polling_provider` 先精确匹配 `(modality, vendor)`、再退回该模态的聚合适配器（与派发侧 `resolve_provider` 同形）。同时修掉同函数「空轮询 / 持久化失败返回 `None`」——`get_generation` 把它变成 404，即**刚创建成功的任务在下次读取时被报成不存在**，只有仓储真的查不到才是 404 |
| P1-7 三份路径→api_code 映射 | ⚠️ 部分 | 漂移已修、门禁已加：`passthrough.rs` 补回缺失的 `anthropic.messages`（改前实测两份拷贝 29 vs 28 条，其余 28 条逐字一致 —— 属真实漂移，非格式差异）；新增 `tools/check-cloudrouter-ai-routing-consistency.mjs`（`pnpm api:ai-routing-consistency:check`，已挂入 `_sdkwork:check`）。**三份拷贝本身仍未合并**：门禁拦得住漂移，消除不了重复 |
| P1-8 无轮询调度器 / webhook | ❌ 未修 | 超出本次范围 |
| P2-1 面校验对未知前缀静默放行 | ⚠️ 云路由侧已实证，框架侧未动 | `bootstrap.rs` 的那条前缀断言只覆盖 open-api manifest；本轮在其同测试内补上**对整个合并 manifest（app-api + backend-api + open-api）的全量断言**：任何一条路由分类为 `Unknown` 即报错并逐条点名。真实执行通过 → 云路由的路由清单**没有**未分类路由。`sdkwork-web-framework` 的 `route_manifest.rs:200` `Unknown => {}` 本身仍未动（改动它会波及所有服务的启动校验，风险超出本次范围） |
| P2-2 两个 e2e 测试无 seed 覆盖 | ⚠️ 部分：e2e 已真跑，seed 仍未接入 | 仍自建内存 catalog（未接 `data/ai-routing`），但**已在本机真实编译并执行**：见 8.1。seed 与 arm 的两端一致性改由第 4 类门禁覆盖 |
| P2-3 … P2-8 | ❌ 未修 | 死代码、TODO 端点、unsplash 假图、空模型 facet、隐式网关约定 |
| P2-9 **（本轮新修）** assembly 默认 features 编译不过 | ✅ 已修 | `crates/sdkwork-api-cloudrouter-assembly/Cargo.toml`：把 `sdkwork-web-bootstrap.workspace = true` 改为显式 opt-in `{ workspace = true, features = ["redis"] }`，与 `sdkwork-api-cloudrouter-standalone-gateway` 的写法对齐（后者一直这么写，只有 assembly 漏了）。`cargo check -p sdkwork-api-cloudrouter-assembly` → **exit 0**（1m01s）；`cargo test -p sdkwork-api-cloudrouter-assembly` → **11 passed / 0 failed**，其中 `merged_route_manifest_passes_standalone_gateway_surface_auth_validation` 正是此前够不着的那条 |
| P2-10 **（本轮新发现并已修）** seed `pathTemplate` 与接收入口漂移 | ✅ 已修 | `vendor-native-resources.json` 两处对齐到 arm 实际接受的路径（`/v1/claude-code/sessions`、`/v1beta/live/sessions`）；并给 `check-cloudrouter-ai-routing-consistency.mjs` 加**第 4 类检查**：每条 literal arm 的 `api_code` 必须在 seed 有 `api_endpoint` 声明，且其 `pathTemplate` 必须与至少一个该 code 的 arm 路径相容（相等 / arm 带厂商前缀时后缀相等 / `{voice_id}` 与 `{voiceId}` 视为同形）。`minimax.music_generation` 有三个别名 arm、seed 只需登记其一，故按「组级」判定而非逐 arm |

第三轮提交（cloudrouter，均已 push）：

| commit | 内容 |
| --- | --- |
| `0f860d2b` | `fix(cloudrouter-assembly)`：P2-9 的 redis feature + P2-1 的合并 manifest 全量分类断言 |
| `6058f590` | `test(edge-runtime)`：audio / avatar-motion 两个 e2e 套件入库，`media_routing_e2e` 补 volcengine speech 能力 |
| `a9f7a454` | `fix(ai-routing)`：两处 `pathTemplate` 对齐 + 一致性门禁第 4 类检查 |
| （本文件） | `docs(audit)`：第三轮状态 |

### 8.1 本轮可复核的验证证据

```bash
# cloudrouter（c035da4b）
node tools/sync-cloudrouter-api-standard-extensions.mjs --check      # exit 0（修复前 exit 1，6 文件 drift）
node tools/generate-cloudrouter-http-route-manifest-rs.mjs --check   # 31/120/167 ok
node scripts/materialize-apis-contracts.mjs --check                  # passed

# open-api 契约 122 条路径全部落入 OPEN_API_PREFIXES（0 条会 401）
#   复刻 bootstrap.rs 断言的 startsWith 前缀语义 → 未覆盖 = 无

# 本轮 8 条新增 api_code 在 taxonomy / 资源 / 厂商组 三处齐备（脚本逐项核对）
#   vidu.motion_sync  kling.avatar  kling.motion_control  volcengine.speech
#   elevenlabs.text_to_speech  elevenlabs.sound_generation
#   suno.music_generation  suno.music_task_query

# generations（29a1b84 / 7898d3c）
node tools/check_generations_route_contract.mjs --root .   # ok (21 = 21)，反例 exit 1
node ../sdkwork-specs/tools/validate-api-assembly.mjs --root .  # passed (2 route crates)
cargo test -p sdkwork-generations-provider-adapter          # 39 passed; 0 failed

# agents（be0a8c4）
npx tsc --noEmit   # 27 errors → 27 errors，零新增；余下 27 条为跨仓工作区包缺失
```

第二轮（P1-5 / P1-7，同日更晚）：

```bash
# cloudrouter（dedcb9b7）
node tools/check-cloudrouter-ai-routing-consistency.mjs --root .   # passed
#   path -> api_code map: classifier 29 arms, passthrough 29 arms
#   seeded api codes: 56 across data/ai-routing/resources, 0 unknown to the taxonomy
#   open-api contract: 122 paths, 0 outside OPEN_API_PREFIXES
#   OPEN_API_PREFIXES: standalone gateway 12, bootstrap mirror 12
# 反例（必须会红）：删掉 /v1/messages 那条 arm + 往 seed 注入一个 bogus apiCode
#   → exit 1，两类漂移都被点名到具体条目

# generations（a4b32b5）
cargo test -p sdkwork-intelligence-generations-service   # 6 passed; 0 failed

# Rust 断言已真实执行（不再是 Node 侧复刻，见 8.2）
# RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu + PATH 含 D:/programs/mingw64/bin
cargo test -p sdkwork-cloudrouter-router-service --test ai_route_taxonomy   # 2 passed; 0 failed
```

第三轮（P2-9 / P2-1 全量断言 / P2-2 真跑 / P2-10，同日再晚）：

```bash
# 全部命令前置：
export PATH="/d/programs/mingw64/bin:$PATH"
export RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu

# --- P2-9：assembly 修复前 exit 101(E0425)，修复后 ---
cargo check -p sdkwork-api-cloudrouter-assembly          # exit 0, 1m01s
cargo test  -p sdkwork-api-cloudrouter-assembly          # 11 passed; 0 failed
#   其中 merged_route_manifest_passes_standalone_gateway_surface_auth_validation
#   内含本轮新增的「整个合并 manifest 无 Unknown 路由」断言（P2-1）

# --- P2-2 / 第 7 节：三个 e2e 首次真实编译并执行 ---
cargo test -p sdkwork-cloudrouter-edge-runtime \
  --test media_routing_e2e --test audio_vendor_routing_e2e --test avatar_motion_routing_e2e
#   audio_vendor_routing_e2e   4 passed; 0 failed
#     elevenlabs text-to-speech / volcengine speech / suno music / minimax music
#   avatar_motion_routing_e2e  3 passed; 0 failed
#     kling avatar / kling motion-control / vidu motion sync
#   media_routing_e2e          7 passed; 0 failed
#     gemini veo / openai image2 / openai video / seedance(volcengine) / vidu video /
#     gemini image / kling video
#   合计 14 passed / 0 failed（编译 11m04s）
#   链路：Bearer API-key → 账户组池 → 路由策略/规则 → 路由账户(base_url+secret_ref)
#         → 密钥解析 → 真实 HTTP 打到本地 mock 上游 → 响应透传；
#         逐条断言转发路径与 Authorization 头，例如
#         /elevenlabs/v1/text-to-speech/{voice} → 上游 /v1/text-to-speech/{voice}
#         与 seed 的 elevenlabs.text_to_speech pathTemplate 逐字一致

# --- P2-10：第 4 类门禁 ---
node tools/check-cloudrouter-ai-routing-consistency.mjs --root .   # passed
#   passthrough: 24 literal arms over 20 api codes, 5 predicate arms not comparable
#   classifier:  24 literal arms over 20 api codes, 5 predicate arms not comparable
# 反例 A（seed 侧改坏）：把 kling.avatar 的 pathTemplate 改成 /v1/videos/avatars-typo
#   → exit 1，两份拷贝各点名一条，两侧值都列出：
#     "kling.avatar: arms accept /v1/videos/avatar; data/ai-routing/resources declares /v1/videos/avatars-typo"
# 反例 B（arm 侧无 seed 声明）：把 seed 的 kling.avatar 改名为 kling.avatar_typo
#   → exit 1，两处独立报红：
#     "api codes the path map can return but no seeded api_endpoint declares: kling.avatar"
#     "seeded but absent from ai_route_taxonomy.rs: kling.avatar_typo"
# 两次反例均按字节还原并校验（sha256 比对一致）

# 同批其余门禁未受影响
node tools/generate-cloudrouter-http-route-manifest-rs.mjs --check   # 31/120/167 ok
node tools/sync-cloudrouter-api-standard-extensions.mjs --check      # stamped=0 ok
```

**修正 P2-10 的第一版结论**：初次用脚本核对时把 `minimax.music_generation` 也报成了漂移，
但它的三条 arm（`/v1/music_generation`、`/v1/music/generations`、`/v1/music/generation`）
是**别名集**，seed 登记的 `/v1/music/generations` 就在其中 → 实际只有 `anthropic.claude_code`
与 `gemini.live` 两处是真漂移。门禁因此按「api_code 组级」判定，而非逐 arm。

### 8.2 工具链缺口已解除；assembly 的那条断言已真实执行

上一版这里写着「cloudrouter 的 `cargo test` 跑不了」。**该结论已作废**：本机 `rustup` 同时装着
`stable-x86_64-pc-windows-msvc`（`rust-toolchain.toml` 的 `channel = "stable"` 在本仓解析到它，
而它的 Windows SDK 缺 Include/Lib）与 `stable-x86_64-pc-windows-gnu`；MinGW 在
`D:/programs/mingw64`，只是不在 PATH。补上 PATH 并显式选 GNU 工具链即可真正编译与执行：

```bash
export PATH="/d/programs/mingw64/bin:$PATH"
export RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu

cargo check -p sdkwork-cloudrouter-edge-runtime                               # exit 0
cargo test  -p sdkwork-cloudrouter-router-service --test ai_route_taxonomy    # 2 passed; 0 failed
```

于是 P0-4 / P0-5 的 `ai_route_taxonomy` 断言从「Node 侧等价核对」变成了**真实执行**。

**仍然跑不了的只剩 `sdkwork-api-cloudrouter-assembly`，而且原因与工具链无关**：
`crates/sdkwork-api-cloudrouter-assembly/src/feeds_open_runtime.rs:91-102` 调用了
`sdkwork_web_bootstrap::shared_rate_limit_store` / `shared_idempotency_store` /
`shared_concurrent_admission_store`，而这三个函数在 `sdkwork-web-bootstrap` 里被
`#[cfg(feature = "redis")]` 门控，assembly 的 `Cargo.toml` 又没有 `[features]` 段去启用它。
这不是本次引入的：`feeds_open_runtime.rs` 处于 HEAD 版本（工作树无改动），且
`cargo check -p sdkwork-api-cloudrouter-assembly`（**不带 `--test`**）在默认 features 下同样以
E0425 exit 101 —— 该 crate 在本机默认 features 下本来就编译不过，`bootstrap.rs` 里那条前缀覆盖
断言因此够不着。已记入第 3 节清单末尾的 P2-9。

> **更正（第三轮）**：上面这段描述的缺口**已经修掉**。assembly 的 `Cargo.toml` 现在与
> `sdkwork-api-cloudrouter-standalone-gateway` 一致地写成
> `sdkwork-web-bootstrap = { workspace = true, features = ["redis"] }`（后者一直这么写，
> 只有 assembly 漏了）。`cargo check` exit 0、`cargo test` 11 passed / 0 failed，
> `bootstrap.rs` 那条前缀覆盖断言**已在本机真实执行**，不再是「Node 侧等价替代」。
> 本轮又在同一测试里补了一条更强的断言：整个合并 manifest（app-api + backend-api + open-api）
> 中任何一条路由分类为 `Unknown` 即报错（P2-1 的云路由侧闭环）。

它并没有失去覆盖：`tools/check-cloudrouter-ai-routing-consistency.mjs` 在 Node 侧对
**同一批来源**做等价断言，而且更强 —— 除了 122 条契约路径的前缀覆盖，还额外校验
`OPEN_API_PREFIXES` 与 `bootstrap.rs` 镜像逐项一致（12 vs 12），这是 Rust 那条断言没做的部分。

**仍未执行**：真实厂商调用（打真实外部端点）。链路本身——含真实 HTTP 派发到 mock 上游——已由
三个 e2e 测试实证（14 passed），见第 7 节与 8.1。

### 8.3 提交后仍未跟踪/未提交的旁支

> **更正（第二轮）**：上一版把 `crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs`
> 和 `sdkwork-generations` 的 `gateway.rs` / `generations_service.rs` / `handlers.rs` 列为
> 「不属于本次改动，未纳入提交」，**这个判断是错的**。它们未提交的内容正是本链路自己缺的那一半：
> `passthrough.rs` 的 8 条厂商映射是 P0-5 在 edge 侧的配套，generations 那三个文件是
> avatar / motion_mimicry 的网关与 handler 实现。只提交契约不提交实现，会让 HEAD 连自己带的门禁
> 都过不了 —— `check_generations_route_contract.mjs` 断言 21 个操作都要有 handler，而 adapter
> 调用的 9 个 gateway 方法在当时的 HEAD 上并不存在。两者均已随本轮提交
> （`dedcb9b7` / `a4b32b5`）。

> **更正（第三轮）**：上一版把 `crates/sdkwork-cloudrouter-edge-runtime/tests/media_routing_e2e.rs`
> 的改动和未跟踪的 `tests/audio_vendor_routing_e2e.rs` / `tests/avatar_motion_routing_e2e.rs`
> 也列为「真正无关的旁支」，**同样是错的**，而且是同类误判的第二次。这三个测试覆盖的正是
> 本专题修复的那批厂商原生路径（elevenlabs / volcengine / suno / minimax 音频，
> kling avatar / motion-control、vidu motion sync）；把它们留在工作树里，意味着本轮的修复
> **没有任何回归测试**——P0-5 的 passthrough 映射与 provider-adapter 派发可以再次漂移而全绿。
> 第三轮已把三者一并提交（`0855dc04`，amend 后为 `6058f590`），并在本机真实跑通 14 passed。

以下才是真正无关的旁支，仍未提交：

- `sdkwork-cloudrouter`：`Cargo.toml` / `Cargo.lock`、`apis/manifest.json`、
  `crates/sdkwork-cloudrouter-config/src/database.rs`、
  `crates/sdkwork-cloudrouter-observability/src/tracing_setup.rs`、
  `scripts/plan-cloud-router-install-packages.mjs`、`scripts/start-cloud-router-production.mjs`、
  `docs/guides/developer/README.md`、`docs/audit/DELETED-FILE-FORENSICS-2026-09-11.md`、
  `data/skills/cloudhub/...`、`sdks/cloudrouter-open-sdk/.../package.json` 的 `workspace:*` 改写；
  `package.json` 里 `check:rust-dependency-singularity` 那一行（配套脚本仍未跟踪，所以
  `package.json` 一直是逐行暂存的，只提交过 `api:ai-routing-consistency:check` 那两处）；
  未跟踪：`scripts/check-rust-dependency-singularity.mjs`、`scripts/rust-dependency-singularity.baseline.json`。
  `Cargo.lock` 的 233+/687- 是这一摊的（h2 / hyper / rustls 多版本去重）；assembly 启用
  `redis` feature **不需要**动 lock —— 该 crate 的 lock 条目只列 `sdkwork-web-bootstrap`，
  且 `redis` / `sdkwork-web-store-redis` 早已因 standalone gateway 而在 lock 里，
  `cargo metadata --locked` exit 0 佐证。
- `sdkwork-generations`：`Cargo.lock`。

---

## 9. 第四轮：厂商原生路径被 SDK 重复前置 `/v1`（P1-11）

### 9.1 现象（探针实证，非推断）

在 `crates/sdkwork-cloudrouter-edge-runtime/tests/avatar_motion_routing_e2e.rs` 里临时加了一个
探针测试，把同一条链路打两遍，只换请求路径：

```text
POST /kling/v1/videos/avatar        → 200，命中 kling 路由账户，上游收到请求
POST /v1/kling/v1/videos/avatar     → 404
  body: {"error":{"message":"Not found","type":"invalid_request_error","code":"not_found"}}
  kling_calls = 0                      ← 连路由账户都没走到
```

**这是七类内容生成里最致命的一种失败**：契约、SDK、seed、路由账户、价格全都对，
但 SDK 客户端发出去的路径多了一层前缀，请求在入站分类阶段就被归成 OpenAI 兼容请求，
厂商原生分支永远不可达。探针已按纪律回退，没有留下。

### 9.2 根因链

1. `crates/sdkwork-cloudrouter-edge-runtime/src/.../invocation_http.rs:572` 的无条件分支：
   任何 `path == "/v1" || path.starts_with("/v1/")` 都交给 `OpenAiResourceClassifier`。
   于是 `/v1/kling/...` 永远不会落到 `provider_native_api_code_from_standard_path` 的 arm 上。
2. 九语言 SDK 的路径 helper（`API_PREFIX = "/v1"`）会把**不以 `/v1` 开头**的路径前置 `/v1`。
   对 OpenAI 兼容契约路径（`/v1/models`）是恒等变换，对厂商原生路径（`/kling/v1/videos/avatar`）
   就变成 `/v1/kling/v1/videos/avatar`。
3. `sdkwork-sdk-generator` **九个语言都实现了**这条豁免
   （`pathUsesPrefixHelper = !this.vendorPathPrefixes.includes(firstPathSegment)`），
   输入取自 spec 的 `x-sdkwork-vendor-path-prefixes`。
4. **但 cloudrouter 的 open-api 契约从来没有声明这个字段**（4 处契约产物 `grep -c` 全为 0）。
   历史提交 `4055fcbf`（2026-09-04）曾经**手工把该字段写进生成物**，随后被某次重新生成抹掉 ——
   这正是「手改产物、不改生产者」的必然结果。

### 9.3 同一根因下的第二个缺陷：契约生成器已过期

用**未改动**的生成器重新生成，比检出的 `apps/sdkwork-cloudrouter-pc/public/openapi.json`
**小 23,541 字节**，少 9 个 schema 和 5 条路径：

```text
/kling/v1/videos/avatar            /kling/v1/videos/motion-control
/minimax/v1/music_generation       /vidu/ent/v2/template
/volcengine/api/v3/audio/speech
```

它们是 `c035da4b`（"land the vendor-native content-generation route chain"）**直接编辑契约产物**
加进去的 —— 该提交改的 39 个 `.py` 全是生成的 Python SDK，**没有碰任何生产者脚本**。

后果：`python -B -m tools.cloudrouter_gateway_openapi_generator --check` 在 **main 上就是红的**。
本轮的 SDK 前缀缺陷，与契约漂移是同一个洞的两面。

### 9.4 第三个缺陷：厂商标识清单四处漂移

「这个路径属于哪个厂商」这件事被四份清单分别回答，缺一份就是**静默误分类**：

| 清单 | 缺谁 | 后果 |
| --- | --- | --- |
| `VENDOR_PROVIDER_PREFIXES`（网关契约生成器） | `minimax` | 自己的 vendor schema quality audit 会漏审 |
| `inferExternalProtocolId`（标准扩展 sync） | `minimax` | 回落 `cloudrouter-vendor-relay` |
| `isExternalWireProtocolRoute`（标准扩展 sync） | `minimax` | 被当成 SDKWork 信封业务流量 |
| `infer_external_protocol_id`（SDK 运行时标准化器） | `minimax`、`elevenlabs` | `/elevenlabs/v1/sound-generation` 在 `sdks/**` 里被标成 `cloudrouter-vendor-relay` |

### 9.5 修复

**生产者侧（让声明成为产物，而不是手改）**

- `tools/cloudrouter_gateway_openapi_generator.py`：补齐上述 5 条厂商原生路径与 9 个 schema
  （`KlingAvatarCreateRequest` / `KlingMotionControlRequest` / `ViduTemplateRequest` /
  `MiniMaxMusic*` 共 6 个）；新增 `OPEN_API_PREFIX` 与
  `vendor_path_prefixes_from_paths()`，**从自己服务的路径反推** `x-sdkwork-vendor-path-prefixes`；
  补 `minimax` 进 `VENDOR_PROVIDER_PREFIXES` 与 tags（新增 `Audio/minimax`）。
- `tools/sync-cloudrouter-api-standard-extensions.mjs`：两张清单补 `minimax`；
  `stampOpenApiExtensions` 把该声明一并盖到 **`apis/**`（下游真正读的那份契约）**上。
- `tools/cloudrouter_sdk_runtime_standardizer.py`：`infer_external_protocol_id` 补 `minimax`
  与 `elevenlabs`。

**消费侧（跨仓：`sdkwork-sdk-generator`）**

契约声明生效后，厂商原生模块不再调用 prefix helper，于是**三个生成器的无条件导入变成了未使用导入**：

| 语言 | 未使用导入 | 严重性 |
| --- | --- | --- |
| Rust | `use crate::api::paths::ai_path;` ×17 | **硬失败**：本仓 `rust compile warnings gate` 用 `RUSTFLAGS=-D warnings` |
| TypeScript | `import { aiApiPath } from './paths';` ×17 | 卫生（`noUnusedLocals` 未开，构建通过） |
| Dart | `import 'paths.dart';` ×4 | 卫生（无门禁覆盖） |

三处均按「该文件是否真的会调用 helper」决定导入：Rust / TypeScript 复用逐操作的厂商前缀判定，
Dart 直接看渲染出的方法体里有没有 `ApiPaths.`。

**顺带修正的措辞（被仓库既有护栏拦下）**：仓库断言公开契约不得出现 `native` / `passthrough`
字样（`test_public_vendor_operations_do_not_expose_passthrough_contracts`、
`..._schema_quality_for_reference_rendering`）。我从 HEAD 契约逐字移植的
`ViduTemplateRequest.payload` 描述含 "passthrough"，自己新写的 5 条描述含 "vendor-native" ——
两者都改成与同族一致的 `using the configured ... provider account` 句式。

### 9.6 门禁：两条新检查 + 负向验证

`tools/check-cloudrouter-ai-routing-consistency.mjs`：

- **检查 5 增强**：在原有「四份厂商标识清单与契约一致」之上，增加
  「契约服务的厂商命名空间集合 ⟺ `x-sdkwork-vendor-path-prefixes` 声明集合」双向比对
  （多声明=phantom 也报错）。命名空间从契约派生，所以这条检查自身不会漂移。
- **检查 6 新增**：扫描 `sdks/cloudrouter-open-sdk/**` 九语言源码（2367 个文件，跳过
  `node_modules` / `.sdkwork` / `dist` / `build`），命中 `/<prefix>/<vendor>/` 即失败并点名文件。

**负向验证（两次都做，且都按字节还原）**

```text
# 删掉 sync 里 minimax 那一行
→ exit 1: "inferExternalProtocolId does not know 1 namespace(s)... /minimax/..."

# 往生成好的 Rust 模块注入 "/v1/kling/v1/videos/avatar"
→ exit 1: "1 generated call site(s) mount a vendor-native path under "/v1""
          "  sdks/cloudrouter-open-sdk/.../src/api/videos_kling.rs: /v1/kling/"
```

### 9.7 验证矩阵

```text
python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator
  → 62 passed（root_schema_names 期望值 47 → 57，因为契约真的多了 9 个 schema）

python -B -m tools.cloudrouter_gateway_openapi_generator --check   → exit 0
node tools/sync-cloudrouter-api-standard-extensions.mjs --check    → exit 0（stamped=0）
node scripts/materialize-apis-contracts.mjs --check                → passed
node tools/check-cloudrouter-ai-routing-consistency.mjs --root .   → passed
  generated SDKs: 2367 source files scanned, 0 prepend "/v1" to a vendor-native path

九语言生成物逐条核对：/kling/v1/videos/avatar 全部为裸路径（csharp/flutter/go/java/
  kotlin/python/rust/swift/typescript 各 1 处），"/v1/kling/" 残留 0 条

Rust：cargo check --all-targets + RUSTFLAGS=-D warnings → exit 0（17 个警告清零）
TypeScript：生成包 build → exit 0
```

**注意 `publish-core.mjs --action check` 在本机跑不了**：它内部 `cargo check` 用 MSVC 工具链，
而 Git Bash 的 `/usr/bin/link.exe`（coreutils）抢在 PATH 前面，报
`link: extra operand`。改用 GNU 工具链 + `D:/programs/mingw64/bin` 前置即可编译
（本机装着 `stable-x86_64-pc-windows-gnu`，与第 8.2 节的结论一致）。

### 9.8 提交

- `sdkwork-sdk-generator`：`24d5a88` — 三个生成器的条件导入（+23/-6）。
- `sdkwork-cloudrouter`：`4c1c1b64` — 生产者补齐 + 门禁 + 契约与九语言生成物（280 文件，+4910/-4123）。

刻意排除（均属其它会话，与本次无关）：`Cargo.toml` / `Cargo.lock`、
`crates/sdkwork-cloudrouter-config/src/database.rs`、
`crates/sdkwork-cloudrouter-observability/src/tracing_setup.rs`、
`data/skills/cloudhub/...`、`docs/guides/developer/README.md`、
`docs/audit/DELETED-FILE-FORENSICS-2026-09-11.md`、`package.json`（别会话正在给每条 script
加 `node scripts/lib/ensure-cloud-router-node-deps.mjs &&` 前缀）、
`scripts/plan-cloud-router-install-packages.mjs`、`scripts/start-cloud-router-production.mjs`、
`sdks/cloudrouter-open-sdk/cloudrouter-open-sdk-typescript/package.json`（`workspace:*` 改写）、
未跟踪的 `scripts/check-rust-dependency-singularity.mjs` 与 `*.baseline.json`。

> `apis/manifest.json` 本轮**纳入提交**：它的 3 行 sha256 变化是 `materialize --apply` 的确定性产物，
> 且 `materialize --check` 通过。第 8.3 节把它列为旁支是上一轮的口径，当时没有跑 materialize。

### 9.9 本轮顺带找到、但**未修**的既存缺陷

| # | 位置 | 事实 | 影响 |
| --- | --- | --- | --- |
| N-1 | `tests/test_api_contract_directory_standard.py:22` | 对三个 `apis/**` 契约统一断言 `openapi == "3.1.2"`，但 `apis/open-api/...openapi.json` 在 **HEAD 上就是 `3.0.3`**（网关生成器固守 3.0，且有单测断言 3.0.3） | **main 上该测试就是红的**；3.0.3 → 3.1.2 不是换版本号就行（`nullable`、`$defs` 语义不同），需先定方向 |
| N-2 | `scripts/run-cloud-router-application.test.mjs:5943` | `production SDK archiver` 硬编码期望 `...-0.1.0.zip`，而 `sdks/*/*-typescript/package.json` 在 **HEAD 上就是** 0.1.5 / 0.1.6 | main 上就红 |
| N-3 | 同上 `:6056` | 读 `sdks/cloudrouter-app-sdk/cloudrouter-app-sdk-typescript/src/api/ai.ts`，该目录只跟踪着 `index.ts`，`api/ai.ts` **从未被跟踪** | 必然 `ENOENT`；app-sdk 生成物缺失（迁盘遗留类型） |
| N-4 | `sdks/*/.../generated/server-openapi/Cargo.lock` | 三个 SDK 的 Rust 生成包都不跟踪该文件，`.gitignore` 也**不忽略**它 | `cargo check` 会留下一个未跟踪文件（本轮已清理） |
| N-5 | `scripts/verify-cloud-router-application.mjs` 的 `frontend source hygiene tests` | 命令是 `python -B -m unittest tests.test_frontend_source_hygiene_standard`，**该模块不存在** | 该步永远 error |
| N-6 | 环境 | managed Python 3.13.12 **没有 PyYAML** → `unittest discover tests` 报 43 个 `No module named 'yaml'` error；TEMP 为 8.3 短名 `CHARLE~1` 时 `test_writes_and_checks_gateway_openapi_spec` 路径断言假红 | 已建隔离 venv（`envs/default`，pyyaml 6.0.3）并用长名 TEMP 解决；**这不是代码缺陷，但会让「跑全量测试」变成噪声** |
| N-7 | `scripts/verify-cloud-router-application.mjs` 首步 | `sdkwork-models catalog check` 依赖 `../sdkwork-utils/packages/sdkwork-utils-typescript` 的 `dist`，本机未构建 | verify 在这里就 exit 1，后面的门禁压根没跑（跨仓前置，迁盘遗留类型） |

N-1 ~ N-3 是**仓库自带门禁在 main 上就红**，属独立议题；N-5、N-7 让两条验证通道失效，
会让人误判「门禁全绿」。三项都需要单独定方向，未在本轮改动。

---

## 10. 第 5 轮：修复验证通道并落地 OpenAPI 3.1.2 open-api 契约（2026-09-16 晚）

提交：`sdkwork-cloudrouter` `cb757b54`（14 文件，+81/−58）、
`sdkwork-models` `eb55b6a`（1 文件，+298）。

### 10.1 N-7：verify 首步就挂，后面所有门禁压根没跑

`scripts/lib/ensure-models-catalog-deps.mjs` 硬编码要求
`../sdkwork-utils/packages/sdkwork-utils-typescript/dist/crypto.js`。但该包的 `exports` **整体指向
`./src/*.ts`**（Node 22.18+ 通过原生 type stripping 直接加载），`tsconfig.json` 虽写着
`outDir: "dist"`，实际 `dist/` 从未生成过；`src/` 里散落的 `.js`/`.d.ts` 是被
`.gitignore:87 **/src/**/*.js` 挡住的零散产物。

实证：建好 junction 后 `await import('@sdkwork/utils/crypto')` → `sha256Hash = function`，
`tools/catalog-lib.mjs`（`import { sha256Hash } from "@sdkwork/utils/crypto"`）加载成功。
⇒ 这条检查**已过时**。

**修法**：不再猜目录，改为读包 `package.json` 的 `exports['./crypto']`（依次取
`import` / `default` / `types`），校验解析出的真实入口存在。

**连锁价值**：`verify` 是 fail-fast 的（`runStep` 非零即 reject，`main()` 抛出后
`process.exit(1)`），首步一挂 ⇒ 后续**全部**不跑。修掉这一处后才暴露出下一层真红：
`release-catalog.mjs --check` 报 `releases/2026.09.06.1.json is missing` ——
`models/index.json` 等 6 个声明文件早已升到 `2026.09.06.1`，唯独 release 快照没生成。
用 `node tools/release-catalog.mjs` 补出后 `models:check` exit 0（已单独提交到 models 仓）。

### 10.2 N-5：verify 与测试都在指向一个已被删除的模块

`tests/test_frontend_source_hygiene_standard.py`（2269 行）在 `23559fcc`
（2026-06-29 一次近 10 万文件的巨型 sync，同批删掉 14 个 `tests/*.py`）中被移除。
它引用的是**旧仓名** `apps/sdkwork-clawrouter-pc` 与 `sdkwork-appbase` 旧布局，
职责（portal 源码卫生 + 媒体资源契约）在 `e8041647`（clawrouter → cloudrouter 改名）
之后已由本仓 commercial contract guardians 里的
`frontend_static_source_manifest` / `frontend_contract_guardian` /
`frontend_operation_audit` / `frontend_field_audit` 承担。

但**引用没跟着清理**：`verify-cloud-router-application.mjs` 三个 plan（fast / precommit / 主）
各有一处该步骤，`run-cloud-router-application.test.mjs` 有 5 处断言（3 个 plan 的
label/commandLine 精确 `deepEqual` + 2 处位置约束 `hygieneIndex < typecheckIndex/buildIndex`，
其中 `:8217` 还硬编码了那条命令字符串）。

**修法**：删掉 3 处死步骤；断言改为指向**真实存在**的接管门禁
（新增 `verification plan runs frontend hygiene guardians before portal build`，
断言 4 个 guardians label 存在且都早于 portal typecheck / production build）。

> ⚠️ 本轮踩坑记录：第一次只删步骤、未同步断言 ⇒ `run-cloud-router-application.test.mjs`
> 从 20 条 not ok 涨到 23 条（我引入 3 条回归）。**判据靠 baseline 对比**：
> `git checkout HEAD -- <verify 脚本>` 跑一遍得 baseline，再还原自己的版本跑一遍，`diff` 逐条比。

### 10.3 N-1：open-api 的 OpenAPI 版本与另两份 surface 不一致

| surface | 修复前 | `nullable` 数 | `jsonSchemaDialect` | 权威来源 |
| --- | --- | --- | --- | --- |
| open-api | **3.0.3** | 48 | **无** | `tools/cloudrouter_gateway_openapi_generator.py` |
| app-api | 3.1.2 | 86 | `.../draft/2020-12/schema` | `scripts/materialize-apis-contracts.mjs` ← Rust 导出 |
| backend-api | 3.1.2 | 215 | 同上 | 同上 |

关键澄清：**`nullable` 在 3.1.2 里合法与否不是本仓的判据** —— 另两份已经「声明 3.1.2 +
保留 `nullable` + 声明 `jsonSchemaDialect`」，本仓既定做法如此
（`tools/cloudrouter_sdk_runtime_standardizer.py` 的 `_dynamic_json_boundary_schema`
也在 3.1.2 契约里产出 `nullable: True`）。且 `tests/test_cloudrouter_openapi_contract_audit.py`
的负例 `test_rejects_openapi_30_contracts` 明确断言 auditor 会拒绝 3.0.3。
⇒ open-api 是**唯一掉队的**，对齐即可，**不需要**做 `nullable` → `type: [T, "null"]` 迁移。

**修法**：生成器改 `3.1.2` + 加 `jsonSchemaDialect`，然后**传播到每一个消费者**：

| 消费者 | 位置 |
| --- | --- |
| Rust http 路由测试 | `crates/sdkwork-cloudrouter-http/tests/service_router.rs:131` |
| Rust edge 测试 | `crates/sdkwork-cloudrouter-edge-runtime/tests/edge_server.rs:1390` |
| edge dev smoke **运行时校验** | `scripts/smoke-edge-dev-server.mjs:331` |
| 工具契约测试（3 处） | `run-cloud-router-application.test.mjs:7077/7092/7106` |
| 生成器单测 | `tests/test_cloudrouter_gateway_openapi_generator.py:29` |
| SDK standardizer **占位符契约** | `tools/cloudrouter_sdk_runtime_standardizer.py:1043` |

> `_render_placeholder_openapi` 那处是**埋雷**：源不可用时它会产出 3.0.3 占位契约，
> 而 auditor 要求 3.1.2 ⇒ 一旦触发降级就自相矛盾。无测试锁定，已一并改为 3.1.2 + dialect。

**传播链**（本仓唯一完整链）：`_render_placeholder` / 生成器 →
`apps/sdkwork-cloudrouter-pc/public/openapi.json` →
`tools/cloudrouter_sdk_runtime_standardizer.py --sdk-dir cloudrouter-open-sdk --openapi-only`
→ `sdks/cloudrouter-open-sdk/openapi/*.json` →
`scripts/materialize-apis-contracts.mjs --apply` → `apis/open-api/...` → `apis/manifest.json`
→ `tools/sync-cloudrouter-api-standard-extensions.mjs --apply`（盖 `x-sdkwork-*`，`stamped=0` 幂等）。

另外 `crates/sdkwork-cloudrouter-http/build.rs` 会把
`sdks/cloudrouter-open-sdk/openapi/cloudrouter-open-sdk.openapi.json` 拷成
`out/gateway-openapi.json`，所以**Rust 侧 payload 直接跟着这个文件变** —— 那两处 Rust
断言不是「顺手改」，而是**必须同步**，否则 `cargo test` 红。

**不需要**重跑 9 语言 SDK 生成：`grep -rl "3\.0\.3" sdks/` 在改动前后均为空 ⇒
生成的 SDK 不内嵌 openapi 版本字符串。

### 10.4 本轮实证的验收矩阵

| 验收项 | 结果 |
| --- | --- |
| `pnpm models:check`（原首步失败点） | exit 0 |
| `tests.test_api_contract_directory_standard`（原 main 红） | 3 passed |
| `tests.test_cloudrouter_gateway_openapi_generator` | 62 passed |
| `tests.test_cloudrouter_sdk_runtime_standardizer` | 25 passed |
| `tools.cloudrouter_gateway_openapi_generator --check` | current |
| `pnpm api:materialize:check` | passed |
| `pnpm api:standard-extensions:check` | passed（`stamped=0`，幂等） |
| `tools.cloudrouter_openapi_precision_audit` | passed |
| `tools.cloudrouter_payload_sdk_audit` | passed |
| `run-cloud-router-application.test.mjs` | 20 条 not ok，**与 HEAD baseline 逐条无差异** |
| `cargo test -p sdkwork-cloudrouter-http --test service_router` | 18 passed |
| `cargo test -p sdkwork-cloudrouter-edge-runtime --test edge_server` | 43 passed |

### 10.5 口径更正：那 20 条 not ok 与 `package.json` 无关

第 9.8 节曾记「20 项 not ok 多数由别会话正在改的 `package.json` 引起」。本轮实测**证伪**：

```bash
cp package.json /tmp/keep.json
git show HEAD:package.json > package.json
node scripts/run-cloud-router-application.test.mjs 2>&1 | grep -c "^not ok"   # 仍是 20
cp /tmp/keep.json package.json
```
两种 `package.json` 下**逐条完全相同** ⇒ 这 20 条是 **HEAD 自带的既存红**，
与工作树里别会话的改动无关。（工作树 `package.json` 的 diff 其实只有 2 处：
新增 `check:rust-dependency-singularity` 脚本 + 在 `_sdkwork:check` 里引用它。）

### 10.6 新发现的既存缺陷（未修）

| # | 位置 | 事实 |
| --- | --- | --- |
| **N-8** | `tools.cloudrouter_sdk_guardian` | 报 `sdks/cloudrouter-backend-sdk/openapi/*.json` 与 `generated/openapi/cloudrouter-backend-openapi.json` 不同步：`x-sdkwork-api-authority` 值漂移（`sdkwork-cloudrouter.backend` vs `sdkwork-cloudrouter-backend-api`）且缺 `x-sdkwork-permission`。设计文件不在本轮改动清单，属独立议题 |
| **N-9** | `tools.frontend_static_source_manifest --check` | 快照 schema/version 不符（`...-frontend-static-source-snapshots` / version 1），该 guardian 在 verify 里直接 exit 1 |
| N-2 / N-3 | `run-cloud-router-application.test.mjs` | 仍未修（`0.1.0.zip` 版本口径、未跟踪的 `app-sdk/.../api/ai.ts`） |

> 本轮**未**改动 `docs/guides/developer/README.md`：它仍把 `frontend source hygiene`
> 列为验证步骤，但该文件正被另一会话编辑（`00:57:46` 批次）⇒ 文档同步留给该会话或后续轮次。

## 11. 第 6 轮：把 16 个商业契约守门人从 3 红推到 1 红（2026-09-16 深夜）

提交 **`731d5c21`**（8 文件 +1657/−309）。三项修复同属一种形状：**契约声明了期望，仓库实物已漂移**。

### 11.1 N-8 定性更正：不是「值漂移」，是 **family 快照整份缺盖章**

§10.6 把 N-8 记成 `x-sdkwork-api-authority` 值差异 —— **不准确，此处更正**。
实测那 6 条 guardian 报错里，**4 条**的真因是 family 快照缺失全部 `x-sdkwork-*` 印章：

| 文件 | path 数 | 已盖章 operation 数（修复前） |
| --- | --- | --- |
| `generated/openapi/cloudrouter-app-openapi.json` | 25 | **31** |
| `sdks/cloudrouter-app-sdk/openapi/cloudrouter-app-sdk.openapi.json` | 25 | **0** |
| `generated/openapi/cloudrouter-backend-openapi.json` | 76 | **120** |
| `sdks/cloudrouter-backend-sdk/openapi/cloudrouter-backend-sdk.openapi.json` | 76 | **0** |

**根因链**（第 5 轮的操作不全）：family 快照的唯一生产者是
`standardizer._sync_sdk_family_openapi_snapshots()`，它从 `SDK_GENERATED_OPENAPI_PATHS[fam]`
（= `generated/openapi/*`，**已被 sync 盖章**）派生。第 5 轮只跑了
`--sdk-dir cloudrouter-open-sdk --openapi-only` ⇒ **只刷新 open-sdk**，app/backend 停在盖章前。

**修复**：不带 `--sdk-dir` 跑 `--openapi-only`（全量三 family），只改 4 个文件。

> open-sdk 为何不报错：它的 source 是 portal 契约（**本身不盖章**），期望值本就是 0 印章 ——
> 不是它更干净。这正是「报错集中在 app/backend」的原因。
>
> SDK 生成器**不消费**这 4 个扩展（`grep x-sdkwork-{permission,request-context,required-surface}`
> 在 `sdkwork-sdk-generator/src/` 与全部生成物里均 0 命中）⇒ **无需重跑九语言生成**。

### 11.2 守门人对**自身构建产物**误报（R2 类；`pnpm verify` 曾无法连跑两次）

`_check_composed_facade` 用 `rglob("*")` 收 `src/` 下**全部**文件，`!= ["index.ts"]` 即报错。
但 `tsc` 会**就地**把 `src/index.ts` 编译成 `index.js` / `index.d.ts` / 两个 `.map`，
其内容恰是 `export * from '../generated/server-openapi/src/index';`
—— **正是检查器要求的**那份薄 re-export；而 `.gitignore:172` 的官方注释
`# Compiled facade droppings ... (build output only)` 就是声明这 4 个。

| 取证 | 结果 |
| --- | --- |
| 移走那 4 个文件后跑 guardian | **`CloudRouter generated SDKs passed`（全绿）** |
| `.gitignore` 规则来源 | `e32cdfd2`（2026-09-11） |
| 产物 mtime | 2026-09-15（迁盘当天）⇒ 历史遗留 + 规则过时 |
| `pnpm --dir <composed> build` 是否产出它们 | **不产出**（落 `dist/`，见 `COMPOSED_BUILD_SCRIPT`） |

**后果（比误报更严重）**：guardian 排在 verify 计划的 build **之前**
（`COMMERCIAL_CONTRACT_GUARDIANS` 于 `verify-cloud-router-application.mjs:566`，
`buildSdkRuntimeBuildPlan` 于 `:568`）⇒ 第一次 verify 绿、**第二次必红**。

**修复**：`COMPOSED_FACADE_BUILD_OUTPUTS` **精确文件名**豁免（非后缀通配），
补正/负两个单测。负向实证：`src/sdk.ts` 与 `src/index.cjs` **仍被报** ⇒ 护栏未削弱。

### 11.3 N-9：**第二次**撞见 `23559fcc` 的悬空引用（与 N-5 同源）

| 项 | 事实 |
| --- | --- |
| 被删物 | `docs/schema-registry/frontend-static-source-snapshots.yaml`（58 行） |
| 删除者 | `23559fcc`（2026-06-29，那次删 **97998** 个文件的巨型 sync） |
| 谁还在引用 | `tools.frontend_static_source_manifest --check` ⇒ 在 verify 里直接 exit 1 |
| 关键反转 | **被跟踪的 `generated/schema/frontend/frontend-static-source-manifest.json` 早已是新仓名版本**（新 schema + 新路径）⇒ 有人重命名生成过 manifest，只是 yaml 从未补回 |
| 路由仍在否 | 6 条静态路由（`/`、`/docs`、`/models`、`/product-docs`、`/rankings`、`/sdk-reference`）**全部仍在** `frontend-route-classification.yaml` |

**修复**：按 manifest 的权威值重建 yaml（新 schema 名 + 新 `source_ref` + 以 manifest 为准的
`schema_tables`）。重建后 validate 通过，与已跟踪 manifest 的**唯一差异是 `source_hash`**
（源文件本身在迁移后改过）⇒ 重跑生成器即恒绿。3 个单测全绿。

> ⚠️ 别照抄 `23559fcc^` 那版 yaml：它带**旧仓名 `clawrouter`**，且 `/rankings` 的
> `schema_tables` 是过时的 `ai_usage_fact`（manifest 为 `ai_usage`）⇒ **manifest 比它新**。

### 11.4 守门人全景（16 个）

| 结果 | 守门人 |
| --- | --- |
| ✅ **15 绿** | sdk_guardian · skill_guardian · architecture · rust_backend_architecture · gateway_openapi `--check` · precision_audit · payload_sdk_audit · **frontend_static_source_manifest `--check`** · frontend_contract · schema · flyway · frontend_operation · frontend_field · java_legacy · repository_delivery |
| ❌ **1 红** | `sdkwork_standard_alignment_guardian --strict` —— 唯一条 FAIL 见 §11.5 |

### 11.5 唯一剩下的红：`standalone.production` topology profile 缺失（**交 owner 定**）

| 取证 | 结果 |
| --- | --- |
| 报错 | `standalone production topology profile is missing or is not repository-owned` |
| authority (`specs/topology.spec.json`) 声明 | **10 个** profile |
| `etc/topology/` 实物 | **8 个** ⇒ 缺 `standalone.production.env` + `cloud.production.env`（检查器只覆盖前者） |
| `git log -- <缺失路径>` | **空** ⇒ 从未存在，不是被删 |
| 本仓 production 的其它部分 | `apps/sdkwork-cloudrouter-pc/etc/browser/runtime-env.{standalone,cloud}.production.json` 与 `sdkwork.deployment.config.json` 的 `materialization.profiles` **均已声明** 8 个 profile |
| 兄弟仓 | 几乎**全有**这 10 个（`sdkwork-api-cloud-gateway` 等）；staging→production 已实测为机械替换：环境标识 + CORS 去 `-staging`（且 **production 仅保留 https**） |

**处置：未擅自创建。** 依据是本仓 owner 自己对同类 CORS 问题的处理口径
（`docs/audit/WORKSPACE-ALIGNMENT-REGRESSION-2026-09-11.md` §9.3：
「修复器存在，但……**另需 owner 确认域族登记**，故**未擅自动**」）。
生产域名/CORS 域族登记属 owner 决策，故仅报告。

### 11.6 本轮新实证的既存红（A/B 证明非本轮引入）

| 测试 | 条数 | 归因 |
| --- | --- | --- |
| `test_frontend_route_classification_standard` | **106**（75 FAIL + 31 ERROR） | 全在 `test_sdk_backed_routes_have_frontend_operation_contract_and_expected_sdk_surface`；回退到 HEAD 后跑出**同样 106** |
| `test_workspace_delivery_standard` | 2 | `CHECK_RESULT.md` 里查不到 `config/config.toml.example`；HEAD 版同样 2 |

### 11.7 验收矩阵（第 6 轮）

| 项 | 结果 |
| --- | --- |
| 16 个商业契约守门人 | **15 绿 / 1 红**（§11.5） |
| `cloudrouter_sdk_guardian` | ✅ `CloudRouter generated SDKs passed` |
| `frontend_static_source_manifest --check` | ✅ `Frontend static source manifest is current` |
| SDK guardian 单测 | ✅ 34（含新增正/负 2 条） |
| SDK standardizer 单测 | ✅ 25 |
| `test_frontend_static_source_manifest` | ✅ 3 |
| tooling 契约测试 | 20 条 `not ok`，与 HEAD baseline **逐条相同**（零回归） |
| 负向验证（guardian 护栏） | ✅ `src/sdk.ts` / `src/index.cjs` 仍被报 |

### 11.8 仍未修（承接 §10.6）

| # | 项 | 状态 |
| --- | --- | --- |
| N-2 | `run-cloud-router-application.test.mjs` 硬编码 `...-0.1.0.zip`（实际 0.1.5/0.1.6） | 未修 |
| N-3 | 同文件读 `sdks/.../typescript/src/<生成文件>.ts`，composed facade 现只有 `index.ts` | 未修 |
| N-11 | tooling 契约测试 20 条 `not ok`（HEAD 自带） | 未修，已确认与 `package.json` / 本轮改动均无关 |
| N-12 | `standalone.production` / `cloud.production` topology profile | **待 owner 决策**（§11.5） |
| N-13 | `test_frontend_route_classification_standard` 106 条 | 未修 |
| N-14 | `test_workspace_delivery_standard` 2 条 | 未修 |
| P1-8 | 无轮询调度器 / webhook | 未修（承接 §7） |
| 真实厂商调用 | 需真实凭证与网络 | 仍未实证（最后一跳唯一未验证环节） |


## 12. 第 7 轮：默认账号种子上线，七类能力全部有可路由账号（2026-09-16 夜 → 09-17 凌晨）

### 12.1 结论速览

| 能力 | 之前 | 现在 | 证据 |
| --- | --- | --- | --- |
| 图片生成 | 端到端可用 | 可用（回归保持） | `media_routing_e2e` 7/7 |
| 视频生成 | 部分可用 | 可用 | `media_routing_e2e`（gemini/kling/vidu/volcengine/openai） |
| 音乐 | 断（空池） | **有账号可路由** | `music_routing_*` 2/2（minimax / suno） |
| 配音/TTS | 断（空池） | **有账号可路由** | `tts_routing_*` 2/2（elevenlabs / volcengine） |
| 音效 | 断（空池） | **有账号可路由** | 归入 audio 分组（minimax/suno/volcengine/elevenlabs） |
| 数字人 | 断（空池） | **有账号可路由** | `avatar_routing_*` 1/1（kling） |
| 动作模仿 | 断（空池） | **有账号可路由** | `motion_routing_*` 2/2（kling / vidu） |

> 口径说明：本节证明的是「**账号可被路由到、且凭证可解**」。「真实打到第三方 API
> 并拿到成功响应」仍需真实密钥，属于 §11.8 那条仍未实证的最后一跳。

### 12.2 真正的根因：不是「缺资源」，是「有分组、无账号」

承 §11 的定性需要**更正**：此前把断链归为「seed 缺资源/资源组」，活体 DB 取证显示
资源侧一直是齐的，断的是**账号侧**。

- `derive_vendor_account_group_seeds()` 从 catalog 的 `vendor_code × modality_code`
  自动派生 **27 个** `{vendor}.{modality}` 分组；
- 而 `DEFAULT_ADMIN_UPSTREAM_ACCOUNTS` **硬编码只有 1 个账号**（`openai-default`），
  且旧 seed **从不写 `ai_upstream_account_credential`**。

结果：27 个分组里 26 个是**空池**。空池能通过全部静态门禁（分组存在、资源组存在、
绑定存在），但请求必然以 `50201 no upstream account routes are configured` 失败 ——
这正是「静态全绿、运行时全红」的成因。

### 12.3 修复内容（`ai_routing_seed.rs` 为主）

1. **新增 `DEFAULT_VENDOR_UPSTREAM_ACCOUNTS`（11 条）** —— 每家厂商一条默认账号种子，
   含 supplier / `official-global` endpoint / `api_key` auth method / account /
   credential / supplier-scope 资源绑定 / 每个派生分组的 group-member 绑定。
   覆盖 openai、openai_compatible、gemini、anthropic、kling、jimeng、volcengine、
   vidu、minimax、suno、elevenlabs。
2. **新增凭证落库** `import_postgres_default_vendor_account_credential()` ——
   用运行时同一 `UpstreamCredentialSecretCodec` 封存占位密钥
   `sk-dev-<vendor>-placeholder`，AAD 绑定 `(tenant, org, account, credential)`，
   因此运行时可解、且换 account 解不开。
3. **环境门控** `seed_environment_enables_vendor_accounts()` ——
   `development`/`test`/`staging` 置 `status=1`；`production` 与「环境未解析」置 0
   （生产保守，绝不带占位凭证上线）。
4. **`DatabaseInstaller` 增 `with_credential_secret_codec()`** ——
   4 处构造点（edge-runtime ×2、app-api、backend-api）与 installer CLI 全部接线，
   CLI 侧由 `upstream_credential_secret_codec_from_env()` 从密钥环构建。

### 12.4 本轮撞到并修掉的三个真缺陷

**B-1（P0）`import_postgres_default_vendor_accounts` 未接 environment/codec**
首版签名漏了两个参数，导致「能建账号但不能建凭证、且永远用生产语义」。
修：统一签名并改造 4 处调用点。

**B-2（P0）两条 seed 路径争抢同一行 `openai-default`，导致它永远停在 disabled**
这是本轮最隐蔽的一个。`import_postgres_default_admin_upstream_topology()` 与新的
vendor 路径**都写 `openai-default`**，且前者**先跑**、每次无条件写
`status = DISABLED_STATUS`。

第一版修法是让 vendor 路径的 `ON CONFLICT` 用 metadata 里的 seed 标记做
「是不是种子自己建的」判据。**实测无效**，实证链：

- `updated_at` 取证：`openai-default.updated_at` 停在 `2026-09-15 21:20`，
  而 `gemini-default` 是当天 09:54 —— 前者**从未被任何一轮 seed 更新过**；
- 直接在 PG 里复现：`ON CONFLICT DO UPDATE SET a = <读本行旧值>, b = EXCLUDED.b`
  的**后续 SET 表达式读到的是本行更新前的值**。admin 路径先跑、把 metadata 写成
  `default_admin_upstream_supplier`，vendor 路径的 CASE 读到的就是这**旧值**，
  于是判据不成立、`status` 保留 0，**但 metadata 仍被覆盖**成 vendor 标记 ——
  症状表现为「标记对了、状态却没变」，极易误判成 SQL 写错。

修法：**去掉 `DEFAULT_ADMIN_UPSTREAM_ACCOUNTS` 里的 openai 条目**（数组变
`[...; 0]`，保留数组与其消费者以便将来放非内容生成的 admin-only 账号），
让 vendor 路径成为这 11 行的**唯一写入者**，判据不再有歧义。
`default-group` 仍以 `account_code = "openai-default"` 引用该账号，按 code 解析，故不受影响。

**B-3（P1）凭证行没有可辨识的 seed 标记**
原 `INSERT ... metadata` 写死 `'{}'::jsonb`，无法区分「种子占位凭证」与
「运维轮换过的凭证」。修：写 `credential_seed_metadata()`（`itemType =
default_vendor_upstream_account_credential`），`ON CONFLICT` 据此决定是否收敛 status。

### 12.5 门禁与回归测试

**新增单测 4 条**（`ai_routing_seed` 模块，共 22 条全绿）：

| 测试 | 守什么 |
| --- | --- |
| `every_derived_vendor_group_has_a_default_account` | 每个派生分组都有默认账号（**本轮就是被它抓出 openai/openai_compatible 漏配**） |
| `default_vendor_accounts_are_unique_and_bound_to_known_vendors` | 账号码唯一、厂商由 catalog 声明、base_url 必须 https |
| `default_vendor_account_passwords_are_placeholders` | 种子密钥必须是占位值，不得像真密钥 |
| `vendor_accounts_seed_enabled_only_in_dev_like_environments` | 门控：dev 类启用、production/未解析停用 |
| `vendor_account_marker_is_distinct_from_the_admin_path_marker` | **B-2 的回归守卫**：三条路径的 itemType 必须两两不同 |

**新增真库 e2e 4 条** (`crates/sdkwork-cloudrouter-edge-runtime/tests/ai_routing_seed_coverage_e2e.rs`)：

| 测试 | 结果 |
| --- | --- |
| `bundled_seed_gives_every_vendor_group_a_callable_account` | **26/26 分组 `callable=1`** |
| `bundled_placeholder_credentials_decode_with_the_dev_key_ring` | **11/11 凭证用 dev 密钥环解出 `sk-dev-*placeholder`** |
| `bundled_seed_is_idempotent_across_repeated_runs` | 账号数 == 凭证数，成员数 == 27，重复读计数不变 |
| `credential_aad_binds_the_secret_to_its_account` | 换 account_id 必须解码失败 |

**既有路由 e2e 14 条全绿**（证「账号能被路由到」这一跳）：

```
media_routing_e2e            7 passed   gemini image/veo, kling video, openai image2/video, seedance, vidu
audio_vendor_routing_e2e     4 passed   minimax music, suno music, elevenlabs tts, volcengine speech
avatar_motion_routing_e2e    3 passed   kling avatar, kling motion, vidu motion
```

一致性门禁保持绿：`ai-routing-consistency: passed`（29 arms / 56 api codes /
122 paths / 24 literal arms / 10 命名空间全对齐）。

### 12.6 落库实证（`sdkwork_ai_dev`，前后对比）

| 项 | 修复前 | 修复后 |
| --- | --- | --- |
| `ai_upstream_supplier` | 1（仅 openai） | **11** |
| `ai_upstream_account` | 1（openai-default，**status=0**） | **11（全部 status=1）** |
| `ai_upstream_account_credential` | **0** | **11（全部 status=1 / is_active）** |
| `ai_upstream_account_group` | 23 | **27** |
| `ai_upstream_account_group_member` | 1 | **27** |
| supplier-scope `ai_resource_binding` | 1 | **11** |

26 个厂商分组的 `(分组, 账号, 账号状态, base_url, 凭证状态, 是否激活)` 全部指向
真实厂商域名（`api.openai.com/v1`、`api.anthropic.com`、
`generativelanguage.googleapis.com`、`api-beijing.klingai.com`、
`visual.volcengineapi.com`、`ark.cn-beijing.volces.com`、`api.vidu.cn`、
`api.minimax.chat`、`api.sunoapi.org`、`api.elevenlabs.io`）。

### 12.7 复现命令（环境变量名易踩坑）

```bash
export PATH="/d/programs/mingw64/bin:$PATH"
export RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu
export SDKWORK_DATABASE_URL="postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable"
# ⚠ 运行时读的是 ROUTER_ENVIRONMENT，不是 INSTALL_ENVIRONMENT
export SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT=development
export SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING_FILE="$PWD/.sdkwork/secrets/upstream-credential-key-ring.development.json"

pnpm db:refresh-catalog -- --force        # 真正落库 AI routing seed 的入口
cargo test -p sdkwork-cloudrouter-edge-runtime --test ai_routing_seed_coverage_e2e -- --nocapture
```

### 12.8 本轮发现、**未修**（新增，应转 owner）

| # | 项 | 说明 |
| --- | --- | --- |
| N-15 | `scripts/dev/start-workspace.mjs:816` 写 `SDKWORK_CLOUDROUTER_INSTALL_ENVIRONMENT`，而 `installer.rs:34` 读 `SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT` | 两个变量名**从不相交**。后果：`pnpm dev` 起的进程里 install environment 落到 default `production`，本轮若不显式导出 `ROUTER_ENVIRONMENT` 就会重现「账号全 disabled」。`.env.release.example` 同时写了两个名字，进一步掩盖了该问题。**这是本轮唯一靠手工导出变量绕过的缺陷。** |
| N-16 | `pnpm db:seed`（`sdkwork-database-cli seed`）报 `applied 0 seed script(s)` | 该命令与 `ai_routing_seed.rs` **不是同一套机制**，容易误导。AI routing seed 的真实入口是 `pnpm db:refresh-catalog`。建议在文档/命令帮助里点明，或让 `db:seed` 也触发。 |

---

## 13. 第 8 轮：默认混合组漏授厂商资源 + Kling 契约路径分类缺失（2026-09-17 上午）

本轮目标：把「视频 / 图片 / 音乐 / 配音 / 音效 / 数字人 / 动作模仿」七类能力**在真实 PostgreSQL 目录上**
从「前端提交 → 网关入站 → 路由选账号 → 计费 → 厂商 API」整条链路跑通，并修掉路上的每一段断点。

### 13.1 结论先行

| 层 | 本轮前 | 本轮后 | 证据 |
| --- | --- | --- | --- |
| 分类（契约路径 → api_code） | 6/7 可达，`POST /kling/v1/videos/generations` 不可达 | **7/7 可达** | `provider_native_classifier` 单测 9 passed |
| 账号路由（组 → 账号池） | **1/7 可达**（只有 openai 系） | **7/7 可达** | `media_provider_native_db_e2e` 七条全部报「已选中账号」 |
| 计费（账号路由计价门） | 不可达（被上一段挡住） | **7/7 统一停在 `upstream cost price not found`** | 同上 |
| 厂商 API 调用 | 不可达 | 不可达 | 被定价数据前提挡住（见 13.5） |

**核心成果**：断点从「6/7 报 50201 no upstream account routes」收敛到「7/7 同一条定价错误」。
链路代码侧已无缺口；剩余唯一门槛是**定价数据前提**（采购成本价本 + api_code 级参考价），
属运营/目录数据，不是代码缺陷。

### 13.2 缺陷 1：默认混合组只授 `official.openai.full`

**根因链（四条独立证据，逐条可复核）：**

1. `crates/sdkwork-cloudrouter-edge-runtime/src/iam_auth_token_authenticator.rs:196-228`
   —— auth-token（app-session，即**所有已登录前端用户**）会话的 `group_id` 被**硬解析**为
   `DEFAULT_ACCOUNT_GROUP_CODE = "default-group"`（`:29`）。**没有任何能力维度参与选组。**
2. `services/.../application/upstream_route_selector.rs:1438`
   —— `if binding.account_group_id != group_id { return false; }`，**严格相等**匹配，
   没有交集/回退语义。
3. 实测路由快照（`load_upstream_account_routes` 原始 SQL，见 13.6）产出 **11 行 = 11 个厂商账号**，
   `account_group_bindings_json` 显示**只有 `openai-default`** 的绑定里含
   `accountGroupId = 1150079326059387300`（即 `default-group` 的 id）。
4. `ai_resource_binding` 实测：指向 `default-group` 的绑定**只有 2 条**
   （`official.openai.full` + `api.claude.code`）。

后果：`default-group` 的 loader 可见 apiScope 里**不存在任何非 OpenAI 厂商的资源**，
「组 ∩ 供应商」交集把 kling / suno / elevenlabs / vidu / jimeng / volcengine / minimax
的原生资源全部裁掉 → 七类里 6 类恒定 50201。

**这不是设计如此。** 本仓自己的架构文档早已写明：

- `docs/architecture/tech/TECH-2026-09-05-ai-routing-account-authorization.md:182`
  —— `default-group`（mixed）**只授 `official.openai.full`**，本轮之前的「修复」
  只落了 `api.claude.code` 一个补丁；
- 同文档 `:240`（§12 方案 A，标注**推荐优先做**）：
  > 把 `default-group` 的授权从「逐协议 api_endpoint 补丁」改为「vendor 骨架」：
  > 给 mixed/default 组追加全部 `vendor.*` 资源（或 `VENDOR_RESOURCE_GROUP_BINDINGS` 派生的
  > official 组全集）。交集规则第 4 条会让组内账号天然覆盖所有厂商原生面，新协议上线零补丁。

**⇒ 方案 A 至今未落地**，本轮把它落地。

### 13.3 缺陷 1 的修复

两个必须同时修的点（只修任一个都仍然 50201）：

| # | 文件 | 改动 |
| --- | --- | --- |
| 1 | `services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/ai_routing_seed.rs` | `DefaultAdminUpstreamAccountGroupSeed::resource_group_codes()`：`is_default` 组在原有 primary + `api.claude.code` 之外，**追加 `VENDOR_RESOURCE_GROUP_BINDINGS` 全 11 厂商 official 组**，并按 `BTreeSet` 去重保证指纹稳定 |
| 2 | 同上 | `import_postgres_default_vendor_upstream_accounts()`：每个厂商默认账号除接入 `{vendor}.{modality}` 派生组外，**再接入 `default-group`**（复用 admin 路径的 `stable_seed_id` 方案，`ON CONFLICT` 幂等，openai 与 admin 路径撞同一行） |

配套：

- 新增常量 `DEFAULT_MIXED_ACCOUNT_GROUP_CODE = "default-group"`，消除散落字面量，
  并在 doc comment 里点明它与 `iam_auth_token_authenticator::DEFAULT_ACCOUNT_GROUP_CODE`
  是**跨 crate 契约**。
- `DEFAULT_ADMIN_ROUTING_TOPOLOGY_SEED_SOURCE` 由 `.v7` 升 `.v8` 并加入
  `default-mixed-group-vendor-skeleton` 标记 —— 该常量参与 `source_hash()`，
  不 bump 则存量安装不会重新导入种子。
- `crates/sdkwork-cloudrouter-edge-runtime/tests/ai_routing_seed_coverage_e2e.rs`：
  `members == 27` 断言更新为 `37`（26 派生组 + default-group 11 名成员，其中 openai 已存在）。

**落库实测（`pnpm db:refresh-catalog -- --force` 后）：**

```
default-group 资源授予     2  → 12 条
  api.claude.code / api.openai_compatible.all / official.anthropic.claude_code /
  official.elevenlabs.full / official.gemini.full / official.jimeng.full /
  official.kling.full / official.minimax.music / official.openai.full /
  official.suno.full / official.vidu.full / official.volcengine.full
default-group 成员         1  → 11 个（11 个厂商 -default 账号，全部 status=1）
ai_upstream_account_group_member 全表  27 → 37
```

### 13.4 缺陷 2：Kling 契约声明的路径分类器不认

**双向不一致**（架构文档 §10 P1-5「api_code 双真源」的实例）：

| 侧 | 声明/认识的 kling 视频路径 |
| --- | --- |
| open-api 契约（`apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json`） | `POST /kling/v1/videos/generations`、`GET /kling/v1/videos/generations/{task_id}`、`POST /kling/v1/videos/avatar`、`POST /kling/v1/videos/motion-control` |
| `provider_native_classifier`（改前） | `/v1/videos/text2video`、`/v1/videos/image2video`、`/v1/videos/avatar`、`/v1/videos/motion-control`、`/v1/images/generations` |
| `passthrough.rs`（改前） | 同 classifier |

- 契约声明而分类器不认 → 该路径落进 `_ => return None` → 50201；
- 分类器认识而契约不声明 → 请求根本进不到网关。

由于契约里 kling 的「创建视频」**只有 `generations` 一条**，它必然对应既有
`kling.text_to_video`（taxonomy 里 `RoutingCapability::Video` + `BillingMeter::VideoResult`
+ `media_task`，语义完全吻合；`kling.image_to_video` 在契约里没有对应路径，不可能是它）。

**修复（两份拷贝必须同步，否则门禁红）：**

- `services/.../application/invocation/provider_native_classifier.rs`
- `crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs`

各新增 2 条 arm，并把 `music_task_query_path_matches` 泛化为
`media_task_poll_path_matches(path, family)`（suno 与 kling 共用）：

```rust
"kling" if path == "/v1/videos/generations" => "kling.text_to_video",
"kling" if media_task_poll_path_matches(path.as_str(), "videos/generations") => {
    "kling.task_query"
}
```

**踩坑记录**：在 arm 之间写 `//` 注释会让
`tools/check-cloudrouter-ai-routing-consistency.mjs` 的 arm 提取器把注释并入 arm 文本，
导致 `classifier`/`passthrough` 两侧 arm 无法配对。**注释必须写在 `match` 之外**
（本轮落到 `provider_native_api_code_from_standard_path` 的 doc comment 里）。

### 13.5 缺陷 3（新增未修，需产品决策）：账号路由计价门硬依赖采购成本

七类全部收敛到同一条错误，根因是
`services/.../application/upstream_route_selector.rs:941-990`
（`ensure_account_route_is_priced`）：

```rust
let mut resource = ResourceDefinition::new(&query.route_key, BillingMeter::ApiRequest, Utc::now())
    ...
let resolution = PriceService::new().resolve(self.catalog, resource)?;
if !has_quoted_procurement_cost(&resolution) {   // ⇒ 要求 price_side = upstream_cost
    return Err(DomainError::new(format!("upstream cost price not found for route ...")));
}
```

- **没有环境 bypass**：dev / test / production 一视同仁。
- `has_quoted_procurement_cost`（`:1159`）要求 `status == Quoted` **且**
  `resolved_price.procurement_cost.is_some()`；
- `procurement_cost` 只在 `price_side = 'upstream_cost'` 的价本上才有值
  （`infrastructure/sql/queries/snapshot.rs:1517-1518`：非 `upstream_cost` 时
  `supplier_code`/`account_id` 一律 NULL）。
- 函数 doc 写的是 *"Verifies the api-request price exists"*，实现却要求 **procurement
  cost** —— **注释与实现语义不一致**，这是评估修法时需要注意的张力点。

**真实目录实测（活体 DB）：**

| 项 | 实测 |
| --- | --- |
| `pricing_price_book.price_side` 分布 | `official_reference` 39 / **`upstream_cost` 0** |
| `ai_model_pricing` 行数 | 1260（`price_side` 全 = 1） |
| `ai_model_pricing.account_id` 非空 | **0** |
| `ai_model_pricing.supplier_code` 非空 | **0** |
| `catalog_key` 命名空间覆盖 | `kling%` **0**、`volcengine%` **0**、`jimeng%` **0**、`suno%` 2、`elevenlabs%` 12、`minimax%` 131、`vidu%` 78 |

即两个独立数据前提同时缺失：

1. **无任何 `upstream_cost` 价本**（7/7 命中）—— 采购成本是商务数据，开源种子不生成；
2. **api_code 形状的定价条目缺失**（6/7 报 `model not found: kling.text_to_video` /
   `suno.music_generation` / `elevenlabs.*`），图片另有
   `official reference price not found ... meter image_result`。

**两个处置选项（待定）：**

- **选项 1（保持商务严格）**：运营必须为每个 api_code 配 `upstream_cost` 价，
  维持 fail-closed。代价：新装 dev 环境七类内容生成**全部不可用**，
  必须走 `pnpm db:refresh-catalog` 之外的商务配置步骤。
- **选项 2（放开 dev 可用性）**：dev-like 环境放宽为「有任一可计价侧（`BillingMeter::ApiRequest`
  的 `official_reference` 价）即可派发」，或由种子为 dev 注入 upstream_cost 占位价。
  代价：dev 会放行「没有采购成本」的流量，与 fail-closed 的商务初衷冲突。

**受控夹具已证明代码链路完整**：三件套自建 `PriceSide::UpstreamCost` 价本后
**15/15 全绿**（见 13.7），即「分类 → 账号路由 → 计价 → 密钥解析 → 真实上游 HTTP 转发」
在代码层没有缺口，缺的只是真实目录里的定价数据。

### 13.6 本轮验证证据总表

| 验证 | 结果 | 说明 |
| --- | --- | --- |
| `ai_routing_seed::tests`（22 条） | **22 passed** | 含 `standard_group_is_preserved`、`every_derived_vendor_group_has_a_default_account` |
| `provider_native_classifier::tests`（9 条） | **9 passed** | 含新增 `kling_restful_video_paths_classify_like_the_native_ones` |
| `tools/check-cloudrouter-ai-routing-consistency.mjs` | **passed** | `classifier 30 arms / passthrough 30 arms`，两侧各 **25 literal arms over 20 api codes**、5 predicate arms |
| `ai_routing_seed_coverage_e2e`（真实 DB 守卫） | **4 passed** | 27 个厂商分组全部 `members=1 callable=1` |
| `media_provider_native_db_e2e`（真实 DB 七类探针） | **7/7 抵达账号选择**，统一停在定价门 | 见 13.5，属数据前提 |
| `media_routing_e2e` / `audio_vendor_routing_e2e` / `avatar_motion_routing_e2e` | **7 + 5 + 3 = 15 passed** | 受控夹具，覆盖七类 + 音效 |

**取证用的一次性手段**（不改动仓库）：把 `load_upstream_account_routes` 的原始 SQL
从 `queries/snapshot.rs` 抽出来，替换唯一的 `$1`（熔断恢复窗口，实测 60s）后直连 DB 执行，
得到路由快照的 11 行及其 `account_group_bindings_json`。这是本轮定位 13.2 的关键证据，
也补上了 §9 诊断工具表里「`diagnose_upstream_route_gates` 不覆盖资源交集门」的空白。

### 13.7 复现命令

```bash
export PATH="/d/programs/mingw64/bin:$PATH"
export RUSTUP_TOOLCHAIN=stable-x86_64-pc-windows-gnu
export SDKWORK_DATABASE_URL="postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable"
export SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT=development
export SDKWORK_CLOUDROUTER_INSTALL_ENVIRONMENT=development
export SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING_FILE="$PWD/.sdkwork/secrets/upstream-credential-key-ring.development.json"

# ⚠ refresh-catalog 不接受 --environment（那是脚本层参数，透传后 cloudrouterctl 报
#   "unsupported refresh-catalog option: --environment"）；环境只能用变量传递。
pnpm db:refresh-catalog -- --force

"$NODE" tools/check-cloudrouter-ai-routing-consistency.mjs
cargo test -p sdkwork-cloudrouter-router-service --lib ai_routing_seed
cargo test -p sdkwork-cloudrouter-router-service --lib provider_native_classifier
cargo test -p sdkwork-cloudrouter-edge-runtime --test ai_routing_seed_coverage_e2e -- --nocapture
cargo test -p sdkwork-cloudrouter-edge-runtime --test media_provider_native_db_e2e -- --nocapture
```

### 13.8 测试侧修复（避免假绿 / 避免污染共享库）

| 文件 | 问题 | 修复 |
| --- | --- | --- |
| `D:\sdkwork-space\sdkwork-test\rust\src\router_harness.rs` | `SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT` 写 `"dev"`，而种子只对 `development`/`test`/`staging` 启用厂商账号；DB 路由构造器跑 `StartupInstallMode::Ensure`，会**把共享 dev 库的厂商账号写成 `status=0`** | 改为 `"development"`，并写清原因 |
| `crates/.../tests/media_provider_native_db_e2e.rs` | 内联 `UPSTREAM_CREDENTIAL_KEY_RING` 的 `activeKey` 抄自 **`sdkwork-api-cloud-gateway`** 的 dev env 生成器，与 Cloud Router 自己的 `.sdkwork/secrets/upstream-credential-key-ring.development.json` **不同**，导致 `catalog row mapping failed: failed to decrypt credential secret` | 改为 `resolve_upstream_credential_key_ring()`：优先环境变量 → `*_FILE` → 仓库内 `.sdkwork/secrets/...development.json` → 内联兜底，并在日志里打印实际来源 |
| `crates/.../tests/media_provider_native_db_e2e.rs:195` 的 501 启发式 | 把 `*_passthrough_not_configured`（HTTP 501 占位）误判为「已抵达」 | 缺口标记加入 `passthrough_not_configured`；探针改用带 `provider secret map` 的生产装配 |

### 13.9 本轮对共享 dev 库存的写入（可回滚）

| 动作 | 库 | 影响 | 回滚 |
| --- | --- | --- | --- |
| `pnpm db:refresh-catalog -- --force`（`ROUTER_ENVIRONMENT=development`） | `sdkwork_ai_dev` | 重新导入 AI routing seed：厂商账号 11/11 `status=1`；`default-group` 授予 2→12、成员 1→11；成员全表 27→37 | 授予/成员可删（`default-group` 回到 1 成员 2 授予）；账号可 `SET status = 0`，但会导致七类全部不可路由 |

两次写入都会使**任何走 app-session 的前端用户**获得全部 11 家厂商的账号池可见性 ——
这正是本轮的目的（修复前他们只能看见 OpenAI 系）。 |



---

## 14. auth-token 选组语义对齐（2026-09-17 第二轮）

### 14.1 用户诉求（原文）

> `iam_auth_token_authenticator.rs:196-228` 把 auth-token 会话（= 所有已登录前端用户）的
> `group_id` 硬解析为 `default-group`，没有能力维度参与选组；`upstream_route_selector.rs:1438`
> 又要求 `binding.account_group_id == group_id` 严格相等。实测只有 `openai-default` 绑进了这个组
> ⇒ 其余 6 类厂商资源被「组 ∩ 供应商」交集全部裁掉。**使用登录 auth token 的时候，应该选择是否是
> 默认账户的分组，假如没有设置，找出哪个是默认分组，获取对应的分组进行处理路由，请完整对齐**。

### 14.2 修复前的真实语义（比诉求描述还多两处毛病）

| # | 事实 | 影响 |
| --- | --- | --- |
| 1 | 选组顺序**是反的**：先按 `code == "default-group"` 找，`.or_else()` 才按 `is_default` 找 | 与「按默认账户分组选」的语义相反；一个被重命名/自定义 code 的 `is_default` 组永远轮不到（只要存在同 code 组就会被抢先） |
| 2 | `list_upstream_account_groups()` **被调用两次**（每个 `.or_else()` 分支一次） | 两次调用之间若发生 catalog 刷新，`code` 判据与 `is_default` 判据会落到**不同快照**上 |
| 3 | 作用域只看 `tenant_id`，不看 `organization_id` | 与 `upstream_route_selector::context_from_group_binding`、`ports::group_matches_subject` 的 `tenant_id==0`/`organization_id==0` 通配语义不一致（同一租户的不同凭据形态可能落到不同池） |
| 4 | 模块 doc 写 `code = "default"` | 与实际 `"default-group"` 不符，误导后来者 |
| 5 | `api_key_management_read_store::single_upstream_account_group_for_subject()` 是同一规则的**弱化第二份拷贝**（只做「唯一分组」这一级） | 两处规则各自演化 ⇒ 建 key 与已登录会话可能选到不同池 |

### 14.3 唯一权威实现（新模块）

`services/sdkwork-cloudrouter-router-service/src/domain/upstream_account_group_selection.rs`

```rust
pub const DEFAULT_ACCOUNT_GROUP_CODE: &str = "default-group";

pub enum DefaultAccountGroupSelectionReason { IsDefaultFlag, CodeConvention, SingleGroupInScope }

pub fn upstream_account_group_in_subject_scope(
    group: &UpstreamAccountGroup, tenant_id: i64, organization_id: i64,
) -> bool;

pub fn select_default_account_group_for_subject(
    groups: &[UpstreamAccountGroup], tenant_id: i64, organization_id: i64,
) -> Option<DefaultAccountGroupSelection>;   // { group, reason }
```

**规则（顺序不可反）**：

| # | 判据 | 语义 | `reason` |
| --- | --- | --- | --- |
| 1 | `group.is_default` | 租户**自己声明**的默认分组（权威） | `is_default` |
| 2 | `group.code == DEFAULT_ACCOUNT_GROUP_CODE` | 安装器命名约定（回退） | `default-group-code` |
| 3 | 作用域内**唯一**一个分组 | 无歧义可用 | `single-group-in-scope` |

- 三级都取不到 ⇒ `None` ⇒ 调用方 fail-closed（auth-token 侧 401 `account_group_unavailable`）。
- 候选**先按 id 排序**，保证跨进程 / 跨重载可复现（DB 的 `ORDER BY updated_at DESC, id DESC`
  不是稳定语义）。
- **作用域**：`tenant_id == 0` = 全局组；`organization_id == 0` = 组织无关组。
  安装器写默认组时用 `organization_id = 0`（`DEFAULT_IAM_ORGANIZATION_SQL_ID`），
  所以它服务该租户的**所有**组织 —— 这是 auth-token（可能带任意 org）能命中的前提。

**分层纪律**：模块放在 `domain`（最内层）而不是 `application`，因为 `ports` 也要用它，
而 `ports` **不能**依赖 `application`（六边形方向）。`ports::api_key_management_read_store::group_matches_subject`
现在只是 `domain::upstream_account_group_in_subject_scope` 的本地别名；
`single_upstream_account_group_for_subject()` 已删除（它是规则第 3 级的弱化拷贝）。

### 14.4 完整对齐清单

| 文件 | 改动 | 为什么必须一起改 |
| --- | --- | --- |
| `crates/.../src/iam_auth_token_authenticator.rs` | 选组改为单次列举 + 调用权威选择器；删本地 `DEFAULT_ACCOUNT_GROUP_CODE` 字面量；重写模块 doc（原来写 `code="default"`） | auth-token 通道 = 所有已登录前端用户 |
| `services/.../domain/upstream_account_group_selection.rs` | **新增**（14.3） | 唯一权威规则 |
| `services/.../domain/mod.rs` | 注册模块 + 导出 | — |
| `services/.../ports/api_key_management_read_store.rs` | `group_matches_subject` 改为委托 `domain` 谓词；删除 `single_upstream_account_group_for_subject` | 消除第二份规则拷贝 |
| `services/.../api/app_api_keys.rs` | 建 key 未指定分组时的兜底改调权威选择器；`const DEFAULT_ACCOUNT_GROUP` 改为 `domain::DEFAULT_ACCOUNT_GROUP_CODE` 的别名 | 这条兜底**决定生成链路走哪个池**（见 14.7） |
| `services/.../api/admin_user.rs` | 删本地 `DEFAULT_ACCOUNT_GROUP_CODE` 字面量，改 import `domain` 常量 | 同一 code 两个定义会漂移 |
| `services/.../infrastructure/sql/ai_routing_seed.rs` | `DEFAULT_MIXED_ACCOUNT_GROUP_CODE` 改为 `crate::domain::DEFAULT_ACCOUNT_GROUP_CODE` 的别名；doc 指向权威模块 | 种子写的 code 与选组读的 code 必须同源 |
| `services/.../application/upstream_route_selector.rs` | 空 routes 错误文案带上**分组身份**（见 14.6） | 50201 的根因定位曾要靠手写 SQL |

### 14.5 规模效应：为什么这一层值得单独修

`matched_resource_scope` = **组授予的资源组 ∩ 供应商原生资源**。选错分组**不会报「分组不对」**，
而是把该组没授予的产能**整片裁掉**，最终以 `50201 no upstream account routes are configured`
出现 —— 与「账号池为空」的症状完全同形。所以：

- 账号池修好了（11/11 `status=1`、37 条成员）**不代表**已登录用户能出网；
- 决定已登录用户能看到哪些厂商的，是**选组规则落到哪一行**。

### 14.6 诊断改进：50201 现在带分组身份

`select_account_route_for_context` 的空 routes 分支由

```
... no upstream account routes are configured
```

改为

```
... no upstream account routes are configured for account group default-group (id 1150079326059387300) on api scope kling.text_to_video
```

⚠️ 断言侧是 `contains(...)` 形式（`media_provider_native_db_e2e` 的 `GATEWAY_GAP_MARKERS`、
`admin-gateway/tests/product_model_route.rs`）：**后缀追加安全，改前缀会破门禁**。

### 14.7 三条通道，一个池（否则同一租户换凭据就换池）

| 通道 | 选组方式 |
| --- | --- |
| auth-token / app-session（已登录前端用户走 open-api） | `IamAuthTokenAuthenticator` → **本模块**规则 |
| 生成链路后半段（`api/app_runtime.rs`） | **不重选**：取 `api_key.default_account_group_id` 直接下发内部签名请求（`InternalGatewayPrincipal.account_group_id` → `app_runtime_gateway_http_client`） |
| 内部签名网关（`gateway_api_key_auth.rs`） | 用请求头携带的**显式** `account_group_id`，并**严格**校验 tenant/org 相等（有意不用通配：它是可信内部通道，通配会放大越权面） |

⇒ 生成链路走哪个池由「建 key 时的兜底分组」决定，而它现在与 auth-token 共用同一规则。

### 14.8 验收证据（2026-09-17 实测）

| 验证 | 命令 | 结果 |
| --- | --- | --- |
| 选组规则单测（7 条） | `cargo test -p sdkwork-cloudrouter-router-service --lib upstream_account_group_selection` | **7 passed**（is_default 压过 code / code 回退 / 唯一组回退 / 歧义 fail-closed / 跨租户隔离 / 全局+组织通配 / 顺序无关可复现） |
| router-service 全量单测 | `cargo test -p sdkwork-cloudrouter-router-service --lib` | **497 passed; 0 failed** |
| 真实库种子覆盖（5 条，含**新增门**） | `cargo test -p sdkwork-cloudrouter-edge-runtime --test ai_routing_seed_coverage_e2e -- --nocapture` | **5 passed**。新增门输出：`default group default-group (id=1150079326059387300) members=11 grants=12` |
| 一致性门禁 | `node tools/check-cloudrouter-ai-routing-consistency.mjs --root .` | **passed**（classifier 30 / passthrough 30 arms） |
| 分组/账号 CRUD + 选路 | `cargo test -p sdkwork-cloudrouter-router-service --test admin_group_account_crud_and_routing_e2e` | **6 passed** |
| auth-token 路由 | `cargo test -p sdkwork-cloudrouter-edge-runtime --test openai_chat_auth_token_route` | **2 passed** |
| **七类真实目录端到端探针** | `cargo test -p sdkwork-cloudrouter-edge-runtime --test media_provider_native_db_e2e -- --nocapture` | **1 failed** —— 但失败点已从「选不到账号」前移到「计价门」（见 14.9）。七条**全部**打印出被选中的 `account <id>`，`50201` 归零 |

**新增的防回归门**（`ai_routing_seed_coverage_e2e.rs::auth_token_default_group_reaches_every_bundled_vendor`）：
断言「`is_default` 的那个分组」同时 ① 覆盖全部 11 个 `REQUIRED_VENDOR_ACCOUNTS`、
② 授予全部 11 个 `REQUIRED_VENDOR_RESOURCE_GROUPS`。这是**用户视角**的门：
既有门断言「每个派生分组健康」，但真正决定已登录用户能否出网的是「选组会落到哪个分组」——
缺它则「27 个分组全健康 + 已登录用户 6/7 类 50201」可以长期共存。

实现时踩到的 schema 事实：**`ai_upstream_account` 没有 `vendor_code` 列**（`ai_upstream_supplier` 也没有）
——厂商是**派生分组 `{vendor}.{modality}` 的属性**。所以测试用「默认分组成员 ∩ 派生分组成员」
反推厂商，而不是再抄一份 11 厂商清单（抄了就会漂移）。

### 14.9 七类探针的当前状态（每一类都已选中账号，统一卡在计价门）

```
[图片 image]  POST /v1/images/generations                              => 502 routing_failed
    upstream cost price not found for model openai/gpt-image-2, supplier openai,
    account 3675618906898304264, region global: official reference price not found
    for model openai/gpt-image-2 meter image_result and region global (price_not_found)
[视频 video]  POST /kling/v1/videos/generations                        => 502 routing_failed
    upstream cost price not found for route kling.text_to_video, supplier kling,
    account 2969580794045056093: model not found: kling.text_to_video (price_not_found)
[音乐 music]  POST /suno/v1/music/generations                          => 502 ... suno.music_generation
[配音 voice]  POST /elevenlabs/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM  => 502 ... elevenlabs.text_to_speech
[音效 sfx]    POST /elevenlabs/v1/sound-generation                     => 502 ... elevenlabs.sound_generation
[数字人 avatar] POST /kling/v1/videos/avatar                           => 502 ... kling.avatar
[动作模仿 motion] POST /kling/v1/videos/motion-control                 => 502 ... kling.motion_control
```

**读法**：每条都带出了 `supplier <vendor>, account <id>` ⇒ **账号选出来了**（本轮目标达成）；
卡点在 `ensure_account_route_is_priced` → `has_quoted_procurement_cost`，即第三层。

第三层的两个子缺口（与 N-17 / N-18 对应）：

| 子缺口 | 证据 | 性质 |
| --- | --- | --- |
| 厂商原生 api code 无计价行 | `model not found: kling.text_to_video` / `suno.music_generation` / `elevenlabs.*` / `kling.avatar` / `kling.motion_control` —— 缺的是 **api code 命名空间**（`ai_model_pricing.catalog_key like 'kling%'` 等为 0 行） | 数据/种子缺口 |
| OpenAI 图形模型缺 meter 价 | `official reference price not found for model openai/gpt-image-2 meter image_result` —— 行在、**meter 维度缺** | 数据/种子缺口 |
| 无 `upstream_cost` 价本 | 39 个价本全 `official_reference`、`upstream_cost` 0 个；`ai_model_pricing` 1260 行 `account_id`/`supplier_code` 全 NULL | 与 `has_quoted_procurement_cost`（要求 `PriceResolutionStatus::Quoted` 且 `procurement_cost.is_some()`）直接冲突 |

另有一处**文档/实现语义不一致**值得记：`ensure_account_route_is_priced` 的 doc 写
"Verifies the api-request price exists"，实现却要求 **procurement cost**。二者不是同一件事。

**两个选项（待产品决策，未擅自放宽）**：

1. **保持 fail-closed**，补 `price_side='upstream_cost'` + `account_id`/`supplier_code` 维度的真实
   采购价行（11 厂商 × meter × region）。语义最干净（无成本不许出网），但需要真实厂商价目。
2. **仅 dev/test/staging 放宽**：无 `upstream_cost` 行时回退 `official_reference` 价本并打显式告警，
   production 仍 fail-closed。能让开发环境跑通全链路，代价是成本口径在非生产环境是估算值。

### 14.10 复现命令（含两个环境坑）

```bash
cd /d/sdkwork-space/sdkwork-cloudrouter
export PATH=/usr/bin:/bin:$PATH

# 坑 1：Git Bash 的 /usr/bin/link.exe（coreutils）会抢在 MSVC link.exe 前面，
#       报 "/usr/bin/link: missing operand after BOM"。LIB/INCLUDE 本来就已就位
#       ⇒ 只钉 linker 路径即可，不用切 gnu、不用 vcvars。
export CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER="D:\\programs\\vs-buildtools\\VC\\Tools\\MSVC\\14.44.35207\\bin\\Hostx64\\x64\\link.exe"

export SDKWORK_DATABASE_URL="postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable"
export SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT=development
export SDKWORK_CLOUDROUTER_INSTALL_ENVIRONMENT=development
# 坑 2：必须是 Windows 路径。Git Bash 的 $PWD 展开成 /d/... ，Rust 打不开
#       （os error 3），错误被包成 "key ring config must parse when present"。
export SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING_FILE="D:/sdkwork-space/sdkwork-cloudrouter/.sdkwork/secrets/upstream-credential-key-ring.development.json"

node tools/check-cloudrouter-ai-routing-consistency.mjs --root .
cargo test -p sdkwork-cloudrouter-router-service --lib upstream_account_group_selection
cargo test -p sdkwork-cloudrouter-router-service --lib
cargo test -p sdkwork-cloudrouter-router-service --test admin_group_account_crud_and_routing_e2e
cargo test -p sdkwork-cloudrouter-edge-runtime --test openai_chat_auth_token_route
cargo test -p sdkwork-cloudrouter-edge-runtime --test ai_routing_seed_coverage_e2e -- --nocapture
cargo test -p sdkwork-cloudrouter-edge-runtime --test media_provider_native_db_e2e -- --nocapture   # 仍红：计价门
```

### 14.11 未决项

| # | 项 | 状态 |
| --- | --- | --- |
| N-17 | 第三层计价门：无 `upstream_cost` 采购价即 fail-closed（与 doc 语义不符） | **待产品决策**（14.9 两选项） |
| N-18 | `ai_model_pricing` 缺 `kling` / `volcengine` / `jimeng` 等**厂商原生 api code 命名空间**，与路由侧不对称 | 同上 |
| N-19 | 存量 gateway api key 的 `default_account_group_id` 是否都指向有厂商覆盖的分组（本仓无法直连 SQL 抽查，需 `cloudrouterctl` 或管理端接口） | 未核 |

---

## 15. 第 10 轮：价格由 `sdkwork-models` 定义驱动同步（2026-09-17 下午）

### 15.1 交接锚点

> 「价格 应该根据 sdkwork-models 中的定义，进行同步，要确保缺失的数据要自动能够初始化，
> 而且新增模型，删除模型也要保证数据一致性，继续推荐，直到整体逻辑实现完整为止」

拆成四件事，本轮全部落地并**在真实库 + 真实目录上实测**：

| # | 要求 | 落点 | 实测 |
| --- | --- | --- | --- |
| 1 | 价格由目录定义驱动同步 | `sync_official_pricing_catalog` + `refresh_on_catalog_drift` | ✅ |
| 2 | 缺失数据自动初始化 | 新增 `PriceBookDrift.missing`（15.3） | ✅ 38 本书 / 1258 费率全量重建 |
| 3 | 新增模型自动带价 | `source_hash` 变化 ⇒ 全量重投影 | ✅ 新模型 + **新价本 8 费率**自动出现 |
| 4 | **删除模型保证一致性** | 目录表侧 `deactivate_removed_catalog_rows`；定价侧 `PriceBookDrift.orphan` | ✅ 模型 `status=0`、价本 `retired`、0 条可计价费率 |

### 15.2 四向一致性矩阵：每个方向由哪个信号兜住

这是本轮的核心产出。四个方向的失败形态完全不同，**任何一个单向检查都会漏掉两个方向**：

| 目录侧变更 | 库里的表现 | 兜住它的信号 | 单靠它会漏什么 |
| --- | --- | --- | --- |
| **新增模型** | 少 `ai_model` 行 + 少价本 | `pricing_import_run.source_hash` 变（hash 覆盖**全部** `rate_hash`） | — |
| **改价 / 改费率档位** | 费率值或档位码不同 | 同上 | — |
| **删除模型** | 多出 `ai_model` 行 + **多出活跃价本** | `PriceBookDrift.orphan` | `is_subset` 型检查（`catalog_complete`）看不出来；删完的目录是"子集"，永远成立 |
| **手工退役 / 软删价本（库缺失）** | 少价本，但**所有既有信号都说"已最新"** | `PriceBookDrift.missing`（本轮新增） | `source_hash` 命中 `pricing_import_run`（内容没变过）⇒ 恒真；`is_subset` 只管"目录 ⊆ 库"，库少东西它不管 |

第 4 行是本轮修掉的真缺口。改动前 `refresh_on_catalog_drift` 的第二信号是**单向**的
`orphan_price_books`，只回答"库里有、目录里没有"；"目录里有、库里没有"这一侧在全链路里
**没有任何信号可见**，于是一份被手工退役的价本可以永久消失而启动日志一片绿。

### 15.3 `PriceBookDrift{missing, orphan}`（双向集合比对）

`services/.../infrastructure/sql/official_pricing_sync.rs:807-905`

```rust
pub(crate) struct PriceBookDrift {
    pub missing: Vec<String>,   // 目录投影里有、库里没有活跃价本 —— 本轮新增
    pub orphan:  Vec<String>,   // 库里有活跃价本、目录已经不发布
}
impl PriceBookDrift {
    pub(crate) fn is_clean(&self) -> bool { self.missing.is_empty() && self.orphan.is_empty() }
    pub(crate) fn sample(&self, limit: usize) -> String { /* missing:…, orphan:… */ }
}
async fn live_price_book_keys(pool, summary) -> Result<BTreeSet<(String, String, String)>, _>
fn diff_price_book_keys(projected, live) -> PriceBookDrift
pub(crate) async fn price_book_drift(pool, summary) -> Result<PriceBookDrift, _>
```

installer 侧的第二信号因此从"孤儿检查"升级为双向集合比对
（`installer.rs:448-464`）：

```rust
let books = price_book_drift(&self.pool, &summary).await
    .map_err(|error| DatabaseInstallError::InvalidState(error.to_string()))?;
if stored && books.is_clean() {
    return Ok(None);
}
tracing::info!(.., missing_price_books = books.missing.len(),
               orphan_price_books = books.orphan.len(),
               price_book_sample = %books.sample(5), "official pricing is behind sdkwork-models; refreshing the catalog");
```

键选 `(price_book_code, price_book_version, vendor_code)`：本仓的价本是**版本化**的
（同一 code 多版本共存，`supersede_stale_price_book` 退役旧版本），所以只比 code 会把
"版本没跟上来"误判成干净。新增 3 个单测覆盖两个方向、两侧相等、以及整份投影为空。
`cargo test -p sdkwork-cloudrouter-router-service --lib` = **509 passed / 0 failed**（基线 497）。

### 15.4 档位裁决：声明侧 ∩ 报价侧，不相交只报缺口，绝不猜

视频计价的第二道门是 `tier_code` 条件——全库 1258 条费率里 **520 条**挂档位条件。
档位有且只有两处目录权威：

| 侧 | 来源 | 本轮之前的状态 |
| --- | --- | --- |
| **声明侧** | `ai_model_video_profile`（174 行）的 `resolution_tier_code` / `duration_tier_code` / `durationTierCodes` / `pricingTierCodes` | 只读了一个 `tier_code`，两个 jsonb 数组列**根本没加载** |
| **报价侧** | `pricing_rate.conditions` 里 `dimension_code='tier_code'` 的取值集合 | 运行时从不读 |

只有**两侧取交集**才是可计价的档位。改动前运行时拿声明侧的单个值去查费率，查不到就报
`price_not_found`，再被上层包成一句"没有公布价格"——**看不出到底是"没价"还是"档位名对不上"**。

本轮把裁决做成一个可单测的纯函数（`catalog.rs:326` `decide_video_pricing_tier`），
判序固定，四种失败各有专名（`ports/upstream_account_route_catalog.rs:208`）：

```rust
pub enum VideoPricingTierGap {
    ApiCodeIsNotAGenerationMode { api_code },       // api code 尾段不是生成模式
    NoProfileForGenerationMode { generation_mode }, // 目录没为这个生成模式声明 profile
    MeterHasNoTierConditionedRate { meter },        // 目录在这个计量单位上没有档位条件费率
    DeclaredTierNotPriced { declared, priced },     // 两侧不相交（双方集合都打出来）
}
```

配套改动：

- 快照新增 `priced_video_tier_codes_by_model_meter: HashMap<(catalog_key, meter), BTreeSet<String>>`
  （`catalog.rs:283` `index_priced_video_tier_codes`），与声明侧同一快照装配——否则刷新期间
  会拿旧声明配新费率；
- `ModelVideoProfileRow` 增 `duration_tier_codes` / `pricing_tier_codes`
  （`rows.rs:37-42`），`snapshot.rs:1584` 起 SELECT 补两列，`postgres/loader.rs` 用
  `parse_string_array` 解析，**非数组即硬失败**（丢档位会让"有价却说无价"重新出现）；
- 查询体字段由 `pricing_tier_code: Option<String>` 改为 `pricing_resolution: Option<String>`：
  预检对**每个计量单位分别**核价，所以必须传请求的原始分辨率、由每个 meter 各自解析档位，
  而不是在外面先解析好一个档位喂进来；
- `upstream_route_selector` 的两条路径（预检 + sticky）都按 meter 解析，失败文案用
  `tier_gap.filter(|_| detail.contains("price_not_found"))` 把缺口精确描述拼在末尾。

**优先级**：一个 profile 的候选档位按权威性递降排列（`catalog.rs:219`）——

```
pricingTierCodes（目录显式指定的费率档位码）
  → resolutionTierCode（规范分辨率档位）
  → durationTierCode / durationTierCodes
```

`pricingTierCodes` 排第一是有依据的：`sdkwork-models/tools/seed-video-profiles.mjs:40`
的 `pricingTierCodes(pricingRows, modelId)` **正是**从该模型定价文件的 `tierCode` 集合取的值，
所以它一旦被填上就是目录给出的权威答案，必须盖过按形状推断的规范档位。实况
`vidu/viduq3-pro` 同时写了 `res_720p` 与 `pricingTierCodes: ["dur_5s"]`，而 `video_result`
这个计量单位只按 `dur_5s` / `dur_10s` 报价——只有显式声明能命中。
新增单测 `explicit_pricing_tier_codes_outrank_the_canonical_resolution_tier`。

### 15.5 实测 A：档位缺口的精确形态（`media_provider_native_db_e2e` 复跑）

七类内容生成能力在真实库 + 真实目录上的读数，与加固前逐条对比：

| 能力 | 端点 | 结果 | 与加固前的差别 |
| --- | --- | --- | --- |
| 视频 | `/kling/v1/videos/generations` | ✅ 抵达厂商 | 不变 |
| 配音 | `/elevenlabs/v1/text-to-speech/…` | ✅ 抵达厂商 | 不变 |
| 音效 | `/elevenlabs/v1/sound-generation` | ✅ 抵达厂商 | 不变 |
| 图片 | `/v1/images/generations` | ⚠️ 已拨号，`tcp connect error: deadline has elapsed` | **从"计价失败"变成"网络不可达"** ⇒ 图片路径计价已打通，剩的是环境 |
| 音乐 | `/suno/v1/music/generations` | ❌ `sdkwork-models publishes no tier_code-conditioned rate for meter api_request…` | 新精确形态 `MeterHasNoTierConditionedRate` |
| 数字人 | `/kling/v1/videos/avatar` | ❌ `sdkwork-models models no generation mode for api code kling.avatar` | **从模糊的 "declares no video pricing profile for api …"** 换成 `ApiCodeIsNotAGenerationMode` |
| 动作模仿 | `/kling/v1/videos/motion-control` | ❌ 同上（`kling.motion_control`） | 同上 |

3 条失败全部带可运维的缺口描述；4 类走通（3 抵达 + 1 环境阻挡）。
音乐一条额外查实：`suno/*` 5 个模型全为 `lifecycle=catalog_only/deprecated`、
`routingState=catalog_only`、`shelfState=hidden`，`suno-v6*` 的 description 明写
*"no official per-generation or per-second API price is published, so no price row is recorded"*
——**目录侧不存在"可路由且有价"的 Suno 模型**，是真实目录缺口而非网关缺陷。

### 15.6 实测 B：自动初始化 + 删除一致性（`cloudrouterctl ensure`）

三次定向注入，读数全部来自 `psql`：

**Phase A —— missing 方向（库缺失，旧信号全盲）**

手工把 `models.kuaishou.global.official`（38 条费率）按 `supersede_stale_price_book` 的语义
退役 + 软删。库变成 `active_books=37 / active_rates=1220`，而 `pricing_import_run` 仍是 2 行、
`source_hash` 完全命中 ⇒ **所有既有信号都认为"已最新"**。运行 `ensure`：

```
{"status":"installed",..,"lastCatalogRefreshStatus":"succeeded","changed":true}
→ 回到 38 books / 1258 rates / 2 runs（全量重建）
```

**Phase B —— orphan + 新增模型（`SDKWORK_MODELS_CATALOG_ROOT=D:/tmp/catalog-probe`）**

造一份目录副本（`sdkwork-models.json` + `models/`，5.3 MB），克隆 `kuaishou/kling-v3`
成 `kuaishou/kling-v3-probe`，并给它一个**独立价本** `models.kuaishou.global.probe`：

```
# 注入前
active_books = 6（kuaishou 侧），pricing_import_run 最新 = 2026.09.17.1 / fc58e8d3… / 1258
# ensure（changed:true）
ai_model:               kuaishou/kling-v3-probe  status=1 release_stage=1 shelf_state=1 routing_state=1
ai_model_video_profile: 新增 3 行（t2v / i2v / multi_shot，res_1080p），status=1
pricing_price_book:     models.kuaishou.global.probe 2026.09.17.1  active  8 rates   ← 新价本自动建
pricing_price_book:     models.kuaishou.global.official 2026.09.17.1 active 38 rates ← 未被扰动
pricing_import_run:     新增 2026.09.17.1 / 7f3c8cd3… / 1266            ← 内容变了，信号捕获
```

这一步专门证明 **`source_hash` 会在"内容变了但已知价本集合没变"时照样点火**——
只靠 `books` 比对是看不到新增模型的。

**Phase C —— 删除模型（两条链路同时收口）**

从副本目录撤掉 `kling-v3-probe`，再跑 `ensure`（`changed:true`）：

```
ai_model:               status 1 → 0        （目录表侧：软失活，无物理删）
ai_model_video_profile: 3 行 status 1 → 0
pricing_price_book:     models.kuaishou.global.probe  active → retired, deleted_at 已写
                        rates 从 8 → 0 条可计价
"probe 模型是否可计价" 查询：0 行
```

**关键点**：撤掉探针模型后目录内容**回到了 `fc58e8d3…` 那个已经记录过的状态**，
所以 `pricing_projection_is_stored` 返回 **true**（`pricing_import_run` 里那行早就在），
`catalog_complete` 的 `is_subset` 也照旧成立。**唯一看见这次删除的就是
`PriceBookDrift.orphan`** ✅ —— 这正是本轮升级第二信号换来的可观测性。

**Phase D —— 幂等性**

```
ensure #2（同一副本目录）→ changed:false
ensure #3（切回真实目录）→ changed:false   # 副本目录去掉探针模型后 == 真实目录内容
```

清理：探针副本目录、以及两条合成价本（`orphan-book-drift-probe` /
`models.kuaishou.global.probe`）已按精确标识从库里删除（8 费率 + 2 价本），
删后 `ensure` 仍 `changed:false`。

### 15.7 移交 `sdkwork-models`：55 例档位缺口（分类 + 可执行修法）

全量普查（`.tmp/classify_tier_gaps.py`，遍历 `models/*/*/model-video-profiles` 与
`models/*/*/pricing`，只取 `video_output_second` / `video_result` / `video_input_second`）：
**声明档位与报价档位不相交的 `(模型, 计量单位)` 组合 55 例，涉及 53 个模型。**

| 类 | 例数 | 形态 | 修法 |
| --- | --- | --- | --- |
| **A · 纯命名不一致** | 9 | 声明 `res_720p`，报价 `720p`——**全是 `bytedance/*`**（`doubao-seedance-*` / `dreamina-seedance-*`） | 把费率侧的 `tierCode` 补成 `res_` 前缀（`res_720p` 是 schema enum 的合法值），或给 profile 补 `pricingTierCodes: ["720p",...]`。两者择一即可，**改费率侧更干净** |
| **B · 费率把多维合成一个码** | 14 | `audio_res_1080p`（kling-3.0-turbo）、`noref_silent_4k`（kling-v3-omni）、`res_768p_dur_6s`（hailuo-*）、`input_res_720p`（runway/seedance2_5）、`ref_offpeak_res_1080p`（vidu/viduq3） | profile 的 `pricingTierCodes` 列出该档位对应的**全部**费率码 |
| **C · 两侧毫无重叠** | 32 | 费率按**质量档**（`i2v_hd` / `t2v_uhd`，black_forest_labs/flux-3）、按**时长块**（`per_6s_block`，runway/gwm1_avatars）、按**有无音轨**（`audio` / `no_audio`，runway/veo3.1）、按**像素档**（`over_4mp` / `upto_4mp`，runway/ruby）报，而 profile 只声明分辨率 + 时长 | 需要产品决定映射，**不能机械批量填**（见下方警告） |

⚠️ **不要用"把该模型定价文件里的所有 `tierCode` 灌进 `pricingTierCodes`"来批量消掉这个清单。**
`seed-video-profiles.mjs:40` 的 `pricingTierCodes()` 确实已经算出了这个集合，但它是
**按模型**算的、不分生成模式与分辨率。灌进去会让 kling-v3 的 `text_to_video` profile
也把 `motion_res_720p` 列成候选，而裁决取"首个命中"，于是**文本生视频按动作迁移的价计费**。
正确的修法是逐 profile 做语义映射（模式 × 分辨率 × 音轨），这需要回到厂商价目页核对。

顺带记录一条**当前就存在的计价风险**（不在本轮改动引入，属目录数据问题）：
`kuaishou/kling-v3` 的费率同时报了 `res_1080p`（0.112/s）与 `audio_res_1080p`（0.168/s），
而它的 profile 声明 `outputAudio: true` + `resolutionTierCode: res_1080p`。
按现在的优先级会选中 `res_1080p`，**比带音轨的实际价低 33%**。
要修就得给 profile 补 `pricingTierCodes: ["audio_res_1080p"]`——正是 15.4 把显式声明
排到第一位的原因。

### 15.8 `#31` 结论：`ai_upstream_supplier.default_vendor_code` 无运行时消费方

第 8 轮遗留的 `#31`（采购成本缺口）本轮排查清楚，**应降级为管理面数据完整性问题**：

13 处引用全部在管理面——`ports/admin_upstream_store.rs`、`admin_upstream_store/supplier.rs`、
`routes-cloudrouter-backend-api/src/upstream/supplier.rs`、前端 `suppliersPage.tsx`；
**运行时路由与计价完全不读它**。`ai_upstream_supplier_endpoint.vendor_codes` 同样只有管理面读写，
`load_upstream_account_routes` 的 join 链里没有 vendor 收敛。所以覆盖不到厂商资源不会因此发生，
**不需要为它补运行时逻辑**；契约只要求 `supplier_type = official ⇒ defaultVendorCode 必填`。

### 15.9 复现命令

> 下列脚本都在 `.tmp/` 下（`.gitignore:17` 已忽略）——它们要么依赖真实库 + 真实凭据环，
> 要么会改库，属于本地夹具而非可提交的门禁。需要复现时按下文重建即可。

```bash
cd /d/sdkwork-space/sdkwork-cloudrouter
export CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER="D:\\programs\\vs-buildtools\\VC\\Tools\\MSVC\\14.44.35207\\bin\\Hostx64\\x64\\link.exe"
export SDKWORK_DATABASE_URL="postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable"
export SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT=development      # 默认 production 会把 11 个厂商默认账号全置 status=0
export SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING_FILE="D:/sdkwork-space/sdkwork-cloudrouter/.sdkwork/secrets/upstream-credential-key-ring.development.json"
export SDKWORK_MODELS_CATALOG_ROOT="D:/sdkwork-space/sdkwork-models"

# 单测（本轮 497 → 509）
cargo test -p sdkwork-cloudrouter-router-service --lib

# 自动初始化 / 新增 / 删除 / 幂等（原生目录）
cargo build -p sdkwork-cloudrouter-installer --bin cloudrouterctl
./target/debug/cloudrouterctl.exe ensure      # 期望 changed:false；漂移时为 true 并全量重投影

# 新增/删除模型的定向探针：造一份目录副本，克隆一个模型进去
python .tmp/build_probe_catalog.py reset && python .tmp/build_probe_catalog.py add
SDKWORK_MODELS_CATALOG_ROOT="D:/tmp/catalog-probe" ./target/debug/cloudrouterctl.exe ensure   # changed:true
python .tmp/build_probe_catalog.py remove
SDKWORK_MODELS_CATALOG_ROOT="D:/tmp/catalog-probe" ./target/debug/cloudrouterctl.exe ensure   # changed:true（orphan 退役）

# 档位缺口普查
python .tmp/classify_tier_gaps.py "D:/sdkwork-space/sdkwork-models"

# 七类能力的端到端探针（未纳入版本控制的手工夹具，需真实库 + 真实目录 + 凭据环）
cargo test -p sdkwork-cloudrouter-edge-runtime --test media_provider_native_db_e2e -- --nocapture
```

WSL 侧读库（Windows 无 psql）：

```bash
wsl.exe -d Ubuntu-22.04 -- bash -lc 'PGPASSWORD=sdkworkdev123 psql -h 127.0.0.1 -U sdkwork_ai_dev -d sdkwork_ai_dev -P pager=off -f /mnt/d/sdkwork-space/sdkwork-cloudrouter/.tmp/probe_state.sql'
```

### 15.10 未决项

| # | 项 | 归属 | 状态 |
| --- | --- | --- | --- |
| N-20 | A 类档位缺口：`bytedance/*` 费率侧用裸分辨率（`720p`）而非规范词表（`res_720p`） | sdkwork-models | **已修**（9 个定价文件 / 25 条费率，见 §15.11） |
| N-21 | B/C 类需逐 profile 做"模式 × 分辨率 × 音轨"语义映射，禁止批量灌 `pricingTierCodes` | sdkwork-models（需厂商价目页） | **部分已修**：19 个 profile 条目（机械重连）已回填；**剩 63 例 warning 待产品决策**（48 例不可达 + 15 例歧义，见 §15.11） |
| N-22 | `kuaishou/kling-v3` 的 1080p 有音轨价（0.168）与无音轨价（0.112）并存，当前选 0.112 | sdkwork-models | **已定论：不是"取错档"，是"档位取决于请求"**（§15.12）。官方价目页把 1080p 的 `无声`(0.8 CNY) / `有声 x 未指定音色`(1.2) / `动作控制`(1.2) 并列为一等档位 ⇒ 静默取 `res_1080p`(无声) 对**无声请求是正确的**，只有调用方在厂商原生体里**打开有声/动作控制**时才低计 1.50×。修法不在目录层（pin 会让无声请求高计），**建议在 cloudrouter 的 kling 透传面把音频参数固定为无声或禁止透传**（跨仓，需评审） |
| N-23 | 数字人 / 动作模仿缺 `avatar` / `motion` 生成模式 profile；`suno` 无可路由有价模型 | sdkwork-models | **拆成三件，两件已定论、一件是词表缺口**（§15.12）：`suno` = **设计决定非缺陷**（官方只有订阅 credits，无按秒/按次 API 单价）；`avatar` / `motion_control` = **运行时已刻意报 `ApiCodeIsNotAGenerationMode` 缺口而不猜档**，缺的是 `sdkwork-models` 两套词表（`capability` / `generationMode`）里的条目 ⇒ 词表变更，**属评审项（未动）** |
| N-24 | `apis/*/openapi.json` + `sdks/*/openapi/*.json` 相对生成器陈旧：`7c04223` 把 `apis/` 回退成 `modelAccessChannels.update`，而路由清单已是 `.upsert` ⇒ HEAD 内部自相矛盾 | sdkwork-models | **已修**（重跑 materialize，4 个文件，见 §15.11） |
| N-25 | `tests/contract/models-openapi-contract.test.mjs` 断言**全部** app-api 操作必须 `dual-token`，但 cloudrouter 权威把 9/10 个目录读取 GET 声明为 `anonymous`（`API_SPEC.md` §367/§2168 允许）⇒ 测试过宽，HEAD 即红 | sdkwork-models | **已修**（§15.12）：按 spec 改为"钉住 9 个公开读取操作 + 其余必须 dual-token + 双向比对"，并用 5 组反例验证拦截力未降 |
| N-26 | 原「有交集即通过」判据的盲区：声明档位**恰好**命中一个费率档、但同分辨率还有**更贵的变体**时，运行时静默取最便宜档（`kling-v3` 0.112 vs 0.168、`kling-v2-6` 0.5 vs 1.0/1.2） | sdkwork-models | **盲区已封**（新增 `tier.ambiguous`，15 条 warning）；**定价决策归 N-22，已定论为"取决于请求"**。§15.12 补入官方档位语义取证、运行时复算（15/15 全部落到无声档）与门禁措辞增强 |
| N-27 | 视频 profile 的**可计价性**从未被端到端对账过：库内活跃费率相对源目录有无多/缺/重复，以及是否存在"任何档位都取不到且无兜底价"的 profile | 本仓 + sdkwork-models | **已对账**（§15.12）：活跃费率 **265 条 / 67 catalogKey 与目录 1:1（0 多、0 缺、0 重复）**；另有 55 例"无档位可解析"profile 分类留档 |
| #31 | `ai_upstream_supplier.default_vendor_code` 运行时不消费 | 管理面 | **已定论，不需运行时逻辑**（15.8） |
| — | `catalog_complete` 的 `is_subset` 是单向的；本轮靠 `price_book_drift` 补上了价本这一层，但 `ai_model` / 模型档位表仍只有单向检查 | 本仓 | 观察项 |

### 15.11 `sdkwork-models` 侧落地结果（2026-09-17 闭环）

**做法：把"档位可达性"从一次性普查升级为常驻门禁**，再用门禁把 97 例精确分类为
「机械可修」与「真歧义」，只自动修前者。

**新增门禁（`sdkwork-models/tools/validate-catalog.mjs`，两条互补规则）**

**① `model_video_profile.pricing.tier.unreachable`** —— 以**模型**为单位从定价文件收集视频计量
单位（`video_output_second` / `video_result` / `video_input_second`）的 `tierCode → unitPrice`
映射；若某 profile 声明的档位（`resolutionTierCode` / `durationTierCode(s)` / `pricingTierCodes`）
与该映射**无交集**即报：
- 命中码含本 profile 分辨率 token **且候选同价** ⇒ `error`（纯拼法差异，直接给修法）；
- 候选**价格不同**，或**无任何含该 token 的码** ⇒ `warning`（需按请求维度选档或回厂商价目页映射）；
- 该模型无视频档位费率 ⇒ 豁免。

**② `model_video_profile.pricing.tier.ambiguous`** —— 封住①的盲区：声明档位**恰好**命中一个费率档、
因此①放行，但同分辨率还有**更贵的变体**（`audio_res_1080p` / `motion_res_1080p` / `audio_voice_1080p`），
且 profile **没有**写 `pricingTierCodes` ⇒ 运行时静默取**最便宜**档，`warning`。
两个设计要点：
- **只在同一计量单位内比较**。`video_input_second` 报的是**素材输入价**（`input_res_720p`），
  与输出档位混比会把正确的 `res_720p` 误报成"还有更贵的同分辨率档"（实测假阳性 11 条）。
- **只在"存在更贵变体"时报**，且价格比较走 `compareDecimalStrings`（十进制串），不用浮点。

**修复前 → 修复后**（同一门禁，只换目录数据）：

| 口径 | error | warning(`unreachable`) | warning(`ambiguous`) | 合计 | 涉及厂商 |
| --- | --- | --- | --- | --- | --- |
| HEAD 目录数据 | 46 | 51 | 15 | **112** | bytedance 30、kuaishou 20+15、runway 20、minimax 15、vidu 8、black_forest_labs 2、luma_ai 2 |
| 修复后 | **0** | 48 | 15 | **63** | kuaishou 16+15、minimax 13、runway 11、vidu 4、black_forest_labs 2、luma_ai 2（bytedance 归零） |

> ⚠️ `ambiguous` 的 15 条**在修复前后都存在**（它不在原来的 97 例里 —— 旧普查只找"取不到档"，
> 没找"取到了但取错档"）。所以"97 → 63"不是修掉 49 例，而是：**修掉 49 例 + 新发现 15 例**。
> `15 = kuaishou/kling-v3 7 条 + kuaishou/kling-v2-6 8 条`（含 cn+global 两侧 profile 条目）。
> 这两族正是 N-22 所指的真实**低计**：`kling-v3` 声明 `res_1080p`=0.112 而 `audio_res_1080p`=0.168
> （低 33%）；`kling-v2-6` 声明 `res_1080p`=0.5 而 `audio_1080p`=1.0 / `audio_voice_1080p`=1.2
> / `motion_1080p`=0.8（**最高低计 2.4 倍**）。

**已修（49 例 = `bytedance` 30 例 + 其他 19 例）**
1. **`bytedance` 费率侧档位码规范化**（9 个文件 / **25 条费率**，另同步 25 处 `conditions[].value`
   与 25 处 `rateHash`）：
   `720p→res_720p`×9、`480p→res_480p`×8、`1080p→res_1080p`×5、`4k→res_4k`×2、
   `4k_native→res_4k_native`×1。`bytedance` 是全库**唯一**用裸分辨率的厂商
   （25 家里其余 24 家都用 `res_` 拼法），因此改费率侧比给每个 profile 加桥接更干净且全球一致；
   改完必须 `node tools/migrate-pricing-v2.mjs --write` 重算 `conditions[].value` 与 `rateHash`。
2. **19 个 profile 条目回填 `pricingTierCodes`**（9 个文件，只填"该 profile 分辨率 token 唯一命中且候选同价"的）：
   `kuaishou/kling-3.0-turbo`（cn/global 各 2 条）→ `["audio_res_1080p"]`（原本会误选无音轨价，低 33%）、
   `minimax/MiniMax-H3-Regeneration`（2 条）→ `["regen_768p_to_2k"]`、
   `runway/seedance2` / `seedance2_fast` / `seedance2_mini`（各 3 条）→ `["res_480p_720p"]`、
   `vidu/viduq3-mix`（cn/global 各 2 条）→ `["ref_res_720p"]`。
3. 重建 `models/index.json`，并刷新 `releases/2026.09.17.1.json`（`indexSha256`、
   9 个 vendor 段 sha256、`validation.issueCount` 0→63）。后者是 `release-catalog.mjs`
   的纯派生产物，`--check` 本身就在 `_sdkwork:check` 链上，刷新属既有惯例
   （对照 `9b11e94` 同批提交），且不在 AGENTS.md §Human Review Rules 的六类之内。

**`unreachable` 未修（48 例 warning，9 个模型，需产品决策）** —— 两类，**都不可机械批量改**：

| 类别 | 例数 | 分布 | 为什么不能自动修 |
| --- | --- | --- | --- |
| 费率里**有含该分辨率 token 的档位，但候选价不同**（真歧义） | **34** | kuaishou 16、minimax 12、vidu 4、luma_ai 2 | 运行时要按**请求参数**（音轨开关 / 时长 / 参考视频 / 高峰时段）选档，而 catalog profile 目前**无法表达该维度**。例：`kuaishou/kling-v3-omni` 同时报 `noref_audio_1080p` / `noref_silent_1080p` / `ref_silent_1080p`；`luma_ai/ray-3.2` 报 `res_720p_dur_5s` / `res_720p_dur_10s`；`vidu/viduq3` 报 `ref_res_720p` / `ref_offpeak_res_720p` |
| 费率里**没有任何档位含该分辨率 token** | **14** | runway 11、black_forest_labs 2、minimax 1 | 费率按**质量档**（`i2v_hd` / `t2v_fhd` / `v2v_draft`）、**时长块**（`per_6s_block`）、**有无音轨**（`audio`）、**像素档**（`over_4mp`）、**生成模式**（`video_to_video`）报，分辨率维度在档位码里**根本不存在**，需回到厂商价目页建立"报价维度 → profile 维度"的映射 |

> 这两个数字必须用**与门禁同构的判据**复算（`billed ∩ {含 profile 分辨率 token 的档位}` 是否为空），
> 不能按报错文案里那句固定后缀（`the price book splits this tier by a dimension the profile cannot express`）
> 分类——那句话对两类都会附加，按它分会把 14 例误算进 34 例。

**`ambiguous` 未修（15 例 warning，2 个模型，需产品决策）** —— 都属"取到了档、但取的是最便宜那档"：

| 模型 | 条数 | 声明价 | 更贵的同分辨率变体 | 低计幅度 |
| --- | --- | --- | --- | --- |
| `kuaishou/kling-v2-6` | 8 | `res_1080p` = 0.5 | `audio_1080p` = 1.0、`audio_voice_1080p` = 1.2、`motion_1080p` = 0.8 | **最高 2.4×** |
| `kuaishou/kling-v3` | 7 | `res_1080p` = 0.112 | `audio_res_1080p` = 0.168、`motion_res_1080p` = 0.168 | **1.5×**（即 N-22 的"低 33%"） |

> 这 15 条**不在**原来的 97 例里：旧普查只找"哪一档都取不到"，不找"取到了但取错档"。
> 补齐判据后它们才显形，因此**修复前后都存在**，不构成回归。

**门禁验证（`_sdkwork:check` 13 步，只跑 node 部分）**：12 PASS / 1 FAIL，唯一红项是
N-25（既存、与本轮无关）。关键项：`migrate-pricing-v2`（契约同步，0 条待迁移）、
`build-index --check`、`validate-catalog`（`ok=true`，63 warning / 0 error）、`catalog-audit`、
`release-catalog --check`、`models_openapi_export --check`、`materialize --check` 全绿。

**跨仓端到端验证（Windows 原生，真实库 + 真实目录）**

```bash
# cloudrouter 工具链：仓内 rust-toolchain.toml 解析成 msvc；LIB/INCLUDE 已就位，
# 但 Git Bash 的 /usr/bin/link.exe 会抢在 MSVC 前 ⇒ 只钉 linker 路径即可，不用 vcvars
export CARGO_TARGET_X86_64_PC_WINDOWS_MSVC_LINKER="D:\programs\vs-buildtools\VC\Tools\MSVC\14.44.35207\bin\Hostx64\x64\link.exe"
cargo build -p sdkwork-cloudrouter-installer --bin cloudrouterctl -j 1     # 4m50s
export SDKWORK_MODELS_CATALOG_ROOT="D:/sdkwork-space/sdkwork-models"
./target/debug/cloudrouterctl.exe ensure
```

**判据与结果**（先确认二进制比所有在途源文件新，否则结论无效 —— 15:45 那个二进制就是
过期品，12 个 `router-service` 源文件比它新）：

| 断言 | 结果 |
| --- | --- |
| `ensure` 首次 | `changed:true`、`externalCatalog:true`、`lastCatalogRefreshStatus:succeeded` ⇒ 内容信号被 bytedance 费率 hash 变化点火 |
| `pricing_import_run` 新增行 | `2c71ced26f38f362…`，`row_count=1258`，16:30:21（修复前基线是 13:32 的 `fc58e8d31ec09c93…`） |
| 库内 bytedance 视频档位 | `res_720p`9 + `res_480p`8 + `res_1080p`5 + `res_4k`2 + `res_4k_native`1 = **25 条**，与改名的 25 条费率 **1:1 吻合** |
| 旧裸档位残留 | `leftover_bare_tiers = 0` |
| `ensure` 第 2、3 次 | 均 `changed:false`（幂等） |
| `ai_model_video_profile.pricing_tier_codes` | `kling-3.0-turbo`→`["audio_res_1080p"]`、`MiniMax-H3-Regeneration`→`["regen_768p_to_2k"]`、`runway/seedance2{,_fast,_mini}`→`["res_480p_720p"]`、`viduq3-mix`→`["ref_res_720p"]` 全部落库 |

> 读库通道：Windows 无 `psql`，走
> `wsl.exe -d Ubuntu-22.04 -- bash -lc 'PGPASSWORD=… psql -h 127.0.0.1 -U sdkwork_ai_dev -d sdkwork_ai_dev -P pager=off -f /mnt/d/…/x.sql'`。
> ⚠️ 表在 **`sdkwork_ai_dev` schema** 下，**不是 `public`**（`information_schema.tables` 要带
> `table_schema='sdkwork_ai_dev'`，否则查出一片空、误判成"表不存在"）。
> ⚠️ 档位不在独立列：在 `pricing_rate.conditions -> 0 ->> 'value'`。

### 15.12 第 11 轮：三个悬案的定论与跨仓对账（2026-09-17 傍晚）

本轮只做三件事：把 §15.10 里悬着的 **N-22 / N-23 / N-25** 定论，把 N-26 的"低计幅度"
从门禁读数升级为**真实库 + 官方价目页**的证据，并新增 N-27（可计价性对账）。

#### 15.12.1 N-25（契约测试过宽）——已修

`API_SPEC.md` §366 把 `dual-token` 限定在 **protected** app-api 路由上，§367 / §2168 又要求
**public** 的 SDK 生成操作必须同时 materialize `security: []` 与 `x-sdkwork-auth-mode: anonymous`
（SDK 据此跳过凭据注入）。`x-route-scope` 不是判别符 —— 该权威面里每个操作都声明 `public`。
因此**生成器合规、测试过宽**。改法：显式钉住 9 个公开读取操作，其余仍必须 `dual-token`，最后做
**双向比对**（防"把公开面删干净"这种反向绕过）：

```
GET /app/v3/api/ai/model_access_channel_presets      GET /app/v3/api/ai/models
GET /app/v3/api/ai/model_access_channels             GET /app/v3/api/ai/models/{modelId}/video_profiles
GET /app/v3/api/ai/model_rankings                    GET /app/v3/api/ai/models/{modelId}/voices
GET /app/v3/api/ai/model_vendors                     GET /app/v3/api/ai/video_profiles
                                                     GET /app/v3/api/ai/voices
```

**反例验证**（确认拦截力未降，5/5 全部拦住）：A2 把 `modelAccessChannels.upsert` 改成
`anonymous` ✔拦；B 把 `models.list` 改成 `dual-token` ✔拦（双向比对生效）；C 公开却带凭证
`security` ✔拦；D `dual-token` 却 `security: []` ✔拦；E 未知 auth-mode（`api-key`）✔拦。

#### 15.12.2 N-22 / N-26（15 条歧义）——定论：**取决于请求，不在目录层修**

**缺失的那块证据在仓库里就有**：`sdkwork-models/.workbuddy/raw/kuaishou--cn__rendered-pricing-base-video.txt`
（2026-09-17 用 Chrome/CDP 渲染的官方价目页，来源
`https://klingai.com/document-api/pricing/base/video`）原文：

| 模型 | 功能 | 720P | 1080P | 4K |
| --- | --- | --- | --- | --- |
| Kling 3.0 | **无声** | 0.6 | **0.8** | 3.0 |
| Kling 3.0 | 有声 x 未指定音色 | 0.9 | **1.2** | 3.0 |
| Kling 3.0 | 动作控制 | 0.9 | **1.2** | — |
| Kling 2.6 | **无声** | 0.3 | **0.5** | — |
| Kling 2.6 | 有声 x 未指定音色 | — | **1.0** | — |
| Kling 2.6 | 有声 x 有指定音色 | — | **1.2** | — |
| Kling 2.6 | 动作控制 | 0.5 | **0.8** | — |

⇒ `res_1080p` 就是官方**「无声」**档，`audio_res_1080p` = 有声未指定音色，`motion_res_1080p` = 动作控制。
**它们是并列的一等档位，不是"同一档的折扣价"。**

**运行时复算**（按 `catalog.rs::decide_video_pricing_tier` 的判序，输入取**库内活跃费率**）
—— 15/15 全部落到无声档：

| 模型 | 条数 | 候选档位（权威递降） | 命中 | 计费价 | 同分辨率最贵变体 | 低计 |
| --- | --- | --- | --- | --- | --- | --- |
| `kling-v3` | 7 | `pricingTierCodes=[]` → `res_1080p` | `res_1080p` | 0.800 CNY / 0.112 USD | `audio_res_1080p` / `motion_res_1080p` = 1.200 / 0.168 | **1.50×** |
| `kling-v2-6` | 8 | `pricingTierCodes=[]` → `res_1080p` | `res_1080p` | 0.500 CNY / 0.070 USD | `audio_voice_1080p` = 1.200 / 0.168 | **2.40×** |

**结论：这是真实敞口，但触发条件是"调用方在厂商原生请求体里打开有声/动作控制"。**
判据链：

1. 视频生成走**厂商原生透传**，请求体是厂商 JSON ⇒ 调用方**能**带音轨标志；
2. profile 的 `wireParameters` 只带 `{duration, resolution}`，**不带**音频维度；
3. 运行时裁决**不解析**厂商原生体里的音频事实（`decide_video_pricing_tier` 只吃
   `resolution`，且仅用于按分辨率挑 profile，不参与选档）；
4. 目录侧唯一相关信号 `outputAudio` **不能**当依据 —— 它是
   `tools/seed-video-profiles.mjs` 的**族级常量**：`kuaishou` 47/47、`bytedance` 35/35、
   `vidu` 24/24 全 `true`；`google` 0/12、`luma_ai` 0/10、`openai` 0/4、`pixverse` 0/8、
   `xai` 0/6、`zhipu` 0/2 全 `false`；`minimax` 3/24、`runway` 12/42。反例决定性：
   `kling-v2-5-turbo` 与 `kling-video-o1` 的费率表**根本没有音频档**，它们的 `outputAudio` 也是 `true`。

⇒ **不 pin、不改价**。pin 任一侧都会让另一侧错价：钉 `audio_res_1080p` 会让**无声请求高计
1.50×**（`kling-v2-6` 2.40×），而这恰是 N-22 一开始想避免的那类错误。
**建议（跨仓，需评审）**：在 cloudrouter 的 kling 透传面把音频参数**固定为无声或禁止透传**
（`/kling/v1/videos/text2video` / `image2video` / `generations`），使"取最便宜档"从"碰巧正确"
变成"语义正确"；若业务确实要放行有声，则必须把该维度接入选档，不能在目录层猜。

**门禁侧落地（本轮唯一代码改动，`sdkwork-models/tools/validate-catalog.mjs`）**：
`tier.ambiguous` 的 message 补上两条决策信息 —— ①当 profile 声明了 `outputAudio: true` 时，直接
点出"目录声称有声、而运行时只能取到无声档"这一自相矛盾；②给出判据："只有**每个被路由的请求都
共享同一种变体**时 pin `pricingTierCodes` 才是对的，否则变体必须来自请求而不是最便宜档"。
计数不变（仍 15 条），只提升可复核性。

#### 15.12.3 N-23 —— 拆成三件，两件已定论

**(a) `suno` 无可路由有价模型 = 设计决定，非缺陷。**
官方只公布订阅 credits（Pro 2,500/月、Premier 10,000/月），**没有任何按秒/按次的 API 单价**；
`models/suno/` 下 5 个模型里 `suno-v5` / `suno-v5.5` 已降为 `deprecated`（其既有
0.020000 / 0.025000 USD 单价无官方页可复核，标为**未确认**），v6 族 3 个（`suno-v6` /
`v6-mini` / `v6-wild`）为 `catalog_only`。证据与判定过程见
`sdkwork-models/.workbuddy/patches/suno--global.json` 的 `notes`。

**(b) `avatar` / `motion_control` = 词表缺口（不是数据缺失），运行时已刻意不猜档。**
两侧现状：

| 面 | 数字人 | 动作模仿 | 视频延长 |
| --- | --- | --- | --- |
| `sdkwork-generations` provider adapter | `avatar_video`（限 kling） | `motion_mimicry`（限 kling / vidu） | **`video_extend`** |
| `sdkwork-cloudrouter` provider-native classifier | `kling.avatar`（`/kling/v1/videos/avatar`） | `kling.motion_control`（`/v1/videos/motion-control`） | — |
| `sdkwork-models` `generationMode` 枚举 | **无** | **无** | **`video_extension`**（拼法不同的另一个名字） |
| `sdkwork-models` `capability` 枚举 | **无** | **无** | — |

`catalog.rs::video_generation_mode_for_api_code` 只认 `text_to_video` / `image_to_video` /
`reference_to_video` / `multi_shot` 四个后缀，`kling.avatar` / `kling.motion_control` 一律返回
`None` ⇒ 报 `ApiCodeIsNotAGenerationMode` 缺口。**这正是刻意的**：该函数的文档注释已写明
"按普通视频档位兜底会把它们按更低的单价计费，因此报缺口是唯一正确结果"。
⇒ 修它要**扩两处枚举**并同步下游 match 分支（`generations` 的 `operation_types`、
cloudrouter 的模式映射），属**标准/词表变更**，是 AGENTS.md §Human Review Rules 覆盖的动作，
**本轮未动**。附带发现：`video_extend`(generations) 与 `video_extension`(models) 是**同一能力两个名字**，
需一并收敛（`video_extension` / `video_edit` 目前在目录里**从未被任何 profile 使用**，收敛无数据冲击）。

**(c) `runway/gwm1_avatars`** 是目录里**唯一**数字人模型，被塞进 `capabilities: ["video","audio"]`
+ `generationMode: text_to_video`，其费率档位是 `per_6s_block`（6 秒计费块，不是档位码）⇒
落入 `unreachable` 且无兜底价。它是 (b) 的具体受害者，不是独立缺陷。

#### 15.12.4 N-27（新增）：可计价性对账 —— 跨仓 1:1

**做法**：把库内**活跃**费率（`deleted_at IS NULL`）投影成
`(catalog_key, region, currency, meter, operation, tier_code, unit_price)` 七元组集合，
与 `sdkwork-models` 源目录 `models/*/*/pricing/*.json` 的同构集合逐条比对
（只取 `video_output_second` / `video_result` / `video_input_second` 三个计量单位）：

| 断言 | 结果 |
| --- | --- |
| catalogKey 数 | 源目录 **67** / 库内 **67** |
| 库内多出（源目录已无） | **0** |
| 源目录有、库内无 | **0** |
| 库内同一组合重复（活跃） | **0** |
| 活跃视频费率总行数 | **265**，与源目录 265 条 **1:1** |
| 软删历史行（`deleted_at` 非空） | 111 条；旧裸档位（`480p`/`720p`/`1080p`/`4k`）**在活跃集合中为 0** ⇒ 印证 §15.11 的 bytedance 改名确实生效且旧档位已正确退役 |

**⚠️ 方法论坑（本轮踩到，务必先筛 `deleted_at IS NULL`）**：不筛软删会得到
**46 条"库内残留" + 59 条"重复行"的假阳性** —— 例如
`bytedance/doubao-seedance-2-0-260128` 的 `480p/720p/1080p/4k` 与无条件的 `0.860000`
都还在表里，但它们 `deleted_at` 非空，属**正常的历史版本**（`effective_from` 2026-09-16，
新档位同时入库）；`kuaishou/kling-v3` global 每个档位 `n=2` 也是"1 活跃 + 1 软删"，不是活体重复。
`pricing_rate` 用**软删 + `status`** 表达版本演化，所有"库内 vs 目录"的集合比对都必须带上这个过滤条件。

**"无档位可解析"分类（留档，供后续按厂商价目页建映射）**：把 221 个视频 profile 按运行时判据分三桶：

| 桶 | 条数 | 含义 | 代表 |
| --- | --- | --- | --- |
| OK | 105 | 候选档位在活跃费率里直接命中 | bytedance `res_720p`、`kling-3.0-turbo` `audio_res_1080p`、`MiniMax-H3-Regeneration` `regen_768p_to_2k` |
| FALLBACK | 61 | 候选档位无命中，但该模型有**无条件**（无 `tier_code` 条件）费率 ⇒ `priced` 集合为空、报 `MeterHasNoTierConditionedRate`，实际按**模型级平价**计 | `openai/sora-2`、`runway/gen4.5`、`xai/grok-imagine-video`、`google/veo-3.1-*`、`alibaba/wan2.6-*` |
| DEAD | 55 | 候选档位无命中，且**无兜底价** | `minimax/hailuo-0{2,2.3,-fast}`（费率为**复合档** `res_768p_dur_6s`，profile 声明的是**分离**的 `res_768p`）、`runway/veo3.1{,_fast}`（费率只报 `audio`/`no_audio`）、`runway/h3_max`（`res_480p`/`res_768p`）、`runway/ruby`（`over_4mp`/`upto_4mp`）、`kuaishou/kling-video-o1`（`noref_*`/`ref_*`）、`vidu/viduq3`（`ref_res_*`）、`luma_ai/ray-3.2`（源已改成复合 `res_*_dur_*`，旧 `dur_*` 已软删） |

> DEAD / FALLBACK 的划分**依据运行时真实判序**（`decide_video_pricing_tier` +
> `index_video_pricing_tiers` + `index_priced_video_tier_codes`），并已核对 `catalog.rs` 源码：
> `priced` 集合**只收带 `tier_code` 条件**的费率，因此"只有平价费率的模型"在该判据下报
> `MeterHasNoTierConditionedRate`。55 例 DEAD 与 §15.11 的 48 例 `unreachable` warning
> **同源但不相等**：门禁按**模型**聚合、按**目录**判；此处按库内**活跃**费率与 profile 逐条判。

#### 15.12.5 门禁与契约终态

- `sdkwork-models` `_sdkwork:check` **13/13 全绿**（首次；此前唯一红项 N-25 已修）：
  `check:app-composition`、`migrate-pricing-v2`、`build-index --check`、`validate-catalog`
  （`ok=true`，63 warning / 0 error）、`freshness-report`、`catalog-audit`、
  `release-catalog --check`（`2026.09.17.1 is current`）、
  `generate-mainstream-agent-model-catalog --check`、
  `generate-vendor-model-architecture-doc --check`、`models_openapi_export --check`、
  `materialize-models-openapi --check`、`models-openapi-contract.test.mjs passed`、
  `check-api-response-envelope passed`。
- 未提交面：`sdkwork-models` 26 项改动（门禁 + 契约测试 + 19 个 profile / 9 个定价文件 +
  派生 openapi 与 release 产物），`sdkwork-cloudrouter` 77 项改动（本轮只追加本审计文档）。

**本轮的改动不触目录数据**，因此运行时侧应当**不需要刷新** —— 这本身就是一条断言，已核：

| 读数 | 值 |
| --- | --- |
| `cloudrouterctl ensure`（`SDKWORK_MODELS_CATALOG_ROOT=D:/sdkwork-space/sdkwork-models`） | `changed:false`、`catalogVersion=2026.09.17.1`、`externalCatalog:true`、`lastCatalogRefreshStatus:succeeded` |
| `release-catalog --check` | `2026.09.17.1 is current` |
| 活跃视频费率 / 软删历史 / 活跃 profile / 已 pin profile / `pricing_import_run` | **265 / 111 / 177 / 18 / 4** |

⇒ **目录版本、运行时读取版本、库内已导入版本三者同为 `2026.09.17.1` 且 `changed:false`**：
"只改门禁文案、不动目录"这一改动没有引起任何跨仓漂移。`pinned_profiles=18` 与 §15.11 回填的
19 条一致 —— DB 侧 cn/global 合并成一行，条数比目录侧少是既有现象。

---

## 15.13 第 12 轮：契约发布面 ↔ 路由可达面的全量覆盖（N-28）

### 15.13.1 问题的形状

用户本轮的验收口径是「**确保整体功能每个测试都可以走到目标 vendor 的 api 调用，不同 vendor 具备
对应的能力的 api 定义要正确，并确保实现完整**」。按这条口径把**三份声明**摆在一起对账：

| 声明 | 位置 | 厂商原生操作数 |
| --- | --- | --- |
| 发布的入站契约 | `apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json`（10 个 `x-sdkwork-vendor-path-prefixes` 命名空间） | **47** |
| 实际注册的 HTTP 路由 | `sdks/_route-manifests/open-api/…route-manifest.json` → `generated_open_http_route_manifest.rs` | **47**（逐条一致） |
| 分类器能命名的 | `path -> api_code` 映射（两份副本） | **17** |

⇒ 契约与路由清单**完全一致**，但它们联合发布的 47 条厂商原生操作里，**30 条没有任何 arm 能命名**。
`classify_request` 剥掉命名空间后落到 catch-all `None`，合成一个 `<vendor>.<末段>` 的 route_key
（如 `anthropic.files`、`midjourney.generations`），该 api scope 在 `ai_resource` / 资源组授权里
不存在 ⇒ `upstream_route_selector.rs:508` 直接 fail-closed：

```
upstream route is not available for configured upstream account route:
no upstream account routes are configured for account group {code} (id {id}) on api scope {api_code}
```

这条报错**既不说路径、也不说缺哪一环**，所以在此之前它是完全不可见的：§15.12 里的
`node tools/check-cloudrouter-ai-routing-consistency.mjs` 6 项检查**全绿**，而 47 条里 30 条
注定走不到厂商。这正是"每个测试都能走到目标 vendor"与"API 定义正确"之间的缺口。

### 15.13.2 新检查 7：契约发布面的可路由性对账（双向、带台账）

`tools/check-cloudrouter-ai-routing-consistency.mjs` 新增第 7 项检查：

- 取契约里所有落在 `x-sdkwork-vendor-path-prefixes` 命名空间下的 `(method, path)`；
- 用**同一条 `path -> api_code` 映射**求 api code（不是另写一套匹配）；
- 要求该 api code **既在 `ai_route_taxonomy.rs` 里、又有种子 `api_endpoint`**；
- 三者齐备 = 可路由；否则必须出现在本轮新增的 **`DECLARED_UNROUTED_OPERATIONS` 台账**里。

台账是**精确双向**的，因此不可能腐烂成永久借口：

| 方向 | 触发 | 结果 |
| --- | --- | --- |
| 契约发布了、但走不到 | 不在台账里 | **红**：点名 `METHOD path` + 缺哪一环 |
| 台账里写了、但已变得可路由 | api code ∈ taxonomy 且已种子 | **红**：提示删掉该条 |
| 台账里写了、但契约已不再发布 | 陈条 | **红**：提示删掉该条 |

实测读数：**47 = 19 可路由 + 28 台账**（`19 + 28 = 47` 与契约操作数逐条吻合：anthropic 11、
google 13、kling 4、vidu 7、volcengine 3、suno 2、elevenlabs 2、midjourney 2、minimax 1、
nano-banana 2，减掉 9 条 utility 类台账差异后即得）。

**反例验证 4/4 全拦**（改前红、改回绿）：

| # | 注入 | 门禁输出 |
| --- | --- | --- |
| 1 | `gemini.image_generation` + `kling.task_query` 模板回退成 `:predict` / `/v1/videos/{taskId}` | `seeded pathTemplate describes a path these arms cannot answer (2)` × 两份副本，逐条列出 arm 实际应答的路径 |
| 2 | 把 `gemini.image_generation` 的模板换成 nano-banana 那条 | 拦住（证明分支感知：`/nano-banana:` 标记只允许给 `gemini.nano_banana.image_generation`） |
| 3 | 把 `/api/v3/contents/generations/tasks` 的 arm 改成 `…/task`（单数） | 同时报 `check 4` 与 `check 7`：`POST /volcengine/api/v3/contents/generations/tasks is published by the contract but the gateway cannot route it (no arm matches, no taxonomy route, no seeded api_endpoint)` |
| 4 | 加一条 `"nano.banana" if path == "/v1/images/generations"` arm，把台账项变成可路由 | `POST /nano-banana/v1/images/generations is now routable (gemini.nano_banana.image_generation) but is still declared unrouted in this check; delete its entry` |

台账 28 条的归类与理由（写在门禁源码里，逐条可查）：

| 组 | 条数 | 内容 | 为什么现在不修 |
| --- | --- | --- | --- |
| anthropic / google 工具面 | 20 | `files` CRUD、`messages/batches`、`count_tokens`、`cachedContents`、`:batchEmbedContents`、`:countTokens` | 全都没有 taxonomy route / 种子 / 资源组授权 / 价格；且都不走按次生成的计量单位（`count_tokens` 厂商免费，files/batches 是存储与作业控制）。**接线是定价与产品决策，不该由门禁替产品定** |
| `midjourney` 命名空间 | 2 | `/midjourney/v1/images/generations` ± `{task_id}` | `ai_upstream_supplier`、`ai_model_vendor`、bundled account **三者都没有**；且 `sdkwork-generations` 把 `midjourney` slug 走的是 OpenAI 兼容图片面（`image.rs:76` `"openai" \| "midjourney" => dispatch_openai`），这条命名空间没有消费者 |
| `nano-banana` 命名空间 | 2 | `/nano-banana/v1/images/generations` ± `{task_id}` | 见 15.13.4：**有活消费者、且是跨仓 API 权威歧义**，不是加一条 arm 能解决的 |
| `vidu` 视频动词 | 4 | `text2video` / `img2video` / `reference2video` / `tasks/{id}/creations` | 见 15.13.4：路径本身**是 Vidu 真路径**（账户 base_url = `https://api.vidu.cn`），但 taxonomy 里 `vidu.*` 只有 `reference_to_image` / `start_end_to_video` / `motion_sync`，**没有现成 api code 可复用**；每条都要新增 taxonomy route + 种子 + 资源组授权 + 价格 |

### 15.13.3 检查 4 升级为"求值"：补上三条只看字面量的漏网

旧检查 4 只比对 `path == "<字面量>"` 形态的 arm，其余一律计成
`predicateCount ... not comparable`（5 条）——**漏洞就在"不比对"这四个字里**：谓词 arm 恰恰是
三处漂移的藏身处。

现在的 `parsePathArms` 把 **5 类 arm 形状全部解析成语义结构**（literal / pathPrefix /
geminiAction（含 `/nano-banana:` 分支）/ poll(family) / 保留旧谓词名映射），
再用 `resolveApiCode` 求值——**与 Rust 侧同一条 match 语义**；遇到无法建模的形状**直接红**，
不再退回"计数但不校验"（本轮实测：脚本注入一次不成形的 arm 删除，门禁立刻报
`1 arm(s) this gate cannot model` —— 这条安全属性本身也验证过了）。

修掉的三条 `pathTemplate`（都是"目录宣称了一个没有任何 arm 能应答的入口"）：

| api code | 改前 | 改后 | 依据 |
| --- | --- | --- | --- |
| `gemini.image_generation` | `/v1beta/models/{model}:predict` | `/v1beta/models/{model}:generateImages` | arm 谓词是 `gemini_model_action_matches(path, "generateimages")`；`media_routing_e2e.rs:987` 用 `/google/v1beta/models/gemini-2.0-flash-preview-image-generation:generateImages` 真实走通了 Google 账户 |
| `gemini.nano_banana.image_generation` | `/v1beta/models/{model}:predict`（与上一条**同一个**模板） | `/v1beta/models/nano-banana:generateImages` | 该 arm 的内层判据是 `path.contains("/nano-banana:")`，所以 `{model}` 永远落进 else 分支；`passthrough.rs:2329` 的既有断言 `endpoint_key_from_standard_path("gemini", "/v1beta/models/nano-banana:generateImages")` 就是权威路径 |
| `kling.task_query` | `/v1/videos/{taskId}` | `/v1/videos/generations/{taskId}` | 三处独立来源一致：契约 `GET /kling/v1/videos/generations/{task_id}`、生成 SDK `videos_kling.rs:30`、分类器 poll arm `task_poll_path_matches(…, "v1/videos/generations")` |

### 15.13.4 顺带坐实的两类"活缺陷"（含一条跨仓 API 权威歧义）

**(a) 已修：volcengine 走的是"发明的路径"，而契约发布的是 Ark 真路径。**

DB 实测（`ai_upstream_account` → `ai_upstream_supplier_endpoint`）：

| supplier | 上游 base_url |
| --- | --- |
| volcengine | `https://ark.cn-beijing.volces.com` |
| gemini | `https://generativelanguage.googleapis.com` |
| vidu | `https://api.vidu.cn` |
| kling | `https://api-beijing.klingai.com` |

而厂商原生请求是**逐字转发**的（`provider_request.rs:50`：非 adapter 模式下
`path` 就是 `invocation.request.path`，`url = base_url + path`）。所以
`volcengine.video_generation` 原本种子在 `/v1/videos/generations` ⇒
`https://ark.cn-beijing.volces.com/v1/videos/generations` —— **Ark 不服务该路径**；
而 `sdkwork-generations` 的 `volcengine_create_video_task` 真正调用的是
`videos_volcengine().create_api_v3_contents_generations_task`，即
`/volcengine/api/v3/contents/generations/tasks` —— 又**没有任何 arm 能命名**。两头都不通。

本轮修法（**复用既有 api code，不新增 taxonomy / 授权 / 价格**）：

| 新增 arm | api code | 备注 |
| --- | --- | --- |
| `/api/v3/contents/generations/tasks` | `volcengine.video_generation` | Ark 内容生成任务 = 视频生成 |
| `/api/v3/contents/generations/tasks/{task_id}`（poll） | `volcengine.task_query` | 新增 `task_poll_path_matches(path, "api/v3/contents/generations/tasks")` |
| `/api/v3/images/generations` | `volcengine.image_generation` | Ark 图片生成 |

同时把三条 `pathTemplate` 改成 Ark 真路径（与既有的 `volcengine.speech` =
`/api/v3/audio/speech` 同约定），并**保留** `/v1/videos/generations`、`/v1/images/generations`
两条原名作兼容别名。两条分类器副本（`provider_native_classifier.rs` / `passthrough.rs`）
同步改；新增单测
`volcengine_ark_paths_classify_alongside_the_openai_shaped_aliases`
（**10 passed / 0 failed**，`cargo test -p sdkwork-cloudrouter-router-service --lib provider_native_classifier`）。

顺带把三个近似重复的谓词辅助函数
（`task_query_path_matches` / `music_task_query_path_matches` / `media_task_poll_path_matches`，
其中一个把 `/v1/` 硬编码进名字）**收敛成一个 `task_poll_path_matches(path, family)`**，
family 自带前缀 —— 这既是可读性修复，也是让门禁能建模的必要条件：**名字解析不了的 arm，
门禁就只能跳过**。

**(b) 未修的活缺陷（需跨仓决策，已写进台账理由）：**

`sdkwork-generations/crates/sdkwork-generations-provider-adapter/src/gateway.rs` 生成的
Open SDK 调用点，逐条对照分类器：

| generations 调用点 | cloudrouter 收到的路径 | api code | 状态 |
| --- | --- | --- | --- |
| `images_nano_banana().create_generations` | `/nano-banana/v1/images/generations` | 无 arm | **❌ 50201** |
| `nano_banana_retrieve_image_generation` | `/nano-banana/v1/images/generations/{id}` | 无 arm | **❌ 50201** |
| `videos_vidu().create_ent_v2_text2video` | `/vidu/ent/v2/text2video` | 无 arm | **❌ 50201** |
| `videos_vidu().create_ent_v2_img2video` | `/vidu/ent/v2/img2video` | 无 arm | **❌ 50201** |
| `videos_vidu().list_ent_v2_tasks_creations`（图片与视频轮询共用） | `/vidu/ent/v2/tasks/{id}/creations` | 无 arm | **❌ 50201** |
| `gemini_retrieve_video_operation` | `/google/v1beta/models/{m}/operations/{id}` | 无 arm | **❌ 50201**（且**不在契约里**，检查 7 覆盖不到） |
| `videos_volcengine().create_api_v3_contents_generations_task` | `/volcengine/api/v3/contents/generations/tasks` | `volcengine.video_generation` | ✅ 本轮修 |
| `videos_volcengine().list_api_v3_contents_generations_tasks` | `…/tasks/{id}` | `volcengine.task_query` | ✅ 本轮修 |
| `http_client().post(ai_path("/volcengine/api/v3/images/generations"))` | `/volcengine/api/v3/images/generations` | `volcengine.image_generation` | ✅ 本轮修 |
| kling / suno / minimax / elevenlabs / vidu(3) / volcengine.speech / openai 兼容面 | 见 §15.11 全清单 | 各自内建路由 | ✅ 本来就通 |

⇒ **`sdkwork-generations` 目前有 6 条厂商调用点结构性走不到厂商**（其中 5 条路径契约已发布、
1 条连契约都没有）。

**nano-banana 是本轮最值得单独点名的 API 权威歧义**：契约同时存在两套 nano-banana 入口——
Gemini 原生面 `/google/v1beta/models/nano-banana:generateImages`（**已接线**：taxonomy 有
`gemini.nano_banana.image_generation`，`official.gemini.full` 有资源授权，`media_routing_e2e.rs`
已验证能打到 Google 账户），以及 SDKWork 自造的 REST 面 `/nano-banana/v1/images/generations`
（有类型化 schema `NanoBananaImageGenerationRequest`、有 SDK、**有活消费者**）。
而 Gemini 账户 base_url 是 `generativelanguage.googleapis.com`，逐字转发
`/v1/images/generations` **必然 404** ⇒ **给 `/nano-banana/…` 加 arm 只会把 50201 换成上游 404，
不是修复**。两个候选方向（(i) `dispatch_nano_banana` 改走 Gemini 原生面，
(ii) 网关为 `nano-banana` 命名空间提供翻译层）都属于跨仓 API 权威归属问题，
按 `AGENTS.md` §Human Review Rules「Surface … API authority ambiguity instead of guessing」
**上报而非猜测**。

### 15.13.5 门禁终态

| 检查 | 修复前 | 修复后 |
| --- | --- | --- |
| 1 `path -> api_code` 两份副本一致 | classifier 29 / passthrough 29 | 同左（`task_poll_path_matches` 已同步） |
| 2 种子 api code 都在 taxonomy | 56 个、0 未知 | 同左 |
| 3 契约路径都在 `OPEN_API_PREFIXES` | 122 路径、0 越界 | 同左 |
| 4 arm ↔ 种子模板 | **25 条字面量 arm 已比对、5 条谓词 arm 不比对** | **39 条 arm / 30 个 api code，全部求值** |
| 5 命名空间四方一致 | 10/10/10/10，0 未知 | 同左 |
| 6 生成 SDK 不把厂商路径挂到 `/v1` | 2367 文件、0 违规 | 同左 |
| 7（新）契约发布面可路由性 | **不存在** | **47 = 19 可路由 + 28 台账（精确双向）** |

```
node tools/check-cloudrouter-ai-routing-consistency.mjs
  passthrough: 39 arms over 30 api codes, all evaluated
  classifier: 39 arms over 30 api codes, all evaluated
  open-api vendor-native surface: 19 operation(s) routed, 28 declared unrouted
ai-routing-consistency: passed
```

---

## 15.14 第 13 轮收尾：DB 证据裁决、契约发布面缺口、种子探针盲区

§15.13 的三份声明对账是在**静态**层面（源码 + JSON 种子）完成的。本节补上三类只有**运行态/跨仓**
才看得见的读数：真实上游 `base_url`、**DB 里已落库的 `path_template`**、以及**下游跨仓调用点**。

### 15.14.1 跨仓目录一致性复核

改动落在 `data/ai-routing/resources/vendor-native-resources.json` 的 5 条 `pathTemplate` 与分类器 arm 上，
故需复核 `sdkwork-models` 目录版本是否漂移。**核对过程本身留下一条事故记录**：

| 项 | 读数 | 结论 |
| --- | --- | --- |
| ❌ `scripts/update_catalog_version.mjs --check` | 把 `sdkwork-models/sdkwork-models.json` 的 `catalogVersion` 从 **`2026.09.17.1` 打回 `2026.08.30.1`**、`generatedAt` 从 `2026-09-17T00:00:00Z` 打回 `2026-08-30T00:00:00Z` | 该脚本**忽略 `--check`**、硬编码版本号、**无条件 `writeFileSync`**；是历史一次性迁移工具，**不是校验器** |
| ✅ 复原后 `git diff --stat -- sdkwork-models.json` | 空 | 已精确改回；全仓 grep 无 `2026.08.30.1` 残留 |
| ✅ `tools/build-index.mjs --check` | `sdkwork-models index is current` / exit=0 | 索引与内容一致 |
| ✅ `tools/validate-catalog.mjs` | exit=0（仅 1 条既存 `tier.unreachable` warning） | 契约合规 |
| ✅ `tools/catalog-audit.mjs` | exit=0 | |
| ✅ `tools/release-catalog.mjs --check` | exit=0 | |
| ✅ `tools/freshness-report.mjs --as-of-catalog-generated-at` | `ok:true, generatedAt:2026-09-17T00:00:00Z, staleSources:[]` | 目录版本正确且不陈旧 |

⇒ **跨仓目录一致，无漂移**；`update_catalog_version.mjs` 的触发条件与危害已写入 skill 校验命令章。

### 15.14.2 契约发布面缺口的准确形状

门禁检查 7 的输入是 `apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json`（**122 paths**）中
`x-sdkwork-vendor-path-prefixes` 覆盖的 namespace。逐 namespace 枚举后：

| namespace | 契约是否发布 | 说明 |
| --- | --- | --- |
| `google` | **部分**：`cachedContents` / `files` / `:generateContent` / `:streamGenerateContent` / `:embedContent` / `:batchEmbedContents` / `:countTokens` | **未发布** `:generateImages`、`:generateVideos`、`/operations/{task_id}` |
| `nano-banana` | ✅ `POST/GET /v1/images/generations(±{task_id})` | 命名空间存在但无供应商（见 15.14.3） |
| `vidu` | ✅ 7 条（含 `text2video` / `img2video` / `reference2video` / `tasks/{id}/creations`） | 其中 4 条无 taxonomy route |
| `kling` | ✅ 4 条（`videos/avatar` / `videos/generations(±{id})` / `videos/motion-control`） | 全部已接线 |
| `suno` / `minimax` / `elevenlabs` / `volcengine` / `anthropic` / `midjourney` | ✅ 见 §15.13 | |
| `jimeng` | ❌ **完全未发布**（且不在 `x-sdkwork-vendor-path-prefixes` 里） | 分类器有 `jimeng` arm、DB 有 jimeng 供应商/账户，但没有公开契约面 |

**两个必须记住的边界**：

1. `gemini.image_generation` / `gemini.video_generation` 属于「**契约没发布、下游却已在调**」的形态
   （`sdkwork-generations` 的 `gateway.rs:699` 拼 `/google/v1beta/models/{model}:generateVideos`）。
   因为**没发布**，所以**检查 7 的输入里根本没有它们** —— 检查 7 只枚举「已发布」的 vendor-native 操作。
2. `/google/v1beta/models/{model}/operations/{task_id}`（`gateway.rs:714`
   `format!("/google/v1beta/{}", operation_name.trim_start_matches('/'))`，Google LRO 名即 `models/X/operations/Y`）
   是**三重缺口**：无 arm、taxonomy 无 route、契约未发布 ⇒ **检查 7 结构上覆盖不到**。
   这是检查 7 已知边界，需要一条**跨仓调用点扫描**才能覆盖（尚未实现）。

### 15.14.3 nano-banana 歧义的 DB 裁决

§15.13 把 nano-banana 记为「API 权威歧义」。本轮查 DB 后，**歧义已被证据收敛为一条**：

| 声明侧 | nano-banana 的存在证据 |
| --- | --- |
| passthrough 路由 | `crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs:163`（`PROVIDER_NATIVE_PASSTHROUGH_PROVIDERS`） |
| 标准路径命名空间 | 同文件 `:2148`（`is_standard_path_namespace`） |
| 入站前缀 | `crates/sdkwork-api-cloudrouter-standalone-gateway/src/main.rs:34` + `crates/sdkwork-api-cloudrouter-assembly/src/bootstrap.rs:1075`（`/nano-banana/v1`） |
| 契约 | `x-sdkwork-vendor-path-prefixes` 成员 |
| taxonomy / 种子 / 授权 | ✅ 但挂在 **`gemini`** 供应商下（`gemini.nano_banana.image_generation`） |
| **供应商 / 账户（DB）** | ❌ **不存在** |

`ai_upstream_supplier` / `ai_upstream_account` 只有 11 个供应商：
`anthropic` `elevenlabs` `gemini` `jimeng` `kling` `minimax` `openai` `openai_compatible` `suno` `vidu` `volcengine`。

⇒ **命名空间全套声明齐全，却没有供应商/账户可落**。所以「给分类器加一条 `nano-banana` arm」
在无上游账户时**依旧 fail-closed**（甚至先 50201 于账户解析）。可行方向只剩两条，都需要人裁决：

- **(i) 退役该命名空间**，把 `sdkwork-generations` 的 `dispatch_nano_banana` 改走
  `/google/v1beta/models/nano-banana:generateImages` —— 该面**已全通**（arm + taxonomy + 种子 +
  `official.gemini.full` 授权 + `crates/sdkwork-cloudrouter-edge-runtime/tests/media_routing_e2e.rs:987` 实打 Google 账户）。
- **(ii) 新建 `nano-banana` 供应商/账户 + 翻译层** —— 因为厂商原生请求**逐字转发**
  （`provider_request.rs` 不做路径翻译），而 Gemini 不接受 `/v1/images/generations`，
  所以必须真造一层翻译，不能只加 arm。

### 15.14.4 各厂商真实 `base_url`（逐字转发的判据）

`ai_upstream_supplier_endpoint`（`endpoint_code` 均为 `official-global`）：

| supplier | base_url |
| --- | --- |
| anthropic | `https://api.anthropic.com` |
| elevenlabs | `https://api.elevenlabs.io` |
| gemini | `https://generativelanguage.googleapis.com` |
| jimeng | `https://visual.volcengineapi.com` |
| kling | `https://api-beijing.klingai.com` |
| minimax | `https://api.minimax.chat` |
| openai / openai_compatible | `https://api.openai.com/v1` |
| suno | `https://api.sunoapi.org` |
| vidu | `https://api.vidu.cn` |
| volcengine | `https://ark.cn-beijing.volces.com` |

`ai_upstream_account.default_base_url` 与 `ai_upstream_supplier.default_base_url` **全为空**
⇒ 断言某路径能否打到厂商，**必须查 `ai_upstream_supplier_endpoint.base_url`**。

### 15.14.5 种子完整性探针看不见模板漂移（P1）

改动落在**种子 JSON 源**（`include_str!` 进二进制），**DB 不会自动跟随**。查库实测，
本轮修的 6 条模板在 DB 里**仍是旧值**：

| endpoint_code | DB 现值 | 种子源现值 |
| --- | --- | --- |
| `gemini.image_generation` | `/v1beta/models/{model}:predict` | `/v1beta/models/{model}:generateImages` |
| `gemini.nano_banana.image_generation` | `/v1beta/models/{model}:predict` | `/v1beta/models/nano-banana:generateImages` |
| `kling.task_query` | `/v1/videos/{taskId}` | `/v1/videos/generations/{taskId}` |
| `volcengine.image_generation` | `/v1/images/generations` | `/api/v3/images/generations` |
| `volcengine.video_generation` | `/v1/videos/generations` | `/api/v3/contents/generations/tasks` |
| `volcengine.task_query` | `/v1/tasks/{taskId}` | `/api/v3/contents/generations/tasks/{taskId}` |

**根因不是「忘了刷」，而是探针看不见**：

- `postgres_ai_routing_seed_complete`（`services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/ai_routing_seed.rs:681`，
  被 `infrastructure/sql/installer.rs:642` 调用）只做**存在性**判定 ——
  `expected_resource_codes ⊆ resource_codes`、`expected_group_codes ⊆ group_codes`、
  `expected_endpoint_codes ⊆ endpoint_codes`，再叠几个 count 断言；**不比对 `path_template` 内容**。
- ⇒ 模板漂移的 dev 库，`installation_status()` 照样返回 `Installed`，**不会**走 `UpgradeRequired` 去重播种。
- 而种子导入本身**是 upsert**：`INSERT INTO ai_api_endpoint … ON CONFLICT(tenant_id, organization_id, endpoint_code)
  DO UPDATE SET … path_template = excluded.path_template`（同文件 `:905` 附近）
  ⇒ **`pnpm db:seed` / `db:upgrade` 能把模板刷对**，只是没有任何信号提示需要刷。

**未擅自修**：把探针从「存在性」升级为「内容一致」会改变安装状态语义
（既有部署可能突然翻成 `UpgradeRequired`），属部署行为变更 ⇒ 按 `AGENTS.md` 走人工评审。

### 15.14.6 待人工裁决（不擅自改）

| # | 事项 | 为什么不能自动修 |
| --- | --- | --- |
| 1 | **nano-banana 命名空间去留**（方向 (i) 退役 vs (ii) 建供应商+翻译层） | 架构决策；两条路的产品含义不同（见 15.14.3） |
| 2 | **vidu 4 条视频动词**（`text2video` / `img2video` / `reference2video` / `tasks/{id}/creations`） | 契约已发布、`sdkwork-generations` 已在调，但 taxonomy 没有任何 vidu 视频 route ⇒ 需新增 route + 种子 + 资源组授权 + **价**（定价/产品决策） |
| 3 | **`/google/v1beta/models/{model}/operations/{task_id}`** | 三重缺口（无 arm / 无 taxonomy route / 未发布契约）；补它等于决定 Gemini LRO 轮询是否作为公开面，且需新 api code + 价 |
| 4 | **种子探针从存在性升级为内容一致** | 改安装状态语义 = 部署行为变更（见 15.14.5） |
| 5 | **`jimeng` 命名空间无公开契约面** | 是「不公开、只给内部调用」还是「漏发布」，属产品面决策 |
| 6 | **`kling.text_to_video` 契约入口 vs 厂商真路径不一致**（契约 `/kling/v1/videos/generations` vs 种子 `/v1/videos/text2video`，逐字转发 ⇒ 走契约入口会打到 Kling 的非原生路径） | 改契约 = 重生成 SDK/清单；改种子 = 声明厂商路径为别名。先要有人以官方文档裁定真值（见 15.14.8） |

### 15.14.7 门禁终态读数（第 13 轮实测）

```
node tools/check-cloudrouter-ai-routing-consistency.mjs
  path -> api_code map: classifier 29 arms, passthrough 29 arms
  seeded api codes: 56 across data/ai-routing/resources, 0 unknown to the taxonomy
  open-api contract: 122 paths, 0 outside OPEN_API_PREFIXES
  OPEN_API_PREFIXES: standalone gateway 12, bootstrap mirror 12
  passthrough: 39 arms over 30 api codes, all evaluated
  classifier: 39 arms over 30 api codes, all evaluated
  open-api vendor-native surface: 19 operation(s) routed, 28 declared unrouted
  gateway contract: 10 vendor-native namespaces, x-sdkwork-vendor-path-prefixes declares 10
  gateway contract generator VENDOR_PROVIDER_PREFIXES: 10 namespaces, 0 contract namespaces unknown
  open-api extension sync inferExternalProtocolId: 24 namespaces, 0 contract namespaces unknown
  open-api extension sync isExternalWireProtocolRoute: 12 namespaces, 0 contract namespaces unknown
  SDK runtime standardizer infer_external_protocol_id: 25 namespaces, 0 contract namespaces unknown
  generated SDKs: 2380 source files scanned, 0 prepend "/v1" to a vendor-native path

ai-routing-consistency: passed
```

`crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs` 侧改动（谓词收敛 + volcengine Ark arm）
由该 crate 的 lib 单测覆盖，与 `router-service` 侧同一份断言口径。本轮两个 crate 的编译+单测读数：

| 命令 | 读数 | 耗时 |
| --- | --- | --- |
| `cargo test -p sdkwork-cloudrouter-router-service --lib provider_native_classifier` | **10 passed / 0 failed** | 14m22s |
| `cargo test -j 1 -p sdkwork-cloudrouter-edge-runtime --lib` | **87 passed / 0 failed / 0 ignored** | 29m23s |
| `rustfmt --edition 2021 --check`（两份分类器副本） | clean | — |

⇒ 两份副本的 arm 改动**无回归**，且分类器行为被两侧单测同时钉住。

### 15.14.8 新发现的第 4 类门禁盲区（未修，先登记）

检查 4 比对的是 **分类器 arm ↔ 种子 `pathTemplate`**，**不比对「契约发布的入口路径 ↔ 种子 `pathTemplate`」**。
而厂商原生请求**逐字转发**（`provider_request.rs:226` 的 `rewrite_path_model` 只重写
Gemini 风格的 `/v1beta/models/{model}:{action}`，**对 kling/vidu/volcengine 等没有任何路径翻译**），
于是「契约发布路径」与「种子声明的厂商真路径」**可以合法地不相等，却谁都不报错**：

| api code | 种子 `pathTemplate`（厂商真路径口径） | 契约发布入口 | 一致？ |
| --- | --- | --- | --- |
| `kling.text_to_video` | `/v1/videos/text2video` | `POST /kling/v1/videos/generations` | **✗ 不一致** |
| `kling.image_to_video` | `/v1/videos/image2video` | 未发布 | — |
| `kling.image_generation` | `/v1/images/generations` | 未发布 | — |
| `kling.task_query` | `/v1/videos/generations/{taskId}` | `GET /kling/v1/videos/generations/{task_id}` | ✅（本轮对齐） |
| `kling.avatar` | `/v1/videos/avatar` | `POST /kling/v1/videos/avatar` | ✅ |
| `kling.motion_control` | `/v1/videos/motion-control` | `POST /kling/v1/videos/motion-control` | ✅ |
| `volcengine.video_generation` | `/api/v3/contents/generations/tasks` | `POST /volcengine/api/v3/contents/generations/tasks` | ✅（本轮对齐） |

`kling.task_query` 本轮被改掉的原值 `/v1/videos/{taskId}` 是**两边都不属于**的死模板
（既非 Kling 原生名，也非契约发布路径）—— 这是改动成立的原因。
但 `kling.text_to_video` 的这处不一致**是既存的**：契约发布的是 SDKWork 自己的 RESTful 别名
`/v1/videos/generations`，而种子声明厂商真路径是 `/v1/videos/text2video`；逐字转发下，
走契约入口的请求会打到 `https://api-beijing.klingai.com/v1/videos/generations`。

**未擅自修**（改哪一侧都有产品/契约含义），**也未新增门禁**（会立刻翻红且需先裁定真值）。
登记为 15.14.6 第 6 项，并保留一条可决断的复核方式：以 Kling 官方 API 文档为准，
或在 e2e 夹具里让上游对 `/v1/videos/generations` 返回 404、对 `/v1/videos/text2video` 返回 200，
用现有 `media_provider_native_db_e2e` 形态把真值钉下来。

---

## 15.15 六类能力的「计价可达性」审计（图片 / 视频 / 音频 / 音乐 / 数字人）

§15.13–15.14 把「路由是否可达」查清了：arm → taxonomy → 种子 → 授权四环。本节补最后一环 **④ 价**。
结论是：**路由通了不等于能跑通，计价侧仍有一批结构性断点**，且它们全在
「**带 `tier_code` 条件的费率选不中档位**」这一个机制上。

### 15.15.1 定价资源键：四段回退（`pricing_identity.rs`）

一个请求按什么资源计价，由 `resolve_pricing_key` 四段决定（`pricing_identity.rs`）：

| 序 | 条件 | 键 | `PricingKeySource` |
| --- | --- | --- | --- |
| ① | `kind == Model` 且载荷预置了 catalog key | 预置键 | `PresetCatalogKey` |
| ② | **`catalog.find_model(route_key).is_some()`** ⇒ 路由键本身就是目录资源 | `route_key` | `RouteKey` |
| ③ | 请求携带模型名且按目录名唯一解析出键 | 模型键 | `RequestedModel` |
| ④ | 预置键存在 | 预置键 | `PresetCatalogKey` |
| ⑤ | 全落空 | 退化为 `route_key` —— **交给计价预检失败并给诊断** | `Unresolved` |

而 `find_model` 的实现是 `models_by_key.get(model.trim())`（`infrastructure/sql/catalog.rs:1305`）——
**按目录键查**。实测把 30 个厂商原生路由键（`kling.avatar` `gemini.image_generation`
`elevenlabs.text_to_speech` …）拿去 `ai_model.catalog_key` 里比对：**零命中**。
⇒ 厂商原生路由**只能**靠第 ③ 段（请求里带模型名）拿到价；带不上模型名的路由**必然 `price_not_found`**。

### 15.15.2 档位（`tier_code`）选择：api code 末段 → 4 值白名单

价表把视频/图片费率**条件化在 `tier_code` 维度**上，而档位由
`decide_video_pricing_tier`（`infrastructure/sql/catalog.rs:326`）选出，第一步就是：

```rust
fn video_generation_mode_for_api_code(api_code: &str) -> Option<&'static str> {
    const MODES: &[&str] = &[
        "text_to_video", "image_to_video", "reference_to_video", "multi_shot",
    ];
    let suffix = api_code.rsplit('.').next()?.trim();   // ← 只取 api code 的「末段」
    MODES.iter().copied().find(|mode| *mode == suffix)
}
```

**只认 4 个值，且只从 api code 末段推导。** 拿 taxonomy 里全部 `capability = Video` 的 12 条路由比对：

| api_code | 末段 | ∈ MODES |
| --- | --- | --- |
| `kling.text_to_video` | `text_to_video` | ✅ |
| `kling.image_to_video` | `image_to_video` | ✅ |
| `gemini.video_generation` | `video_generation` | ❌ |
| `jimeng.video_generation` | `video_generation` | ❌ |
| `volcengine.video_generation` | `video_generation` | ❌ |
| `kling.avatar` | `avatar` | ❌ |
| `kling.motion_control` | `motion_control` | ❌ |
| `vidu.motion_sync` | `motion_sync` | ❌ |
| `vidu.start_end_to_video` | `start_end_to_video` | ❌ |
| `openai.video` / `openai.videos` / `openai.videos.generations` | `video` / `videos` / `generations` | ❌ |

**12 条里只有 2 条能推导出 generation mode。** 而 `upstream_route_selector.rs:1036` 的注释
（不是本报告写的，是代码原作者写的）已经把这个后果写死了：

> 档位按计量单位分别解析：目录把它声明在 `ai_model_video_profile` 里，把它的报价写在
> `pricing_rate` 的 `tier_code` 条件里，两者取交集才是可用档位。**缺这一维度时解析器会把带条件的
> 候选全部过滤干净，报"有模型无价格"——而价格其实在库里。**

⇒ 失败模式是 **`该模型无价格` / `price_not_found`**，而**价其实就在库里**。

### 15.15.3 能力 × 厂商 计价可达性总表

判据：① 该能力有无路由（§15.13）；② 其价表的计费单位是否带 `tier_code` 条件；
③ 该 api code 能否推导 generation mode；④ 目录 profile 是否声明得出该档位。

| 能力 | 厂商 / 路由 | 计费单位带 tier？ | 能推导 mode？ | 结论 |
| --- | --- | --- | --- | --- |
| 音频 | `elevenlabs.text_to_speech` / `sound_generation` | **否** | 不适用 | ✅ 可计价 |
| 音频 | `volcengine.speech` | **否**（bytedance 的 tier 只在 llm/image/video 上） | 不适用 | ✅ |
| 音频 | `gemini.live` | 否（google 只有 `llm_cache_read_token` 带 tier） | 不适用 | ✅ |
| 音乐 | `suno.music_generation` | **否** | 不适用 | ✅ |
| 音乐 | `minimax.music_generation` | **否**（minimax 的 tier 只在 video 上） | 不适用 | ✅ |
| 视频 | `gemini.video_generation` | **否** | 否 | ✅（tier 不适用） |
| 视频 | `kling.text_to_video` / `image_to_video` | **是**（kuaishou `video_output_second` 62 条） | **是** | ⚠️ 可计价，但见 15.15.4 的档位歧义 |
| 视频 | `volcengine.video_generation` | **是**（bytedance 25 条） | ❌ | ❌ **选不中档** |
| 视频 | `jimeng.video_generation` | **是**（同 bytedance） | ❌ | ❌ **选不中档** |
| 视频 | `vidu.start_end_to_video` | **是**（vidu 62 条） | ❌ | ❌ **选不中档** |
| 图片 | `gemini.image_generation` / `nano_banana` | **否**（google `image_result` 不带 tier） | 不适用 | ✅ |
| 图片 | `volcengine.image_generation` | 部分（`seedream-4/5-lite` 不带；`seedream-5-0-pro` **带**） | ❌ | ⚠️ pro 版**选不中档** |
| 图片 | `kling.image_generation` | **是**（kuaishou `image_result` 8 条，`kling-image-o1` 的 `res_1k_2k`） | ❌ | ❌ **选不中档** |
| 图片 | `vidu.reference_to_image` | — | ❌ | ❌ vidu 价表**根本没有 `image_result`**（只有 sfx/video） |
| **数字人** | `kling.avatar` | — | ❌（`avatar`） | ❌ **三重缺失**（见 15.15.4） |

### 15.15.4 数字人专项：三重缺失

> **⚠️ 本节的判据已被第 17 轮复核部分推翻，读之前先看本文 **§15.17**。**
> 复核结论：① 环②③ 其实**都在**（本节当时用错 grep 路径 `crates/sdkwork-cloudrouter-router-service/`，
> 实际在 `services/` 下，见 §15.17.1）；② 定价键不是 `kling.avatar` 而是 **`kling-ai-avatar-v2`**；
> ③ 「档位选不中」是**描述性的**，不会单独导致失败（§15.17.3）。下表其余三行（价本、授权、e2e 伪装）
> 仍成立，授权那一行已在第 17 轮修掉。

| 环 | 证据 | 结果 |
| --- | --- | --- |
| 模型 / 目录资源键 | `ai_model` 里没有任何 `kling.avatar` / 头像模型；`sdkwork-models` 全仓 grep `kling.avatar` **零命中** | 定价键解析第 ①②③ 段**全落空** |
| 价本 | DB 全库 `pricing_rate.product_code ilike '%avatar%'` 或 `operation_code ilike '%avatar%'` → **零行**；kuaishou 只有 `models.kuaishou.{image,sfx,video}` 三类产品 | 无价可引 |
| 档位 | `video_generation_mode_for_api_code("kling.avatar")` → `avatar` ∉ MODES → `ApiCodeIsNotAGenerationMode` | 即便有 tier 费率也选不中 |
| 授权 | `api.kling.avatar` **只在** `official-provider-groups.json`（`admin-api-groups.json` / `relay-provider-groups.json` 都没有） | 视账号所在分组而定 |

**并且这条能力被 e2e 伪装成"通"**：`crates/sdkwork-cloudrouter-edge-runtime/tests/avatar_motion_routing_e2e.rs:227-290`
用 `AiModel::new(...).with_catalog_key("kling.avatar")` + `ModelPrice::new_for_catalog_key("kling.avatar", …)`
**自建了目录与价**，所以测试绿。这正是本 skill 开头那条纪律的现实版：
**自建内存目录的 e2e 结构上无法暴露「目录里没有该资源」**。

官方口径也印证了它不是遗漏而是**设计缺口**：`sdkwork-models/.workbuddy/reports/kuaishou--cn.md:61` 记载
数字人（Avatar）属官方「Model-independent Capabilities」，只有单价、无 `model id`，
因此**有意不建模型条目**；而 §15.15.1 的键解析要求它必须作为**目录资源**存在才能计价 —— 两者直接冲突。

**唯一真实的数字人模型**是 `runway/gwm1_avatars`（`models/runway/global/`，价本 meter `api_request`），
但 ① taxonomy 里**没有任何 `runway.*` 路由**；② 它走 `/v1/videos`（`openai.videos`）时
api code 末段 `videos` ∉ MODES；③ 它的费率档位是 `per_6s_block`，profile 却声明 `res_720p, dur_5s, dur_10s`
（`validate-catalog` 已报 `tier.unreachable`）⇒ **依然选不中档**。

### 15.15.5 目录侧权威读数：63 条诊断 / 15 个模型

`sdkwork-models` 自带的 `tools/validate-catalog.mjs` **已经能发现这个问题**，但它只发 **warning**、exit=0：

```
total diagnostics = 63
Counter({'model_video_profile.pricing.tier.unreachable': 48,
         'model_video_profile.pricing.tier.ambiguous': 15})
```

| 模型 | unreachable | ambiguous |
| --- | --- | --- |
| `kuaishou/kling-v3-omni` | **8** | 0 |
| `kuaishou/kling-video-o1` | **8** | 0 |
| `minimax/hailuo-2` | **8** | 0 |
| `minimax/hailuo-02` | 4 | 0 |
| `vidu/viduq3` | 4 | 0 |
| `runway/veo3` | 4 | 0 |
| `runway/gemini_omni_flash` | 3 | 0 |
| `black_forest_labs/flux-3` | 2 | 0 |
| `luma_ai/ray-3` | 2 | 0 |
| `runway/h3_max` | 2 | 0 |
| `runway/ruby` | 1 | 0 |
| `runway/gwm1_avatars` | 1 | 0 |
| `minimax/MiniMax-H3` | 1 | 0 |
| `kuaishou/kling-v2-6` | 0 | 8 |
| `kuaishou/kling-v3` | 0 | 7 |

诊断原文把根因讲得很直白 —— **价表的维度空间大于 profile 的表达空间**：

> `kuaishou/kling-v3-omni` bills `noref_audio_1080p, noref_audio_4k, noref_audio_720p,
> noref_silent_1080p, …, ref_silent_1080p, …` but this profile declares `res_1080p`;
> **the price book splits this tier by a dimension the profile cannot express**

`kling-v3-omni` 的价格需要 `ref/noref × silent/audio × resolution` **三个**维度，
而 profile 只能写 `generationMode` + `resolutionTierCode` + `durationTierCode` + `pricingTierCodes`。
⇒ 48 个档位结构上选不中。

而 `kling-v3` / `kling-v2-6` 的 15 条 `ambiguous` 是另一种风险：
同一分辨率同时有 `res_1080p`（0.8）与 `audio_res_1080p`（1.2），
profile 未声明 `pricingTierCodes`，裁决取首个被定价的候选 ⇒ **一律落到较便宜的无声档**。
即 **有声请求按无声价计费（少收）**，且没有任何告警会拦住它。

### 15.15.6 `tier_code` 条件在各厂商计费单位上的分布

| 厂商 | 带 tier 的计费单位 |
| --- | --- |
| `kuaishou` | `image_result`、`video_output_second`（**62**） |
| `bytedance` | `image_result`、`video_output_second`（**25**）、`llm_*` |
| `vidu` | `sfx_result`、`video_result`、`video_output_second`（**60**，**价表无 `image_result`**） |
| `minimax` | `video_result`（22）、`video_output_second` |
| `runway` | `image_result`（40）、`video_input_second`、`video_output_second` |
| `luma_ai` | `video_output_second` |
| `black_forest_labs` | `image_megapixel`、`video_output_second` |
| `google` | **仅** `llm_cache_read_token` ⇒ 图片/视频/音频**都不受档位机制影响** |
| `elevenlabs` / `suno` | **无** ⇒ 音频/音乐不受影响 |

⇒ 受影响面明确：**图片（kuaishou/bytedance-pro/runway）、视频（kuaishou/bytedance/vidu/minimax/runway/luma/bfl）**；
**音频、音乐、以及全部 Google 系媒体路径不受此机制影响**。

### 15.15.7 结论与修法向量（属人工评审）

| # | 断点 | 修法向量 | 属性 |
| --- | --- | --- | --- |
| 1 | `kling.avatar` 数字人无任何计价键 | (i) 在 sdkwork-models 把 `kling.avatar` 作为**目录内 API 资源**发布（带官方单价），与 `pricing_identity` 第 ② 段的语义对齐；或 (ii) 改走 `runway/gwm1_avatars` 并把 profile 档位声明补对 | 目录建模 + 定价语义 |
| 2 | `MODES` 白名单只有 4 值且只取 api code 末段 | 扩白名单（`video_generation`/`avatar`/`motion_control`/…）**或**改为按路由显式声明 mode。**只扩一个值不管用**，因为档位选择还要求 profile 声明得出该 mode | cloudrouter 结构性限制 |
| 3 | 48 个档位不可达（profile 表达力 < 价表维度） | 给 profile 补 `pricingTierCodes`（`kling-3.0-turbo` 已是正确范例：`pricingTierCodes: ["audio_res_1080p"]`）；维度组合有歧义的（`ref/noref`、`audio/silent`）需先定产品口径 | 目录数据 + 可能需扩 profile schema |
| 4 | 15 条 `ambiguous` ⇒ 有声/高码率请求按低价计费 | 给 `kling-v3` / `kling-v2-6` 显式声明 `pricingTierCodes` | **计费正确性（少收）** |
| 5 | `validate-catalog` 对此只 warning、exit=0 | 决定这些诊断是否升为 error | CI 门禁策略 |

**统一的根因**：`tier_code` 这个维度**跨仓两端各写一半** —— 云侧写「api code 末段 → mode」，
目录侧写「profile → 档位码」，两边都不完整时，**价在库里却选不中**，报出来的是
`该模型无价格`。这解释了为什么 §15.13 的四环全绿、e2e 全绿，能力仍然跑不通。

## 15.16 profile 分辨率覆盖补全 + 覆盖度门禁（第 16 轮落地）

§15.15 把 63 条诊断定成「价表维度 > profile 表达力」并**全部登记为人工评审**。本轮换一个
方向问同一个问题：**除了「profile 声明了价本没有的档位」，还有没有反过来的缺口？**
结论是有，而且它是能直接判死的功能性缺口。

### 15.16.1 断点：请求带的分辨率没有 profile 声明 → 预检 fail-closed

`decide_video_pricing_tier`（`catalog.rs:326`）的顺序是**先按分辨率筛 profile，再找档位码**：

```rust
let ordered = match requested {                       // requested = 请求 body 的 /resolution
    Some(requested) => mode_tiers.into_iter()
        .filter(|tier| tier.matches_resolution(requested))   // declared == requested || requested.contains(declared)
        .collect::<Vec<_>>(),
    None => mode_tiers,
};
for tier in &ordered {                                // ordered 为空 ⇒ 循环体一次都不进
    if let Some(code) = tier.tier_codes.iter().find(|code| priced.contains(*code)) { … }
}
decision.gap = Some(VideoPricingTierGap::DeclaredTierNotPriced { … })
```

而 `requested_resolution`（`pricing_identity.rs:64`）取的是**客户端请求体的
`/resolution`、`/size`、`/output/size`**：

```rust
["/resolution", "/size", "/output/size"].iter().find_map(|pointer| body.pointer(pointer))
```

⇒ 请求写 `"resolution": "1080p"`，而该 generationMode 的 profile 只声明了 `720p` 时，
`ordered` 是空集，档位判定直接落到 `DeclaredTierNotPriced`，预检拿不到 `tier_code`、
按条件费率全部匹配不上 → **在派发之前就被拒**（§15.15.2 的 fail-closed 路径）。
价就在库里，但**任何**该分辨率的请求都发不出去。

**这是与 §15.15 相反方向的缺口**：`validate-catalog` 原有的 `tier.unreachable` 只检查
「profile 声明的档位是否在价本里」，**不检查「价本里的档位是否被某个 profile 声明」**，
所以这条线上一个诊断都不发（63 条里全是 unreachable/ambiguous，没有一条覆盖度）。

### 15.16.2 覆盖度实测

`seed-video-profiles.mjs` 的 `vendorDurationTemplate` 每个厂商分支**硬编码一个分辨率**
（kuaishou→1080p、bytedance/minimax/runway/vidu→720p/768p），只在 `dur_5s && dur_10s`
的早分支里才用价本档位。于是「价本定价了 480p/720p/1080p/4k，profile 只声明 720p」。

修前（按 `res_<token>` 形态的档位码与 profile 声明集求差）：

| 分类 | model-region 数 | 说明 |
| --- | --- | --- |
| 未覆盖价本已定价的分辨率 | **49** | 其中 **31** 个缺失分辨率在价本里有 plain `res_<token>` 码 ⇒ 可机械补齐 |
| 同上、但档位码带厂商维度 | 18 | 价本只有 `res_768p_dur_6s` / `audio` / `over_4mp` / `per_6s_block` / `noref_*` / `ref_*`，用分辨率单独命名不出来 ⇒ 不能补 |
| 完全覆盖 | 1 | `bytedance/doubao-seedance-2-5-260623`（唯一被手工展开过多分辨率的模型，本轮把它变成规范） |

修后：

- **新增 126 个 profile，落 30 个 model-video-profiles 文件**（`--write` 前 dry-run 报 31 文件/128 profile，
  差额来自 15.16.3 的数据错）。
- `sync-video-profile-resolutions.mjs --check` → `every priced resolution has a profile`（exit 0）。
- 残留「可覆盖却没覆盖」= **0**；剩下的全是上面那 18 个表达力缺口。

补法（先例即 `doubao-seedance-2-5-260623`）：同一 generationMode 下按分辨率克隆
`profileCode`/`displayName`/`resolution`/`resolutionTierCode`/`wireParameters.resolution`，
`isDefault` 一律置 false（**不夺走既有默认档**），`sortOrder` 按 mode 分组连续重排。

### 15.16.3 顺带修掉的目录数据错：`minimax/global/MiniMax-H3`

该文件的 `t2v_range_2k` profile **自己内部就矛盾**：

| 字段 | 修前 | 修后 |
| --- | --- | --- |
| `profileCode` / `displayName` / `wireParameters.resolution` | `t2v_range_2k` / `… · 2K` / `"2K"` | 不变 |
| `resolution` | `"1080p"` ❌ | `"2k"` |
| `resolutionTierCode` | `"res_1080p"` ❌ | `"res_2k"` |

而该模型价本只有 `res_768p`(0.08) / `res_2k`(0.13)，**没有 `res_1080p`** ⇒ 修前这条 profile
永远命中不到（正是 §15.15.5 里 `MiniMax-H3` 那条 unreachable）。修后它成为可达档，
该模型由 1 条 unreachable 降为 0，且 2K 请求第一次能按 0.13 计费。

### 15.16.4 新增门禁：`model_video_profile.pricing.tier.undeclared_resolution`（error）

`validate-catalog.mjs` 新增一条 per-file 规则：**价本输出计量单位上的每个 plain
`res_<token>` 档位，必须至少被该模型的一个 profile 声明**；否则报 error，并直接给出修法。

- 只取输出计量单位（`video_output_second` / `video_result`），不取 `video_input_second`
  ——输入侧档位命名的是输入面（`input_res_720p`），不该决定目录对外提供哪些分辨率。
- `res_4k_native`、`res_480p_720p` 不算 plain（多一段带厂商区分），仍归 `tier.unreachable` 管。
- 它是 §15.15.7 第 5 行「是否把诊断升为 error」的一个受控落地：**只升这一类**，
  因为它是可机械修复的缺口；`unreachable` / `ambiguous` 仍保持 warning。

**门禁有效性是实测过的**（不是「写完就跑绿」）：临时删掉
`models/vidu/cn/model-video-profiles/viduq3-pro-fast.json` 里刚补的 `i2v_range_1080p`，
校验器即 `ok:false / exit 1`：

> `vidu/viduq3-pro-fast can be billed at 1080p but no profile declares that resolution;
> a request naming one of them matches no profile and is refused before dispatch.
> Run \`node tools/sync-video-profile-resolutions.mjs --write\` to add them.`

再跑补全工具 → 只补回这 1 条，且与试验前**字节一致**（`diff` 为空）⇒ 工具幂等且确定性。
补完复验 `ok:true / exit 0`。

> ⚠️ **踩坑记录（值得记档）**：这条规则第一版写成 `const PLAIN_RESOLUTION_TIER_CODE = /^res_[^_]+$/;`
> —— **正则没有捕获组**，于是 `match[1]` 恒为 `undefined`，两个集合都变成 `{undefined}`，
> 差集恒为空，**门禁静默永不触发**（`ok:true` 假绿）。是「故意造违例」那一步把它逼出来的；
> 若只跑绿就收工，会留下一条假门禁。同名常量在 `tools/sync-video-profile-resolutions.mjs`
> 里写的是 `/^res_([^_]+)$/`（带括号），所以工具一直是对的。

### 15.16.5 门禁终态读数（第 16 轮实测）

| 门禁 | 结果 |
| --- | --- |
| `tools/migrate-pricing-v2.mjs` | `Would migrate 0 rates in 0 pricing files` |
| `tools/build-index.mjs --check` | `index is current` |
| `tools/validate-catalog.mjs` | **`ok: true`，exit 0，error = 0**；warning 77 = unreachable 47 + ambiguous 30 |
| `tools/catalog-audit.mjs` | `ok: true`，errors 0 / warnings 0 |
| `tools/release-catalog.mjs --check` | `release 2026.09.17.1 is current` |
| `tools/freshness-report.mjs --as-of-catalog-generated-at` | `ok`，warnings `[]` |
| `tools/generate-mainstream-agent-model-catalog.mjs --check` | 绿 |
| `tools/generate-vendor-model-architecture-doc.mjs --check` | `docs are current` |
| `tools/models_openapi_export.mjs --check` | 绿 |
| `tools/materialize-models-openapi.mjs --check` | 绿 |
| `tests/contract/models-openapi-contract.test.mjs` | passed |
| `tools/sync-video-profile-resolutions.mjs --check` | `every priced resolution has a profile` |
| cloudrouter `tools/check-cloudrouter-ai-routing-consistency.mjs` | `ai-routing-consistency: passed` |

**12/12 绿 + cloudrouter 消费侧 1/1 绿。**

### 15.16.6 取舍与未做（需人工裁决）

1. **`unreachable` 47 → 47、`ambiguous` 15 → 30 是预期内的**。新增的 17 条 ambiguous **只落在
   `kuaishou/kling-v2-6` 与 `kuaishou/kling-v3`**（v3 的 720p/4k、v2-6 的 720p）——这两个型号
   1080p 的 audio/motion 变体歧义**本来就在目录里、本来就已登记为 warning**，本轮只是把它
   扩展到同型号的其它分辨率。取舍理由：**不补 = 该分辨率的请求在派发前被拒（可见失败）；
   补了 = 按该型号的标准档（无声）计费（有声请求少收，已被 warning 标出）**。目录既有惯例
   就是「声明标准档、变体交给运行时」，且 `offpeak_*`/`ref_*` 这类运行时同样选不中的费率
   也一直躺在价本里，故按惯例一致处理。**根治仍需运行时从请求读 audio/motion 维度**
   （§15.15.7 第 2/4 行，未动）。
2. **18 个表达力缺口未动**（`kling-v3-omni`、`kling-video-o1`、`kling-3.0-turbo`、
   `luma_ai/ray-3.2`、`minimax/hailuo-02`、`hailuo-2.3(-fast)`、`runway/veo3.1(_fast)`、
   `runway/gemini_omni_flash`、`runway/ruby`、`runway/h3_max`、`runway/gwm1_avatars`、
   `black_forest_labs/flux-3`、`vidu/viduq3(-mix)`）。
   它们的档位码带维度（`res_X_dur_Y` 同时编码分辨率与时长、`audio`/`no_audio`、
   `over_4mp`、`per_6s_block`、`noref_*`/`ref_*`），**用分辨率单独命名不出来**；
   硬填一个就是猜价格。
3. **`res_X_dur_Y` 类**（luma / minimax hailuo）还暴露一个 schema 限制：profile 只能声明
   `resolution` + `durationTierCode(s)`，而 `decide_video_pricing_tier` **只按分辨率筛**、
   不按时长筛 ⇒ 即便把 `res_1080p_dur_10s`/`_5s` 都列进 `pricingTierCodes`，解析器也只会
   取列表里**第一个命中的**（永远 5s），于是 10s 请求少收。⇒ 属**运行时/目录 schema 联合缺口**。
4. **版本号不动**：本轮改的是「已有价本 → profile 声明」的派生数据，**没有重验任何厂商**。
   升版会连带要求 `sources/vendor-sources.json` / `official-model-snapshots.json` /
   `official-verification-policy.json` 三个**证据文件**同步 `catalogVersion`（即断言"此时重新核过厂商"），
   而这不是事实。故沿用进行中批次的做法：原地重建 `releases/2026.09.17.1.json`
   （`indexSha256` 随内容更新）。若组织口径要求「每次内容变更一个 patch 号」，则应改用
   `tools/stamp-catalog-evidence.mjs --catalog-version 2026.09.17.2` 一并重盖证据。
5. `kling.avatar` 数字人（§15.15.4 三重缺失）与本轮正交。**→ 第 17 轮已复核并修正判据，见 §15.17**。

## 15.17 数字人专项复核 + 资源组覆盖门禁（第 17 轮落地）

### 15.17.1 §15.15.4 的「三重缺失」判据要修正：四环里三环都在

§15.15.4 当时读出的"三重缺失"里，**只有定价那一环是真的**。复核后逐环取证：

| 环 | 权威位置 | 第 15 轮判据 | 第 17 轮实测 |
| --- | --- | --- | --- |
| ① 分类臂 | `crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs:1857` | 未查 | ✅ `"kling" if path == "/v1/videos/avatar" => "kling.avatar"`（classifier 侧同形，29 arms 两侧一致） |
| ② 路由 taxonomy | `services/sdkwork-cloudrouter-router-service/src/application/ai_route_taxonomy.rs:556` | 「taxonomy 无 route」 | ✅ **在**：`media_task("kling.avatar", …, RoutingCapability::Video, BillingMeter::VideoResult, "video_task")`（`kling.motion_control` 在 :562） |
| ③ 种子 `api_endpoint` | `data/ai-routing/resources/vendor-native-resources.json:196` | 未查 | ✅ `api.kling.avatar` / POST `/v1/videos/avatar` / `capabilities: ["video","audio"]` |
| ④ 资源组授权 | `data/ai-routing/resource-groups/*.json` | 「只在 official-provider-groups.json」 | ✅ 判据正确，**已修**（§15.17.4） |
| ⑤ 定价（价本 + 声明） | `ai_model` / `pricing_rate` | 「零行」 | ✅ 判据正确：**真缺**（§15.17.3） |
| ⑥ 档位 | `catalog.rs:201` `MODES` | `avatar` ∉ MODES | ✅ 判据正确，但**只在 ⑤ 具备时才成为阻塞**（见 §15.17.3 末段） |

**为什么第 15 轮会误判②**：当时用的 grep 路径是
`crates/sdkwork-cloudrouter-router-service/src/`，而该 crate 实际在 **`services/`** 下
（`crates/` 下只有 edge-runtime / assembly / provider-adapter-registry 等）。路径不存在 ⇒ grep 恒为空 ⇒
被读成"taxonomy 里没有"。这是一个**纯取证错误**，已记入方法论纪律（skill）。

同时坐实：`kling.avatar` 的**定价键不是 `kling.avatar`**，而是
**`kling-ai-avatar-v2`** —— 见 §15.17.2 的派发链路。§15.15.4 用 `kling.avatar` 去 `ai_model` 里找，
方向本身也偏了一层。

### 15.17.2 官方证据（本轮 CDP 实取，非推断）

**(a) 我们的契约与官方文档不一致（路径 + 请求体）**

| 面向 | 我们（`apis/open-api/cloudrouter/cloudrouter-open-api.openapi.json`） | 官方（`klingai.com/document-api/api/video/avatar`，2026-09-17 CDP 渲染实取） |
| --- | --- | --- |
| 路径 | `POST /kling/v1/videos/avatar` | `POST /v1/videos/avatar/image2video` |
| 必填 | `human_image` | `image` |
| 音频 | `voice_mode`(`tts`/`audio`) + `text` + `audio_url` + `voice_id` + `voice_language` | `audio_id` \| `sound_file`（二选一，互斥） |
| 其它 | `model_name` / `prompt` / `callback_url` | `prompt` / `mode`(`std`\|`pro`) / `watermark_info` / `callback_url` / `external_task_id` |
| `model_name` | 文档示例 `kling-ai-avatar-v2` | **官方请求体里没有 `model_name`**（能力地图把数字人列为「与模型版本无关的能力 / 不区分模型版本」） |

`/v1/videos/motion-control` 同理：官方 `POST` 体是 `contents[]`(`prompt`/`image`/`video`/`element`) +
`settings` + `character_orientation` + `audio` + `resolution`，我们是 `{model_name, image, video}`。

**(b) 真实调用方用的是 `kling/kling-ai-avatar-v2`**

```
sdkwork-generations/crates/sdkwork-generations-provider-adapter/src/video.rs:1073
    let mut command = command("kling/kling-ai-avatar-v2");
```
`video.rs` 的 `kling_avatar_video_pends_and_maps_tts_voice_mode` 与
`sdkwork-agents/.../generationsService.ts:198`（`avatar` → `POST /generations/videos/avatar`）都印证：
平台侧**已经**把数字人当成一个具名模型在派发，模型 id 是 `kling-ai-avatar-v2`，
而 `sdkwork-models` 里**没有**这个条目（`grep -rn "kling-ai-avatar" sdkwork-models/` 零命中）。

**(c) 官方单价（`.workbuddy/raw/kuaishou--{cn,global}__rendered-pricing-base-video.txt`，逐字）**

表头 `模型 计费方式 功能 价格（720P） 价格（1080P） 价格（4K）`：

```
CN : 数字人      按秒收费  数字人  0.4积分（¥0.4）/秒  0.8积分（¥0.8）/秒  -
GL : Avatar     Per second Avatar  0.4 Units ($0.056) /s  0.8 Units ($0.112) /s  -
```

即按秒计费、两档、且**无 4K 档**——与 `video_output_second` + `res_720p`/`res_1080p` 的口径天然对齐。

### 15.17.3 定价为什么还不能补：缺的不是"价"，是"选档维度"

链路已全部验证到"只差最后一跳"：

```
请求 model_name=kling-ai-avatar-v2
  → pricing_identity.rs:168  catalog.find_model("kling.avatar") → None（目录无此键）
  → pricing_identity.rs:172  requested_model = "kling-ai-avatar-v2" → 目录唯一解析 → 命中（前提：目录有条目）
  → catalog.rs:430            priced = (catalog_key, video_output_second) 的 tier_code 集合
  → catalog.rs:345            video_generation_mode_for_api_code("kling.avatar")
                              → 末段 "avatar" ∉ MODES{text_to_video,image_to_video,reference_to_video,multi_shot}
                              → gap = ApiCodeIsNotAGenerationMode → tier_code = None
  → 费率带 tier_code 条件 ⇒ 无维度可匹配 ⇒ price_not_found（gap 只作诊断附注，见 upstream_route_selector.rs:1090）
```

**关键取证**：`ApiCodeIsNotAGenerationMode` 自己**不导致失败**——
`upstream_route_selector.rs:1067-1070` 只在价格真正解析成功时返回 `Ok`，gap 仅被拼进失败文案
（`:1090`、`:1103`）。所以「`avatar` 不在 MODES」是**描述的**，真正拦人的是**费率带 `tier_code` 条件却没有档位可给**。

要把两档区分开，请求侧必须给出一个**运行时可读的档位选择器**。官方给的旋钮是 `mode: std|pro`，
但：

1. 官方**没有文档化** `std ↔ 720P` / `pro ↔ 1080P`（价表按分辨率列，请求体只有 mode；能力地图该行为「不区分模型版本」）；
2. 运行时只读 `/resolution`、`/size`、`/output/size`（`pricing_identity.rs:64`）与
   `/quality`、`/output/quality`（`pricing.rs:628`），**都不含 `/mode`**。

⇒ **把 `pro` 记成 ¥0.8 需要"std=720P / pro=1080P"这个未经文档确认的映射**。
按本项目纪律（§15.15.7、§15.16.6：「硬填一个就是猜价格」），**本轮不猜、不落价**，
只登记并给出行之有效的两条修法（§15.17.7）。

> **⚠️ 本节被第 18 轮部分推翻，读之前先看 §15.18**：
> ① "运行时只读 `/quality`、`/output/quality`，不含 `/mode`"**仍成立**，但修法不是新造维度而是给
> `quality` 加 `/mode` 指针（§15.18.4 第 2 条）；② 下一条"需手写两条 `quality` 条件费率"**不成立**——
> v2 迁移器会重写 `conditions`，必须写 `quality` **字段**（§15.18.4 第 1 条）；
> ③ "官方没有文档化 `std ↔ 720P`"仍成立，但第 18 轮把四个独立来源的一致性坐实后**已落价**，
> 并把该推断显式登记在模型 `description` 与 §15.18.2。

### 15.17.4 已修：资源组「名不副实」（第④环）+ 新检查 8

资源组是链路的最后一跳：路由解析出 api code 之后，**账号只有在某个所属组里被授予该资源才走得到**。
三个账families 各用一套组：`official.*.full`（官方直连账号）、`api.<vendor>.all` /
`api.<vendor>.<modality>`（admin-API 账号）、`relay.*`（中转账号）。

**缺陷**：没有任何检查保证"组的名字与它的内容一致"，于是漂移了。实测（脚本按种子推导期望集）：

| 组 | 名字承诺 | 实测 | 缺 |
| --- | --- | --- | --- |
| `api.kling.all` | "All Kling API resources" | 6 个种子 `api_endpoint` 里只授了 4 个 | `api.kling.avatar`、`api.kling.motion_control` |
| `api.kling.video` | "Kling video generation API resources" | 4 个同模态资源里只授了 2 个 | 同上（两者 `modalityCode` 都是 `video`） |
| `api.vidu.video` | "Vidu video generation API resources" | 2 个同模态资源里只授了 1 个 | `api.vidu.motion_sync` |

后果：**admin-API 账号拿到了 Kling 除数字人与动作控制以外的全部视频 API**——恰好是产品主推的两个能力，
且失败文案既不提组也不提资源（`50201 no upstream account routes are configured`）。
`official.*.full` 侧全部完整（8/8 OK），`relay.*` 不含 kling，故不受影响。

**修法**：`admin-api-groups.json` 三处补齐（`api.kling.all`、`api.kling.video`、`api.vidu.video`），
顺序与种子 / `official.kling.full` 对齐。

**新增检查 8（`tools/check-cloudrouter-ai-routing-consistency.mjs`）**：把上面这条不变式常驻化。
期望集**由种子推导**而不是在脚本里声明，所以检查本身不会漂移：

* `<family>.<vendor>.all` / `.full` ⇒ 必须授全该 vendor 的每个种子 `api_endpoint`；
* `<family>.<vendor>.<modality>` ⇒ 必须授全该 vendor 中 `modalityCode` 等于该模态的每个种子 `api_endpoint`；
* 三段组码里 scope 段既不等于已播种 vendor、也不等于已播种模态的（`relay.openai_compatible.media`、
  `api.openai.embeddings`、`api.google.all` 等）判为**非 vendor/模态作用域**，计为 skipped 而不猜。

**为什么既有测试没抓到**（`tests/test_ai_routing_seed_bundle_standard.py`，11/11 全绿）：

* `test_official_and_relay_resource_groups_cover_vendor_native_api_codes`（:100）断言的是
  **"所有 vendor-native 资源 ⊆ 全部 `official*` 组 items 的并集"**——是**族级并集**，不是**逐组**。
  所以只要任意一个 `official.*.full` 收了它就算过；它管不到 `api.*` 组，也管不到"某组自己的名字"。
  （这也解释了为什么 official 侧 8/8 完整：正是这条在守。）
* `test_admin_api_groups_include_all_codex_api_resources`（:132）确实看 `admin-api-groups.json`，
  但**只对 `api.openai.codex` 一个硬编码资源**做断言。

⇒ admin 侧「`<vendor>.all` / `<vendor>.<modality>` 是否授全同名范围」**此前无人检查**，
新检查 8 补的正是这个盲区，且期望集由种子推导、按组逐个比对。

**三角验证（造违例 → 确认红 → 还原 → 确认绿）**，三个用例全 PASS：

| 用例 | baseline | 造违例 | 还原字节一致 | 复原 |
| --- | --- | --- | --- | --- |
| 摘掉 `api.kling.avatar`（`.all` 分支） | green | red，且文案点名 `api.kling.all` | ✔ | green |
| 摘掉 `api.kling.avatar`（`.video` 模态分支） | green | red，且文案点名 `api.kling.video` + `modalityCode "video"` | ✔ | green |
| 摘掉 `api.vidu.motion_sync`（`official.vidu.full`） | green | red，且文案点名 `official.vidu.full` | ✔ | green |

> **踩坑（与第 16 轮同一类假绿）**：第一版三角验证把 `api.kling.video` 的**最后**一个条目连同
> 其后的 `}` 一起删掉，留下了悬空逗号 ⇒ 文件变非法 JSON ⇒ 门禁以"JSON 解析失败"退出 1。
> 那时**新检查根本没跑**，却被读成"门禁会响"。判据是那一轮的 note 从
> `19 vendor/modality-scoped group(s)` 掉到 `9`——期望集凭空少了一半。
> 修法：变异脚本加**守卫**（变异后先 `JSON.parse`，不合法就直接 abort），并要求红文案**点名该组**，
> 不接受"只看退出码"。

### 15.17.5 顺带坐实的两个运行时/测试缺口（登记，未动）

1. **OpenAI 兼容视频面的 api code 末段不是生成模式**。`openai_classifier.rs:520/528/545` 对
   `/v1/videos` 产出 `openai.videos`，`/v1/videos/{id}` 产出 `openai.video_wait`/`openai.video`；
   而唯一的模式映射是 `catalog.rs:201` 的**末段白名单**（4 值）。`videos`/`video` 都不在白名单里
   ⇒ 凡**费率带 `tier_code` 条件**的模型，经 OpenAI 兼容视频面进入时都取不到档 ⇒ `price_not_found`，
   且诊断只把 gap 拼在后面。`runway/gwm1_avatars`（目录里唯一有真实模型 id 的数字人）正是其中之一：
   它走 `/v1/videos` 时同时踩中"末段不是模式"与"档位 `per_6s_block` ≠ profile 声明的 `res_720p`"。
   **这是既存缺口，不是本轮引入**；判定它是否影响线上取用，要看 `sdkwork-generations` 的
   provider adapter 实际驱动哪一面（检查 7 的注释记录 image adapter 走 vendor-native 路径）。
2. **e2e 自建目录与价，因此对真实缺口零覆盖**。
   `crates/sdkwork-cloudrouter-edge-runtime/tests/avatar_motion_routing_e2e.rs:227-290` 用
   `AiModel::new(...).with_catalog_key("kling.avatar")` + `ModelPrice::new_for_catalog_key("kling.avatar", …)`
   现场造出一个目录与价本，`:412` 还断言上游收到的**路径**
   （`calls[0].path == "/v1/videos/avatar"`）与 body（`human_image`/`voice_mode` 原样转发）。
   结论：**该 e2e 绿只证明"给定一个含 `kling.avatar` 的目录、转发链路是通的"，不证明真实目录里有它**；
   且它把 §15.17.2(a) 的路径/字段漂移**锁成了期望值**——将来核查真实 vendor 契约时，这条断言会先亮红灯。

### 15.17.6 门禁终态读数（第 17 轮实测）

```
tools/check-cloudrouter-ai-routing-consistency.mjs
  path -> api_code map: classifier 29 arms, passthrough 29 arms
  seeded api codes: 56 across data/ai-routing/resources, 0 unknown to the taxonomy
  open-api contract: 122 paths, 0 outside OPEN_API_PREFIXES
  OPEN_API_PREFIXES: standalone gateway 12, bootstrap mirror 12
  passthrough: 39 arms over 30 api codes, all evaluated
  classifier: 39 arms over 30 api codes, all evaluated
  open-api vendor-native surface: 19 operation(s) routed, 28 declared unrouted
  gateway contract: 10 vendor-native namespaces, x-sdkwork-vendor-path-prefixes declares 10
  ... (4 个 registry 全 0 unknown)
  generated SDKs: 2380 source files scanned, 0 prepend "/v1" to a vendor-native path
  resource groups: 19 vendor/modality-scoped group(s) compared against the seeds, 14 not vendor- or modality-scoped
ai-routing-consistency: passed
```

**本轮未改 `sdkwork-models`**（§15.17.3 说明了原因），故 models 侧 13 项门禁读数与 §15.16.5 一致，未重跑。

### 15.17.7 待人工裁决

1. **数字人定价（二选一，都只差一处改动）**
   * **A. 运行时补"厂商 mode → 目录档位"**：给 `pricing.rs:625-642` 的 `quality` 指针加 `/mode`
     （1 行；全库**没有任何费率**用 `quality` 条件，故对其余厂商是惰性的），
     目录侧落 `kuaishou/{cn,global}/kling-ai-avatar-v2` 的两条 `quality` 条件费率
     （`std`=0.4/0.056、`pro`=0.8/0.112）。**前提**：接受 `std`/`pro` 就是两档的语义标签
     （官方未文档化其与 720P/1080P 的对应）。
   * **B. 先修厂商定义**：把网关契约的 `KlingAvatarCreateRequest` 与路径对齐到官方
     （`/v1/videos/avatar/image2video`、`image`/`audio_id`/`sound_file`/`prompt`/`mode`），
     再按官方 `mode` 落价。工作量大（改 `tools/cloudrouter_gateway_openapi_generator.py`
     + 重生成契约与九语言 SDK），但**同时消掉 §15.17.2(a) 的漂移**。
2. **`KlingAvatarCreateRequest` 的字段集是否要保留**：现有字段（`human_image`/`voice_mode`/`text`/
   `audio_url`/`voice_id`/`voice_language`）与官方现行文档不符，但可能对应可灵早期数字人 v1 接口。
   是否仍被厂商接受**未验证**，故不擅自删改。
3. **`avatar_motion_routing_e2e.rs` 的期望值**：它把当前路径/字段锁成断言。若采纳 1-B，
   需同步改；若不采纳，建议把它标注为"转发链路测试"而非"契约测试"，避免误导。

> **第 18 轮更新**：第 1 条候选 A **已落地**，且落地时发现它原先的描述在机制上不成立
> （手写的 `quality` 条件会被 v2 迁移器静默抹掉）。第 2、3 条仍待裁决。详见 **§15.18**。

---

## 15.18 数字人落价：从"证据不足"到"三级验证通过"（第 18 轮落地）

### 15.18.1 一句话结论

数字人（`kling-ai-avatar-v2`）此前在目录里**完全不存在**：没有模型条目、没有价、没有 profile。
本轮把它按官方证据补全，并把"官方默认档 ↔ `std`、高价档 ↔ `pro`"这条**唯一推断**显式登记。
链路现在是：请求 `model_name=kling-ai-avatar-v2` + `mode` → `quality` 维度 → 官方两档价。

### 15.18.2 判据是怎么被解开的

第 17 轮卡在「官方未文档化 `std`/`pro` 与 720P/1080P 的对应」。本轮把这个问题**问到底**：

| 取证 | 结论 |
| --- | --- |
| 官方数字人文档全文（CDP 实取，`textLen: 5827`） | `allParamNames` 仅 9 个：`image / audio_id / sound_file / prompt / mode / watermark_info / callback_url / external_task_id / task_id`。**`mentions720: false`、`resolutionMentions: []`** ⇒ 全文不出现 `720`/`1080`/`resolution` |
| 官方**能力地图**页（`/document-api/guides/capability-map/video`） | 表格行 `数字人` / `对口型` 的值是「**不区分模型版本**」；同一表格的「分辨率」行是**按模型**列（720P、1080P、4K），**不含 mode 维度** ⇒ 官方正文里确实**不存在** mode↔分辨率对应 |
| 官方文档对 `mode` 的描述 | `std：标准模式，基础模式，性价比高` / `pro：专家模式（高品质）…生成视频质量更佳`；`mode` **可选，默认 `std`** |
| 四个独立来源（三个二手站 + 官方列序） | 一致：`std` = 720p 标准档（便宜档）、`pro` = 1080p 高品质档（贵档） |

⇒ **官方正文缺这条对应，但官方自己的表格结构 + 四个独立来源一致指向同一映射**，
且它与「默认值 `std`」+「`std` 被描述为性价比高」+「价表按单价升序」三者单调一致。
本轮据此落价，并**把这条推断写进模型 `description` 与本文**，而不是当成已文档化的事实。

另一个副产品是官方**时长**约束（首轮探针没取到，本轮取到原文）：

> 仅支持使用 30 天内生成的、时长不短于 2 秒且不超过 300 秒的音频
> 仅支持使用时长不短于 2 秒且不长于 300 秒的音频

⇒ profile 的 `minDurationSeconds: 2` / `maxDurationSeconds: 300` 有官方出处，不是估的。

### 15.18.3 落地清单（逐文件）

**`sdkwork-models`**（新增 6 文件 / 改 4 文件）

| 文件 | 动作 | 要点 |
| --- | --- | --- |
| `models/kuaishou/{cn,global}/models/kling-ai-avatar-v2.json` | 新增 | `familyCode: kling-avatar`、`routingState: enabled`、`shelfState: listed`、`capabilities: ["video"]`、`inputModalities: [text,image,audio]` |
| `models/kuaishou/{cn,global}/pricing/kling-ai-avatar-v2.json` | 新增 | 每条各 **2 条费率**，`video_output_second`、`unitSize: 1`、`priority: 100`：① **无条件** ¥0.4 / $0.056（= 官方默认档 `std`）② **`quality eq pro`** ¥0.8 / $0.112 |
| `models/kuaishou/{cn,global}/model-video-profiles/kling-ai-avatar-v2.json` | 新增 | 见 §15.18.4；`generationMode: image_to_video`、`durationPolicy: continuous`、2~300s、`resolution: 720p`，**不声明任何档位码** |
| `models/kuaishou/{cn,global}/families.json` | 改 | 新增 family `kling-avatar`（`familyType: video`，`defaultModel: kling-ai-avatar-v2`，`sortOrder: 50`） |
| `sources/vendor-sources.json` | 改 | 登记 avatar 文档 URL 到两区 `additionalUrls`；`kling-ai-avatar-v2` 进 `supportedModels`（**不是** `requiredModels`，理由见下）；补 `notes` |
| `tools/migrate-pricing-v2.mjs` | 改 | 字段→维度映射表**追加** `["quality","quality"]`（置于末位，保证既有费率生成的 `conditions` 字节与 `rateHash` 不变） |
| `tools/audit-pricing-consistency.py` | 改 | 同一映射，保持"忠实移植"承诺（`:177` 的 migrator drift check 会比对） |
| `crates/sdkwork-models-catalog-service/src/application/price_service_tests.rs` | 改 | 新增 1 测试：**同等优先级下"有条件费率"压过"无条件费率"**（§15.18.6） |

**`sdkwork-cloudrouter`**（改 1 文件）

| 文件 | 动作 | 要点 |
| --- | --- | --- |
| `services/sdkwork-cloudrouter-router-service/src/application/invocation/pricing.rs` | 改 | `quality` 的指针列表由 `["/quality","/output/quality"]` 扩为 `+ "/mode"`；新增 1 测试（§15.18.6） |

重生成物（按门禁要求）：`models/index.json`、`releases/2026.09.17.1.json`、`docs/vendor-model-architecture.md`。

**为什么 `supportedModels` 而不是 `requiredModels`**：`catalog-audit.mjs:436-445` 对 `requiredModels`
还会要求"官方快照里有它"（`mustHaveOfficialSnapshotIds = requiredModels ∪ enabledModelIds ∪ defaultModelIds`）。
数字人在官方能力地图里**明确「不区分模型版本」**、不占模型版本位，官方模型清单里不会有它；
放进 `requiredModels` 会在厂商升级为 `official_verified` 时埋一颗"快照缺模型"的雷。
`supportedModels` 只校验"存在"，与该条目的真实性质一致（同区的 `kling-v3-0-preview` 也是这个形态）。

### 15.18.4 三处机制反转：第 17 轮设想的写法其实不成立

第 17 轮候选 A 写的是"目录侧落两条 `quality` 条件费率"。实测发现**三条硬约束**必须绕：

1. **`migrate-pricing-v2.mjs:130` 会重写 `conditions`**：
   `price.conditions = conditions(price);` —— 条件只从 6 个**字段**推导
   （`tierCode`/`mediaDirection`/`mediaType`/`inputType`/`outputType`/（本轮新增）`quality`）。
   ⇒ **手写 `conditions` 会被静默抹掉**，且 `--check` 模式因为 `JSON.stringify(price) !== before`
   直接退出 1（`models:check:pricing-v2` 是 `_sdkwork:check` 的一环）。
   所以正确写法是在费率上写 `"quality": "pro"` **字段**，让迁移器生成条件。
2. **不能用新维度名 `mode`**。`tools/audit-pricing-consistency.py:223-224` 有 `KNOWN_DIMS` 白名单，
   不在表内即报 `condition dimension 'mode' not evaluable at runtime`；`quality` **在表内且全库 0 条费率在用**
   ⇒ 用 `quality` 既过白名单，又对全部 1258 条既有费率**惰性**（见 §15.18.6 的实测）。
3. **视频模型必须有 profile 文件**。`validate-catalog.mjs:1011`：
   `primaryCapability === "video" && !profileModelIds.has(modelId)` → error。
   §17 提到的"6 个视频模型没有 profile"先例**不适用**——那 6 个的 `primaryCapability` 不是 `video`
   （`vidu-s1` 是 `streaming`）。而 profile schema 的 `resolution` 与 `durationPolicy` 是**必填**
   （`additionalProperties: false`），所以必须填：`resolution: "720p"` 取"官方默认档 `std` 的分辨率"
   这一最小可解释值，**并且刻意不声明 `resolutionTierCode` / `pricingTierCodes`**——
   声明了就等于为"该模型按 `res_720p` 计费"这个错误命题背书。
   附带好处：本模型无 `tierCode` 条件的费率 ⇒ `validate-catalog` 的
   `tier.unreachable` / `undeclared_resolution` 两条规则（都以"有 `tierCode` 的费率"为前提，
   见 `:715-722`、`:855`）对本模型静默。

另有两处一致性规则在落地时被踩到，记录以免下次重犯：

- **`displayName` 跨区必须一致**（`modelIdentityDifferences` 比 19 个字段，含 `displayName`），
  故 CN 不能叫「Kling 数字人」，统一为 `Kling Avatar`（与既有 kuaishou 全英文命名惯例一致）。
- **`model.source.sourceUrl` 必须在 `sources/vendor-sources.json` 登记**
  （`catalog-audit.mjs:454` 报 `model.source.unapproved`；`:466` 对 pricing 同样约束）。
  未登记会直接把 `catalog-audit` 从 exit 0 打成 exit 1。

### 15.18.5 为什么默认档要留一条**无条件**费率

`mode` 官方是**可选、默认 `std`**。而运行时的维度提取是"请求体有 `/mode` 才有 `quality`"
（`PricingRateCondition::matches` 对 `eq` 用 `actual.is_some_and(...)`，缺维度**不匹配**）。
若两条费率都带条件（`std` / `pro`），那么**省略 `mode` 的请求会一条都匹配不上 → `price_not_found` → 调用被拦**。

⇒ 费率设计为「**无条件**（默认档价）+ **`quality eq pro`**（高价档）」：

| 请求 | 匹配到的费率 | 结果 |
| --- | --- | --- |
| 无 `mode`（我方现状） | 无条件那条 | ¥0.4/秒 = 官方默认档 ✓ |
| `mode: "std"` | 无条件那条（`pro` 那条条件不成立） | ¥0.4/秒 ✓ |
| `mode: "pro"` | 两条都匹配 → **按 specificity（条件数）取 `pro` 那条** | ¥0.8/秒 ✓ |

顺带确认了我方流量确实落在默认档：`sdkwork-generations` 的
`crates/sdkwork-generations-provider-adapter/src/video.rs` 断言请求只带
`human_image`/`voice_mode`/`text`/`voice_id`，**不带 `mode`**；网关契约
`KlingAvatarCreateRequest` 也没有 `mode` 字段。
但该契约的 `additionalProperties` 是 `ProviderJsonValue`（**故意开放透传**），
所以调用方**可以**透传 `mode: "pro"`——这正是必须把 `pro` 档也落价的原因。

### 15.18.6 三级验证

| 级 | 断言什么 | 怎么验 | 结果 |
| --- | --- | --- | --- |
| ① 维度提取（cloudrouter） | `/mode` 进得了 `quality`；省略 `mode` 时 `quality` **不被默认值填上**（否则两条费率都不匹配） | 新增 `pricing.rs::tests::kling_avatar_mode_reaches_the_quality_dimension` | `ok`（1 passed / 510 filtered） |
| ② 费率裁决（models） | **同等 priority** 下，条件数多的费率压过无条件费率；无 `quality` 维度时回落到无条件那条 | 新增 `price_service_tests::a_conditioned_rate_outranks_an_unconditional_one_at_equal_priority`（同 meter、双 100 priority、只差条件数） | `ok`（1 passed / 80 filtered） |
| ③ 目录契约（models 全门禁） | 条件被正确生成、`rateHash` 自洽、index/release 计数跟上、无 unreachable 报错 | 12 项 node 门禁 + `audit-pricing-consistency.py` | 全 exit 0（见 §15.18.7） |

②这条测试之所以必要：既有 `resolves_condition_specific_rate_by_vendor_api_and_model` 让**优先级**不同
（10 vs 100），因此无法区分"是按优先级赢的"还是"是按 specificity 赢的"。
本模型两条费率**都是 100**，只有条件数不同，所以必须单独钉住 specificity 优先这一序
（`pricing_resolver.rs::select_rate` 的排序：`rate_variant` → **specificity desc** → priority asc → …；
且 `same_rate_rank` 只在 four-way 全等时报 ambiguous，此处 specificity 不同故不 ambiguous）。
**若这条序被改，数字人的 `pro` 会静默按半价结算**（价还是解析成功的，链路上不会有别的信号）。

### 15.18.7 门禁终态读数（第 18 轮实测）

```
sdkwork-models（12 项，全 exit 0）
  tools/migrate-pricing-v2.mjs                                  exit=0   （新费率 conditions/rateHash 自洽）
  tools/build-index.mjs --check                                 exit=0
  tools/validate-catalog.mjs                                    ok=true  0 error
  tools/freshness-report.mjs --max-age-policy ...               exit=0
  tools/catalog-audit.mjs                                       ok=true  0 error（1 warning：suno，既存）
  tools/release-catalog.mjs --check                             exit=0
  tools/generate-mainstream-agent-model-catalog.mjs --check      exit=0
  tools/generate-vendor-model-architecture-doc.mjs --check       exit=0
  tools/models_openapi_export.mjs --check                       exit=0
  tools/materialize-models-openapi.mjs --check                  exit=0
  tests/contract/models-openapi-contract.test.mjs               exit=0
  tools/audit-pricing-consistency.py                            exit=0
  （另：cargo test 新增用例 1 passed；cloudrouter 侧新增用例 1 passed）

validate-catalog 读数对比（本轮前后）
  warning  model_video_profile.pricing.tier.ambiguous     x30   ← 未变
  warning  model_video_profile.pricing.tier.unreachable   x47   ← 未变
  releases/2026.09.17.1.json: validation.issueCount = 77       ← 与上两行之和一致，即本轮新增 0 条
  kuaishou/cn + kuaishou/global: modelCount 11 → 12

sdkwork-cloudrouter
  tools/check-cloudrouter-ai-routing-consistency.mjs            ai-routing-consistency: passed
    resource groups: 19 vendor/modality-scoped group(s) compared against the seeds, 14 not ...（与 §15.17.6 一致）
  python -m unittest tests.test_ai_routing_seed_bundle_standard  11/11 OK
```

### 15.18.8 仍未做 / 待裁决（承接 §15.17.7）

1. **网关契约与官方文档的字段/路径漂移（原 §15.17.7 第 2 条）**：仍未动。
   `KlingAvatarCreateRequest` 是 `human_image`/`voice_mode`/`text`/`audio_url`/`voice_id`，
   官方现行是 `image`/`audio_id`/`sound_file`/`prompt`/`mode`，路径也应含 `/image2video`。
   **本轮的选择是不擅改**：因为该契约可能对应可灵早期数字人 v1 接口而仍被接受（未验证），
   且改它要重生成契约与九语言 SDK。**但请注意**：本轮落的是"按 `mode` 计价"，
   若厂商其实只认 `mode`、而我们发的是 `voice_mode`，则 `mode` 会走默认档 `std`——
   与我们的定价一致，不会错价；但 `pro` 档在改契约前**只有靠调用方透传 `mode` 才用得上**。
2. **`avatar_motion_routing_e2e.rs` 的期望值（原第 3 条）**：仍未动，理由同上。
3. **§15.17.5 的两个既存缺口**（OpenAI 兼容视频面 api code 末段 ∉ MODES；e2e 自建目录）：
   仍未动，与数字人这条线正交。

### 15.18.9 本轮的教训

1. **"只差一处改动"的估计必须用机制证明**，不能读着文档里的一句话就当结论。
   第 17 轮把候选 A 描述成"加 1 行指针 + 目录落两条条件费率"，
   实测撞上"迁移器会重写 `conditions`"这条反转——**如果直接手写费率提交，CI 会在
   `models:check:pricing-v2` 变红，而本地看起来一切正常**。
2. **白名单是"能表达什么"的权威**。`audit-pricing-consistency.py` 的 `KNOWN_DIMS`
   与 cloudrouter 的指针表是同一套词汇，先在白名单里找可用维度（`quality` 恰好在表内且零使用），
   比自造维度名安全得多。
3. **一条 12 项门禁的外围约束（profile 必需、displayName 跨区一致、sourceUrl 需登记）
   只有在真正加条目时才会暴露**——它们都不在"我改的那几个文件"的视野里。
   加新模型的正确顺序是：先加最小条目 → 跑满门禁 → 按报错逐条补，而不是先写全再验。

---

## 15.19 第 19 轮：目录侧审计工具的收口（两处永久假阳性 + 一处生成物漂移）

### 15.19.1 一句话结论

`_sdkwork:check` 全链已是 12/12 绿，但**目录侧还有一个不在门禁链上、却写着"权威"字样的审计工具**：
`tools/audit-pricing-consistency.py`。它报 **492 项**，逐条归并后只有 **1 项**是需要人看一眼的信号类别，
其余 **491 项是结构与口径问题**（19 项与权威门禁判据冲突的假阳性 + 472 项已文档化的产品决策类）。
本轮把两处假阳性修掉、把一处误导性读数归零，并把一个**陈旧 12 倍的生成物**归位；
目录侧门禁读数**一项都没变**（`issueCount` 仍 77），因为改的是"读数工具"，不是"被读的数据"。

### 15.19.2 归并：492 项到底是什么

| 类别 | 条数 | 判定 |
|---|---|---|
| `tier_code condition on a non-time_window rate (unreachable without a request tier)` | 472 | **已文档化的产品决策类**（`docs/pricing-unreachable-rates.md` 明写 "nothing here is auto-applied"，且需要"新增运行时维度或合并档位"才能修）⇒ 不动 |
| `model file has no matching pricing file` | 19 | **假阳性**：19 个全部是 `routingState: catalog_only` + `shelfState: hidden`（见 §15.19.4） |
| `regionCount mismatch: directory=2, index=34` | 1 | **假阳性**：两个不同量在做比较（见 §15.19.3） |

判据来源：`grep -oP '^\s{4}\K.*' audit.txt \| sed 's/[0-9]\+/N/g' \| sort \| uniq -c`（按消息模板归并）。
**这一步必须做**——直接读 `TOTAL ISSUES: 492` 会得出"目录有 492 个缺陷"的错误结论，
而它其实是一个提醒人"这个工具的口径需要复核"的读数。

### 15.19.3 假阳性 A：`regionCount` 是拿 A 的定义去比 B 的数字

`tools/audit-pricing-consistency.py`（改动前）：

```python
actual_regions = len(set(p.split("/")[1] for p in pricing_files))   # 不同 region 名字个数
if actual_regions != index.get("regionCount"):                       # index 里是 vendor×region 目录数
    issue("index.json", f"regionCount mismatch: ...")
```

`p.split("/")[1]` 取到的是 `alibaba/cn/pricing/x.json` 里的 `cn` ⇒ 集合大小恒为 **2**（只有 `cn`/`global`）。
而 `index.json` 的 `regionCount` 由 `tools/catalog-lib.mjs:280` 生成：`regionCount: vendors.length`，
`vendors` 是**每个 (vendorCode, regionCode) 目录一条**的扁平数组 ⇒ 现值 **34**（= `vendorCount` 25 + 部分 vendor 的双区）。
权威口径在 `collectRegionalCatalogDirectories()`（`catalog-lib.mjs:62-80`）：**含 `vendor.json` 的 `<vendor>/<region>` 目录**，
实测 `find models -mindepth 3 -maxdepth 3 -name vendor.json | wc -l` = **34** ⇒ 与 index 一致。

⇒ **这条检查永远无法变绿**（2 ≠ 34），是典型的"假红"：与 §15.16 记录的"假绿"（正则无捕获组 ⇒ 门禁永不触发）
互为镜像，危害相同——**它训练读者忽略整份报告**。

修法：按权威定义重算，`count(<vendor>/<region> 且含 vendor.json)`。改后该行消失，且**不是被静音**——
下一节用造违例证明它对真实的 `regionCount` 漂移仍会报红。

### 15.19.4 假阳性 B：model↔pricing 配对没有状态感知，且与权威门禁判据冲突

审计脚本原来的判据是纯路径比对：`models/<v>/<r>/models/X.json` 必须有对应的 `pricing/X.json`。
但**权威门禁 `validate-catalog.mjs:426-438` 早就是状态感知的**：

```js
if ((model.routingState === "enabled" || model.shelfState === "listed" || model.releaseStage === "active")
    && !pricedModelIds.has(model.modelId)) {
  issues.push(issue("model.pricing.required", ..., "is enabled, listed, or active and must have a pricing file"));
}
```

`validate-catalog` 对此 **0 error** ⇒ 说明"不可路由、不上架"的目录条目**按设计不需要价**。
实测 19 个全部命中豁免条件（`routingState: catalog_only`）：

```
black_forest_labs/global/models/flux-2-dev.json          pixverse/cn/models/pixverse-v5.6-t2v.json
pixverse/global/models/pixverse-c1.json                  runway/global/models/{gemini_image3.1_flash,magnific_video_upscaler_creative}.json
stability_ai/global/models/sdxl-1-0.json                 suno/global/models/suno-v6{,-wild,-mini}.json
vidu/{cn,global}/models/viduq3-{ad,drama}.json           xiaomi/{cn,global}/models/mimo-v2.5-tts{,-voiceclone,-voicedesign}.json
```

⇒ 这 19 项是**判据写弱了**造成的永久假阳性，不是目录缺口。
修法：让审计脚本**镜像权威门禁的同一条谓词**（同一个三元条件），
并把这 19 条改为报告末尾的 `NOTE:` 段落——**信号不丢，只是不再冒充缺陷**。

**造违例证明两处判据现在一致**（这是本轮最重要的一次验证）：
把 `models/xiaomi/cn/models/mimo-v2.5-tts.json` 的 `routingState` 从 `catalog_only` 改成 `enabled`：

| 工具 | 改前 | 改后 |
|---|---|---|
| `audit-pricing-consistency.py` | 472 | **474**（多出 `model is enabled/listed/active but has no matching pricing file`） |
| `validate-catalog.mjs` | 0 error | **`model.pricing.required`** |

两边对同一违例**同时报红** ⇒ 镜像成立。恢复后 `sha256sum -c` 逐字节一致（模型文件 + `index.json`），读数回到 472。

### 15.19.5 生成物漂移：`docs/pricing-unreachable-rates.md` 陈旧 12 倍，且数据源归属写错

这个文档头部写着 `Generated by tools/audit-pricing-consistency.py`，但**真实生成器是
`tools/report-unreachable-pricing.py`**（`audit-pricing-consistency.py` 全文没有写文件的代码，
且没有任何 npm script / 门禁引用它）。归属错误还**硬编码在生成器里**（`report-unreachable-pricing.py:59`）
⇒ 重生成一次就会把错误再写回去，只在文档里手改是无效的。

更严重的是**内容陈旧**：

| 读数 | 提交版 | 重生成 |
|---|---|---|
| 行数 | 56 | 481 |
| 数据行 | 47 | 472 |
| `dimension` 分布 | 37 `tier_code` + 10 `media_direction` | 472 `tier_code`（`media_direction` 0 条） |
| 归属 | 错误的工具名 | 正确工具名 |

全库实测：**费率 1262 条**；条件维度分布 `{tier_code: 520, context_tokens: 60, media_type: 31, input_type: 8, output_type: 3, quality: 2}`；
其中 `tier_code` 落在**非 `time_window`** 费率上的正是 **472** 条（与审计脚本独立得出同一数字，互为交叉验证）。
**`media_direction` 条件现为 0 条** ⇒ 提交版那 10 行对应的条件已从目录中删除，是死数据。

顺带确认了一件事：`quality` 条件全库正好 **2 条**，就是 §15.18 落的那两条数字人费率
⇒ 反证了 §15.18 的核心论证"给 `quality` 指针补 `/mode` 是可证明惰性的"（改动前该维度零使用）。

修法：① 生成器里改正归属；② 重生成（47 → 472 行是**陈旧**的消除，不是新增信号）；
③ 给生成器加 `--check`（见 §15.19.6）让这种陈旧以后能被发现。

### 15.19.6 CRLF 陷阱：Python 默认文本写会在 Windows 上产出 CRLF

加 `--check` 时发现：提交版是 **LF**（56 bare LF / 0 CRLF），而 `python tools/report-unreachable-pricing.py`
重生成出来是 **CRLF**（481 CRLF / 0 bare LF）。原因是 Python 文本模式写入默认 `newline=None`
⇒ 把 `\n` 翻译成 `os.linesep`（Windows 上 `\r\n`）。

后果：这个生成物**每次重生成都会产生全文件 diff**，而且换到 Linux 上又变 LF ⇒ 跨平台不稳定，
`--check` 在两边都"通过"却产出不同字节，是最难查的一类漂移。

修法：写入固定 `newline="\n"`；比对侧保留默认换行处理（容忍工作树被 autocrlf 转成 CRLF，
只对内容判真伪）。改后连续两次重生成 sha256 一致（`e41cb2b319fc4dbeb7afed1a8e0dc33f3439f24a1725d4a49f4fa8c0646e9dc8`）⇒ 幂等且确定性。

### 15.19.7 三次造违例往返（新判据一律"先破坏、看它响、再恢复、看它绿"）

| # | 违例 | 期望 | 实测 |
|---|---|---|---|
| 1 | `routingState` 改 `enabled` | 审计 +1 且与 `validate-catalog` 一起报红 | 472 → 474，`model.pricing.required` 同时出现 ✅ |
| 2 | `index.regionCount` 改 2 | `regionCount mismatch: directory=34, index=2` | 报出，且 `directory` 用的是修正后的正确口径 ✅ |
| 3 | 往报告尾部追加一行 | `--check` 退出 1 | `drift docs/pricing-unreachable-rates.md` / `exit=1`；恢复后 `exit=0` ✅ |

三次都做了**恢复后字节/读数一致性**核对（`sha256sum -c` OK，审计回到 472，`--check` 回到 current）。

### 15.19.8 门禁终态读数（第 19 轮实测，全绿）

| 门禁 | 结果 |
|---|---|
| `verify-repo.mjs --root .`（`_sdkwork:check` 首步） | exit 0 |
| `migrate-pricing-v2.mjs` | exit 0 / `Would migrate 0 rates in 0 pricing files` |
| `build-index.mjs --check` | exit 0 / `index is current` |
| `validate-catalog.mjs` | exit 0 / `ok: true`，0 error |
| `catalog-audit.mjs` | exit 0 / 0 error |
| `release-catalog.mjs --check` | exit 0 / `2026.09.17.1 is current` |
| `models_openapi_export.mjs --check` / `materialize-models-openapi.mjs --check` | exit 0 |
| `models-openapi-contract.test.mjs` | exit 0 / passed |
| `check-api-response-envelope.mjs --workspace .` | exit 0 |
| `freshness-report` / `generate-mainstream-agent-model-catalog --check` / `generate-vendor-model-architecture-doc --check` / `sync-video-profile-resolutions --check` | 全部 exit 0 |

**关键读数**：`releases/2026.09.17.1.json` 的 `validation.issueCount` 仍为 **77**（30 ambiguous + 47 unreachable，
均为 video-profile ↔ pricing 口径，与本轮无关）；`index.json`：`modelCount 425 / pricingFileCount 406 /
regionCount 34 / vendorCount 25`；审计读数 **492 → 472**（-19 假阳性，-1 假阳性，其余不变）。
⇒ **本轮对目录数据零改动**，只改读数工具与一个陈旧生成物。

### 15.19.9 仍未做 / 待裁决

1. **没把 `report-unreachable-pricing.py --check` 接进 `_sdkwork:check`**。
   本仓门禁链**全是 Node**（`package.json` 的 `_sdkwork:*` 里没有任何 `python` 调用），
   接一个 Python 步骤会引入新的运行时依赖，CI 是否保证有 `python` 我无法在本环境证明。
   ⇒ 按 `AGENTS.md` 的 "surface instead of guessing"：**登记为待裁决**。
   已加 `models:audit:pricing` / `models:report:unreachable` / `models:check:unreachable-report`
   三个 npm 入口，让这两个 Python 工具至少**可被发现**（此前无任何入口）。
2. **472 条不可达费率仍是产品决策**：需要"新增运行时维度"或"合并档位"，本轮沿用
   `docs/pricing-unreachable-rates.md` 的既有结论，不做自动收敛。
3. 承接 §15.18.8：网关契约与官方数字人面（`image`/`audio_id`/`sound_file`/`prompt`/`mode` + `/image2video` 路径）
   仍未对齐；`avatar_motion_routing_e2e.rs` 仍把漂移值锁成期望值。

### 15.19.10 本轮的教训

1. **"门禁全绿"与"读数工具可信"是两件事**。目录侧 12 项门禁全绿的同时，
   一个不在链上的审计工具报着 492 项、其中 491 项是口径问题。**先归并消息模板再读总数**，
   否则总数会把"工具口径要复核"误报成"数据有 492 个缺陷"。
2. **检查项必须能通过**。永远贴不住红的检查（`2 ≠ 34`）和永远响不了的检查（假绿）危害相同：
   前者训练人忽略报告，后者制造虚假安全感。**新写/修改判据时，必须问"它在什么情况下会绿"**。
3. **同一事实只能有一套判据**。`model.pricing.required` 在 `validate-catalog.mjs` 里是状态感知的，
   在审计脚本里是无状态的 ⇒ 冲突必然表现为"一个 0 error、另一个报 19 项"。
   发现这种冲突时，**修弱的那一侧去镜像强的那一侧**，而不是给强的那侧加豁免。
4. **生成物的头部也是事实**。"Generated by X" 写错（X 根本不是生成器）会被下一次重生成复现，
   所以**必须改生成器，不能只改产物**。
5. **生成物必须固定行尾**。Python 文本模式写在 Windows 出 CRLF，会让"内容没变"的生成物
   每次重生成都产生全文件 diff，并让 `--check` 在跨平台时给出自相矛盾的结论。
   判据：连续两次重生成 sha256 相同。
6. **改了工具就要重算历史读数**。修完假阳性后审计从 492 降到 472，这个**差值本身是证据**
   （-19 来自判据修正、-1 来自口径修正），要写进文档，否则下一个人看到数字变了会以为数据丢了。


## 15.20 第 20 轮：默认分组官方账号初始化的两个缺陷（环境变量名错配 + 完整性判据盲区）

**需求**：确保默认分组中建立初始化官方账号配置，默认分组里必须存在每个 vendor 的官方账号，
账号信息 / apikey 可以伪造，保证能够支持调用到对应的 api，
并确保「账号路由 → 计费 → 最终 vendor api 调用」完整流程可跑通。

### 15.20.1 结论

**账号、分组、成员、凭据、资源绑定五者本来就已齐备**，供应链上游此前就已实现
（`DEFAULT_VENDOR_UPSTREAM_ACCOUNTS` 11 个 vendor、衍生 26 个 (vendor, modality) 分组、
`default-group` 持有 11 成员 / 12 项资源组授权）。真正的断点是**两个隐藏缺陷叠加**，
两者的症状都不是「缺配置」，而是「配置在但全部不生效」：

| # | 缺陷 | 直接后果 | 表面症状 |
|---|---|---|---|
| ① | **环境变量名错配**：installer 只读 `SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT`，开发脚本只写 `SDKWORK_CLOUDROUTER_INSTALL_ENVIRONMENT` | 回落到 `DEFAULT_INSTALL_ENVIRONMENT = "production"`，11 个 vendor 官方账号**全部以 `status = 0` 禁用落地** | 全链路 `50201 no upstream account routes are configured` |
| ② | **完整性判据盲区**：`postgres_ai_routing_seed_complete` 只看资源/分组/端点骨架，从不检查账号状态 | 缺陷①的库永远自报 `Installed`，`ensure` 直接短路，**再 seed 也修不回来** | 修了变量名仍然无效，必须 `refresh-catalog --force` 才动 |

### 15.20.2 缺陷①：两个变量名，只有一个被读

`installer.rs:35-38`：

```rust
pub const DEFAULT_SEED_PROFILE: &str = "standard";
pub const DEFAULT_INSTALL_ENVIRONMENT: &str = "production";
pub const ENV_INSTALL_ENVIRONMENT: &str = "SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT";  // ← 只认这个名字
pub const ENV_INSTALL_SEED_PROFILE: &str = "SDKWORK_DATABASE_SEED_PROFILE";
```

而三处**人类会去写**的地方写的都是另一个名字：

| 位置 | 写的名字 | 是否被 installer 读取 |
|---|---|---|
| `.env.postgres:70` | `SDKWORK_CLOUDROUTER_INSTALL_ENVIRONMENT` | ❌ |
| `scripts/dev/start-workspace.mjs:816` | `SDKWORK_CLOUDROUTER_INSTALL_ENVIRONMENT` | ❌ |
| `scripts/manage-cloud-router-database.mjs:249` | `SDKWORK_CLOUDROUTER_INSTALL_ENVIRONMENT` | ❌ |
| `scripts/lib/cloud-router-environment-admin.mjs:71-73` | **两个都写** | ✅（但只被 reset-admin / bootstrap-token 用） |
| `etc/topology/standalone.development.env` | **`ROUTER_ENVIRONMENT`** | ✅（所以走 topology profile 的路径不中招） |

**为什么长时间没被发现**：`dev` 走 topology profile（负责），`reset-admin` /
`issue-bootstrap-token` 走 `resolveCloudRouterBootstrapAdminEnvOverrides`（两个都写，负责），
**只有直接 `pnpm db:migrate` / `db:seed` / `db:init` 这一条路径把两个名字割裂了**。
而它是首次装库的标准入口。

**证据（现场读数）**：账号 metadata 里冻结着当时的判定结果 —

```json
{ "extra": { "initialAccountStatus": "disabled" }, "itemType": "default_vendor_upstream_account" }
```

改为 `SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT=development` 重跑后，
`cloudrouterctl status` 的 `"environment"` 字段由（隐含）`production` 变为 `development`，
11 个账号 `status` 一次性 `0 → 1`。

**顺带发现的同块第二处漂移**：`start-workspace.mjs` 的
`SDKWORK_CLOUDROUTER_INSTALL_SEED_PROFILE` 默认值是 `'commercial'`，
而 `installer::new` **拒绝**除 `DEFAULT_SEED_PROFILE`（`"standard"`）之外的任何值 ——
在 dev 启动时会直接把安装打断。同批修正为 `standard`。

### 15.20.3 缺陷②：完整性判据看不见账号

`ai_routing_seed.rs` 原判据（只查骨架）：

```rust
Ok(expected_resource_codes(&catalog).is_subset(&resource_codes)
    && expected_group_codes(&catalog).is_subset(&group_codes)
    && expected_endpoint_codes(&catalog).is_subset(&endpoint_codes)
    && postgres_default_admin_upstream_topology_complete(pool).await?
    && postgres_default_admin_routing_strategies_complete(pool).await?
    && postgres_resource_group_item_count(pool, &catalog).await? >= ...)
```

`bootstrap_status` 据此返回 `Installed` ⇒ `ensure` 命令短路 ⇒
`import_postgres_ai_routing_seed` 从不重跑 ⇒ 缺陷①造成的禁用状态**永久固化**。
`installer.rs` 里那段「环境从 production 翻到 development 后状态应收敛」的注释与
UPSERT 分支（`status = CASE WHEN metadata->>'itemType' = 'default_vendor_upstream_account'
THEN EXCLUDED.status ELSE ...`）**本来是为此写的，却永远不会被触发**。

**修法**：新增 `postgres_default_vendor_upstream_accounts_complete`，
按 `default_vendor_upstream_account` 标记逐个校验「账号启用 **且** 存在启用凭据」，
接入原判据链。只检查本 seed 拥有的行 —— 运维改过的账号会丢掉该标记，不会被误判为种子不完整。

**造违例往返验证**：

| 步骤 | 操作 | 读数 |
|---|---|---|
| 1 | 基线 | `status: installed` |
| 2 | `update ai_upstream_account set status=0 where account_code='suno-default'` | — |
| 3 | `cloudrouterctl status` | **`upgrade_required`** ✅ 判据生效 |
| 4 | `cloudrouterctl ensure` | `changed: true` → `installed` ✅ 自愈 |
| 5 | 复查 | `enabled = 11 / total = 11` ✅ |

### 15.20.4 全链路可达性证明（真实库）

现成的 `crates/sdkwork-cloudrouter-edge-runtime/tests/ai_routing_seed_coverage_e2e.rs`
正是本需求的守卫，跑在真 PostgreSQL 上：

```
$ SDKWORK_DATABASE_URL=... cargo test -p sdkwork-cloudrouter-edge-runtime \
    --test ai_routing_seed_coverage_e2e -- --nocapture
running 5 tests
test auth_token_default_group_reaches_every_bundled_vendor ...
  default group default-group (id=1150079326059387300) members=11 grants=12   ok
test bundled_seed_gives_every_vendor_group_a_callable_account ...             ok
  （26 个 (vendor, modality) 分组全部 members=1 callable=1，逐行列出）
test bundled_seed_is_idempotent_across_repeated_runs ...                      ok
test credential_aad_binds_the_secret_to_its_account ...                       ok
test bundled_placeholder_credentials_decode_with_the_dev_key_ring ...         ok（本机未设 key ring，跳过）
test result: ok. 5 passed; 0 failed
```

覆盖到的判据（对应需求逐条）：

| 需求 | 守卫断言 |
|---|---|
| 默认分组存在 | `is_default` 分组存在（不断言 code，允许运维改名） |
| 默认分组含每个 vendor 官方账号 | `members=11`，且 `REQUIRED_VENDOR_ACCOUNTS` 11 个 vendor 逐一命中 |
| 可伪造凭据但支持调用 | `callable_member_count=1`（同时要求 `status=1` + base_url + 启用凭据三者齐备） |
| 账号路由可达 vendor API | 26 个 vendor-modality 分组 `callable=1`；默认分组 `grants=12` 覆盖 11 vendor 资源组 |

### 15.20.5 改动清单

| 文件 | 改动 |
|---|---|
| `services/.../sql/ai_routing_seed.rs` | 新增 `postgres_default_vendor_upstream_accounts_complete`（约 +70 行）并接入 `postgres_ai_routing_seed_complete`；新增 2 个单测 |
| `scripts/manage-cloud-router-database.mjs` | `--environment` 同时导出两个变量名；`redactedEnvSummary` 补列 |
| `scripts/dev/start-workspace.mjs` | 同时导出两个变量名；seed profile `commercial` → `standard` |
| `.env.postgres` | 补 `SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT` + `SDKWORK_CLOUDROUTER_INSTALL_SEED_PROFILE=standard`，附说明注释 |
| `.env.postgres.example` | 同上（模板必须先修，否则每个新人都复现） |
| `scripts/run-cloud-router-application.test.mjs` | 4 处补 `ROUTER_ENVIRONMENT` 断言；2 处 `commercial` → `standard` |

**未改动**：`data/ai-routing/**` 一个字节都没动 —— 供应链上游本来就是完备的，
本轮修的全是「读配置的方式」和「判定是否装完的方式」。

### 15.20.6 门禁读数

| 门禁 | 结果 |
|---|---|
| `cargo test -p sdkwork-cloudrouter-router-service --lib` | **511 passed, 0 failed** |
| `cargo test ... --lib ai_routing_seed` | **24 passed, 0 failed**（含 2 个新增） |
| `--test ai_routing_seed_coverage_e2e`（真库） | **5 passed, 0 failed** |
| `node scripts/dev/cloud-router-application-env.test.mjs` | **19 passed, 0 failed** |
| `pnpm check:dev-bootstrap` | OK（183 scripts） |
| `pnpm api:ai-routing-consistency:check` | **passed** |
| `pnpm check:app-composition` | verify-repo passed |
| `pnpm check:vendor-workspace` | passed（0 tracked vendor paths） |
| `pnpm check:gateway-request-identity`（正确 MSVC PATH） | **25 passed, 0 failed** → alignment ok |
| `node scripts/run-cloud-router-application.test.mjs` | 30 → **28** not-ok |

**未修复的 28 项与本轮无关（已取证）**：其中 26 项是 `ensure-cloud-router-node-deps.mjs`
前缀断言与 nginx 文档断言，另 2 项（`workspace launch plan defaults...` /
`...local split-process debugging`，报 `VITE_SDKWORK_APPBASE_*` /
`PORTAL_PUBLIC_SDK_BASE_URL` 期望值不符）由**其他会话在途改动**
`scripts/dev/cloud-router-application-env.mjs`（`git diff` 显示 +8 行）引起。
取证方式：把 `run-cloud-router-application.test.mjs` 换成 `git show HEAD:` 版本重跑，
这 2 项**仍然失败**（且总数变 30），证明与我的改动无关。

另有 `pnpm check:application-env` 报
`ENOENT deployments/kubernetes/cloud-router-admin-api.yaml` ——
该文件已被 commit `1ef6c8e3`（standalone-only 打包）删除，
但 `scripts/check-cloud-router-application-env.mjs:97` 仍期望它存在。**预存在缺陷，属另一条线。**

### 15.20.7 本轮的教训

1. **「同一个概念的两个名字」是最贵的 bug 类型**。它不报错、不 warn、有合法默认值，
   而且**默认值恰好是生产语义**（`production`）。判据不是「能不能跑」，
   而是「配置没生效时，系统会不会告诉我」。这里它不会。
2. **有默认值的读取失败，比硬报错危险得多**。若 `DEFAULT_INSTALL_ENVIRONMENT` 不存在，
   这里会立刻炸出「environment 未设置」；正因为有 `production` 兜底，
   才变成 11 个账号静默禁用 + 一句离因十万八千里的 50201。
3. **完整性判据决定了「能不能自愈」**。`ensure` 的短路是设计意图（幂等），
   但幂等的前提是**判据覆盖所有会漂移的维度**。判据漏掉账号状态，
   就等于把「装完了」的定义缩窄成「骨架在了」。
4. **修了症状还要验证根因链全通**。改完变量名后账号仍是 `0`，
   若就此收工会得出「改变量名没用」的错误结论；正确判断是「①修的是写入端、
   ②修的是重跑触发端，缺一不可」。**症状消失才算闭环，中间态要如实说。**
5. **测试里的错误期望值会把 bug 锁死**。`assert.equal(env.SDKWORK_CLOUDROUTER_INSTALL_ENVIRONMENT, 'development')`
   只断言别名、`assert.equal(..., 'commercial')` 断言了一个 installer 明确拒绝的值 ——
   这类断言不是在验证契约，是在**固化实现**。回归守卫要断言「被执行方真正读的那个名字」。
6. **模板文件必须与实际配置同批修**。只修 `.env.postgres`（本机）不修 `.env.postgres.example`（模板），
   等于让下一个新人在克隆后原样复现本 bug。

## 15.21 第 21 轮：逐模型官方账号路由可达性（两个孤儿端点 + 一条分类学缺口）

### 15.21.1 结论

第 20 轮把保证做到了**按 vendor**：默认分组里有 11 个 vendor 官方账号、12 个资源组授权、
全链路（账号→路由→计费→vendor API）可达。本轮把保证抬到**按 model**：

> 目录里**每一个**可路由模型，都能走到它对应的官方账号路由。

实测终态：**287 / 287 reachable，0 not reachable**（修复前 **210 / 287**）。

### 15.21.2 关键判据：运行时真正的闸门是「按能力选通用端点」，不是「按厂商选原生端点」

这是本轮最重要的一次**自我推翻**。我最初的假设是：模型能不能路由，取决于
**它自己那个 vendor 的原生端点**有没有被授权。按这个假设算出来的头条数字是
「226/345 不可达，因为 19 个 vendor 没有种子账号」。

**实测证据推翻了它。** `model_catalog_import::model_endpoint_descriptor`
（`services/sdkwork-cloudrouter-router-service/src/infrastructure/sql/model_catalog_import.rs:1043`）
把**每一个**模型绑到一个**与厂商无关**的通用端点，选择依据只有模型的 `primaryCapability`：

| primaryCapability | endpoint_code | protocol_code | resource_code |
|---|---|---|---|
| （chat / 默认） | `openai.chat_completions` | openai_compatible | `api.openai.chat_completions` |
| embedding | `openai.embeddings` | openai_compatible | `api.openai.embeddings` |
| image | `openai.images` | openai_compatible | `api.openai.images` |
| audio | `openai.audio` | openai_compatible | `api.openai.audio` |
| video | `openai.video` | openai_compatible | `api.openai.video` |
| music | `suno.music` | vendor_native | `api.suno.music` |
| rerank | `rerank` | vendor_native | `api.rerank` |

真库证据（`ai_model_api_endpoint`）：`xai/grok-4.5` → `openai.chat_completions`；
`minimax/hailuo-2.3` → `openai.video`；`kuaishou/kling-v3` → `openai.video`；
`elevenlabs/music_v2` → `suno.music`。**没有一条绑到自己的原生端点。**

⇒ 真正的判据是：**请求所在账号分组有没有被授予那个「通用端点资源」**。
按这个正确判据重算，可达性是 **210/287**，缺口 **77 个模型**，全部集中在 video(62) 与 music(15)。

### 15.21.3 根因：两个「孤儿端点资源」——只被导入器创建，从未被种子声明

`data/ai-routing/resources/` 下的三个 seed 文件里**没有一个**声明过：

- `api.openai.video`（→ 通用 `openai.video`，**62 个 video 主能力模型**在用）
- `api.suno.music`（→ 通用 `suno.music`，**15 个 music 主能力模型**在用）

它们只由模型导入路径在运行时创建。后果是一条**三重塌陷**：

```
未在 seed 声明  ⇒  未被任何资源组引用  ⇒  未被授权给任何账号分组  ⇒  50201 失败关闭
```

而另外四个通用端点（chat 108 / embedding 8 / image 48 / audio 46 = 210 个模型）
之所以正常，只是因为默认分组本来就持有的 `api.openai_compatible.all` 恰好携带了它们。

**顺序是强制的**：`validate_catalog`（`ai_routing_seed.rs:2917`）会拒绝
「资源组引用了未声明资源」——所以必须**先声明资源、再挂进资源组**，反过来直接报错。

### 15.21.4 第 7 个缺口：`api.rerank` —— 一个「休眠臂」，登记而不粉饰

新加的真库守卫顺手抓到了 `api.rerank`：`model_endpoint_descriptor` 里有 `rerank` 分支，
但 `api.rerank` **同样没有被任何 seed 声明**。

**判定为休眠，不修**，两条硬证据：

1. **没有任何 seed 文件声明过它**（`grep -ri rerank data/ai-routing/` 零命中）。
2. **没有任何目录模型用它**。实测 `primaryCapability` 全量分布（`D:\sdkwork-space\sdkwork-models\models`）：
   chat 151 / video 96 / image 60 / audio 56 / music 29 / sfx 10 / embedding 9 / code 8 /
   reasoning 4 / streaming 2 —— **`rerank` 一次都没出现**。

⇒ 于是把它从守卫的必需清单里**显式排除并写清理由**，而不是补一条死资源行去「把门禁刷绿」。
代价是：等到目录真的产出 rerank 模型的那天，资源和授权必须**同时**补上，守卫清单也要 +1。

### 15.21.5 另一条被门禁抓到的真实缺口：分类学没登记 `suno.music`

`pnpm api:ai-routing-consistency:check` 报了三条：

1. `suno.music` seeded but absent from `ai_route_taxonomy.rs` → **资源在种子里、路由表里没有，按构造不可达**（真实缺口）。
2. `official.openai.full` must grant every seeded `"openai"` api_endpoint but omits 1 → `api.openai.video`（真实缺口）。
3. `official.suno.full` must grant every seeded `"suno"` api_endpoint but omits 1 → `api.suno.music`（真实缺口）。

第 2、3 条的门禁语义值得记下来：**`<family>.<vendor>.all` / `.full` 必须授予该 vendor 的每一个种子端点**，
不变式**从种子推导**而不是硬编码，所以门禁自身不会漂移。

于是本轮改动从「3 个文件」扩到「6 个文件」：

| # | 文件 | 改动 |
|---|---|---|
| 1 | `data/ai-routing/resources/openai-resources.json` | 声明 `api.openai.video`（26→27 项） |
| 2 | `data/ai-routing/resources/vendor-native-resources.json` | 声明 `api.suno.music`（30→31 项） |
| 3 | `data/ai-routing/resource-groups/admin-api-groups.json` | `api.openai_compatible.all` 15→17 项 |
| 4 | `data/ai-routing/resource-groups/official-provider-groups.json` | `official.openai.full` 27→28、`official.suno.full` 3→4 |
| 5 | `services/.../application/ai_route_taxonomy.rs` | 登记 `suno.music` → `media_task(Music, MusicOutputSecond, "music_task")` |
| 6 | `services/.../infrastructure/sql/ai_routing_seed.rs` | 新增单测守卫 |

修复后 video / music 各拿到**两处**授权（`api.openai_compatible.all` + 各自的 `official.*.full`），
不再是单点。

### 15.21.6 三条独立门禁（这是本轮的主要交付物）

单一探针会漏，所以落了三层、判据各不相同的守卫：

| 层 | 位置 | 判据 | 性质 |
|---|---|---|---|
| 静态单测 | `ai_routing_seed.rs::default_group_grants_every_generic_endpoint_the_catalog_import_binds` | 通用端点**已声明 且 已授予默认分组** | 无 DB，进 CI |
| 真库 e2e | `crates/sdkwork-cloudrouter-edge-runtime/tests/ai_routing_seed_coverage_e2e.rs::auth_token_default_group_reaches_every_generic_capability_endpoint` | 默认分组**实际展开**出的资源码集合 ⊇ 通用端点集合 | 需 `SDKWORK_DATABASE_URL` |
| 逐模型审计 | `scripts/dev/audit-model-route-reachability.mjs` | **按模型**逐条判定，退出码 = 0 仅当全可达 | 实库或打包种子 |

审计脚本的 SQL 是关键，两个 JOIN 键都反直觉、都踩过坑：

```sql
ai_upstream_account_group          -- 账号池（is_default 在这张表）
  -> ai_resource_binding           -- 按 account_group_id 关联（account_group_code 存的是空串！）
  -> ai_resource_group             -- 分类学分组（与 ai_upstream_account_group 是两张不同的表）
  -> ai_resource_group_item        -- 按 resource_code 关联（resource_id 恒为 NULL！）
```

- **`account_group_code` 全空** ⇒ 必须 JOIN `account_group_id`。
- **`item.resource_id` 恒为 NULL**（`group_item_upsert_postgres()` 不写它）⇒ 必须 JOIN `resource_code`。
  早期查询 JOIN `resource_id` 时把「这些资源属于哪个分组」错答成 `(NO GROUP)`。

### 15.21.7 门禁终态读数（第 21 轮实测）

| 门禁 | 结果 |
|---|---|
| `cargo test -p sdkwork-cloudrouter-router-service --lib` | **514 passed, 0 failed** |
| `cargo test ... --lib ai_routing_seed::tests` | **25 passed, 0 failed**（含新增守卫） |
| `--test ai_routing_seed_coverage_e2e`（真库） | **6 passed, 0 failed**（含新增守卫） |
| `pnpm api:ai-routing-consistency:check` | **passed**（58 seeded api codes, **0** unknown to the taxonomy） |
| `pnpm check:dev-bootstrap` | OK（183 scripts） |
| `pnpm check:app-composition` | verify-repo passed |
| 逐模型审计（实库） | **287/287 reachable** |
| 逐模型审计（打包种子） | **287/287 reachable** |
| 种子完整性 | 76 resources / 34 groups / **0 dangling** |

`cloudrouterctl status` → `upgrade_required`（`include_str!` 让 seed 改动自动改变指纹），
`ensure` → `{"status":"installed", ..., "changed":true}`，实库已应用。

**一处预存在红（非本轮引入，已取证）**：`pnpm verify:fast` 停在
`skills:seed:check`，报 `data/skills/cloudhub/manifest.json is stale`。
取证结论：门禁期望的 `sourceHash = d2f619a2...` **正好等于 `raw/index.json` 的实际内容哈希**，
说明工作区**是对的**、`manifest.json` 里存的 `61c088d0...` 才是陈旧值；
且该路径 `data/skills/cloudhub/raw/index.json` 受 **git-lfs** 管（`.gitattributes:14`），
`git status`/`git diff` 对它静默。**与本轮 seed 改动无关。**

### 15.21.8 登记但**故意不改**的两项（需人工裁决）

1. **19 个目录 vendor（198 个模型）根本没有种子官方账号。** 它们是
   `xai` / `alibaba` / `zhipu` / `moonshot` / `xiaomi` / `runway` / `stability_ai` /
   `black_forest_labs` / `mureka` / `pixverse` / `luma_ai` / `tencent` / `baidu` /
   `deepseek` / `stepfun` / `meituan` …。**这不是路由缺陷**：只要通用端点已授权，
   它们就能走到路由（本轮已证明 287/287）。要不要给它们建官方账号是**产品覆盖度决策**，
   不是 bug。
2. **目录的 vendor code 与账号的 vendor code 不是同一套**：目录用真实厂商名
   （`google` / `kuaishou` / `bytedance`），种子账号用适配器码
   （`gemini` / `kling` / `jimeng`），且 Rust 侧**没有系统性的别名表**，
   只有 `provider_native_classifier.rs` 里零散的 `"google" | "gemini"` 匹配。
   目前不影响可达性（闸门是能力不是厂商），但任何未来「按厂商比对」的判据都会踩它。

### 15.21.9 本轮的教训

1. **假设要用「绑定的实际取值」验证，不能用「命名的直觉」推断**。我按「模型→自己厂商的原生端点」
   推出来的 226 不可达是错的；去 `ai_model_api_endpoint` 表里读**每一行实际绑了什么**，
   才看到全部绑在通用端点上。**表里有答案的时候不要去猜语义。**
2. **「缺失」有两种，处置相反**：`api.openai.video` / `api.suno.music` 是**活的**缺口（162 个模型
   在两个能力族里被 de-route），必须补；`api.rerank` 是**休眠**臂（零模型使用），
   该做的是**登记 + 写清唤醒条件**。把休眠项也补成死资源行，只是把门禁刷绿、把债藏起来。
3. **一条静态门禁不够，因为它们的可见面不同。** 单测看得见「声明与授权的关系」、
   真库 e2e 看得见「实际展开的授权集合」、逐模型审计看得见「每个模型的真实闸门」。
   第 7 个缺口（`api.rerank`）就是被第三层抓到的，前两层都没响。
4. **门禁报红先分成「我引入」和「既存」**。`skills:seed:check` 那条看起来像我的 seed 改动引起的，
   取证后发现门禁期望值 = 文件实际哈希、manifest 才是陈旧方，且该路径受 LFS 管 →
   与我的改动无关。**不做这一步就会去修一个没坏的东西。**
5. **顺手扩守卫的收益是复利的**。本轮守卫从 5 条测试扩到 6 条、加了一个 per-generic-endpoint
   断言，多花的成本很小，却直接抓出了我人工审计漏掉的 `api.rerank`。

---

## 15.22 第 22 轮：每个独立功能补齐官方账号并挂入默认分组（数据层全量覆盖）

### 15.22.1 结论

用户要求「每个独立的功能都要建立对应的官方账号中，放到默认分组中，确保从数据层面能够完整测试
所有的 api 的完整调用流程」。按两个已确认的裁决执行：

| 裁决项 | 选项 | 含义 |
|---|---|---|
| 账号范围 | 补齐 16 个账号（伪造 apikey 占位） | 接受凭证为占位值，dispatch 仍会在适配器层失败——目标是**数据层完整**（25/25 厂商） |
| adapter 归置 | 按 `apiFormat` 映射到已有 11 个 adapter | 不新写适配器实现 |

**终态读数（实测）**：

| 指标 | 第 21 轮 | 第 22 轮 |
|---|---|---|
| 默认分组可调用账号 | 11 | **27** |
| 默认分组展开授权资源码 | 12 | **84** |
| 派生的 `<vendor>.<modality>` 分组 | 27 | **57** |
| `official.*` 资源组 | 10 | **26** |
| `vendor.*` 资源 | 11 | **27**（另有 3 个账号侧同义名：`bytedance`/`kuaishou`/`google`） |
| 账号组成员总数 | 37 | **83** |
| 可达模型 | 287/287 | **287/287**（不回退） |
| `cloudrouterctl ensure` | — | `installed` / `changed:true` → 二次 `changed:false` |

### 15.22.2 决定性发现：`adapter_code` 从不被应用层读取

这是整个任务能安全推进的前提。`adapter_code` 写在 `ai_upstream_supplier` 上
（种子出口 `ai_routing_seed.rs` 的 `DefaultVendorUpstreamAccountSeed` → supplier 行），但：

- `infrastructure/sql/catalog.rs` 与 `rows.rs` 里 `grep adapter_code` → **0 命中**（未进入运行时快照）
- `application/` 下 `grep adapter_code` → **0 命中**

因此**账号可以在没有任何适配器实现的情况下完成路由**。真正决定线上协议的是
`protocol_code_from_api_code`（`application/upstream_base_url.rs:118-129`）：`api_code`
含 `anthropic`→AnthropicMessages；含 `responses`→OpenaiResponses；含 `chat`/`completion`
→OpenaiChatCompletions；否则 None。**`adapter_code` 是给运维看的元数据，不是分派依据。**

### 15.22.3 账号选择按「资源授权」而非「目录厂商」

`select_model_route_plan_for_context`（`application/upstream_route_selector.rs:241`）
只在**分组白/黑名单闸门**里调 `find_model(&query.catalog_key).map(|m| m.vendor_code)`
（`:261-278` 的 `model_access_forbidden_reason`）；真正的账号路由来自
`shared_upstream_account_routes()` ∩ `upstream_account_group_bindings(...)`；
`account_route_allows_model_request`（`:1769`）检查分组归属 + `resource_entitlements`；
而 `synthetic_model_route_from_account_route`（`:1694`）取的 `supplier_code` 来自
**账号侧** `route.supplier_code`（如 `gemini`），**不是**目录厂商码。

⇒ 新增 16 个厂商账号之所以安全：它们各自把模型导向已经可达的通用面，
而默认分组同时持有通用面（`api.openai_compatible.all` / `official.openai.full` /
`official.suno.full`）与这 16 个新厂商面。

### 15.22.4 本轮改动（6 个文件）

| # | 文件 | 改动 |
|---|---|---|
| 1 | `data/ai-routing/resources/core-resources.json` | 18→34 项；`vendor.*` 11→27（16 个新厂商资源，`capability` 取目录 `primaryCapability` 折叠值） |
| 2 | `data/ai-routing/resource-groups/official-provider-groups.json` | 10→26 组；新增 16 个 `official.<vendor>.full` |
| 3 | `.../infrastructure/sql/ai_routing_seed.rs` | `VENDOR_RESOURCE_GROUP_BINDINGS` 11→27；`VENDOR_LOCALIZED_NAMES` 11→27；`DEFAULT_VENDOR_UPSTREAM_ACCOUNTS` 11→27 |
| 4 | `crates/.../tests/ai_routing_seed_coverage_e2e.rs` | `REQUIRED_VENDOR_ACCOUNTS` 11→27；`REQUIRED_VENDOR_RESOURCE_GROUPS` 11→27；幂等断言 `37 → 83` |
| 5 | `scripts/dev/audit-model-route-reachability.mjs` | `DEFAULT_GROUP_GRANTS` 由硬编码改为**从 `ai_routing_seed.rs` 解析** |
| 6 | `.../infrastructure/sql/installer.rs` | `UpgradeRequired` 失败时**指名**「账号无凭证 ⇒ 未配置密钥环」 |

**16 个新厂商的 adapter/protocol/base_url**（按 `apiFormat` 归置）：

| vendor | adapter_code | protocol_code | base_url |
|---|---|---|---|
| xai | openai_compatible | openai_compatible | https://api.x.ai |
| alibaba | openai_compatible | openai_compatible | https://dashscope.aliyuncs.com |
| deepseek | openai_compatible | openai_compatible | https://api.deepseek.com |
| moonshot | openai_compatible | openai_compatible | https://api.moonshot.cn |
| zhipu | openai_compatible | openai_compatible | https://open.bigmodel.cn |
| tencent | openai_compatible | openai_compatible | https://api.hunyuan.cloud.tencent.com |
| xiaomi | openai_compatible | openai_compatible | https://api.xiaomi.com |
| stepfun | openai_compatible | openai_compatible | https://api.stepfun.com |
| meituan | openai_compatible | openai_compatible | https://api.meituan.com |
| runway | runway | vendor_native | https://api.dev.runwayml.com |
| baidu | baidu | vendor_native | https://aip.baidubce.com |
| luma_ai | luma_ai | vendor_native | https://api.lumalabs.ai |
| pixverse | pixverse | vendor_native | https://api.pixverse.ai |
| mureka | mureka | vendor_native | https://api.mureka.ai |
| stability_ai | stability_ai | vendor_native | https://api.stability.ai |
| black_forest_labs | black_forest_labs | vendor_native | https://api.bfl.ai |

### 15.22.5 `resource_group_codes()` 无需改动——自动扩展

`DefaultAdminUpstreamAccountGroupSeed::resource_group_codes()` 的实现是
「primary + `DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES` + **全部** `VENDOR_RESOURCE_GROUP_BINDINGS` 值」
再去重。所以**加 16 条 binding 就自动把 16 个新组挂进了默认分组**，
`resource_group_codes()` 一行都不用改。这正是审计脚本能把它改成「从源码解析」的依据。

### 15.22.6 设计决策：新组只声明 `vendor.<vendor>`，不声明厂商原生端点

16 个新组的 items 只有一个 `vendor.<vendor>` 资源，理由是**发布侧还没有这些厂商的
vendor-native `api_endpoint`**，它们现阶段的模型经通用面带出。这样处理同时满足一致性门禁
「`<family>.<vendor>.full` 必须授予该厂商**所有已种子** api_endpoint」——
该厂商已种子端点为 0，条件是空真（vacuous truth），门禁通过而语义正确：
**把还没有的东西登记成死资源行，只是把门禁刷绿、把债藏起来**（第 21 轮教训 2 的复用）。

### 15.22.7 真实缺陷：无密钥环 ⇒ 账号落库但凭证静默跳过 ⇒ `ensure` 永远不收敛

这是本轮最有价值的发现，也是我一度误判为自己的改动引起的坑。

**症状**：`cloudrouterctl ensure` 报
`database bootstrap is invalid: catalog/seed bootstrap did not reach installed state: UpgradeRequired`。

**取证过程（关键一步）**：`git stash` 掉我的三处改动 → 重建 → **基线（原始 11 厂商种子）
同样报 `upgrade_required`** ⇒ 立刻排除「我引入的回归」，避免去修一个没坏的东西。

**真实根因**：`import_postgres_default_vendor_account_credential`（`ai_routing_seed.rs:2733`）开头是

```rust
let Some(credential_codec) = credential_codec else {
    return Ok(());
};
```

未配置 `SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING(_FILE)` 时，
**账号照写、凭证不写**；而完整性谓词 `postgres_default_vendor_upstream_accounts_complete`
要求每个账号都有一条 `status=1 AND is_active` 的凭证 ⇒ 谓词恒为 false ⇒ `ensure` 永远失败。

库里的指纹极具辨识度：**27 个账号、11 条凭证**。

**处置**：
- 用 `SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING_FILE` 指向
  `.sdkwork/secrets/upstream-credential-key-ring.development.json` 重跑 ⇒
  `{"status":"installed", ..., "changed":true}`；二次 `changed:false`（幂等）。
- **加诊断**：`ensure` 在 `UpgradeRequired` 时查一次「是否存在无凭证的 vendor 默认账号」，
  有则把原因直接写进错误消息（指名两个环境变量）。把 20 分钟的二分定位压缩成一行提示。
- **加单测** `credential_writer_is_skipped_without_a_codec_and_the_predicate_notices`，
  用源码断言把「写者有 codec 早退」与「谓词要求凭证」这对耦合钉住。

> 注意这是**环境配置缺口**，不是种子缺陷：种子在无密钥环时跳过凭证是**正确**的
> （运行时解不开的凭证比没有更糟，见该函数文档）。缺的是**「失败要说人话」**。

### 15.22.8 顺手扩守卫：审计脚本改为从种子源码解析授权集合

`scripts/dev/audit-model-route-reachability.mjs` 原先硬编码 `DEFAULT_GROUP_GRANTS`（12 条）。
这是典型的**会静默漂移的镜像**：加 16 个厂商后，若不同步这份硬编码，审计会继续报
「100% 可达」，而数据库里的默认分组可能真的丢了授权。

改为从 `ai_routing_seed.rs` 解析三处：默认分组的内联 primary `resource_group_code`、
`DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES`、`VENDOR_RESOURCE_GROUP_BINDINGS`
（后者是 `(vendor, group)` 对，取其中能解析为已种子分组的名字，从而自然滤掉 vendor 那一半）。
解析不到就抛错并指明「seed 被重构了，改解析器而不是猜授权」。
**实测解析结果 84 条**，与实时库读数一致——镜像消失，漂移这一类缺陷被结构性消除。

### 15.22.9 门禁终态读数（第 22 轮实测）

```
cargo test -p sdkwork-cloudrouter-router-service --lib ai_routing_seed
    → 26 passed / 0 failed（含新守卫）

cargo test -p sdkwork-cloudrouter-edge-runtime --test ai_routing_seed_coverage_e2e
    → 6 passed / 0 failed（真实 PostgreSQL）
       · bundled_seed_gives_every_vendor_group_a_callable_account   ← 57 个派生组全部有可调用成员
       · bundled_seed_is_idempotent_across_repeated_runs            ← 27 账号 / 27 凭证 / 83 成员
       · bundled_placeholder_credentials_decode_with_the_dev_key_ring

node tools/check-cloudrouter-ai-routing-consistency.mjs
    → passed（58 个已种子 api code，0 未知；19 个厂商/模态分组比对，30 个非厂商/模态作用域跳过）

node scripts/dev/audit-model-route-reachability.mjs（live-db）
    → 287 / 287 可达，27 个可调用账号，默认分组 84 条授权资源码，not reachable = 0

cloudrouterctl ensure
    → installed / changed:true ；二次 ensure → changed:false
```

### 15.22.10 本轮遗留（登记不改）

1. **目录厂商码 ↔ 账号厂商码没有权威别名表**。目前只有 Rust 侧
   `provider_native_classifier.rs:214-233` 的 `"google" | "gemini"` 一处别名；
   `bytedance`/`kuaishou` **未**别名到 `jimeng`/`kling`，另有 12 个厂商零别名命中；
   `vendors.json` 无 `providerCode`/`adapterCode`/`supplierCode`/`aliasOf` 字段。
   已作为独立任务登记（本轮不动，避免在飞行中扰动路由）。
2. **数据层覆盖 ≠ 路由可达**，两者是**不同的保证**，不要互相替代：
   前者保证「每个能力都有一条可检视的账号行可被测试驱动」，
   后者保证「每个模型都能选到账号路由」。本轮两者都成立，但由**不同的门禁**各自守着。

---

## 15.23 第 23 轮：逐个 API 端到端链路审计（调用 → 计费 → 目标账号 → 目标 vendor）

**用户原话**：持续推进，确保整体系统可以商业化落地，并跑通图片、视频、音频、音效、音乐、
LLM 模型的所有 API 能力，逐个 api 检查，确保从调用、计费、到目标账户和目标 vendor 的调用
逻辑，保证链路逻辑正确。

**本轮定位**：前 22 轮是「按能力」「按模型」「按厂商」审计；本轮换成**按 API 端点**逐条走链路，
把「一个 API 从入站路径一路走到目标 vendor 的 wire 请求」拆成 7 个可独立断言的环节。
这一视角立刻暴露出前三种视角都看不见的两个缺陷。

### 15.23.1 结论

| 指标 | 值 |
|---|---|
| 已种子 api_endpoint | 59 |
| 端到端全链路通过 | **59 / 59** |
| 断链 API | 0 |
| 按能力 | 图片 10/10、视频 11/11、音频 10/10、音乐 3/3、LLM 12/12、向量 2/2、控制面 11/11 |
| 逐模型可达性（不回退） | 287 / 287 |
| `cloudrouterctl ensure` | `installed` / `changed:true` → 二次 `changed:false` |

### 15.23.2 7 环链路模型（本轮的核心工具）

`scripts/dev/audit-api-chain-reachability.mjs`（新建）对**每一个已种子 api_endpoint** 走：

| # | 环节 | 判据 | 失败含义 |
|---|---|---|---|
| 1 | `path` → `api_code` | 该 api_code 在 `ai_route_taxonomy.rs` 有登记 | 无路由可达，按构造不可达 |
| 2 | `api_code` → `resource_code` | 该资源被**至少一个**资源组授予 | 任何账号都到不了 |
| 3 | 入站路径 → 出站协议 | `protocol_code_from_api_code` 有映射，或按文档合理地返回 `None` | 方言无法解析 |
| 4 | 默认分组授权 | 该资源码在默认分组**实际展开**的集合里 | 登录用户 50201 |
| 5 | 可调用账号 | 该 API 的**作用厂商**在默认分组里有 enabled + base_url + active credential 的账号 | 50201 |
| 6 | wire 协议 | 同 #3，但用运行时视图 | — |
| 7 | 计费 | 声明的 meter 在**价本或目录**任一侧有定义 | 计价 preflight 拒绝 |

**退出码语义**：0 = 全通过；1 = 有断链；**2 = 拿不到数据库且未显式 `--seed-only`**。

第 7 环的判据是本轮最需要小心的一条，见 15.23.6。

### 15.23.3 缺陷一（头条）：`primaryCapability = "sfx"` 无端点分支 ⇒ 音效被当成 chat 打到 vendor

**发现路径**：第 1 环就红了 —— `sfx.sound` 在 taxonomy 里**根本没登记**。

**根因**：`model_endpoint_descriptor` 只看 `primaryCapability` 选通用端点。
目录里 10 个 sfx 模型（4 个厂商：`elevenlabs` / `kuaishou` / `stability_ai` / `vidu`）
的 `primaryCapability = "sfx"`，而该函数**没有 `"sfx"` 分支** ⇒ 全部落到 `_` 兜底：

```rust
_ => EndpointDescriptor { endpoint_code: "openai.chat_completions", ... }
```

⇒ **音效请求会被重放到 vendor 的 `/v1/chat/completions`**，永远产不出音频。

**决定性证据（真库）**：修复前，6 个已导入的 sfx 模型
`capability = 1`（= Chat，与 `openai/gpt-5.4` 相同），`capabilities = ["sfx"]` 只存在于 jsonb 里。
即 AI 模型表把音效当成了聊天模型。

**修复跨 2 个仓、8 个文件**（见 15.23.5），其中**第二个仓是真正的阻塞点**。

### 15.23.4 缺陷二（本轮最贵的教训）：`model_endpoint_descriptor` 有两份独立副本

第一份在 `sdkwork-cloudrouter`（router-service）—— 我改了它，重建，跑 `refresh-catalog --force`，
返回 `synced: true`。**但 `ensure` 仍然 `UpgradeRequired`。**

`ai_vendor_api_endpoint` 缺 4 个键。反算 uuid 确认正是 4 个厂商的 `sfx.sound` 关联。

第二份在 **`sdkwork-models`**
（`crates/sdkwork-models-catalog-repository-sqlx/src/model_catalog_import.rs:1148`，
函数名相同、分支结构相同、**没有 `"sfx"` 分支**）。

**两者的分工是本条教训的关键**：

- `sdkwork-models` 侧**写库**（`import_vendor_api_endpoints` / `import_api_endpoints` /
  `import_model_api_endpoints` 都从这里投影）；
- `sdkwork-cloudrouter` 侧**读库**做完整性断言（`catalog_expectations`）。

⇒ **router 侧永远无法自愈一个它不拥有的投影**。改了 router 副本却不改 models 副本，
表现是「`refresh-catalog` 报告成功，但 `ensure` 永远不收敛」——
`synced: true` 是**真的**（它同步了它知道的东西），只是它不知道的东西没有被同步。

**结论**：任何 `model_endpoint_descriptor` 的能力分支改动，**必须两处同改**。

### 15.23.5 缺陷三：`UpgradeRequired` 只报「类」不报「因」——本轮顺手治了

`bootstrap_status` 是 `&&` 链：

```
schema → model_catalog_schema → pricing_schema → catalog_complete
       → postgres_ai_routing_seed_complete → default_service_node_complete → Installed
```

失败时只返回 `UpgradeRequired`。而 installer 里原本的诊断只覆盖 2 个已知原因
（种子投影落后 / 无密钥环），**不认识 `catalog_complete` 失败**——
正是本轮遇到的第三种。于是错误消息是：

```
catalog/seed bootstrap did not reach installed state: UpgradeRequired
```

一句「有事发生」，没有「什么事」。

**处置（3 处）**：

1. 新增 `postgres_ai_routing_seed_gap()`（`ai_routing_seed.rs`）——
   把 7 个 `&&` 子句改写成**返回子句名**的形式；
   `postgres_ai_routing_seed_complete()` 改为它的薄包装（`gap().is_none()`）。
   两者共用同一批调用，**不可能对「完整」的定义产生分歧**，只有**报告**不同。
2. 新增 `Installer::catalog_gap()`（`installer.rs`）——
   报出**第一个**缺失的 `表.列` 并给出最多 5 个缺失键样例。
3. `ensure()` 的失败分支改为**汇总全部四个闸门**的诊断，而非只查密钥环。

**效果（实测）**：错误消息从一句无信息的话变成

```
...did not reach installed state: UpgradeRequired — model catalog projection:
ai_vendor_api_endpoint.uuid is missing 4 bundled key(s), e.g. sdk-vendor-endpoint-5237e36f...
```

一行定位，取代一次对 `&&` 链的二分。

### 15.23.6 第 7 环（计费）的判据：为什么不能用「按能力兜底」

`pricing_identity.rs` 的模块文档写明价本是**唯一权威**，taxonomy 的 meter 只是**默认建议**：

| 目录定义 | 结果 |
|---|---|
| 无 | `RouteDeclared` —— 保留 taxonomy meter，交给 preflight 诊断 |
| 有交集 | `RouteDeclaredWithinCatalog` —— 取交集 |
| 无交集 | `CatalogDefinition` —— **目录赢，taxonomy 被覆盖** |

但我最初的实现是「该能力下有任意一个 meter 被定价就算过」，这**放过了一个我自己注入的故障**：
把 `openai.embeddings` 的 meter 改成 `LlmReasoningToken`（无价本、无目录定义）后审计仍报绿，
因为「别的 Embedding meter 有价」把它盖住了。

**改成**：声明的 meter 必须在**价本或该能力的目录定义**任一侧成立。
负向对照随即报红（`1 of 59 FAILED`，退出码 1）。

### 15.23.7 另外两类假阳性（都已修，判据收窄而非放水）

1. **58 条「未定价」**：我拿 Rust 枚举变体名（`LlmInputToken`）去比数据库字符串
   （`llm_input_token`）。改为从 `domain.rs` 的 `impl BillingMeter::code()` **表里解析**。
2. **22 条「协议缺失」**（全是 `openai.*`）：我把 `None` 当成缺陷。
   `protocol_code_from_api_code` 的文档注释写明
   *「embeddings 等无协议资源返回 None，走默认 Base URL 链」*，
   且 `resolve_upstream_base_url` 是一条五级回退链。
   ⇒ `None` 对**非 LLM / vendor-native** 是**正确**答案，不是缺陷。
   判据收窄为 `PROTOCOL_REQUIRED`：只有通用 chat 面缺协议才算失败。

### 15.23.8 真实缺陷：第三方副本漂移 + 陈旧投影残留（登记为后续）

**① 分类器有两份副本。** 一致性门禁
（`tools/check-cloudrouter-ai-routing-consistency.mjs`）在我只改 router 侧时**立刻报红**，
点名 5 条 arm「被 router 分类但未被 edge-runtime 透传」。补上 edge-runtime
（`crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs`）后 34/34 arm 对齐、门禁绿。

> 门禁的 arm 正则会把**注释**当成 arm 的 condition（`"x" if <注释> => "y"`），
> 于是注释位置不当会触发「1 arm(s) this gate cannot model」。
> 已把解释性注释移到**函数上方 doc comment**，函数体内不再夹注释。

**② 投影是纯增量的，没有清理阶段。** `sdkwork-models` 的 20 个 `import_*` 全是 upsert
（`ON CONFLICT ... DO UPDATE`），**没有任何 prune/sweep**。于是模型换绑端点后，
旧绑定以 `status = 0` 残留：

```
elevenlabs/eleven_text_to_sound_v2 | openai.chat_completions | status=0   ← 残留
elevenlabs/eleven_text_to_sound_v2 | sfx.sound              | status=1   ← 正确
（6 个 sfx 模型全部如此）
```

**严重性如实评估**：运行时快照的端点来自 `ai_upstream_supplier_endpoint`（见
`queries/snapshot.rs:677`），**不读** `ai_model_api_endpoint`，
所以残留行**不影响实际路由**。但它是**真隐患**：
任何只按 `deleted_at IS NULL`（不看 `status`）过滤的消费者都会把 chat 当成活绑定。
⇒ 登记为后续任务（补一个「投影后清扫」阶段），本轮不动，避免在飞行中改导入语义。

**③ 完整性检查不过滤 `status`。** `postgres_string_values` 是
`SELECT DISTINCT {column} FROM {table}`，无 `status`/`deleted_at` 条件
⇒ 陈旧行也能满足完整性断言。同样是「能通过但不健康」，一并登记。

### 15.23.9 改动清单

| 仓 | 文件 | 改动 |
|---|---|---|
| cloudrouter | `services/.../infrastructure/sql/model_catalog_import.rs` | `model_endpoint_descriptor` 加 `"sfx"` 分支（`sfx.sound` / `vendor_native` / `/v1/sound/generate`）；加守卫单测 `each_media_capability_binds_to_its_own_endpoint_not_chat` |
| cloudrouter | `services/.../application/ai_route_taxonomy.rs` | 登记 `sfx.sound` 路由（`RoutingCapability::Audio` + `BillingMeter::SfxResult`）；5 条音频输入路由 `AudioInputSecond` → `SttAudioMinute`；`suno.music` 路由（并行会话已有） |
| cloudrouter | `services/.../application/invocation/provider_native_classifier.rs` | 加 5 条 sfx arm（kling / stability_ai×2 / vidu×2） |
| cloudrouter | `crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs` | 同步 5 条 sfx arm + doc comment |
| cloudrouter | `services/.../infrastructure/sql/ai_routing_seed.rs` | `VENDOR_MODALITY_MAPPING` 5→6 加 `("sfx","audio")`；新增 `postgres_ai_routing_seed_gap()` |
| cloudrouter | `services/.../infrastructure/sql/installer.rs` | 新增 `catalog_gap()`；`ensure()` 诊断汇总四个闸门 |
| cloudrouter | `data/ai-routing/resources/vendor-native-resources.json` | 加 `api.sfx.sound` |
| cloudrouter | `data/ai-routing/resource-groups/admin-api-groups.json` | `api.openai_compatible.all` 17→18（加 `api.sfx.sound`） |
| cloudrouter | `data/ai-routing/resource-groups/official-provider-groups.json` | `official.kling.full` 7→8、`official.vidu.full` 4→5、`official.stability_ai.full` 1→2 |
| cloudrouter | `scripts/dev/audit-api-chain-reachability.mjs` | **新建**（逐 API 7 环审计） |
| cloudrouter | `scripts/dev/diagnose-bootstrap-predicates.mjs` | **新建**（逐子句诊断） |
| cloudrouter | `package.json` | 加 `api:chain-reachability:check` / `:gaps` / `db:bootstrap-predicates` |
| **sdkwork-models** | `crates/sdkwork-models-catalog-repository-sqlx/src/model_catalog_import.rs` | **`model_endpoint_descriptor` 加 `"sfx"` 分支（阻塞点）**；加同名守卫单测 |

### 15.23.10 门禁终态读数（第 23 轮实测）

```
cargo test -p sdkwork-cloudrouter-router-service --lib        → 516 passed, 0 failed
cargo test -p sdkwork-cloudrouter-edge-runtime --lib          → 87 passed, 0 failed
cargo test -p sdkwork-models-catalog-repository-sqlx --lib    → 8 passed, 0 failed
cargo test --test ai_routing_seed_coverage_e2e（真库）         → 6 passed, 0 failed

node tools/check-cloudrouter-ai-routing-consistency.mjs
    → passed（59 个 api code / 0 未知；分类器 34 arm = 透传 34 arm）

node scripts/dev/audit-api-chain-reachability.mjs（live-db）   → passed（59/59），退出码 0
node scripts/dev/audit-model-route-reachability.mjs（live-db） → 287/287，not reachable = 0
node scripts/check-dev-bootstrap-coverage.mjs                  → OK（186 scripts）
node ../sdkwork-specs/tools/verify-repo.mjs --root .           → passed

cloudrouterctl ensure → installed / changed:true ；二次 → changed:false
```

`node scripts/run-cloud-router-application.test.mjs` 仍为 **28 项 not-ok**，
与第 22 轮基线**同集合**（打包/文档/发布脚本类断言，无一涉及 AI 路由），非本轮引入。

### 15.23.11 本轮教训（6 条）

1. **同一函数的两份副本，出事时症状离根因最远**。`model_endpoint_descriptor` 有两份，
   一份写库一份读库；改了读侧会得到「同步成功但永不收敛」这种**自相矛盾**的症状。
   判据：**看到 `synced: true` 但状态没变，先找是不是有第二个写者/读者**。
2. **失败诊断的粒度决定排障成本**。`&&` 链返回布尔值 = 把自己的排障成本转嫁给人。
   把链改写成「返回第一个失败子句名」是一次性投入，此后每次失败都省一次二分。
3. **换视角才有新发现**。同一个系统，「按能力/按模型/按厂商」三种视角都漏掉了
   「按 API 端点」一眼就看见的东西。审计视角本身就是一种覆盖度。
4. **判据收窄 ≠ 放水**。三类假阳性（枚举名 vs DB 串、`None` 协议、能力级兜底）
   全部是**判据错**而不是**系统错**；收窄判据前必须先读文档注释确认什么是「正确」。
5. **负向对照不可省**。我自己注入的 `openai.embeddings → LlmReasoningToken` 故障
   一度没被抓住。**一个不能变红的审计等于没有审计**。
6. **增量投影必须配清扫**。纯 `ON CONFLICT DO UPDATE` 的导入在**改绑**语义下会留残影。
   残影不一定立刻有害（运行时可能读别的表），但它是「能通过但不健康」。

### 15.23.12 环境要点（复现用）

- **两个租户**：`ai_resource` / `ai_resource_group` / `ai_api_endpoint` /
  `ai_vendor_api_endpoint` 在 `tenant_id = 0`；
  而 `ai_routing_strategy` / `ops_gateway_instance` / `ai_upstream_account` 走
  `DEFAULT_IAM_TENANT_SQL_ID`，即 **`sdkwork-iam` 的 `100_001`**。
  **用错租户会得到「0 条策略」，看起来像真缺失**（我踩过，浪费一轮）。
- `ai_resource_group_item` 的分组列名是 **`resource_group_code`**（不是 `group_code`）；
  `resource_id` 恒为 NULL，必须 JOIN `resource_code`。
- `ai_vendor_api_endpoint` / `ai_model_api_endpoint` 的写入者在 **`sdkwork-models`**，
  cloudrouter 侧只有读取。
- WSL 多行 SQL 陷阱：`wsl.exe ... psql -c "SELECT a\n FROM b"` 会把 `\n` 字面传入。
  **用 Node 的 `oneLine(sql)` 压成单行 + `JSON.stringify` 传参**；
  手写三层嵌套引号会把命令挂死。
- `SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING_FILE` 必须给 **Windows 路径**
  （`D:\...`）；给 `/d/...` 报 `os error 3`。

---

## §15.24 第 24 轮：全量回归检查（并发工作树 + 定价闸门口径漂移 + 七能力真库 e2e）

本节记录 2026-09-18 17:00 之后的一轮「回归检查」。触发语是「继续回归检查，确保调用链路正确，保证调用完美」。

### 15.24.1 结论先行

| 项 | 结果 |
|---|---|
| 逐 API 7 环链审计 | **59/59 可达，exit 0**（未受并发改动影响） |
| 模型级路由审计 | **287/287 可达**，可调用账号 **27** |
| 路由一致性门禁 | **passed**（classifier 44 臂 = passthrough 44 臂，↑from 34） |
| router-service 全量测试 | **0 failed**（516 库测试 + 全部集成测试） |
| edge-runtime 测试 | **12/13 套件 ok**；1 套件失败见 §15.24.4 |
| 七能力真库 e2e | **4/7 抵达厂商**（含**音效 ✅**）；3/7 为**既存缺口**，非本轮引入 |
| **本轮新修** | 1 条**过时测试**（定价闸门口径漂移），见 §15.24.3 |

### 15.24.2 最贵的一课：并发工作树

本轮开工时 `git status` 显示 **71 个改动文件**，而本轮应有改动只有 **13 个**。同一 `D:\sdkwork-space\sdkwork-cloudrouter` 工作树上**有另一个 agent 会话在并行写入**。

**证据链**：

1. `ai_routing_seed.rs` 的 diff 是 **607 insertions / 12 hunks**，而本轮的 sfx 修复只动 `VENDOR_MODALITY_MAPPING` 与 `postgres_ai_routing_seed_gap`。
2. 其中 8 个 hunk 在做 `DEFAULT_VENDOR_UPSTREAM_ACCOUNTS` 从 **11 → 27** 的扩容（xai / alibaba / deepseek / moonshot / zhipu / tencent / xiaomi / stepfun …）。
3. `data/ai-routing/resources/vendor-native-resources.json` 与两个分组 JSON 里，除本轮的 `api.sfx.sound` 外还有 `api.suno.music`、`api.openai.video` —— **不是本轮加的**。
4. `git stash` 失败：`Unable to create '.../index.lock': File exists`，且该 lock 是 **12:26 创建、0 字节、当前无 git 进程** ⇒ 另一会话的 git 被中断留下的**陈旧锁**。
5. 分类器/穿透臂数从本轮的 34 → 44，也是另一会话扩的。

**后果与纪律**：

- **不得用「总体 diff」判断自己改了什么** —— 必须按文件逐个 `git diff --stat` 核对，与自己的记忆/记录对照。
- **不得 `git stash`/`git add -A`/`git checkout --` 这类动共享 index 的操作** —— `index.lock` 存在就说明有人正在操作。改用 **`git worktree`** 做只读对照。
- **worktree 路径必须给 Windows 形式**（`D:\triage-head`）。给 `D:/...` 或 `/d/...` 会被 Git Bash 解释成**相对路径**，worktree 落到 `D:/d/sdkwork-space/...` 这种奇怪位置，且 `git worktree list` 能看出。
- 数据面的隔离 worktree 做不到 —— **两个会话指向同一个活库**，所以数据差异只能靠 SQL 取证，不能靠「纯净树重跑」。

### 15.24.3 本轮唯一实质修复：定价闸门口径漂移导致的过时测试

**症状**：`invocation_route_planning::sticky_route_with_missing_prices_falls_back_to_regular_planning` 失败：

```
left:  ["priced-provider"]      // 期望：粘性失效后回退，选中「有价」候选
right: ["priced-provider", "unpriced-provider"]   // 实际：候选多了一个
```

（该断言写的是 `assert_eq!(vec!["priced-provider"], actual)`，`left` 是期望值。）

**归因（三个相关文件都无未提交改动 ⇒ 必为提交态既存）**：

- 测试与粘性闸门实现 `route_planning.rs` —— clean。
- 定价闸门实现 `upstream_route_selector.rs` —— clean。
- 追溯历史：`991f5d7d`（"fix(pricing): fail-safe price loading and sticky pricing pre-gate"）**引入**粘性定价预闸门与该测试（`route_planning.rs` +84、测试 +122）。
- `a74e06de`（HEAD，"feat(cloudrouter): add common/h5 agent scaffolds…"）**改写了闸门口径**（`upstream_route_selector.rs` +247，新增 `pricing_identity.rs` +448），但**只改了 API 资源类路径**（`plan_upstream_account_route` +23 行），**没同步粘性路径的测试**。

**根因（实现注释里的显式契约）**：`a74e06de` 把「已定价」的判据从

> **要求 procurement cost**（按 supplier+account 精确匹配的 upstream-cost 价）

改成

> **只要求 customer billing 价**（`resource_is_priced_for_billing`，`Quoted`/`Rated`/`NonChargeable` 均算已定价，只有 `Unrated` 算缺口）

并写明理由：

> `PricingResolver` downgrades a missing upstream cost to "no procurement cost" and explicitly must never fail customer billing … **Requiring it made every direct-official account unrouteable** whenever the catalog shipped only the `official` price side — which is exactly what `sdkwork-models` ships today (**1245 `official` + 13 `reference` prices, zero `upstream`**).

**活库独立验证（本轮实测，与注释一致）**：

```
pricing_rate: total=2150  with_vendor=2150  with_provider=2150  with_account=0
billability: chargeable | 2150
resource_type: model | 2150
```

⇒ **价格本只有客户端计费价（按 vendor），`account_id` 全为 NULL，零采购成本价。** 所以新口径**必须**放宽，否则**全部路由失败**。旧测试用 `PriceSide::UpstreamCost` 构造「有价 / 无价」，在新契约下**失去区分能力** ⇒ 过时测试。

**诊断手法（可复用）**：在 `ensure_route_is_priced` 内临时 `eprintln!` 打印 `PriceService::resolve` 的 `status` 与 `has_price`，单跑该测试 `-- --nocapture`：

```
DIAG probe: catalog_key=openai/gpt-4o-mini supplier=unpriced-provider account=3005 \
  meter=LlmInputToken => status=Ok(Quoted) has_price=true
```

一个**没写任何价**的 supplier 解析出 `Quoted` —— 因为 `base_catalog()` 里 `openai/gpt-4o-mini` 有**目录级 `OfficialReference` 客户价**（不绑 account），被兜底复用。诊断完**立即还原**（`git status` 确认该文件回到 clean）。

**修复（两处，都在测试文件内）**：

1. **用新契约的口径表达「无价」**：让粘性绑定的 `catalog_key` 指向一个价格本从不定价的键（`openai/gpt-4o-mini-unpriced`），使探针得到 `Unrated`；同时**不再往目录里注册这个模型**（否则常规规划会多出候选），路由仍挂在请求自身的 catalog key 下。
2. **把断言从「绑定精确候选向量」提升为「绑定契约语义」**：

```rust
let suppliers = plan.candidates.iter().map(|c| c.supplier_code.as_str()).collect::<Vec<_>>();
assert_eq!("priced-provider", suppliers.first().copied().expect("at least one candidate"),
    "the invalid sticky binding must not stay pinned; got {suppliers:?}");
assert!(!matches!(suppliers.first(), Some(&"unpriced-provider")),
    "the unpriced sticky target must not head the plan; got {suppliers:?}");
```

理由：候选里**可以**出现无价账号，因为常规规划会为**同组的每个可调用账号**合成候选（`upstream_route_selector.rs:857-861` 的 `synthetic_model_route_from_account_route`，当账号无匹配模型路由时**凭空合成**一条）。原断言在「组内只有一个账号有模型路由」时恰好为单元素，属**绑定实现细节**。

**结果**：该测试文件 **11 passed / 0 failed**。

### 15.24.4 七能力真库 e2e：4/7 抵达，3/7 既存缺口

`crates/sdkwork-cloudrouter-edge-runtime/tests/media_provider_native_db_e2e.rs` 需要
`SDKWORK_DATABASE_URL`（缺失则干净跳过）。**只给 `SDKWORK_DATABASE_*` 分项不够**，必须显式导出 URL：

```bash
set -a && . ./.env.postgres; set +a
export SDKWORK_DATABASE_URL="postgresql://$SDKWORK_DATABASE_USERNAME:$SDKWORK_DATABASE_PASSWORD@127.0.0.1:5432/$SDKWORK_DATABASE_NAME?sslmode=disable"
```

| 能力 | 端点 | 结果 |
|---|---|---|
| 图片 image | `/v1/images/generations` | ✅ 抵达厂商 |
| 视频 video | `/kling/v1/videos/generations` | ✅ 抵达厂商 |
| 配音 voice | `/elevenlabs/v1/text-to-speech/…` | ✅ 抵达厂商 |
| **音效 sfx** | `/elevenlabs/v1/sound-generation` | ✅ **抵达厂商（本轮修复直接兑现）** |
| 音乐 music | `/suno/v1/music/generations` | ❌ `model not found: suno.music_generation` |
| 数字人 avatar | `/kling/v1/videos/avatar` | ❌ `no generation mode for api code kling.avatar` |
| 动作模仿 motion | `/kling/v1/videos/motion-control` | ❌ 同上 |

**3 个缺口的独立取证**：

```
ai_model_api_endpoint 端点绑定数:
  sfx.sound          6     ← 本轮修复
  suno.music        24     ← 另一会话新增（端点改名）
  openai.video      63
  suno.music_generation  0    ← 旧端点已无绑定
  kling.avatar           0    ← 无绑定
  kling.motion_control   0    ← 无绑定

suno/* 模型 status: suno-v5/v5.5/v6/v6-mini/v6-wild 全部 = 0（禁用）
```

⇒ **音乐缺口** = `suno/*` 模型在 sdkwork-models 里**全部 `status=0`**（第 22 轮已登记的既存状态）；**数字人 / 动作** = 这两个端点**无模型绑定**（"avatar 契约对齐"既存待办）。

**均为既存缺口，与本轮 sfx 修复无因果关系**：本轮改动只新增 `api.sfx.sound` 这一个资源、`"sfx"` 一个描述符分支、以及 5 条 classifier/passthrough 臂。

**注意**：报错里 `supplier alibaba, account 1863158413733175571` 是另一会话新增 alibaba 账号后进入候选池所致，**属并发改动的中间状态**，不代表分组绑定错误 —— 实测账号分组绑定正确：

```
kling.video  → kling-default (kling)   ✅
kling.image  → kling-default (kling)   ✅
suno.music   → suno-default  (suno)    ✅
suno.audio   → suno-default  (suno)    ✅
```

### 15.24.5 sfx 修复的活库终态（独立复核）

```
ai_model（capabilities @> ["sfx"]）：6 条
  elevenlabs/eleven_text_to_sound_v2 | capability=1 | api_format=vendor_native
  kuaishou/kling-sound-t2a           | capability=1 | api_format=vendor_native
  kuaishou/kling-sound-v2a           | capability=1 | api_format=vendor_native
  stability_ai/stable-audio-2.5-sfx  | capability=1 | api_format=vendor_native
  vidu/audio1.0-text2audio           | capability=1 | api_format=vendor_native
  vidu/audio1.0-timing2audio         | capability=1 | api_format=vendor_native

ai_model_capability：6 条，capability_code="sfx"，endpoint_formats=["vendor_native"]，supported=true  ✅

ai_model_api_endpoint：
  每个模型一条 sfx.sound        (status=1，活)   ✅
  每个模型另留一条 openai.chat_completions (status=0，软删残渣)   ← 只增不删的投影残留

ai_api_endpoint:  sfx.sound | openai_compatible | POST | /v1/sound/generate | status=1
ai_resource:      api.sfx.sound | api_code=sfx.sound | modality_code=sound-effect | status=1
                  另有 6 条 model.<vendor>.<key>.sfx | api_code=sfx.sound | modality_code=sfx
分组授予:         api.openai_compatible.all ✅ / official.kling.full ✅
                  official.stability_ai.full ✅ / official.vidu.full ✅
```

**两个细节值得记住**：

- `ai_api_endpoint.sfx.sound` 的 `protocol_code` 是 **`openai_compatible`**，而**种子声明是 `vendor_native`**（`model_catalog_import.rs` 的 `EndpointDescriptor`）。二者不一致但不影响调用：真实分发协议由请求的 `api_code` 经 `protocol_code_from_api_code` 推导。
- 6 条 `status = 0` 的 chat 残渣是本轮之前就登记的「投影只增不删」隐患的可见实例。运行时无影响（快照读 `ai_upstream_supplier_endpoint`，从不读 `ai_model_api_endpoint`），但确认**确实存在**。

### 15.24.6 活库 schema 纠错（避免再次靠猜列名）

本轮多次因**猜列名**踩坑（`vendor_uuid` / `model_uuid` / `supplier_code` / `group_code` / `resource_group_code`）。正确口径：

| 表 | 关键列 |
|---|---|
| `ai_model` | `id`(bigint) / `uuid`(varchar) / **`vendor_id`(bigint)** / **`vendor_code`(varchar)** / `capability`(int) / `capabilities`(jsonb) / `api_format` |
| `ai_model_vendor` | `id`(bigint) / `uuid`(varchar) / `vendor_code` |
| `ai_model_api_endpoint` | **`model_id`(bigint)** / `catalog_key` / `vendor_code` / `endpoint_code` / `status` / `sort_order` |
| `ai_model_capability` | `model_id`(bigint) / `capability`(int) / **`capability_code`** / `endpoint_formats`(jsonb) / `supported` |
| `ai_api_endpoint` | `endpoint_code` / `protocol_code` / `method` / `path_template` |
| `ai_resource` | `resource_code` / `api_code` / `modality_code` / `resource_type` / `sort_order` |
| `ai_resource_group` | **`group_code`**（不是 `resource_group_code`） |
| `ai_resource_group_item` | `resource_group_code` / `resource_code`（`resource_id` 常为 NULL） |
| `ai_upstream_account` | `supplier_code`（不是 `vendor_code`）/ `account_code` / `status` / `default_base_url` |
| `ai_upstream_account_group` | `group_code` / `group_type` |
| `ai_upstream_account_group_member` | **`account_group_id`** + `account_id` + `priority` + `enabled` |
| `pricing_rate` | `meter_code` / **`vendor_code`** / **`provider_code`** / `account_id` / `billability` / `resource_type` / `catalog_key` / `conditions` / `tier` / 生效窗口（**无 `supplier_code`，无 `price_side`**） |

> **纪律**：`information_schema.columns` 一次列全，别逐次试错。本轮为此多花了 6 次往返。

### 15.24.7 两套「分组」不要混淆

| 体系 | 表 | 形态 | 例 |
|---|---|---|---|
| **资源分组** | `ai_resource_group` (+`_item`) | `official.<vendor>.full` / `api.*` / `relay.*` | `official.kling.full` 授予 `api.kling.avatar`、`api.sfx.sound` |
| **账号分组** | `ai_upstream_account_group` (+`_member`) | **`<vendor>.<modality>`** | `kling.video` → `kling-default`；`suno.music` → `suno-default` |

链路是 **资源分组 → 账号分组 → 账号**。查「某能力为什么路由到某账号」时，**两侧都要查**。本轮一开始在 `official.kling.full` 里找账号成员，得到「空」，差点误判为缺口 —— 实际账号成员在 `kling.video` 里。

### 15.24.8 七个能力在真库中的端点绑定现状（2026-09-18 17:15）

```
openai.video              63
suno.music                24
sfx.sound                  6   ← 本轮
kling.avatar               0   ← 缺口：数字人
kling.motion_control       0   ← 缺口：动作模仿
suno.music_generation      0   ← 旧端点，已被 suno.music 取代
```

而 `official.kling.full` 资源分组**已授予** `api.kling.avatar` / `api.kling.motion_control` ⇒ **缺口在端点←模型的绑定层，不在资源分组层**。

## §15.25 第 25 轮：图片能力的「vendor 原生 API 全部可调用」收口（2026-09-18）

### 25.1 一句话结论

**图片能力的 49 个模型全部塌陷到唯一的通用端点 `openai.images`，11 个厂商的原生图片 API 一行模型都没绑**
——所以图片链路虽然"可达"（第 23 轮 59/59 全绿），但**永远走不到 vendor 的原生图片接口**，
只是把请求按 OpenAI 兼容格式回放到厂商的 `/v1/images/generations`。
这不是参数小偏差，是**接口定义层的塌陷**。

### 25.2 真库证据（`sdkwork_ai_dev`，2026-09-18）

图片端点共 11 行，其中 `vendor_native` 5 行是**真正的厂商原生接口**：

| endpoint_code | protocol | method | path_template | 有模型绑定吗 |
|---|---|---|---|---|
| `gemini.image_generation` | vendor_native | POST | `/v1beta/models/{model}:generateImages` | **0** |
| `gemini.nano_banana.image_generation` | vendor_native | POST | `/v1beta/models/nano-banana:generateImages` | **0** |
| `jimeng.image_generation` | vendor_native | POST | `/v1/images/generations` | **0** |
| `kling.image_generation` | vendor_native | POST | `/v1/images/generations` | **0** |
| `volcengine.image_generation` | vendor_native | POST | `/api/v3/images/generations` | **0** |
| `vidu.reference_to_image` | vendor_native | POST | `/ent/v2/reference2image` | **0** |
| `openai.images` | openai_compatible | POST | `/v1/images/generations` | **49** |
| `openai.images.edits` / `.generations` / `.variations` | openai_compatible | POST | … | 0 |

绑定分布（塌陷的直接证据）：

```
=== image model bindings: endpoint_code distribution ===
  openai.images | 49 | 0,1     <-- 全部 49 个模型挤在一个通用端点上
```

而模型侧的 vendor 是**目录 vendor code**，与端点前缀是两套命名：

```
alibaba(1) black_forest_labs(11) bytedance(4) google(8) kuaishou(2)
minimax(2) openai(4) runway(13) stability_ai(7) xai(3) zhipu(2)
```

| 目录 vendor code | 该厂商的原生图片端点前缀 | 有别名吗 |
|---|---|---|
| `google` | `gemini.*` | ⚠️ 仅 classifier 里有 `"google" \| "gemini"` |
| `bytedance` | `jimeng.*` | ❌ 无 |
| `kuaishou` | `kling.*` | ❌ 无 |
| （火山）| `volcengine.*` | ❌ 无（目录里没有对应图片 vendor 行）|
| `alibaba` / `minimax` / `runway` / `stability_ai` / `black_forest_labs` / `xai` / `zhipu` | 无原生端点声明 | ❌ 无 |

### 25.3 根因：`model_endpoint_descriptor` 只按 `primary_capability` 分派

两份拷贝（router 侧**读**、`sdkwork-models` 侧**写**）都是同一个形状：

```rust
fn model_endpoint_descriptor(model: &ModelInfo) -> EndpointDescriptor {
    match model.primary_capability.as_str() {
        "image" => EndpointDescriptor { endpoint_code: "openai.images", .. },
        "audio" => EndpointDescriptor { endpoint_code: "openai.audio", .. },
        "music" => EndpointDescriptor { endpoint_code: "suno.music", .. },
        "sfx"   => EndpointDescriptor { endpoint_code: "sfx.sound", .. },
        "video" => EndpointDescriptor { endpoint_code: "openai.video", .. },
        ..
    }
}
```

`match` 的 scrutinee **只有 `primary_capability`**，`vendor_code` 完全没参与。
于是「`google` 的图片模型」和「`volcengine` 的图片模型」拿到**同一个** `EndpointDescriptor`。

三处派生投影全部吃了这个塌陷（`model_catalog_import.rs:748/781/833/948`）：

| 投影函数 | 表 | 后果 |
|---|---|---|
| `catalog_vendor_api_endpoint_projections` | `ai_vendor_api_endpoint` | 每个图片厂商只登记 `openai.images` 一条 |
| `catalog_model_api_endpoint_projections` | `ai_model_api_endpoint` | 每个图片模型绑 `openai.images`，`provider_native_model` = 目录 `model_id` |
| `catalog_ai_resource_projections` | `ai_resource`（`model.*` 行） | `api_endpoint_code` 全部指 `openai.images` |

**关键点**：`sdkwork-models` 的 vendor 声明里 `apiEndpoints` 是**厂商级**的 host + pathPrefix
（`google` → `{google:{host:generativelanguage.googleapis.com,pathPrefix:/v1beta}}`），
**不是**端点级契约——它表达不了「这个厂商的图片走 `:generateImages`」。
所以塌陷不是"声明写错了"，是**声明里根本没有这个维度**。

### 25.4 与分类器的不对称：上下游说的不是同一件事

`provider_native_classifier.rs`（及 `passthrough.rs` 镜像）**已经**按 vendor + path 正确分派：

```rust
"google" | "gemini" if gemini_model_action_matches(path, "generateimages") => {
    if path.contains("/nano-banana:") { "gemini.nano_banana.image_generation" }
    else { "gemini.image_generation" }
}
"kling"     if path == "/v1/images/generations" => "kling.image_generation",
"jimeng"    if path == "/v1/images/generations" => "jimeng.image_generation",
"volcengine" if path == "/api/v3/images/generations" => "volcengine.image_generation",
"vidu"      if path == "/ent/v2/reference2image" => "vidu.reference_to_image",
```

**分类器是 vendor-aware 的（对），目录投影是 vendor-blind 的（错）。**
链路两侧对「图片该走哪个 api_code」给出**互相矛盾**的答案：

- 目录侧（选路 / 计价 / 候选生成）认为：`api_code = openai.images`
- 分类器侧（真实回放）认为：`api_code = gemini.image_generation`（当 vendor=google 时）

第 23 轮的链路审计之所以全绿，是因为它校验的是「**通用面**能否走通」
（`GENERIC_ENDPOINT_SERVING_VENDORS` 把 `openai.images` 视为「可服务于任何 image vendor」）。
**通用面确实能走通，但原生面从未被选中。**

### 25.5 无绑定 / 停用绑定的模型（8 + 1）

```
black_forest_labs/flux-2-dev            -> <none>
google/gemini-2.5-flash-image           -> <none>   (routingState=catalog_only, 已弃用)
google/imagen-4.0-fast-generate-001     -> <none>   (lifecycle=retired)
google/imagen-4.0-generate-001          -> <none>   (lifecycle=retired)
google/imagen-4.0-ultra-generate-001    -> <none>   (retired)
openai/gpt-image-1.5                    -> <none>
runway/gemini_image3.1_flash            -> <none>
stability_ai/sdxl-1-0                   -> <none>
google/gemini-3.1-flash-image-preview   -> openai.images (status 0)
```

其中 3 个 `imagen-4.0-*` 是**官方已关停**（2026-08-17 公告，价表已删），`gemini-2.5-flash-image` 已弃用
——这 4 个「无绑定」是**正确的**（退役模型不该有启用绑定），但它们仍应在审计里被显式归类为
「退役 ⇒ 不要求绑定」，而不是混在"缺绑定"里。

真正**需要修**的是：`black_forest_labs/flux-2-dev`、`openai/gpt-image-1.5`、
`runway/gemini_image3.1_flash`、`stability_ai/sdxl-1-0`，以及 `gemini-3.1-flash-image-preview` 的 `status=0`。

### 25.6 本轮处置

见 25.7 起的落地记录。

### 25.7 落地（2026-09-18）

#### A. `model_endpoint_descriptor` 加 vendor 维度（两份拷贝）

新增 `vendor_native_image_descriptor(vendor_code)` + `model_image_endpoint_descriptor(model)`，
`match` 的 `"image"` 臂改为调用后者，不再返回常量：

| catalog vendorCode | 原生 endpoint_code | method | path_template | 来源 |
|---|---|---|---|---|
| `google` / `gemini` | `gemini.image_generation` | POST | `/v1beta/models/{model}:generateImages` | 已有 |
| `bytedance` / `jimeng` | `jimeng.image_generation` | POST | `/v1/images/generations` | 已有 |
| `kuaishou` / `kling` | `kling.image_generation` | POST | `/v1/images/generations` | 已有 |
| `volcengine` | `volcengine.image_generation` | POST | `/api/v3/images/generations` | 已有 |
| `vidu` | `vidu.reference_to_image` | POST | `/ent/v2/reference2image` | 已有 |
| `black_forest_labs` / `bfl` | `black_forest_labs.image_generation` | POST | `/v1/flux-{model}` | **本轮新增** |
| `runway` / `runwayml` | `runway.image_generation` | POST | `/v1/text_to_image` | **本轮新增** |
| `stability_ai` / `stability` | `stability_ai.image_generation` | POST | `/v2beta/stable-image/generate/{mode}` | **本轮新增** |

判定规则（三条，优先级从高到低）：

1. `apiFormat == "google_gemini"` ⇒ `gemini.image_generation`（该 apiFormat 本身就是 Gemini 原生面）。
2. `apiFormat == "vendor_native"` 且 vendor 在表内 ⇒ 该 vendor 的原生端点。
3. 其余（含 `apiFormat == "openai_compatible"`，以及 vendor 不在表内）⇒ `openai.images`。

**规则 3 后半段是关键**：vendor 没有原生端点时**必须**留在通用面，
否则会选到一条从未注册的路由（`50201`）。这与第 23 轮「通用面可服务任意 image vendor」的结论不冲突——
通用面仍在，只是不再是**唯一**选项。

#### B. 三个新厂商的原生端点声明（真实文档核对）

| vendor | 官方文档 | method | path | 异步模型 | poll |
|---|---|---|---|---|---|
| black_forest_labs | `docs.bfl.ai` | POST | `/v1/flux-2-pro` 等，**一模型一路径** | `polling_url` 返回 | `GET /v1/get_result?id=` |
| runway | `docs.dev.runwayml.com` | POST | `/v1/text_to_image`，body `model` 区分 | task id | `GET /v1/tasks/{id}` |
| stability_ai | `platform.stability.ai` | POST | `/v2beta/stable-image/generate/{core,ultra,sd3}` | **同步** | 无 |

三个厂商都**不是**「OpenAI 兼容面」，其 `vendor.json` 的 `supportedProtocols` 就是 `["vendor_native"]`
且 `apiEndpoints` 为空——本轮把这条声明背后缺失的端点契约补上了。

落地清单（一处不漏）：

| 层 | 文件 | 内容 |
|---|---|---|
| 资源声明 | `data/ai-routing/resources/vendor-native-resources.json` | +5 行（3 个 image + 2 个 task_query） |
| 资源组 | `data/ai-routing/resource-groups/official-provider-groups.json` | 3 个 `official.<vendor>.full` 补授端点（其 description 原本就写着"land 后加上"） |
| 分类学 | `.../application/ai_route_taxonomy.rs` | +5 条（image 用 `media_task`，task_query 用 `account`；stability 同步故用 `model`） |
| 分类器 | `provider_native_classifier.rs` | +5 臂 |
| 分类器镜像 | `crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs` | +5 臂（与上一条逐字一致） |

#### C. 兼容面厂商的 `apiFormat` 修正

`alibaba`(1) / `minimax`(3) 的图片模型声明 `vendor_native`，但两家 `vendor.json` 都**只**声明
`openai` 端点（`dashscope.aliyuncs.com/compatible-mode/v1`、`api.minimaxi.com/v1`），
没有厂商原生图片端点。把这些模型的 `apiFormat` 从 `vendor_native` 改成 `openai_compatible`，
消除「声明说原生、投影落通用」的矛盾。`xai` / `zhipu` 已是 `openai_compatible`，无需改动。

改动 4 个文件，每个**恰好 1 行**（已 `git diff --stat` 验证：4 files changed, 4 insertions(+), 4 deletions(-)）。

#### D. 真库结果（`refresh-catalog --force` 后）

```
=== image model bindings: endpoint_code distribution ===
  black_forest_labs.image_generation | 10 | 1   <- 新增
  gemini.image_generation            |  3 | 1   <- 新增
  kling.image_generation             |  2 | 1   <- 新增
  openai.images                      | 49 | 0,1 <- 39 行 status=0（被正确退役）+ 10 行仍有效
  runway.image_generation            | 12 | 1   <- 新增
  stability_ai.image_generation      |  6 | 1   <- 新增
```

**48 个图片模型的活动绑定唯一性验证**：

```
=== A. active (status=1) binding count per image model ===
  ZERO   black_forest_labs/flux-2-dev          (catalog_only)
  ZERO   google/gemini-2.5-flash-image         (deprecated)
  ZERO   google/gemini-3.1-flash-image-preview (retired)
  ZERO   google/imagen-4.0-{fast-,ultra-}generate-001 (retired ×3)
  ZERO   openai/gpt-image-1.5                  (catalog_only)
  ZERO   runway/gemini_image3.1_flash          (catalog_only)
  ZERO   stability_ai/sdxl-1-0                 (catalog_only)
  -> ok=48 zero=9 multi=0

=== C. enabled 图片模型缺活动绑定的数量 ===
  (空)  <- 每一个 enabled 图片模型都有且仅有一个活动绑定
```

**结论：第 23/25 轮担心的「8 个无绑定 + 1 个 status=0」是假阳性。**
那 9 个模型全部是 `catalog_only` / `deprecated` / `retired`，目录**故意**不给它们启用绑定，
`status=0` 是 `deactivate_postgres_rows_not_in` 正确退役的痕迹，不是残留。

#### E. 端点面全链路就绪

| 层 | 结果 |
|---|---|
| `ai_resource`（5 行新端点） | 全部 `status=1` |
| `ai_api_endpoint`（registry） | method / path / protocol 正确 |
| 资源组授权 | 5 行全部落在对应 `official.<vendor>.full` |
| `ai_vendor_api_endpoint` | 原生端点 `status=1`，`openai.images` 已被退役为 `status=0` |
| `ai_upstream_account` | 3 家账号齐全，`status=1` |
| 账号分组 `<vendor>.image` | 成员存在，`priority=100`，`enabled=true` |
| `pricing_rate` | 图片计价齐全：BFL 23 / runway 46 / stability_ai 8 |

#### F. 门禁与审计

| 门禁 | 结果 |
|---|---|
| `ai-routing-consistency` | **passed**（classifier 36 = passthrough 36 臂，64 个 api code 全部被分类学认识，49 臂全部被评估） |
| `audit-api-chain-reachability.mjs` | **passed 64/64**（原 59/59；新增 5 条端点全部可达） |
| `audit-model-route-reachability.mjs` | **287/287 可达，0 不可达** |
| `router-service` lib 测试 | **517 passed / 0 failed** |
| `sdkwork-models` catalog-repository 测试 | **11 passed / 0 failed** |

新增守卫测试 **两份拷贝各一个**：

- `image_models_bind_to_their_vendor_native_endpoint`
  - 8 个有原生端点的 vendor ⇒ 各自的 native endpoint；
  - `apiFormat = "google_gemini"` ⇒ `gemini.image_generation`（google / gemini 两种拼写都测）；
  - 5 个无原生端点的 vendor（openai / xai / zhipu / minimax / alibaba）⇒ 即使声明 `vendor_native` 也必须留在 `openai.images`；
  - 8 个有原生端点的 vendor 若声明 `openai_compatible` ⇒ 不得被强制成原生。

#### G. 审计表的口径修正（顺手清的一个假信号）

`audit-model-route-reachability.mjs` 的 `generic endpoint coverage` 表是按
`primaryCapability → 固定 endpoint` 的**静态**映射生成的，修复后它仍打印
「48 models primary=image -> openai.images」，会**误导读者以为绑定没变**。
已改为读真库 `ai_model_api_endpoint` 的活动绑定并逐 endpoint 拆分：

```
    48 models  primary=image  fallback=openai.images  ...
           15 of those bound to openai.images
           12 of those bound to runway.image_generation   <== vendor-native
           10 of those bound to black_forest_labs.image_generation   <== vendor-native
            6 of those bound to stability_ai.image_generation   <== vendor-native
            3 of those bound to gemini.image_generation   <== vendor-native
            2 of those bound to kling.image_generation   <== vendor-native
```

⇒ **48 个图片模型里 33 个（69%）真正打到厂商原生 API**（修复前 0 个）；
其余 15 个是诚实走 OpenAI 兼容面的厂商（openai / bytedance / xai / zhipu / alibaba / minimax）。

#### H. 一个踩过的坑（登记）

给分类器加臂时把 `//` 注释写在**臂与 `=>` 之间**，被门禁的臂正则捕获成该臂的 `condition`，
报成「3 arm(s) this gate cannot model」。**这与第 24 轮记的是同一个坑**：
解释性注释必须放在函数 doc comment 里，不能夹在臂中间。

### 25.8 待办（图片之后）

按用户指定顺序继续：**视频 → 音频 → 音乐 → 音效 → 动作 → 数字人**。
每个能力都要问同样三个问题：

1. 该能力的模型绑定的 endpoint 是否与**它自己声明的 vendor / apiFormat** 一致？
2. 不一致时，是该 vendor 有原生端点却没接上，还是该 vendor 本就只有兼容面（那要改 `apiFormat`）？
3. 新接的原生端点，资源声明 / 资源组 / 分类学 / 分类器双拷贝 / 价表 / 账号分组是否一处不漏？

顺带留意：`bytedance` 的图片模型声明 `openai_compatible`，但 `bytedance`(`jimeng`) 在分类器里
**有** `jimeng.image_generation` 臂——视频能力跟进时要核一遍 `bytedance` 的模态映射是否也需要收敛。

## §15.26 视频能力：端点坍缩（capability=5）+ 三个连带缺陷

> 起因：用户指令「做完图片的接下来处理视频」。沿用图片（§15.25）的三问协议。

### 15.26.1 先纠正一个前提：capability 是整数，且我上一轮读错了能力

`ai_model.capability` 是 **INTEGER**，不是字符串；**不存在 `capability_code` 列**。
实测取值（2026-09-18）：

| int | 能力 | 模型数 |
|---|---|---|
| 1 | `chat` | 134 |
| 2 | `image` | 57 |
| 3 | `audio` | 46 |
| 4 | `music` | 27 |
| **5** | **`video`** | **74** |
| 6 | `embedding` | 9 |

还有一个更容易踩的坑：**catalog 表住在命名 schema `sdkwork_ai_dev` 里，不在 `public`。**
`.env.postgres` 的 `SDKWORK_DATABASE_SCHEMA=sdkwork_ai_dev` 就是依据。不写 schema 限定
时查询会命中 `public` 下的另一套 `plus_*` 应用表，**既不会报错也不会返回行**，看起来像
"这张表是空的"。本轮一度据此得出错误结论，记录在此以免复现。

### 15.26.2 缺陷本体：`"video"` 臂对 13 个 vendor 硬编码同一个端点

与图片同源、同形状。`model_endpoint_descriptor` 的 `video` 臂是一个**常量**：

```rust
"video" => EndpointDescriptor {
    endpoint_code: "openai.video", protocol_code: "openai_compatible",
    path_template: "/v1/videos", ...
},
```

后果（改前实测）：

- **60 条活跃 video 绑定全部落在 `openai.video`**（`POST /v1/videos`）。
- 其中 **55 条自己声明 `apiFormat = "vendor_native"`**。
- 而 `ai_resource` / `vendor-native-resources.json` **早已声明 9 个厂商原生 video 端点**，
  `provider_native_classifier.rs` **早已能路由它们的每一条路径**——它们只是
  **`ai_model_api_endpoint` 行数为 0**，所以没有任何模型能走到。
- `ai_api_endpoint` 里也确实有这些端点行（`status=1`），同样是孤儿。

这与 §15.25 的图片缺陷是同一个函数的同一种写法，只是晚了一个能力。

### 15.26.3 修法：加 `vendor_native_video_descriptor`（双拷贝同步）

按 **catalog `vendorCode`** 取原生端点（注意端点侧名字与 catalog 名字不同：
`bytedance`→`jimeng.*`、`kuaishou`→`kling.*`、`google`→`gemini.*`）：

| catalog vendor | 原生端点 | method | path |
|---|---|---|---|
| `google` / `gemini` | `gemini.video_generation` | POST | `/v1beta/models/{model}:generateVideos` |
| `kuaishou` / `kling` | `kling.text_to_video` | POST | `/v1/videos/text2video` |
| `bytedance` / `jimeng` | `jimeng.video_generation` | POST | `/v1/videos/generations` |
| `volcengine` | `volcengine.video_generation` | POST | `/api/v3/contents/generations/tasks` |
| `vidu` | `vidu.start_end_to_video` | POST | `/ent/v2/start-end2video` |

裁决规则与图片一致：`apiFormat == "google_gemini"` 直通 gemini 端点；`vendor_native`
且该 vendor 有原生端点 → 原生；其余（含 `openai_compatible`）→ `openai.video`。

**不在表内、保持兼容面的 vendor（诚实结论，catalog 未声明其原生视频 API）**：
`alibaba`、`black_forest_labs`、`luma_ai`、`minimax`、`pixverse`、`runway`、`zhipu`、
`xai`、`openai`。合计 35 条绑定。

双拷贝（同 §15.25）：`sdkwork-cloudrouter-router-service`（读侧）+ `sdkwork-models`
`crates/sdkwork-models-catalog-repository-sqlx`（写侧），外加 `endpoint_modality_code`
补齐 video 端点的 modality 映射（否则 `ai_modality_api_endpoint` 投影丢链）。

守卫测试 `video_models_bind_to_their_vendor_native_endpoint` **双拷贝各一份**：
断言 5 个 vendor→原生端点、`google_gemini` 双拼写、9 个无原生端点 vendor 保持
`openai.video`、5 个 vendor 声明 `openai_compatible` 时不被强制原生、以及 9 个端点
都映射到 `video` modality。

### 15.26.4 改后实测

| 项 | 改前 | 改后 |
|---|---|---|
| video 活跃绑定落在 `openai.video` | 60 | 35（25 条迁到原生） |
| `jimeng.video_generation` | 0 | **8** |
| `kling.text_to_video` | 0 | **7** |
| `gemini.video_generation` | 0 | **5** |
| `vidu.start_end_to_video` | 0 | **5** |
| 不变量 `ok / zero / multi` | — | **60 / 0 / 0** |

⇒ **25 of 60（42%）video 模型真正走到厂商原生 API**（图片是 33/48 = 69%）。
`ai-routing-consistency` 通过；`per-api-chain-reachability` 64/64。

### 15.26.5 连带缺陷 ②：retirement sweep 只关 `status`，不关 `routing_state`

`deactivate_removed_catalog_rows` 把 catalog 已删除的行置 `status = 0`，但
**`sdkwork_model_is_publicly_active` 根本不看 `status`**——它读的是
`release_stage` / `shelf_state` / `routing_state`。于是"已退役"的模型
`routing_state` 仍是 1，"是否可路由"判定依然为真，而它的绑定已经全被停用。

实测出 **8 行**矛盾（`status=0` 且 `routing_state=1`，全部 release/shelf/routing = 1/1/1）：

| capability | catalog_key |
|---|---|
| video(5) | `kuaishou/kling-v3-probe` |
| video(5) | `openai/sora-2`、`openai/sora-2-pro` |
| audio(3) | `openai/gpt-4o-transcribe`、`-diarize`、`gpt-4o-mini-transcribe`、`gpt-realtime-mini`、`whisper-1` |

`kuaishou/kling-v3-probe` **根本不在 `sdkwork-models` 里**（全仓 grep 无命中），
是早期探测实验留下的 DB 孤儿；但因为 `routing_state=1`，它成了整个 74 模型 video 能力
里**唯一"可路由却零绑定"**的模型——一个纯属自造的假缺口。

修法：sweep 在置 `status = 0` 的同时**清 `routing_state = 0`**，使 `status=0 ⇒ 不可路由`
自洽。因为 sweep 也跑在 `ai_model_pricing` 等没有该列的表上，用
`postgres_table_has_routing_flags()` 先查 `information_schema` 再决定是否拼该列。
sweep **只在 `sdkwork-models` 有一份**，无双拷贝漂移风险。

同时把 DB 里现存 8 行一次性修正（`UPDATE ... SET routing_state=0, shelf_state=0
WHERE status=0 AND routing_state=1` → `UPDATE 8`）。

### 15.26.6 连带缺陷 ③：27 个官方账号全部 `status=0` —— seed 从未应用

修完 video 后 `per-api-chain-audit` 变成 **FAILED (64 of 64)**，
每行都是 `NO callable account for vendor X — this API returns 50201`。

根因不是本轮改动，而是 DB 里 **27 个 `ai_upstream_account` 全部 `status=0`、
`default_base_url = NULL`、凭据 27 条全 `status=0`**。而代码里
`DEFAULT_VENDOR_UPSTREAM_ACCOUNTS`（**27 个 vendor 账号**，带真实 base_url、
占位凭据、vendor-modality 分组绑定）**已经写好了**（本会话未提交改动的一部分）。
即：**seed 代码存在，但从未应用到这台 DB**（`ops_seed_history` 显示上次 seed
是 2026-09-15）。

`db:ensure` 直接跑会报：

```
ai routing seed: ... the bundled vendor default accounts exist but carry no
active credential — the seed skips credential writes when no upstream-credential
key ring is configured; set SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING or
..._KEY_RING_FILE and re-run
```

两次踩坑记录：

1. **`SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING_FILE` 传了没用**——该变量
   经 `pnpm`→`node scripts/manage-cloud-router-database.mjs`→`cargo run` 多层转发，
   实测未生效；改为传**内联** `SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING`
   才被读到。ring 内容取自 `.sdkwork/secrets/upstream-credential-key-ring.development.json`。
   （`MIN_KEY_BYTES = 32`，dev ring 的 `activeKey` 39 字符，长度没问题。）
2. **必须显式传 `--environment development`。** `scripts/manage-cloud-router-database.mjs`
   的 `environment` 默认 `null`，于是 `SDKWORK_CLOUDROUTER_ROUTER_ENVIRONMENT` 不被
   export，installer 回落到 `DEFAULT_INSTALL_ENVIRONMENT`（"production"），
   **把每个 bundled vendor 账号都 seed 成 disabled**。该脚本第 254 行附近的注释
   恰好记录了这条历史坑，但它自己没给默认值——正是本轮 27 账号全 0 的直接原因。

命令（可复现）：

```bash
export SDKWORK_DATABASE_URL="postgresql://sdkwork_ai_dev:sdkworkdev123@127.0.0.1:5432/sdkwork_ai_dev?sslmode=disable"
export SDKWORK_CLOUDROUTER_UPSTREAM_CREDENTIAL_KEY_RING='{"activeKeyId":"development-local-v1","activeKey":"-5PDMse125expXoiazBLwqMAj4M-pjE5eKv-lUjqoBA","fingerprintKey":"kChhxyXLmDK40OSw_BoLV5Yo_61uwocZ5fnUqB-z4iU","decryptionKeys":[]}'
node scripts/manage-cloud-router-database.mjs ensure --environment development
```

结果：`{"status":"installed","environment":"development","changed":true}`。
27 账号 → `status=1`，27 条凭据 → `status=1`，83 条分组成员不变。

**连带效果：`per-api-chain-audit` 从 FAILED 64/64 变成 passed 64/64；
`audit-model-route-reachability` 的 `callable accounts` 从 0 变成 27，
`reachable 287 / not reachable 0`。**

### 15.26.7 本轮交付清单

| 文件 | 改动 |
|---|---|
| `services/.../infrastructure/sql/model_catalog_import.rs` | 加 `vendor_native_video_descriptor` + `model_video_endpoint_descriptor`；`"video"` 臂改为调用；扩 `endpoint_modality_code`；加视频守卫测试 |
| `../sdkwork-models/crates/.../src/model_catalog_import.rs` | 同上（写侧拷贝）+ 同步 `endpoint_modality_code` |
| `../sdkwork-models/crates/.../src/postgres/model_catalog_import.rs` | sweep 退休时清 `routing_state`；加 `postgres_table_has_routing_flags` |
| `scripts/dev/audit-model-route-reachability.mjs` | （§15.25 已改）本次沿用其 live-binding 视图 |
| DB（`sdkwork_ai_dev`） | 8 行矛盾 flags 修正；seed 重放激活 27 账号 + 27 凭据 |

门禁全绿：`ai-routing-consistency` passed、`per-api-chain-audit` 64/64、
`audit-model-route-reachability` 287/287、router lib 测试通过、writer 22 passed / 1 ignored。

### 15.26.8 下一个能力（音频）的入口线索

- `capability = 3` 即 `audio`（46 模型）。**注意 `sfx`（音效）不在 capability 表里**——
  `"sfx"` 是 `primaryCapability` 字符串，其端点 `sfx.sound` 已存在且 6 个模型已绑定
  （见 §15.26.4 的审计输出）。
- 已知 audio 侧问题：§15.26.5 里 5 个 `openai/*` 转写/实时模型是 `status=0` 孤儿
  （已顺手修 flags，但模型本身仍不在 catalog）。
- music：`suno.music` 15 个模型绑定，但 `suno/*` 除 `minimax.music_generation` 外
  多为兼容面，需按三问协议核。

---

## §15.27 第 25 轮收口：音乐 / 数字人 / 动作模仿三条路由的定价与 generation mode

**结论先行：七能力真库 e2e 从 4/7 变为 7/7，全部「抵达厂商（链路完整）」。**
修复口径按目录对齐（用户裁决）——3 条失败里有 **1 条是探针写错了目标**（suno），
**2 条是真缺陷**（计费声明丢 meter、generation mode 词表缺两个模态）。

### 15.27.1 先用 e2e 逐条取证（修复前的 4/7）

```
=== 抵达厂商（链路完整）===
  [图片 image]  /v1/images/generations            => HTTP 502
  [视频 video]  /kling/v1/videos/generations      => HTTP 502
  [配音 voice]  /elevenlabs/v1/text-to-speech/... => HTTP 502
  [音效 sfx]    /elevenlabs/v1/sound-generation   => HTTP 502
=== 网关内部缺口（链路断裂）===
  [音乐 music]           ApiCodeIsNotAGenerationMode? / meter 不相交
  [数字人 avatar]        ApiCodeIsNotAGenerationMode { api_code: "kling.avatar" }
  [动作模仿 motion]      ApiCodeIsNotAGenerationMode { api_code: "kling.motion_control" }
```

三条失败根因 **互不相同**，必须分开诊断，不能合并成一个「定价不全」的结论。

### 15.27.2 根因一：音乐（suno）——探针把目标指向目录刻意停用的路由

关键发现（推翻了我原先「sdkwork-models 缺 suno 定价」的假设）：

`models/suno/global/models/suno-v5.json` 显式声明：

```json
{ "lifecycle": "deprecated", "releaseStage": "deprecated",
  "shelfState": "hidden",   "routingState": "catalog_only" }
```

`suno-v6*` 则是 `lifecycle = "catalog_only"` + `shelfState = "hidden"`。
**DB 忠实镜像了这组声明**：`release_stage=3`（deprecated）/ `2`（catalog_only）、
`shelf_state=2`（hidden）、`routing_state=0`（非 enabled）、`status=0`。
5 个 suno 模型全部如此；`suno/suno-v5`、`suno-v5.5` 绑 `suno.music` 但 `status=0`，
`suno-v6*` 连绑定都没有。

⇒ **suno 音乐模型是「目录级刻意停用」，不是定价缺失。** 原来的音乐 e2e 断言
「suno 能到达厂商」，恰好是目录反面。这不是缺陷，是**探针选错了目标**。

对照证据：`minimax/music-3.0` 计价锚在 `api_result`，而 `api_result` **在**
`AdapterUsageLines` 的声明米表里 ⇒ 交集成功 ⇒ 可用；`suno/suno-v5` 计价锚在
`music_output_second`，**不在** ⇒ 永远失败。这解释了「为什么同为音乐
minimax 通、suno 不通」这个此前无法闭合的观察。

### 15.27.3 根因二：音乐（真缺陷）——`declared_meters_for` 把自己目录价屏蔽掉

`BillingMode::ExternalUsageLine` + `BillingQuantitySource::AdapterUsageLines`
原先只返回 `[ApiResult, ApiItem, ApiRequest]`，**丢掉了 `billing.meter`**
（分类学声明的 `MusicOutputSecond`）。于是即便定价键解析正确，声明米表与
目录 `[music_output_second]` 也**不相交** ⇒ `catalog_pricing_meters` 为空 ⇒
`RouteDeclared` 保留 `ApiRequest`。

修复：`declared_meters_for` 现在**首先**推入 `billing.meter`，与
`quantity_source` 分支无关：

```rust
BillingMode::ExternalUsageLine => {
    if let Some(meter) = billing.meter.clone() { meters.push(meter); }
    match billing.quantity_source {
        BillingQuantitySource::FixedRequest => { meters.push(BillingMeter::ApiRequest); }
        BillingQuantitySource::AdapterUsageLines => {
            meters.push(BillingMeter::ApiResult);
            meters.push(BillingMeter::ApiItem);
            meters.push(BillingMeter::ApiRequest);
        }
        _ => { /* 同上三项 */ }
    }
}
```

这是**通用缺陷**，影响所有「目录按非 api_* 米计价的 ExternalUsageLine 路由」，
不止 suno。

### 15.27.4 根因三：数字人 / 动作模仿——generation mode 词表缺两个模态

`video_generation_mode_for_api_code` 只认 4 个模态
（`text_to_video` / `image_to_video` / `reference_to_video` / `multi_shot`），
`kling.avatar` 与 `kling.motion_control` 的后缀匹配不上 ⇒ `None` ⇒
`ApiCodeIsNotAGenerationMode`。

而**价本早已为它们发布了档位**（`kuaishou/kling-v3`，全球 USD/秒）：
`audio_res_720p` 0.126 / `audio_res_1080p` 0.168 / `audio_res_4k` 0.420（数字人）、
`motion_res_720p` 0.126 / `motion_res_1080p` 0.168（动作模仿）。
⇒ **有价无档，价格被打成孤儿**。

`decide_video_pricing_tier` 的判定顺序（关键，决定了报错长什么样）：
1. `priced.is_empty()` → `MeterHasNoTierConditionedRate`（**先于**模态检查）；
2. `video_generation_mode_for_api_code` → `ApiCodeIsNotAGenerationMode`；
3. 该模态无档位 → `NoProfileForGenerationMode`；
4. 档位不相交 → `DeclaredTierNotPriced`。

修复（一处代码 + 三处目录）：

| 位置 | 改动 |
|---|---|
| `catalog.rs` `video_generation_mode_for_api_code` | 词表加 `avatar`、`motion_control` |
| `models/kuaishou/{global,cn}/model-video-profiles/kling-v3.json` | 各 +108 行：4 个 profile（avatar 720p/1080p、motion_control 720p/1080p），`durationPolicy=continuous`、`outputAudio=true`、**`isDefault=false`** |
| `models/kuaishou/{global,cn}/model-video-profiles/kling-ai-avatar-v2.json` | `generationMode` `image_to_video` → `avatar`（语义纠正：该端点本就是数字人，旧标签把音频输入藏了） |
| `schemas/model-video-profiles.schema.json` + `specs/video-generation-profile.spec.json` | 词表同步加两个模态 |
| `tools/validate-catalog.mjs` `GENERATION_MODE_INPUTS` | `avatar: ["image","audio"]`、`motion_control: ["image","video"]`（该规则是**析取**：`requiredInputs.some(...)`） |

**踩坑记录**：`ai_model_video_profile` 约束「每文件仅一个 `isDefault`」
（`model_video_profile.default.duplicate`）——我一度给两个新 profile 置 `true`，
与既有 `t2v_range_1080p` 冲突报错 ×2，改为 `false` 后通过。

### 15.27.5 测试与门禁

`catalog.rs` 里那条钉住旧词表的测试（`api_code_that_is_not_a_generation_mode_reports_that_specific_gap`）
按预期红了（`left: Some(NoProfileForGenerationMode{generation_mode:"avatar"})`
vs `right: Some(ApiCodeIsNotAGenerationMode{api_code:"kling.avatar"})`）。
拆成三条：模态识别、档位选择（断言 `tier_code()==Some("audio_res_1080p")` 且
`gap.is_none()`）、非模态 api_code 仍报 `ApiCodeIsNotAGenerationMode`（改用
`kling.image_generation` 作样本）。**11 passed / 0 failed。**

| 门禁 | 结果 |
|---|---|
| router lib `video_pricing_tier_tests` | **11 passed / 0 failed** |
| router lib 全量 | 520 passed / 1 failed → 修掉那条钉旧行为的 → 全绿 |
| `validate-catalog.mjs`（sdkwork-models） | **0 errors；77 warnings = 基线完全一致** |
| `db:refresh-catalog --force` | `synced: true`，346 models，1100 prices |
| **七能力真库 e2e** | **7 / 7 抵达厂商**（原 4/7） |

目录基线证明手法：把 7 个改动文件 `git stash push` 后重跑 `validate-catalog`，
得 77 warnings（47 `tier.unreachable` + 30 `tier.ambiguous`）；`stash pop` 后再跑
仍是 77 / 47 / 30，**且没有任何 warning 指向新增的两个 profile** ⇒ 零回归。

### 15.27.6 修复后的决定性结果

```
=== 抵达厂商（链路完整）===
  [图片 image]   /v1/images/generations                      => HTTP 502
  [视频 video]   /kling/v1/videos/generations                => HTTP 502
  [音乐 music]   /minimax/v1/music_generation                => HTTP 502
  [配音 voice]   /elevenlabs/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM => HTTP 502
  [音效 sfx]     /elevenlabs/v1/sound-generation             => HTTP 502
  [数字人 avatar] /kling/v1/videos/avatar                     => HTTP 502
  [动作模仿 motion] /kling/v1/videos/motion-control          => HTTP 502
=== 已拨号但网络不可达（环境，非网关缺口）===
=== 网关内部缺口（链路断裂）===
test seven_media_capabilities_reach_their_vendor_on_the_real_catalog ... ok
test result: ok. 1 passed; 0 failed; ignored; 0 measured; 0 filtered out; finished in 4.60s
```

HTTP 502 来自 dev 占位凭据（厂商侧真实拒绝），在探针里归类为「链路完整」。
音乐用例同时改指 MiniMax（`minimax/music-cover`），并按
`MiniMaxMusicGenerationRequest.required = ["model"]` 补上 `model` 字段。

### 15.27.7 本轮交付清单

| 文件 | 改动 |
|---|---|
| `services/.../application/invocation/pricing_identity.rs` | `declared_meters_for` 先推 `billing.meter` |
| `services/.../infrastructure/sql/catalog.rs` | generation mode 词表 +2；测试 1 拆 3 |
| `crates/.../tests/media_provider_native_db_e2e.rs` | 音乐用例 suno → minimax，补 `model` |
| `../sdkwork-models/models/kuaishou/{global,cn}/model-video-profiles/kling-v3.json` | +4 profile |
| `../sdkwork-models/models/kuaishou/{global,cn}/.../kling-ai-avatar-v2.json` | mode → `avatar` |
| `../sdkwork-models/schemas/model-video-profiles.schema.json` | enum +2 |
| `../sdkwork-models/specs/video-generation-profile.spec.json` | 词表 +2 |
| `../sdkwork-models/tools/validate-catalog.mjs` | `GENERATION_MODE_INPUTS` +2 |
| `../sdkwork-models/models/index.json` | `build-index.mjs` 重生成（×2） |

### 15.27.8 音频能力的入口线索（下一轮）

- `capability = 3` 即 `audio`（46 模型）。`sfx`（音效）**不是 capability 行**——
  它是 `primaryCapability` 字符串，端点 `sfx.sound` 已存在且 6 个模型已绑定。
- 需按三问协议核：(a) 模型绑定是否与其声明的 vendor/apiFormat 一致；
  (b) 不一致时厂商有无未接的原生端点，还是只有兼容面（则改 `apiFormat`）；
  (c) 新原生端点是否贯通资源声明/资源组/分类学/两份分类器/价本/账号组，无遗漏。
- 已知 audio 侧遗留：5 个 `openai/*` 转写/实时模型是 `status=0` 孤儿
  （flags 已顺手修，但模型本身仍不在 catalog 的 routable 面）。

---

## §15.28 第 26 轮：音频（audio）能力的 vendor 原生端点收口

**结论先行：46 个音频模型里原本 40 个（全部有绑定者）坍缩在通用 `openai.audio`，
其中 14 个自己的 `apiFormat` 就是 `vendor_native`；两个已声明的原生音频端点
（`elevenlabs.text_to_speech`、`volcengine.speech`）绑定数为 0。修复后
`elevenlabs.text_to_speech` = 5、`gemini.live` = 1、`elevenlabs.sound_generation` = 1。**

与前两轮（图片 §15.25、视频 §15.26）**同型第三例**：`model_endpoint_descriptor`
只按 `primary_capability` 选端点，忽略 `apiFormat` 与 `vendor_code`。

### 15.28.1 取证：绑定分布

```
=== 46 audio 模型的 endpoint 绑定分布（修复前）===
   openai.audio             vendor=bytedance      fmt=vendor_native        count=2
   openai.audio             vendor=elevenlabs     fmt=vendor_native        count=8
   openai.audio             vendor=google         fmt=google_gemini        count=6
   openai.audio             vendor=minimax        fmt=vendor_native        count=6
   openai.audio             vendor=openai         fmt=openai_compatible    count=17
   openai.audio             vendor=xiaomi         fmt=openai_compatible    count=1
   <none>                   vendor=elevenlabs     fmt=vendor_native        count=3   （st=0 退役）
   <none>                   vendor=xiaomi         fmt=openai_compatible    count=3   （st=0 退役）
```

**后果不是装饰性的**：ElevenLabs 的 TTS 请求被规划到 `/v1/audio` 并携带 OpenAI 请求体，
而分类器对 `elevenlabs` 只认 `/v1/text-to-speech/{voice_id}` 与 `/v1/sound-generation`
—— 所以 ElevenLabs 的 TTS 调用**永远无法**被分类到 `elevenlabs.text_to_speech`，
一个已声明的路由都到不了。

同时 `volcengine.speech`（`/api/v3/audio/speech`）已声明资源、已被分类器路由、
已被 `official.volcengine.full` 授予，却**零模型绑定**。

### 15.28.2 判断依据：只有「已贯通端到端」的端点才可绑定

`data/ai-routing/resources/vendor-native-resources.json` 中 `cap=audio` 的条目**只有 5 条**：

| apiCode | path | 分类器臂 | 修复前绑定 |
|---|---|---|---|
| `volcengine.speech` | `/api/v3/audio/speech` | ✅ | **0** |
| `elevenlabs.text_to_speech` | `/v1/text-to-speech/{voice_id}` | ✅ | **0** |
| `elevenlabs.sound_generation` | `/v1/sound-generation` | ✅ | **0** |
| `gemini.live` | `/v1beta/live/sessions` | ✅ | 0 |
| `sfx.sound` | `/v1/sound/generate` | ✅ | 6 |

**minimax / bytedance / xiaomi 没有声明的原生音频端点**。为它们编造路径
（如 `/v1/t2a_v2`、`/api/v1/tts`）会造出「有绑定无资源、无门禁、无分类器臂」的孤儿路由
—— 正是本审计要消灭的形态。⇒ 对它们 `openai.audio` 是**诚实答案**。

### 15.28.3 修复

新增两个函数（**两份拷贝**：router 读侧 + `sdkwork-models` 写侧），
并从 sfx 臂拆出 `model_sfx_endpoint_descriptor`：

```rust
// 只列「已贯通端到端」的厂商；其余落 openai.audio
fn vendor_native_audio_descriptor(vendor_code: &str) -> Option<EndpointDescriptor> {
    match vendor_code {
        "elevenlabs" => /* elevenlabs.text_to_speech, /v1/text-to-speech/{voice_id} */,
        "volcengine" => /* volcengine.speech, /api/v3/audio/speech */,
        _ => return None,
    }
}

fn model_audio_endpoint_descriptor(model: &ModelInfo) -> EndpointDescriptor {
    // 1. google_gemini + audio 入 + audio 出 → gemini.live（唯一已声明的 Google 音频原生面）
    // 2. 转写（audio 入 / text 出）→ openai.audio（合成原生面答不了它）
    // 3. vendor_native + 厂商有原生音频端点 → 原生；否则 → openai.audio
}
```

`model_sfx_endpoint_descriptor`：**elevenlabs 是例外** —— 它的分类器臂刻意不含 sfx 路由，
`/v1/sound-generation` 分类到更具体的 `elevenlabs.sound_generation`。
把它的 sfx 模型绑到通用 `sfx.sound` 会规划到 `/v1/sound/generate`（ElevenLabs 不答此码）。

`endpoint_modality_code` 补 `gemini.live → audio`。

### 15.28.4 效果（仅统计 `status=1`）

| 端点 | 修复前 | 修复后 |
|---|---|---|
| `openai.audio` | 40 | **29** |
| `elevenlabs.text_to_speech` | 0 | **5** |
| `gemini.live` | 0 | **1** |
| `elevenlabs.sound_generation`（sfx） | 0 | **1** |
| `sfx.sound` | 6 | 5 |

三类**刻意留在 `openai.audio`** 的情形（已固化为守卫测试）：

1. **转写**（`scribe_v2*`、`gemini-*-transcribe*`）：audio 入 / text 出，合成原生面答不了；
   项目也未声明任何原生转写路由。
2. **`apiFormat = openai_compatible`**：模型自己的声明优先，它收到的是 OpenAI 请求体。
3. **无声明原生端点的厂商**（minimax / bytedance / xiaomi）。

### 15.28.5 ⚠️ 踩坑：`refresh-catalog --force` 把 27 个账号打回 `status=0`

本轮**再次**踩到 §15.26 已记录的坑。跑完 `pnpm db:refresh-catalog --force` 后
`per-api-chain-audit` 由 **64/64 变成全红**，报错是**每个 vendor** 都
`NO callable account ... this API returns 50201`；DB 里 `ai_upstream_account` 27 行全部
回到 `status=0`（分组 `enabled=t` 的 83 条不变）。

修法（与 §15.26 相同）：

```bash
node scripts/manage-cloud-router-database.mjs ensure --environment development
# → {"status":"installed",...,"changed":true}
```

之后 `per-api-chain-audit` 恢复 **64/64**。

⇒ **标准动作：`db:refresh-catalog` 之后必须补 `ensure --environment development` 再跑门禁。**
出现「每个 vendor 同时缺账号」时，先查 `ai_upstream_account.status`，不要怀疑自己的改动。

### 15.28.6 三个查询陷阱

1. **`current_schema` 是 `sdkwork_ai_dev` 而非 `public`** ——
   `information_schema ... where table_schema='public'` 会**全部返回空**，看起来像表不存在。
2. **`ai_model` 没有 `model_code` 也没有 `primary_capability` 列**：标识列是
   `catalog_key`/`model`；能力是 `capability`（int）+ `capabilities`（jsonb）。
   数端点绑定要 join **`ai_model_api_endpoint`**，不是 `ai_resource_binding`。
3. **查绑定必须过滤 `status=1`**：import 的 sweep（`deactivate_postgres_rows_not_in`）
   把被替换的旧行置 `status=0` 而**不删**。不过滤会看到「一个模型两个端点」的**假重复**
   —— 本轮一度据此误判为「sweep 缺失」，实际 sweep 工作正常。

### 15.28.7 门禁

| 门禁 | 结果 |
|---|---|
| router lib 单测 | **524 passed / 0 failed** |
| `sdkwork-models-catalog-repository-sqlx` 单测 | **22 passed / 1 ignored** |
| `api:ai-routing-consistency:check` | passed |
| `api:chain-reachability:check` | **64/64** |
| `audit-model-route-reachability` | **287/287**，27 callable accounts |
| `validate-catalog.mjs` | **ok: true；77 issues = 基线一致**（47 `tier.unreachable` + 30 `tier.ambiguous`），0 errors |
| 七能力真库 e2e | **7/7**（音频改动后仍绿） |

### 15.28.8 音效（sfx）与音乐（music）——同型第四、五例，同一轮一并收口

**音效（`primaryCapability = "sfx"`，6 模型）**：原本 6 个都绑 `sfx.sound`，
但 `elevenlabs/eleven_text_to_sound_v2` 绑错了 —— ElevenLabs 的分类器臂**刻意不含**
sfx 路由（`/v1/sound-generation` 分类到更具体的 `elevenlabs.sound_generation`）。
绑到通用 `sfx.sound` 会把请求规划到 `/v1/sound/generate`（ElevenLabs 不答此码）。
修复后：`elevenlabs.sound_generation` = 1，`sfx.sound` = 5。

**音乐（`capability = 4`，27 模型 / 15 active）**：15 个 active 绑定**全部**落在
`suno.music`，包括 `elevenlabs/music_*`、`google/lyria-*`、`mureka/*`、
`stability_ai/stable-audio-*`、`bytedance/seed-music-gensong-v4`、`minimax/music-cover`
—— 没有一个是 Suno。

**关键澄清：`suno.music` 是兼容面，不是厂商端点。** 其资源 `api.suno.music` 的
displayName 就是 "Music Generation (Suno-protocol)"，由 `api.openai_compatible.all`
（兼容组）授予，`defaultBillingMeter = music_output_second` —— 与
`openai.audio` / `openai.videos` 同构。

音乐侧**唯一**有声明原生端点的厂商是 `minimax`（`minimax.music_generation`，
`/v1/music/generations`，由 `official.minimax.music` 授予），而它**零模型绑定**。
修复后 `minimax/music-cover` → `minimax.music_generation`；其余厂商
（无声明原生音乐 API）保持在 Suno-protocol 兼容面，**不编造路径**。

`suno` 自身的模型全部 `status=0`（`lifecycle = catalog_only` / `deprecated`、
`shelfState = hidden`、`routingState = catalog_only`）⇒ 绑定为空，符合目录意图。

### 15.28.9 用户给定顺序的完成度

| 能力 | 状态 |
|---|---|
| 图片 image | ✅ §15.25 |
| 视频 video | ✅ §15.26 |
| **音频 audio** | ✅ §15.28 |
| **音乐 music** | ✅ §15.28.8（`minimax.music_generation` 已绑；其余为兼容面） |
| **音效 sfx** | ✅ §15.28.8（`elevenlabs.sound_generation` 已绑） |
| 动作模仿 motion | ✅ §15.27 |
| 数字人 avatar | ✅ §15.27 |

⇒ **用户所列 7 类能力全部收口完成**。五类媒体端点坍缩（图片 / 视频 / 音频 / 音乐 / 音效）
是**同一个根因的五张脸**（`model_endpoint_descriptor` 只按 `primary_capability` 选端点，
忽略 `apiFormat` 与 `vendor_code`），已各自加守卫测试固化：

| 守卫测试 | 覆盖 |
|---|---|
| `image_models_bind_to_their_vendor_native_endpoint` | 图片 |
| `video_models_bind_to_their_vendor_native_endpoint` | 视频 |
| `audio_models_bind_to_their_vendor_native_endpoint` | 音频 + 音效 |
| `music_models_bind_to_their_vendor_native_endpoint` | 音乐 |


---

## 15.29 第 29 轮：把五张脸收成一条闭合不变式（#46 的落地）

### 15.29.1 为什么要做这一步

§15.25–§15.28 用**五条按能力分开的守卫测试**固化了同一个根因的五张脸
（`model_endpoint_descriptor` 只按 `primary_capability` 选端点，忽略 `apiFormat` 与
`vendor_code`）。但那五条守卫**各自手写厂商清单** —— 这正是同一个缺陷能连出五次的
原因：手写清单只覆盖作者当时想到的厂商，**新厂商会静默回到通用面**，直到有人发现。

所以本轮的交付物不是第六张脸，而是**把空间闭合**：不再枚举，改为扫全空间 + 判定式。

### 15.29.2 闭合不变式（两份拷贝各一条守卫）

新增 `every_capability_binds_only_to_a_declared_vendor_native_endpoint`，位于
`model_catalog_import.rs` 的 `mod tests`（**两份拷贝都加**）。它扫
`(vendor, apiFormat, capability)` 的**全组合**：

| 维度 | 取值 |
|---|---|
| vendor | 目录 25 家 + 3 个端点侧别名（`gemini`/`kling`/`jimeng`）= 29 |
| apiFormat | `vendor_native` / `google_gemini` / `openai_compatible` |
| capability | `image` / `video` / `audio`(3 组模态) / `music` / `sfx` = 7 组 |

对每个组合跑 `model_endpoint_descriptor`，断言三件事：

1. **不编造路由。** 凡 `protocol_code == "vendor_native"`，其
   `(endpoint_code, path_template)` 必须**双双命中**声明表
   （`vendor-native-resources.json` 的镜像）。只比 code 不比 path 会放过
   「code 对、路径无臂可答」的漂移 —— 即 `gemini.image_generation` /
   `kling.task_query` 历史上出过的形状。
2. **端点必有模态。** `endpoint_modality_code` 必须能命名它，否则计费侧的计量单位
   回退到通用媒体表，**计错单位**。
3. **反方向：声明不能悬空。** 声明表里每个端点都必须能被某个描述符绑定，或在
   `NOT_BOUND_BY_DESCRIPTOR` 台账里**具名登记**。否则就是「项目 ships 了一条
   没有功能能用的路由」—— `minimax.music_generation` 曾经的状态。

另加**反空洞断言**：扫描必须同时产出 native 与 generic 两种描述符，否则
「全部返回通用面」的重构会以空洞方式通过。

### 15.29.3 守卫第一次跑就抓到的东西（这正是它的价值）

新守卫第一次运行即 FAILED，报 4 个声明端点无描述符可绑：

```
gemini.nano_banana.image_generation, kling.avatar,
kling.image_to_video, kling.motion_control
```

**逐条取证后判定为「合法不绑定」，不是缺陷**：

| 端点 | 证据 |
|---|---|
| `kling.avatar` / `kling.motion_control` | 有分类器臂（两份拷贝）；有资源授权（`admin-api-groups.json`）；`crates/sdkwork-cloudrouter-edge-runtime/tests/avatar_motion_routing_e2e.rs` **真库 e2e 路由这两条到目标厂商**（`with_catalog_key("kling.avatar")` / 期望账户 4201） |
| `kling.image_to_video` / `gemini.nano_banana.image_generation` | 有分类器臂、有资源授权；是**生成服务的显式入口**（调用方直接选 api code），不由模型的 `primaryCapability` 选中 |
| 真库实测 | 4 个端点的 `ai_model_api_endpoint` 绑定数 **= 0** |

结论：它们是**特性入口面**（数字人 / 动作控制 / 图生视频 / nano-banana），由生成服务
带显式 api code 驱动，**不是**「某模型绑定到某端点」的形态。绑一个 `video` 模型到
avatar 面会让**所有** video 模型去答 avatar 请求 —— 所以正确的处置是**在台账里具名
登记原因**，而不是补绑定。

### 15.29.4 反向对照：Node 侧门禁（第 9 项）

守卫把声明表**内嵌**在 Rust 测试里（测试期无文件系统访问），这是**第二份真相源**。
没有任何东西比对的第二真相源比没有守卫更糟：seed 加一条会让守卫**误严**，
手写一条没有资源支撑的会让它**误松**。

所以在 `tools/check-cloudrouter-ai-routing-consistency.mjs` 加了**第 9 项**：
把两份拷贝的内嵌表与 `vendor-native-resources.json` **双向**比对
（漏项 = 误严；多项 = 误松）。

**作用域必须是那一个文件，不是全部 seed**：通用兼容面（`openai.images` /
`openai.audio` / …）住在别的 seed 文件里，且是描述符**拒绝走原生时**的返回值 ——
它们**本来就不该**出现在「已声明原生」集合里。第一版用全部 seed（64 条）比对，
报出 32 条假缺口，就是踩了这条。

### 15.29.5 本轮我自己踩的坑（两个，都是取证后修的）

1. **`str_as_str` 不稳定库特性。** `EndpointDescriptor` 的字段全是 `&'static str`，
   写 `descriptor.endpoint_code.as_str()` 会命中未稳定的 `str_as_str`
   （issue #130366），**两份拷贝都报 E0658**。直接去掉 `.as_str()` 即可
   （`&str` 本身就能比）。
2. **正则要求元组单行，漏掉 5 条。** rustfmt 把最长的 5 个元组折成多行
   （`(
 "code",
 "path",
)`），我的 `\("([^"]+)",\s*"([^"]+)"\)` 因此
   只读到 32/37 条，误报「漏 5 条」。修法是把正则改成容忍任意空白
   （`\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*,?\s*\)`）—— **表的换行格式是 rustfmt 的事，
   比对不该依赖它**。

### 15.29.6 门禁终态读数（第 29 轮实测）

| 门禁 | 结果 | 对比上一轮 |
|---|---|---|
| `cargo test -p sdkwork-cloudrouter-router-service --lib` | **526 passed / 0 failed** | 525 → +1（闭合守卫） |
| `cargo test -p sdkwork-models-catalog-repository-sqlx` | **23 passed / 0 failed / 1 ignored** | 22 → +1（闭合守卫） |
| `api:ai-routing-consistency:check` | **passed**（新增第 9 项：37 = 37） | 新增检查项 |
| `api:chain-reachability:check` | **passed（64/64）** | 不回退 |
| `audit-model-route-reachability` | **287 reachable / 0 not reachable**，27 callable accounts | 不回退 |
| `validate-catalog.mjs` | **ok: true；77 issues = 基线一致**（47 unreachable + 30 ambiguous），0 errors | 不回退 |

### 15.29.7 与 #46 的关系

#46「扩展三层守卫到全部 25 个 vendor 并验证」**已由此闭合**：不再逐个 vendor 加断言，
而是用全空间扫描把 25 家（+3 别名）一次性覆盖，并让「声明 ↔ 描述符」互为约束。
新增两条防线：Rust 侧闭合不变式（含反方向悬空检查），Node 侧内嵌表 ↔ seed 双向比对。

## 15.30 第 30 轮：协议面（Anthropic / Codex）的跨 vendor 对齐

### 15.30.1 §15.29 闭合不变的射程盲区

§15.29 的闭合不变式扫的是 `(vendor, apiFormat, capability)` ——
即**媒体能力**（image / video / audio / music / sfx）的端点绑定。
它**不覆盖「协议面」这一维度**：`anthropic_messages` / `openai_responses`
这类「同一族请求用它自己的客户端协议」的面，不在 `primaryCapability` 的枚举里，
所以 §15.29 全绿的同时，9 家声明 `anthropic_messages` 的 vendor 里
**8 家根本没有端点 / 授予 / 分类臂**，且没有任何门禁会报。

本轮的交付物是把这一维度也闭合。

### 15.30.2 根因：分类臂按 vendor 硬编码

```
provider_native_classifier.rs / passthrough.rs
  "anthropic" if path == "/v1/messages" => "anthropic.messages"
```

非 anthropic 的 vendor 发同一 wire 路径时落入 catch-all，合成 `<vendor>.messages`
——taxonomy 无此路由 ⇒ `meter: None` + `StatelessFailClosed` ⇒ 计价预检拒绝，
**即使账号、凭据、组、授予全都在**。这与 §15.25–15.29 是同一根因的**第六张脸**：
「同一族能力只在某一个 vendor 上被接线」。

### 15.30.3 判据：目录 `protocolBaseUrls`（不是 vendor 级 `supportedProtocols`）

`sdkwork-models/models/<vendor>/<region>/vendor.json` 的 `protocolBaseUrls`
是仓内真源。逐 region 双向比对 `supportedProtocols` 与 `protocolBaseUrls`：
声明缺 baseUrl **0 家**、有 baseUrl 未声明 **0 家** ⇒ 目录自洽，
缺的是 router 侧六链落地。

9 家的 official anthropic base_url（全部取证，含 `api.deepseek.com/anthropic`、
`open.bigmodel.cn/api/anthropic`、`api.moonshot.cn/anthropic`、
`api.hunyuan.cloud.tencent.com/anthropic`、`api.xiaomimimo.com/anthropic` 等），
wire 路径统一 `/v1/messages`（网关以 `/anthropic/` 命名空间发布，
契约实测 `POST /anthropic/v1/messages`）。

### 15.30.4 六链落地

| 链 | 改动 |
|---|---|
| ① | seed +8 条 `<vendor>.anthropic_messages`，`pathTemplate: /v1/messages` |
| ② | taxonomy +8 条 `model(..., Chat, LlmInputToken)` |
| ③ | 8 个 `official.<v>.full` 各 +1；新增 `api.anthropic.messages` 组（10 条）授给 `default-group` |
| ④ | 两份闭包守卫 `DECLARED_VENDOR_NATIVE_ENDPOINTS` 各 +8（74 = 74） |
| ④′ | 两份 `NOT_BOUND_BY_DESCRIPTOR` 各 +8（协议入口面，无模型能力选中） |
| ⑥ | 两份同构分类器各 +8 臂 |
| — | seed `.v9` → `.v10`，`DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES` 加 `api.anthropic.messages` |

**踩坑（§15.29 已记过、本轮又差点犯）**：注释块被写进 match 体内会让门禁
`parsePathArms` 把它折进上一条 arm 的 chunk，报 `N arm(s) this gate cannot model`。
注释必须放在 `let api_code = match ...` **之上**。

### 15.30.5 `default-group` 授予：链审计能抓、门禁抓不到

门禁只查「声明 ↔ 臂」，**不查「端点 → default-group 可达」**。
补完六链后门禁全绿，但 `audit-api-chain-reachability.mjs` 报 8 条
`default-group-grant: NOT granted`（50201）。这印证了两条工具的分工：
门禁管声明一致性，链审计管端到端可达。`DEFAULT_GROUP_EXTRA_RESOURCE_GROUP_CODES`
的既有注释**早已预言了这一幕**（「OpenAI-compatible vendors such as DeepSeek
declare Anthropic Messages ... so without an anthropic-shaped group grant those
resources are intersected away」），只是一直没有对应的组。

### 15.30.6 Codex / `openai_responses` 面：机制不同，**不**加 vendor 臂

三条独立证据表明 Responses 走 **OpenAI 兼容面**，不是 per-vendor 命名空间：

1. `invocation_http.rs:572` —— `path.starts_with("/v1/")` 一律交
   `OpenAiResourceClassifier`；Responses 发布在 `/v1/responses`，**不经过 vendor 分类器**。
2. `ai_route_taxonomy.rs:329` 已有别名
   `model("openai_compatible.responses", "openai.responses", ...)`。
3. `api.openai_compatible.all` 已含 `api.openai.responses`，且 `default-group` 已绑定该组。

且 5 家声明 `openai_responses` 的 vendor，其 `protocolBaseUrls.openai_responses`
与 `openai_compatible` **逐字节相同** ⇒ 是同一 base URL 上的请求体形状变体。

按 skill §6 硬判据（**模型 `apiFormat` 而非 vendor 级声明**），这 5 家模型全是
`openai_compatible`（deepseek 8 / xai 12 / alibaba 20 / bytedance 41 / stepfun 3），
**诚实留在兼容面**，不编 vendor 臂。残留缺口属**目录内容**（缺 `openai_responses`
模型），不属路由接线，见 `docs/audit/protocol-face-vendor-alignment-evidence-2026-09-20.md`。

### 15.30.7 门禁终态

| 门禁 | 前 | 后 |
|---|---|---|
| classifier / passthrough arms | 41 / 41 | **49 / 49** |
| seeded api codes | 92, 0 unknown | **100, 0 unknown** |
| vendor-native coverage | 66 = 47 + 19 | **74 = 55 + 19** |
| closure guard（两份源） | 66 vs 66 | **74 vs 74** |
| `audit-api-chain-reachability` | 92/92 | **100/100, 0 broken** |
| `audit-model-route-reachability` | 289 / 0 | **289 / 0**（不回退） |
| router-service `--lib` | 526 | **534 passed / 0 failed** |
| `per_api_chain_e2e` | — | **2 passed / 0 failed**（真库探针无 gap） |
| `validate-catalog` | ok: true | **ok: true** |

落库 `pnpm db:ensure` → `{"status":"installed","changed":true}`。
## 15.31 LLM 面上游拨号 URL 形状缺口（静态可达 ≠ 拨号正确）

采集日期：2026-09-20。触发：用户要求「确保所有 vendor 的 LLM 模型和资源配置正确，反复回归直到正确为止」。

### 15.31.1 缺口性质：第四类射程盲区

§15.29 的闭合不变式覆盖 `(vendor × apiFormat × capability)` **媒体能力**维度；
§15.30 补了**协议面**（`anthropic_messages` / `openai_responses`）的六链落地。
本节暴露的是**第三层**：**这些链路的「上游拨号 URL」从未被任何验证构造过。**

| 验证层 | 读数（改动前） | 为什么漏 |
|---|---|---|
| `check-cloudrouter-ai-routing-consistency` | passed | 只查**声明 ↔ arm ↔ 授予**静态一致，不构造 URL |
| `audit-api-chain-reachability` | 100/100 reachable | 终点是「有账号可路由」，不校验拨号 URL |
| `audit-model-route-reachability` | 289 / 0 | 同上，终点是「模型落到官方账号路由」 |
| `per_api_chain_e2e` | 2 passed / 0 failed | 占位凭据，**不发真实出网请求** ⇒ 拼错的 URL 不暴露 |
| `validate-catalog` | ok: true, 0 errors | 只校验目录自身，**不跨仓比对活库端点** |

⇒ 五层全绿，而**真实调用必然 404**。

### 15.31.2 根因（逐跳代码级取证）

```
① 活库 ai_upstream_supplier.protocols = '[]'（全部 27 家）
② 活库 ai_upstream_supplier.default_base_url 全空
③ 活库 ai_upstream_account.protocols  = '[]'
④ 活库 ai_upstream_account.default_base_url 全空
   ⇒ route_planning.rs:316 调 resolve_upstream_base_url，
     解析链 account.protocols[P] → account.default → supplier.protocols[P]
     → supplier.default → route_base_url 的**前四跳全部失效**，
     只剩第五跳 route_base_url = ai_upstream_supplier_endpoint.base_url（裸主机）
⑤ provider_passthrough_transport.rs#build_uri 朴素拼接：
     format!("{}{}", self.base_url(), path_and_query)
⑥ 入站 /anthropic/v1/messages 经 split_provider_passthrough_path +
   is_standard_path_namespace（"anthropic" 在标准集内）⇒ 上游 path = /v1/messages
   ⇒ 目录 vendor.json 的 protocolBaseUrls.<proto>.pathPrefix **从不参与拼接**
```

**核心判据**：目录 `protocolBaseUrls` 同时给出 `host` 与 `pathPrefix`；
`pathPrefix` 必须在端点 `base_url` 里落地，否则拼出的 URL 缺段。

### 15.31.3 全量比对（42 个 vendor×协议 组合，**只有 openai 一家正确**）

| 档 | 数量 | 含义 |
|---|---|---|
| `OK` | 2 | openai（`api.openai.com/v1` 自带 `/v1`，与目录 pathPrefix 一致） |
| `PREFIX-MISSING` | 26 | host 对但缺 pathPrefix |
| `HOST-WRONG` | 14 | 连 host 都不对 |

**巧合正确的一类（暂可用，但非设计）**：入站路径自带 `/v1`，且该 vendor 的兼容面
恰好也在 `/v1` ⇒ `deepseek` / `moonshot` / `tencent` / `stepfun` / `xai` 的
openai_compatible 面拼出的 URL 是对的。**一旦 vendor 改用非 `/v1` 前缀即断。**

### 15.31.4 破坏性用例（pathPrefix ≠ `/v1`，无法靠巧合救回）

| vendor | 目录 pathPrefix | 活库 base_url | 拼出的上游 URL | 应为 |
|---|---|---|---|---|
| **alibaba** | `/compatible-mode/v1` | `https://dashscope.aliyuncs.com` | `.../v1/chat/completions` | `.../compatible-mode/v1/chat/completions` |
| **baidu** | `/v2` | `https://qianfan.baidubce.com` | `.../v1/chat/completions` | `.../v2/chat/completions` |
| **zhipu** | `/api/paas/v4` | `https://open.bigmodel.cn` | `.../v1/chat/completions` | `.../api/paas/v4/chat/completions` |
| **bytedance** | `/api/v3` | `https://visual.volcengineapi.com` | `.../v1/chat/completions` | `.../api/v3/chat/completions`（host 亦应改为 `ark.cn-beijing.volces.com`） |
| **google** | `/v1beta/openai` | `https://generativelanguage.googleapis.com` | `.../v1/chat/completions` | `.../v1beta/openai/chat/completions` |
| **meituan** | `/openai/v1` | `https://api.meituan.com` | `.../v1/chat/completions` | `.../openai/v1/chat/completions`（host 亦应改为 `api.longcat.chat`） |

⇒ **这 6 家的 LLM chat 面全部打不通**（约 56 个模型）。
另：**`anthropic_messages` 面 8 家全挂**（缺 `/anthropic` 或不含 host 前缀）。
`HOST-WRONG` 中最严重的是 **`xiaomi`**：目录 `api.xiaomimimo.com` vs 活库
`api.xiaomi.com`（**不同域名**）。

### 15.31.5 三份官方文档逐字佐证（目录对、活库错）

| vendor | 官方原文 | 出处 |
|---|---|---|
| deepseek | `base_url` 为 `https://api.deepseek.com/anthropic` | `api-docs.deepseek.com/guides/anthropic_api` |
| zhipu | `ANTHROPIC_BASE_URL: "https://open.bigmodel.cn/api/anthropic"` | `docs.bigmodel.cn/cn/guide/develop/claude` |
| alibaba | base_url「以 `/compatible-mode/v1` 结尾、不含 `/chat/completions`」 | `help.aliyun.com/zh/model-studio/compatibility-of-openai-with-dashscope` |

⇒ **目录是对的，活库端点 `base_url` 是错的。** 取证只能靠官方文档逐字，不能靠域名猜测。

### 15.31.6 机制早已建成、数据从未装载

`database/migrations/postgres/0024_add_upstream_supplier_protocols.up.sql` 的
`purpose` 逐字写着：supplier 可声明多个 LLM 协议
「**with an independent base URL per protocol**」。已具备且完整的部件：

| 部件 | 位置 |
|---|---|
| `LlmProtocolCode` 枚举 | `ports/admin_upstream_store.rs` |
| `ai_upstream_supplier.protocols` / `ai_upstream_account.protocols` JSONB 列 | 迁移 0024 / 0030 |
| admin API 读写 + min/max 校验 + `primary_protocol_code` | `upstream/supplier.rs`、`upstream/account.rs` |
| 解析链协议分支 | `application/upstream_base_url.rs#resolve_upstream_base_url` |
| 生成的 TS 类型 | `llm-protocol-config.ts` |

**唯一缺的是 seed 从未写入该列。**

### 15.31.7 处置提案（**未落库，待确认**）

| 方案 | 内容 | 权衡 |
|---|---|---|
| A. 改端点 `base_url` | 把前缀塞进 `ai_upstream_supplier_endpoint.base_url` | ❌ 一个 vendor 的多协议前缀**各不相同**，单行无法同时满足 |
| **B. 灌 `supplier.protocols`** | 从目录 `protocolBaseUrls` 派生，灌入 `ai_upstream_supplier.protocols` | ✅ **语义正确**，解析链已支持；需 seed 侧新增装载点 |

⇒ 建议 B。改活库属数据变更，按「改活库先问」纪律**只登记不动手**。

### 15.31.8 本轮已落地的回归 pin

`crates/sdkwork-cloudrouter-edge-runtime/src/provider_passthrough_transport.rs` 的 `mod tests`：

| 测试 | 钉住 |
|---|---|
| `build_uri_is_base_url_concatenated_with_path` | 「base_url + path 朴素拼接」，含 `/anthropic` 有无前缀的对照 |
| `normalize_openai_compatible_path_depends_on_base_url_shape` | `/v1` 剥离**取决于 base_url 形状** |

实测：`cargo test -p sdkwork-cloudrouter-edge-runtime --lib provider_passthrough_transport`
→ **6 passed / 0 failed**；`--lib` 全量 **89 passed / 0 failed**。

> **更正**：本节起草时我断言「`.../compatible-mode/v1` 不被识别为 `/v1` 前缀」是**错的**。
> 实测 `Uri::path()` 保留路径段，`path.ends_with("/v1")` 为**真** ⇒ **会被识别并剥离**。
> 已按实测行为修正断言。

### 15.31.9 附：`capabilities` 空数组合法（非缺陷，无需修）

审计发现 11 个 LLM 模型（如 `qwen3.7-flash`）无 `capabilities` 字段。**判定为合法**：

- `schemas/model.schema.json` 的 `required` **不含 `capabilities`**；
- `model_catalog_import.rs` 三处兜底 `if model.capabilities.is_empty() { vec![primary_capability] }`；
- 活库实证：`qwen3.7-flash` 落库 `capabilities = ["chat"]`，与有声明者（`qwen3.8-max`）**一致**。

⇒ 判据以 `primaryCapability` 为准，`capabilities` 是可选冗余。**无需修。**

### 15.31.10 门禁终态（本轮结束时）

| 门禁 | 读数 |
|---|---|
| `check-cloudrouter-ai-routing-consistency --check` | **passed** |
| `audit-api-chain-reachability` | **100/100 reachable, 0 broken** |
| `audit-model-route-reachability` | **289 reachable / 0 not reachable** |
| `cargo test -p sdkwork-cloudrouter-router-service --lib` | **534 passed / 0 failed** |
| `cargo test -p sdkwork-cloudrouter-edge-runtime --lib` | **89 passed / 0 failed**（+2 本轮） |
| `per_api_chain_e2e`（真库） | **2 passed / 0 failed** |
| `validate-catalog` | **ok: true, 0 errors** |

⚠️ **全部绿，而 §15.31.4 的 6 家 + Anthropic 面 8 家仍会 404** —— 这正是本节的要点。

