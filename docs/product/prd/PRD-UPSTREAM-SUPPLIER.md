# Upstream Supplier Management

Status: active  
Owner: cloud-router-platform  
Updated: 2026-08-06  
Decision: [ADR-20260728](../../architecture/decisions/ADR-20260728-standardize-upstream-supplier-routing.md)  
Architecture: [TECH-2026-05-10-group-account-pool-routing](../../architecture/tech/TECH-2026-05-10-group-account-pool-routing.md)

## Product Goal

Cloud Router provides one standardized operator workflow for configuring an
official AI provider or relay supplier, attaching credentialed accounts,
grouping those accounts for routing and settlement, and explaining why an API
request selected or rejected each candidate. It also serves as the account-pool
routing gateway for product consumers (e.g. SDKWork Agents chat): consumers
authenticate with their login auth token — **no per-user API key or upstream
credential configuration is required** — and Cloud Router routes the model
request through the tenant's default account group, managing resource usage,
health, quota, and settlement centrally.

## Product Dictionary

| Product concept | Meaning | Not the same as |
| --- | --- | --- |
| Upstream supplier | Official provider or relay business integration | Adapter implementation, account, endpoint |
| Supplier endpoint | One Base URL belonging to a supplier | Supplier identity |
| Authentication method | Supplier-supported auth policy and non-secret schema | Stored account credential |
| Upstream account | One credentialed, billable account at one supplier | Supplier or account group |
| Account group | Routable group of accounts with routing and financial policy | Pool or supplier |
| Resource | Model, API, or capability that may be routed | Supplier adapter |
| API key credential | Gateway credential (`sk-`/`sp-` prefixed) bound to a group | Upstream account credential |
| Auth token credential | Product login token accepted by the gateway auth-token channel | API key credential |

The Chinese UI uses "上游供应商", "上游账号", "账号分组", "Base URL",
"认证方式", "资源", and "资源分组". It does not use "站点", "渠道",
"供应商密钥", "服务商", or "池" for this capability.

## Authentication

The OpenAI-compatible open API accepts a single `Authorization: Bearer`
credential and classifies it by prefix (default `sk-` / `sp-`):

- **API key channel**: `sk-`/`sp-` prefixed credentials are resolved through
  the gateway API key store (`iam_gateway_api_key`), which binds the key to a
  default account group and optional multi-group route bindings (priority and
  weight).
- **Auth token channel**: any other bearer value is treated as a product login
  auth token, resolved through IAM to the tenant/organization/user identity,
  and routed through the tenant's **default account group** (`code="default"`,
  name `Default`). The channel is available to product integrations such as
  SDKWork Agents chat, enabling **API-key-free chat** where resource usage is
  managed by the account pool.

Both channels produce the same identity context consumed by the route selector.
The auth-token channel is an injectable authenticator (fails closed when not
wired).

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

### Supplier Types

- **Official supplier (`official`)** is a direct integration with a model
  vendor's official API. It **must** bind a vendor (`defaultVendorCode`) from
  the resource catalog; the adapter and protocol suggestions are carried over
  from the selected vendor and remain operator-editable. The operator may grant
  the vendor's full resource set with one action.
- **Relay supplier (`relay`)** is a third-party aggregation service. It does
  not bind a vendor and may grant any resources or resource groups.

The supplier type is immutable in behavior only; an operator may change it
later, but an official supplier must keep a bound vendor at all times.

### Supported Resources

Resource granting is part of the create flow, not a post-creation step: the
operator picks resources (vendor, modality, or API-endpoint level) and/or
resource groups in the same form, and the grant is persisted atomically with
the supplier identity through a create-then-replace sequence. The picker loads
the read-only resource catalog (`ai_resource` + `ai_resource_group`) with
search, type filters, vendor grouping, select-all, and per-group quick grant.

Each grant is exactly one of `resourceCode` or `resourceGroupCode` with
`grantType` `allow`/`deny`. When a resource save fails after supplier creation,
the UI keeps the supplier and surfaces a retry path in the detail panel.

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

1. Authenticate through the API key or auth token channel and resolve tenant,
   organization, identity, and the account group context (default group for
   auth-token sessions; bound groups for API keys).
2. Normalize API operation and requested resource/model (catalog key).
3. Resolve ordered account groups from the API key's group bindings
   (priority/weight) or the auth-token default group.
4. Intersect supplier, group, and entitlement resources; empty intersection is
   fail-closed.
5. Filter by lifecycle, time window, protocol, region, auth, credential, quota,
   health, and circuit state — unhealthy accounts/endpoints and open circuit
   breakers are excluded before selection.
6. Apply the group routing strategy (weighted / round-robin / least-latency /
   least-cost / failover) and fallback mode (none / same-supplier / sequential /
   cross-supplier) from one immutable candidate snapshot; order endpoints and
   credentials by their own priority/weight.
7. Select a compatible endpoint and active credential version, validate egress,
   and dispatch through the adapter; apply model mapping rules (account > group
   > endpoint > supplier > vendor > global) to resolve the supplier-native model.
8. Record result, usage, cost, sale amount, health feedback, settlement, and an
   audit-safe route explanation (decision log: request/trace/policy/rule/selected
   supplier/account/credential/candidate snapshot/fallback chain/latency).

Routing behavior notes:

- **Quota** is enforced at the gateway admission layer (requests per second/day,
  burst, block duration) and does not select or skip accounts.
- **Retry** applies only to non-streaming, replay-safe requests; **candidate
  failover** to the next account requires `failure_strategy = Failover`.
- **Pricing gate**: a candidate is selected only when its procurement cost
  (reference cost × contract/member/group multipliers) is resolvable.
- No request may fall back across tenants, use another account's credential,
  route a resource absent from the effective allowlist, or attach a secret before
  the target passes egress validation.

## Model Routing And Mapping

A request model is matched against the effective resource entitlements
(catalog key / model / provider-native model / vendor / API / modality). The
requested model may be mapped to a supplier-native model through
`ai_model_mapping_rule` (exact/alias, six binding levels). When no supplier
supports the requested model and no mapping applies, the request fails with a
deterministic `model_not_found` error so operators can configure the mapping or
supplier resource grants.

## Agents Integration Scenario

Product consumers (SDKWork Agents) call `POST /v1/chat/completions` with their
login auth token; no API key or upstream credential configuration is needed on
the consumer side. The gateway resolves the tenant default group and routes the
model through the account pool. This keeps resource usage (accounts, quotas,
health, settlement) managed centrally by Cloud Router.

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
  dedicated account/endpoint health-state authorities. Circuit recovery uses a
  configurable recovery window (default 60 seconds) applied at snapshot load.
- Quota policies are enforced at the gateway admission layer; quota exhaustion
  must never block unrelated routes and must not be used as a routing signal.
- Route decision facts (policy, rule, selected supplier/account/credential,
  candidate snapshot, fallback chain, latency) are recorded for audit and
  route-explanation; the decision-log read side is available to dashboards and
  usage logs.
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
- The open API accepts both `sk-`/`sp-` prefixed API keys and product auth
  tokens through a single bearer credential, with the auth-token channel
  routing to the tenant default account group.
- Supplier/group/entitlement resource intersection is enforced and explained;
  unsupported models fail with a deterministic `model_not_found` error.
- Weighted, round-robin, least-latency, least-cost, and failover strategies are
  deterministic and covered by tests.
- Health and circuit state exclude unhealthy accounts/endpoints before
  selection; recovery windows and half-open probes are tested.
- Cost and sale multipliers are independently configurable and reconciled from
  immutable snapshots; unpriced candidates are never selected.
- Model mapping rules resolve supplier-native models with documented binding
  priority.
- Product integrations (SDKWork Agents) can complete a chat turn through the
  auth-token channel without any per-user API key or upstream credential
  configuration.
- No retired provider/site/channel/pool or duplicate integration aggregate
  remains in executable or current contract surfaces.
- Clean PostgreSQL installation, contract generation, Rust tests, frontend
  checks, security scans, pagination validation, and documentation scans pass
  before release consideration.
