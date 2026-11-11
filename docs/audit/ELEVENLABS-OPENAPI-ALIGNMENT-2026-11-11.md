# ElevenLabs open-api 契约对齐（2026-11-11）

## 1. 结论

`POST /elevenlabs/v1/text-to-speech/{voice_id}` 的请求体此前只有 `model_id`、`text`
和一个只含 `speed` 的 `voice_settings`，且把 `model_id` 误标为必选。以 ElevenLabs
官方 OpenAPI（`https://api.elevenlabs.io/openapi.json`，缓存于
`.tmp-vendor-specs/elevenlabs.json`）中的 `Body_text_to_speech_full` 为唯一依据，
本轮补齐全部 14 个顶层字段、6 个 voice setting、6 个音频效果字段，并把必选集合
修正为只有 `text`。

## 2. 顶层字段

| 字段 | 官方类型 / 约束 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `text` | string，必选 | ✅（必选） | ✅ |
| `model_id` | string，默认 `eleven_multilingual_v2` | ✅ 但误标必选 | ✅ 改为可选并带默认值 |
| `language_code` | string，ISO 639-1 | ❌ | ✅ |
| `voice_settings` | object（见下） | ◐ 仅 `speed` | ✅ |
| `pronunciation_dictionary_locators` | array，最多 3 个 `{pronunciation_dictionary_id, version_id}` | ❌ | ✅ |
| `seed` | integer，[0, 4294967295] | ❌ | ✅ |
| `previous_text` | string | ❌ | ✅ |
| `next_text` | string | ❌ | ✅ |
| `previous_request_ids` | array\<string\>，最多 3 | ❌ | ✅ |
| `next_request_ids` | array\<string\>，最多 3 | ❌ | ✅ |
| `use_pvc_as_ivc` | boolean | ❌ | ✅ |
| `apply_text_normalization` | enum `auto/on/off`，默认 `auto` | ❌ | ✅ |
| `apply_language_text_normalization` | boolean，默认 false | ❌ | ✅ |
| `audio_effects` | object（见下） | ❌ | ✅ |

## 3. `ElevenLabsVoiceSettings`

`stability`（[0,1]，默认 0.5）、`similarity_boost`（[0,1]，默认 0.75）、
`style`（默认 0）、`use_speaker_boost`（默认 true）、`speed`（默认 1）、
`clone_strength`（[0,1]）。

## 4. `ElevenLabsPronunciationDictionaryLocator`

`pronunciation_dictionary_id`（必选）、`version_id`（可选，缺省用最新版本）。

## 5. `ElevenLabsAudioEffects`

`filter_preset_id`、`distance`（[0,1]，默认 0）、`environment_id`、
`background_noise_id`、`send_level`（[0,1]，默认 1）、`pan`（[-1,1]，默认 0）。

## 6. 实现与验证

- 唯一手写源：`tools/cloudrouter_gateway_openapi_generator.py`
- 新增 `ElevenLabsVoiceSettings` / `ElevenLabsPronunciationDictionaryLocator` /
  `ElevenLabsAudioEffects` 三个组件，并重写 `ElevenLabsTextToSpeechRequest`
- 回归测试：`tests/test_cloudrouter_gateway_openapi_generator.py`
  `test_documents_elevenlabs_text_to_speech_official_fields`

| 命令 | 结果 |
| --- | --- |
| `python -B -m tools.cloudrouter_gateway_openapi_generator --check` | current |
| `python -B -m unittest tests.test_cloudrouter_gateway_openapi_generator` | 94 tests OK |
| `node tools/sync-cloudrouter-api-standard-extensions.mjs --check` | ok |
| `node scripts/materialize-apis-contracts.mjs --check` | passed |
| `python -B -m tools.cloudrouter_openapi_contract_audit` | passed |
| `python -B -m tools.cloudrouter_openapi_precision_audit` | passed |
| `node tools/audit-vendor-openapi-conformance.mjs` | `{"WIRE_EQUIVALENT":13,"OK":20}` |

## 7. 备注

`voice_settings` 官方类型是 `VoiceSettingsResponseModel`（可空）；契约里用非空的
`ElevenLabsVoiceSettings` 表达同一组字段，省略即使用厂商默认值，与官方语义一致。

## 8. 补充：music / sound-generation 约束（2026-11-11 第二批）

用官方 OpenAPI 做"字段名之外"的约束比对（`.tmp/primitive_compare.py`），发现：

### 8.1 `POST /v1/music`

| 字段 | 官方 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| `music_prompt` | object（`MusicPrompt`：`positive_global_styles`/`negative_global_styles` ≤50、`sections` ≤30） | **string** | ✅ `ElevenLabsMusicPrompt` |
| `composition_plan` | `MusicPrompt | CompositionPlan`（`chunks` ≤30） | 自由 object | ✅ `oneOf` 两个 schema |
| `prompt` | ≤4100 | 无界 | ✅ |
| `lyrics_text` | ≤4000 | 无界 | ✅ |
| `generation_mode` | `track/loop/ambience/video_to_music` | 自由 string | ✅ |
| `music_length_ms` | 3000–600000 | 无界 | ✅ |
| `model_id` | `music_v1/music_v2/music_v2_5`，默认 `music_v1` | 自由 string | ✅ |
| `seed` | 0–2147483647 | 无界 | ✅ |
| `finetune_id` / `finetune_strength` | ≤100 / ≤2.0，默认 1.0 | 无界 | ✅ |
| 布尔开关 | `force_instrumental`/`use_phonetic_names`/`store_for_inpainting`/`sign_with_c2pa` 默认 false，`respect_sections_durations` 默认 true | 无默认 | ✅ |

### 8.2 `POST /v1/sound-generation`

| 字段 | 官方 | 旧契约 | 现状 |
| --- | --- | --- | --- |
| 必选 | 只有 `text` | `model_id` + `text` | ✅ |
| `model_id` | `eleven_text_to_sound_v2/v3`，默认 v2 | 自由 string 且必填 | ✅ |
| `loop` | 默认 false | 无默认 | ✅ |
| `duration_seconds` | 0.5–30 | 无界 | ✅ |
| `prompt_influence` | 0–1 | 无界 | ✅ |

`duration_seconds`/`prompt_influence`/TTS `seed` 的边界来自官方字段描述（schema 用
`anyOf: [number, null]` 表达可空，未在 JSON Schema 层写 bounds），保留我们的显式边界
是更严格的正确表达。

新增单测 `test_documents_elevenlabs_music_and_sound_constraints`；测试总数 87。
