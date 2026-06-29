> Migrated from `docs/27-rust-runtime-and-sdk-integration-standard.md` on 2026-06-24.
> Owner: SDKWork maintainers

# sdkwork-clawrouter Rust Runtime and SDK Integration Standard

## 1. Purpose

`sdkwork-clawrouter` is the Rust-first AI gateway runtime for SDKWork Claw Router. It keeps the user-facing product boundary in `apps/sdkwork-clawrouter-pc` and implements the runtime architecture as a high-performance, modular Rust service set.

This document defines the implementation boundary between:

- Rust runtime services in `sdkwork-clawrouter`
- stable app/backend API path prefixes
- generated SDK packages from `sdk/sdkwork-sdk-generator`
- frontend portal business modules
- OpenAI-compatible runtime forwarding under `/v1/**`

The goal is a standard system that supports local desktop, server, Docker, and Kubernetes deployments without creating SDK forks, raw business HTTP clients, or divergent API paths.

## 2. Non-Negotiable Rules

1. Runtime implementation language is Rust.
2. Public app and admin API paths use the stable SDKWork surfaces:
   - app/console/public: `/app/v3/api/**`
   - admin/backend: `/backend/v3/api/**`
   - OpenAI-compatible inference runtime: `/v1/**`
3. Portal UI visual design is owned by `apps/sdkwork-clawrouter-pc`; implementation must not alter visual layout, colors, spacing, component hierarchy, or interaction design unless a later product requirement explicitly asks for it.
4. Frontend business calls must use generated SDKs or thin wrappers that delegate to generated SDKs.
5. Rust services that call app/backend business APIs must use generated Rust SDKs. If a generated Rust package is missing, fix the OpenAPI source and generator first; do not introduce handwritten Rust clients for app/backend business endpoints.
6. Generated SDK output must not be hand-edited. Fix OpenAPI source or generator templates, regenerate, and commit the generated artifact if required.
7. Provider relay, routing, quota calculation, local secret loading, local cache, streaming proxying, and `/v1/**` upstream calls are native Rust runtime concerns. They may use native Rust HTTP clients for upstream provider/runtime infrastructure.
8. User, VIP, account, coupon, order, payment, points recharge, PlusApp, AgentSkills, and PlusCategory domains are owned by composed SDKWork modules (`sdkwork-商���`, `sdkwork-iam`, `sdkwork-models`, `sdkwork-agent`, and related packages). Claw Router consumes their contracts through generated SDKs and install-time schema composition; new Claw tables are only allowed where no composed module already owns the model.
9. Any table, column, index, migration, or embedded DB schema change requires explicit confirmation before implementation.

## 3. SDK Source Of Truth

| Surface | Path Prefix | Generated Client | OpenAPI Source | SDK Home |
| --- | --- | --- | --- | --- |
| app | `/app/v3/api` | `SdkworkAppClient` | `sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi/src` | `sdks/clawrouter-app-sdk` |
| backend | `/backend/v3/api` | `SdkworkBackendClient` | `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi/src` | `sdks/clawrouter-backend-sdk` |
| ai/openai | `/v1` | `SdkworkAiClient` | `sdks/clawrouter-open-sdk/clawrouter-open-sdk-typescript/generated/server-openapi/src` | `sdks/clawrouter-open-sdk` |

SDK generation is owned by:

```text
sdk/sdkwork-sdk-generator
```

The generated package names must follow the existing client naming standard:

- app: `SdkworkAppClient` from `@sdkwork/clawrouter-app-sdk`
- backend: `SdkworkBackendClient` from `@sdkwork/clawrouter-backend-sdk`
- ai/open: `SdkworkAiClient` from `@sdkwork/clawrouter-open-sdk`

## 4. SDK Generation Commands

Run from the repository root.

App SDK runtime package:

```powershell
pnpm --dir sdks/clawrouter-app-sdk/clawrouter-app-sdk-typescript/generated/server-openapi build
```

Backend SDK runtime package:

```powershell
pnpm --dir sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/generated/server-openapi build
```

Manual app SDK generation, when the owner OpenAPI input changes:

```powershell
node sdk\sdkwork-sdk-generator\bin\sdkgen.js generate `
  -i sdks\clawrouter-app-sdk\openapi\clawrouter-app-sdk.openapi.json `
  -o sdks\clawrouter-app-sdk\clawrouter-app-sdk-typescript\generated\server-openapi `
  -n clawrouter-app-sdk `
  -t app `
  -l typescript `
  --base-url http://localhost:8080 `
  --api-prefix /app/v3/api
```

Manual backend SDK generation, when the owner OpenAPI input changes:

```powershell
node sdk\sdkwork-sdk-generator\bin\sdkgen.js generate `
  -i sdks\clawrouter-backend-sdk\openapi\clawrouter-backend-sdk.openapi.json `
  -o sdks\clawrouter-backend-sdk\clawrouter-backend-sdk-typescript\generated\server-openapi `
  -n clawrouter-backend-sdk `
  -t backend `
  -l typescript `
  --base-url http://localhost:8080 `
  --api-prefix /backend/v3/api
```

Rust SDK generation must use the same generator. If the app/backend SDK homes do not yet include Rust generated packages, close that generator/package gap before wiring Rust app/backend business calls.

## 5. API Contract Manifest

The frontend operation contract is declared in:

```text
docs/schema-registry/frontend-field-contracts.yaml
```

The generated machine-readable API contract manifest is:

```text
generated/api/api-contract-manifest.json
```

Generation:

```powershell
python -B -m tools.api_contract_manifest
```

Check mode:

```powershell
python -B -m tools.api_contract_manifest --check
```

The manifest normalizes every portal service operation into:

- route and route scope
- source service file and operation name
- API method and API path
- API surface and SDK family
- generated SDK client name
- module/tag
- path parameters
- read sources and write tables

This manifest is part of `tools.schema_quality_gate`, so stale or invalid API boundary data fails the quality gate.

Rust app/admin services must use the manifest as the contract route baseline. If a path is declared but the business use case is not implemented yet, the service returns a standard 501 envelope instead of a fake success response. If a path is not declared for that surface and method, it remains 404. This gives generated SDK consumers deterministic behavior while preserving implementation honesty.

## 6. Portal Integration Boundary

Portal packages may keep UI components and local presentation state. Business calls must follow this shape:

```text
React component or hook
  -> portal service/wrapper
  -> generated app/backend SDK client
  -> /app/v3/api/** or /backend/v3/api/**
```

The service/wrapper layer may:

- adapt component-friendly query objects to generated SDK request DTOs
- map generated SDK response DTOs into existing view models
- centralize token binding and base URL configuration

The service/wrapper layer must not:

- call `fetch`, `axios`, or generic request helpers for app/backend business endpoints
- manually build `Authorization` or `Access-Token` headers in feature modules
- fork generated DTOs to hide missing SDK methods
- return fake success for missing backend behavior
- change UI visuals while replacing transport

If a generated SDK method is missing, the required sequence is:

1. define the semantic method and request/response contract
2. align the owning Rust handler and OpenAPI snapshot
3. regenerate the SDK via `sdk/sdkwork-sdk-generator`
4. reconnect the portal wrapper to the regenerated SDK

## 7. Rust Service Boundary

The Rust workspace is organized around small, high-cohesion crates:

- `sdkwork-claw-contract`: route/API constants and generated manifest types
- `sdkwork-claw-config`: deployment mode and runtime configuration
- `sdkwork-claw-health`: shared app state, error and health model
- `sdkwork-claw-observability`: tracing/logging setup
- `sdkwork-clawrouter-cloud-gateway`: `/v1/**` gateway runtime and health
- `sdkwork-clawrouter-admin-gateway`: `/backend/v3/api/**` admin surface
- `sdkwork-clawrouter-standalone-gateway`: `/app/v3/api/**` app/console/public surface
- `sdkwork-clawrouter-router-service`: product composition entrypoint

Initial implementation must expose health endpoints and typed configuration first. Business handlers are added only after the API contract, SDK method, and persistence ownership are clear.

The shared `sdkwork-claw-http` crate owns the manifest-driven contract route fallback for `/app/v3/api/**` and `/backend/v3/api/**`. Service crates should not copy manifest parsing or fallback response logic into their own `lib.rs`; feature modules should replace 501 behavior by registering real handlers through focused `api`, `application`, `domain`, `ports`, `infrastructure`, and `bootstrap` submodules.

The same HTTP crate owns API Key request identity parsing through `ApiKeyIdentity`. It accepts the runtime-compatible credential forms `Authorization: Bearer`, `x-api-key`, `x-goog-api-key`, and query key, plus an internal resolved ID context header while the database-backed key hash lookup adapter is wired. Business handlers must not parse raw auth headers or query-string secrets; they consume parsed identity or an application-level context only.

Credential authentication after parsing is a product application concern behind `ApiKeySecretHasher`. `ApiKeySecurityConfig` loads `SDKWORK_CLAW_API_KEY_PEPPER`, and `HmacSha256ApiKeySecretHasher` computes the approved HMAC plus pepper digest and matches `iam_gateway_api_key.key_hash`; no plaintext API key storage or plaintext lookup is allowed in SQL snapshots, cache records, errors, logs, or generated SDK DTOs. If the production crypto dependency or pepper source is unavailable, startup must fail or keep the route on an explicit unresolved-context path instead of using a weak temporary hash.

The model and pricing product base lives in `sdkwork-clawrouter-router-service`. It resolves `ModelVendor`, model catalog rows, provider-specific upstream costs, official reference prices, customer charge prices, `ai_pricing_plan`, and `ai_channel_group` multipliers through a `PricingCatalog` port. API Key group binding is part of the pricing resolution path because `iam_gateway_api_key.channel_group_id` chooses the business group and its default pricing plan.

Model list APIs must consume `ModelCatalogQueryService` rather than reconstructing pricing in handlers. The query result carries `PriceAvailability` so `/models` and `/backend/v3/api/model/list` can display unavailable pricing honestly while still listing catalog metadata. Decimal values crossing API/SDK boundaries remain strings.

The backend adapter for `/backend/v3/api/model/list` is named `AdminModelRoute`. It returns the SDKWork backend JSON envelope and maps product application DTOs to SDK-facing JSON only; production wiring must use a real `PricingCatalog` implementation, not the in-memory test catalog.

The gateway adapter for `/v1/models` is named `OpenAIModelsRoute`. It is mounted by the `sdkwork-clawrouter-cloud-gateway` runtime module, authenticates through `ApiKeySecurityConfig` and `HmacSha256ApiKeySecretHasher`, uses the same database-backed `PricingCatalog` snapshot as admin product catalog views, and returns an OpenAI-compatible `{"object":"list","data":[...]}` envelope. Gateway startup and database loader failures are represented by `GatewayRouterError`; this boundary must redact database URLs, API key secrets, and pepper material.

The gateway boundary for `/v1/chat/completions` is named `OpenAIChatCompletionsRoute`. It performs the production-safe front half of the request before provider execution: parse request JSON, authenticate the API Key, validate model availability, select the configured provider route, and verify `LlmInputToken` pricing for the API Key group. Non-stream requests enter the `ChatCompletionRelay` product port through `ChatCompletionRelayRequest`; stream requests enter `ChatCompletionStreamRelay` and return `ChatCompletionStreamRelayResponse` with upstream `text/event-stream`/SSE body pass-through. If the matching relay is absent, the route returns the OpenAI-compatible `provider_relay_not_configured` or `streaming_relay_not_configured` 501 error. Fake assistant choices, fake usage, mock provider payloads, buffered fake chunks, or wrapped app/backend JSON envelopes are forbidden.

For Chat completions, a successful upstream provider response is not commercially complete until its OpenAI `usage` object has been converted into a `GatewayUsageRecordCommand` and persisted through the `GatewayUsageRecorder` port. Database-backed gateway bootstrap must inject `SqliteGatewayUsageRecorder` for SQLite and `PostgresGatewayUsageRecorder` for PostgreSQL so `ai_request_trace` receives the request audit fact and `ai_usage_fact` receives the billable usage fact with tenant, organization, user, API key, provider route, pricing snapshot, token counts, and request id. Missing required `usage` fields on a non-stream 2xx response returns `provider_usage_record_failed`; the runtime must not record zero-token fake usage. Streaming usage is an audited SSE finalization boundary: stream adapters must force upstream `stream_options.include_usage=true` while preserving other `stream_options` fields, and the gateway route must use `StreamingUsageRecordingBody` to parse the final provider usage event and persist it before the response body completes. If streaming usage is missing or usage recording fails, the body must fail instead of silently returning an unbillable success.

The settlement closure after `ai_usage_fact` is asynchronous and idempotent. Runtime or worker bootstrap must use `UsageSettlementWorker`, `UsageSettlementWorkerConfig`, `UsageSettlementStore`, `UsageSettlementCommand`, and `UsageSettlementOutcome` rather than direct SQL in route handlers. The gateway runtime starts the settlement background worker only after schema readiness confirms the required usage, settlement, account, and ledger tables and the `settlement_id` usage column exist. `SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED`, `SDKWORK_CLAW_USAGE_SETTLEMENT_BATCH_SIZE`, and `SDKWORK_CLAW_USAGE_SETTLEMENT_INTERVAL_MILLIS` control deployment activation, batch size, and loop cadence. SQLite deployments use `SqliteUsageSettlementStore`; PostgreSQL deployments use `PostgresUsageSettlementStore` with row locking and `FOR UPDATE SKIP LOCKED`. The settlement store writes `commerce_usage_settlement`, aggregates pending usage by tenant, organization, user, and currency before converting decimal customer charges into integer points, debits `commerce_account.available_amount` for the points account with an atomic balance guard, inserts `commerce_account_ledger_entry` as the final account ledger fact, and updates `ai_usage_fact.settlement_status` and `settlement_id`. Micro usage below the minimum billable point remains pending until later usage in the same account/currency makes the aggregate billable. If available points are insufficient, the store records `INSUFFICIENT_POINTS` on `commerce_usage_settlement`, keeps the balance unchanged, and leaves the usage fact retryable after recharge.

The gateway boundary for `/v1/responses` is named `OpenAIResponsesRoute`. It performs the production-safe front half of the request before provider execution: parse request JSON, authenticate the API Key, validate model availability, require responses capability, select the configured provider route, and verify `LlmInputToken` pricing for the API Key group. Non-stream requests enter the `ResponsesRelay` product port through `ResponsesRelayRequest`; if no relay is configured, the route returns the OpenAI-compatible `responses_relay_not_configured` 501 error. Streaming requests return `streaming_relay_not_configured` until an audited SSE relay exists. Fake response objects, fake output items, fake usage, mock provider payloads, buffered fake chunks, or wrapped app/backend JSON envelopes are forbidden.

The first Responses upstream adapters are `OpenAiCompatibleResponsesRelay` and `SecretRefOpenAiCompatibleResponsesRelay`. They use `UpstreamProviderEndpoint`, an absolute http or https provider URL, and `hyper` with the workspace `hyper-rustls` TLS connector to post the original OpenAI-compatible JSON body to `/v1/responses`, rewrite `model` to the selected provider model, and send bearer credentials only to the provider endpoint. Provider base URLs may be a host/context root such as `https://proxy.example/openai` or an OpenAI-compatible root such as `https://api.openai.com/v1`; the relay must normalize the /v1 prefix and never send /v1/v1/... . A provider response timeout is required around the upstream request future so a slow provider cannot hold gateway tasks indefinitely. The resolved route must carry `ai_channel.timeout_ms` as request-context provider timeout and `ai_channel.retry_policy` as request-context provider retry policy; adapters apply those per request and fall back to the audited default only when the channel fields are null. SQL snapshot loading must reject non-positive configured timeout values and invalid retry policy JSON instead of silently downgrading them. `ProviderRetryPolicy` is strict JSON with `max_attempts`, `retryable_status_codes`, and optional `backoff_ms`, and unknown fields are rejected. The non-stream JSON relay applies the platform transient provider retry standard only to retryable upstream status codes `429`, `500`, `502`, `503`, and `504` by default, or to the configured strict retry policy when present; it must not retry provider authentication, authorization, invalid JSON, body timeout, or post-success usage/billing failures. `SecretRefOpenAiCompatibleResponsesRelay` resolves `provider_secret_ref` at relay time and uses request-context `provider_base_url`, keeping provider tokens out of catalog snapshots, SQL rows, generated SDKs, logs, errors, traces, and health output.

The gateway boundary for `/v1/embeddings` is named `OpenAIEmbeddingsRoute`. It performs the production-safe front half of the request before provider execution: parse request JSON, authenticate the API Key, validate model availability, require embedding capability, select the configured provider route, and verify `EmbeddingInputToken` pricing for the API Key group. Requests enter the `EmbeddingsRelay` product port through `EmbeddingsRelayRequest`; if no relay is configured, the route returns the OpenAI-compatible `embedding_relay_not_configured` 501 error. Fake vectors, fake usage, mock provider payloads, or wrapped app/backend JSON envelopes are forbidden.

The Embeddings upstream adapters are `OpenAiCompatibleEmbeddingsRelay` and `SecretRefOpenAiCompatibleEmbeddingsRelay`. They use `UpstreamProviderEndpoint`, an absolute http or https provider URL, and `hyper` with the workspace `hyper-rustls` TLS connector to post the original OpenAI-compatible JSON body to `/v1/embeddings`, rewrite `model` to the selected provider model, and send bearer credentials only to the provider endpoint. Provider base URLs may be a host/context root such as `https://proxy.example/openai` or an OpenAI-compatible root such as `https://api.openai.com/v1`; the relay must normalize the /v1 prefix and never send /v1/v1/... . A provider response timeout is required around the upstream request future so a slow provider cannot hold gateway tasks indefinitely. The resolved route must carry `ai_channel.timeout_ms` as request-context provider timeout and `ai_channel.retry_policy` as request-context provider retry policy; adapters apply those per request and fall back to the audited default only when the channel fields are null. SQL snapshot loading must reject non-positive configured timeout values and invalid retry policy JSON instead of silently downgrading them. `ProviderRetryPolicy` is strict JSON with `max_attempts`, `retryable_status_codes`, and optional `backoff_ms`, and unknown fields are rejected. The non-stream JSON relay applies the platform transient provider retry standard only to retryable upstream status codes `429`, `500`, `502`, `503`, and `504` by default, or to the configured strict retry policy when present; it must not retry provider authentication, authorization, invalid JSON, body timeout, or post-success usage/billing failures. `SecretRefOpenAiCompatibleEmbeddingsRelay` resolves `provider_secret_ref` at relay time and uses request-context `provider_base_url`, keeping provider tokens out of catalog snapshots, SQL rows, generated SDKs, logs, errors, traces, and health output.

The upstream execution boundary is split by response mode: `ChatCompletionRelay` returns non-stream provider JSON, while `ChatCompletionStreamRelay` returns the provider SSE body through `ChatCompletionStreamRelayResponse`. Both receive `ChatCompletionRelayRequest` after the product layer has resolved API Key context, provider route, provider model, provider endpoint, provider secret reference, request-context provider timeout, request-context provider retry policy, and pricing eligibility. The request carries `provider_base_url`, `provider_secret_ref`, `ai_channel.timeout_ms`, and `ai_channel.retry_policy` as egress metadata, not provider secret plaintext. This keeps upstream HTTP adapters replaceable and prevents handler-level provider calls, hard-coded URLs, secret leakage, fake stream synthesis, or pricing bypasses.

`ProviderSecretResolver` is the secret-store port for provider credentials. It resolves `provider_secret_ref` into runtime bearer material only at relay time; catalog snapshots, SQL row DTOs, generated SDK DTOs, and HTTP responses may carry only `secret_ref`. `SecretRefOpenAiCompatibleChatCompletionRelay` and `SecretRefOpenAiCompatibleChatCompletionStreamRelay` are the request-context OpenAI-compatible relay adapters that combine `provider_base_url`, `provider_secret_ref`, and the selected provider model without storing provider secret plaintext.

Environment-backed provider secret reference resolution is typed by `ProviderSecretMapConfig`. It reads `SDKWORK_CLAW_PROVIDER_SECRET_MAP_JSON` as a JSON object mapping `secret_ref` to bearer token for local, desktop, Docker, and controlled deployment injection. `ProviderSecretMapResolver` adapts that validated config into `ProviderSecretResolver`; it trims keys and values, rejects blank entries, redacts bearer values from `Debug`, and is the preferred gateway bootstrap path when database routes already provide `provider_base_url` and `provider_secret_ref`.

Provider relay runtime configuration is typed by `ProviderRelayConfig`. It reads `SDKWORK_CLAW_OPENAI_RELAY_BASE_URL` and `SDKWORK_CLAW_OPENAI_RELAY_BEARER_TOKEN` as an all-or-none deployment pair. When the pair is absent, `/v1/chat/completions` keeps the explicit `provider_relay_not_configured` and `streaming_relay_not_configured` behavior; when either value is missing or blank, startup fails with `GatewayRouterError`; when both values are present and no `ProviderSecretMapConfig` is supplied, gateway bootstrap wires `OpenAiCompatibleChatCompletionRelay` and `OpenAiCompatibleChatCompletionStreamRelay` as the static internal-provider-proxy fallback.

`OpenAiCompatibleChatCompletionRelay`, `SecretRefOpenAiCompatibleChatCompletionRelay`, `OpenAiCompatibleChatCompletionStreamRelay`, and `SecretRefOpenAiCompatibleChatCompletionStreamRelay` live in `sdkwork-clawrouter-router-service/src/infrastructure/provider` and are the first upstream adapters behind the Chat completion relay ports. They use `UpstreamProviderEndpoint`, an absolute http or https provider URL, and `hyper` with the workspace `hyper-rustls` TLS connector to post the original OpenAI-compatible JSON body to the provider's `/v1/chat/completions`, rewrite `model` to the selected provider model, and send the upstream provider bearer token only in the outbound provider request. Provider base URLs may be a host/context root such as `https://proxy.example/openai` or an OpenAI-compatible root such as `https://api.openai.com/v1`; the relay must normalize the /v1 prefix and never send /v1/v1/... . A provider response timeout is required around the upstream request future so a slow provider cannot hold gateway tasks indefinitely. The resolved route must carry `ai_channel.timeout_ms` as request-context provider timeout and `ai_channel.retry_policy` as request-context provider retry policy; adapters apply those per request and fall back to the audited default only when the channel fields are null. SQL snapshot loading must reject non-positive configured timeout values and invalid retry policy JSON instead of silently downgrading them. `ProviderRetryPolicy` is strict JSON with `max_attempts`, `retryable_status_codes`, and optional `backoff_ms`, and unknown fields are rejected. The non-stream JSON relay applies the platform transient provider retry standard only to retryable upstream status codes `429`, `500`, `502`, `503`, and `504` by default, or to the configured strict retry policy when present; it must not retry provider authentication, authorization, invalid JSON, body timeout, or post-success usage/billing failures. Stream adapters pass upstream SSE as `text/event-stream` without buffering or synthesizing chunks, and stream adapters must not retry retryable upstream status responses because replaying a partially-open provider stream can duplicate generation and billing. The same adapter supports local/internal `http` endpoints and production external `https` provider egress through the audited TLS connector. Provider credentials must remain runtime or secret-store material with no plaintext provider secret storage in business tables, SQL snapshots, logs, health output, errors, traces, generated SDKs, or API responses.

`sdkwork-clawrouter-admin-gateway` exposes a catalog-injected router entrypoint for this route. The default service router stays on manifest 501 until bootstrap supplies a real `PricingCatalog`, which prevents accidental production mock data while still allowing route-level tests with deterministic in-memory adapters.

The product persistence boundary is standardized under `sdkwork-clawrouter-router-service/src/infrastructure/sql`. Query builders must reference Schema Registry table names directly and must not invent narrower aliases such as `ai_pricing_group`. Row mappers convert SQL projection fields into the domain model by parsing decimal strings and by using generated enums for `ModelVendor` and `BillingMeter`. Price-side ordinals are projected to stable semantic codes before they enter application logic, so pricing failures remain explicit and auditable. SQL-loaded rows are assembled into an immutable snapshot before serving the `PricingCatalog` port, which keeps request-path reads deterministic and prevents handlers from executing SQL or mutating catalog state. The snapshot loader query set is parameterless and loads the full catalog row set outside individual requests; future connection-pool code should swap snapshots atomically instead of doing pricing joins inside HTTP handlers. Local desktop deployment uses the SQLite loader over `sqlx::SqlitePool`; server, Docker, and Kubernetes deployments use the PostgreSQL loader over `sqlx::PgPool` with the same snapshot boundary.

Runtime database selection uses `DatabaseConfig` from `sdkwork-claw-config`. Runtime TOML is the primary configuration source: desktop/local deployments may use SQLite URLs, while server, Docker, and Kubernetes deployments use structured PostgreSQL fields (`host`, `port`, `database`, `username`, and `password_file` or protected `password`). `SDKWORK_CLAW_DATABASE_URL` remains available only as an explicit operator override. `SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS` controls pool size. Admin startup may mount the real product catalog only after this config loads a snapshot; otherwise it intentionally keeps manifest fallback responses.

Runtime service binding uses `RuntimeConfig` from `sdkwork-claw-config`. The three service bind variables are `SDKWORK_CLAW_GATEWAY_BIND`, `SDKWORK_CLAW_APP_API_BIND`, and `SDKWORK_CLAW_ADMIN_API_BIND`; each value must be a valid socket address and is validated before the service binds a listener. `SDKWORK_CLAW_DEPLOYMENT_MODE` is parsed by the same config boundary so desktop, server, Docker, and Kubernetes modes share one startup rule instead of per-service environment parsing.

Payment callback signing is typed by `PaymentWebhookConfig` in `sdkwork-claw-config`. Database-backed app API startup must require `SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET` with at least 32 characters before mounting real payment callback fulfillment. `SDKWORK_CLAW_PAYMENT_WEBHOOK_MAX_CLOCK_SKEW_SECONDS` may tune callback timestamp skew, defaults to 600 seconds, and is capped at 3600 seconds. The callback signature is HMAC-SHA256 over `timestamp + "." + body`, checked against `x-sdkwork-signature`, `Wechatpay-Signature`, `wechatpay-signature`, or `alipay-signature`; unsigned payment callbacks are forbidden. The payment callback router must not use app_request_subject_boundary because external payment providers cannot send browser app-session credentials. Callback routes must remain bounded by request body size, provider allow-listing, idempotent webhook event storage, nonce replay detection, and one-time recharge fulfillment.

Payment callback amounts must be parsed as exact decimal values at the API boundary and compared against persisted payment amounts through the shared decimal value type; binary floating-point comparison is forbidden in payment fulfillment. Provider cent fields such as WeChat `total_fee` must be converted into a canonical major-unit decimal string, and sub-cent callback precision must be rejected instead of silently rounded.

Recharge amounts must use the same exact decimal contract as payment callbacks. API requests may accept JSON numeric or string values only at the boundary, but the validated command, response, frontend service contract, and persistence contract must carry canonical decimal strings. binary floating-point arithmetic is forbidden for recharge amount validation, package matching, order/payment/vip recharge writes, frontend submit payloads, and point conversion. sub-cent recharge precision must be rejected instead of rounded.

`/healthz` and `/readyz` expose database status through `DatabaseHealth` only. The safe shape is `configured`, `engine`, and `maxConnections`; responses must not expose database URLs or any connection-string material such as usernames, passwords, hostnames, file paths, or query strings.

## 8. Deployment Modes

`sdkwork-clawrouter` must support these deployment modes as first-class config values:

- `desktop`: local desktop or bundled app runtime; local SQLite/libsql and local secret store are allowed.
- `server`: standalone server deployment; PostgreSQL/MySQL and external secret store are expected.
- `docker`: container deployment with environment-driven config.
- `kubernetes`: K8S deployment with service discovery, readiness/liveness probes, config maps, secrets, and horizontal scaling.

Deployment mode must be parsed as a typed enum in Rust and must be available to health/readiness output so operations can confirm runtime identity.

## 9. Performance Standard

Rust services should default to:

- `tokio` multi-thread runtime
- `axum` HTTP layer
- `tower` middleware
- `hyper` for native OpenAI-compatible upstream provider relay
- streaming-safe `/v1/**` forwarding
- bounded request bodies and timeouts
- connection pooling for DB and upstream providers
- structured tracing with request IDs
- no blocking work on async executor threads

New runtime code should keep each production slice narrow, modular, and verifiable without depending on retired workspace references.

## 10. Security Standard

Required controls:

- no secrets in logs
- no manual auth header assembly in feature/business modules
- API key/token redaction in traces and errors
- app/backend SDK token setters or approved SDK auth configuration only
- strict app/backend prefix separation
- admin routes require backend surface
- non-admin portal routes must not use backend surface
- `/v1/**` runtime routes must not return wrapped app/backend JSON envelopes
- audit logging for admin writes
- idempotency and request IDs for payment, recharge, coupon, and order actions

## 11. Verification

Required local checks for this standard:

```powershell
python -B -m tools.api_contract_manifest --check
python -B -m tools.frontend_operation_audit --check
python -B -m tools.schema_quality_gate
cargo test
pnpm format:rust:check
```

If SDK generation is changed, also run the relevant generator check from the owning SDK home. Generated SDK files remain generated artifacts and must not be manually edited.

## 12. Dependency API Surface Mounting

Claw Router consumes dependency SDK families, but dependency SDK generation ownership is separate
from Rust runtime mounting. The runtime must record every dependency HTTP SDK surface in
`specs/dependency-api-surfaces.json` before frontend packages are allowed to construct that SDK
client.

Rules:

- `sdkDependencies` proves owner-only SDK generation boundaries only. It does not prove that the
  Claw Router Rust process serves the dependency API through `/app/v3/api` or `/backend/v3/api`.
- Appbase app-api may inherit same-origin app API base URLs only when
  `dependency-api-surfaces.json` records `sameOriginAllowed: true` and lists concrete Claw Router
  handler adapters or an executable dependency router export with coverage evidence.
- Appbase backend-api IAM management is an external service until an appbase-owned executable
  backend IAM router/controller is mounted and verified. Route metadata such as
  `sdkwork_iam_http::backend_routes()` is contract evidence, not handler coverage.
- Frontend/admin services that call appbase backend IAM resources such as users, roles,
  permissions, organizations, departments, role bindings, API key list, or API key revoke must use
  `@sdkwork/iam-backend-sdk` through `getSdkworkAppbaseBackendSdkClient()`.
- When a dependency backend surface is marked `external-service`, SDK bootstrap must require
  `VITE_SDKWORK_APPBASE_BACKEND_API_BASE_URL` from either a common
  `PORTAL_PUBLIC_SDK_BASE_URL` that is explicitly a gateway for appbase backend IAM or the
  dependency override `PORTAL_PUBLIC_APPBASE_BACKEND_API_BASE_URL`. It must not fall back to
  `VITE_CLAWROUTER_BACKEND_API_BASE_URL`, `BACKEND_API_PREFIX`, or `/backend/v3/api` merely because
  the product backend surface is configured.
- Method-level ownership is allowed only when it is explicit. For example, appbase owns
  `GET /backend/v3/api/iam/api_keys` and
  `POST /backend/v3/api/iam/api_keys/{apiKeyId}/revoke`, while Claw Router owns
  `POST /backend/v3/api/iam/api_keys` and
  `DELETE /backend/v3/api/iam/api_keys/{apiKeyId}` because the Rust product handlers create and
  delete gateway API key secrets, hashes, audit facts, idempotency records, and product read-model
  entries through `AdminUserStore`.
- Component specs that declare `dependencyApiSurface` must mirror the root dependency API surface
  runtime mode, same-origin flag, required base URL env, public base URL env, and fallback policy.
  Feature packages must not invent per-package fallbacks.

Required local checks:

```powershell
python -m unittest tests.test_dependency_api_surface_standard
pnpm.cmd exec tsx admin-organization-runtime.test.ts
pnpm.cmd exec tsx admin-user-runtime.test.ts
pnpm.cmd exec tsx vite-config-runtime.test.ts
```

