# Zhipu open-api 契约对齐（2026-11-11）

## 1. 结论

`/zhipu/api/paas/v4/images/generations`、`/zhipu/api/paas/v4/videos/generations`、
`/zhipu/api/paas/v4/async-result/{task_id}` 三条门面的路径与官方 OpenAPI 的
server `https://open.bigmodel.cn/api/` + path 完全一致；此前的问题是**请求/响应字段
缺少约束、`image_url` 形状错误、必选集错误**。本轮按官方文档内嵌的 OpenAPI
（`docs.bigmodel.cn` 的「图像生成」「视频生成(异步)」「查询异步结果」）逐字段落库。

## 2. 图像生成

| 字段 | 官方 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `model` | enum `glm-image/cogview-4-250304/cogview-4/cogview-3-flash` | 自由 string | ✅ |
| `prompt` | 必选 | ✅ | ✅ |
| `quality` | enum `hd/standard`，默认 `hd` | 自由 string | ✅ |
| `size` | 默认 `1280x1280` | ✅ 无默认值 | ✅ |
| `watermark_enabled` | boolean | ✅ | ✅ |
| `user_id` | string，6–128 字符 | ✅ 无边界 | ✅ |

响应改为官方 `{created, data[{url}], content_filter[{role, level}]}`；旧契约的
`request_id` 不在官方 schema 中，已移除。

## 3. 视频生成

| 字段 | 官方 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `model` | string，必选 | ✅ | ✅ |
| `prompt` | string ≤512；与 `image_url` 至少一个 | ✅ 但被误标必选 | ✅ 改为可选 |
| `image_url` | string \| Base64 data URL \| 首尾帧 array(2) | ❌ object | ✅ `oneOf` 三支 |
| `quality` | enum `speed/quality`，默认 `speed` | 自由 string | ✅ |
| `with_audio` | boolean，默认 false | ✅ | ✅ |
| `watermark_enabled` | boolean | ❌ | ✅ |
| `size` | string，按模型不同 | ✅ | ✅ |
| `fps` | enum `30/60`，默认 30 | ✅ 无枚举 | ✅ |
| `duration` | enum `5/10`，默认 5 | ✅ 无枚举 | ✅ |
| `request_id` | string | ✅ | ✅ |
| `user_id` | string，6–128 | ❌ | ✅ |

顶层 `required` 由 `["model","prompt"]` 改为 `["model"]`（官方：prompt 与 image_url
不能同时为空）。

## 4. 查询异步结果

`ZhipuVideoGenerationTask` 现覆盖官方 `AsyncVideoGenerationResponse` /
`AsyncImageGenerationResponse`：

- `task_status`：enum `PROCESSING/SUCCESS/FAIL`
- `video_result[]`：`{url, cover_image_url}`
- `image_result[]`：`{url}`
- `created`、`model`、`request_id`、`id`（create 回执）

## 5. 验证

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |
| `node tools/check-cloudrouter-ai-routing-consistency.mjs --root .` | passed |

## 6. 参考

- 图像生成：<https://docs.bigmodel.cn/api-reference/模型-api/图像生成>
- 视频生成(异步)：<https://docs.bigmodel.cn/api-reference/模型-api/视频生成异步>
- 查询异步结果：<https://docs.bigmodel.cn/api-reference/模型-api/查询异步结果>
