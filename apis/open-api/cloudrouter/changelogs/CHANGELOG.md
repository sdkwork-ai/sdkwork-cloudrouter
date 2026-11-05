# Cloud Router Open API Changelog

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
    which only looks at published operations. It reports **7 real gaps** today:
    Black Forest Labs video (flux-3), ByteDance audio + music, Kling sound
    effects, Stability AI audio (sfx + music), and Vidu sound effects.
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
