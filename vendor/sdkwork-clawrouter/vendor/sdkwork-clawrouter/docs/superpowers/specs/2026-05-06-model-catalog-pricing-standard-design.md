# Model Catalog Pricing Standard Design

## Goal

Build Claw Router's canonical AI model catalog and pricing standard for a new product with no legacy compatibility. The Java backend, Rust runtime, PostgreSQL schema, OpenAPI contracts, generated SDKs, and environment seed data must use the same source-of-truth design.

## Non-Negotiable Decisions

- Remove the old Plus-era model catalog and pricing design.
- Do not add adapters, compatibility views, bridge services, or legacy DTO aliases.
- Use only the `ai_*` canonical model catalog and pricing tables for runtime behavior.
- Follow `DATABASE_SPEC.md` as the database design authority. Schema Registry is the contract source, and DDL, ORM, DTO, Rust, OpenAPI, SDK, and seeds are generated from or audited against that contract.
- Use decimal strings in APIs and `NUMERIC(38, 12)` in PostgreSQL for money, quantity multipliers, and pricing formula values.
- Keep frontend UI layout unchanged. Backend responses may preserve current visible field names only as projections from the canonical tables.
- Keep Java and Rust schema, enum codes, meter codes, lifecycle values, and API behavior aligned.

## Industry Pricing Taxonomy

The pricing model must support the pricing modes used by current AI providers:

- LLM input tokens, output tokens, reasoning tokens, and long-context tiers.
- Cached input, cache write/create, cache read/hit, and cache storage pricing.
- Batch input/output/cached discounts.
- Embedding tokens and multimodal embedding inputs.
- Image input, generated image token/result/pixel/megapixel, quality, size, edit, variation, and upscale tiers.
- Audio input/output seconds, speech-to-text minutes, text-to-speech characters, and realtime audio session pricing.
- Video input/output seconds, resolution/quality tiers, job/result charges, and generated asset charges.
- Music and sound-effect output seconds or generation results.
- Rerank/search request, document, result, and item pricing.
- Tool calls, web search calls, container/session charges, storage GB-day, and bandwidth GB.
- Official reference price, upstream provider cost, customer charge, and internal transfer price.
- Region, provider, channel, service tier, model alias, tenant, organization, plan, and effective-time overrides.

## Canonical Data Model

### Database Spec Compliance

All canonical tables follow `DATABASE_SPEC.md`:

- Table names use the registered `ai_` module prefix and lowercase snake case.
- Core model/pricing tables are at least L2; financial pricing tables are L3.
- Each canonical table has `id`, `uuid`, `tenant_id`, `organization_id`, `data_scope`, `status`, `created_at`, `updated_at`, `version`, `deleted_at`, `deleted_by`, and `metadata`.
- `uuid` is a required stable external id with a unique constraint. External APIs prefer `uuid`, `code`, or canonical model id instead of exposing internal sequence ids.
- Platform-shared reference data uses `tenant_id NOT NULL DEFAULT 0` and `organization_id NOT NULL DEFAULT 0`; tenant-scoped overrides use explicit tenant and organization ids.
- Soft deletion uses `deleted_at` and `deleted_by`. Production delete operations must update lifecycle fields and audit logs unless the row is a draft with no usage.
- Multi-tenant lookup/list indexes start with `tenant_id`, `organization_id`, and status/lifecycle filter columns.
- `effective_from` and `effective_to` are UTC instants. APIs serialize instants as ISO 8601 UTC strings.
- High-frequency filter fields, money, currency, effective windows, idempotency keys, status, and unique fields are independent columns, not hidden in JSON.
- JSON fields such as `metadata`, `modalities`, and `parameter_schema` must have documented structure or generated schema contracts.

### Vendor And Family

`ai_model_vendor` stores the model creator or source ecosystem, such as OpenAI, Anthropic, Google, Meta, Mistral, DeepSeek, Cohere, ElevenLabs, Stability AI, Black Forest Labs, Open Source, and Custom.

`ai_model_family` stores product families, such as GPT, Claude, Gemini, Llama, Command, DeepSeek, Imagen, Veo, Whisper/Scribe, Stable Diffusion, and ElevenLabs Voice.

Vendor is not the same as integration provider. A vendor creates a model. A provider/channel is the route used to call that model.

### Model

`ai_model` stores one canonical AI model row per stable model id. Required concepts:

- `model`: stable canonical id used by Claw Router and all model catalog consumers.
- `display_name`: UI label.
- `vendor_code`, `family_code`, `model_version`, `model_aliases`.
- `modalities`: input and output modalities as structured JSON.
- `api_format`: OpenAI compatible, Anthropic, Gemini, OpenRouter, or provider-native.
- context limits, output limits, duration limits, streaming/tool/json-schema support.
- lifecycle fields: release stage, deprecation time, and retirement metadata.
- shelf/routing state fields so a model can be listed, hidden, routable, blocked, deprecated, or retired independently.

### Capability

`ai_model_capability` stores row-based capability facts for `ai_model`. Capability rows cover:

- chat completion, response API, embedding, rerank, moderation.
- vision, image generation/edit/upscale, video generation, speech-to-text, text-to-speech, realtime audio, music, sound effects.
- tool calling, JSON schema, code execution, web search, file search, batch, prompt cache, long context, reasoning.
- endpoint formats and parameter schemas.

Capabilities must remain row-based because industry models add new modality and endpoint abilities faster than fixed columns can evolve.

### Meter

`ai_billing_meter` stores the standard dictionary for metering. The first-class meter set is:

- `llm_input_token`
- `llm_output_token`
- `llm_reasoning_token`
- `llm_cache_write_token`
- `llm_cache_read_token`
- `llm_cache_storage_token_hour`
- `embedding_input_token`
- `embedding_image`
- `image_input_token`
- `image_output_token`
- `image_result`
- `image_pixel`
- `image_megapixel`
- `audio_input_second`
- `audio_output_second`
- `audio_input_minute`
- `audio_output_minute`
- `tts_input_character`
- `speech_character`
- `stt_audio_minute`
- `video_input_second`
- `video_output_second`
- `video_result`
- `music_output_second`
- `sfx_result`
- `rerank_search`
- `rerank_document`
- `api_request`
- `api_result`
- `api_item`
- `tool_call`
- `web_search_call`
- `file_search_call`
- `code_interpreter_session`
- `container_session`
- `storage_gb_day`
- `bandwidth_gb`

Meter codes are stable API and Rust/Java enum contracts.

### Price Book

`ai_model_pricing` stores individual price rows. A price row is not only "input price" or "output price"; it is a scoped meter price:

- model/vendor/provider/channel/provider_model/service_tier.
- price side: official reference, upstream cost, customer charge, internal transfer.
- pricing scope: global, provider, channel, tenant, organization, pricing plan, custom.
- billing meter, unit, unit size, quantity formula, result selector.
- unit price, currency, rounding mode, minimum charge, quantity step.
- reference price and multiplier/markup for derived prices.
- price origin, import snapshot, region, source URL, source hash, published/observed time, effective window.

### Plans, Rules, And Tiers

`ai_pricing_plan`, `ai_pricing_plan_binding`, `ai_pricing_rule`, and `ai_pricing_tier` implement customer-facing price resolution:

1. Resolve canonical model.
2. Resolve effective price rows by price side, scope, provider/channel, plan, region, and service tier.
3. Apply rule overrides and tier ranges.
4. Apply rounding and minimum charge.
5. Return decimal string amounts.

Tiers must support long-context thresholds, quality/resolution bands, request volume bands, generated duration bands, and batch discounts.

### Import Snapshot

`ai_pricing_import_snapshot` records evidence for curated or imported pricing:

- source name, source URL, source hash, observed time, published time, version, actor.
- import mode: curated official, provider sync, manual admin, test seed, demo seed.
- counts and validation status.

Seed prices are not "latest" unless supported by an observed snapshot.

## Lifecycle And Shelf State

Lifecycle and visibility are separate:

- `release_stage`: `draft`, `preview`, `ga`, `deprecated`, `retired`.
- `shelf_state`: `listed`, `unlisted`, `hidden`.
- `routing_state`: `enabled`, `disabled`, `blocked`.

Public model lists include only effective, not deleted, `listed`, and `routing_state=enabled` models. Deprecated models may remain listed if explicitly allowed. Retired models remain for historical usage and billing but are not offered for new routing.

## API Contract

### App API

- `GET /app/v3/api/ai/models`
  - Reads canonical vendor, `ai_model`, capability, and pricing rows.
  - Returns current UI-compatible model cards projected from canonical data.
  - Excludes unlisted, hidden, disabled, blocked, and retired models.

### Backend API

- `GET /backend/v3/api/model-vendors`
- `POST /backend/v3/api/model-vendors`
- `POST /backend/v3/api/model/list`
- `POST /backend/v3/api/model`
- `PATCH /backend/v3/api/model/{model}`
- `DELETE /backend/v3/api/model/{model}`
- `POST /backend/v3/api/model/{model}:publish`
- `POST /backend/v3/api/model/{model}:unpublish`
- `POST /backend/v3/api/model/{model}:deprecate`
- `POST /backend/v3/api/model/{model}:retire`
- `GET /backend/v3/api/model/{model}/prices`
- `POST /backend/v3/api/model/{model}/prices`
- `POST /backend/v3/api/models/sync`

Existing frontend UI methods may continue calling their current generated SDK method names, but generated schemas and backend implementation must be canonical and must not expose legacy model catalog DTOs.

## Environment Seed Strategy

Seed resources are split by profile:

- `test`: minimal deterministic rows for Java/Rust/API tests.
- `dev`: prod seed plus deprecated, retired, preview, multimodal, channel-specific, tiered, and edge-case rows.
- `prod`: curated active public model catalog and source-backed official reference prices. No demo data.
- `demo`: display-friendly data marked as demo origin.

Each seed file must have:

- schema version.
- environment profile.
- source metadata.
- vendor rows.
- family rows.
- model rows.
- capability rows.
- meter rows.
- price rows.
- pricing plan/rule/tier rows where needed.

Old `data/model/model_info.json` and `data/model/model_price.json` are deleted.

## Java/Rust Consistency

The same canonical table registry drives:

- PostgreSQL DDL/migrations.
- Java entities, repositories, services, and DTOs.
- Rust test support schema and runtime query assumptions.
- OpenAPI components and generated TypeScript SDK.
- Contract tests for no legacy model catalog symbols.

Rust test support must create the same standard tables needed by Java migrations and use the same meter codes.

## Deletion Scope

Delete or replace:

- Legacy model catalog information tables.
- Legacy model pricing tables.
- Legacy model availability and compliance tables.
- Legacy model pricing metric tables.
- Legacy model taxonomy tables.
- Legacy tenant model policy tables.
- Java legacy model entity/repository/service/controller/VO/form/DTO classes.
- Legacy generated OpenAPI model catalog components.
- Tests that assert legacy compatibility.

If a non-model domain stores a `model_id` comment or weak reference, update it to reference `ai_model.id` or the canonical `model` string.

## Verification

Required checks:

- Schema tests prove runtime migrations create `ai_*` model/pricing tables and do not create old Plus-era model catalog tables.
- Precision tests prove pricing tables do not use double/float for money or quantities.
- Contract tests prove OpenAPI and manifest do not expose legacy model DTOs/tables.
- Seed tests prove each profile has required meters, active multimodal models, retired/downlisted examples in dev, and source evidence for price rows.
- Rust tests prove the runtime schema and meter enum cover the same standard meter set.
- Java targeted tests prove model service and app/backend API projection behavior.
