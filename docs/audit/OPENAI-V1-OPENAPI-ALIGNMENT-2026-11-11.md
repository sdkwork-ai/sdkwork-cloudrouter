# OpenAI `/v1` 兼容面契约对齐（2026-11-11）

## 1. 结论

本仓 open-api 的 `/v1` 是 OpenAI 兼容面（122 个操作）。本轮以
`github.com/openai/openai-openapi` 的官方 `openapi.yaml` 为基准，对 81 个
"双方都存在"的路径做了请求体字段比对，并对**媒体与批处理/补全**这几组
高频操作完成对齐：

- `POST /v1/images/generations`
- `POST /v1/images/edits`（JSON 与 multipart 两种载体）
- `POST /v1/audio/speech`
- `POST /v1/videos`、`/v1/videos/edits`、`/v1/videos/extensions`、`/v1/videos/{video_id}/remix`
- `POST /v1/batches`
- `POST /v1/completions`

## 2. 图片生成

官方 19 个字段，旧契约只有 6 个。本轮补齐：

`frame_count`（2–16，GIF）、`frame_duration_ms`（≥20）、`complexity`
（`low/medium/high`）、`svg`、`output_format`（`png/webp/jpeg/gif/svg`，默认
`png`）、`output_compression`（0–100，默认 100）、`stream`（默认 false）、
`partial_images`（0–3，默认 0）、`moderation`（`low/auto`）、`background`
（`transparent/opaque/auto`）、`style`（`vivid/natural`）、
`safety_identifier`（≤128）、`user`（deprecated）。

同时修正 `n` 的上界：旧契约写成 16，官方是 **1–10**。

## 3. 图片编辑

官方 JSON 载体要求 `images`（数组，1–16）而不是单数 `image`；旧契约用
`image` 且把 `model` 误标必选。现状：

- JSON：`required ["images","prompt"]`，`images` 为
  `OpenAiImageReferenceInput[]`，`mask`/`markup` 为对象，另补
  `n/quality/input_fidelity/size/safety_identifier/user/response_format/
  output_format/output_compression/moderation/background/stream/partial_images/
  frame_count/frame_duration_ms/complexity/svg`
- multipart：`required ["model","prompt","image"]`，`image`/`mask` 为二进制
  part，另补 `markup` 与同一组可选字段

## 4. 语音合成

官方字段：`model`、`input`（string ≤4096）、`instructions`（≤4096）、
`voice`、`response_format`（`mp3/opus/aac/flac/wav/pcm`，默认 mp3）、
`speed`（0.25–4，默认 1）、`stream_format`（`sse/audio`，默认 audio）。

旧契约缺 `instructions`、`stream_format`，`input` 允许数组，且多了一个官方
没有的 `metadata`；已全部修正。

## 5. 视频

- `POST /v1/videos`：官方 `required ["prompt"]`，字段为 `model`（sora-2 系列）、
  `prompt`（1–32000）、`input_reference{image_url,file_id}`、`seconds`
  （`4/8/12`）、`size`（`720x1280/1280x720/1024x1792/1792x1024`）。
  旧契约是 `model+prompt` 必选，且带自造的 `image/video/metadata`。
- `/v1/videos/edits`：`required ["video","prompt"]`
- `/v1/videos/extensions`：`required ["video","prompt","seconds"]`
- `/v1/videos/{video_id}/remix`：`required ["prompt"]`

## 6. 批处理与补全

- `POST /v1/batches` 补 `output_expires_after`（输出文件过期策略）
- `POST /v1/completions` 补 `stream_options`（复用 `OpenAiStreamOptions`）

## 7. 比对方法

临时脚本从官方 `openapi.yaml` 解析 `requestBody.content.application/json.schema`，
按 `#/components/schemas` 解引用后与
`apps/sdkwork-cloudrouter-pc/public/openapi.json` 的同名路径（去掉本仓 `/v1`
前缀差异）比较属性集合。81 个共有路径中 28 个存在差异，本轮的修复覆盖其中
7 个高频操作；其余差异登记在下方"剩余"。

## 8. 验证

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK（新增 `test_documents_openai_media_official_fields`） |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |
| `node tools/check-cloudrouter-ai-routing-consistency.mjs --root .` | passed |

## 9. 第二批修复（平台类操作）

同一份比对还暴露了 10 组平台类操作的差异，本轮一并修复：

| 操作 | 修复 |
| --- | --- |
| `POST /v1/assistants`、`/v1/assistants/{id}` | 补 `reasoning_effort`（`none/minimal/low/medium/high/xhigh/max`，默认 medium） |
| `POST /v1/conversations/{id}/items` | 请求体改为官方 `{items: [...]}`（`required ["items"]`，`minItems 1`），删除单条 `type/role/content/metadata` 顶层形状 |
| `POST /v1/responses/input_tokens` | 补 `previous_response_id`、`text`、`reasoning`、`truncation`、`personality`、`conversation`、`tool_choice`、`parallel_tool_calls`；去掉过严的 `required ["model","input"]` |
| `POST /v1/responses/compact` | `required ["model"]`；补 `instructions`、`image`、`prompt_cache_key`、`prompt_cache_retention`、`prompt_cache_options`、`service_tier`；删除官方没有的 `metadata` |
| `POST /v1/threads/runs` | 补 `tool_resources`、`temperature`、`top_p`、`max_prompt_tokens`、`max_completion_tokens`、`truncation_strategy`、`tool_choice`、`parallel_tool_calls`、`response_format` |
| `POST /v1/threads/{id}/runs` | 补 `reasoning_effort`、`additional_messages` 及同一组 9 个字段 |
| `POST /v1/uploads` | 补 `expires_after` |
| `POST /v1/vector_stores` | 补 `description` |
| `POST /v1/vector_stores/{id}/file_batches` | 补 `files`；去掉过严的 `required ["file_ids"]`（官方二选一） |
| `POST /v1/audio/voices` | 改为官方 `{type, name, prompt, script_hint, model}`（`type` 枚举 `prompt`，`prompt`/`script_hint` ≤2000），删除 `description`/`metadata` |

## 10. 剩余差异

**81 个共有路径的字段差异已归零。** 原本的 28 处差异全部修复，包括最后 6 个 realtime 操作：

| 操作 | 修复 |
| --- | --- |
| `POST /v1/realtime/client_secrets` | 改为官方 `{expires_after{anchor,seconds}, session}`，删除 `model/modalities/instructions/voice/metadata` |
| `POST /v1/realtime/sessions` | `required ["client_secret"]`；补 `input_audio_format`、`output_audio_format`、`input_audio_transcription`、`speed`(0.25–1.5)、`tracing`、`turn_detection`、`tools`、`tool_choice`、`temperature`、`max_response_output_tokens`、`truncation`、`prompt`；删除 `model/metadata` |
| `POST /v1/realtime/transcription_sessions` | 补 `input_audio_noise_reduction`、`include`，`input_audio_format` 枚举 `pcm16/g711_ulaw/g711_alaw`；删除 `model/metadata` |
| `POST /v1/realtime/calls/{id}/accept` | `required ["type"]`；补 `output_modalities/model/instructions/audio/include/tracing/tools/tool_choice/parallel_tool_calls/reasoning/max_output_tokens/truncation/prompt` |
| `POST /v1/realtime/calls/{id}/refer` | `required ["target_uri"]`；删除 `target/metadata` |
| `POST /v1/realtime/calls/{id}/reject` | 新增 `{status_code}` 请求体（不再复用 accept 的 schema） |

另外 `POST /v1/realtime/calls/{id}/hangup` 在官方规范里**没有请求体**，已从契约移除
requestBody（此前发布的是自由 `JsonObject`）。

## 10. 参考

- OpenAI 官方 OpenAPI：<https://github.com/openai/openai-openapi>
- 图片来源：`openapi.yaml` 的 `CreateImageRequest` / `CreateImageEditRequest`
- 语音：`CreateSpeechRequest`
- 视频：`CreateVideoRequest` / `VideoEditRequest` / `VideoExtendRequest` / `VideoRemixRequest`
