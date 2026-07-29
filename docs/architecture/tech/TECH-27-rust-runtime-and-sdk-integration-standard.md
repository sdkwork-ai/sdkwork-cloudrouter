# Claw Router Rust Runtime And SDK Integration

Status: active  
Owner: SDKWork maintainers  
Updated: 2026-07-29  
Specs: `RUST_CODE_SPEC.md`, `API_SPEC.md`, `SDK_SPEC.md`, `APP_SDK_INTEGRATION_SPEC.md`, `DATABASE_SPEC.md`

## 1. Purpose

This document narrows the SDKWork standards for Claw Router's Rust runtime,
three HTTP API surfaces, generated SDK families, and PC consumers. It does not
approve a release or restate the global standards.

## 2. Surface Ownership

| Surface | Runtime path | Route authority | Generated SDK |
| --- | --- | --- | --- |
| App/product | `/app/v3/api/**` | `crates/sdkwork-routes-clawrouter-app-api` | `@sdkwork/clawrouter-app-sdk` |
| Backend/admin | `/backend/v3/api/**` | `crates/sdkwork-routes-clawrouter-backend-api` | `@sdkwork/clawrouter-backend-sdk` |
| OpenAI compatible | `/v1/**` | Open API route crates and assembly | `@sdkwork/clawrouter-open-sdk` |

URL prefixes do not select SDK ownership by themselves; the authored API
surface does. PC product modules call the App SDK, management modules call the
Backend SDK, and public gateway consumers call the Open SDK. Raw `fetch`,
Axios, manual authorization headers, local generated-code forks, and handwritten
compatibility clients are forbidden for these business surfaces.

## 3. Contract And Generation Chain

```text
docs/schema-registry/frontend-field-contracts.yaml
  -> generated/api/api-contract-manifest.json
  -> generated/openapi/clawrouter-app-openapi.json
  -> generated/openapi/clawrouter-backend-openapi.json
  -> generated Open SDK input
  -> sdks/clawrouter-*-sdk/*-typescript
```

Generated output is never hand-edited. An incorrect method, operation ID,
query name, DTO, envelope, or `writeOnly` flag is fixed in the contract source
or generator and then regenerated. PC packages import generated clients from
the package root through package-owned SDK boundaries.

HTTP list queries use snake_case (`page`, `page_size`); TypeScript SDK fields use
camelCase (`page`, `pageSize`). Responses use the standard SDKWork envelope and
page metadata. Errors use RFC 9457 Problem Details.

## 4. Rust Runtime Composition

- `sdkwork-clawrouter-edge-runtime` owns OpenAI-compatible invocation assembly,
  streaming dispatch, and runtime coordination.
- `sdkwork-routes-clawrouter-app-api` and
  `sdkwork-routes-clawrouter-backend-api` own route composition.
- `sdkwork-clawrouter-standalone-gateway` and
  `sdkwork-clawrouter-admin-gateway` own listeners.
- `sdkwork-clawrouter-router-service` owns application/domain ports and
  remaining in-repository PostgreSQL adapters.
- Provider adapter contract, registry, HTTP, and implementation crates own
  provider-specific protocol translation.

Handlers decode and validate input, resolve typed request context, call a use
case or port, and map output. They do not execute SQL, resolve secrets from raw
headers, or call provider transports directly.

## 5. Upstream Routing Integration

The runtime control plane uses `UpstreamSupplier`, `UpstreamAccount`, and
`UpstreamAccountGroup`. `PricingCatalog` and `UpstreamAccountRouteCatalog`
expose model, pricing, entitlement, and route data without SQL types.

`RefreshableSqlPricingCatalog` publishes an immutable
`ArcSwap<SqlPricingCatalogSnapshot>`. Route candidates are shared as
`Arc<[UpstreamAccountRoute]>`; the request path does not deep-copy the complete
catalog. Refresh creates a new consistent PostgreSQL snapshot and swaps the
pointer after successful load. In-flight requests retain their old snapshot.

The planner performs supplier/group/entitlement resource intersection and then
filters lifecycle, protocol, region, auth, credential, quota, health, and
circuit state. Strategies use one candidate contract and provider dispatch is
behind adapter ports.

## 6. Persistence And Accounting

PostgreSQL is the only authoritative server database. The server runtime,
standalone gateway, containers, and cloud deployments reject SQLite instead of
falling back. The router-service has no server SQLite repository directory or
schema mirror.

Catalog loading uses a read-only repeatable-read PostgreSQL transaction so a
published snapshot represents one database view. Transactional commands use
PostgreSQL uniqueness, locking, idempotency, and tenant/organization scope.

Successful provider invocations record `ai_request_trace` and `ai_usage`
through `PostgresGatewayUsageRecorder` in one transaction. Required provider
usage is not replaced with synthetic zero values. Streaming usage is finalized
from the terminal provider event and failure to record required usage fails the
audited completion boundary.

Usage settlement is an asynchronous worker/application boundary. It reads
bounded ordered batches, uses `FOR UPDATE SKIP LOCKED`, groups mutations in a
deterministic account order, and retries only PostgreSQL serialization or
deadlock failures within a capped attempt/backoff policy. Ledger and settlement
identities are idempotent.

## 7. Credential And Egress Integration

- Supported upstream credential policies are `api_key`, `bearer_token`, and
  `custom`; OAuth is not exposed before its full lifecycle exists.
- Create and rotate inputs are write-only. Read and create responses contain
  masked metadata only.
- Upstream credential storage uses AES-256-GCM, authenticated context,
  HKDF-derived keys, key identifiers, fingerprints, and keyring rotation.
- Provider targets are validated before credentials are attached. Production
  upstream transport is HTTPS-only and rejects forbidden local/private targets.
- Provider errors are normalized and redacted before they cross API, log, or
  trace boundaries.

## 8. Bounded Runtime Behavior

Request bodies, non-stream response bodies, query pages, retry batches,
settlement batches, and concurrent work have explicit limits. Streaming paths
apply backpressure and terminal cleanup rather than buffering complete bodies.
Rust code does not hold mutex/RwLock guards across `.await`.

Database pools configure bounded connection counts and acquisition/runtime
timeouts. High-cardinality provider data is excluded from metric labels. Route
and pricing snapshots use shared immutable memory rather than per-request
catalog allocation.

Payment provider callbacks are signed public ingress and must not use
`app_request_subject_boundary`. `PaymentWebhookConfig` requires
`SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET`, enforces
`SDKWORK_CLAW_PAYMENT_WEBHOOK_MAX_CLOCK_SKEW_SECONDS`, and fails closed because
unsigned payment callbacks are forbidden. Payment callback amounts must be
parsed as exact decimal values; binary floating-point comparison is forbidden
and sub-cent callback precision must be rejected.

## 9. Deployment Profiles

Both `standalone` and `cloud` server profiles use PostgreSQL. Redis is injected
only for features whose coordination contract requires it. A desktop host may
own a separate, explicitly declared client-local SQLite feature, but that data
is never server authorization, billing, entitlement, audit, or routing truth.

## 10. Verification

```text
cargo check -p sdkwork-routes-clawrouter-app-api
cargo check -p sdkwork-routes-clawrouter-backend-api
cargo check -p sdkwork-clawrouter-edge-runtime
python -B -m tools.clawrouter_sdk_guardian
python -B -m tools.clawrouter_skill_guardian
python -B -m tools.schema_quality_gate
node ../sdkwork-specs/tools/check-pagination.mjs --workspace .
```

Production readiness additionally requires PostgreSQL integration,
multi-replica, load/soak, memory, streaming cancellation, backup/restore,
failover, and security evidence from a clean release candidate.
