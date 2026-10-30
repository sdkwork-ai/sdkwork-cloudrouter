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
  (`find_catalog_model`), and the app-runtime gateway probe.

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
(`displayName`, `vendorDisplayName` extra fields; the `OpenAiModel` contract's
`additionalProperties` allows them) and `/v1/vendors` (`name`,
`displayName` per model).

## Verification

```bash
cargo test -p sdkwork-cloudrouter-router-service --lib
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
