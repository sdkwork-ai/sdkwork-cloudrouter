# SDKWork Claw Router Technical Architecture

Status: active
Owner: SDKWork maintainers
Updated: 2026-06-27
Specs: ARCHITECTURE_DECISION_SPEC.md, DOCUMENTATION_SPEC.md

This document is the **single entry point** for the Claw Router technical
architecture. It provides the global view (technology stack, module
boundaries, data ownership, deployment topology, security boundary,
verification) and links to detailed TECH shards for deep dives.

> Commercial/SOC2 reviewers: read sections 1-7 in order. New engineers:
> read sections 1-4 then jump to the linked TECH shard for your module.
> The audit facts in `generated/audit/standard-alignment-facts.json` are
> the machine-checkable mirror of section 9.

## 1. Architecture Overview

Claw Router is a multi-tenant AI gateway that exposes OpenAI-compatible and
provider-native APIs, routes traffic to upstream AI providers (OpenAI,
Anthropic, Google, Volcengine, Tencent, Alicloud, etc.), enforces per-tenant
authentication, quota, billing, circuit breaking, idempotency, and sticky
routing, then records usage for settlement.

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

## 2. Technology Choices

| Layer | Technology | Version pin | Rationale |
| --- | --- | --- | --- |
| Gateway core | Rust + axum 0.8 + hyper + tokio | rust-toolchain 1.79.0 | p95 latency overhead target < 50 ms; zero-cost abstractions |
| HTTP client | hyper-rustls + webpki-roots | workspace dep | TLS by default; no native-tls OpenSSL dependency |
| Database (prod) | PostgreSQL 16+ via sqlx | `sdkwork-database-sqlx` | Streaming replication, range partitioning for high-traffic tables |
| Database (dev/desktop) | SQLite via sqlx | `sdkwork-database-sqlx` | Zero-config desktop bundling; same schema baseline |
| Cache / distributed coordination | Redis 7+ | `sdkwork-claw-config::redis` | Circuit breaker + idempotency + sticky session HA store |
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
│  │  Alicloud (stub) / Suno / ElevenLabs / Midjourney    │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### Module Ownership Matrix

| Module | Owner crate | Responsibility | Cannot import |
| --- | --- | --- | --- |
| HTTP entry + auth | `crates/sdkwork-claw-http` | TLS termination, app session token, API key auth, contract fallback | router-service internals |
| Gateway assembly | `crates/sdkwork-clawrouter-cloud-gateway` | Edge server, invocation router wiring, OpenAI passthrough path table, provider-native passthrough | sqlx stores directly |
| Service layer | `services/sdkwork-clawrouter-router-service` | 13-interceptor invocation pipeline, OpenAI handlers, billing, pricing, settlement, payment adapters | axum router assembly |
| App API | `services/sdkwork-clawrouter-standalone-gateway` | Consumer portal HTTP handlers (`/app/v3/api/*`) | gateway internals |
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
├── package.json               # pnpm workspace scripts
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
│   └── sdkwork-routes-{llm,iaas,paas}-open-api/  # route manifests
├── services/                 # runnable Rust binaries
│   ├── sdkwork-clawrouter-router-service/  # core service layer
│   ├── sdkwork-clawrouter-standalone-gateway/  # /app/v3/api/*
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
| `commerce_*` | sdkwork-commerce (sibling repo) | commerce service | claw-router (read-only) |
| `ops_*` | router-service | ops workers (heartbeat, audit, metrics, jobs) | admin-api |
| `integration_*` | router-service | provider integration | admin-api |
| `analytics_*` | router-service | analytics rollup worker | admin-api |
| `c_category` | sdkwork-commerce | commerce service | claw-router (read-only) |
| `system_*` | router-service installer | clawrouterctl | all (schema migration state) |

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

### Cryptographic Material

- App session token signing keys: rotate every 90 days
- API key pepper: ≥32 characters, env or file source
- Redis TLS: required in production (`redis://` → `rediss://`)
- PostgreSQL: `sslmode=require` in production
- Container images: cosign signing (configured, implementation P0)
- SBOM: CycloneDX + SPDX (cargo covered, npm coverage P0)

Detailed security: [TECH-08-securitydesign.md](TECH-08-securitydesign.md)

### Observability

| Signal | Implementation | Status |
| --- | --- | --- |
| Structured logs | `tracing` + EnvFilter + 4 LogFormat (compact/json/pretty/full) | Production |
| Metrics | `sdkwork-claw-http::metrics` 5 AtomicU64 counters | Beta (P0: add Prometheus histogram + labels) |
| Distributed tracing | `sdkwork-claw-observability::tracing_setup` | Beta (P0: add OTLP exporter) |
| Health checks | `/healthz` (liveness) + `/readyz` (readiness with combineable checks) | Production |
| Audit log | `ops_audit_log` table | Production |

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

### Kubernetes Topology (production)

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
`scripts/refresh-standard-alignment-audit.mjs` from the repository source
of truth. It is the single source of truth for P0 status tracking.

```bash
node scripts/refresh-standard-alignment-audit.mjs           # regenerate
node scripts/refresh-standard-alignment-audit.mjs --check   # CI drift check
node scripts/refresh-standard-alignment-audit.mjs --strict  # fail if any P0 pending
```

Current status: see `docs/standard-alignment-audit.md` for the curated
human-readable audit and `generated/audit/standard-alignment-facts.json`
for the machine-checkable facts.

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
- [TECH-2026-05-22-admin-product-center-design.md](TECH-2026-05-22-admin-product-center-design.md)
- [TECH-2026-05-22-admin-product-center.md](TECH-2026-05-22-admin-product-center.md)
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
- [TECH-standard-alignment-audit.md](TECH-standard-alignment-audit.md)
- [TECH-table-catalog.md](TECH-table-catalog.md)
- [TECH-topology-standard.md](TECH-topology-standard.md)
- [TECH-usage-2.md](TECH-usage-2.md)
- [TECH-usage.md](TECH-usage.md)
- [TECH-verification-code-delivery.md](TECH-verification-code-delivery.md)
- [TECH-version.md](TECH-version.md)
