# Upstream Supplier Management

Status: active  
Owner: claw-router-platform  
Updated: 2026-07-29  
Decision: [ADR-20260728](../../architecture/decisions/ADR-20260728-standardize-upstream-supplier-routing.md)

## Product Goal

Claw Router provides one standardized operator workflow for configuring an
official AI provider or relay supplier, attaching credentialed accounts,
grouping those accounts for routing and settlement, and explaining why an API
request selected or rejected each candidate.

## Product Dictionary

| Product concept | Meaning | Not the same as |
| --- | --- | --- |
| Upstream supplier | Official provider or relay business integration | Adapter implementation, account, endpoint |
| Supplier endpoint | One Base URL belonging to a supplier | Supplier identity |
| Authentication method | Supplier-supported auth policy and non-secret schema | Stored account credential |
| Upstream account | One credentialed, billable account at one supplier | Supplier or account group |
| Account group | Routable group of accounts with routing and financial policy | Pool or supplier |
| Resource | Model, API, or capability that may be routed | Supplier adapter |

The Chinese UI uses "上游供应商", "上游账号", "账号分组", "Base URL",
"认证方式", "资源", and "资源分组". It does not use "站点", "渠道",
"供应商密钥", "服务商", or "池" for this capability.

## Supplier Workflow

An operator creates a supplier with a stable code, display name, supplier type
(`official` or `relay`), adapter, protocol, status, and optional website/docs
metadata. A supplier is not routable until it has an active endpoint, supported
authentication method, allowed resource or resource group, and an eligible
account with an active credential.

Supplier detail contains Overview, Base URLs, Authentication, Resources,
Accounts, Health, and Audit views. Each Base URL has independent region,
environment, priority, weight, timeout, and health. Authentication entries
declare safe configuration schemas; they never store real credential material.

## Account Workflow

An account selects exactly one supplier and one authentication method supported
by that supplier. It may prefer one active endpoint. It owns external account
identity, credential lifecycle, masked label, quota, balance/currency, contract
cost multiplier, timeout/retry/circuit policy, health, and status.

Credential create and rotate forms accept secret material as write-only input.
List, detail, create, and rotate responses never display or rehydrate the raw
secret. Rotation creates a new encrypted credential version atomically, changes
the active version only after command validation, and writes audit facts without
secret values.

The implemented credential policies are `api_key`, `bearer_token`, and
`custom`. OAuth is an extension point, not a working capability. A future OAuth
policy must implement authorization, callback validation, token refresh,
revocation, encrypted token persistence, audit, failure recovery, and safe
operator states before it is added to the supported registry.

## Account Group Workflow

An account group declares a stable code/name, routing strategy, priority,
fallback mode, cost multiplier, sale multiplier, optional capacity, status, and
resource/resource-group allowlist. Members reference accounts in the same tenant
and organization. Each member has priority, routing weight, effective interval,
and an optional cost multiplier override.

Routing weight changes traffic distribution only. Cost and sale multipliers
change financial calculations only. Route explanation displays effective
resources, eligible and rejected members, endpoint/auth compatibility, health
and quota reasons, selected strategy, fallback chain, and redacted decision
facts.

## API Request Lifecycle

1. Authenticate and resolve tenant, organization, API key, and entitlements.
2. Normalize API operation and requested resource/model.
3. Resolve ordered account groups from routing policy.
4. Intersect supplier, group, and entitlement resources.
5. Filter by lifecycle, time window, protocol, region, auth, credential, quota,
   health, and circuit state.
6. Apply the group strategy and fallback from one immutable candidate snapshot.
7. Select a compatible endpoint and active credential version, validate egress,
   and dispatch through the adapter.
8. Record result, usage, cost, sale amount, health feedback, settlement, and an
   audit-safe route explanation.

No request may fall back across tenants, use another account's credential,
route a resource absent from the effective allowlist, or attach a secret before
the target passes egress validation.

## Roles And Permissions

| Capability | Read | Mutate | Sensitive action |
| --- | --- | --- | --- |
| Suppliers | `ai.upstream-suppliers.read` | `ai.upstream-suppliers.write` | Endpoint test/sync requires write permission and audit |
| Accounts | `ai.upstream-accounts.read` | `ai.upstream-accounts.write` | Credential create/rotate/revoke requires credential-write permission and rate limiting |
| Account groups | `ai.upstream-account-groups.read` | `ai.upstream-account-groups.write` | Route explain requires read; publish/change requires write and audit |

Repository queries derive tenant and organization scope from typed request
context. Cross-tenant and absent objects return the same not-found response.

## API Contract Rules

List HTTP queries use `page` and `page_size`. JSON responses and generated SDK
models use camelCase, including `pageSize`, with `items` and standard page
metadata. Pagination is executed in the repository query, not by materializing
an unbounded collection in process.

Identifiers are string-encoded Snowflake values at JSON boundaries. Inputs
declare length, format, enum, numeric range, and unknown-field behavior. Success
responses use the standard envelope; failures use RFC 9457 Problem Details with
stable numeric codes, `traceId`, optional `i18nKey`, and safe field errors.

Credential fields are `writeOnly` in OpenAPI. Supplier, account, and group
responses use explicit DTOs. Provider error bodies, internal-only endpoint
details, SQL errors, stack traces, and secret material never cross the API
boundary.

## Settlement Formula

```text
procurement_cost = reference_cost
                 * account.contract_cost_multiplier
                 * coalesce(member.cost_multiplier_override, group.cost_multiplier)

sale_amount = sale_reference_price * group.sale_multiplier
```

Currency conversion, rounding, minimum charge, and tax policy remain owned by
pricing and settlement. Every result records the pricing version and multiplier
snapshot used for reconciliation.

## Operational Requirements

- Supplier, account, and group mutations are transactional, audited, versioned,
  and invalidate the routing snapshot only after commit.
- Routing reads use an immutable cached snapshot and avoid N+1 control-plane
  queries and per-request route deep copies.
- Health checks have bounded concurrency and timeout, redacted errors, and
  dedicated account/endpoint health-state authorities.
- Configuration export, restore, and drift comparison exclude secret material.
- Metrics use bounded labels and expose candidate count, rejection reason,
  strategy, fallback count, health, credential expiry, and settlement failure.
- PostgreSQL is the only authoritative server database. Server runtime never
  falls back to SQLite.

## Acceptance Criteria

- Database contracts, PostgreSQL DDL, Rust types, SQL, API, generated Backend
  SDK, UI, tests, and Canon docs use the same supplier/account/account-group
  ownership model.
- Official and relay suppliers support multiple Base URLs and declared
  authentication methods.
- `api_key`, `bearer_token`, and `custom` credentials can be created and rotated
  without any read response exposing raw material.
- Supplier/group/entitlement resource intersection is enforced and explained.
- Weighted, round-robin, least-latency, least-cost, and failover strategies are
  deterministic and covered by tests.
- Cost and sale multipliers are independently configurable and reconciled from
  immutable snapshots.
- No retired provider/site/channel/pool or duplicate integration aggregate
  remains in executable or current contract surfaces.
- Clean PostgreSQL installation, contract generation, Rust tests, frontend
  checks, security scans, pagination validation, and documentation scans pass
  before release consideration.
