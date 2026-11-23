# TECH-0017 — Model Request Id Alias Compatibility

Status: active · Owner: cloudrouter-platform · Since: 2026-10-30

## Problem

Clients reach the gateway with model ids spelled in several wire dialects:

- OpenRouter format: `vendor/slug` with dots (`anthropic/claude-opus-4.5`),
  trailing variant suffixes (`anthropic/claude-opus-4.5:free`), and relay
  namespaces (`openrouter/anthropic/claude-opus-4.5`);
- colon separators, half- and full-width (`anthropic:claude-opus-4.5`,
  `anthropic：claude-opus-4.5`), including the IME habit of a space after the
  colon and the `Anthropic: Claude Opus 4.5` display-label shape;
- vendor slug drift (`x-ai/grok-4` vs the catalog's `xai/grok-4`).

The catalog (sdkwork-models) stores canonical identities:
`catalogKey = vendorCode/modelId` with native ids (`claude-opus-4-5`,
hyphens). Exact-match-only resolution 503'd every dialect request for a model
the catalog serves.

## The alias cascade

`services/sdkwork-cloudrouter-router-service/src/domain/model_request_alias.rs`
defines the tolerant cascade, applied **only after the exact lookup misses**:

1. **Exact separator-normalized form** — full-width `：` folded to `:`,
   non-variant `:` segments rewritten to `/`, segments trimmed.
2. **Relay-namespace stripped exact** — leading `openrouter|siliconflow|
   together|fireworks|groq` removed (mirrors `relay_provider_namespace_prefix`
   in sdkwork-models).
3. **Full-slug** — case-folded, `.` folded to `-`, whitespace runs folded to
   `-`, one trailing known variant suffix (`:free`, `:beta`, `:nitro`,
   `:extended`, `:online`, `:thinking`, `:floor`, `:precise`) stripped.
4. **Part-slug** — slug of the model-id segment (tail after the last `/`),
   vendor-agnostic; absorbs relay vendor drift.

Multi-key matches stay multi-valued: callers reject ambiguity, routing never
guesses. Known variant suffixes are matched by an allowlist — an unknown colon
tail is read as a vendor separator, never as a variant, so
`anthropic:claude-opus-4-5` resolves as vendor/model.

## Two-stage route identity

A model-related open-api request carries an ordered identity ladder
(`domain::model_route_identities`):

1. the vendor-qualified identity (`vendor/modelId`, region segment dropped);
2. the bare model id (`modelId`).

Route selection (`UpstreamRouteSelector::select_model_route_plan_with_fallback`)
tries the caller's resolved `vendor/model` catalog key first. Only when that
route cannot be selected (model route absent, empty account snapshot, no priced
account) does it retry with the bare model id of the **resolved catalog key**
(a mapped target therefore falls back to the mapped model, not the un-mapped
request). The bare identity is resolved against the catalog and the retry only
happens when exactly one other catalog key matches; several vendors serving the
same bare model is still an ambiguity, not a choice.

A group model blacklist/whitelist result (`ModelForbidden`) is a hard stop at
either stage: falling back to another spelling must never route around an
access decision. The primary (qualified) error remains the response when every
identity fails, so the caller still sees the most specific cause; each failed
fallback is logged with both keys.

Every model-route entry point uses this fallback: the invocation pipeline
(`route_planning`), the OpenAI-compatible runtime (`/v1/chat/completions`,
`/v1/responses`, `/v1/embeddings`), the app-runtime gateway probe, and the admin
route explainer. The selected catalog key is written back to
`requested_model_catalog_key` so pricing, activity/usage attribution, and
sticky bindings describe the route that actually served the request.

The same vendor/model → bare-model equivalence is applied to resource
entitlements: an account resource configured with the bare model id
(`deepseek-flash`) still matches a request routed by
`deepseek/deepseek-flash`, while a different qualified vendor key does not.

## Outbound model addressing

The outbound id is resolved once, at the route layer, by
`domain::resolve_provider_model_id`:

| Supplier type | Outbound model | Example |
| --- | --- | --- |
| official (or unknown) | vendor-native catalog model id | `deepseek/deepseek-flash` → `deepseek-flash` |
| relay | fully-qualified catalog key | `deepseek/deepseek-flash` (kept) |
| explicit account/mapping override | verbatim (dialect separators folded for relays) | `gpt-4o-mini-provider`, `openrouter/gpt-4o-account` |

Official stripping is structural: it uses the resolved catalog key rather than
the catalog parser's known-vendor allowlist, so a vendor slug the parser does
not list yet (`acme/flash`) is still removed for that vendor's account. An
explicit override that names a different model is authoritative and is never
rewritten.

The dispatch layers must not re-parse the resolved id. In particular the
OpenAI-compatible relay writes `provider_model` into the body verbatim; a second
`provider_native_model_id` pass would strip a relay's qualified id
(`anthropic/claude-opus-4-5` → `claude-opus-4-5`) and ask the relay for a model
it does not serve.

## Media, audio, music and adapter surfaces

Model-bearing requests are not limited to chat. Image, video, audio, music and
vendor-native media doors carry the model in different field names and, for
Gemini-style routes, in the URL path:

- `application/invocation/model_fields.rs` owns `model`, `model_name`,
  `modelName`, `model_id`, and `modelId` for JSON bodies, query strings and
  multipart forms. Extraction and rewriting use one field list, so an
  ElevenLabs `model_id` or Kling `model_name` cannot be routed by the resolved
  model while still dialing the client's spelling.
- API-resource media routes (`RouteKind::Api`, e.g. Volcengine Seedance,
  ElevenLabs TTS/music) resolve the requested model's catalog identity in
  `route_planning::api_route_catalog_key` and compute the supplier-facing id
  with the same domain resolver. The route key remains the pricing/attribution
  authority; the model identity is only the outbound addressing input.
- Provider-native paths (`/v1beta/models/{model}:action`,
  `/google/v1beta/models/{model}:action`) percent-decode the path segment
  before catalog lookup, split the action at the last `:`, normalize dialect
  separators, and percent-encode the resolved id when rewriting. A qualified
  relay id therefore stays one path segment
  (`anthropic%2Fclaude-opus-4-5`) instead of becoming a second path component.
- Provider-adapter requests carry the resolved id in
  `provider.providerModel` and in the forwarded body's model fields; the
  adapter `standard_path` is rewritten with the same path encoder.

This keeps official / OpenRouter-shaped / slash-containing model ids working on
every published door, not only `/v1/chat/completions`.

## Where it applies

Every name-keyed surface shares the cascade (single source in
`ports::upstream_account_route_catalog`, O(1) slug indexes on the SQL
snapshot):

- route planning (`resolve_catalog_key`) and vendor attribution;
- pricing identity and delayed-usage replay (`pricing_identity`,
  `async_usage_settlement`);
- sticky-route validation;
- model mapping rules (`resolve_model_mapping_with_aliases`: raw name →
  normalized name → catalog key → bare model);
- group/supplier/account model black- and whitelists
  (`model_access_spellings`: an alias spelling can never bypass a blacklist
  nor be rejected by a whitelist);
- cross-vendor pricing candidates for generic compat surfaces
  (`openai.video`, `suno.music`) — step 3.5 resolves the bare model name;
- `GET /v1/models/{id}` retrieval, `openai_runtime`
  (`find_catalog_model`), and the app-runtime gateway probe;
- API-resource media routes (image/video/audio/music) and provider-native path
  models — see the media section above.

Pricing-gate discipline: the gate runs only when
`Select*RouteQuery::pricing_required` (free-billed management surfaces
dispatch without prices) and reconciles the composite meter expansion against
the catalog's defined meters (embedding models publish no output-token rate).

## Deliberately out of scope

- Admin CRUD surfaces: authority inputs stay exact.
- Provider-native surfaces: they prefix the supplier
  (`supplier/<model>`); the name-index priority resolves dialects before the
  preset key applies.
- The outbound model id is always the route's `provider_model`; client
  spellings never leak upstream.

## Retired surfaces and fail-closed expectations

Capabilities vendors retire (OpenAI sora, MiniMax paid music) leave published
surfaces with no routable model. The contract splits across two mechanisms:

- `data/ai-routing/declared-unrouted.json` — **vendor-native routing-level**
  unrouted operations, validated by
  `tools/check-cloudrouter-ai-routing-consistency.mjs`. Entries carry
  `apiCode` + `failClosedScope`; the per-API probe asserts the gateway fails
  closed with exactly that scope message. Entries must reference live probe
  cases.
- `ApiExpectation::RetiredSurface` in
  `crates/sdkwork-cloudrouter-edge-runtime/tests/per_api_chain_e2e.rs` —
  per-case expectations for published-but-retired surfaces: the gateway must
  answer `502/503 routing_failed` naming the missing price or model; a 404 or
  misroute is a defect.

Object lookups before create fail closed by design
(`sticky route binding not found`) — under a multi-node deployment a sticky
miss means the object was never created through this gateway.

## displayName

`displayName` is mandatory on every sdkwork-models entity (model, vendor,
family, voice) and flows JSON → importer → `ai_model.display_name` /
`ai_model_vendor.display_name` → the SQL snapshot → `/v1/models`
(`displayName`, `vendorDisplayName`, documented optional fields on the
`OpenAiModel` contract) and `/v1/vendors` (`name`,
`displayName` per model).

## Verification

```bash
cargo test -p sdkwork-cloudrouter-router-service --lib
cargo test -p sdkwork-cloudrouter-router-service --test upstream_route_selector
cargo test -p sdkwork-cloudrouter-router-service --test openai_chat_api
cargo test -p sdkwork-cloudrouter-edge-runtime --test media_routing_e2e
cargo test -p sdkwork-cloudrouter-edge-runtime --test audio_vendor_routing_e2e
cargo test -p sdkwork-cloudrouter-edge-runtime --test provider_adapter_invocation
cargo test -p sdkwork-cloudrouter-edge-runtime --test per_api_chain_e2e
cargo test -p sdkwork-cloudrouter-edge-runtime --test invocation_router
node tools/check-cloudrouter-ai-routing-consistency.mjs
node ../sdkwork-specs/tools/check-api-operation-patterns.mjs --workspace .
node ../sdkwork-specs/tools/check-api-response-envelope.mjs --workspace .
```

Real-DB e2e tests require `SDKWORK_DATABASE_URL` (dev default
`sdkwork_ai_dev@127.0.0.1:5432`); refresh the seeded catalog with
`pnpm db:refresh-catalog -- --database-url <url>` after sdkwork-models
releases a new catalog version.
