# 灵感内容生成 · 端到端链路审计（2026-09-16）

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
