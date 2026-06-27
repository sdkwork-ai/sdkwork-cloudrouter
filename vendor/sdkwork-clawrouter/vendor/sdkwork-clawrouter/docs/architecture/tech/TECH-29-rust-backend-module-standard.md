> Migrated from `docs/29-rust-backend-module-standard.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Rust Backend Module Standard

## 1. Goal

`sdkwork-clawrouter` follows a Rust-first backend architecture. The codebase must be ready for implementation work without drifting into handwritten HTTP clients, UI-driven data shortcuts, or unclear backend ownership.

The runtime is split into small Rust packages with explicit boundaries:

- `sdkwork-claw-contract`: API prefixes, SDK client names, generated contract metadata, and route constants.
- `sdkwork-claw-config`: deployment mode, `DatabaseConfig`, and environment-driven runtime configuration.
- `sdkwork-claw-core`: shared value objects, health model, application errors, and neutral domain primitives.
- `sdkwork-claw-security`: redaction, sensitive headers, auth-safe logging helpers, and future permission primitives.
- `sdkwork-claw-http`: common Axum router bootstrap, API Key auth input parsing, standard health/readiness routes, request id, timeout, CORS, security headers, and HTTP boundary helpers.
- `sdkwork-claw-observability`: tracing initialization and telemetry bootstrap.
- `sdkwork-clawrouter-cloud-gateway`: `/v1` OpenAI-compatible gateway and streaming provider relay.
- `sdkwork-clawrouter-app-api-server`: `/app/v3/api` app/console/public API surface.
- `sdkwork-clawrouter-admin-api-server`: `/backend/v3/api` admin/backend API surface.
- `sdkwork-clawrouter-router-service`: product composition and deployable runtime assembly.

Product implementation starts in `sdkwork-clawrouter-router-service` and must keep `domain`, `application`, `ports`, and `infrastructure` as first-class submodules. Model catalog, provider route, pricing plan, channel group, and billing meter behavior belongs behind these boundaries before HTTP handlers replace manifest 501 responses.

## 2. Module Shape

Business modules must use Hexagonal architecture. Each module is organized by responsibility, not by framework convenience:

```text
api             HTTP handlers, request/response DTOs, OpenAPI annotations
application     use cases, transactions, orchestration, idempotency
domain          pure business rules, typed identifiers, enums, value objects
ports           repository/provider/cache/payment abstractions
adapters        provider SDK adapters, composed-module SDK adapters, queue adapters
infrastructure  sqlx repositories, cache clients, object storage, secret stores
bootstrap       route registration, dependency wiring, feature flags
```

Rules:

- `lib.rs` is a thin public entrypoint only. It declares modules, re-exports stable public types/functions, and must stay below 80 non-empty lines.
- Implementation belongs in submodules. Do not put handlers, use cases, provider adapters, repository implementations, security logic, or DTO mapping all in one file.
- New code should prefer focused files that fit one responsibility. Split by behavior when a file starts mixing parsing, validation, persistence, provider calls, and response mapping.
- `domain` must not depend on Axum, sqlx, HTTP clients, Redis, or generated SDK clients.
- `application` may depend on `domain` and `ports`; it must not parse HTTP requests.
- `api` may depend on `application`; it must not execute SQL directly.
- `infrastructure` implements `ports`; it must not leak persistence DTOs into `api`.
- `bootstrap` wires dependencies and routes; it must not contain business rules.

Recommended submodules for each feature:

```text
mod.rs or lib.rs      exports only, no business logic
api/*.rs             one route group per file
application/*.rs     one use case per file when behavior grows
domain/*.rs          identifiers, enums, invariants, value objects
ports/*.rs           small traits grouped by capability
adapters/*.rs        one upstream/provider adapter per file
infrastructure/*.rs  one repository/cache/client per file
bootstrap/*.rs       dependency assembly and router registration
```

The first product slice uses the same shape:

```text
domain          ModelVendor, BillingMeter, model catalog, prices, channel groups, money values
application     pricing resolver and future catalog/admin use cases
ports           pricing catalog and future repository/provider traits
infrastructure  in-memory test adapters first, infrastructure/sql query and row boundaries, sqlx/cache adapters later
api             SDKWork API envelope handlers that call application services only
```

The product query layer exposes `ModelCatalogQueryService` on top of the `PricingCatalog` port. Model list views must include `PriceAvailability`: priced models return decimal string customer price, official reference price, lowest upstream cost, and gross margin; unpriced models return an explicit unavailable reason. Missing official reference price, missing provider route, or missing group plan must never be converted into a default price. The lowest upstream cost provider is the basis for catalog margin display.

`AdminModelRoute` owns the `/backend/v3/api/model/list` HTTP adapter shape. It must call `ModelCatalogQueryService`, return the standard SDKWork API envelope with `code=2000` on success, and keep HTTP handlers free of pricing math, provider selection rules, SQL, or fake in-memory production data.

`OpenAIModelsRoute` owns the `/v1/models` runtime adapter shape. It must be mounted through the `sdkwork-clawrouter-cloud-gateway` runtime module, authenticate API Key credentials through `ApiKeySecurityConfig` plus `HmacSha256ApiKeySecretHasher`, load catalog data from a real `PricingCatalog` snapshot, and return an OpenAI-compatible model list envelope rather than the SDKWork API envelope. `GatewayRouterError` is the gateway bootstrap error boundary for database loader failures and missing API key pepper configuration; errors must not expose database URLs or API key secrets.

`OpenAIChatCompletionsRoute` owns the `/v1/chat/completions` runtime boundary. It must parse the OpenAI-compatible request JSON, authenticate API Key credentials, validate model routing and input-token pricing through `PricingCatalog`, select the configured provider route, and verify `LlmInputToken` pricing before provider execution. Non-stream requests delegate through `ChatCompletionRelay`; stream requests delegate through `ChatCompletionStreamRelay` and return a `ChatCompletionStreamRelayResponse` with upstream `text/event-stream`/SSE body pass-through. When the matching relay is absent, the honest responses are `provider_relay_not_configured` for non-stream requests and `streaming_relay_not_configured` for stream requests. It must not return fake chat choices, fake usage, mock upstream provider data, buffered fake stream chunks, or the SDKWork app/backend API envelope.

Non-stream `OpenAIChatCompletionsRoute` provider success must build a `GatewayUsageRecordCommand` only from the upstream OpenAI `usage` object and persist it through the `GatewayUsageRecorder` port. `SqliteGatewayUsageRecorder` and `PostgresGatewayUsageRecorder` are the standard SQL adapters: they upsert `ai_request_trace` for request audit facts and `ai_usage_fact` for billable usage facts under the tenant, organization, user, API key, model, provider route, price snapshot, and request id. A 2xx upstream response that omits required usage fields must return `provider_usage_record_failed` instead of recording zero-token fake usage. The streaming usage boundary is first-class and audited: `OpenAiCompatibleChatCompletionStreamRelay` and `SecretRefOpenAiCompatibleChatCompletionStreamRelay` must force upstream `stream_options.include_usage=true` while preserving any other `stream_options` fields, and `OpenAIChatCompletionsRoute` must wrap successful SSE bodies with `StreamingUsageRecordingBody` so the provider usage event is parsed and persisted through `GatewayUsageRecorder` before the response body completes. If the final SSE stream omits required usage fields or the usage record cannot be built or written, the stream body must fail instead of silently returning an unbillable success.

Usage settlement is a worker/application boundary, not part of the synchronous gateway provider response path. `UsageSettlementWorker` owns the background worker orchestration and is configured by `UsageSettlementWorkerConfig`; it must call `UsageSettlementStore` with `UsageSettlementCommand` and return `UsageSettlementOutcome` rather than duplicating SQL or ledger rules. Gateway runtime may start the settlement background worker only after schema readiness confirms `ai_usage_fact`, `commerce_usage_settlement`, `commerce_account`, `commerce_account_ledger_entry`, `settlement_status`, `settlement_id`, and pricing snapshot columns exist. The legacy `plus_account_history` alias must not be used for new settlement writes; `commerce_account_ledger_entry` is the required ledger table. `SDKWORK_CLAW_USAGE_SETTLEMENT_WORKER_ENABLED`, `SDKWORK_CLAW_USAGE_SETTLEMENT_BATCH_SIZE`, and `SDKWORK_CLAW_USAGE_SETTLEMENT_INTERVAL_MILLIS` are the deployment controls for the worker loop. `SqliteUsageSettlementStore` and `PostgresUsageSettlementStore` are the standard adapters: they settle pending or retryable failed `ai_usage_fact.settlement_status` rows, aggregate usage by tenant, organization, user, and currency before converting `customer_charge_amount` decimal strings into integer points, upsert `commerce_usage_settlement`, debit `commerce_account.available_amount` for the points account through an atomic balance guard, insert the final `commerce_account_ledger_entry` ledger entry, and write the resulting settlement id back to `ai_usage_fact`. Amounts below the minimum billable point must remain pending instead of being rounded up per row. The bridge table is idempotent by `usage_fact_id`; the ledger is idempotent by deterministic settlement transaction id. PostgreSQL settlement selection must use `FOR UPDATE SKIP LOCKED` so parallel workers do not double-process rows. Insufficient balances must mark `commerce_usage_settlement.failure_code=INSUFFICIENT_POINTS` and leave the account balance unchanged so the same usage fact can be retried after recharge.

`OpenAIResponsesRoute` owns the `/v1/responses` runtime boundary. It must parse the OpenAI-compatible request JSON, authenticate API Key credentials, validate model availability, require responses capability, select the configured provider route, and verify `LlmInputToken` pricing through `PricingCatalog` before provider execution. Non-stream requests delegate through the `ResponsesRelay` product port with a `ResponsesRelayRequest` carrying the resolved API Key group, pricing plan, gateway model, provider code, provider model, `provider_base_url`, `provider_secret_ref`, and original OpenAI JSON body. When no responses relay is configured, the honest response is an OpenAI-compatible `responses_relay_not_configured` 501 error. Streaming requests must still return `streaming_relay_not_configured` until an audited SSE relay exists. It must not return fake response objects, fake output items, fake usage, mock upstream provider data, buffered fake stream chunks, or the SDKWork app/backend API envelope.

The non-stream Responses upstream adapters are `OpenAiCompatibleResponsesRelay` and `SecretRefOpenAiCompatibleResponsesRelay` under `sdkwork-clawrouter-router-service/src/infrastructure/provider`. They use `UpstreamProviderEndpoint`, an absolute http or https provider URL, and `hyper` with the workspace `hyper-rustls` TLS connector to post the original OpenAI-compatible JSON body to the provider's `/v1/responses`, rewrite `model` to the selected provider model, and send the upstream bearer token only to the provider endpoint. Provider base URLs may be a host/context root such as `https://proxy.example/openai` or an OpenAI-compatible root such as `https://api.openai.com/v1`; the relay must normalize the /v1 prefix and never send /v1/v1/... . A provider response timeout is required around the upstream request future so a slow provider cannot hold gateway tasks indefinitely. The resolved route must carry `ai_channel.timeout_ms` as request-context provider timeout and `ai_channel.retry_policy` as request-context provider retry policy; adapters apply those per request and fall back to the audited default only when the channel fields are null. SQL snapshot loading must reject non-positive configured timeout values and invalid retry policy JSON instead of silently downgrading them. `ProviderRetryPolicy` is strict JSON with `max_attempts`, `retryable_status_codes`, and optional `backoff_ms`, and unknown fields are rejected. The non-stream JSON relay applies the platform transient provider retry standard only to retryable upstream status codes `429`, `500`, `502`, `503`, and `504` by default, or to the configured strict retry policy when present; it must not retry provider authentication, authorization, invalid JSON, body timeout, or post-success usage/billing failures. `SecretRefOpenAiCompatibleResponsesRelay` resolves `provider_secret_ref` at relay time and uses request-context `provider_base_url`; plaintext provider secrets must not appear in catalog snapshots, database rows, generated SDKs, logs, errors, traces, or health output.

`OpenAIEmbeddingsRoute` owns the `/v1/embeddings` runtime boundary. It must parse the OpenAI-compatible request JSON, authenticate API Key credentials, validate model availability, require embedding capability, select the configured provider route, and verify `EmbeddingInputToken` pricing through `PricingCatalog` before provider execution. Requests delegate through the `EmbeddingsRelay` product port with an `EmbeddingsRelayRequest` carrying the resolved API Key group, pricing plan, gateway model, provider code, provider model, `provider_base_url`, `provider_secret_ref`, and original OpenAI JSON body. When no embeddings relay is configured, the honest response is an OpenAI-compatible `embedding_relay_not_configured` 501 error. It must not return fake vectors, fake usage, mock upstream provider data, or the SDKWork app/backend API envelope.

The Embeddings upstream adapters are `OpenAiCompatibleEmbeddingsRelay` and `SecretRefOpenAiCompatibleEmbeddingsRelay` under `sdkwork-clawrouter-router-service/src/infrastructure/provider`. They use `UpstreamProviderEndpoint`, an absolute http or https provider URL, and `hyper` with the workspace `hyper-rustls` TLS connector to post the original OpenAI-compatible JSON body to the provider's `/v1/embeddings`, rewrite `model` to the selected provider model, and send the upstream bearer token only to the provider endpoint. Provider base URLs may be a host/context root such as `https://proxy.example/openai` or an OpenAI-compatible root such as `https://api.openai.com/v1`; the relay must normalize the /v1 prefix and never send /v1/v1/... . A provider response timeout is required around the upstream request future so a slow provider cannot hold gateway tasks indefinitely. The resolved route must carry `ai_channel.timeout_ms` as request-context provider timeout and `ai_channel.retry_policy` as request-context provider retry policy; adapters apply those per request and fall back to the audited default only when the channel fields are null. SQL snapshot loading must reject non-positive configured timeout values and invalid retry policy JSON instead of silently downgrading them. `ProviderRetryPolicy` is strict JSON with `max_attempts`, `retryable_status_codes`, and optional `backoff_ms`, and unknown fields are rejected. The non-stream JSON relay applies the platform transient provider retry standard only to retryable upstream status codes `429`, `500`, `502`, `503`, and `504` by default, or to the configured strict retry policy when present; it must not retry provider authentication, authorization, invalid JSON, body timeout, or post-success usage/billing failures. `SecretRefOpenAiCompatibleEmbeddingsRelay` resolves `provider_secret_ref` at relay time and uses request-context `provider_base_url`; plaintext provider secrets must not appear in catalog snapshots, database rows, generated SDKs, logs, errors, traces, or health output.

Provider relay is a product port, not handler code. `ChatCompletionRelay` and `ChatCompletionStreamRelay` accept a `ChatCompletionRelayRequest` only after authentication, model routing, and pricing validation have succeeded. The request carries the resolved API Key group, pricing plan, gateway model, provider code, provider model, `provider_base_url`, `provider_secret_ref`, `ai_channel.timeout_ms` as request-context provider timeout, `ai_channel.retry_policy` as request-context provider retry policy, and original OpenAI JSON body; HTTP handlers must not open upstream HTTP clients directly, choose ad hoc provider URLs, synthesize fake stream chunks, or bypass the pricing path.

Provider credential resolution is also a port boundary. `ProviderSecretResolver` resolves `provider_secret_ref` into runtime bearer credentials outside catalog snapshots, SQL rows, HTTP DTOs, and logs. Product catalog snapshots may carry only `secret_ref`, never provider secret plaintext. `SecretRefOpenAiCompatibleChatCompletionRelay` and `SecretRefOpenAiCompatibleChatCompletionStreamRelay` are the standard adapters for request-context provider endpoints; they resolve the bearer token at relay time and then delegate through the same OpenAI-compatible HTTP request path.

Environment-backed provider secret reference wiring is owned by `ProviderSecretMapConfig` in `sdkwork-claw-config`. It loads `SDKWORK_CLAW_PROVIDER_SECRET_MAP_JSON` as a JSON object mapping `secret_ref` to bearer token for local, desktop, Docker, and controlled deployment injection. `ProviderSecretMapResolver` lives under `sdkwork-clawrouter-router-service/src/infrastructure/provider`, adapts that config into `ProviderSecretResolver`, trims entries, rejects blank values, and redacts bearer tokens from `Debug`, errors, logs, docs examples, health output, and generated SDK payloads.

Deployment-time static provider relay wiring is owned by `ProviderRelayConfig` in `sdkwork-claw-config`. It loads `SDKWORK_CLAW_OPENAI_RELAY_BASE_URL` and `SDKWORK_CLAW_OPENAI_RELAY_BEARER_TOKEN` as an all-or-none pair: unset means `/v1/chat/completions` keeps the honest `provider_relay_not_configured` and `streaming_relay_not_configured` responses, partial or blank configuration is a startup configuration error, and a complete pair wires the OpenAI-compatible non-stream and stream upstream adapters only when `ProviderSecretMapConfig` is absent. The bearer token is a runtime secret and must be redacted from `Debug`, errors, logs, docs examples, health output, and generated SDK payloads.

The first upstream adapters are `OpenAiCompatibleChatCompletionRelay`, `SecretRefOpenAiCompatibleChatCompletionRelay`, `OpenAiCompatibleChatCompletionStreamRelay`, and `SecretRefOpenAiCompatibleChatCompletionStreamRelay` under `sdkwork-clawrouter-router-service/src/infrastructure/provider`. They use `UpstreamProviderEndpoint`, an absolute http or https provider URL, and `hyper` with the workspace `hyper-rustls` TLS connector for native Rust HTTP calls to OpenAI-compatible `/v1/chat/completions`, rewrite the request `model` to the resolved provider model, and send the upstream bearer token only to the provider endpoint. Provider base URLs may be a host/context root such as `https://proxy.example/openai` or an OpenAI-compatible root such as `https://api.openai.com/v1`; the relay must normalize the /v1 prefix and never send /v1/v1/... . A provider response timeout is required around the upstream request future so a slow provider cannot hold gateway tasks indefinitely. The resolved route must carry `ai_channel.timeout_ms` as request-context provider timeout and `ai_channel.retry_policy` as request-context provider retry policy; adapters apply those per request and fall back to the audited default only when the channel fields are null. SQL snapshot loading must reject non-positive configured timeout values and invalid retry policy JSON instead of silently downgrading them. `ProviderRetryPolicy` is strict JSON with `max_attempts`, `retryable_status_codes`, and optional `backoff_ms`, and unknown fields are rejected. The non-stream JSON relay applies the platform transient provider retry standard only to retryable upstream status codes `429`, `500`, `502`, `503`, and `504` by default, or to the configured strict retry policy when present; it must not retry provider authentication, authorization, invalid JSON, body timeout, or post-success usage/billing failures. Stream adapters pass the upstream SSE body through as `text/event-stream` instead of buffering or synthesizing chunks, and stream adapters must not retry retryable upstream status responses because replaying a partially-open provider stream can duplicate generation and billing. The same adapter supports local/internal `http` endpoints and production external `https` provider egress through the audited TLS connector. Provider credentials are deployment/runtime secrets; the database design continues to use secret references for provider-owned credentials, with no plaintext provider secret storage in business tables, catalog snapshots, logs, traces, or API responses.

Admin service wiring must keep two entrypoints separate: the default `router()` keeps manifest 501 responses until real infrastructure is wired, while `router_with_product_catalog(...)` accepts an explicit `PricingCatalog` implementation for integration tests or production bootstrap. Never mount `InMemoryPricingCatalog` into the default production router.

The production database boundary for product pricing starts under `infrastructure/sql`. It is split into `catalog`, `queries`, `rows`, `sqlite`, and `postgres` modules: `queries` owns the SQL text used by a future connection-pool adapter, `rows` owns conversion from database rows into domain objects, `catalog` assembles those rows into an immutable snapshot that implements the `PricingCatalog` port, the SQLite loader supports desktop/local deployment through `sqlx`, and the PostgreSQL loader supports server, Docker, and Kubernetes deployments through the same snapshot contract. SQL must use Schema Registry table names exactly, including `ai_model_vendor`, `ai_model`, `ai_model_pricing`, `ai_pricing_plan`, `iam_gateway_api_key`, `ai_channel_group`, `ai_channel`, `ai_channel_credential`, `ai_channel_resource`, and `ai_model_mapping_rule*`. Do not introduce synonyms such as `ai_pricing_group`, and keep the policy explicit as no ai_pricing_group. Row mappers must parse money and multipliers as decimal strings, map `ModelVendor` and `BillingMeter` through generated enums, and reject unknown price-side codes instead of silently falling back to a default price. Snapshot loading must use parameterless load queries that hydrate the immutable snapshot outside request handlers; request-path queries remain available for narrow administrative reads but must not become business-rule code.

Deployment database wiring is typed through `DatabaseConfig`. Runtime TOML is the primary database configuration source: desktop/local deployments may use SQLite URLs, while server, Docker, and Kubernetes deployments use structured PostgreSQL fields (`host`, `port`, `database`, `username`, and `password_file` or protected `password`). `SDKWORK_CLAW_DATABASE_URL` remains available only as an explicit private override. `SDKWORK_CLAW_DATABASE_MAX_CONNECTIONS` controls pool size and must be a positive integer. If no database configuration is available, app/admin services keep the manifest-driven 501 fallback instead of returning fake catalog data.

Service runtime wiring is typed through `RuntimeConfig`. `SDKWORK_CLAW_GATEWAY_BIND`, `SDKWORK_CLAW_APP_API_BIND`, and `SDKWORK_CLAW_ADMIN_API_BIND` are parsed in `sdkwork-claw-config`, must be a valid socket address, and default to `0.0.0.0:18080`, `0.0.0.0:18082`, and `0.0.0.0:18081` respectively. `SDKWORK_CLAW_DEPLOYMENT_MODE` is parsed once through the same config boundary; invalid deployment modes or blank bind addresses must fail startup instead of silently changing service identity or binding behavior.

Health and readiness output must expose database configuration only through `DatabaseHealth`. The response may show `configured`, database `engine`, and `maxConnections`; it must not expose database URLs, usernames, passwords, hosts, paths, query strings, or other connection-string details. `/healthz` and `/readyz` are operational identity endpoints, not secret inspection endpoints.

Request identity is also a shared HTTP boundary. `ApiKeyIdentity` is parsed only in `sdkwork-claw-http` `auth` from compatible inputs: `Authorization: Bearer`, `x-api-key`, `x-goog-api-key`, and query key. The temporary internal `x-sdkwork-api-key-id` context may carry the resolved API Key ID while the credential hash lookup adapter is being wired, but business handlers must not parse raw auth headers, query secrets, or handwritten token formats. Feature handlers receive parsed identity/context and decide only business behavior, for example returning an explicit unavailable customer price when no API Key context exists.

Trusted app/backend request subject context is owned by `sdkwork-claw-http` and projected into handlers as `TrustedRequestSubject`. Product handlers consume `TrustedRequestSubject` / `Option<TrustedRequestSubject>` extractors and must not parse tenant/user headers ad hoc. Browser/frontend code must not be treated as a trusted identity issuer and must not send `x-sdkwork-tenant-id`, `x-sdkwork-organization-id`, or `x-sdkwork-user-id`.

**Production default (sdkwork-web-framework):** IAM dual-token JWTs (`Authorization` + `Access-Token`) are resolved by `IamWebRequestContextResolver` into canonical `WebRequestContext`. `DomainContextInjector` projects `IamAppContext` and legacy `TrustedRequestSubject` from that context (`web_bridge.rs`). Route middleware may re-project subject extensions for SQL handlers that still depend on `TrustedRequestSubject`. See `docs/standard-alignment-audit.md` §1 and `WEB_FRAMEWORK_SPEC.md`.

**Legacy signed-subject boundary:** when web-framework is disabled or for service-to-service HMAC subjects, `trusted_request_subject_boundary` verifies `x-sdkwork-subject-*` headers with `TrustedSubjectConfig`, then injects internal `x-sdkwork-*` subject headers. Missing or malformed trusted subject context returns authentication error `4010` before mutating persistence. Default audit operator for app user actions is `operator_id = user_id` and `operator_type = 1`.

**Legacy app-session boundary:** when `SDKWORK_CLAW_WEB_FRAMEWORK_LEGACY=true`, browser requests may authenticate through claw app-session tokens verified by `app_request_subject_boundary` with `AppSessionConfig`. This path is for integration tests and explicit rollback only; production browser traffic must use IAM JWT via sdkwork-web-framework.

Production app/backend services that enable database-backed write routes must configure `SDKWORK_CLAW_TRUSTED_SUBJECT_SECRET` with at least 32 characters when signed-subject or app-session legacy boundaries are active. `SDKWORK_CLAW_TRUSTED_SUBJECT_MAX_CLOCK_SKEW_SECONDS` defaults to 300 seconds.

App session issuance is a separate audited boundary. `POST /app/v3/api/auth/sessions` may exchange only an already verified signed trusted subject into a browser app session; it must be mounted behind `trusted_request_subject_boundary`, must reject direct `x-sdkwork-*` subject headers, must sign with `AppSessionConfig`, and must write an `iam_user_login_event` record containing the tenant, organization, user, request id, and a one-way `session_id_hash`. The response may return the app session token once to the authenticated caller, but audit stores, logs, and errors must never contain the raw token. Frontend calls to this endpoint must go through the generated `@sdkwork/clawrouter-app-sdk` client.

Payment callback signing is a provider-to-server boundary, not a browser or app-session boundary. `PaymentWebhookConfig` must load `SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET` with at least 32 characters before database-backed payment callback routes are mounted. `SDKWORK_CLAW_PAYMENT_WEBHOOK_MAX_CLOCK_SKEW_SECONDS` defaults to 600 seconds and is capped at 3600 seconds. Callback handlers verify HMAC-SHA256 signatures over `timestamp + "." + body`, require a valid callback timestamp, and reject missing, malformed, stale, or mismatched signatures; unsigned payment callbacks are forbidden. The payment callback router must not use app_request_subject_boundary because WeChat, Alipay, Stripe, and other external providers cannot present local browser session tokens. The route must still enforce provider allow-listing, bounded request bodies, idempotent `plus_payment_webhook_event` processing, nonce replay rejection, amount/provider validation, and one-time recharge fulfillment.

Payment callback amounts must be parsed as exact decimal values at the API boundary and compared against persisted payment amounts through the shared decimal value type; binary floating-point comparison is forbidden in payment fulfillment. Provider cent fields such as WeChat `total_fee` must be converted into a canonical major-unit decimal string, and sub-cent callback precision must be rejected instead of silently rounded.

Recharge amounts must use the same exact decimal contract as payment callbacks. API requests may accept JSON numeric or string values only at the boundary, but the validated command, response, frontend service contract, and persistence contract must carry canonical decimal strings. binary floating-point arithmetic is forbidden for recharge amount validation, package matching, order/payment/vip recharge writes, frontend submit payloads, and point conversion. sub-cent recharge precision must be rejected instead of rounded.

API Key credential authentication must use `ApiKeySecurityConfig` to load `SDKWORK_CLAW_API_KEY_PEPPER` and `ApiKeySecretHasher` as the application boundary for HMAC plus pepper hashing. The production implementation is `HmacSha256ApiKeySecretHasher`, and it must resolve credentials through `iam_gateway_api_key.key_hash`. There is no plaintext API key storage in domain models, SQL snapshots, logs, errors, tests, or production adapters. If the pepper is absent, production routes may accept only an already-resolved context or return an explicit unauthenticated response; they must not ship an ad hoc hash, reversible encoding, or direct plaintext lookup.

API Key management creation is a security-sensitive write path. Production `/app/v3/api/router/api_keys` creation must be wired with a real `GatewayApiKeyCommandStore`, `ApiKeySecretHasher`, and `GatewayApiKeyManagementReadStore`; it must not create keys through in-memory command stores, static catalog mutation, request-local overlays, or mock persistence. SQLite and PostgreSQL app API bootstraps must validate the SQL loader at startup and inject that loader as the refreshable read store, so list responses reflect the database state instead of a process-local overlay. The only acceptable in-memory stores for API Key creation are test-owned fakes inside test modules.

API Key creation returns the raw secret only once in the POST response. Subsequent list/read responses must use `key_display_masked`, never `key_hash`, raw key material, peppers, bearer tokens, or provider secrets. The route may build the create response from the committed command result so the caller receives the one-time secret even if a later read-model refresh would fail, but normal GET list responses must come from the injected read store.

API Key creation must be contract-idempotent. `POST /app/v3/api/router/api_keys` requires the `Idempotency-Key` header and accepts `X-Request-Id` for audit correlation; both headers are declared in the OpenAPI contract and generated app SDK method signature. The command store must persist `iam_gateway_api_key.tenant_id`, `iam_gateway_api_key.organization_id`, `iam_gateway_api_key.user_id`, and `iam_gateway_api_key.idempotency_key` as `NOT NULL`, enforce the unique key on `(tenant_id, idempotency_key)`, and persist `ops_audit_log.tenant_id`, `ops_audit_log.organization_id`, `ops_audit_log.operator_id`, `ops_audit_log.operator_type`, and `ops_audit_log.request_id`. Duplicate idempotency keys inside the same tenant return HTTP 409 / SDKWork API code `4090` and must not reveal a second raw secret; the same client idempotency key in a different tenant is a separate idempotency scope.

## 3. API Surface Boundaries

The three external surfaces stay separate:

- app and console surface: `/app/v3/api`
- admin/backend surface: `/backend/v3/api`
- OpenAI-compatible runtime surface: `/v1`

`/app/v3/api` and `/backend/v3/api` must remain aligned with the generated SDKs. Portal integration uses `@sdkwork/clawrouter-app-sdk` and `@sdkwork/clawrouter-backend-sdk`. Rust app/backend business calls must use generated SDK packages when those SDKs exist; if a generated SDK method is missing, close the OpenAPI contract and regenerate.

`/v1` runtime routes are native gateway routes and must not return the SDKWork app/backend API envelope.

Before a business use case is implemented, app/admin services must still expose a manifest-driven contract route boundary. A declared operation from `generated/api/api-contract-manifest.json` returns a standard SDKWork 501 envelope with operation, API surface, method, request path, and contract path. Unknown routes remain 404. This keeps generated SDK paths callable during implementation while making unfinished behavior explicit.

Policy keyword: no fake success. Do not return fake success, mock data, or temporary positive responses for unfinished API operations. A route moves from 501 to a real response only after its domain model, application use case, authorization, idempotency or audit requirements, persistence ownership, and tests are in place.

## 4. Performance Standard

The backend defaults are:

- `axum` for HTTP routing.
- `tokio` multi-thread runtime for async execution.
- `tower` and `tower-http` for middleware composition.
- `sqlx` connection pool for database adapters and dedicated pools for upstream clients.
- `hyper` for native OpenAI-compatible upstream provider relay adapters.
- streaming for `/v1` provider relay and SSE paths.
- backpressure on upstream calls, queue workers, and billing writers.
- timeout at request, provider, database, and background job boundaries.
- request id propagation through logs, audit log, and upstream calls.
- tracing spans on handlers, use cases, provider relay, and persistence calls.

Blocking filesystem, crypto, compression, or CPU-heavy work must be isolated from async executor hot paths.

## 5. Security Standard

Security is a package-level standard, not a page-level patch:

- `sdkwork-claw-security` owns redaction and sensitive headers.
- `sdkwork-claw-http` applies security headers and CORS policy at the service boundary.
- authorization must be checked before application use cases mutate data.
- Idempotency is required for payment, recharge, coupon, order, and API key creation actions.
- Audit log is required for admin writes and security-sensitive account changes.
- rate limit must exist at gateway, API key, model, IP, and user/account dimensions.
- Secrets, API keys, access tokens, cookies, and provider credentials must never be logged.

## 6. Implementation Sequence

Implementation proceeds in this order:

1. Keep contract manifests and generated SDKs current.
2. Keep the manifest-driven contract route active so declared app/backend operations return 501 until implemented.
3. Add module `domain` and `application` types before handlers.
4. Add `ports` traits and in-memory tests before sqlx repositories.
5. Add `api` handlers only after use cases are testable.
6. Add `infrastructure` adapters behind ports.
7. Wire modules through `bootstrap`.
8. Add OpenAPI and regenerate SDKs.
9. Run `python -B -m tools.schema_quality_gate`, `pnpm format:rust:check`, and `cargo test`.

Database schema changes are not part of this standard step. Any table, column, index, migration, or embedded DB change requires explicit user confirmation before editing.

