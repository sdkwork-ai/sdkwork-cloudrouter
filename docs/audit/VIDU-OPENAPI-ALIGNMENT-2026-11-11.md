# Vidu open-api 契约对齐（2026-11-11）

## 1. 结论

Vidu 的 7 个原生门面路径与官方 API 参考完全一致（`POST /ent/v2/text2video`、
`img2video`、`reference2video`、`start-end2video`、`reference2image`、`text2audio`、
`timing2audio`、`template`，以及 `GET /ent/v2/tasks/{id}/creations`）。问题在请求体：
大量官方可选字段缺失，还有若干本地自造字段。本轮按
`https://platform.vidu.cn/docs/llms.txt` 索引的 Markdown 页面逐字段补齐。

## 2. 文生视频（`ViduTextToVideoRequest`）

官方字段：`model`、`prompt`、`duration`、`seed`、`aspect_ratio`、`resolution`、
`audio`、`payload`、`off_peak`、`watermark`、`wm_position`、`wm_url`、
`meta_data`、`callback_url`。

旧契约缺 `audio/off_peak/watermark/wm_position/wm_url/meta_data`，还多了一个
当前文档没有的 `movement_amplitude`；已补齐/删除。

## 3. 图生视频 / 首尾帧

- `ViduImageToVideoRequest`：补 `is_rec`，删除官方不存在的 `aspect_ratio`
  （画面比例由输入图决定），保留 `images` 必选。
- `ViduStartEndToVideoRequest`：补 `audio/off_peak/watermark/wm_position/wm_url/
  meta_data`，删除 `aspect_ratio`/`movement_amplitude`。

## 4. 参考生视频

`ViduReferenceToVideoRequest`：补 `subjects`、`auto_subjects`、`bgm`、`sounds`、
`movement_amplitude`，以及通用音频/水印/元数据字段。

## 5. 图片生成

`ViduReferenceToImageRequest`：补 `bgm`、`resolution`、`off_peak`；删除自造的
`style`；`required` 从 `["model","prompt","images"]` 改为 `["model","prompt"]`
（`viduq2` 支持 0 张参考图）。

## 6. 音频

- `ViduTextToAudioRequest`：官方字段是 `prompt` 而不是 `text`；补 `duration`
  （2–10，默认 10）、`seed`、`bgm`、`off_peak`、`payload`；`required` 改为
  `["model","prompt"]`。
- `ViduTimingToAudioRequest`：`timing_data` 改为官方的 `timing_prompts`；
  补 `duration/seed/bgm/off_peak/payload`；`required` 改为
  `["model","timing_prompts"]`。

## 7. 场景模板

`ViduTemplateRequest`：补 `prompt`、`seed`、`aspect_ratio`、`area`、`beast`、
`bgm`、`watermark`、`wm_position`、`wm_url`、`meta_data`、`off_peak`；删除自造的
`video_urls`；`required` 改为 `["template","images"]`。

## 8. 验证

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK（新增 `test_documents_vidu_official_request_fields`） |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |
| `node tools/check-cloudrouter-ai-routing-consistency.mjs --root .` | passed |

## 9. 任务响应（同轮补齐）

创建任务与查询生成物共用的响应字段已按官方补齐：

- `state`：enum `created/queueing/processing/success/failed`
- `prompt`、`duration`、`seed`、`aspect_ratio`、`resolution`、`payload`、
  `off_peak`、`credits`、`watermark`、`err_code`、`created_at`
- `creations[]`：补 `watermarked_url`（与 `id`/`url`/`cover_url` 并列）

## 10. 未覆盖

- 图片生成、音频任务的响应形状与视频任务不同（`creations[].url` 语义不同），
  尚未逐字段核对。

## 11. 参考

- 文档索引：<https://platform.vidu.cn/docs/llms.txt>
- 文生视频：<https://platform.vidu.cn/docs/api-reference/video-models/vidu-q3/text-to-video>
- 图生视频：<https://platform.vidu.cn/docs/api-reference/video-models/vidu-q3/image-to-video>
- 首尾帧：<https://platform.vidu.cn/docs/api-reference/video-models/vidu-q3/start-end-to-video>
- 参考生视频：<https://platform.vidu.cn/docs/api-reference/video-models/vidu-q3/reference-to-video>
- 图片生成：<https://platform.vidu.cn/docs/api-reference/image-generation>
- 文生音频：<https://platform.vidu.cn/docs/api-reference/audio-generation/text-to-audio>
- 可控文生音效：<https://platform.vidu.cn/docs/api-reference/audio-generation/timing-to-audio>
- 场景模板：<https://platform.vidu.cn/docs/api-reference/solutions/effects/scene-template>
