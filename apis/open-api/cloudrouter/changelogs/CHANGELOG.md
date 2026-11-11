# Cloud Router Open API Changelog

## Unreleased

- Volcengine Ark and ByteDance Ark media doors now publish the vendor's official
  request bodies instead of a reduced local subset:
  - `POST /volcengine/api/v3/contents/generations/tasks` and
    `POST /bytedance/api/v3/contents/generations/tasks` accept all 20 documented
    fields (`model`, `content`, `omni_reference_task_type`, `resolution`,
    `ratio`, `duration`, `frames`, `generate_audio`, `watermark`,
    `output_format`, `seed`, `camera_fixed`, `return_last_frame`, `draft`,
    `service_tier`, `callback_url`, `execution_expires_after`, `priority`,
    `safety_identifier`, `tools`) with the documented enums, bounds, and
    defaults. `metadata` was not part of the official body and is removed.
  - `content[]` items now carry `type`, `text`, `image_url`, `video_url`,
    `audio_url`, `draft_task`, and `role`. `image_url` / `video_url` /
    `audio_url` are objects with a required `url`, matching Ark; the previous
    string shape was wrong.
  - `GET /volcengine/api/v3/contents/generations/tasks/{task_id}` and
    `GET /bytedance/api/v3/contents/generations/tasks/{task_id}` now describe the
    official task state: `id`, `model`, `status`, `content.video_url`,
    `content.last_frame_url`, `usage`, `created_at`, `updated_at`, `seed`,
    `resolution`, `ratio`, `duration`, `frames`, `framespersecond`,
    `generate_audio`, `draft`, `output_format`, `priority`,
    `safety_identifier`, `service_tier`, `tools`, and `error`.
  - `POST /volcengine/api/v3/images/generations` and
    `POST /bytedance/api/v3/images/generations` now follow the Seedream docs:
    `prompt`, `image` (string or string array), `layer_decomposition`, `size`,
    `optimize_prompt_options.mode`, `output_format`, `background`,
    `response_format`, `sequential_image_generation`,
    `sequential_image_generation_options.max_images`, `stream`, `tools`, and
    `watermark`. The local-only `seed` field is removed.
- Breaking for generated SDK consumers: `VolcengineContentPart.image_url` and
  `.video_url` change from strings to objects, `VolcengineContentGenerationTask.content`
  changes from an array of parts to the output object, and `metadata` is gone.
  These types now mirror the wire the vendor actually accepts.
- Alibaba DashScope image and video doors now publish the official contract:
  - `POST /alibaba/api/v1/services/aigc/text2image/image-synthesis` requires
    `X-DashScope-Async: enable` (DashScope serves only asynchronous HTTP) and a
    typed body: `input.prompt` / `input.negative_prompt` and
    `parameters.size` / `parameters.n` (1-4) / `parameters.prompt_extend` /
    `parameters.watermark` / `parameters.seed`.
  - `POST /alibaba/api/v1/services/aigc/video-generation/video-synthesis` also
    requires the async header and types `input.prompt`, `input.negative_prompt`,
    `input.img_url`, `input.audio_url`, `input.template` plus
    `parameters.resolution` (`480P/720P/1080P`), `parameters.ratio`,
    `parameters.duration` (2-15), `parameters.prompt_extend`,
    `parameters.watermark`, and `parameters.seed`.
  - Polling now documents `task_status` (`PENDING/RUNNING/SUCCEEDED/FAILED/CANCELED/UNKNOWN`),
    `submit_time`, `scheduled_time`, `end_time`, `orig_prompt`, `video_url`, and
    the `usage` counters (`duration`, `input_video_duration`,
    `output_video_duration`, `SR`, `ratio`, `image_count`).
- ElevenLabs `POST /elevenlabs/v1/text-to-speech/{voice_id}` now publishes the
  vendor's full `Body_text_to_speech_full`: `text` is the only required field
  (`model_id` is optional with the vendor default `eleven_multilingual_v2`), and
  `language_code`, `voice_settings`, `pronunciation_dictionary_locators`, `seed`,
  `previous_text`, `next_text`, `previous_request_ids`, `next_request_ids`,
  `use_pvc_as_ivc`, `apply_text_normalization`,
  `apply_language_text_normalization`, and `audio_effects` are typed.
- Kling image generation and video-to-audio now publish the vendor's official
  fields:
  - `POST /kling/v1/images/generations` gains `negative_prompt`,
    `image_reference` (`subject/face`), `image_fidelity`, `human_fidelity`,
    `element_list`, `resolution` (`1k/2k`), `n`, the eight-value
    `aspect_ratio` enum, `watermark_info`, and `external_task_id`; the invented
    `image_reference_list` is removed. The response is the official envelope
    `{code, message, request_id, data{task_id, task_status, task_status_msg,
    task_info, created_at, updated_at, task_result{images[]}}}`.
  - `POST /kling/v1/audio/video-to-audio` replaces the invented `prompt` with
    `sound_effect_prompt`, `bgm_prompt`, and `asmr_mode`.
- Anthropic Messages now publishes the current official body:
  `cache_control`, `container` (+`skills`), `diagnostics`, `inference_geo`,
  `output_config` (`effort` / JSON output format), `service_tier`
  (`auto/standard_only`), and `speed` (`standard/fast`) are added;
  `metadata` is typed as `{user_id}` and `max_tokens` accepts the documented
  `0` (cache pre-warm). `temperature` / `top_p` / `top_k` stay as compatibility
  fields.
- Zhipu image and video doors now match the vendor's embedded OpenAPI:
  image gains model/quality enums, the `1280x1280` size default, and
  `user_id` 6-128 bounds; its response becomes
  `{created, data[{url}], content_filter[{role, level}]}`.
  Video `image_url` becomes `string | Base64 | [first, last]`,
  `prompt` is optional (prompt or image_url required), and `fps` (30/60),
  `duration` (5/10), `quality` (speed/quality), `with_audio`, `watermark_enabled`,
  and `user_id` are typed. The async result publishes
  `PROCESSING/SUCCESS/FAIL`, `video_result[{url, cover_image_url}]`, and
  `image_result[{url}]`.
- MiniMax music and TTS now publish the vendor's full request bodies:
  music adds `audio_url`, `audio_base64`, `cover_feature_id`, model enums,
  output-format and audio-setting enums/defaults; TTS adds `stream_options`,
  `timbre_weights`, `text_normalization_mode`, `voice_modify`,
  `subtitle_type`, and `output_format`, with the speech model enum and
  `text` length bound.
- Stability AI doors now publish the vendor's multipart transport:
  `POST /stability_ai/v2beta/stable-image/generate/{mode}` and
  `POST /stability_ai/v2beta/audio/stable-audio-2/text-to-audio` accept
  `multipart/form-data` instead of JSON. The image door still requires
  `Accept: application/json` (it publishes the JSON form); the audio door
  returns `audio/mpeg` bytes and no longer requires that header.
- Luma Dream Machine now publishes the official `GenerationRequest`: `model`
  is the only required field (enum `ray-2/ray-flash-2`, default `ray-2`),
  `generation_type`, the seven-value `aspect_ratio`, typed
  `keyframes.frame0/frame1` (`image{url}` or `generation{id}`), and `concepts`
  are added; the response publishes `state`
  (`queued/dreaming/completed/failed`), `assets{video,image}`, `model`, and
  `request`.
- OpenAI-compatible `/v1` media operations now follow the official OpenAPI:
  - `POST /v1/images/generations` publishes all 19 documented fields (GIF
    frame controls, `svg`, `output_format`, `output_compression`, `stream`,
    `partial_images`, `moderation`, `background`, `style`,
    `safety_identifier`, `user`) and `n` is bounded to 1-10.
  - `POST /v1/images/edits` uses the documented `images` array (1-16) in the
    JSON carrier and types the multipart carrier; `model` is no longer required
    in JSON.
  - `POST /v1/audio/speech` adds `instructions` and `stream_format`, bounds
    `speed` to 0.25-4, and drops the invented `metadata`.
  - `POST /v1/videos` now publishes `model/prompt/input_reference/seconds/size`
    with `prompt` as the only required field; edits, extensions, and remix
    publish their documented required sets.
  - `POST /v1/batches` adds `output_expires_after`; `POST /v1/completions` adds
    `stream_options`.
- OpenAI-compatible platform operations now follow the vendor OpenAPI:
  assistants gain `reasoning_effort`; conversation items use the documented
  `{items: [...]}` body; `responses/input_tokens` and `responses/compact` add
  their documented fields; thread runs add the truncation/sampling/tool fields;
  uploads add `expires_after`; vector stores add `description` and file batches
  add `files`; voice creation uses `{type, name, prompt, script_hint, model}`;
  containers add `expires_after`/`skills`/`network_policy` and drop the invented
  `metadata`; voice consent updates drop `metadata`.
- OpenAI-compatible realtime operations now match the vendor OpenAPI:
  client-secret creation takes `{expires_after, session}`; session creation
  publishes `client_secret` plus the audio/tracing/turn-detection/truncation
  fields; transcription sessions add `input_audio_noise_reduction` and `include`;
  call accept publishes the documented session fields, refer takes `target_uri`,
  reject takes `status_code`, and hangup is published without a request body.
- Vidu request bodies now follow the vendor API reference: video doors add
  `audio`/`off_peak`/`watermark`/`wm_position`/`wm_url`/`meta_data`, image-to-video
  adds `is_rec` and drops the unsupported `aspect_ratio`, reference-to-video adds
  `subjects`/`auto_subjects`/`bgm`/`sounds`, image generation adds
  `bgm`/`resolution`/`off_peak` and makes `images` optional, audio doors rename
  `text`/`timing_data` to `prompt`/`timing_prompts` and add duration/seed/BGM
  fields, and scene templates add the prompt/seed/area/beast/watermark fields
  while dropping the invented `video_urls`. Vidu task responses publish the
  documented `state` enum plus `prompt`/`duration`/`seed`/`credits`/`err_code`
  echoes and `creations[].watermarked_url`.
- PixVerse text-to-video now publishes the official request
  (`model`/`prompt`/`duration`/`quality`/`aspect_ratio` required, plus
  `seed`/`webhook_id`/`generate_audio_switch`/`generate_multi_clip_switch`),
  drops the invented `img_id`/`motion_mode`/`negative_prompt`, requires the
  `Ai-trace-id` header on create and poll, and types the
  `{ErrCode, ErrMsg, Resp, Error}` envelope with `status` 1/5/7/8.
- Media billing now waives the per-result charge for three additional 2xx
  business-failure shapes: PixVerse `ErrCode != 0`, DashScope
  `output.task_status: FAILED`, and Luma `state: failed`.
- Runway text/image-to-video publish the per-model union (`contentModeration`,
  `outputFormat` incl. HDR, `proresProfile`, `audio`, `negativePrompt`,
  `providerSettings`, `references`, `resolution`, `referenceAudio`,
  `referenceVideos`, `cfgScale`, `bitrate`, `promptExpansionMode`, `draft`,
  `draftTaskId`), and text-to-image adds `quality`/`background`/`backgroundColor`/
  `outputCount`/`grounding`/`edit`/`preciseEdit`/`maskUri`/`thinkingLevel`/`colors`.
- Black Forest Labs `flux-3-video` is now the vendor's discriminated union on
  `mode` (`t2v`/`i2v`/`v2v`/`draft_enhance`) with `keyframes`/`start_video`/
  `draft_cache`/`safety_tolerance`/`generate_audio`, and drops the invented
  `image`/`seed`.
- Gemini requests now publish the documented `store`/`continuationToken`/
  `serviceTier`/`labels`/`model` fields, `embedContent` gains
  `model`/`embedContentConfig`, and the nested `generationConfig`/`Part`/`Tool`
  schemas add the response-modality, media-resolution, thought, tool-call,
  file-search, maps, computer-use, and MCP-server fields. Cached-content
  creation now requires `model`.
- Anthropic `tool_choice` publishes the `auto`/`any`/`tool`/`none` enum plus
  `disable_parallel_tool_use`; `thinking` publishes
  `enabled`/`disabled`/`between_tools`/`adaptive`, a 1024-token budget floor, and
  the `display` mode; tools accept `type`/`cache_control` plus
  `allowed_callers`/`defer_loading`/`eager_input_streaming`/`input_examples`/
  `strict` and a length/pattern-constrained name; `tools` now accepts the
  documented server tools (`bash_20250124`, `text_editor_2025*`,
  `web_search_20250305`, `tool_search_tool_regex`) with `max_uses`,
  domain filters, `user_location`, and text-editor/computer-use fields; and the
  `count_tokens` request now carries only the nine documented fields instead of
  the full Messages generation surface.
- xAI video edit/extension inputs accept either `url` or a Files API `file_id`,
  and generated video results publish `duration` alongside `url`/`file_id`.
- ElevenLabs music publishes the documented `music_prompt`/`composition_plan`
  structures, prompt/lyrics/seed/length bounds, model enum and defaults;
  sound-generation now requires only `text` and publishes the SFX model enum,
  loop default, and duration/influence bounds.
- Black Forest Labs' parameterized `flux-{model}` image door publishes the union
  of the vendor's per-model fields (resolution, mode, steps, guidance, image
  references, mask, expand offsets, finetune, webhooks, user/version).

- xAI image generation/edits publish the `n` 1–10 bound, the `1k/1.5k/2k`
  resolution enum, the full aspect-ratio enum on edits, and the `url` default
  response format.
- Runway prompt length/duration/negative-prompt bounds, and the BFL
  `flux-3-video` aspect-ratio enum, duration range, keyframe shapes, and model
  defaults now follow the vendor OpenAPI.
- Stability image generation publishes the core/ultra/sd3 union (`mode`,
  `model` enum, `aspect_ratio` enum, `style_preset`, `cfg_scale`, `strength`
  bounds, output format default), and audio publishes its model/format/duration
  defaults.
- Alibaba Qwen-TTS publishes a typed `input` envelope
  (`text`/`voice`/`language_type`/`instructions`/`optimize_instructions`)
  instead of a free object.
- ByteDance Seed TTS now publishes the vendor's `{req_params: {text, speaker,
  audio_params, ...}}` body, the `mp3/pcm/ogg_opus/wav` format enum, and the
  required `X-Api-Request-Id` header.
- Runway text-to-image now returns the vendor's `{id, estimatedCost}`
  acknowledgement like the video create endpoints, instead of the task body.
- MiniMax legacy video/image doors publish their model/resolution/status/
  aspect-ratio enums, image response-format default, `n`/`prompt_optimizer`
  defaults, `subject_reference`, and a typed `image_urls`/`image_base64` data
  envelope.
- Anthropic content blocks publish the documented 16 block types plus
  `cache_control`, `citations`, `thinking`, `signature`, `data`, `is_error`,
  `caller`, `toolset_name`, `title`, and `context`.
- Vidu scene templates publish `video_urls` again for motion-control templates
  such as `motion_control_2`.
- The vendor-compatibility SDK family now regenerates end to end: the SDK
  runtime standardizer strips the external-wire marker pair only from the
  derived `*.sdkgen.json` generator input (the authority OpenAPI keeps them), so
  `generate-sdk.mjs --all` emits all 218 published operations for Rust,
  TypeScript, Go, Python, Java, Kotlin, C#, Swift, and Flutter instead of the
  empty surface the canonical generator produced for external operations.

## 0.4.12

- Published vendor-native image and video generation doors for every media
  vendor whose catalog models declare `apiFormat = vendor_native` but had no
  published entry point. Before this change the `IMAGES` surface exposed only
  OpenAI, Google Gemini, Kling, Vidu, and Volcengine Ark, and the `VIDEOS`
  surface only OpenAI, Google Gemini, Kling, Vidu, and Volcengine Ark, so the
  native surfaces of nine vendors were reachable by the routing chain but
  absent from the contract (and therefore from every generated SDK).
- Image generation doors added:
  - `POST /alibaba/api/v1/services/aigc/text2image/image-synthesis` (DashScope
    Wanx). Its asynchronous task is read back through the already published
    `GET /alibaba/api/v1/tasks/{task_id}`: DashScope uses one task record for
    both modalities, and the `results` array carries the image outputs.
  - `POST /black_forest_labs/v1/flux-{model}` and
    `GET /black_forest_labs/v1/get_result` (FLUX submit plus id polling).
  - `POST /black_forest_labs/v1/flux-3-video` (FLUX 3 video; asynchronous like
    the image surface, polled through the same `get_result` route). This closes
    the vendor-door audit's `black_forest_labs/video` gap: the catalog's
    `vendor_native` flux-3 video model had bound to `openai.video`
    (`POST /v1/videos`), a path BFL does not serve.
  - `POST /bytedance/api/v3/images/generations` (Ark Seedream).
  - `POST /runway/v1/text_to_image` and `GET /runway/v1/tasks/{task_id}`.
  - `POST /stability_ai/v2beta/stable-image/generate/{mode}`.
  - `POST /zhipu/api/paas/v4/images/generations` (CogView).
- Video generation doors added:
  - `POST /alibaba/api/v1/services/aigc/video-generation/video-synthesis` and
    `GET /alibaba/api/v1/tasks/{task_id}` (DashScope Wan).
  - `POST /bytedance/api/v3/contents/generations/tasks` and
    `GET /bytedance/api/v3/contents/generations/tasks/{task_id}` (Ark Seedance).
  - `POST /jimeng/v1/videos/generations` and `GET /jimeng/v1/tasks/{task_id}`.
  - `POST /luma_ai/dream-machine/v1/generations` and
    `GET /luma_ai/dream-machine/v1/generations/{generation_id}`.
  - `POST /pixverse/openapi/v2/video/text/generate` and
    `GET /pixverse/openapi/v2/video/result/{video_id}`.
  - `POST /zhipu/api/paas/v4/videos/generations` and
    `GET /zhipu/api/paas/v4/async-result/{task_id}` (CogVideoX).
- MiniMax image and video doors added, with the routing support they need:
  - `POST /minimax/v1/image_generation` (synchronous image-01 family).
  - `POST /minimax/v1/video_generation`, `GET /minimax/v1/query/video_generation`
    and `GET /minimax/v1/files/retrieve` (Hailuo). The three steps are separate
    doors on purpose: the query answers a `file_id`, and only the file retrieve
    turns it into a download URL, so a flow without it could submit and poll but
    never fetch the video.
  - These are the first doors in this change that required *new* routing
    capability rather than a publication of existing capability. Added:
    `minimax.image_generation`, `minimax.video_generation`,
    `minimax.video_generation_task_query`, and `minimax.video_file_retrieve`
    taxonomy routes; four seeded `api_endpoint` resources; classifier arms in
    both copies of the path map; `official.minimax.full`, `api.minimax.image`,
    and `api.minimax.video` resource groups; and a MiniMax arm in
    `vendor_native_video_descriptor` in both `model_catalog_import.rs` copies.
  - The vendor arm fixes a live defect: all 19 Hailuo models declare
    `apiFormat = vendor_native` but had no descriptor, so they were bound to
    `openai.video` (`POST /v1/videos`) — a route MiniMax does not serve. They now
    bind to `minimax.video_generation` (`POST /v1/video_generation`).
  - MiniMax image models stay on the OpenAI-compatible face
    (`POST /v1/images/generations`): their catalog declaration is
    `openai_compatible`, so `minimax.image_generation` is declared for the
    published door and no model binds to it — the same shape as
    `alibaba.image_generation` and `zhipu.image_generation`.
- Runway video doors added, fixing a live mis-binding:
  - `POST /runway/v1/text_to_video` and `POST /runway/v1/image_to_video`, polled
    through the already published `GET /runway/v1/tasks/{task_id}`. Runway
    publishes both as unified endpoints: the catalog's Runway model family
    (`gen4.5`, `gen4_turbo`, `kling3.0_pro`, `seedance2`, `veo3.1`, `wan3`,
    `hailuo3`, `grok_imagine_1_5`, `gemini_omni_flash`, ...) appears in their
    `model` enums, so one route serves Runway's own models and the third-party
    models it resells.
  - All 31 Runway video models declare `apiFormat = vendor_native` but had no
    descriptor, so they were bound to `openai.video` (`POST /v1/videos`) — a
    route Runway does not serve. They now bind to `runway.text_to_video`
    (`POST /v1/text_to_video`). `text_to_video` is the bound surface because a
    text prompt is the minimum viable request; `image_to_video` is an
    explicit-entry surface, the same shape as `kling.image_to_video`, because a
    `ModelInfo` carries no generation-mode field and one vendor can bind exactly
    one video endpoint.
  - Residual, documented rather than hidden: the catalog also carries Runway
    `video_to_video` / avatar models (`act_two`, `aleph2`, `ruby`,
    `enhance_frame_rate`, `magnific_video_upscaler_creative`, `gwm1_avatars`).
    Those do not answer `POST /v1/text_to_video`; serving them needs the
    `video_to_video` and `avatar_videos` surfaces and a catalog field that names
    the generation mode, which this change does not add.
- xAI Grok Imagine media surface published in full, one door per official path
  (the vendor's own OpenAPI is the source for every path and payload field):
  - Images: `POST /xai/v1/images/generations`,
    `POST /xai/v1/images/edits`, and `GET /xai/v1/images/{request_id}` — the
    deferred-image poll that `deferred: true` answers with (202 while pending,
    200 with `data` when done, body `error` when failed).
  - Videos: `POST /xai/v1/videos/generations`,
    `POST /xai/v1/videos/edits`, `POST /xai/v1/videos/extensions`, and
    `GET /xai/v1/videos/{request_id}`.
  - Payloads now mirror the vendor exactly instead of approximating it:
    `prompt` is the only required image-generation field; `n`, `aspect_ratio`
    (with the vendor's 16-value enum), `resolution`, `response_format`
    (`url`/`b64_json`), `deferred`, `output`, `storage_options`, and `user` are
    published; the invented `size` field is gone. Video generation publishes
    `duration` (1–15, default 8, plus the vendor's `seconds` alias),
    `image`, `keyframes`, `reference_images`, `reference_audios`,
    `aspect_ratio`, `resolution`, `output`, `storage_options`, and `user`; the
    start response is the official `{request_id}` envelope, and the poll
    reports `status`, `progress` on the vendor's 0–100 scale, `model`, `video`,
    `usage.cost_in_usd_ticks`, and `error`.
  - Routing additions: `xai.image_edit`, `xai.image_generation_task_query`,
    `xai.video_edit`, `xai.video_extension` taxonomy routes with their seeds,
    `official.xai.full` grants, classifier arms (literal arms ahead of the two
    poll arms), and modality mappings. `xai.image_generation` and
    `xai.video_generation` left the compat-face exemption ledger.
  - Model binding corrected for video: the three `grok-imagine-video*` models
    now declare `apiFormat = vendor_native` and bind to `xai.video_generation`
    (`POST /v1/videos/generations`). They previously declared
    `openai_compatible`, which bound them to `openai.video`
    (`POST /v1/videos`) — a path xAI does not serve (its submit path is
    `/v1/videos/generations`; only the poll shares OpenAI's shape). Image models
    stay `openai_compatible`: their endpoint really is OpenAI's
    `POST /v1/images/generations`, so the generic face is the honest binding.
- Every added path reuses the api codes, resource seeds, billing meters, and
  classifier arms the routing layer already declares, so a published operation
  resolves end to end (`tools/check-cloudrouter-ai-routing-consistency.mjs`
  reports 64 routed vendor-native operations over 19 namespaces, up from 31
  over 9). Two of them needed a new classifier arm before the door could be
  truthful: `alibaba.image_generation` and `zhipu.image_generation` were seeded
  but exempted as "compat face" endpoints, so their doors would have failed
  closed with `50201`; both now classify (`POST
  /api/v1/services/aigc/text2image/image-synthesis` and `POST
  /api/paas/v4/images/generations`) and left the exemption ledger.
- Namespace registration moved with the contract: the gateway generator's
  `VENDOR_PROVIDER_PREFIXES`, the standard-extension sync's
  `inferExternalProtocolId` / `isExternalWireProtocolRoute`, the SDK runtime
  standardizer's `infer_external_protocol_id`, and the two `OPEN_API_PREFIXES`
  mirrors now know `alibaba`, `black_forest_labs`, `bytedance`, `jimeng`,
  `luma_ai`, `pixverse`, `runway`, `stability_ai`, and `zhipu`.
- Vendors whose media models declare `openai_compatible` keep the generic face
  as their model-binding path: `minimax`, `xai`, and `xiaomi` image models are
  served by `POST /v1/images/generations`, and `xiaomi` video models by
  `POST /v1/videos`. Their native paths either equal the OpenAI-compatible path
  (`xiaomi`) or are declared only for the published door (`minimax` image).
  `xai` video models no longer belong here: their vendor submit path is
  `/v1/videos/generations`, so they declare `vendor_native` and bind to
  `xai.video_generation`. `runway` video models bind to
  `runway.text_to_video` (`POST /v1/text_to_video`) for the same reason.
- Vendor-spec conformance audited with a repeatable tool
  (`tools/audit-vendor-openapi-conformance.mjs`, cached specs under
  `.tmp-vendor-specs`): against the vendors' own machine-readable specs —
  Google Gemini discovery, ElevenLabs, Black Forest Labs, xAI, Runway — 18
  operations are field-identical and 13 are wire-equivalent with a recorded
  reason (Google `{+name}`/`{+model}` resource wildcards and actions absent from
  the discovery document; BFL per-model `/v1/flux-<suffix>` paths). The audit
  found and this change fixes:
  - `POST /xai/v1/videos/extensions` published a `user` field that the vendor's
    `ExtendVideoRequest` does not accept.
  - `POST /black_forest_labs/v1/flux-{model}` documented `{model}` as the full
    model id, which would have produced `/v1/flux-flux-2-pro`; `{model}` is the
    suffix that follows `flux-` (for example `2-pro`, `pro-1.1`).
- Billing regression refreshed for the larger surface. The golden matrix
  (`tests/golden/openapi_billing_matrix.tsv`) now covers 205 operations and the
  readiness lock reads 199 sellable of 205 (Free 130, metered 65, sound 1,
  priced per-call 3, unpriced per-call 5, unsellable 1). Vendor-native file
  retrieval is Free by the same rule as `*.task_query`: the artifact was already
  billed at generation, and with no `api_request` rate the read would otherwise
  fail closed — which is what `GET /minimax/v1/files/retrieve` did before.
- Relay parameter passing audited end to end. The passthrough already forwards
  the request body as raw bytes (no schema filtering), preserves the query string
  (`?task_id=`, `?file_id=`, `?id=`), forwards every non-hop-by-hop header, and
  streams success responses unbuffered — so `202`, binary bodies, and vendor JSON
  all arrive unchanged. The gap was contract-side: a header the vendor rejects a
  call without was not declared, so a generated SDK could not send it. Now
  declared as required header parameters, sourced from the vendors' own specs:
  - `X-Runway-Version` on all four Runway doors (the vendor pins it with a
    `const`; every request without it is rejected).
  - `anthropic-version` on all eleven Anthropic doors.
  - `Accept: application/json` on the Stability AI door: the vendor returns image
    bytes by default, and the published response schema is the JSON form.
  - `GET /xai/v1/images/{request_id}` now publishes `202` alongside `200`: a
    deferred image answers `202` while pending and `200` with `data` when done.
- Audio surface widened and music split into its own documentation family.
  `Music` is a presentation family (the reference lists music vendors apart from
  speech and sound effects), so the capability router maps it to the audio arm —
  falling through to the LLM arm would have routed every music door as chat:
  - Tags `Music/suno`, `Music/minimax`, `Music/mureka`, `Music/elevenlabs` now
    carry every music operation; `Audio` keeps speech, transcription, voice and
    sound-effect doors.
  - `POST /mureka/v1/song/generate` and `GET /mureka/v1/song/query/{task_id}`
    published. Mureka's taxonomy routes and `api_endpoint` seeds already existed
    (`mureka.music_generation`, `mureka.music_generation_task_query`) with no
    door — the same publication gap the image/video vendors had — so all eight
    Mureka music models were unreachable from the contract.
  - `POST /elevenlabs/v1/music` published against the vendor's own `/v1/music`
    (audio/mpeg body). Its single music model previously fell through to
    `suno.music`, a resource owned by Suno that happens to share the path; the
    model now binds to `elevenlabs.music_generation`.
  - Resource groups: `api.suno.music`, `api.mureka.music`, and
    `api.elevenlabs.music` added; `official.elevenlabs.full` and the curated
    `api.all` now grant the new endpoints.
  - Billing regression refreshed again: 208 published operations, 202 sellable
    (Free 131, metered 67, sound 1, priced per-call 3, unpriced per-call 5,
    unsellable 1). Music create calls bill `AudioSecond` (output second) and the
    two poll routes are Free.
  - Still unpublished, so their models stay on the OpenAI-compatible
    `/v1/audio/*` face or have no door yet: MiniMax speech (12 models),
    ByteDance TTS/music (3), Google Gemini TTS (6), Stability audio (3), Kling
    sound effects (4), and Vidu audio/SFX (12). Each needs a taxonomy route, a
    seed, a classifier arm and a grant before a door can be published — the
    Mureka/empty-door pattern.
- Alibaba speech published, and one case-sensitivity defect found and fixed:
  - `POST /alibaba/api/v1/services/audio/tts/SpeechSynthesizer` (Qwen-Audio-TTS /
    CosyVoice), billed per input character, granted by `official.alibaba.full`.
  - The classifier lower-cases the path before matching
    (`normalize_standard_api_path`; Google's `:generateContent` already depends on
    this), so an arm spelled `SpeechSynthesizer` could never match and the door
    would have fallen through. The arm and the seed template are lower-case; the
    published path keeps DashScope's case because the upstream request is built
    from the original URI. A classifier test pins both spellings.
  - Tencent is deliberately **not** published yet: Hunyuan/Tencent Cloud TTS is a
    TC3 action API (`hunyuan.tencentcloudapi.com` + `TextToSpeechSync`), not a
    REST path, so it needs a provider-adapter route (the `tencent-cloud` adapter
    and its TC3 signer exist, but only cover video today). Publishing a
    passthrough door would only 404 upstream.
- MiniMax speech published, fixing the same binding defect its video had:
  - `POST /minimax/v1/t2a_v2` (Speech 2.x). The response carries hex-encoded
    audio in `data.audio` plus `usage_characters`, so the door bills per input
    character and the schema documents the hex encoding.
  - All 12 MiniMax audio models declare `apiFormat = vendor_native` and were
    bound to `openai.audio` (`/v1/audio`), a path MiniMax does not serve; they
    now bind to `minimax.text_to_speech` in both `model_catalog_import.rs`
    copies.
  - Taxonomy route, seed, classifier arm, `official.minimax.full` grant, a new
    `api.minimax.audio` admin group, and the curated `api.all` entry.
  - Billing regression refreshed: 210 published operations, 204 sellable (Free
    131, metered 69, sound 1, priced per-call 3, unpriced per-call 5,
    unsellable 1). Speech bills `Character` (input character).
- Stability AI audio published, with the one-endpoint/two-capability problem
  solved explicitly:
  - `POST /stability_ai/v2beta/audio/stable-audio-2/text-to-audio` — Stable
    Audio, sent as multipart/form-data with `model` selecting the variant
    (`stable-audio-2`, `stable-audio-2.5`) and the vendor returning audio bytes
    unless `accept: application/json` is sent.
  - Stability answers **sound effects and music from that one endpoint**, so a
    single route code `stability_ai.audio` serves both model families; two codes
    on one path would leave one of them unreachable by classification. It bills
    per generated result (`SfxResult`), and the shared endpoint is recorded in
    the coverage audit's ledger rather than silently exempted.
  - Removed a bogus classifier arm: `stability_ai` was mapped at
    `/v1/sound/generate`, a path the vendor does not serve (it was an artifact of
    the shared `sfx.sound` code). Kling still owns that path.
  - Door coverage audit: 31 catalog pairs, **26 covered, 5 gaps left** (Black
    Forest Labs video, ByteDance audio + music, Kling sound effects, Vidu sound
    effects).
- Sound effects split into per-vendor routes, and a wrong Kling path fixed:
  - `POST /kling/v1/audio/text-to-audio`, `POST /kling/v1/audio/video-to-audio`,
    `GET /kling/v1/audio/text-to-audio/{task_id}`, `POST /vidu/ent/v2/text2audio`,
    and `POST /vidu/ent/v2/timing2audio` are published. The single `sfx.sound`
    code could name only one path family, so it could be neither granted nor
    priced per vendor.
  - The old Kling arm pointed at `/v1/sound/generate`, which **Kling does not
    serve**; the vendor publishes `/v1/audio/text-to-audio` and
    `/v1/audio/video-to-audio`. The arm is corrected, and the split is by model
    id (`kling-sound-t2a` versus `kling-sound-v2a`, `audio1.0-text2audio` versus
    `audio1.0-timing2audio`) in both `model_catalog_import.rs` copies.
  - `sfx.sound` stays declared as the generic fallback the descriptor returns for
    a vendor without a native arm. It is dormant (no catalog model reaches it),
    which the routing gate records in a dedicated `DORMANT_FALLBACK_ENDPOINTS`
    ledger instead of pretending an arm exists.
  - Billing regression refreshed: 216 published operations, 210 sellable (Free
    132, metered 74, sound 1, priced per-call 3, unpriced per-call 5,
    unsellable 1). The Kling audio poll is Free by the `*task_query` rule.
  - Door coverage audit: 31 catalog pairs, **28 covered, 3 gaps left** — Black
    Forest Labs video, and ByteDance audio + music.
- ByteDance Seed TTS published; its music sibling is adapter-blocked:
  - `POST /bytedance/api/v3/tts/unidirectional` (Seed TTS 2.0 on the openspeech
    surface) with the vendor-required `X-Api-Resource-Id: seed-tts-2.0` header
    declared, streaming NDJSON frames of base64 audio. Both catalog
    `seed-tts-2.0-*` models were bound to `openai.audio` — a path ByteDance does
    not serve — and now bind to `bytedance.speech`.
  - `seed-music-gensong-v4` is deliberately **not** published: Seed Music /
    GenSongV4 is a Volcengine action API (`open.volcengineapi.com?Action=GenSongV4`,
    AK/SK signature), like Tencent TTS, so it needs a provider-adapter route.
  - Billing regression refreshed: 217 published operations, 211 sellable (Free
    132, metered 75, sound 1, priced per-call 3, unpriced per-call 5,
    unsellable 1). Seed TTS bills `Character` (input character).
  - Door coverage audit: 31 catalog pairs, **29 covered, 2 gaps left** — Black
    Forest Labs video, and ByteDance music (adapter-blocked).
- Vendor door coverage is now measurable, and one classifier invariant is gated:
  - `tools/audit-vendor-door-coverage.mjs` joins the model catalog's
    `apiFormat = vendor_native` models with the published contract and reports
    every `(vendor, primary capability)` pair that has no door. That is exactly
    the Mureka defect class — eight models, a taxonomy route, a seed and a
    classifier arm, but no door — and it was invisible to every existing gate,
    which only looks at published operations. Its first run reported **7 real
    gaps**: Black Forest Labs video (flux-3), ByteDance audio + music, Kling
    sound effects, Stability AI audio (sfx + music), and Vidu sound effects.
    Six of them are closed by the doors in this change (Kling and Vidu sound
    effects, Stability AI audio, ByteDance speech, and the FLUX 3 video door
    below). The last one, `bytedance/music`, is ledgered in the audit with its
    reason: GenSong V4 is served through Volcengine's Action-style RPC
    (`open.volcengineapi.com?Action=GenSongV4`), not a REST path the
    vendor-relay planner can name, so no vendor-native door exists to publish.
    The audit now reports **0 gaps** and exits non-zero on any unledgered one.
  - The routing gate now rejects a classifier arm whose path carries an
    upper-case letter: classification lower-cases the path
    (`normalize_standard_api_path`) before matching, so such an arm can never
    match and its door silently falls through. Proven with a negative probe arm
    that the gate flagged and that was then removed.

## 0.4.11

- Added DeepSeek-compatible web tools on the `/v1` ingress:
  - `POST /v1/tools/search` — query the web and return ranked structured results
    (`query`, `count`, `ori_question`, `localization`, `need_content`).
  - `POST /v1/tools/fetch` — fetch one page and return `title` plus Markdown `content`.
- Both operations mirror DeepSeek's published request/response schemas and are
  routed through the relay chain to a `deepseek` upstream account. Their payload
  modules are named `OpenAiDeepSeekWebSearch*` / `OpenAiDeepSeekWebFetch*`, the
  same `OpenAi*` family every other `/v1` payload uses.
- Error sets follow the vendor reference per surface: both operations publish
  400/401/402/408/413/429/500/504, and only Fetch publishes 403 (target-site
  safety policy) and 404 (no extractable content) — Search never reads a
  third-party page, so it must not advertise a 404/403 retry branch.
- `501` (no upstream account configured) and `502` (relay failure) are gateway
  states, not DeepSeek statuses, and are marked `Cloud Router-specific:` in the
  contract.
- Billing is per successful request, and "successful" means *producing a
  result*: a Search that returns `results: []` and a Fetch that returns no
  extractable body answer `200` but are not billed, matching DeepSeek's own
  rule. `count` never changes the price. Any prepaid hold taken before the call
  is released instead of settled.
- Request bodies are relayed verbatim, so fields DeepSeek does not recognize are
  forwarded and ignored upstream rather than rejected at the gateway.
- Rate limits are documented as vendor-enforced: 5 requests per second per
  account for each tool, counted independently, plus per-domain limits imposed
  by the target host when fetching.

## 0.3.0

- Materialized OpenAPI 3.1.2 contracts with SDKWork standard extensions (`x-sdkwork-request-context`, `WebRequestContext`).
- Gateway invocation and provider passthrough routes aligned to generated SDK families.

## 0.2.x

- Legacy gateway surface consolidation under `apis/open-api/cloudrouter/`.
