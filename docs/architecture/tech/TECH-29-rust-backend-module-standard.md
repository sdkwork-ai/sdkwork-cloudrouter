# Claw Router Rust Backend Module Standard

Status: active  
Owner: SDKWork maintainers  
Updated: 2026-07-29  
Specs: `RUST_CODE_SPEC.md`, `CODE_STYLE_SPEC.md`, `NAMING_SPEC.md`, `DATABASE_SPEC.md`, `API_SPEC.md`

## 1. Goal

Claw Router keeps route, application, domain, port, provider, persistence, and
runtime composition responsibilities explicit. This local standard records
repository-specific module ownership; global SDKWork specs remain normative.

## 2. Crate Responsibilities

| Module | Responsibility |
| --- | --- |
| `sdkwork-claw-contract` | Stable contract metadata and shared values |
| `sdkwork-claw-config` | Typed runtime, database, security, and provider configuration |
| `sdkwork-claw-http` | Shared HTTP/framework boundaries and outbound transport helpers |
| `sdkwork-claw-security` | Redaction, credential-safe logging, and egress policy |
| `sdkwork-claw-observability` | Tracing and telemetry bootstrap |
| `sdkwork-clawrouter-edge-runtime` | Invocation runtime composition and OpenAI-compatible dispatch |
| `sdkwork-routes-clawrouter-app-api` | App API route composition |
| `sdkwork-routes-clawrouter-backend-api` | Backend API route composition |
| `sdkwork-clawrouter-router-service` | Domain, application ports/use cases, and remaining adapters |
| `sdkwork-clawrouter-*-repository-sqlx` | Capability-owned PostgreSQL repositories |

Runnable listeners are gateways, not retired `api-server` crates.

## 3. Module Shape

```text
api             HTTP decoding, validation, response mapping
application     use cases, orchestration, idempotency
domain          pure invariants and value objects
ports           repository, catalog, provider, cache, and accounting contracts
infrastructure  PostgreSQL, Redis, crypto, provider, and external adapters
bootstrap       dependency construction and route assembly
```

- `lib.rs` is a thin orchestration entrypoint. The architecture guardian uses
  120 non-empty lines as a drift alarm, not permission to place business logic
  there.
- Domain modules do not depend on Axum, SQLx, Redis, or generated SDKs.
- Application modules depend on domain and ports, not HTTP request types.
- API modules do not execute SQL or call provider transports.
- Infrastructure implements ports and does not leak SQL rows into API DTOs.
- Provider calls and generated dependency SDK calls remain behind application
  ports/adapters.
- Items are private by default. Public exports are stable integration surfaces;
  public error variants do not expose private payload types.

## 4. Upstream Domain Boundary

The only management aggregates are `UpstreamSupplier`, `UpstreamAccount`, and
`UpstreamAccountGroup`. The domain does not use provider/site/channel/pool or
duplicate integration aggregates as aliases.

`UpstreamAccountRouteCatalog` extends pricing lookup with
`shared_upstream_account_routes() -> Arc<[UpstreamAccountRoute]>`. The SQL
catalog publishes immutable snapshots through `ArcSwap`. Candidate selection
implements failover, weighted, round-robin, least-latency, and least-cost
strategies over one candidate type. Adding a strategy or provider adapter is a
registry/trait extension, not a supplier-specific core-table branch.

Routing weight, account contract cost, group cost multiplier, group sale
multiplier, and member cost override are independent values. Resource
eligibility is supplier/group/entitlement intersection.

## 5. PostgreSQL Persistence Boundary

Server persistence lives in PostgreSQL repositories. There is no server SQLite
loader, recorder, settlement store, runtime fallback, baseline, or generated
server schema.

SQL modules:

- use schema-registry table and column names directly;
- scope tenant and organization predicates from typed subjects;
- execute pagination, filtering, and sorting in SQL with bounded limits;
- use transactions for multi-table business invariants;
- use PostgreSQL locking/isolation explicitly where concurrent mutation can
  duplicate financial, credential, quota, or idempotency effects;
- parse decimal strings without binary floating-point financial arithmetic;
- fail closed on missing or invalid required database values;
- redact SQL details at the HTTP boundary.

The repository migration inventory in
`specs/database-store-migration.manifest.json` tracks stores that still need to
move from router-service infrastructure into capability-owned repository
crates.

## 6. HTTP And SDK Boundaries

Route handlers use typed request context and the SDKWork response helpers.
Management list query names are `page`, `page_size`, and bounded filters;
generated TypeScript uses `pageSize`. List repositories return the requested
window and total/page metadata without loading the complete dataset.

App and Backend APIs use standard success envelopes; errors use RFC 9457
Problem Details. OpenAI-compatible `/v1` endpoints retain their compatibility
wire contract and do not use app/backend envelopes.

Generated SDK artifacts are changed only through contract/generator inputs.
Frontend services call the generated package root and do not recreate DTOs,
authorization headers, or URL strings.

## 7. Credential And Security Boundary

Upstream credential commands support `api_key`, `bearer_token`, and `custom`.
Secret fields are write-only, encrypted before persistence, and absent from all
read/create/rotate response DTOs. OAuth is not a declared working method.

`UpstreamCredentialSecretCodec` and the config keyring own AES-256-GCM,
authenticated context, HKDF derivation, key identifiers, fingerprints, and
rotation. Provider adapters receive resolved secret material only after account,
method, endpoint, tenant, and egress validation. Secrets never enter routing
snapshots, audit payloads, errors, metrics, or traces.

## 8. Invocation, Usage, And Settlement

OpenAI-compatible routes authenticate, validate resource/pricing capability,
select an upstream account route, and delegate through invocation/provider
ports. They do not return fabricated provider success or usage.

`PostgresGatewayUsageRecorder` writes request trace and usage facts in one
transaction with stable idempotent identities. Required provider usage is
validated; missing usage is not converted to zero. Streaming completion owns a
bounded terminal lifecycle and records terminal usage before audited success.

`UsageSettlementWorker` processes bounded batches through
`PostgresUsageSettlementStore`. Selection uses `FOR UPDATE SKIP LOCKED`,
deterministic account ordering, idempotent settlement/ledger identities, atomic
balance guards, and capped retries for PostgreSQL serialization/deadlock
errors only.

## 9. Signed Payment Callback Boundary

Payment callbacks are unauthenticated provider ingress and must not use
`app_request_subject_boundary`. `PaymentWebhookConfig` requires
`SDKWORK_CLAW_PAYMENT_WEBHOOK_SECRET` and bounds clock skew through
`SDKWORK_CLAW_PAYMENT_WEBHOOK_MAX_CLOCK_SKEW_SECONDS`; unsigned payment
callbacks are forbidden.

Provider event id, nonce, payload digest, payment identity, and recharge
fulfillment are persisted atomically and idempotently. Payment callback amounts
must be parsed as exact decimal values; binary floating-point comparison is
forbidden and sub-cent callback precision must be rejected.

## 10. Concurrency And Memory

- Do not hold locks across `.await`.
- Use immutable `Arc` snapshots for shared catalog data.
- Bound request/response bodies, pages, batches, queues, retry payloads, and
  in-flight work independently.
- Stream incrementally with backpressure and cancellation cleanup.
- Use bounded database pools and timeouts.
- Avoid unbounded `collect`, full-table list reads, per-request catalog rebuild,
  and N+1 control-plane queries.
- Keep metric labels bounded and do not use tenant, user, request, model, or
  provider payload text as unbounded label values.

## 11. Verification

```text
cargo fmt --all -- --check
cargo test -p sdkwork-clawrouter-router-service --test upstream_route_selector
cargo test -p sdkwork-clawrouter-router-service --test invocation_route_planning
python -B -m tools.rust_backend_architecture_guardian
node ../sdkwork-specs/tools/check-application-layering.mjs --root .
node ../sdkwork-specs/tools/check-rust-backend-composition.mjs --root .
```

Broader checks are required when a change crosses API, persistence, security,
SDK, or deployment boundaries. Static verification does not replace production
PostgreSQL integration, concurrency, load, recovery, or security evidence.
