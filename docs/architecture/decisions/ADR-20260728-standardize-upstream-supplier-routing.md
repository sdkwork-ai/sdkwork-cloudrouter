# ADR-20260728-standardize-upstream-supplier-routing

Status: accepted
Requirement: upstream supplier standardization
Owner: claw-router-platform
Date: 2026-07-28
Specs: ARCHITECTURE_DECISION_SPEC.md, DATABASE_SPEC.md, DATABASE_FRAMEWORK_SPEC.md, API_SPEC.md, SDK_SPEC.md, SECURITY_SPEC.md, PRIVACY_SPEC.md, MIGRATION_SPEC.md

## Context

The current control plane splits one upstream integration across `ai_provider`,
`ai_site`, `ai_site_service`, `ai_channel`, and an independent provider-secret
API. The responsibilities overlap: protocol metadata, supplier identity, Base
URLs, credentials, health, resources, routing weights, and settlement fields
are stored in several places. Two additional `integration_*` prototypes are
wired into runtime stores even though their tables are not installable from the
Claw Router database authority.

This ambiguity makes it impossible to explain which record is the credential
authority or which resources an incoming API request may use. The application
is pre-launch, so retaining these public and persistence names as compatibility
aliases would create permanent debt without protecting an installed customer.

## Decision

The product and code use exactly three operator-facing aggregate names:

- **Upstream supplier**: an official provider or relay supplier. It owns
  identity, adapter selection, endpoints, supported authentication methods,
  and allowed resources/resource groups.
- **Upstream account**: one billable credential-bearing account at one
  supplier. It owns quota, balance, health, credential rotation, an optional
  preferred endpoint, and an account cost multiplier.
- **Account group**: a routing and settlement group containing upstream
  accounts. It owns routing strategy, group priority, sale multiplier, cost
  multiplier, fallback behavior, and allowed resources/resource groups.

The canonical tables are:

| Table | Responsibility |
| --- | --- |
| `ai_upstream_supplier` | Supplier identity, type, adapter, protocol, health, and presentation metadata |
| `ai_upstream_supplier_endpoint` | One of multiple supplier Base URLs, priority, weight, region, timeout, and health |
| `ai_upstream_supplier_auth_method` | Supported authentication method and non-secret configuration schema |
| `ai_upstream_supplier_resource` | Supplier resource/resource-group allowlist |
| `ai_upstream_account` | Supplier account, preferred endpoint, financial state, policies, and health |
| `ai_upstream_account_credential` | The only credential authority; encrypted/reference material is write-only |
| `ai_upstream_account_group` | Routing strategy, fallback, capacity, sale multiplier, and cost multiplier |
| `ai_upstream_account_group_member` | Account membership, priority, routing weight, and optional cost override |
| `ai_upstream_account_group_resource` | Account-group resource/resource-group allowlist |

`ai_resource` and `ai_resource_group` remain model-catalog authorities.
`ai_provider_object_route` remains the sticky provider-object route table
because “provider” in that name describes an external object identity, not a
control-plane supplier aggregate. Its foreign-key-like fields use upstream
account and account-group terminology.

`adapter_code` selects a code/plugin adapter registry. An adapter is not a
database or product entity. Adding a new adapter implements the existing
adapter port and registers a code; it does not add supplier-specific columns to
the core tables.

`ai_upstream_account_credential` is the sole secret authority. Supplier and
endpoint tables never contain credentials. API responses return only a masked
label, auth method, timestamps, and status. Raw API keys, OAuth client secrets,
access tokens, and refresh tokens are accepted only on create/rotate commands,
encrypted or converted to an approved secret reference before commit, and
never returned or logged.

An account inherits the supplier resource set. An account-specific resource
join is intentionally absent. An account may select `preferred_endpoint_id`;
otherwise all active compatible supplier endpoints are candidates. If two
endpoints have materially different auth, resources, ownership, or settlement
identity, operators create separate suppliers.

Pricing dimensions are distinct:

- `routing_weight` controls traffic distribution only.
- `contract_cost_multiplier` on an account models its upstream contract cost.
- `cost_multiplier` on a group adjusts procurement/settlement cost.
- `sale_multiplier` on a group adjusts downstream sale price.
- `cost_multiplier_override` on a member is an explicit exceptional override.

No generic `rate_multiplier`, `official_price_multiplier`, or `pool` entity is
retained.

## Routing Decision

For every admitted API request, the route planner performs these steps in
order and records the result in the routing decision log:

1. Resolve the verified tenant, organization, API key/token, requested API,
   model/resource, region, and idempotency/sticky identity from typed request
   context.
2. Resolve API-key/tenant entitlements and the ordered candidate account
   groups selected by routing policy and rules.
3. Compute effective resources as `supplier allowlist` intersection `account
   group allowlist` intersection `API-key/tenant entitlement`.
4. Reject candidates whose resource, protocol, region, effective window,
   account state, credential state, quota, or circuit-breaker state is not
   eligible.
5. Rank group members by policy priority and account-group member priority,
   then apply the group's declared strategy: weighted, round-robin,
   least-latency, least-cost, or failover. Strategy implementations share one
   candidate contract and are extensible through a selector registry.
6. Rank compatible supplier endpoints by preferred endpoint, endpoint
   priority, health, region affinity, and weight. Resolve exactly one supported
   auth method and credential version.
7. Reserve quota/concurrency, dispatch through the adapter selected by
   `adapter_code`, normalize errors, and retry only when policy and request
   idempotency permit it.
8. Commit sticky identity, health feedback, usage, procurement cost, sale
   amount, settlement facts, and an audit-safe decision snapshot. Secrets and
   complete provider payloads are excluded.

The planner depends on ports for entitlements, candidate loading, health,
quota, credential resolution, adapter dispatch, and accounting. SQL and HTTP
types do not enter the domain selector.

## API And UI Boundary

Backend operations use plural REST resources beneath `/backend/v3/api/ai`:

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

Mutations use `POST`, `PATCH`, and `DELETE`; list operations use `GET` with the
standard offset pagination contract. Credential rotation is an explicit
rate-limited command. The Backend OpenAPI contract is the source for the
generated Backend SDK. The PC admin UI consumes only that SDK.

The navigation exposes “上游供应商”, “上游账号”, and “账号分组”. Supplier
detail uses tabs for endpoints, authentication methods, and resources. Account
detail does not duplicate supplier capability configuration.

## Migration

Because the application has not launched, the canonical baseline is replaced
without permanent compatibility APIs. A forward migration is still supplied
for developer and review databases:

| Previous source | Canonical target |
| --- | --- |
| `ai_provider` plus `ai_site` | `ai_upstream_supplier` |
| `ai_site_service` and supplier Base URL fields | `ai_upstream_supplier_endpoint` and `ai_upstream_supplier_auth_method` |
| `ai_channel` | `ai_upstream_account` |
| `ai_channel_credential` plus `integration_provider_account` | `ai_upstream_account_credential` |
| `ai_channel_group*` | `ai_upstream_account_group*` |
| `ai_channel_resource` | supplier resource bindings after ownership validation |
| `integration_service_provider*` | removed; no installable or supported authority existed |

The migration is expand, backfill, verify, then contract. Verification fails
closed on orphan accounts, duplicate supplier/account codes, unresolved
credential ownership, endpoint-less active suppliers, invalid member
references, or resource bindings that cannot be assigned. Destructive cleanup
is not attempted after a failed verification. Rollback after contract is a
reviewed restore/forward-fix operation because converting OAuth and resource
ownership back to the ambiguous model is lossy.

## Alternatives

**Keep `provider`, `site`, and `channel` as aliases.** Rejected because an
operator still cannot identify the supplier, account, or credential authority,
and every new adapter would need to understand historical aliases.

**Create `ai_upstream_pool`.** Rejected because the product concept is an
account group. A pool name adds no independent lifecycle or invariant.

**Keep the integration provider-account/service-provider modules.** Rejected
because they duplicate the same aggregate, are not part of the installable
database, and would create two credential and settlement authorities.

**Add account-resource and account-endpoint join tables immediately.** Rejected
until a real requirement needs them. Supplier resources and an optional
preferred endpoint cover the current behavior with fewer invalid states.

## Consequences

The public management API and generated SDK have a deliberate pre-launch
breaking change. Existing code and tests must move together; no deprecated
route aliases remain. The database model gains several small, cohesive tables
but removes overloaded JSON/foreign-key-like fields and duplicate secret
stores. Supplier-specific behavior is isolated behind adapters and registries,
while routing and finance dimensions remain independently testable.

## Verification

- Schema registry, generated PostgreSQL DDL, manifest, indexes, and migration
  checks agree on the nine canonical tables and contain no retired tables.
- PostgreSQL migration tests cover clean install, legacy backfill, orphan
  rejection, secret redaction, uniqueness, and tenant isolation.
- Rust unit/integration tests cover resource intersection, every routing
  strategy, fallback, endpoint selection, credential compatibility, quota,
  circuit breaking, audit redaction, and cross-tenant denial.
- OpenAPI/SDK generation checks prove route, operationId, input/output,
  pagination, Problem Details, auth, permission, and rate-limit parity.
- PC tests prove generated Backend SDK usage and loading, empty, validation,
  permission, unavailable, and unknown-error states.
- A repository scan rejects retired product/table/API terms outside this ADR's
  migration mapping and migration fixtures.

## Supersedes / Superseded By

This decision supersedes the upstream configuration portions of
`TECH-2026-05-22-provider-adapter-invocation-design.md`,
`TECH-2026-05-25-channel-group-channel-association.md`, and
`TECH-2026-06-09-api-relay-provider-platform-design.md`.

