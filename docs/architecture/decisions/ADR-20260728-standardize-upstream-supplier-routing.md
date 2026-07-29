# ADR-20260728: Standardize Upstream Supplier Routing

Status: accepted  
Owner: claw-router-platform  
Updated: 2026-07-29  
Requirement: upstream supplier standardization

## Context

The earlier control plane distributed one upstream integration across provider,
site, service, channel, provider-secret, and prototype integration entities.
Supplier identity, Base URLs, authentication, credentials, resources, routing,
health, and settlement therefore had overlapping owners. Operators and code
could not tell whether a provider, site, channel, or integration record was the
source of truth.

The application is pre-launch. Preserving those aliases would make every new
adapter implement ambiguous compatibility behavior and would create multiple
credential and financial authorities.

## Decision

The product and implementation use exactly three upstream aggregates:

- **Upstream supplier**: an official provider or relay business integration.
  It owns identity, type, adapter/protocol selection, Base URLs, supported
  authentication methods, and allowed resources/resource groups.
- **Upstream account**: one credential-bearing, billable account at one
  supplier. It owns credential lifecycle, quota, balance, contract cost,
  runtime policy, health, and optional preferred endpoint.
- **Upstream account group**: a routing and settlement group. It owns members,
  routing strategy, fallback, resource allowlist, cost multiplier, sale
  multiplier, and capacity policy.

There is no separate upstream pool aggregate. "Account group" is the product
and code term because grouping accounts is its lifecycle and invariant.

## Data Ownership

### Configuration Authorities

| Table | Responsibility |
| --- | --- |
| `ai_upstream_supplier` | Supplier identity, type, adapter, protocol, and lifecycle |
| `ai_upstream_supplier_endpoint` | Supplier Base URLs, priority, weight, region, and timeout |
| `ai_upstream_supplier_auth_method` | Supported authentication policy and non-secret schema |
| `ai_upstream_supplier_resource` | Supplier resource/resource-group allowlist |
| `ai_upstream_account` | Supplier account, preferred endpoint, finance, policy, and lifecycle |
| `ai_upstream_account_credential` | Versioned encrypted credential authority |
| `ai_upstream_account_group` | Routing, fallback, capacity, sale, and cost policy |
| `ai_upstream_account_group_member` | Account membership, priority, routing weight, and cost override |
| `ai_upstream_account_group_resource` | Account-group resource/resource-group allowlist |

### Operational Authorities

| Table | Responsibility |
| --- | --- |
| `ai_upstream_account_health_state` | Current account health, latency, and consecutive error state |
| `ai_upstream_supplier_endpoint_health_state` | Current endpoint health, latency, and consecutive error state |
| `ai_upstream_account_group_metric_snapshot` | Rebuildable group-level operational metrics |

`ai_resource` and `ai_resource_group` remain catalog authorities.
`ai_provider_object_route` remains valid because "provider" there describes an
external object identity, not the control-plane supplier aggregate.

An account inherits the supplier resource set. There is no account-resource
join until a concrete requirement needs a narrower account capability. An
account may select `preferred_endpoint_id`; otherwise compatible active
supplier endpoints are candidates. Materially different ownership,
authentication, resources, or settlement identity requires a separate
supplier rather than endpoint-level exceptions.

## Credentials And Authentication

`ai_upstream_account_credential` is the only secret authority. Supplier and
endpoint tables never contain credentials. Secret input is write-only;
responses expose masked metadata, method, timestamps, version, and status only.

The implemented policies are:

- `api_key`
- `bearer_token`
- `custom`

OAuth is an extension point, not a declared working policy. Adding it requires
complete authorization, callback validation, refresh, revocation, encrypted
token persistence, audit, failure recovery, and operator-state behavior.

Credential material is encrypted before commit and never returned, logged,
traced, or embedded in route explanations. Rotation creates a new version and
changes active state atomically after validation.

## Pricing Dimensions

- `routing_weight` controls traffic distribution only.
- `contract_cost_multiplier` on an account models upstream contract cost.
- `cost_multiplier` on a group adjusts procurement/settlement cost.
- `sale_multiplier` on a group adjusts downstream sale price.
- `cost_multiplier_override` on a member is an explicit exceptional override.

No generic `rate_multiplier`, `official_price_multiplier`, or pool entity is a
replacement for these dimensions.

## Routing Decision

For each admitted request, the planner:

1. Resolves verified tenant, organization, API key, permission, operation,
   resource/model, region, and idempotency/sticky identity.
2. Resolves ordered account groups from routing policy and entitlements.
3. Computes supplier/group/entitlement resource intersection.
4. Rejects candidates by scope, lifecycle, effective interval, protocol,
   region, auth, credential, quota, health, and circuit state.
5. Applies failover, weighted, round-robin, least-latency, or least-cost
   selection through one selector contract.
6. Ranks compatible endpoints, resolves one credential version, validates the
   egress target, and dispatches through the registered adapter.
7. Records redacted decision, usage, health, procurement cost, sale amount,
   audit, and settlement facts.

The route catalog exposes `Arc<[UpstreamAccountRoute]>`. Refresh publishes an
immutable `ArcSwap` snapshot; requests do not deep-copy the candidate catalog
or hold a lock across provider awaits.

## API And UI Boundary

Backend management resources live beneath `/backend/v3/api/ai`:

- `/upstream_suppliers`
- `/upstream_suppliers/{supplierId}/endpoints`
- `/upstream_suppliers/{supplierId}/auth_methods`
- `/upstream_suppliers/{supplierId}/resources`
- `/upstream_accounts`
- `/upstream_accounts/{accountId}/credentials`
- `/upstream_account_groups`
- `/upstream_account_groups/{groupId}/members`
- `/upstream_account_groups/{groupId}/resources`
- `/upstream_account_groups/{groupId}/route_explain`

HTTP list queries use `page` and `page_size`; generated TypeScript parameters
use `page` and `pageSize`. Mutations use explicit request DTOs, idempotency and
optimistic concurrency where required, standard success envelopes, and RFC
9457 Problem Details. Credential commands are rate-limited and audited.

The Backend OpenAPI authority generates `@sdkwork/clawrouter-backend-sdk`. The
PC admin surface consumes that package through its package-owned SDK boundary;
it does not use raw HTTP or a local compatibility SDK.

The navigation terms are "上游供应商", "上游账号", and "账号分组". Supplier
detail owns endpoints, authentication methods, and resources. Account detail
does not duplicate supplier capability configuration.

## Pre-Launch Convergence

The canonical PostgreSQL baseline replaces the ambiguous model. No production
legacy-data migration, compatibility reader, write-through bridge, deprecated
route alias, or SQLite server mirror is retained. Existing developer databases
must be recreated from the baseline.

The conceptual replacement is:

| Retired concept | Canonical target |
| --- | --- |
| provider plus site | upstream supplier |
| site service or supplier Base URL fields | supplier endpoint and auth method |
| channel | upstream account |
| channel credential or integration provider account | upstream account credential |
| channel group or upstream pool | upstream account group |
| channel resource | supplier resource after ownership validation |
| integration service provider | removed duplicate aggregate |

If real production data exists before this decision is revisited, a separate
reviewed migration must define backfill, verification, cutover, rollback, and
recovery. This conceptual map is not an executable migration promise.

## Alternatives Rejected

**Keep provider, site, and channel aliases.** Rejected because the authority
remains ambiguous and adapters inherit legacy coupling.

**Create `ai_upstream_pool`.** Rejected because it adds no lifecycle or
invariant beyond an account group.

**Keep integration provider-account/service-provider modules.** Rejected
because they duplicate supplier/account, credential, and settlement ownership.

**Add account-resource and account-endpoint joins now.** Rejected until a real
requirement needs them. Supplier resources and an optional preferred endpoint
cover current behavior with fewer invalid states.

## Consequences

The management API and generated SDK have a deliberate pre-launch breaking
change. Code, contracts, generated artifacts, UI, tests, schema, and docs move
together. Supplier-specific behavior stays behind adapter registries while
routing and finance remain independently testable.

## Verification

- Schema registry, PostgreSQL DDL, generated schema, table registry, and docs
  agree on configuration and operational-state ownership.
- PostgreSQL tests cover uniqueness, tenant isolation, transactions, secret
  redaction, and route snapshot loading.
- Rust tests cover resource intersection, all strategies, fallback, endpoint
  and credential compatibility, quota/health rejection, and cross-tenant denial.
- OpenAPI and generated SDK checks cover paths, operation IDs, input/output,
  pagination, Problem Details, permissions, and write-only secrets.
- PC tests prove Backend SDK use and loading, empty, validation, permission,
  unavailable, and unknown-error states.
- Repository scans reject retired production names outside this decision's
  explanatory replacement table and explicit negative guards.

## Supersedes

This decision supersedes the upstream configuration portions of older provider
adapter, channel-group, and relay-provider design documents. Those documents
must not be used as current upstream architecture authority.
