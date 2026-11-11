# Kling open-api 契约与路由对齐（2026-11-11）

## 1. 结论

本轮以 Kling 官方文档（`https://klingai.com/document-api/llms.txt` 索引的 Markdown 页面）
为准，先完成了**路径已经与官方一致**的两类门面：

- `POST /kling/v1/images/generations`（图片生成）
- `POST /kling/v1/audio/video-to-audio`（视频生音效）

同时通过新增的"发布路径 ↔ 厂商端点目录"审计，定位到 Kling 其余门面的
**路径级不一致**（不是字段级问题），这些需要路由/产品决策，未在本轮静默修改。

## 2. 已对齐：图片生成

官方：`POST /v1/images/generations`，请求体字段与约束：

| 字段 | 类型 / 约束 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `model_name` | string，默认 `kling-v3`，enum `kling-v2-1/kling-v3` | ✅ 但无枚举/默认值 | ✅ |
| `prompt` | string，必选，≤2500 字符 | ✅ | ✅ |
| `negative_prompt` | string | ❌ | ✅ |
| `image` | string（URL 或裸 Base64） | ✅ | ✅ |
| `image_reference` | string，enum `subject/face` | ❌（旧契约是 `image_reference_list` 数组） | ✅ |
| `image_fidelity` | number，默认 0.5 | ❌ | ✅ |
| `human_fidelity` | number，默认 0.45 | ❌ | ✅ |
| `element_list` | array\<{element_id}\> | ❌ | ✅ |
| `resolution` | string，enum `1k/2k`，默认 `1k` | ❌ | ✅ |
| `n` | integer，默认 1 | ❌ | ✅ |
| `aspect_ratio` | enum `16:9/9:16/1:1/4:3/3:4/3:2/2:3/21:9`，默认 `16:9` | ❌ | ✅ |
| `watermark_info` | object `{enabled}` | ❌ | ✅ |
| `callback_url` | string | ✅ | ✅ |
| `external_task_id` | string | ❌ | ✅ |

响应从"扁平的 id/status/images"改为官方信封：
`{code, message, request_id, data{task_id, task_status, task_status_msg, task_info,
created_at, updated_at, task_result{images[{index,url}]}}}`，`task_status` 固定为
`submitted/processing/succeed/failed`。

## 3. 已对齐：视频生音效

官方 `POST /v1/audio/video-to-audio`：

| 字段 | 官方 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `video_id` / `video_url` | 二选一 | ✅ | ✅ |
| `sound_effect_prompt` | string | ❌ | ✅ |
| `bgm_prompt` | string | ❌ | ✅ |
| `asmr_mode` | boolean，默认 false | ❌ | ✅ |
| `prompt` | 官方无此字段 | ❌ 本地自造 | ✅ 已删除 |
| `external_task_id` / `callback_url` | string | ✅ | ✅ |

## 4. 路由审计：发布路径必须能在厂商端点目录里找到

新增审计脚本（临时件，验证用）比对三份事实：

1. open-api 契约里的发布路径（去 vendor 前缀）；
2. `data/ai-routing/resources/vendor-native-resources.json` 中该 vendor 的 `pathTemplate`；
3. 边缘运行时 `build_provider_passthrough_uri` 的行为：**只剥 vendor 前缀，其余路径原样拼到
   账号 `base_url`**（`passthrough.rs:1620-1631`），没有任何路径重写。

结论：发布路径如果不在厂商端点目录里，中继就会向上游请求一个厂商不提供的路径
（除非命中 provider adapter 的 standard-path 重写，而 Kling 视频没有这样的 adapter）。

### 4.1 已确认的路径不一致（待路由/产品决策）

| 发布路径 | 官方路径 | 说明 |
| --- | --- | --- |
| `POST /kling/v1/videos/generations` | `POST /v1/videos/text2video`（legacy）或 `POST /text-to-video/kling-3.0`（新） | 两端都不是 `/v1/videos/generations`；现有 classifier 把它当兜底别名 |
| `GET /kling/v1/videos/generations/{task_id}` | `GET /v1/videos/text2video/{id}` / `GET /tasks?task_ids=` | 同上 |
| `GET /kling/v1/tasks/{task_id}` | `GET /v1/images/generations/{id}`（图片）或 `GET /tasks`（视频） | 图片任务查询官方是 `/v1/images/generations/{id}` |
| `POST /kling/v1/videos/avatar` | `POST /v1/videos/avatar/image2video` | 官方路径带 `/image2video` 后缀 |
| `POST /kling/v1/videos/motion-control` | `POST /motion-control/kling-2.6`（新）或 legacy 路径 | 新版是 `contents[]` + `settings` 结构 |

`vendor-native-resources.json` 里 `kling.task_query` 的 `pathTemplate`
`/v1/videos/generations/{taskId}` 也不是任何一个官方查询路径，属于同一类缺陷。

### 4.2 为什么本轮不直接改

改发布路径会同时触发：classifier 分支、`vendor-native-resources` 种子、
`model_catalog_import` 的 `EndpointDescriptor`、route manifest、定价资源与
`ai-routing-consistency` 门禁；而 Kling 目前存在 **legacy（`/v1/videos/text2video`，
`model_name` 字段）** 与 **新 API（`/text-to-video/kling-3.0`，`settings/options` 结构）**
两套并存的官方协议，选哪套会决定所有 Kling 视频模型的绑定与计费口径。
这需要一次明确的产品/路由决策，不能在字段对齐里混着改。

## 5. 验证

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK |
| `node tools/sync-cloudrouter-api-standard-extensions.mjs --check` | ok |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |
| `node tools/audit-vendor-openapi-conformance.mjs` | `{"WIRE_EQUIVALENT":13,"OK":20}` |

## 6. 参考

- 文档索引：<https://klingai.com/document-api/llms.txt>
- 图片生成：<https://klingai.com/document-api/api/image/3-0-omni/image-generation>
- 视频生音效：<https://klingai.com/document-api/api/video/audio-generation/video-to-audio>
- 文生音效：<https://klingai.com/document-api/api/video/audio-generation/text-to-audio>
- 数字人：<https://klingai.com/document-api/api/video/avatar>
- 动作控制：<https://klingai.com/document-api/api/video/motion-control/2-6>
