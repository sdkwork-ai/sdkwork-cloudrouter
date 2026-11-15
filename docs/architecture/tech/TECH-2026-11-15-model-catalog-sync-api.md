# Model Catalog Sync API And Local Copy-On-Write Standard

Status: Proposed (design authority for the open-api and app-api additions).

Scope: the versioned model-catalog exchange between `sdkwork-models`,
`sdkwork-cloudrouter`, and first-party applications such as BirdCoder.

## 1. Problem

`sdkwork-models` already publishes every vendor, model, capability, capacity,
and price, and `sdkwork-cloudrouter` already composes that catalog into the
app-api routes `/app/v3/api/ai/model_vendors`, `/app/v3/api/ai/models`, and
`/app/v3/api/ai/model_rankings`. What the current surface does not provide:

1. An **open-api** contract. External integrations can read the
   OpenAI-compatible `GET /v1/models` id list, but there is no versioned,
   vendor-grouped document with per-model request parameters.
2. **Model parameters as data**. `apiFormat`, `capabilities`, and capacities are
   exposed; the request parameters a model accepts (temperature, reasoning
   effort, tool choice, response format, ...), their ranges, defaults, wire
   names, and protocol applicability are not.
3. **A synchronization contract**. Clients have no catalog revision, no ETag, no
   delta feed, and no tombstones, so a first-party application must either
   rebuild its model list from a build-time seed or re-download an entire paged
   list to notice one change.
4. **A precedence rule and a local update strategy**. The BirdCoder relay seed
   (`packages/llm/llm-pi-ai/src/relay-models.generated.ts`) is a build-time
   projection of `sdkwork-models`. Nothing states which source wins once a
   deployment is reachable, and nothing keeps the local copy readable while it
   is being replaced.

This document defines the contract, the version model, the synchronization
protocol, the precedence rule, and the local copy-on-write (COW) update
strategy. It is the authority for the OpenAPI fragments in
[`assets/model-catalog-sync.open-api.openapi.json`](assets/model-catalog-sync.open-api.openapi.json)
and [`assets/model-catalog-sync.app-api.openapi.json`](assets/model-catalog-sync.app-api.openapi.json).

## 2. Design Goals

- One catalog, two surfaces: `open-api` for external API-key clients, `app-api`
  for signed-in product clients. Both serve the same snapshot bytes and the
  same revision.
- Versioned and cacheable: every response is immutable per revision and carries
  `ETag`, `catalogVersion`, `schemaVersion`, and `revision`.
- Incremental: a client that already holds revision *N* fetches only the rows
  that changed at *N+1*, including deletions.
- Extensible: unknown fields, capability codes, modalities, and parameter
  descriptors survive a client that predates them.
- Backend-authoritative: when the backend returns a non-empty catalog it
  replaces the bundled seed wholesale.
- Locally highly available: reads never block on a sync, never observe a partial
  snapshot, and never lose the last known good catalog.

Non-goals: provider-native request proxying, price settlement, and admin write
paths. Those stay on their existing surfaces. The catalog document is read-only.

## 3. Version Model

Four independent numbers, each with one job:

| Field | Example | Meaning | Change rule |
| --- | --- | --- | --- |
| `schemaVersion` | `1.0.0` | JSON contract version (semver) | Major for breaking, minor for additive optional fields |
| `catalogVersion` | `2026.11.14.6` | `sdkwork-models` data release (`YYYY.MM.DD.N`) | Advanced by the catalog release workflow |
| `revision` | `128` | Monotonic server projection revision | Incremented once per committed catalog change |
| `parameterRegistryVersion` | `1.0.0` | Parameter descriptor registry (semver) | Major for a breaking descriptor change |

Rules:

- `catalogVersion` identifies *data lineage*. `revision` orders *server
  projections*. A reshelving, routing disable, price change, or parameter
  change produces a new `revision` without necessarily producing a new
  `catalogVersion`.
- A client MUST reject a response whose `schemaVersion` major is greater than
  the major it implements, and SHOULD fall back to its last known good snapshot.
- A client MUST reject a response whose `(revision, catalogVersion)` is older
  than the snapshot it already holds (replay protection).
- `revision` is server-assigned, never client-assigned, and never reused. It is
  opaque apart from ordering.
- `If-None-Match` is an efficiency mechanism, not an authorization boundary and
  not a correctness guarantee; the client still validates the body.

## 4. Resource Model

```
ParameterRegistry 1 ──* ParameterDescriptor
Vendor 1 ──* Model *── ParameterDescriptor   (via model.parameters[name])
```

- **Model identity** is `catalogKey` = `<vendorCode>/<modelId>`. It is stable
  across `revision`s and is the only key a client may persist.
- **Vendor identity** is `(vendorCode, regionCode)`. `regionCode` defaults to
  `global`.
- **Parameter identity** is `name` within a `parameterRegistryVersion`.
  `wireName` is the field name on the provider wire and may differ.
- A model references parameter names; the descriptor carries type, range,
  enum, default, protocol applicability, and lifecycle. Defaults may be
  overridden per model through `defaultParameters`.

### 4.1 Parameter descriptor

| Field | Type | Required | Meaning |
| --- | --- | --- | --- |
| `name` | string | yes | Stable client-side name, `[a-z][a-z0-9_]*` |
| `wireName` | string | no | Provider wire field; defaults to `name` |
| `type` | `string \| number \| integer \| boolean \| enum \| array \| object` | yes | Value domain |
| `enum` | array | no | Allowed values when `type` is `enum` |
| `minimum` / `maximum` / `multipleOf` | number | no | Numeric bounds |
| `minLength` / `maxLength` | integer | no | String bounds |
| `default` | any | no | Descriptor-level default |
| `required` | boolean | no | Whether the wire field is mandatory (default `false`) |
| `scope` | `request \| route` | no | Whether it is per request or per route (default `request`) |
| `protocols` | string[] | no | Wire protocols that accept it; omitted means every protocol |
| `status` | `active \| deprecated \| experimental` | no | Lifecycle (default `active`) |
| `replacement` | string | no | Parameter that replaces a deprecated one |
| `description` | string | no | Human-readable, localized by the surface |
| `extensions` | object | no | Namespaced extension data |

### 4.2 Extension rule

`extensions` is an open object. Keys MUST be `<namespace>.<name>` (for example
`sdkwork.audio.voice_clone`). Namespaces `sdkwork`, `cloudrouter`, and the
prefix `x-` are reserved for first-party use. A client MUST preserve unknown
`extensions` entries it carries forward and MUST ignore unknown entries it does
not understand. No other object in this contract is an open object.

The same rule applies to open value sets: `capabilities`, `inputModalities`,
`outputModalities`, and `apiFormat` are open strings. A client MUST NOT fail on
an unknown value and MUST NOT reorder known values.

## 5. Open API Surface

Mount: the existing gateway `/v1` prefix. Auth: the same bearer credential as
`/v1/models` - a Cloud Router API key (`sk-`/`sp-` prefix) or an SDKWork IAM
login auth token, with the paired `Access-Token` header when the caller uses
dual-token auth. Responses are raw resources (no `SdkWorkApiResponse`
envelope), matching `/v1/models`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/v1/model_catalog` | Current snapshot, paged, vendor-filterable |
| GET | `/v1/model_catalog/changes` | Delta since a revision |
| GET | `/v1/model_catalog/vendors` | Vendor list with model counts |
| GET | `/v1/model_catalog/models/{vendor_code}/{model_id}` | One model with parameters |
| GET | `/v1/model_catalog/parameters` | Parameter descriptor registry |
| GET | `/v1/models` | Unchanged OpenAI-compatible id list |

`GET /v1/models` stays minimal (`object`, `data[]`, `id`, `created`,
`owned_by`) because third-party SDKs parse it. The rich document lives at
`/v1/model_catalog`; adding fields to `/v1/models` would be a de-facto
incompatible change for strict clients.

### 5.1 Query parameters (`/v1/model_catalog`)

| Parameter | In | Default | Meaning |
| --- | --- | --- | --- |
| `vendor` | query | all | Vendor code; repeatable or comma-separated |
| `region` | query | `global` | Region code |
| `capability` | query | all | Capability code filter |
| `input_modality` / `output_modality` | query | all | Modality filters |
| `include` | query | `parameters` | Comma list of `parameters`, `pricing`, `extensions` |
| `page_size` | query | 100 | 1-500 |
| `cursor` | query | - | Opaque cursor from `pageInfo.nextCursor` |
| `page` | query | 1 | Offset mode for small catalogs; mutually exclusive with `cursor` |

`include=parameters` returns parameter **names** plus `defaultParameters` on
each model, and includes the registry section. It does not inline descriptors
per model.

Pagination is consistent across pages: every page of one snapshot reports the
same `revision`. If a client observes a different `revision` mid-pagination it
MUST discard the partial result and restart. A client swaps its local snapshot
only after the last page arrives and the assembled catalog validates.

### 5.2 Presentation policy (admin-authored)

The catalog's display surface is operator-configurable. The policy is owned by
`sdkwork-models`, not by Cloud Router's operational settings store: it lives in
the model-frontend tables (`ai_model_frontend_channel`,
`ai_model_frontend_channel_model`, `ai_model_frontend_field`, and
`ai_model_frontend_revision`; see `sdkwork-models` ADR
`ADR-20261115-frontend-model-config-tables`). The admin Models page's
`模型前端配置` menu item edits one channel tab
per product surface (LLM / video / image / audio / music / …); the models
backend serves the revisioned document and the catalog projection resolves it
into every snapshot as the `presentation` member.

The channel's enable/order/default-model/field-visibility document maps onto the
catalog policy below. The catalog projection reads the enabled channels and
their capability bindings; `openApiEnabled`/`appApiEnabled` are derived from the
channel's `enabled` flag and the deployment's surface policy.

| Field | Type | Default | Meaning |
| --- | --- | --- | --- |
| `openApiEnabled` | boolean | `true` | Serve `/v1/model_catalog` to API-key callers |
| `appApiEnabled` | boolean | `true` | Serve `/app/v3/api/ai/model_catalog` to signed-in clients |
| `includeParameters` | boolean | `true` | Include the parameter registry when `include` is omitted |
| `includePricing` | boolean | `false` | Include reference prices when `include` is omitted |
| `includeExtensions` | boolean | `false` | Include namespaced extension data when `include` is omitted |
| `exposeDeprecatedModels` | boolean | `false` | Keep deprecated/retired models in the served catalog |
| `defaultPageSize` | integer | `100` | Page size when `page_size` is omitted |
| `maxPageSize` | integer | `500` | Largest accepted page size |
| `vendorOrder` | string[] | `[]` | Vendor codes in presentation order; unlisted vendors follow in catalog order |

Rules:

- The stored document is sparse: an omitted field means "the shipped default",
  and `{}` restores every default. The resolved policy is what `presentation`
  reports, so a client never re-implements defaulting.
- A stored value outside the declared domain is rejected at write time, so a
  served snapshot always carries a valid policy.
- Disabling a surface hides it: the disabled prefix answers `404` with code
  `model_catalog.surface_disabled`. The other surface is unaffected.
- `include*` fields are defaults for a request that omits `include`; an explicit
  `include` always wins.
- `defaultPageSize` MUST NOT exceed `maxPageSize`; a write that would violate
  this is normalized to the maximum.
- `vendorOrder` affects presentation order only. `catalogKey` identity and
  `revision` semantics are unchanged.

## 6. App API Surface

Mount: `/app/v3/api/ai`. Auth: existing app tokens (`AuthToken` + `AccessToken`)
with organization membership, exactly like `/app/v3/api/ai/models`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/app/v3/api/ai/model_catalog` | Current snapshot, paged |
| GET | `/app/v3/api/ai/model_catalog/changes` | Delta since a revision |
| GET | `/app/v3/api/ai/model_catalog/vendors` | Vendor list with counts |
| GET | `/app/v3/api/ai/model_catalog/models/{vendor_code}/{model_id}` | One model |
| GET | `/app/v3/api/ai/model_catalog/parameters` | Parameter registry |

App responses use the existing `SdkWorkApiResponse` envelope
(`{ code: 0, data, traceId }`). The `data` member is the same resource the
open-api surface returns, so one client model serves both surfaces.

The existing `/app/v3/api/ai/models` paged list remains supported and becomes a
**projection** of the snapshot: its `data.pageInfo` MUST gain the
`catalogRevision` and `catalogVersion` of the snapshot it was read from, so a
UI can detect that its paged list is stale without moving to the sync surface.

## 7. Wire Contracts

All field names are camelCase on the wire; query parameters are snake_case,
matching the existing app-api catalog contract.

### 7.1 Snapshot

```json
{
  "object": "model_catalog",
  "schemaVersion": "1.0.0",
  "catalogVersion": "2026.11.14.6",
  "revision": 128,
  "parameterRegistryVersion": "1.0.0",
  "generatedAt": "2026-11-14T00:00:00Z",
  "updatedAt": "2026-11-15T09:30:00Z",
  "pageInfo": { "mode": "cursor", "pageSize": 100, "nextCursor": "eyJ2IjoxMjh9", "hasMore": true },
  "vendors": [
    {
      "vendorCode": "deepseek",
      "regionCode": "global",
      "displayName": "DeepSeek",
      "modelCount": 4,
      "capabilities": ["chat"],
      "extensions": {}
    }
  ],
  "models": [
    {
      "catalogKey": "deepseek/deepseek-flash",
      "modelId": "deepseek-flash",
      "vendorCode": "deepseek",
      "vendorName": "DeepSeek",
      "regionCode": "global",
      "displayName": "DeepSeek V4.1 Flash",
      "capabilities": ["chat"],
      "inputModalities": ["text", "image"],
      "outputModalities": ["text"],
      "apiFormat": "openai_compatible",
      "contextTokens": 1048576,
      "maxOutputTokens": 393216,
      "supportsStreaming": true,
      "supportsTools": true,
      "supportsJsonSchema": true,
      "lifecycle": "active",
      "releaseStage": "active",
      "shelfState": "listed",
      "routingState": "enabled",
      "parameters": ["temperature", "top_p", "max_output_tokens", "reasoning_effort", "tool_choice", "response_format"],
      "defaultParameters": { "temperature": 1, "top_p": 1 },
      "parameterConstraints": [
        { "name": "temperature", "minimum": 0, "maximum": 2 },
        { "name": "reasoning_effort", "enum": ["off", "low", "medium", "high"] }
      ],
      "extensions": {}
    }
  ],
  "parameters": [
    {
      "name": "temperature",
      "wireName": "temperature",
      "type": "number",
      "minimum": 0,
      "maximum": 2,
      "default": 1,
      "scope": "request",
      "protocols": ["openai_completions", "anthropic_messages"],
      "status": "active",
      "description": "Sampling temperature.",
      "extensions": {}
    }
  ],
  "extensions": {}
}
```

`vendors`, `models`, and `parameters` are omitted when the corresponding
`include` value does not request them. `parameters` is included when
`include=parameters`; `pricing` rows appear on the model only when
`include=pricing`.

### 7.2 Delta

```json
{
  "object": "model_catalog.changes",
  "schemaVersion": "1.0.0",
  "catalogVersion": "2026.11.14.6",
  "baseRevision": 127,
  "revision": 128,
  "updatedAt": "2026-11-15T09:30:00Z",
  "vendors": [{ "vendorCode": "deepseek", "regionCode": "global", "displayName": "DeepSeek", "modelCount": 4, "capabilities": ["chat"] }],
  "models": [{ "catalogKey": "deepseek/deepseek-flash", "...": "full model row" }],
  "parameters": [{ "name": "reasoning_effort", "...": "full descriptor" }],
  "tombstones": [
    { "catalogKey": "deepseek/deepseek-v4-flash", "revision": 128, "removedAt": "2026-11-15T09:30:00Z" }
  ],
  "hasMore": false,
  "nextSinceRevision": 128
}
```

Delta rules:

- `baseRevision` MUST equal the client's stored `revision`. Otherwise the
  client performs a full resync; the server also answers `409
  model_catalog.revision_gap` with `latestRevision` when the requested
  `since_revision` is older than the retention window.
- Upserts carry the complete row, not a patch. A row present in `models`
  replaces the local row with the same `catalogKey`.
- Tombstones remove the local row and MUST be honored before the snapshot is
  published to readers.
- Applying the same delta twice is a no-op because `revision` is compared
  before the write.
- `hasMore` paginates a paged change. A paged delta is a sequence of
  single-revision deltas: the next request uses `since_revision = revision`,
  and `nextSinceRevision` MUST equal `revision` when present. A server that
  names any other next revision is rejected with
  `model_catalog.invalid_cursor`, because following it would skip or replay a
  revision.
- `parameterRegistryVersion`, when present, is the registry version after the
  delta. Omitted means the registry did not change.

### 7.3 Response headers

| Header | Every response | Meaning |
| --- | --- | --- |
| `ETag` | yes | `"mcat-<revision>-<sha256-prefix-16>"`, strong validator |
| `X-Catalog-Revision` | yes | Numeric revision, mirrored for diagnostics |
| `X-Catalog-Version` | yes | `catalogVersion` |
| `X-Catalog-Schema-Version` | yes | `schemaVersion` |
| `Cache-Control` | yes | `private, no-cache` for app-api; `private, max-age=60` for open-api |
| `Retry-After` | 429/503 only | Seconds, respected by the client backoff |
| `X-Catalog-Sync-State` | tri-state optional | `current`, `projecting`, `degraded` |

## 8. Synchronization Protocol

Client state: `{ schemaVersion, catalogVersion, revision, etag, snapshot }`.

### 8.1 First sync (cold)

1. Load the local snapshot (see §10). If present, publish it immediately and
   continue in the background.
2. Otherwise publish the bundled seed with `source: "seed"`.
3. `GET model_catalog?page_size=500` following `cursor` until `hasMore=false`.
4. Validate, assemble, and publish only when complete (see §9).
5. Persist, then record the new `etag`/`revision`.

### 8.2 Conditional sync (warm)

1. `GET model_catalog` with `If-None-Match: <etag>`.
2. `304 Not Modified` - keep the snapshot; update `lastCheckedAt` only.
3. `200` - behave as cold sync from step 3.

### 8.3 Delta sync

1. `GET model_catalog/changes?since_revision=<local.revision>` with
   `If-None-Match`.
2. `304` - nothing to do.
3. `200` with `baseRevision === local.revision` - apply, validate, publish.
4. `409` / `baseRevision` mismatch / unknown `schemaVersion` - full resync.

### 8.4 Triggers and backoff

Triggers: process start, window/app foreground, credential sign-in or sign-out,
manual refresh, and a periodic poll (default 30 minutes, floor 5 minutes).
A future server push (SSE/webhook carrying only `revision`) may replace the
poll; the fetch contract stays the same.

Backoff: 1s, 2s, 4s, 8s, ... capped at 60s, ±20% jitter, and never less than
`Retry-After`. Network and 5xx failures are retryable; 4xx contract errors put
the syncer in `degraded` and keep the last known good snapshot.

## 9. Validation

Before a candidate is published it MUST pass every check:

1. `schemaVersion` major is supported.
2. `revision` is a positive integer and greater than the current revision.
3. `catalogVersion` is non-empty and matches `X-Catalog-Version` when present.
4. `catalogKey` is unique across `models` and the tombstone set.
5. `(vendorCode, regionCode)` is unique across `vendors`.
6. Every `parameterConstraints[].name` and `defaultParameters` key exists in
   the assembled registry.
7. `contextTokens` and `maxOutputTokens`, when present, are positive integers.
8. Every page of one snapshot carries the same `revision`.
9. The assembled content hash equals the `ETag` suffix when the server supplies
   `X-Catalog-Content-Sha256`.

A candidate that fails validation is discarded. The previously published
snapshot remains readable; the failure is reported through `syncState` and a
diagnostic, never by clearing the catalog.

## 10. Local Copy-On-Write Persistence

The local catalog is an immutable value. Updating it is: build a new value,
validate it, then atomically publish it. Nothing mutates a snapshot a reader may
still hold.

### 10.1 In-memory

- `ModelCatalogStore` owns one `ModelCatalogView` pointer
  (`{ snapshot, source, loadedAt }`).
- `commit(next)` validates, deep-freezes, swaps the pointer in one synchronous
  step, then notifies subscribers.
- A reader that captured the old pointer keeps a complete, internally
  consistent catalog.
- `applyDelta(delta)` reads the current view, produces a new frozen view, and
  commits it through the same path. A failed delta leaves the view untouched.

### 10.2 On disk

```
<catalogDir>/
  current.json                 # { generation, revision, etag, file, sha256 }
  revisions/
    <revision>-<sha256-16>.json
    <revision>-<sha256-16>.json
  quarantine/                  # invalid candidates, never served
```

Write order:

1. Serialize the candidate and write `revisions/<rev>-<hash>.json` through a
   temp file in the same directory, `fsync`, then `rename` (atomic on the same
   filesystem).
2. Write `current.json.new`, `fsync`, then `rename` over `current.json`. The
   pointer replace is the commit point.
3. Keep the pointed revision plus the two newest valid revisions; prune older
   files only after the pointer is durable.

Read order:

1. Read `current.json`. If missing or malformed -> step 3.
2. Read and validate the referenced revision file. If invalid -> quarantine the
   file, then step 3.
3. Scan `revisions/` newest first and publish the first valid snapshot.
4. If nothing valid exists, publish the bundled seed.

A crash at any point leaves either the old pointer or the new pointer. A
reader never observes a half-written snapshot because pointers only reference
completed, fsynced files.

### 10.3 Ownership

- The syncer is the only writer of `catalogDir`; readers only read.
- The bundled seed is never written to disk; it is a fallback constant.
- User preferences (favorites, ordering, hidden models) are user-owned state and
  are stored separately. They never enter the catalog snapshot and never alter
  `revision`.

## 11. Precedence

Sources, strongest first:

1. **remote** - a validated snapshot served by this API.
2. **local** - the last known good persisted snapshot.
3. **seed** - the build-time projection of `sdkwork-models`.

Resolution rule (the backend wins when it has data):

| remote catalog | local/seed | Effective catalog |
| --- | --- | --- |
| loaded, `models.length > 0` | any | **remote**, wholesale |
| loaded, `models.length === 0` | non-empty | **local**, unchanged |
| loaded, `models.length === 0` | empty | remote (empty catalog) |
| unreachable | any | **local** if valid, else **seed** |

"The backend wins" is a **whole-catalog** rule, not a field merge. Fields are
not mixed between remote and seed: a mixed catalog would have no meaningful
`revision` and would hide a vendor removal coming from the backend. Display-only
preferences (§10.3) are the only layered state.

An empty remote catalog is treated as "backend catalog not configured for this
deployment", not as "all models were removed". A removal reaches the client as
a tombstone or as an absent row inside a non-empty catalog.

A build-time seed carries no server revision. The client therefore applies the
monotonic `revision` rule only between backend-sourced snapshots: the first
backend revision may legitimately share the seed's number, and the seed is
replaced wholesale rather than compared against it.

## 12. Error Model

Errors on both surfaces use `application/problem+json` (RFC 9457) with a stable
`code`, a human-readable `title`, and an optional `detail`. The app-api wraps
the same `code` in the existing failure envelope.

| HTTP | `code` | Client action |
| --- | --- | --- |
| 304 | - | Keep snapshot |
| 400 | `model_catalog.invalid_cursor` | Restart from page 1 |
| 401 | `model_catalog.unauthorized` | Require sign-in / API key |
| 403 | `model_catalog.forbidden` | Stop; keep local catalog |
| 404 | `model_catalog.model_not_found` | Treat as removed |
| 404 | `model_catalog.surface_disabled` | The admin policy disabled this surface; use the other surface or stop |
| 409 | `model_catalog.revision_gap` | Full resync |
| 422 | `model_catalog.version_unsupported` | Degrade; keep local catalog |
| 429 | `model_catalog.rate_limited` | Back off per `Retry-After` |
| 503 | `model_catalog.unavailable` | Retry with backoff |

## 13. Security And Tenancy

- open-api requires a valid Cloud Router credential, exactly like `/v1/models`:
  an API key or a dual-token IAM session. Catalog reads add no separate scope; a
  deployment that enables scoped API keys may gate the surface behind a
  `model_catalog:read` scope without changing this contract.
- app-api requires organization membership; the catalog is tenant-visible data,
  so responses are identical between members and carry no tenant identifiers.
- No credentials, base URLs with embedded secrets, or upstream account ids are
  exposed. `providerCodes` are deployment routing codes, not credentials.
- `ETag` is not an authorization boundary: every request re-authenticates.
- Responses are `Cache-Control: private` so shared proxies do not mix tenants.

## 14. Observability

- Every response carries `X-Catalog-Revision`, `X-Catalog-Version`, and
  `X-Catalog-Schema-Version`.
- Server metrics: snapshot latency, delta size, `304` ratio, revision-gap
  count, and projection age (`now - updatedAt`).
- Client state: `idle | syncing | current | degraded | offline`, last success,
  last error code, catalog revision. This state is diagnostics, never a
  substitute for the catalog itself.

## 15. Compatibility And Deprecation

- Within `schemaVersion` major 1, only additive changes: new optional fields,
  new enum values in open sets, new descriptor fields, new endpoints.
- Removing a field, tightening a type, or renaming a field requires a major
  bump.
- Deprecating a model uses `lifecycle`/`releaseStage`, not removal. Deprecating
  a parameter uses `status: "deprecated"` + `replacement`, never silent removal
  inside a minor version.
- A model row is removed from the catalog only when the catalog release removes
  it; the delta then carries a tombstone so every client converges.
- The client advertises its supported major in diagnostics, and the server may
  reject an unsupported major with `422`.

## 16. Industry Alignment

| This contract | Industry precedent | Why |
| --- | --- | --- |
| `GET /v1/model_catalog` alongside `GET /v1/models` | OpenAI `/v1/models`; OpenRouter `/api/v1/models` | Keep the strict OpenAI list intact, publish the rich document separately |
| `parameters[]` + `defaultParameters` | OpenRouter `supported_parameters` / `default_parameters`; LiteLLM `supported_openai_params` | Clients render and validate request controls without hard-coding vendors |
| `parameterConstraints` per model | OpenRouter `per_request_limits`; JSON Schema bounds | A vendor default that differs per model stays data, not code |
| `extensions` namespaced object | OpenAPI `x-*`, CloudEvents extensions | Additive vendor data without schema churn |
| `ETag` + `If-None-Match` | RFC 9110 conditional requests | One cheap round trip when nothing changed |
| Delta + tombstones + cursor | Stripe `starting_after` / Stripe Events; Google `syncToken` | Incremental convergence with deletions |
| `revision` + `schemaVersion` | Kubernetes `resourceVersion`; protobuf schema versions | Ordering distinct from schema compatibility |
| RFC 9457 problem details | RFC 9457 | One error shape across both surfaces |

## 17. Cross-Repository Implementation Plan

### Phase 1 - Contract (this change)

- `sdkwork-cloudrouter`:
  - this standard;
  - `docs/architecture/tech/assets/model-catalog-sync.open-api.openapi.json`
    and `...app-api.openapi.json`;
  - a contract test that validates both fragments;
  - link this shard from `TECH_ARCHITECTURE.md`.
- No runtime behavior changes.

### Phase 2 - cloudrouter projection

- `sdkwork-models`: add parameter descriptors to the catalog release
  (`models/parameters.json` + optional per-model `parameters` and
  `defaultParameters`), bump `schemaVersion` minor, and expose the same fields
  in `sdkwork-models-catalog-service`.
- `sdkwork-cloudrouter`: add a projection table `ai_model_catalog_revision`
  (`revision`, `catalog_version`, `schema_version`, `content_sha256`,
  `published_at`) written in the same transaction as catalog imports; serve the
  new routes from the imported catalog; compute `ETag` from
  `revision + content_sha256`; retain deltas for `N` revisions (default 30).
- Route crates: add the five routes to `sdkwork-routes-cloudrouter-app-api`
  (app-api) and the open-api gateway route manifest, delegating to the catalog
  projection service; then regenerate OpenAPI through the existing pipeline
  (`pnpm api:http-route-manifest:write`, `pnpm api:materialize:write`,
  `pnpm api:standard-extensions:write`).
- Never hand-edit generated OpenAPI authorities. The fragments in this change
  are authoring inputs for the generator, not authorities.

### Phase 3 - local runtime

- `sdkwork-birdcoder2`: `@deepseek-ai/dsh-llm` exposes the COW store, delta
  application, persistence adapter, and sync orchestrator implemented with this
  change. `llm-pi-ai`'s relay catalog consumes the effective snapshot: the
  remote catalog replaces the generated seed when non-empty, and the seed
  remains the offline fallback.

### Phase 4 - rollout

- Ship Phase 1-3 dark (sync disabled by default in a deployment that has no
  catalog endpoint).
- Enable for internal accounts, compare picker output against the seed, then
  enable broadly.
- The seed generator keeps working indefinitely; it is the last-resort fallback.

## 18. Verification

Contract tests:

- Both fragments are OpenAPI 3.1.2, every `$ref` resolves, every operation id is
  unique, every operation declares security and the version headers.
- Snapshot, delta, and parameter examples validate against their schemas.

Runtime tests (Phase 2+):

- A revision bump with one changed model yields exactly that row in the delta.
- A removed model yields a tombstone and disappears after application.
- A `since_revision` older than retention yields `409` and a client full resync.
- Concurrent readers observe either revision *N* or *N+1*, never a mix.
- A crash between revision-file write and pointer replace serves revision *N*.
- A corrupted pointer falls back to the newest valid revision, then the seed.
- An empty remote catalog leaves the seed in place; a non-empty remote catalog
  replaces it wholesale.
- Two clients syncing the same revision apply it idempotently.

## Appendix A - Minimal End-To-End Sequence

```text
client                          cloudrouter
  | GET /v1/model_catalog          |
  |------------------------------->|
  | 200 + ETag "mcat-128-..."     |
  |<-------------------------------|
  | persist rev 128 (COW)         |
  | GET .../changes?since_revision=128   (poll)
  |------------------------------->|
  | 304 Not Modified              |
  |<-------------------------------|
  ... catalog import commits revision 129 ...
  | GET .../changes?since_revision=128   (poll)
  |------------------------------->|
  | 200 baseRevision=128 revision=129    |
  |<-------------------------------|
  | apply delta on a copy, validate, swap |
```

## Appendix B - Field Dictionary (snapshot)

| Field | Type | Notes |
| --- | --- | --- |
| `object` | const `model_catalog` | Discriminator |
| `schemaVersion` | string | Semver |
| `catalogVersion` | string | `YYYY.MM.DD.N` |
| `revision` | integer | Monotonic |
| `parameterRegistryVersion` | string | Semver |
| `generatedAt` | RFC3339 | Catalog release time |
| `updatedAt` | RFC3339 | Projection time |
| `pageInfo` | object | `mode`, `page`, `pageSize`, `nextCursor`, `hasMore`, `totalItems` |
| `vendors[]` | array | `vendorCode`, `regionCode`, `displayName`, `modelCount`, `capabilities`, `extensions` |
| `models[]` | array | See §7.1 |
| `parameters[]` | array | See §4.1 |
| `extensions` | object | Namespaced |
