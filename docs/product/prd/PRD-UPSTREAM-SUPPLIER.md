# Upstream Supplier Management

Status: active
Owner: claw-router-platform
Updated: 2026-07-28
Decision: `ADR-20260728-standardize-upstream-supplier-routing.md`

## Product Goal

Claw Router provides one standardized operator workflow for configuring any
official AI provider or relay supplier, attaching one or more credentialed
accounts, grouping those accounts for routing and settlement, and explaining
exactly why an API request selected or rejected each candidate.

## Product Dictionary

| Product concept | Meaning | Not the same as |
| --- | --- | --- |
| Upstream supplier | Official provider or relay business integration | Adapter implementation, account, endpoint |
| Supplier endpoint | One Base URL belonging to a supplier | Supplier identity |
| Authentication method | A supplier-supported auth protocol and its non-secret schema | Stored account credential |
| Upstream account | One credentialed, billable account at one supplier | Supplier or account group |
| Account group | A routable group of accounts with pricing and fallback policy | Pool, supplier |
| Resource | A model/API/capability that may be routed | Supplier adapter |

The Chinese UI uses “上游供应商”, “上游账号”, “账号分组”, “Base URL”,
“认证方式”, “资源”, and “资源分组”. It does not expose “站点”, “渠道”,
“供应商密钥”, “服务商”, or “池” for this capability.

## Supplier Workflow

An operator creates a supplier with a stable code, display name, supplier type
(`official` or `relay`), adapter, protocol, status, and optional website/docs
metadata. The supplier is not routable until it has at least one active
endpoint, one active authentication method, one allowed resource/resource
group, and one active account with a valid credential.

Supplier detail has Overview, Base URLs, Authentication, Resources, Accounts,
Health, and Audit tabs. Base URLs have independent region, environment,
priority, weight, timeout, and health. Authentication entries declare the
method and safe field schema; they never store a real credential.

## Account Workflow

An account selects exactly one supplier and one supported authentication
method. It may prefer one active endpoint from that supplier. The account owns
external account identity, encrypted credential reference, masked label,
credential expiry/rotation, quota, balance/currency, contract cost multiplier,
timeout/retry/circuit-breaker policy, health, and status.

Create and rotate forms accept secrets as write-only fields. Details and list
views never display or rehydrate raw credential material. Rotating creates a
new credential version atomically, makes it active only after validation, and
keeps audit facts without secret values.

## Account Group Workflow

An account group declares a stable code/name, routing strategy, priority,
fallback mode, cost multiplier, sale multiplier, optional capacity, status,
and resource/resource-group allowlist. Members must reference active accounts
in the same tenant and organization. Each member has a priority, routing
weight, effective interval, and optional cost multiplier override.

Changing routing weight never changes settlement cost. Changing a multiplier
never changes routing probability. The route-explain view displays effective
resources, eligible/rejected members, endpoint/auth compatibility, health and
quota reasons, selected strategy, fallback chain, and redacted decision facts.

## API Request Lifecycle

1. Authenticate and resolve tenant/API-key entitlement.
2. Normalize API operation and requested resource/model.
3. Select candidate account groups from routing policy.
4. Intersect supplier, group, and entitlement resources.
5. Filter by status, time window, region, auth, credential, quota, and health.
6. Apply strategy and fallback from a captured candidate snapshot.
7. Choose endpoint and credential version, then dispatch through the adapter.
8. Record result, usage, cost, sale amount, health feedback, and audit-safe
   route explanation.

No request may fall back across tenants, use a credential from another
account, route a resource absent from any of the three allowlists, or forward a
secret to an endpoint that did not pass egress validation.

## Roles And Permissions

| Capability | Read | Mutate | Sensitive action |
| --- | --- | --- | --- |
| Suppliers | `ai.upstream-suppliers.read` | `ai.upstream-suppliers.write` | endpoint test/sync requires write and audit |
| Accounts | `ai.upstream-accounts.read` | `ai.upstream-accounts.write` | credential create/rotate/revoke requires `ai.upstream-accounts.credentials.write` and rate limiting |
| Account groups | `ai.upstream-account-groups.read` | `ai.upstream-account-groups.write` | route explain requires read; publish/change requires write and audit |

All repository queries are tenant/organization scoped from typed request
context. Cross-tenant and absent objects return the same not-found response.

## API Contract Rules

Lists use standard `page`, `pageSize`, `items`, and page metadata. Identifiers
are string-encoded Snowflake values at JSON boundaries. Inputs declare length,
format, enum, numeric range, and unknown-field behavior. Success responses use
the standard envelope; failures use RFC 9457 Problem Details with stable
numeric codes, `traceId`, optional `i18nKey`, and safe field errors.

Credential input fields are write-only in OpenAPI. Supplier/account/group
responses are separate summary and detail DTOs. Provider error bodies,
internal endpoint hostnames not intended for operators, SQL errors, and stack
traces never cross the API boundary.

## Settlement Formula

```text
procurement_cost = reference_cost
                 * account.contract_cost_multiplier
                 * coalesce(member.cost_multiplier_override, group.cost_multiplier)

sale_amount = sale_reference_price * group.sale_multiplier
```

Currency conversion, rounding, minimum charge, and taxes remain owned by the
pricing/settlement policies. Every result records the pricing version and
multiplier snapshot used for reconciliation.

## Operational Requirements

- Supplier/account/group configuration changes are transactional, audited,
  versioned, and invalidate the routing snapshot after commit.
- Routing reads use an immutable cached snapshot; request hot paths do not
  perform N+1 control-plane queries.
- Health checks have bounded concurrency, timeout, redacted errors, and
  endpoint-level circuit state.
- Active configuration supports deterministic export, restore, and drift
  comparison without exporting secret material.
- Metrics have bounded labels and expose eligible-candidate count, rejection
  reason, selection strategy, fallback count, endpoint health, credential
  expiry horizon, and settlement failures.

## Acceptance Criteria

- The database, Rust types, SQL, API, generated Backend SDK, UI, tests, and
  canonical docs contain the same three product concepts and nine table names.
- Official suppliers and relay suppliers both support multiple Base URLs and
  multiple authentication methods.
- API Key and OAuth credentials can be created/rotated without any read API
  exposing raw material.
- Supplier/group/entitlement resource intersection is enforced and explained.
- Weighted, round-robin, least-latency, least-cost, and failover strategies are
  deterministic and covered by tests.
- Cost and sale multipliers are independently configurable and reconciled from
  immutable snapshots.
- No `integration_provider_account`, `integration_service_provider*`, provider
  secret API, site API, channel API, or pool entity remains in executable or
  canonical contract surfaces.
- Clean PostgreSQL installation, legacy migration verification, OpenAPI/SDK
  generation, Rust tests, frontend typecheck/tests, security scans, and
  documentation scans pass before release consideration.

