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
- Every added path reuses the api codes, resource seeds, billing meters, and
  classifier arms the routing layer already declares, so a published operation
  resolves end to end (`tools/check-cloudrouter-ai-routing-consistency.mjs`
  reports 51 routed vendor-native operations over 18 namespaces, up from 31
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
  served by `POST /v1/images/generations`, and `xai` and `xiaomi` video models
  by `POST /v1/videos`. Their native paths either equal the OpenAI-compatible
  path (`xai`, `xiaomi`) or have no declared endpoint at all (`minimax` image).
  `minimax` video models and the Runway video model family still bind to
  `POST /v1/videos` because no native video endpoint is declared for them yet;
  publishing a door there requires a routing change, not a contract change.

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
