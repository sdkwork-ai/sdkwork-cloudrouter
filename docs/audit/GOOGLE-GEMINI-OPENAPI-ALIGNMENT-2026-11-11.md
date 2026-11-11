# Google Gemini open-api 契约对齐（2026-11-11）

## 1. 来源与方法

使用 Google Discovery 规范（`https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta`，
缓存为 `.tmp-vendor-specs/google-full.json`）。Discovery 用 `resources.<resource>.methods`
而不是 `paths`，脚本 `.tmp/google_compare.py` 从 `models.methods` 取出
`generateContent`/`streamGenerateContent`/`countTokens`/`embedContent`/
`batchEmbedContents` 的请求 `$ref`，解析 `allOf` 后与我们的契约比较；
`.tmp/google_nested.py` 继续比较 `generationConfig`、`content`、`part`、`tool`、
`safetySetting` 的嵌套字段。

## 2. 顶层请求字段

| 方法 | 旧契约 | 官方 | 结果 |
| --- | ---: | ---: | --- |
| `generateContent` | 7 | 12 | 补 `store`、`continuationToken`、`serviceTier`、`labels`、`model` |
| `streamGenerateContent` | 7 | 12 | 同上 |
| `countTokens` | 2 | 2 | 已一致 |
| `embedContent` | 4 | 6 | 补 `model`、`embedContentConfig` |
| `batchEmbedContents` | 1 | 1 | 已一致 |

`serviceTier` 枚举：`unspecified/standard/flex/priority`。

## 3. 嵌套字段

### `generationConfig`（9 → 24）

补：`responseModalities`、`responseLogprobs`、`logprobs`、`frequencyPenalty`、
`presencePenalty`、`seed`、`mediaResolution`（enum 4 值）、`imageConfig`、
`speechConfig`、`audioTranscriptionConfig`、`translationConfig`、`responseFormat`、
`responseJsonSchema`、`enableEnhancedCivicAnswers`、`enableAffectiveDialog`。

官方还有一个 `_responseJsonSchema`（描述明确为 "An internal detail. Use
`responseJsonSchema` rather than this field"），**有意不发布**。

### `Part`（7 → 17）

补：`thought`、`thoughtSignature`、`mediaProcessing`（enum
`MEDIA_PROCESSING_UNSPECIFIED/STATIC/AGENTIC`）、`mediaResolution`、
`partMetadata`、`speechMetadata`、`videoMetadata`、`toolCall`、`toolResponse`、
`audioTranscription`。

### `Tool`（4 → 9）

补：`googleSearchRetrieval`、`fileSearch`、`googleMaps`、`computerUse`、
`mcpServers`。

### `Content` / `SafetySetting`

与官方一致（`role`+`parts`；`category`+`threshold`）。

## 4. 验证

| 命令 | 结果 |
| --- | --- |
| `cloudrouter_gateway_openapi_generator --check` | current |
| `unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK（新增 `test_documents_google_generate_content_nested_fields`） |
| `api:materialize:check` | passed |
| `cloudrouter_openapi_contract_audit` / `precision_audit` | passed / passed |
| `check-cloudrouter-ai-routing-consistency` | passed |
| 顶层比对重跑 | 5 个方法字段数完全一致 |
| 嵌套比对重跑 | `Content`/`Part`/`SafetySetting`/`Tool` 一致；`GenerationConfig` 仅剩内部字段 `_responseJsonSchema` |

## 5. 未覆盖

- `cachedContents` 的 `create`/`patch` 请求体已核对：`create` 补 `required: ["model"]`
  （官方 Required；其余字段一致），`patch` 走同一结构。
- `files` 上传门面：本仓发布的是 `POST /google/v1beta/files`（multipart），官方文件
  上传端点是 `POST /upload/v1beta/files`（不同 host 前缀），另有
  `POST /v1beta/files:register` 用于注册 GCS URI；两者均未在本仓发布。
- `model` 字段：官方描述为必填，但实际由路径参数决定；本仓按可选发布并在描述中
  说明"路径参数优先"。

## 6. 路径不一致（待决策）

Discovery 里图片/视频生成是：

| 官方 | 本仓发布 | 运行时 |
| --- | --- | --- |
| `POST /v1beta/models/{model}:predict`（`PredictRequest`：`instances`/`parameters`/`labels`） | `/google/v1beta/models/{model}:generateImages` | classifier、`path_pattern.rs`、billing matrix、route manifest 均按 `:generateImages` 编写 |
| `POST /v1beta/models/{model}:predictLongRunning`（同结构） | `/google/v1beta/models/{model}:generateVideos` | 同上（`:generateVideos`） |

Google 并不提供 `:generateImages` / `:generateVideos` 动作，直通中继会把这两个路径原样
转发给 `generativelanguage.googleapis.com`，预期 404。修正路径需要同时改：
`model_catalog_import.rs` 的 `path_template`（两份副本）、`ai_route_taxonomy`、
`provider_native_classifier`、`path_pattern`、`openapi_billing_matrix` 测试与路由清单，
并同步 `../sdkwork-models` 的 catalog 表——属于跨仓路由决策，本轮只取证、不改路径。
完整方案见 [ROUTING-PATH-DECISIONS-2026-11-11.md](ROUTING-PATH-DECISIONS-2026-11-11.md)。

## 7. 参考

- Discovery：<https://generativelanguage.googleapis.com/$discovery/rest?version=v1beta>
- 文档：<https://ai.google.dev/gemini-api/docs>
