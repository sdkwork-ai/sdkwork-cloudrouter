# Stability AI open-api 传输契约对齐（2026-11-11）

## 1. 结论

Stability AI 的两个门面此前把请求体发布成 `application/json`，但官方明确是
**multipart/form-data POST**（`https://platform.stability.ai/llms.txt`：
"Multipart form POST, `authorization: Bearer <key>`"）。生成 SDK 会按 JSON 发送，
上游直接拒绝。本轮修正了传输层，并顺带修正了图片/音频两个门面对 `Accept` 头的
相反要求。

## 2. 改动

| 门面 | 旧契约 | 现状 |
| --- | --- | --- |
| `POST /stability_ai/v2beta/stable-image/generate/{mode}` | `application/json` + `Accept: application/json` | `multipart/form-data`；`Accept: application/json` 必选（发布的是 JSON 响应） |
| `POST /stability_ai/v2beta/audio/stable-audio-2/text-to-audio` | `application/json` + 全局 `Accept: application/json` | `multipart/form-data`；**不再**要求 `Accept`，响应为 `audio/mpeg` 字节 |

`_apply_vendor_required_headers` 里 Stability 的 `Accept` 声明从整前缀
（`declare("/stability_ai/")`）改为只作用于图片路径（`declare_paths`），
否则音频门面会出现"要求 JSON、却发布音频字节"的自相矛盾。

## 3. 为什么这是商业可用性问题

中继按客户端 `Content-Type` 原样转发（`should_forward_provider_request_header`
只剥 hop-by-hop 头），所以契约写错 `application/json` 不会在网关侧报错，
而是在上游返回 415/400；计费预检已通过、请求也已发出，属于"收钱但调用必失败"
的形态。传输层必须与厂商一致。

## 4. 验证

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK（新增 `test_documents_stability_multipart_transport`） |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |
| `node tools/check-cloudrouter-ai-routing-consistency.mjs --root .` | passed |

## 5. 未覆盖

- Stability 的 `edit` / `upscale` / `control` / `audio-to-audio` / `inpaint` 门面
  尚未发布（当前只发布 generate 与 stable-audio-2 text-to-audio）。

## 6. 补充：请求字段并集（2026-11-11 第二批）

`docs.stability.ai/llms.txt` 只给端点与计费；按索引抓
`api-reference/generate/stable-image-{core,ultra}.md`、
`api-reference/generate/stable-diffusion-35.md`、
`api-reference/stable-audio-2/text-to-audio.md`，页面内嵌完整 OpenAPI，解析后取并集：

| 端点 | 字段 |
| --- | --- |
| core | `prompt`、`aspect_ratio`、`negative_prompt`、`seed`、`style_preset`、`output_format` |
| ultra | 上述 + `image`、`strength` |
| sd3 | 上述 + `mode`、`model`、`cfg_scale`；`aspect_ratio` 9 值枚举默认 `1:1` |

`StabilityImageGenerationRequest` 补齐：`mode`（`text-to-image/image-to-image`，默认
text-to-image）、`style_preset`、`cfg_scale`；`model` 改为
`sd3.5-large/sd3.5-large-turbo/sd3.5-medium`（默认 sd3.5-large）；`aspect_ratio`
9 值枚举默认 `1:1`；`output_format` 枚举默认 `png`；`strength` 0–1。

`StabilityAudioRequest`：`model` 默认与 `output_format` 默认保持官方默认
（`stable-audio-2` / `mp3`），`duration` 加 1–190 边界与默认 190。

新增单测 `test_documents_stability_union_constraints`；测试总数 90。
