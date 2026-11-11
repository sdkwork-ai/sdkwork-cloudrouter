# MiniMax open-api 契约对齐（2026-11-11）

## 1. 结论

以 `platform.minimax.io/docs/llms.txt` 索引的官方 OpenAPI 为准，本轮完成了：

- `POST /minimax/v1/music_generation`（音乐生成）
- `POST /minimax/v1/t2a_v2`（同步语音合成）

两条门面的路径与官方一致，但请求体缺字段、缺枚举/边界/默认值。视频（legacy
`/v1/video_generation`）、查询（`/v1/query/video_generation`）、文件
（`/v1/files/retrieve`）三条路径也与官方一致，字段留待后续核对。

## 2. 音乐生成

官方 `GenerateMusicReq`：

| 字段 | 官方 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `model` | enum `music-3.0/music-2.6/music-cover/music-3.0-free/music-2.6-free/music-cover-free` | 自由 string | ✅ |
| `prompt` | string ≤2000，条件必填 | ✅ 无长度 | ✅ |
| `lyrics` | string 1–3500，条件必填 | ✅ 无边界 | ✅ |
| `stream` | boolean，默认 false | ✅ | ✅ |
| `output_format` | enum `url/hex`，默认 `hex` | 自由 string | ✅ |
| `lyrics_optimizer` | boolean，默认 false | ✅ 无默认值 | ✅ |
| `is_instrumental` | boolean，默认 false | ✅ 无默认值 | ✅ |
| `audio_setting` | `{sample_rate, bitrate, format}` | ✅ 无枚举 | ✅ |
| `audio_url` | string，`music-cover` 与 `audio_base64` 二选一 | ❌ | ✅ |
| `audio_base64` | string | ❌ | ✅ |
| `cover_feature_id` | string，与参考音频互斥 | ❌ | ✅ |

`audio_setting` 枚举：`sample_rate ∈ {16000,24000,32000,44100}`、
`bitrate ∈ {32000,64000,128000,256000}`、`format ∈ {mp3,wav,pcm}`。

## 3. 同步语音合成

官方 `T2aV2Req`：

| 字段 | 官方 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `model` | enum `speech-2.8-hd/2.8-turbo/2.6-hd/2.6-turbo/02-hd/02-turbo/01-hd/01-turbo` | 自由 string | ✅ |
| `text` | string ≤10000 | ✅ 无长度 | ✅ |
| `stream` | boolean，默认 false | ✅ | ✅ |
| `stream_options` | `{exclude_aggregated_audio}` | ❌ | ✅ |
| `voice_setting` | object | ✅ 自由 JSON | ◐ 保留 free-form（字段多，后续细化） |
| `audio_setting` | object | ✅ 自由 JSON | ◐ 同上 |
| `pronunciation_dict` | object | ✅ | ✅ |
| `timbre_weights` | array `{voice_id, weight}` | ❌ | ✅ |
| `language_boost` | enum（40+ 语言 + `auto`） | 自由 string | ◐ 保留 string（枚举过长） |
| `text_normalization_mode` | enum `basic/quality` | ❌ | ✅ |
| `voice_modify` | `{pitch,intensity,timbre,sound_effects}` | ❌ | ✅ |
| `subtitle_enable` | boolean，默认 false | ✅ | ✅ |
| `subtitle_type` | enum `sentence/word/word_streaming`，默认 `sentence` | ❌ | ✅ |
| `output_format` | enum `url/hex`，默认 `hex` | ❌ | ✅ |

## 4. 已发现的路径/版本差异（未改）

| 门面 | 官方当前 | 说明 |
| --- | --- | --- |
| 图片生成 | `POST /v1/images/generations`（H3-Image） | 契约发布 `/v1/image_generation`（image-01 legacy）；两者是不同代 API |
| 视频生成 | `POST /v2/video_generation`（v2）与 legacy `POST /v1/video_generation` | 契约发布 legacy `/v1/video_generation`，仍见于官方 llms 索引 |
| 音乐 | `POST /v1/music_generation` | 一致 |

图片门面的路径差异是**版本代际**问题，不是字段问题：要么把门面升级到 H3
（`/v1/images/generations`，同时要改 classifier/catalog/定价），要么继续发布
legacy image-01。需要一次明确决策，本轮未静默改路径。

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

- 文档索引：<https://platform.minimax.io/docs/llms.txt>
- 音乐生成：<https://platform.minimax.io/docs/api-reference/music-generation>
- 同步 TTS：<https://platform.minimax.io/docs/api-reference/speech-t2a-http>
- 文生视频（legacy）：<https://platform.minimax.io/docs/api-reference/video-generation-t2v>

## 7. 补充：legacy 视频/图片门面（2026-11-11 第二批）

按 docs 内嵌 OpenAPI 补齐 legacy 门面的枚举/默认值（路径仍是 legacy，未动）：

| Schema | 修复 |
| --- | --- |
| `MinimaxVideoGenerationRequest` | `model` 枚举 `MiniMax-Hailuo-2.3/MiniMax-Hailuo-02/T2V-01-Director/T2V-01`；`resolution` 枚举 `720P/768P/1080P` |
| `MinimaxVideoGenerationTask` | `status` 枚举 `Preparing/Queueing/Processing/Success/Fail`；补 `video_width`/`video_height` |
| `MinimaxImageGenerationRequest` | `model` 枚举 `image-01/image-01-live`；`aspect_ratio` 8 值；`response_format` 枚举默认 `url`；`n` 默认 1；`prompt_optimizer` 默认 false；补 `subject_reference`（i2i） |
| `MinimaxImageGenerationResponse` | `data` 类型化为 `MinimaxImageData`（`image_urls`/`image_base64`） |

新增单测 `test_documents_minimax_legacy_enums`；测试总数 94。

**路径仍待决策**：官方当前图片门面是 `/v1/images/generations`（H3），本仓发布
`/v1/image_generation`（image-01 legacy）；视频 legacy `/v1/video_generation` 与官方一致。
