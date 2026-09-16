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

本审计全部结论来自静态代码与契约核对，**未执行真实厂商调用**。以下需运行期确认：

- P0-5 的定价 fail-closed 是否在真实部署中拒绝（取决于该环境是否已由管理员配置对应 rate card）。
- 各厂商 passthrough 的 `base_url` 与凭证是否已在目标环境为 `kling` / `vidu` / `suno` / `elevenlabs` 配好路由账户。
- `media_routing_e2e.rs`、`audio_vendor_routing_e2e.rs`、`avatar_motion_routing_e2e.rs` 三个测试的实际通过情况
  （本次未构建；`target/` 体积大、构建耗时）。
- 生成服务异步任务的端到端时延与超时行为。

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
| P1-5 非默认 vendor 轮询 404 | ❌ **未修** | `generations_service.rs:680-681` 仍以 `record.source_provider`（= 适配器默认 vendor，见同文件 `:134` `provider.vendor()`）去匹配 `resolve_provider_by_vendor` |
| P1-7 三份路径→api_code 映射 | ❌ **未修** | `passthrough.rs` / `provider_native_classifier.rs` / `ai_route_taxonomy.rs` 三份拷贝仍在；本次只把「前缀缺漏」这一类加进了门禁 |
| P1-8 无轮询调度器 / webhook | ❌ 未修 | 超出本次范围 |
| P2-1 面校验对未知前缀静默放行 | ⚠️ 部分 | 云路由侧已由 `bootstrap.rs` 断言兜住；`sdkwork-web-framework` 的 `route_manifest.rs:200` `Unknown => {}` 未动 |
| P2-2 两个 e2e 测试无 seed 覆盖 | ❌ 未修 | `audio_vendor_routing_e2e.rs` / `avatar_motion_routing_e2e.rs` 仍未跟踪、仍自建内存 catalog |
| P2-3 … P2-8 | ❌ 未修 | 死代码、TODO 端点、unsplash 假图、空模型 facet、隐式网关约定 |

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

### 8.2 本轮**未能**执行的两项验证（不要当作已通过）

1. **`sdkwork-cloudrouter` 的 `cargo test`**：`rust-toolchain.toml` 钉 `x86_64-pc-windows-msvc`，
   而本机 Windows SDK 只有 Catalogs/Redist、缺 Include/Lib，`cl.exe` 用不了，C 构建脚本
   （`aws-lc-sys`）直接失败。`ai_route_taxonomy` 与 `bootstrap` 两处 Rust 断言改为在 Node 侧
   对同一批源文件复刻（见 8.1），**属于等价核对而非等价执行**，仍需在可用工具链的机器上补跑。
2. **真实厂商调用**：从入站面到第三方 API 的最后一跳本就没有跑过，见第 7 节。

### 8.3 提交后仍未跟踪/未提交的旁支

本次按仓库分组提交了内容生成链路，**以下既有未提交内容不属于本次改动，未纳入提交**：

- `sdkwork-cloudrouter`：`Cargo.toml` / `Cargo.lock`、`crates/sdkwork-cloudrouter-config/src/database.rs`、
  `crates/sdkwork-cloudrouter-observability/src/tracing_setup.rs`、
  `crates/sdkwork-cloudrouter-edge-runtime/src/passthrough.rs` 与 `tests/media_routing_e2e.rs`、
  `scripts/plan-cloud-router-install-packages.mjs`、`scripts/start-cloud-router-production.mjs`、
  `package.json`、`docs/guides/developer/README.md`、`docs/audit/DELETED-FILE-FORENSICS-2026-09-11.md`、
  `data/skills/cloudhub/...`、SDK 内 TS `package.json` 的 `workspace:*` 改写；
  未跟踪：`tests/audio_vendor_routing_e2e.rs`、`tests/avatar_motion_routing_e2e.rs`、
  `scripts/check-rust-dependency-singularity.mjs`、`scripts/rust-dependency-singularity.baseline.json`。
- `sdkwork-generations`：`Cargo.lock`、`crates/sdkwork-generations-provider-adapter/src/gateway.rs`、
  `crates/sdkwork-intelligence-generations-service/src/service/{generations_service,handlers}.rs`。
