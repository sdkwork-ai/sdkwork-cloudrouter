# SDKWork Claw Router PRD

Status: active  
Owner: SDKWork maintainers  
Application: sdkwork-clawrouter  
Updated: 2026-07-31
Specs: `REQUIREMENTS_SPEC.md`, `DOCUMENTATION_SPEC.md`

## 1. Background And Problem

AI applications must integrate suppliers with different protocols, Base URLs,
credentials, resource catalogs, quotas, reliability, and billing rules. Direct
integration spreads those differences across every application and makes
failover, tenant isolation, settlement, audit, and cost reconciliation hard to
operate consistently.

Claw Router is a pre-launch, multi-tenant AI gateway. It provides a stable
OpenAI-compatible invocation surface, standardized upstream supplier control
plane, account-group routing, usage accounting, and generated management SDKs.
This document defines intended product behavior; it is not production-release
evidence.

## 2. Target Users

| Persona | Primary need |
| --- | --- |
| Application developer | One stable API and API key across supported AI resources |
| Platform operator | Supplier onboarding, account lifecycle, routing, failover, audit, and observability |
| Finance and procurement | Traceable supplier cost, customer charge, settlement, and reconciliation |
| Security engineer | Tenant isolation, write-only credentials, controlled egress, and auditable operations |
| SRE | Bounded traffic, health-aware routing, graceful degradation, and recoverable PostgreSQL operations |

## 3. Goals And Non-Goals

### Goals

- Present one consistent invocation surface while preserving provider-specific
  behavior behind adapters.
- Model upstream control-plane concepts unambiguously as supplier, account, and
  account group.
- Route deterministically from a captured, immutable candidate snapshot.
- Keep resource authorization, routing weight, procurement cost, and sale price
  as separate dimensions.
- Protect credentials from database, API, SDK, UI, logs, traces, and error-body
  disclosure.
- Use PostgreSQL as the only authoritative server database and support
  high-concurrency transaction semantics explicitly.
- Scale server replicas horizontally without runtime ID collisions. Every
  process uses a database-leased, fenced Snowflake node and stops issuing IDs
  or reporting ready when lease ownership cannot be proven.
- Generate app, backend, and open SDK families from reviewed API authorities.
- Produce usage, routing-decision, health, audit, and settlement facts required
  for commercial reconciliation.
- Bound every persisted pricing snapshot to 16 KiB, every durable accounting
  retry envelope to 32 KiB, and every settlement claim to 200 facts so finance
  recovery cannot create an unbounded in-process payload.
- Give operators a bounded, tenant-scoped analytics overview without losing
  integer or financial precision in API, SDK, or UI boundaries.
- Persist first-party Chat conversations, turns, visible messages, context
  snapshots, runtime references, and usage links with strict user isolation and
  concurrent-write correctness.

### Non-Goals

- A server-side SQLite fallback or a PostgreSQL schema mirror in SQLite.
- Supplier-specific columns or conditionals in the core routing domain.
- A second provider-account or service-provider aggregate alongside the
  upstream domain.
- Claiming unimplemented agent, memory, runtime-event, artifact, or full Chat
  lifecycle behavior from the current Chat persistence tables.
- Advertising OAuth support before authorization, refresh, revocation,
  encrypted persistence, audit, and failure recovery are implemented end to
  end.
- Claiming commercial production readiness from static checks or unit tests
  alone.

## 4. Scope

### Invocation Plane

- OpenAI-compatible inference entrypoints under `/v1`.
- Authentication, tenant and organization resolution, entitlement checks,
  request normalization, route planning, adapter dispatch, streaming, usage
  capture, and normalized error handling.
- Bounded request/response handling, timeout, retry, circuit-breaker, quota, and
  concurrency policies.

### Upstream Control Plane

- Official suppliers and relay suppliers.
- Multiple Base URLs and supplier-declared authentication methods.
- Supplier resource and resource-group allowlists.
- Upstream accounts with credentials, financial state, quota, and health.
- Account groups with members, routing strategy, fallback, resource allowlist,
  cost multiplier, and sale multiplier.
- Route explanation with eligibility and rejection reasons but no secrets.

The detailed product contract is
[PRD-UPSTREAM-SUPPLIER.md](PRD-UPSTREAM-SUPPLIER.md). The architecture decision
is
[ADR-20260728](../../architecture/decisions/ADR-20260728-standardize-upstream-supplier-routing.md).

### First-Party Chat

- Create, retrieve, and list user-owned conversations.
- Create a turn with its input message and pending output item, then complete
  that output with normalized message content, context snapshot, runtime
  reference, and optional usage linkage.
- List messages through bounded server-side pagination without loading a user's
  entire transcript into process memory.
- Persist the current eight-table Chat/runtime authority in PostgreSQL with
  tenant, organization, and user predicates on every read and mutation.
- Serialize per-conversation turn, item, and message ordinals under concurrent
  writers and fail closed on invalid or exhausted counters.

The implemented boundary does not yet include conversation rename/archive/
delete commands, agent and long-term-memory persistence, runtime event streams,
or runtime artifacts. Those capabilities require separate product contracts
and executable authorities before they may be advertised. Chat data ownership
is recorded in
[ADR-20260730](../../architecture/decisions/ADR-20260730-own-chat-runtime-postgres-authority.md).

### Product Surfaces

- Backend management API and `@sdkwork/clawrouter-backend-sdk` for operators.
- App API and `@sdkwork/clawrouter-app-sdk` for authenticated product clients.
- Open API and `@sdkwork/clawrouter-open-sdk` for public gateway consumers.
- PC console and admin application using generated SDK boundaries.
- Usage, finance, notification, settings, monitoring, and audit capabilities
  required to operate the gateway.

### Operational Analytics

The admin analytics overview is a PostgreSQL-backed read model exposed by
`GET /backend/v3/api/system/analytics/admin/overview` and generated as
`system.analytics.admin.overview.retrieve(...)` in
`@sdkwork/clawrouter-backend-sdk`. It reports summary totals, UTC trends, user
and model rankings, model/modality distributions, and deterministic insights
from tenant-scoped `ai_usage` and `ai_request_trace` facts.

- `time_range` accepts only `hourly`, `daily`, `weekly`, `monthly`, or `yearly`.
  The default is `daily`; every request has a bounded UTC start and end time.
- Explicit `start_time` and `end_time` are supplied together as ISO 8601 UTC
  timestamps. Reversed, partial, non-UTC, malformed, or oversized windows are
  rejected with `400` rather than widened silently.
- `ranking_size` defaults to `10` and is constrained to `3..=50`. The trend is
  limited to the latest 30 buckets. Per-user model distributions are computed
  only for users present in the bounded rankings.
- JSON int64 and fixed-point decimal values are strings. The generated SDK and
  UI preserve those strings; chart-only numeric projections are bounded to the
  JavaScript safe-integer range and never become financial authorities.
- All aggregates in one response use one PostgreSQL `REPEATABLE READ`,
  `READ ONLY` transaction so summaries, rankings, and distributions describe
  the same database snapshot.

## 5. User Scenarios

1. An operator creates an official or relay supplier, configures its Base URLs,
   authentication methods, and allowed resources.
2. The operator creates one or more supplier accounts, writes credentials, and
   verifies that list/detail APIs expose only masked metadata.
3. The operator creates an account group, assigns accounts, sets routing and
   financial multipliers independently, and publishes resource eligibility.
4. A client invokes a supported API. Claw Router authenticates the request,
   resolves entitlements, selects an eligible group/account/endpoint, dispatches
   through an adapter, and records a redacted decision and usage fact.
5. When an endpoint or account is unhealthy, routing applies the declared
   strategy and fallback policy without crossing tenant or resource boundaries.
6. Finance reconciles supplier costs, customer charges, account balances, and
   settlement ledger entries from immutable usage facts.
7. An authenticated product user creates a conversation, submits turns from
   multiple sessions or replicas, and receives a stable ordered transcript
   that cannot cross tenant, organization, or user boundaries.
8. An operator requests a bounded analytics window and compares exact usage,
   cost, error, user, and model aggregates from one consistent database
   snapshot without loading an unbounded tenant result set into memory.

## 6. Success Metrics

These are launch targets and require production-like evidence.

| Metric | Target |
| --- | --- |
| Cross-tenant authorization paths with negative tests | 100% |
| Raw upstream credential occurrences in read APIs, SDK DTOs, logs, and traces | 0 |
| Server persistence engines | PostgreSQL only |
| List/search operations using bounded store-level pagination | 100% |
| Retired upstream aggregates in production code and current contracts | 0 |
| API operations traceable to authority OpenAPI and generated SDK | 100% |
| Usage and settlement writes covered by transaction/idempotency evidence | 100% |
| Usage pricing snapshots over 16 KiB or retry envelopes over 32 KiB admitted | 0 |
| Admin analytics responses with bounded UTC windows, rankings, and exact string numerics | 100% |
| Server write replicas using healthy database-leased runtime IDs in readiness | 100% |
| Chat tables, reads, joins, and mutations binding tenant/org/user scope | 100% |
| Chat sequence collisions under accepted concurrent-write load | 0 |
| Release artifacts with checksum, signature, and SBOM | 100% |

Latency, throughput, recovery time, failover time, and memory ceilings must be
set and accepted from reproducible production-like load, soak, fault-injection,
backup/restore, and multi-replica tests. They are not inferred from design.

## 7. Phases

| Phase | Exit condition | Status |
| --- | --- | --- |
| Domain convergence | Supplier/account/account-group model, PostgreSQL schema, APIs, SDKs, UI, tests, and docs agree | In progress |
| Chat persistence convergence | Eight-table PostgreSQL authority, API/SDK pagination, concurrency, readiness, recovery, and docs agree | In progress |
| Production hardening | Security, streaming, financial, load, recovery, observability, and HA gates pass | Planned |
| Commercial beta | Clean release candidate, signed artifacts, runbooks, support controls, and reviewed evidence | Planned |
| General availability | Accepted SLO/SLA, operational history, recovery drills, and supply-chain evidence | Planned |

No phase may be promoted from documentation claims alone. The application
manifest remains `preLaunch: true` until the release gate is accepted.

## 8. Linked Requirements

- [Upstream supplier PRD](PRD-UPSTREAM-SUPPLIER.md)
- [Commercial production readiness](../requirements/REQ-2026-0001-commercial-production-readiness.md)
- [Technical architecture](../../architecture/tech/TECH_ARCHITECTURE.md)
- [Upstream supplier architecture decision](../../architecture/decisions/ADR-20260728-standardize-upstream-supplier-routing.md)
- [Chat PostgreSQL ownership decision](../../architecture/decisions/ADR-20260730-own-chat-runtime-postgres-authority.md)
- [Production-readiness revalidation](../../engineering/reviews/REVIEW-20260714-production-readiness-revalidation.md)
- [Security policy](../../SECURITY.md)
- [Commercial pricing](../../commercial/PRICING.md)
- [Edition tier matrix](../../legal/TIER_MATRIX.md)

## 9. Open Questions

- Which provider-specific OAuth flows should be implemented first after the
  common authorization, refresh, revocation, encryption, audit, and recovery
  contract is approved?
- Which routing strategies require distributed coordination instead of a
  read-only candidate snapshot plus health state?
- What measured throughput, p95/p99 latency overhead, stream concurrency, and
  process RSS ceilings are required for the first commercial beta topology?
