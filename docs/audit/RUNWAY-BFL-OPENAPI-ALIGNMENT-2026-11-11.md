# Runway / Black Forest Labs / xAI 契约对齐（2026-11-11）

## 1. 方法

用缓存的厂商机器可读规范做"共有路径 + 请求体顶层字段"比对：

| 厂商 | 规范 | 共有操作 |
| --- | --- | --- |
| xAI | `docs.x.ai/openapi.json`（缓存 `.tmp-vendor-specs/xai.json`） | 5 |
| Runway | `docs.dev.runwayml.com/openapi.json` | 3 |
| Black Forest Labs | `api.bfl.ai/openapi.json` | 1 |

比对脚本：`.tmp/vendor_compare.py <spec> <prefix>`。Runway 的请求体是
`oneOf` 的逐模型变体，脚本把变体属性取并集后再比较。

## 2. xAI

5 个共有操作（`/v1/images/generations`、`/v1/images/edits`、`/v1/videos/generations`、
`/v1/videos/edits`、`/v1/videos/extensions`）请求体顶层字段**完全一致**。

嵌套比对（`.tmp/nested_compare.py`）发现 `videos/edits` 与 `videos/extensions` 的
`video` 对象缺 `file_id`：官方 `VideoUrlOrFileId` 允许 `url` 或 Files API 的
`file_id`（二者互斥）。已拆成：

- `XaiVideoInput`：`url` + `file_id`（编辑/扩展的输入；不强制任何一个）
- `XaiVideoUrl`：`url` + `file_id` + `duration`（任务输出；生成任务响应的 `video`
  也改为引用它）

修复后嵌套比对 `missing=[] extra=[]`。

约束比对（同轮）又补了 xAI 图片的枚举/边界：`n` 1–10 默认 1、`resolution`
`1k/1.5k/2k`、`response_format` 默认 `url`；编辑请求补 `aspect_ratio` 16 值枚举
与 `resolution` 枚举。

## 3. Runway

三个门面（`/runway/v1/text_to_video`、`/runway/v1/image_to_video`、
`/runway/v1/text_to_image`）此前只发布了最小字段集，官方规范里每个模型变体还有大量
可选字段。已按变体并集补齐：

### 3.1 视频（text/image to video）

新增：`contentModeration`、`outputFormat`（13 个容器/编码，含 HDR 系列）、
`proresProfile`、`audio`、`negativePrompt`、`providerSettings`、`references`、
`resolution`（`hd/fhd/768p/1080p/2k` 等）、`referenceAudio`、`referenceVideos`、
`cfgScale`(0–1)、`bitrate`(`standard/high`)、`promptExpansionMode`
(`disabled/balanced/quality`)、`draft`、`draftTaskId`（仅 text-to-video）。

边界同步：`duration` 2–15、`seed` 0–4294967295、`promptText` ≤1000。

### 3.2 图片（text to image）

新增：`contentModeration`、`outputFormat`(`webp/png/jpeg`)、`quality`
(`low/medium/high/auto`)、`background`(`transparent/opaque/auto`)、
`backgroundColor`、`outputCount`(1–10)、`grounding`、`edit`、`preciseEdit`、
`maskUri`、`thinkingLevel`(`minimal/medium/high`)、`colors`。

## 4. Black Forest Labs

`POST /black_forest_labs/v1/flux-3-video` 的官方请求体是按 `mode` 判别的联合：

| mode | 必选 |
| --- | --- |
| `t2v` | `prompt`、`mode` |
| `i2v` | `prompt`、`mode`、`keyframes` |
| `v2v` | `prompt`、`mode`、`start_video` |
| `draft_enhance` | `mode`、`draft_cache` |

旧契约只发布了 `prompt/image/duration/aspect_ratio/resolution/seed`，且 `prompt` 必选，
无法表达 i2v/v2v/draft_enhance。已改为：

- `required: ["mode"]`，`mode` 枚举四值
- 新增 `user`、`version`、`generate_audio`、`safety_tolerance`(0–7)、`draft`、
  `keyframes`、`start_video`、`draft_cache`
- `duration` 支持整数秒或 `auto`（`type: [integer, string]`）
- `resolution` 改为官方枚举 `hd/fhd/qhd/uhd`
- 删除官方没有的 `image`、`seed`

## 5. 验证

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK（含 `test_documents_xai_video_input_file_id`、`test_documents_runway_and_bfl_official_fields`） |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |
| `node tools/audit-vendor-openapi-conformance.mjs` | `{"WIRE_EQUIVALENT":13,"OK":20}` |
| `node tools/check-cloudrouter-ai-routing-consistency.mjs --root .` | passed |
| 比对重跑 | xAI / Runway / BFL 共有操作 `top-level identical` |

## 6. 未覆盖

- Runway 的 `character_performance`、`video_upscale` 等门面未在本仓发布，未纳入比对。
- BFL `/v1/flux-{model}` 的 **请求体并集已补齐**（见第 8 节）；`flux-tools/*`
  （outpainting/vto/erase/deblur）与 finetune 管理端点未在本仓发布，未纳入。
- Google Discovery 缓存文件不含 `paths`（只有资源描述），未做逐字段比对。

## 7. 参考

- xAI：<https://docs.x.ai/openapi.json>
- Runway：<https://docs.dev.runwayml.com/openapi.json>
- BFL：<https://api.bfl.ai/openapi.json>

## 8. 补充：BFL `flux-{model}` 图片并集（2026-11-11 第二批）

把官方 22 个 `/v1/flux-*` 图片/工具端点的请求体取并集（45 个字段）后与
`BlackForestLabsImageGenerationRequest` 比较，旧契约只有 8 个字段。

新增（节选）：`resolution`（`768sq/1k/1.5k/2k/4k/match_input`，默认 `1k`）、
`mode`（`high/fast`）、`steps`(1–50)、`guidance`(1.5–5)、`raw`、`images`
（字符串或 ≤10 张数组）、`image`、`mask`、`input_image`…`input_image_8`、
`input_image_blob_path`、`top/bottom/left/right`(0–2048)、`auto_crop`、
`grounding`、`dilate_pixels`(0–25)、`reference_offset_x/y`、`finetune_id`、
`finetune_strength`(0–2)、`garment`、`person`、`webhook_url`(uri, ≤2083)、
`webhook_secret`、`user`(≤256)、`version`(默认 latest)、`aspect_ratio` 默认
`16:9`、`output_format` 枚举 `jpeg/png/webp`。

比对重跑 `missing=[] extra=[]`。`prompt` 仍保留为必选（并集内所有文本生成变体
都要求它；fill/erase 等图像编辑变体在 `additionalProperties` 下仍可只传图像字段）。

### 8.1 约束补充（同轮）

用 `.tmp/primitive_compare.py` 复核枚举/边界/默认值，又修了三处：

| 厂商 | 字段 | 官方 | 旧契约 |
| --- | --- | --- | --- |
| Runway | `promptText` | 1–26000（部分变体） | 1–1000 |
| Runway | `duration` | 上限 30（部分变体） | 上限 15 |
| Runway | `negativePrompt` | 1–1000 | 无界 |
| BFL | `flux-3-video` | `aspect_ratio` 9 值（含 `auto`）、`duration` 5–20 默认 `auto`、`resolution` 默认 `fhd`、`generate_audio` 默认 true、`safety_tolerance` 默认 2、`draft` 默认 false、`version` 默认 latest、`user` 1–256、`keyframes` 支持单图/数组/`[时间, 图]` | 缺枚举/默认值，`keyframes` 仅数组 |

新增单测 `test_documents_bfl_image_model_union`、`test_documents_xai_image_constraints`；
测试总数 93。

## 9. 响应体对齐（2026-11-11 第三批）

用 `.tmp/response_compare.py` 比对 200 响应顶层字段：

| 端点 | 官方响应 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `POST /runway/v1/text_to_image` | `{id, estimatedCost}` | `RunwayTask`（7 个字段：status/progress/output/...） | ✅ 改为 `RunwayTaskAccepted` |
| `POST /runway/v1/text_to_video`、`image_to_video` | 同上 | 已是 `RunwayTaskAccepted` | ✅ |
| `GET /xai/v1/videos/{request_id}` | 6 字段 | 多一个 `request_id` | 保留（上游有时代回显，不影响解析） |

Runway 三个创建端点现在统一返回 `{id, estimatedCost}`，任务状态仍通过
`GET /runway/v1/tasks/{task_id}` 查询。新增单测 `test_documents_runway_create_responses`。
