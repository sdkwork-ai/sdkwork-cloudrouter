# Luma Dream Machine open-api 契约对齐（2026-11-11）

## 1. 结论

以 Luma 官方 `Create a generation` 参考页内嵌的 OpenAPI 3.1
（`docs.lumalabs.ai/reference/creategeneration.md`，server
`https://api.lumalabs.ai/dream-machine/v1`）为准，重写了
`LumaVideoGenerationRequest` 与 `LumaVideoGenerationTask` 的字段、必选性、枚举与默认值。
**路径存在代际差异**（官方 `POST /generations/video`，本仓发布 `/generations`），
已记录、未静默修改。

## 2. 请求体（`GenerationRequest`）

| 字段 | 官方 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `model` | 必选，enum `ray-2/ray-flash-2`，默认 `ray-2` | ✅ 但无枚举/默认值，且被误标与 prompt 一起必选 | ✅ |
| `generation_type` | enum `video`，默认 `video` | ❌ | ✅ |
| `prompt` | string | ✅ 被误标必选 | ✅ 改为可选 |
| `aspect_ratio` | enum `1:1/16:9/9:16/4:3/3:4/21:9/9:21`，默认 `16:9` | 自由 string | ✅ |
| `loop` | boolean | ✅ | ✅ |
| `keyframes` | `{frame0, frame1}`，元素 `image{url}` 或 `generation{id}` | 自由 object | ✅ `LumaKeyframes` + `LumaKeyframe` |
| `callback_url` | string(uri) | ✅ | ✅ |
| `resolution` | enum `540p/720p/1080p/4k` 或自定义 | 自由 string | ✅ 描述枚举 |
| `duration` | enum `5s/9s` 或自定义 | 自由 string | ✅ 描述枚举 |
| `concepts` | array `{key}` | ❌ | ✅ `LumaConcept` |

## 3. 响应（`Generation`）

`LumaVideoGenerationTask` 现覆盖官方字段：

- `state`：enum `queued/dreaming/completed/failed`
- `assets`：`LumaGenerationAssets {video, image}`（uri）
- `created_at`：date-time
- `model`、`request`（回显请求参数）
- `id`、`generation_type`、`failure_reason`

## 4. 路径差异（未改）

| 门面 | 官方 | 本仓发布 | 说明 |
| --- | --- | --- | --- |
| 创建 | `POST /dream-machine/v1/generations/video` | `POST /luma_ai/dream-machine/v1/generations` | 官方参考页已带 `/video`；本仓指向 legacy `/generations` |
| 查询 | `GET /dream-machine/v1/generations/{id}` | `GET /luma_ai/dream-machine/v1/generations/{generation_id}` | 一致 |

改创建路径需要同步 classifier POST 臂、`vendor-native-resources` 的
`luma_ai.video_generation.pathTemplate`、`model_catalog_import` 的
`EndpointDescriptor`、route manifest 与 seed 覆盖测试。与 Kling/MiniMax 一样，
这是"legacy vs 当前官方"的协议选型问题，需一次明确决策；字段对齐不受它阻塞。

## 5. 验证

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |

## 6. 参考

- API 概览：<https://docs.lumalabs.ai/docs/api>
- 创建生成（含 OpenAPI）：<https://docs.lumalabs.ai/reference/creategeneration>
- 文档索引：<https://docs.lumalabs.ai/llms.txt>
