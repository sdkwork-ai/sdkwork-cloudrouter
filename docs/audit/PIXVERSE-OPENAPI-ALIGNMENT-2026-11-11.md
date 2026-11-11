# PixVerse open-api 契约对齐（2026-11-11）

## 1. 结论

PixVerse 的两个门面路径与官方 OpenAPI 一致：
`POST /openapi/v2/video/text/generate`、`GET /openapi/v2/video/result/{video_id}`。
此前请求体是"猜测版"（`prompt` 唯一必选、含 `img_id`/`motion_mode`/`negative_prompt`
等文生视频不接受的字段），响应 `Resp` 是自由 JSON，且漏掉了官方强制要求的
`Ai-trace-id` 请求头。本轮按 `https://docs.platform.pixverse.ai/llms.txt` 索引的
文档内嵌 OpenAPI 逐字段对齐。

## 2. 请求体（`PixverseVideoGenerationRequest`）

| 字段 | 官方 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `model` | 必选，enum `v6-max/c1/v6/v3.5/v4/v4.5/v5/v5-fast/v5.5/v5.6` | 自由 string | ✅ |
| `prompt` | 必选，≤5000 | ✅ | ✅ |
| `duration` | 必选，integer 1–15 | ✅ 但非必选 | ✅ |
| `quality` | 必选，enum `360p/540p/720p/1080p` | 自由 string | ✅ |
| `aspect_ratio` | 必选，enum 8 值 | 自由 string | ✅ |
| `seed` | integer 0–2147483647 | ✅ 无边界 | ✅ |
| `webhook_id` | string | ❌ | ✅ |
| `generate_audio_switch` | boolean，默认 false | ❌ | ✅ |
| `generate_multi_clip_switch` | boolean，默认 false | ❌ | ✅ |
| `img_id` | 文生视频不接受 | ❌ 本地自造 | ✅ 删除 |
| `motion_mode` | 文生视频不接受 | ❌ 本地自造 | ✅ 删除 |
| `negative_prompt` | 文生视频不接受 | ❌ 本地自造 | ✅ 删除 |

## 3. 请求头

官方要求每个请求带 `Ai-trace-id`（UUID）与 `API-KEY`。网关负责注入 `API-KEY`，
但 `Ai-trace-id` 由调用方生成，必须出现在契约里；已在两个 PixVerse 路径上声明为
必选头。

## 4. 响应

统一信封：`{ErrCode, ErrMsg, Resp, Error}`。

- `ErrCode` 非 0 表示业务失败（即使 HTTP 200）
- `Resp`（`PixverseTaskResp`）：`video_id`/`id`、`status`（enum `1/5/7/8`）、
  `url`、`prompt`、`negative_prompt`、`outputWidth`、`outputHeight`、
  `resolution_ratio`、`seed`、`size`、`style`、`create_time`、`modify_time`、
  `quality`、`duration`、`aspect_ratio`、`has_audio`、`credits`、`path`、
  `customer_paths`
- `Error`（`PixverseErrorDetail`）：`Type`、`Message`、`Param`（含 `Fields`/
  `AllowedValues`/`RequiredField` 等）

创建与查询共用同一结构，`video_id`（创建）和 `id`/`status`（查询）都在 schema 中。

## 5. 验证

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK（新增 `test_documents_pixverse_official_fields`） |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |
| `node tools/check-cloudrouter-ai-routing-consistency.mjs --root .` | passed |

## 6. 未覆盖

PixVerse 还有 image-to-video、first/last-frame、reference-to-video、video extend/
expand、upscale、lipsync、sound effect 等门面，本仓只发布了 text-to-video 与结果
查询；其余能力未纳入本仓契约。

## 7. 参考

- 文档索引：<https://docs.platform.pixverse.ai/llms.txt>
- 文生视频：<https://docs.platform.pixverse.ai/text-to-video-13016634e0>
- 查询任务：<https://docs.platform.pixverse.ai/query-task-status-43051212e0>
