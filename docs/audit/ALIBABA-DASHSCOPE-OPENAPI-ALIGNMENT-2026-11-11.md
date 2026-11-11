# Alibaba DashScope open-api 契约对齐（2026-11-11）

## 1. 结论

`/alibaba/api/v1/services/aigc/*` 的两个媒体门面此前只发布了 `model` + 两个自由
JSON 对象（`input` / `parameters`），既没有官方要求的必选 `input`，也没有约束任何
字段；同时**漏掉了官方强制要求的 `X-DashScope-Async: enable` 请求头**（DashScope
HTTP 只支持异步，缺头直接报 `current user api does not support synchronous calls`）。
本轮按阿里云百炼官方 API 参考逐字段落库，并把异步头纳入契约。

## 2. 官方来源

| 面 | 官方文档 |
| --- | --- |
| 文生视频 | <https://help.aliyun.com/zh/model-studio/text-to-video-api-reference> |
| 图生视频 | <https://help.aliyun.com/zh/model-studio/image-to-video-api-reference> |
| 文生图（异步 image-synthesis） | <https://help.aliyun.com/zh/model-studio/text-to-image-v2-api-reference> |

## 3. 请求头

`_apply_vendor_required_headers` 新增 `declare_paths`，只对下面两条创建路径声明：

| 门面 | 头 | 取值 | 必选 |
| --- | --- | --- | --- |
| `POST /alibaba/api/v1/services/aigc/text2image/image-synthesis` | `X-DashScope-Async` | `enable` | 是 |
| `POST /alibaba/api/v1/services/aigc/video-generation/video-synthesis` | `X-DashScope-Async` | `enable` | 是 |

`GET /alibaba/api/v1/tasks/{task_id}` 不声明该头（查询是同步 GET）。

透传层会转发客户端的所有非 hop-by-hop 头（`should_forward_provider_request_header`
只剥 auth/host/content-length/cookie/compression/forwarded-*），因此契约声明后
客户端可以真正把该头送到上游。

## 4. 文生图请求（`AlibabaImageGenerationRequest`）

| 字段 | 官方类型 / 约束 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `model` | string，必选 | ✅ | ✅ |
| `input` | object，必选 | ❌ 非必选、自由 JSON | ✅ |
| `input.prompt` | string，必选 | ❌ 未声明 | ✅ |
| `input.negative_prompt` | string | ❌ 未声明 | ✅ |
| `parameters.size` | string，`<width>*<height>` | ❌ 自由 JSON | ✅ |
| `parameters.n` | integer，[1,4]，默认 4 | ❌ | ✅ |
| `parameters.prompt_extend` | boolean，默认 true | ❌ | ✅ |
| `parameters.watermark` | boolean，默认 false | ❌ | ✅ |
| `parameters.seed` | integer，[0,2147483647] | ❌ | ✅ |

## 5. 视频请求（`AlibabaVideoGenerationRequest`）

| 字段 | 官方类型 / 约束 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `model` | string，必选 | ✅ | ✅ |
| `input` | object，必选 | ❌ 非必选、自由 JSON | ✅ |
| `input.prompt` | string；文生视频必选、图生视频可选 | ❌ | ✅ |
| `input.negative_prompt` | string | ❌ | ✅ |
| `input.img_url` | string；图生视频必选（URL/OSS/Base64） | ❌ | ✅ |
| `input.audio_url` | string | ❌ | ✅ |
| `input.template` | string；设置后 prompt 失效 | ❌ | ✅ |
| `parameters.resolution` | enum `480P/720P/1080P` | ❌ 自由 JSON | ✅ |
| `parameters.ratio` | enum `16:9/9:16/1:1/4:3/3:4` | ❌ | ✅ |
| `parameters.duration` | integer，[2,15] | ❌ | ✅ |
| `parameters.prompt_extend` | boolean，默认 true | ❌ | ✅ |
| `parameters.watermark` | boolean，默认 false | ❌ | ✅ |
| `parameters.seed` | integer，[0,2147483647] | ❌ | ✅ |

## 6. 查询任务响应（`AlibabaAsyncTask` / `AlibabaTaskUsage`）

新增/收紧：

- `task_status`：enum `PENDING/RUNNING/SUCCEEDED/FAILED/CANCELED/UNKNOWN`
- `submit_time`、`scheduled_time`、`end_time`（`YYYY-MM-DD HH:mm:ss.SSS`）
- `orig_prompt`（prompt 智能改写后的实际提示词）
- `video_url`（仅 SUCCEEDED 返回，24 小时有效）
- `results[]`（图像任务的产出）
- `usage`：`duration`（number）、`input_video_duration`、`output_video_duration`、
  `SR`、`ratio`、`image_count`

提交响应（`AlibabaVideoGenerationResponse` / `AlibabaImageGenerationResponse`）
补上 `usage`，`output` 改为带描述的 `allOf` 引用。

## 7. 实现与验证

唯一手写源：`tools/cloudrouter_gateway_openapi_generator.py`

- `_apply_vendor_required_headers` 增加 `declare_paths` + `X-DashScope-Async`
- `AlibabaImageGenerationRequest` / `AlibabaVideoGenerationRequest` /
  `AlibabaAsyncTask` / `AlibabaTaskUsage` 重写
- 回归测试：`tests/test_cloudrouter_gateway_openapi_generator.py`
  `test_documents_alibaba_dashscope_media_contract`

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK |
| `node tools/sync-cloudrouter-api-standard-extensions.mjs --check` | ok |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |

## 8. 语音合成（Qwen-TTS）

按官方 Qwen-TTS 参考（阿里云百炼 + `modelstudioai/skills` 镜像）对齐输入信封：

`AlibabaSpeechInput`（`input` 字段）：

- `text`（必选，≤600 字符；Qwen3-TTS-Flash 512 token）
- `voice`（必选，系统音色名，如 `Cherry`）
- `language_type`：`Auto/Chinese/English/German/Italian/Portuguese/Spanish/Japanese/Korean/French/Russian`
- `instructions`（指令控制，≤1600 token，仅 Instruct 系列）
- `optimize_instructions`（默认 false，依赖 `instructions`）

`parameters` 仍是 DashScope 的速率/音高/音量/格式/采样率信封，保持自由 JSON。

### 8.1 路径不一致（待决策）

官方 Qwen-TTS 的 HTTP 端点是
`POST /api/v1/services/aigc/multimodal-generation/generation`（非流式）或 SSE 变体；
本仓发布的是 `/alibaba/api/v1/services/audio/tts/SpeechSynthesizer`——这是 DashScope
**SDK 的类名**，不是 HTTP 路径。直通中继会原样转发，预期 404。修正同样需要改
classifier/descriptor/路由清单，属跨仓决策。

新增单测 `test_documents_alibaba_speech_input`；测试总数 91。
