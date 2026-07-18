# SDKWork Claw Router Technical Architecture

Status: active
Owner: SDKWork maintainers
Updated: 2026-07-16
Specs: ARCHITECTURE_DECISION_SPEC.md, DOCUMENTATION_SPEC.md

This document is the **single entry point** for the Claw Router technical
architecture. It provides the global view (technology stack, module
boundaries, data ownership, deployment topology, security boundary,
verification) and links to detailed TECH shards for deep dives.

> Commercial/SOC2 reviewers: read sections 1-7 in order. New engineers:
> read sections 1-4 then jump to the linked TECH shard for your module.
> The audit facts in `generated/audit/standard-alignment-facts.json` are
> generated structural-fact input for review; they are not a release-readiness
> mirror or P0 closure authority.

## Current Evidence Status

Status: pre-launch. The topology, technology, and module descriptions below
define the intended architecture and do not by themselves prove a deployed,
high-availability, commercially releasable service.

The active production-readiness gate is
[REQ-2026-0001](../../product/requirements/REQ-2026-0001-commercial-production-readiness.md)
and its linked
[ADR](../decisions/ADR-20260710-commercial-gateway-safety-boundaries.md) and
implementation plan. Deployment, security, streaming, data-parity, recovery,
and release assertions require fresh evidence from a clean candidate commit.
The historical `standard-alignment-audit` documents are retained for
traceability and are not release evidence.

The active factual review is
[REVIEW-20260714 Production Readiness Revalidation](../../engineering/reviews/REVIEW-20260714-production-readiness-revalidation.md).
It records unclosed security, streaming, persistence, concurrency, and
PostgreSQL-evidence blockers. The OpenAI public boundary and `route_explain`
tenant authorization have worktree-level closure evidence, but architecture targets in this
document remain requirements until the review rows are closed with fresh,
clean-candidate verification evidence.

## 1. Architecture Overview

Claw Router is intended to become a multi-tenant AI gateway that exposes
OpenAI-compatible and provider-native APIs, routes traffic to upstream AI
providers (OpenAI, Anthropic, Google, Volcengine, Tencent, Alicloud, etc.),
and records usage for settlement. The current worktree partially implements
authentication, quota, billing, circuit breaking, idempotency, and sticky
routing; the active review defines the unclosed tenant, financial, streaming,
and public-boundary gaps.

The system is a polyglot monorepo: Rust services + TypeScript PC application
+ Python tooling guardians, governed by the SDKWork specs framework.

### High-Level Data Flow

```
┌─────────────┐     ┌───────────────┐     ┌──────────────────────────┐
│  Browser /  │     │   Edge Server │     │   Invocation Pipeline    │
│  Desktop /  │────▶│   (claw-http) │────▶│   (cloud-gateway +       │
│  SDK client │     │  auth + tls   │     │   router-service)        │
└─────────────┘     └───────────────┘     └─────────┬────────────────┘
                                                     │
                           ┌─────────────────────────┼─────────────┐
                           ▼                         ▼             ▼
                   ┌───────────────┐       ┌───────────────┐ ┌───────────┐
                   │  Upstream AI  │       │  Postgres /   │ │  Redis    │
                   │  providers    │       │  SQLite       │ │  (CB +    │
                   │  (HTTP/SSE)   │       │  (tenants,    │ │  idem +   │
                   └───────────────┘       │   billing,    │ │  sticky)  │
                           │               │   routing)    │ └───────────┘
                           ▼               └───────────────┘
                   ┌───────────────┐               │
                   │ Usage Recorder │◀──────────────┘
                   │  → settlement  │
                   │    worker      │
                   └───────────────┘
```

### Surface Inventory

| Surface | Prefix | Owner | Audience |
| --- | --- | --- | --- |
| OpenAI-compatible passthrough | `/v1/*` | cloud-gateway + router-service | SDK clients calling OpenAI API shape |
| Provider-native passthrough | `/openai/*` `/anthropic/*` `/google/*` ... | cloud-gateway | SDK clients calling provider-native shape |
| App API | `/app/v3/api/*` | standalone-gateway | Console UI (consumer portal) |
| Backend API | `/backend/v3/api/*` | admin-gateway | Admin UI (operator console) |
| Platform API | `/openapi.json`, `/openapi/schema-tabs.json`, `/healthz`, `/readyz`, `/metrics` | claw-http | Ops + discovery |

The compatibility prefixes above describe route families, not an authorization
grant. OpenAI-compatible runtime forwarding is constrained by the authored
OpenAPI method/path contract; provider control-plane operations and model
deletion are absent from the contract, classifier, taxonomy, seeds, and SDKs.
Provider-native wildcard mounts are fail-closed against the embedded authored
OpenAPI contract before authentication or upstream forwarding. Direct provider
paths and provider-account aliases are accepted only when the standardized
path template and HTTP method are declared; unknown paths return `404`, and
wrong methods return `405` with the contract-derived `Allow` header.

## 2. Technology Choices

| Layer | Technology | Version pin | Rationale |
| --- | --- | --- | --- |
| Gateway core | Rust + axum 0.8 + hyper + tokio | rust-toolchain 1.79.0 | p95 latency overhead target < 50 ms; zero-cost abstractions |
| HTTP client | hyper-rustls + webpki-roots | workspace dep | TLS by default; no native-tls OpenSSL dependency |
| Database (prod target) | PostgreSQL 16+ via sqlx | `sdkwork-database-sqlx` | Required production candidate store; HA, recovery, and multi-worker evidence remain open |
| Database (dev/desktop) | SQLite via sqlx | `sdkwork-database-sqlx` | Zero-config single-node development store; it is not a PostgreSQL HA/concurrency equivalent |
| Cache / distributed coordination | Redis 7+ | `sdkwork-claw-config::redis` | Circuit breaker, idempotency, sticky state, and optional accounting-retry queue; HA, persistence, recovery, and capacity evidence remain open |
| Frontend runtime | React 19 + Vite 6 + TanStack Query 5 | `apps/sdkwork-clawrouter-pc` | Concurrent rendering, suspense, streaming SSR-ready |
| Frontend UI | Tailwind 4 + lucide-react + Recharts 3 | workspace deps | Industry-standard dashboard UX (OpenAI Platform / Vercel Console parity) |
| i18n | i18next 26 | `@sdkwork/clawrouter-pc-i18n` | 7 languages: en, zh, de, fr, ja, ko, ru |
| SDK generation | OpenAPI Generator + custom `clawrouter_openapi_generator` | `tools/clawrouter_openapi_generator.py` | Contract-first; forbid raw HTTP in app code |
| Build orchestration | pnpm 10 + turbo 2 + Node 22 | `package.json` | Workspace composition across 14 sibling repos |
| CI/CD | GitHub Actions + reusable workflow | `.github/workflows/` | Supply chain reproducibility via commit SHA pinning |
| Container | multi-arch Docker (amd64/arm64) | `deployments/` | 24-package install matrix across Windows/macOS/Linux |

Detailed tech-stack: [TECH-03-tech-stack.md](TECH-03-tech-stack.md)

## 3. System Boundaries And Modules

The system follows a strict layered architecture. Each layer owns its
state; cross-layer calls go through defined ports (traits in Rust,
SDK clients in TypeScript).

### Layered Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Presentation Layer                                            │
│  ┌──────────────────────┐  ┌──────────────────────────────┐   │
│  │ PC Application        │  │ OpenAI/Provider API surface   │   │
│  │ (apps/sdkwork-...-pc) │  │ (axum handlers)              │   │
│  │ React 19 + TanStack   │  │ /v1/* /openai/* /app /backend│   │
│  └──────────┬───────────┘  └────────────┬─────────────────┘   │
└─────────────┼────────────────────────────┼────────────────────┘
              │                            │
              ▼                            ▼
┌──────────────────────────────────────────────────────────────┐
│  Application Layer (services/sdkwork-clawrouter-router-service)│
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  Invocation Pipeline (13 interceptors, ordered)         │  │
│  │  Metrics → Idempotency → PayloadExtraction →            │  │
│  │  BillingPolicy → [Sticky] → RoutePlanning →            │  │
│  │  CircuitBreaker → AccountResolution →                  │  │
│  │  [AdapterDispatch] → PricingPreflight →               │  │
│  │  ResponseNormalization → DispatchExecutor →            │  │
│  │  [StickyCommit, UsageRecording] →                      │  │
│  │  PricingSettlement → PricingFinalization →            │  │
│  │  TraceTelemetry → UsageExtraction                      │  │
│  └─────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────┐
│  Domain Layer                                                  │
│  Ports (traits): ChatCompletionRelay, EmbeddingsRelay,         │
│  PricingCatalog, GatewayUsageRecorder, StickyRouteStore,       │
│  CircuitBreakerStore, IdempotencyStore                         │
└──────────────────────────────────────────────────────────────┘
              │
              ▼
┌──────────────────────────────────────────────────────────────┐
│  Infrastructure Layer                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ sqlx Postgres │  │ sqlx SQLite  │  │ Redis pool       │   │
│  │ ~40 stores    │  │ ~40 stores   │  │ (circuit/idem/   │   │
│  │               │  │              │  │  sticky)          │   │
│  └──────────────┘  └──────────────┘  └──────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Provider adapters (hyper-rustls upstream clients)  │    │
│  │  OpenAI / Anthropic / Google / Volcengine / Tencent │    │
│  │  Alicloud / Suno / ElevenLabs / Midjourney    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Module Ownership Matrix

| Module | Owner crate | Responsibility | Cannot import |
| --- | --- | --- | --- |
| HTTP entry + auth | `crates/sdkwork-claw-http` | TLS termination, app session token, API key auth, contract fallback | router-service internals |
| Gateway assembly | `crates/sdkwork-clawrouter-cloud-gateway` | Edge server, invocation router wiring, OpenAI passthrough path table, provider-native passthrough | sqlx stores directly |
| Service layer | `services/sdkwork-clawrouter-router-service` | 13-interceptor invocation pipeline, OpenAI handlers, billing, pricing, settlement, payment adapters | axum router assembly |
| App API | `services/sdkwork-clawrouter-standalone-gateway` + `crates/sdkwork-clawrouter-standalone-gateway-lib` | Consumer portal HTTP handlers (`/app/v3/api/*`) + edge env resolution | gateway internals |
| Backend API | `services/sdkwork-clawrouter-admin-gateway` | Operator console HTTP handlers (`/backend/v3/api/*`) | gateway internals |
| Provider adapters | `crates/provider-adapters/*` | Per-provider HTTP + signing + credential loading | router-service |
| Config | `crates/sdkwork-claw-config` | Runtime TOML + env + secret file resolution; database/redis/deployment/runtime/app_session/api_key sections | any service crate |
| Security utils | `crates/sdkwork-claw-security` | Sensitive header detection + secret redaction | any service crate |
| Observability | `crates/sdkwork-claw-observability` | tracing init (EnvFilter, LogFormat) | any service crate |
| Contract metadata | `crates/sdkwork-claw-contract` | API surface + path pattern matching + manifest embedding | any service crate |
| PaaS plugin | `crates/sdkwork-claw-paas-plugin` | PaaS capability enum (10) + operation enum (40) + provider plugin trait + catalog | router-service |
| Route manifests | `crates/sdkwork-routes-{llm,iaas,paas}-open-api` | Static route manifest metadata (package/surface/prefix) | router-service |
| Test fixtures | `crates/sdkwork-claw-test-support` | SQLite seeded template + signing helpers + billing meter codes | (test-only) |
| PC app | `apps/sdkwork-clawrouter-pc` | Thin bootstrap; business lives in `packages/sdkwork-clawrouter-pc-*` | (frontend) |

### Coupling Discipline (Open-Closed Principle)

- New provider → add `crates/provider-adapters/<new>` implementing `ProviderAdapter` trait; no existing crate changes.
- New PaaS capability → extend `PaasCapability` enum + `PaasOperation` enum; plugins opt-in.
- New invocation interceptor → implement `InvocationInterceptor` trait; insert into `invocation_router.rs` ordered list.
- New admin module → add `packages/sdkwork-clawrouter-pc-admin-<module>` + route in `App.tsx`; no shell changes.
- New schema table → register in `database/contract/{table-registry,prefix-registry}.json`; generator emits DDL.

## 4. Directory And Package Layout

```
sdkwork-clawrouter/
├── AGENTS.md                  # repository agent entrypoint
├── Cargo.toml                 # Rust workspace (52 members)
├── package.json               # package lifecycle scripts (pnpm; see PNPM_SCRIPT_SPEC.md)
├── sdkwork.app.config.json    # app identity + release metadata
├── sdkwork.workflow.json      # GitHub packaging/release workflow manifest
├── apis/                      # authored API contracts (app/backend/open)
├── apps/sdkwork-clawrouter-pc/  # PC React application
│   ├── packages/sdkwork-clawrouter-pc-admin-*    # 25 admin modules
│   ├── packages/sdkwork-clawrouter-pc-console-*  # 7 console modules
│   ├── packages/sdkwork-clawrouter-pc-i18n/     # 7-language i18n
│   └── src/                                      # thin bootstrap
├── crates/                    # Rust shared crates
│   ├── provider-adapters/     # per-provider HTTP+signing
│   ├── sdkwork-claw-{config,http,core,security,contract,...}
│   ├── sdkwork-clawrouter-cloud-gateway/   # gateway assembly
│   ├── sdkwork-clawrouter-standalone-gateway-lib/  # standalone edge + app API wiring
│   └── sdkwork-routes-{llm,iaas,paas}-open-api/  # route manifests
├── services/                 # runnable Rust binaries
│   ├── sdkwork-clawrouter-router-service/  # core service layer
│   ├── sdkwork-clawrouter-standalone-gateway/  # /app/v3/api/* binary entrypoint
│   ├── sdkwork-clawrouter-admin-gateway/# /backend/v3/api/*
│   ├── sdkwork-claw-provider-adapter/      # provider HTTP relay
│   └── sdkwork-claw-installer/             # clawrouterctl CLI
├── database/
│   ├── ddl/baseline/{postgres,sqlite}/  # baseline DDL
│   ├── migrations/{postgres,sqlite}/    # versioned migrations
│   ├── contract/{table-registry,prefix-registry}.json
│   └── seeds/                           # bootstrap + locale seeds
├── deployments/kubernetes/    # 8 manifests (gateway/app-api/admin-api/edge/redis/ingress/network-policy/migration-job)
├── sdks/                      # generated SDKs (app/backend/open)
├── docs/                      # this directory
├── tests/                     # 103 Python guardian scripts
├── tools/                     # Python guardians + generators
└── specs/                     # local contracts (topology, naming-migration, etc.)
```

## 5. API, SDK, And Data Ownership

### API Authority Chain

```
apis/{app,backend,open}-api/        # authored contracts (source of truth)
        │
        ▼
generated/openapi/*.json            # compiled OpenAPI specs
        │
        ▼
sdks/clawrouter-{app,backend,open}-sdk/  # generated TypeScript SDKs
        │
        ▼
@sdkwork/clawrouter-{app,backend,open}-sdk  # consumed by PC app + external clients
```

Guardian: `tools/clawrouter_sdk_guardian.py` enforces that the PC app
imports from `@sdkwork/clawrouter-*-sdk` only, never raw `fetch`/`axios`.

### Data Ownership

| Table prefix | Owner module | Writer | Reader |
| --- | --- | --- | --- |
| `iam_*` | sdkwork-iam (sibling repo) | IAM service | claw-router (read-only via shared pool) |
| `ai_*` | router-service | router-service invocation pipeline | admin-api, app-api |
| `ops_*` | router-service | ops workers (heartbeat, audit, metrics, jobs) | admin-api |
| `integration_*` | router-service | provider integration | admin-api |
| `analytics_*` | router-service | analytics rollup worker | admin-api |

Runtime provider health has a narrower ownership boundary than the prefix-level
summary:

- `ai_channel` and `ai_channel_credential` are the canonical runtime health
  facts. Health probes update their health status, latency, consecutive error
  count, and verification time atomically in the owning channel transaction.
- `ai_request_trace` and `ai_routing_decision_log` are append-only route and
  provider-attempt facts. They are valid asynchronous inputs for operational
  health analysis, but they do not replace the current channel facts.
- `integration_provider_health_snapshot` is a rebuildable operational
  projection. Only the external `ops-worker` projection pipeline may write it;
  gateway, app, and admin routing repositories must not own or synchronously
  maintain it.
- `ops_schema_migration_history`, `ops_seed_history`, and
  `ops_database_installation_state` are maintained by the canonical
  `sdkwork-database` lifecycle. Application bootstrap and catalog import code
  must not repair, rewrite, or delete lifecycle history.

Schema registry: `database/contract/table-registry.json` +
`database/contract/prefix-registry.json` are the single source of truth
for table ownership; `docs/schema-registry/tables/*.yaml` are the curated
views.

## 6. Security, Privacy, And Observability

### Trust Boundary

```
Internet ──TLS──▶ Edge Server ──auth──▶ Invocation Pipeline ──scoped SQL──▶ Database
                   │                    │
                   │                    ├── ApiKeyAuthenticator (Bearer / x-api-key / x-goog-api-key / query)
                   │                    ├── AppSessionToken verifier (HMAC shared secret, 0.3.x)
                   │                    └── WebRequestPrincipal from IAM (web-framework layer)
                   │
                   └── rate limit + firewall rules
```

- Multi-tenant isolation enforced at SQL repository boundary via
  `SqlScopedSubject` / `SqlScopedAdminSubject` (single i64 conversion point).
- Secrets never logged: `sdkwork-claw-security::redact_secret` masks
  authorization / access-token / x-api-key / cookie headers.
- Database URL redaction in installer error output.
- App session token uses single shared HMAC secret (0.3.x baseline);
  per-tenant RS256/ES256 is a P0 GA prerequisite (see
  `docs/standard-alignment-audit.md`).

### Provider Relay Security Controls (0.3.0)

The OpenAI-compatible provider relay pipeline enforces the following
Critical/High security and performance controls:

| ID | Control | Implementation |
| --- | --- | --- |
| C-1 | Partial SSRF mitigation | `UpstreamProviderEndpoint::new` resolves an upstream host and rejects selected loopback/private/link-local/unspecified/CGN `100.64.0.0/10`/IPv6 ULA `fc00::/7` ranges before dispatching. Resolver pinning, DNS-rebinding defense, persistent allowlists, redirect policy, and Kubernetes egress enforcement remain open. |
| C-4 | Circuit breaker fail-closed | `CircuitBreakerConfig::fail_open` defaults to `false`; Redis degradation emits `tracing::warn!(circuit_breaker_redis_degraded = 1)`. |
| C-5 | HTTP connection-pool tuning | `build_provider_client` configures `pool_idle_timeout`/`pool_max_idle_per_host`/`http2_keep_alive_interval`/`http2_keep_alive_timeout`/`connect_timeout` via `[provider_relay.http_pool]`. |
| H-1 | HTTPS-only upstream | `hyper_rustls::HttpsConnectorBuilder::https_only()` replaces `.https_or_http()`; plaintext HTTP upstream URLs are rejected at construction. |
| H-3 | Per-request body limits | Non-streaming relay responses are read through a bounded body collector. `SDKWORK_CLAW_PROVIDER_RESPONSE_MAX_BYTES` is injected into the unified `InvocationHttpDispatcher`; `gateway_invocation_body_max_bytes` is injected into authenticated passthrough request collection. These are per-request ceilings only. Allowed passthrough bodies are still collected before forwarding, and payload JSON, usage lines, pricing snapshots, retry envelopes, settlement reads, queues, and concurrent in-flight requests still require independent hard budgets. A body cap alone is not an OOM proof. |
| H-4 | Provider timeout reduction | Non-streaming requests use the configured response timeout. The unified streaming router also applies a total stream timeout and releases terminal state on EOF, cancellation, timeout, or error; separate first-frame and idle deadlines remain unproven. |
| H-5 | Dispatch retry tightening | `DispatchExecutor::max_attempts` returns 1 for `SseStream`/`ByteStream` invocations (no replay after SSE bytes sent); non-streaming defaults to 2. |
| H-8 | Redis degraded alerting | `GatewayInvocationRateLimiter::redis_degraded_gauge()` emits Prometheus `redis_degraded=1`; local fallback divides quota by `estimated_instance_count` to prevent per-node over-allowance. |
| H-9 | Tenant in-flight concurrency | `TenantInflightInterceptor` uses Redis atomic counter (Lua script + 5-minute TTL) or local `LocalTenantInflightCounter`; exceeding `tenant_max_inflight_requests` (default 100) returns HTTP 429 via `InvocationErrorKind::RateLimit`. |
| H-10 | Accounting command admission | Gateway trace and usage commands reject values wider than their authored PostgreSQL/SQLite DDL fields, and reject decimal text above the existing SQLite `NUMERIC(38, 12)` 40-byte ceiling before parsing. Snapshot JSON is syntax/root-validated without building a second in-process DOM. This does not establish a pricing-snapshot byte/shape budget, queue capacity, or global OOM safety. |

The direct authenticated Provider Adapter passthrough is not part of the
completed streaming architecture. Its formal trait only returns a buffered JSON
outcome, while the gateway can currently transfer a raw SSE/NDJSON body with no
formal terminal usage, idempotency, cancellation, bounded headers, or once-only
financial completion. It is not fail closed today; until a reviewed Adapter
stream contract exists, this remains a release blocker rather than a commercial
streaming capability.

Cloud Gateway, app-api, and backend-api validate an explicit
`SDKWORK_CLAW_SNOWFLAKE_NODE_ID` before their server/container database
bootstrap accepts traffic. That prevents a shared fallback node ID but does not
allocate, lease, fence, or detect duplicate IDs across replicas. The current
two-replica Kubernetes Deployments provide no such assignment and must not be
"fixed" with a shared static value. The upstream Snowflake implementation also
needs a logical-clock correction for small clock rollbacks and a managed
sequence-exhaustion policy. Cluster deployment remains blocked on an approved
allocation/fencing design and the upstream ID repair.

### Cryptographic Material

- App session token signing keys: 90-day rotation is a policy target; durable
  cross-replica lifecycle and recovery evidence are not complete
- API key pepper: ≥32 characters, env or file source
- Redis TLS: required in production (`redis://` → `rediss://`)
- PostgreSQL: `sslmode=require` in production
- Container images: cosign signing (configured, implementation P0)
- SBOM: CycloneDX + SPDX (cargo covered, npm coverage P0)

Detailed security: [TECH-08-securitydesign.md](TECH-08-securitydesign.md)

### Observability

| Signal | Implementation | Status |
| --- | --- | --- |
| Structured logs | `tracing` + EnvFilter + 4 LogFormat (compact/json/pretty/full) | Implemented locally; no clean-candidate production evidence |
| Metrics | `sdkwork-claw-http::metrics` 5 AtomicU64 counters | Beta (P0: add Prometheus histogram + labels) |
| Distributed tracing | `sdkwork-claw-observability::tracing_setup` | Beta (P0: add OTLP exporter) |
| Health checks | `/healthz` (liveness) + `/readyz` (configured dependency checks) | Partial; not a generic migration/drift or enabled-schema gate |
| Audit log | `ops_audit_log` table | Implemented; retention, recovery, and production evidence remain open |

## 7. Deployment And Runtime Topology

### Deployment Profiles

| Profile | Database | Redis | Service layout | Target |
| --- | --- | --- | --- | --- |
| `standalone` (default dev) | SQLite or Postgres | optional embedded | unified-process (single binary) | browser / desktop |
| `standalone` (production) | Postgres | external Redis | unified-process or split-services | server |
| `cloud` | Postgres (managed) | managed Redis | split-services | container / K8s |

### Runtime Targets

- `browser`: Vite dev server + standalone Rust gateway
- `desktop`: Tauri shell + embedded Rust gateway
- `server`: systemd / container / K8s deployment
- `container`: Docker multi-arch (amd64/arm64)

### Target Kubernetes Topology (currently blocked)

The following is a target topology, not a deployable HA claim. The current
two-replica manifest has no cluster-safe Snowflake allocation/fencing and must
not receive a shared static node ID. Redis HA, PostgreSQL recovery, NetworkPolicy,
load, chaos, and restore evidence are also unresolved.

```
                    ┌──────────────────┐
                    │   Ingress         │
                    │   (nginx/traefik) │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│  Gateway       │    │  App API       │    │  Admin API     │
│  (cloud-       │    │  (app-api-     │    │  (admin-api-   │
│   gateway)     │    │   server)      │    │   server)      │
│  replicas: 2+  │    │  replicas: 2+  │    │  replicas: 2+  │
└───────┬───────┘    └───────┬───────┘    └───────┬───────┘
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────────────────────────────────────────────────────┐
│  PostgreSQL (managed: Patroni / Cloud SQL / Azure Database)  │
│  + streaming replication + daily backup                       │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────┐
│  Redis           │
│  (Sentinel 3     │
│   nodes or       │
│   managed)       │
└──────────────────┘
```

Detailed deployment: [TECH-09-deploymentarchitecturedesign.md](TECH-09-deploymentarchitecturedesign.md)

## 8. Architecture Decision Index

| ADR | Topic | Status | Document |
| --- | --- | --- | --- |
| 0001 | Use axum 0.8 + hyper for HTTP gateway | Accepted | [TECH-03-tech-stack.md](TECH-03-tech-stack.md) |
| 0002 | Invocation pipeline interceptor pattern | Accepted | [TECH-2026-06-05-api-router-invocation-pipeline-redesign.md](TECH-2026-06-05-api-router-invocation-pipeline-redesign.md) |
| 0003 | Dual database engine (Postgres + SQLite) | Accepted | [TECH-21-schema-compiler-postgres-ddl.md](TECH-21-schema-compiler-postgres-ddl.md) |
| 0004 | Sticky session via SHA256 object hash | Accepted | [TECH-2026-05-29-ai-routing-sticky-cache.md](TECH-2026-05-29-ai-routing-sticky-cache.md) |
| 0005 | All-in-one runtime for dev topology | Accepted | [TECH-2026-05-29-all-in-one-runtime.md](TECH-2026-05-29-all-in-one-runtime.md) |
| 0006 | Contract-first SDK generation | Accepted | [TECH-31-clawrouter-openapi-generator.md](TECH-31-clawrouter-openapi-generator.md) |
| 0007 | Web-framework layer as default auth | Accepted | [TECH-27-rust-runtime-and-sdk-integration-standard.md](TECH-27-rust-runtime-and-sdk-integration-standard.md) |
| 0008 | Baseline-plus-migrations database strategy | Accepted | [TECH-30-flyway-schema-contract-audit.md](TECH-30-flyway-schema-contract-audit.md) |
| 0009 | Provider adapter trait + per-provider crate | Accepted | [TECH-provider-adapter-architecture.md](TECH-provider-adapter-architecture.md) |
| 0010 | Single shared HMAC for app session (0.3.x) | Accepted, sunset | [docs/standard-alignment-audit.md](../../standard-alignment-audit.md) |

| 0011 | Commercial gateway safety boundaries | Accepted | [ADR-20260710](../decisions/ADR-20260710-commercial-gateway-safety-boundaries.md) |
| 0012 | High-volume ledger and trace evolution | Proposed, migration review required | [TECH-35-high-volume-ledger-evolution.md](TECH-35-high-volume-ledger-evolution.md) |

Full ADR list: [TECH-changelog.md](TECH-changelog.md)

## 9. Verification

### CI Quality Gates (`.github/workflows/verify.yml`)

| Gate | Command | Fail condition |
| --- | --- | --- |
| Rust format | `pnpm format:rust:check` | any unformatted file |
| Rust lint | `cargo clippy --all-targets -- -D warnings` | any warning |
| Rust tests | `pnpm verify:ci` → `scripts/run-claw-router-rust-tests.mjs` (9 categories) | any failure |
| Postgres integration | `pnpm test:postgres:required` (postgres:16 service) | any failure |
| Frontend typecheck | `pnpm --dir apps/sdkwork-clawrouter-pc typecheck` | any TS error |
| Frontend lint | `pnpm --dir apps/sdkwork-clawrouter-pc lint` | any error |
| Frontend test | `pnpm --dir apps/sdkwork-clawrouter-pc test` | any failure |
| Python guardians | `tools/sdkwork_standard_alignment_guardian.py --strict` | any violation |
| Standard alignment | `node scripts/refresh-standard-alignment-audit.mjs --check --strict` | any P0 pending |
| Cargo audit | `cargo audit --deny warnings` | any advisory |
| Cargo deny | `cargo deny check advisories bans licenses sources` | any violation |
| Trivy fs scan | `aquasecurity/trivy-action@master` (HIGH,CRITICAL) | any HIGH/CRITICAL unfixed |
| Gitleaks | `gitleaks/gitleaks-action@v2` | any leaked secret |
| pnpm audit | `pnpm audit --audit-level=high` | any high+ advisory |
| Browser smoke | `pnpm verify` (opt-in via `CLAWROUTER_BROWSER_SMOKE_REQUIRED=1`) | any failure |
| Edge dev smoke | `pnpm verify -- --with-edge-dev-smoke` (opt-in) | any failure |

### Local Verification

```bash
# Standard alignment (auto-generated facts + Python guardian)
pnpm check:alignment:audit:facts:check
pnpm check:alignment

# Full Rust test suite (9 categories)
pnpm test:rust:full

# Postgres required integration
SDKWORK_CLAW_POSTGRES_TEST_DATABASE_URL=postgres://... pnpm test:postgres:required

# Full application verification
pnpm verify

# Release preflight (strict)
pnpm release:preflight -- --strict --env-file .env.release --strict-root-clean
```

### Audit Facts (machine-checkable)

`generated/audit/standard-alignment-facts.json` is generated by
`scripts/refresh-standard-alignment-audit.mjs` from authored structural inputs.
It records static fact checks only; it is not the source of truth for P0
closure, release readiness, or production evidence.

```bash
node scripts/refresh-standard-alignment-audit.mjs           # regenerate
node scripts/refresh-standard-alignment-audit.mjs --check   # CI drift check
node scripts/refresh-standard-alignment-audit.mjs --strict  # fail if any P0 pending
```

Current status: use
`docs/product/requirements/REQ-2026-0001-commercial-production-readiness.md`,
its linked implementation plan, and fresh verification evidence. The historical
`docs/standard-alignment-audit.md` is retained only for traceability;
`generated/audit/standard-alignment-facts.json` is an input to review, not
release evidence on its own.

## Document Map

Deep-dive TECH shards (linked by topic, not required reading for orientation):

- [TECH-02-architecturedesign.md](TECH-02-architecturedesign.md)
- [TECH-03-tech-stack.md](TECH-03-tech-stack.md)
- [TECH-04-modulesplanning.md](TECH-04-modulesplanning.md)
- [TECH-05-design.md](TECH-05-design.md)
- [TECH-06-api-gateway-standarddesign.md](TECH-06-api-gateway-standarddesign.md)
- [TECH-07-performancedesign.md](TECH-07-performancedesign.md)
- [TECH-08-securitydesign.md](TECH-08-securitydesign.md)
- [TECH-09-deploymentarchitecturedesign.md](TECH-09-deploymentarchitecturedesign.md)
- [TECH-10-api-architecture.md](TECH-10-api-architecture.md)
- [TECH-11-design.md](TECH-11-design.md)
- [TECH-12-featuresmodules.md](TECH-12-featuresmodules.md)
- [TECH-13-schemaregistry-design.md](TECH-13-schemaregistry-design.md)
- [TECH-15-new-api-sub2api-clawrouter-design.md](TECH-15-new-api-sub2api-clawrouter-design.md)
- [TECH-16-design.md](TECH-16-design.md)
- [TECH-17-appcenter-plusapp-compatible-design.md](TECH-17-appcenter-plusapp-compatible-design.md)
- [TECH-18-skillshub-agentskills-pluscategory-compatible-design.md](TECH-18-skillshub-agentskills-pluscategory-compatible-design.md)
- [TECH-19-finance-trade-java-compatible-design.md](TECH-19-finance-trade-java-compatible-design.md)
- [TECH-20-schema-guardian-quality-gate.md](TECH-20-schema-guardian-quality-gate.md)
- [TECH-2026-05-06-model-catalog-pricing-standard-design.md](TECH-2026-05-06-model-catalog-pricing-standard-design.md)
- [TECH-2026-05-06-model-catalog-pricing-standard.md](TECH-2026-05-06-model-catalog-pricing-standard.md)
- [TECH-2026-05-07-sdkwork-models-install-flow.md](TECH-2026-05-07-sdkwork-models-install-flow.md)
- [TECH-2026-05-09-sdkwork-app-system.md](TECH-2026-05-09-sdkwork-app-system.md)
- [TECH-2026-05-10-group-account-pool-routing.md](TECH-2026-05-10-group-account-pool-routing.md)
- [TECH-2026-05-12-forum-default-tutorial-seed.md](TECH-2026-05-12-forum-default-tutorial-seed.md)
- [TECH-2026-05-13-generation-claw-router-capture-billing.md](TECH-2026-05-13-generation-claw-router-capture-billing.md)
- [TECH-2026-05-13-generation-standard-appbase-plan.md](TECH-2026-05-13-generation-standard-appbase-plan.md)
- [TECH-2026-05-14-saas-verification-code-delivery.md](TECH-2026-05-14-saas-verification-code-delivery.md)
- [TECH-2026-05-15-v0-1-0.md](TECH-2026-05-15-v0-1-0.md)
- [TECH-2026-05-16-v0-2-0.md](TECH-2026-05-16-v0-2-0.md)
- [TECH-2026-05-17-agent-platform-design.md](TECH-2026-05-17-agent-platform-design.md)
- [TECH-2026-05-17-agent-platform.md](TECH-2026-05-17-agent-platform.md)
- [TECH-2026-05-17-v0-3-0.md](TECH-2026-05-17-v0-3-0.md)
- [TECH-2026-05-18-chat-conversation-agent-memory-design.md](TECH-2026-05-18-chat-conversation-agent-memory-design.md)
- [TECH-2026-05-18-chat-conversation-agent-memory.md](TECH-2026-05-18-chat-conversation-agent-memory.md)
- [TECH-2026-05-20-appbase-commerce-account-wallet-ledger.md](TECH-2026-05-20-appbase-commerce-account-wallet-ledger.md)
- [TECH-2026-05-20-appbase-commerce-platform-design.md](TECH-2026-05-20-appbase-commerce-platform-design.md)
- [TECH-2026-05-21-appbase-commerce-standard-design.md](TECH-2026-05-21-appbase-commerce-standard-design.md)
- [TECH-2026-05-21-appbase-commerce-standard-phase1.md](TECH-2026-05-21-appbase-commerce-standard-phase1.md)
- [TECH-2026-05-22-admin-product-center-design.md](TECH-2026-05-22-admin-product-center-design.md) (archive)
- [TECH-2026-05-22-admin-product-center.md](TECH-2026-05-22-admin-product-center.md) (archive)
- [TECH-2026-06-10-admin-product-center-commercial-design.md](TECH-2026-06-10-admin-product-center-commercial-design.md) (live)
- [TECH-2026-06-10-admin-product-center-commercial.md](TECH-2026-06-10-admin-product-center-commercial.md) (live)
- [TECH-2026-05-22-provider-adapter-invocation-design.md](TECH-2026-05-22-provider-adapter-invocation-design.md)
- [TECH-2026-05-22-provider-adapter-invocation.md](TECH-2026-05-22-provider-adapter-invocation.md)
- [TECH-2026-05-23-admin-membership-center-completeness-design.md](TECH-2026-05-23-admin-membership-center-completeness-design.md)
- [TECH-2026-05-23-admin-membership-center-completeness.md](TECH-2026-05-23-admin-membership-center-completeness.md)
- [TECH-2026-05-23-appbase-promotion-membership-entitlement-core.md](TECH-2026-05-23-appbase-promotion-membership-entitlement-core.md)
- [TECH-2026-05-23-appbase-promotion-membership-entitlement-design.md](TECH-2026-05-23-appbase-promotion-membership-entitlement-design.md)
- [TECH-2026-05-23-payment-center-default-initialization-design.md](TECH-2026-05-23-payment-center-default-initialization-design.md)
- [TECH-2026-05-23-payment-center-default-initialization.md](TECH-2026-05-23-payment-center-default-initialization.md)
- [TECH-2026-05-23-recharge-package-ratio-design.md](TECH-2026-05-23-recharge-package-ratio-design.md)
- [TECH-2026-05-23-sdkwork-file-platform-design.md](TECH-2026-05-23-sdkwork-file-platform-design.md)
- [TECH-2026-05-23-sdkwork-file-platform-foundation.md](TECH-2026-05-23-sdkwork-file-platform-foundation.md)
- [TECH-2026-05-23-test-efficiency-optimization.md](TECH-2026-05-23-test-efficiency-optimization.md)
- [TECH-2026-05-25-channel-group-channel-association.md](TECH-2026-05-25-channel-group-channel-association.md)
- [TECH-2026-05-26-admin-marketing-promotion-standard-design.md](TECH-2026-05-26-admin-marketing-promotion-standard-design.md)
- [TECH-2026-05-26-admin-prompts-mcp-vertical.md](TECH-2026-05-26-admin-prompts-mcp-vertical.md)
- [TECH-2026-05-29-ai-routing-sticky-cache.md](TECH-2026-05-29-ai-routing-sticky-cache.md)
- [TECH-2026-05-29-all-in-one-runtime.md](TECH-2026-05-29-all-in-one-runtime.md)
- [TECH-2026-05-29-api-reference-aggregate-groups.md](TECH-2026-05-29-api-reference-aggregate-groups.md)
- [TECH-2026-05-29-payment-transit-system-design.md](TECH-2026-05-29-payment-transit-system-design.md)
- [TECH-2026-05-29-payment-transit-system.md](TECH-2026-05-29-payment-transit-system.md)
- [TECH-2026-05-29-rust-test-performance-report.md](TECH-2026-05-29-rust-test-performance-report.md)
- [TECH-2026-05-30-recharge-multi-currency-standardization.md](TECH-2026-05-30-recharge-multi-currency-standardization.md)
- [TECH-2026-06-01-admin-category-initialization-standard.md](TECH-2026-06-01-admin-category-initialization-standard.md)
- [TECH-2026-06-02-admin-model-mapping-design.md](TECH-2026-06-02-admin-model-mapping-design.md)
- [TECH-2026-06-02-admin-model-mapping.md](TECH-2026-06-02-admin-model-mapping.md)
- [TECH-2026-06-05-api-router-invocation-pipeline-redesign.md](TECH-2026-06-05-api-router-invocation-pipeline-redesign.md)
- [TECH-2026-06-05-api-router-invocation-pipeline-rewrite.md](TECH-2026-06-05-api-router-invocation-pipeline-rewrite.md)
- [TECH-2026-06-09-api-relay-provider-platform-design.md](TECH-2026-06-09-api-relay-provider-platform-design.md)
- [TECH-2026-06-09-appbase-oauth-system-design.md](TECH-2026-06-09-appbase-oauth-system-design.md)
- [TECH-2026-06-09-appbase-oauth-system.md](TECH-2026-06-09-appbase-oauth-system.md)
- [TECH-2026-06-10-admin-product-center-commercial-design.md](TECH-2026-06-10-admin-product-center-commercial-design.md)
- [TECH-2026-06-10-admin-product-center-commercial.md](TECH-2026-06-10-admin-product-center-commercial.md)
- [TECH-2026-06-13-single-port-dev-topology-design.md](TECH-2026-06-13-single-port-dev-topology-design.md)
- [TECH-2026-06-13-single-port-dev-topology.md](TECH-2026-06-13-single-port-dev-topology.md)
- [TECH-2026-06-20-router-minimal-domain-migration-design.md](TECH-2026-06-20-router-minimal-domain-migration-design.md)
- [TECH-2026-06-21-generation-field-mapping-ai-to-generation.md](TECH-2026-06-21-generation-field-mapping-ai-to-generation.md)
- [TECH-2026-06-21-kernel-field-mapping-ai-to-agent.md](TECH-2026-06-21-kernel-field-mapping-ai-to-agent.md)
- [TECH-2026-06-21-memory-field-mapping-ai-to-mem.md](TECH-2026-06-21-memory-field-mapping-ai-to-mem.md)
- [TECH-21-schema-compiler-postgres-ddl.md](TECH-21-schema-compiler-postgres-ddl.md)
- [TECH-22-domain-type-generator.md](TECH-22-domain-type-generator.md)
- [TECH-23-schema-manifest.md](TECH-23-schema-manifest.md)
- [TECH-24-openapi-schema-components.md](TECH-24-openapi-schema-components.md)
- [TECH-25-frontend-contract-guardian.md](TECH-25-frontend-contract-guardian.md)
- [TECH-26-java-legacy-contract-audit.md](TECH-26-java-legacy-contract-audit.md)
- [TECH-27-rust-runtime-and-sdk-integration-standard.md](TECH-27-rust-runtime-and-sdk-integration-standard.md)
- [TECH-28-architecture-standard-guardian.md](TECH-28-architecture-standard-guardian.md)
- [TECH-29-rust-backend-module-standard.md](TECH-29-rust-backend-module-standard.md)
- [TECH-30-flyway-schema-contract-audit.md](TECH-30-flyway-schema-contract-audit.md)
- [TECH-30-platform-data-model-v4.md](TECH-30-platform-data-model-v4.md)
- [TECH-31-clawrouter-openapi-generator.md](TECH-31-clawrouter-openapi-generator.md)
- [TECH-31-product-composition-model.md](TECH-31-product-composition-model.md)
- [TECH-32-sdkwork-models-standard.md](TECH-32-sdkwork-models-standard.md)
- [TECH-33-sdkwork-models-install-flow.md](TECH-33-sdkwork-models-install-flow.md)
- [TECH-34-login-qrcode-system.md](TECH-34-login-qrcode-system.md)
- [TECH-35-high-volume-ledger-evolution.md](TECH-35-high-volume-ledger-evolution.md)
- [TECH-changelog.md](TECH-changelog.md)
- [TECH-deployment-modes-2.md](TECH-deployment-modes-2.md)
- [TECH-deployment-modes.md](TECH-deployment-modes.md)
- [TECH-initialization-2.md](TECH-initialization-2.md)
- [TECH-initialization.md](TECH-initialization.md)
- [TECH-legacy-14.md](TECH-legacy-14.md)
- [TECH-postgresql-database-configuration.md](TECH-postgresql-database-configuration.md)
- [TECH-postgresql-development.md](TECH-postgresql-development.md)
- [TECH-postgresql-production.md](TECH-postgresql-production.md)
- [TECH-provider-adapter-architecture.md](TECH-provider-adapter-architecture.md)
- [TECH-release-install-2.md](TECH-release-install-2.md)
- [TECH-release-install.md](TECH-release-install.md)
- [TECH-source-install-2.md](TECH-source-install-2.md)
- [TECH-source-install.md](TECH-source-install.md)
- [Historical standard alignment audit](TECH-standard-alignment-audit.md)
- [TECH-table-catalog.md](TECH-table-catalog.md)
- [TECH-topology-standard.md](TECH-topology-standard.md)
- [TECH-usage-2.md](TECH-usage-2.md)
- [TECH-usage.md](TECH-usage.md)
- [TECH-verification-code-delivery.md](TECH-verification-code-delivery.md)
- [TECH-version.md](TECH-version.md)
