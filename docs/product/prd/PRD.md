# SDKWork Claw Router PRD

Status: active  
Owner: SDKWork maintainers  
Application: sdkwork-clawrouter  
Updated: 2026-07-29  
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
- Generate app, backend, and open SDK families from reviewed API authorities.
- Produce usage, routing-decision, health, audit, and settlement facts required
  for commercial reconciliation.

### Non-Goals

- A server-side SQLite fallback or a PostgreSQL schema mirror in SQLite.
- Supplier-specific columns or conditionals in the core routing domain.
- A second provider-account or service-provider aggregate alongside the
  upstream domain.
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

### Product Surfaces

- Backend management API and `@sdkwork/clawrouter-backend-sdk` for operators.
- App API and `@sdkwork/clawrouter-app-sdk` for authenticated product clients.
- Open API and `@sdkwork/clawrouter-open-sdk` for public gateway consumers.
- PC console and admin application using generated SDK boundaries.
- Usage, finance, notification, settings, monitoring, and audit capabilities
  required to operate the gateway.

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
| Release artifacts with checksum, signature, and SBOM | 100% |

Latency, throughput, recovery time, failover time, and memory ceilings must be
set and accepted from reproducible production-like load, soak, fault-injection,
backup/restore, and multi-replica tests. They are not inferred from design.

## 7. Phases

| Phase | Exit condition | Status |
| --- | --- | --- |
| Domain convergence | Supplier/account/account-group model, PostgreSQL schema, APIs, SDKs, UI, tests, and docs agree | In progress |
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
