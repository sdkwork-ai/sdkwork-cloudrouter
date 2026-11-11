# Volcengine Ark / ByteDance Ark open-api 契约对齐（2026-11-11）

## 1. 结论

`/volcengine/api/v3/**` 与 `/bytedance/api/v3/**` 的四类媒体门面（视频任务创建、视频任务查询、
图像生成）此前发布的是"本地缩减版"请求/响应体：缺字段、`content[]` 形状错误、还带官方不存在的
`metadata`/`seed`。本轮以火山方舟官方 API 参考为唯一依据，逐字段重写生成器中的 schema，
并跑完整再生链落到 `apps/` → `sdks/` → `apis/` 三份派生契约。

`python -B -m tools.cloudrouter_gateway_openapi_generator --check`、
`node tools/sync-cloudrouter-api-standard-extensions.mjs --check`、
`node scripts/materialize-apis-contracts.mjs --check`、`python -B -m tools.cloudrouter_openapi_contract_audit`、
`python -B -m tools.cloudrouter_openapi_precision_audit` 全部通过。

## 2. 官方来源

| 面 | 官方文档 |
| --- | --- |
| 创建视频生成任务 | <https://docs.volcengine.com/docs/ark/create-video-generation-task-api> |
| 查询视频生成任务 | <https://docs.volcengine.com/docs/ark/get-video-generation-task-api> |
| 图片生成 | <https://docs.volcengine.com/docs/ark/image-generation-api> |

`bytedance` 的目录面同样绑定 Ark（`services/.../model_catalog_import.rs`：`bytedance` 与
`volcengine` 的 `video_generation` 都落在 `/api/v3/contents/generations/tasks`），因此两者共用
同一套官方字段，只是根 schema 名称不同。

## 3. 创建视频任务：字段逐项对齐

`VolcengineContentGenerationTaskCreateRequest` / `BytedanceVideoGenerationRequest`：

| 字段 | 官方类型 / 约束 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `model` | string，必选 | ✅ | ✅ |
| `content` | object[]，必选 | ✅（元素形状错误） | ✅ |
| `omni_reference_task_type` | string，enum `auto/reference/edit/extend`，默认 `auto` | ❌ 缺失 | ✅ |
| `resolution` | string，enum `480p/720p/1080p/4k` | ❌ 缺失 | ✅ |
| `ratio` | string，enum `16:9/4:3/1:1/3:4/9:16/21:9/adaptive` | ❌ 缺失 | ✅ |
| `duration` | integer，含 `-1`；模型区间 2.5 [4,30] / 2.0 [4,15] / 1.0 [2,12] | ❌ 缺失 | ✅ |
| `frames` | integer，[29,289]，`25+4n` | ❌ 缺失 | ✅ |
| `generate_audio` | boolean，默认 `true` | ❌ 缺失 | ✅ |
| `watermark` | boolean，默认 `false` | ❌ 缺失 | ✅ |
| `output_format` | string，enum `mp4/mov`，默认 `mp4` | ❌ 缺失 | ✅ |
| `seed` | integer，[-1, 2147483647]，默认 `-1` | ❌ 缺失 | ✅ |
| `camera_fixed` | boolean，默认 `false` | ❌ 缺失 | ✅ |
| `return_last_frame` | boolean，默认 `false` | ❌ 缺失 | ✅ |
| `draft` | boolean，默认 `false` | ❌ 缺失 | ✅ |
| `service_tier` | string，enum `default/flex`，默认 `default` | ❌ 缺失 | ✅ |
| `callback_url` | string | ✅ | ✅ |
| `execution_expires_after` | integer，[3600,259200]，默认 `172800` | ❌ 缺失 | ✅ |
| `priority` | integer，[0,9]，默认 `0` | ❌ 缺失 | ✅ |
| `safety_identifier` | string，`maxLength: 64` | ❌ 缺失 | ✅ |
| `tools` | object[]，元素 `{type: "web_search"}` | ❌ 缺失 | ✅ |
| `metadata` | 官方无此字段 | ❌ 本地自造 | ✅ 已删除 |

`content[]` 元素（`VolcengineContentPart`；ByteDance 共用 `ArkContentPart` 形状）：

| 字段 | 官方形状 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `type` | enum `text/image_url/video_url/audio_url/draft_task` | 自由 string | ✅ |
| `text` | string（`type=text` 时必填） | ✅ | ✅ |
| `image_url` | **object** `{url}` | ❌ string | ✅ |
| `video_url` | **object** `{url}` | ❌ string | ✅ |
| `audio_url` | **object** `{url}` | ❌ 缺失 | ✅ |
| `draft_task` | **object** `{id}` | ❌ 缺失 | ✅ |
| `role` | enum `first_frame/last_frame/reference_image/reference_video/reference_audio` | ❌ 缺失 | ✅ |
| `file_id` | 官方无此字段 | ❌ 本地自造 | ✅ 已删除 |

## 4. 查询视频任务：响应对齐

`VolcengineContentGenerationTask` / `BytedanceVideoGenerationTask` 现覆盖官方响应字段：
`id`、`model`、`status`（`queued/running/cancelled/succeeded/failed/expired`）、
`content.video_url`、`content.last_frame_url`、`usage.completion_tokens`、`usage.total_tokens`、
`usage.tool_usage.web_search`、`created_at`、`updated_at`、`seed`、`resolution`、`ratio`、
`duration`、`frames`、`framespersecond`、`generate_audio`、`draft`、`execution_expires_after`、
`output_format`、`priority`、`safety_identifier`、`service_tier`、`tools[]`、`error{code,message}`。

旧契约把 `content` 当成"输入内容数组"、把 `result` 当成通用任务结果，二者都不是 Ark 的查询响应。

创建接口的响应按官方文档只保留 `id`；旧契约的 `task_id` / `status` / `created_at` 是本地臆造。

## 5. 图像生成：请求/响应对齐

`VolcengineImageGenerationRequest` / `BytedanceImageGenerationRequest` 现覆盖：
`model`、`prompt`、`image`（string 或 string[]）、`layer_decomposition`、`size`、
`optimize_prompt_options.mode`（`standard/fast`）、`output_format`（`png/jpeg`）、
`background`（`transparent/opaque`）、`response_format`（`url/b64_json`）、
`sequential_image_generation`（`auto/disabled`）、
`sequential_image_generation_options.max_images`（[1,15]）、`stream`、`tools`、`watermark`。

响应覆盖 `created`、`model`、`data[]`（`url`、`b64_json`、`size`、`output_format`、
`z_index`、`name`、`description`、`bounding_box.absolute/normalized`、`error`）、
`usage`（`generated_images`、`input_images`、`output_tokens`、`total_tokens`、
`tool_usage.web_search`）、`tools`、`error`。旧契约的 `seed` 在官方图片文档中不存在，已删除。

## 6. 实现位置

- 唯一手写源：`tools/cloudrouter_gateway_openapi_generator.py`
  - `_ark_video_create_properties` / `_ark_video_task_properties` / `_ark_content_part_properties`
  - `_ark_image_request_properties` / `_ark_image_response_properties`
  - 共享模块：`ArkImageSource`、`ArkVideoSource`、`ArkAudioSource`、`ArkDraftTask`、
    `ArkContentPart`、`ArkWebSearchTool`、`ArkImageGenerationData`、`ArkImageUsage`、
    `ArkVideoTaskContent`、`ArkVideoToolUsage`、`ArkVideoUsage`
- 派生链（顺序固定）：
  1. `python -B -m tools.cloudrouter_gateway_openapi_generator`
  2. `node tools/sync-cloudrouter-api-standard-extensions.mjs --apply`
  3. `python -B -m tools.cloudrouter_sdk_runtime_standardizer --root . --sdk-dir cloudrouter-open-sdk --openapi-only`
  4. `node scripts/materialize-apis-contracts.mjs --apply`

## 7. 验证记录

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK（新增 `test_documents_volcengine_ark_media_official_fields` 逐字段钉住官方契约） |
| `node tools/sync-cloudrouter-api-standard-extensions.mjs --check` | open-api ok |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |
| 三份派生契约 schema 逐节点比较 | `volcengine`/`bytedance` schema 在 public / sdk openapi / sdkgen / apis 中完全一致 |

## 8. 未落地项与阻塞

1. **生成的 8 种非 TypeScript SDK 未重跑**。本机 `../sdkwork-sdk-generator`（`@sdkwork/sdk-generator`
   1.0.14）新增 `excludeExternalProtocolOperations`：带 `x-sdkwork-wire-protocol: external` 的 operation
   在生成前被整条删除。本仓 open-api 的 218 个 operation 全部是 external 兼容面，因此生成器对
   本家族输出 `models: 0, apis: 0`（已用 HEAD 版 sdkgen 复现，与本轮改动无关）。
   强制重跑会删除 1981 个已跟踪的生成文件，本轮已用 `git checkout HEAD --pathspec-from-file`
   精确恢复。生成代码与 `sdks/**/openapi/*.json` 快照的同步需要在生成器提供 include-external
   选项后统一重跑。
2. **`/volcengine/api/v3/audio/speech`**：火山方舟的 TTS 端点是 OpenAI 兼容的
   `/api/v3/audio/speech`（`model` / `input` / `voice` / `response_format` / `speed`），
   因此复用 `OpenAiSpeechCreateRequest` 是正确形状；官方"边缘大模型网关"协议还列了
   `sample_rate` / `channel` 两个扩展字段，本仓未发布（避免污染 OpenAI 通用 schema），
   如 Ark 线上需要可单独加 `VolcengineSpeechRequest`。
3. 其余厂商原生门面（kling / vidu / minimax / jimeng / alibaba / pixverse / luma / zhipu /
   runway / xai / black_forest_labs / elevenlabs / suno / mureka / stability_ai / typesafe）
   尚未逐字段核对；`tools/audit-vendor-openapi-conformance.mjs` 只覆盖其中 5 家且仅比较顶层字段名。

## 8. ByteDance Seed TTS（`/bytedance/api/v3/tts/unidirectional`）

按官方豆包语音文档（`docs.volcengine.com/docs/doubao-voice/unidirectional-streaming-text-to-speech-http`）
对齐：

- 请求体是**单层嵌套**：`{ "req_params": { text, speaker, audio_params, ... } }`，
  旧契约把 `text`/`speaker`/`audio_params` 放在顶层且 `text` 必选，形状错误。
- `req_params` 必选 `text`/`speaker`/`audio_params`；另有 `model`、`ssml`、`additions`
  （JSON 字符串）、`pronunciation_dict`、`tone`。
- `audio_params` 必选 `format`/`sample_rate`；`format` 枚举
  `mp3/pcm/ogg_opus/wav`，默认 `mp3`。
- 必选请求头：`X-Api-Key`（网关注入）、`X-Api-Resource-Id`、`X-Api-Request-Id`；
  后两者已在契约声明，`X-Api-Request-Id` 为本轮新增。

新增单测 `test_documents_bytedance_tts_nesting`；测试总数 92。
