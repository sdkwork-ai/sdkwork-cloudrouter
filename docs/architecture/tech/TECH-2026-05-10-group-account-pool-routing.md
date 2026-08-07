> Owner: SDKWork maintainers
> Status: active — describes the implemented account-pool routing architecture (aligned with `upstream_route_selector.rs` / `circuit_breaker.rs` / `snapshot.rs`).
> Supersedes: the original 2026-05-10 implementation plan (tasks are complete; this document is now the architecture reference).

# Group Account Pool Routing Architecture

## 1. Goal

Route each authenticated OpenAI-compatible request (chat, embeddings, responses,
images, …) through the account pool configured for the caller's account group:
identity → group → routing policy → account → supplier endpoint, with health,
circuit, resource entitlement, and pricing gates applied at every stage.

The router is **stateless at runtime**: all routing facts come from one immutable
pricing-catalog snapshot loaded from PostgreSQL (`ai_*` tables); control-plane
mutations invalidate the snapshot after commit and it is reloaded.

## 2. Authentication: two credential channels

A single `Authorization: Bearer` credential is classified by the framework-level
`OpenApiBearerCredentialClassifier` (default prefixes `sk-` / `sp-`):

| Channel | Credential | Identity resolution | Group context |
| --- | --- | --- | --- |
| API key | `sk-` / `sp-` prefixed | `iam_gateway_api_key` hash lookup | `default_account_group_id` + `iam_gateway_api_key_account_group` route bindings (priority/weight) |
| Auth token | anything else | IAM session lookup (tenant/org/user) | tenant default group `code="default"` |

Both channels produce the same `AuthenticatedApiKeyContext { tenant_id,
organization_id, user_id, group_id, group_code, pricing_plan_code }` consumed by
the route selector. The auth-token channel is injected as an
`OpenAiAuthTokenAuthenticator` (IAM-backed implementation in the edge runtime);
it is optional per assembly and fails closed when absent.

Implementation: `services/sdkwork-cloudrouter-router-service/src/api/openai_chat.rs`
(classification branch), `crates/sdkwork-cloudrouter-edge-runtime/src/iam_auth_token_authenticator.rs`.

## 3. Route decision pipeline

`UpstreamRouteSelector::select_model_route_plan` (application/upstream_route_selector.rs)
runs per request:

```
request { catalog_key, requested_model, capability, billing_meter }
  │
  ├─ 1. Multi-group context expansion
  │      api key route bindings sorted by (priority ASC, weight DESC);
  │      contexts tried in order; first successful plan wins;
  │      PricingUnavailable aborts, other failures continue.
  │
  ├─ 2. Group-scoped route filter
  │      member binding matches api_scope (* / all / prefix) and capability
  │      aliases (Chat→llm/chat/text, …); group resource ∩ supplier resource
  │      precomputed in the snapshot; empty intersection ⇒ fail-closed (__deny__).
  │
  ├─ 3. Policy scope selection (select_policy_scopes)
  │      UpstreamAccountGroup(0) > ApiKey(1) > Organization(2) > Tenant(3) > Global(4).
  │
  ├─ 4. Policy → profile → routing rule
  │      policy.default_profile_id → rules sorted by (priority, id) →
  │      first rule matching catalog key / requested model (match_expression JSON,
  │      `*` wildcards) → candidate chain = rule.candidate_account_groups
  │      (+ fallback_chain when policy.fallback_mode allows it) →
  │      candidates filtered to group-bound accounts, ordered by binding
  │      (priority ASC, weight DESC).
  │
  ├─ 5. Candidate account resolution
  │      group binding + resource entitlement match (catalog_key / model /
  │      provider_native_model / vendor_code / api_code / modality_code)
  │      + region match (empty = "global") + callable:
  │      base_url present ∧ (secret_ref ∨ auth headers) ∧ account/endpoint/credential healthy.
  │
  ├─ 6. In-group account ordering (per group routing_strategy)
  │      Weighted: SHA-256 fingerprint + lock-free atomic weighted cursor
  │      RoundRobin: atomic cursor rotation
  │      LeastLatency: last_latency_ms ascending (unknown = MAX)
  │      LeastCost: effective cost multiplier ascending
  │      Failover: no rotation
  │      fallback_mode: None → 1 account; SameSupplier → primary supplier only;
  │      Sequential / CrossSupplier → keep all ordered candidates.
  │
  ├─ 7. Endpoint & credential ordering
  │      endpoints by (priority, weight) with weighted rotation per account;
  │      credentials by credential_priority + rotation policy
  │      (round_robin / weighted_round_robin / random / priority).
  │
  ├─ 8. Pricing gate
  │      PricingResolver requires procurement_cost (reference × multipliers);
  │      missing ⇒ PricingUnavailable (no unpriced route is ever selected).
  │
  └─ SelectedUpstreamModelRoutePlan { routes[], policy_id, rule_id }
        provider_model overridden by ai_model_mapping_rule when matched
        (binding priority: Account > Group > Endpoint > Supplier > Vendor > Global).
```

Group-scoped fallback (no policy match): a single candidate from the group-bound
accounts is evaluated directly (`policy_id=None, rule_id=None`).

Sticky routes (CreateThenSticky / ParentSticky / LookupSticky / PrimaryAccount
strategies) bypass the selector and use the sticky route directly.

## 4. Health, circuit breaker, retry, failover

| Layer | Mechanism |
| --- | --- |
| Snapshot health | `ai_upstream_account_health_state` (0/1/2) and endpoint health; status 2 (circuit open) with `updated_at + recovery_window ≤ now` (default 60s, `DEFAULT_PROVIDER_CIRCUIT_BREAKER_RECOVERY_WINDOW_SECONDS`) is treated as healthy again in the snapshot SQL. `is_account_healthy` excludes unhealthy accounts/endpoints/credentials during planning. |
| Runtime circuit breaker | `CircuitBreakerInterceptor`: fail-closed; default `failure_threshold=5` consecutive failures, `open_duration=30s`, `half_open_max_probes=3`; in-memory or Redis-distributed state; all candidates open ⇒ "all route candidates have open circuit breakers". |
| Health feedback | `openai_invocation_telemetry_plugin` writes account/endpoint health after calls: failure increments `consecutive_error_count` and flips status to 2 at the `ProviderCircuitBreakerPolicy` threshold (default 1 on the DB side); success resets to 1. Manual verification task in `admin_upstream_store/verifier.rs`. |
| Retry | `ProviderRetryPolicy` (max_attempts ≤ 5, retryable statuses [429,500,502,503,504], backoff ≤ 2s). Only **non-streaming, replay-safe** requests (GET/HEAD/OPTIONS, non-internal-adapter) may retry. |
| Candidate failover | Next candidate is tried only when `failure_strategy == Failover` and the request is replay-safe; all other strategies fail closed. |
| Quota | `ai_quota_policy` enforced at the gateway admission layer (RPS/day/burst per `api-key:{id}`); quota does **not** participate in account selection. |

## 5. Resource entitlement & model mapping

- Supplier capability is expressed by `ai_upstream_supplier_resource` +
  `ai_upstream_account_group_resource`, expanded through `ai_resource_group`
  (recursive, depth < 8). The snapshot computes the **group ∩ supplier
  intersection** per member binding and materializes `apiScope`,
  `capabilities`, and `resourceEntitlements` (empty intersection ⇒ `__deny__`).
- Per-account bindings (`ai_upstream_account_resource`, managed via
  `GET/PUT /backend/v3/api/ai/upstream_accounts/{accountId}/resources`) add an
  optional third scope layer: when an account has explicit bindings the
  effective scope is `group ∩ supplier ∩ account`; accounts without bindings
  keep the group ∩ supplier result unchanged (backward compatible). A
  deny-only account binding yields `__deny__`.
- Request-side matching (`resource_entitlement_matches_request`) compares each
  non-empty entitlement field (catalog_key / model / provider_native_model /
  vendor_code / api_code / modality_code); entitlements absent ⇒ unrestricted.
- Model mapping (`ai_model_mapping_rule` + bindings + items, exact/alias) maps the
  requested model to the supplier-native model with 6-level binding priority.

## 6. Default group convention

`code="default"`, `name="Default"` is lazily ensured per (tenant, organization)
when an API key is created without a group or with `default` requested
(`ensure_default_upstream_account_group`, `ON CONFLICT DO UPDATE` resurrect).
The auth-token channel routes to this default group. A missing default group
fails authentication ("account group is not available").

## 7. SDKWork Agents integration

`POST /app/v3/api/ai/agents/{agentId}/sessions/{sessionId}/turns` (sdkwork-agents):

```
user chat (no API key) → agents turns handler extracts Authorization: Bearer
  → CloudRouterFirstTurnExecutor (cloudrouter-open-sdk Rust, set_auth_token)
  → POST /v1/chat/completions (auth token channel)
  → IAM identity → tenant Default group → account-pool pipeline (sections 2–6)
  → supplier execution → assistant content back to the turn.
```

The auth token is transient (never persisted). Agents-side sessions that already
carry a local runtime binding keep the local engine chain; everything else
routes through the account pool. Resource usage (accounts, quotas, health,
settlement) is managed entirely by Cloud Router.

## 8. Observability & audit

- `ai_routing_decision_log` (request/trace/policy/rule/selected supplier/account/
  credential/candidate snapshot/fallback chain/latency) is written at runtime by
  two observers that never touch the routing algorithm:
  - `RoutingDecisionLogInterceptor` — invocation pipeline surface
    (`application/invocation/decision_log.rs`), records the full candidate
    snapshot, the actual attempt/fallback chain, the resolved account and
    credential, and the measured latency after dispatch.
  - `RoutingDecisionLogPlugin` — OpenAI-compatible surface
    (`api/openai_decision_log_plugin.rs`, `/v1/chat/completions`,
    `/v1/responses`, `/v1/embeddings`), records the selected route at
    `after_route_selection` and rejection facts on `on_error` (route absent).
  - Both write through the `RoutingDecisionLogRecorder` port; the Postgres
    implementation (`.../postgres/routing_decision_log_recorder.rs`) upserts
    exactly once per `(tenant_id, organization_id, request_id)` via the unique
    index, derives `id` from the Cloud runtime Snowflake generator, and keeps a
    SHA-256 `payload_hash` over the redacted decision facts. Records carry ids
    and codes only — never base URLs, secret references, or credential
    material.
- `admin_route_explain` (manual plan explanation) and
  `log_unavailable_model_route_diagnostics` (tracing diagnostics for rejected
  routes) remain for interactive investigation.
- `ai_request_trace` + `ai_runtime_invocation` record per-request traces and
  provider invocations; usage recorder meters tokens/cost/sale for settlement.

## 9. Key code locations

| Concern | Path |
| --- | --- |
| Route selector | `services/sdkwork-cloudrouter-router-service/src/application/upstream_route_selector.rs` |
| Account route planner | `.../src/application/upstream_account_route_planner.rs` |
| Route planning / sticky | `.../src/application/invocation/route_planning.rs` |
| Circuit breaker | `.../src/application/invocation/circuit_breaker.rs` |
| Dispatch/retry | `.../src/application/invocation/dispatch_executor.rs` |
| Snapshot loading | `.../src/infrastructure/sql/queries/snapshot.rs` |
| Chat completions auth | `.../src/api/openai_chat.rs` + `openai_auth_token.rs` |
| IAM auth-token authenticator | `crates/sdkwork-cloudrouter-edge-runtime/src/iam_auth_token_authenticator.rs` |
| Health telemetry | `.../src/infrastructure/sql/postgres/openai_invocation_telemetry_plugin.rs` |
| Decision log interceptor | `.../src/application/invocation/decision_log.rs` |
| Decision log plugin (openai surface) | `.../src/api/openai_decision_log_plugin.rs` |
| Decision log recorder (port / postgres) | `.../src/ports/routing_decision_log_recorder.rs` + `.../src/infrastructure/sql/postgres/routing_decision_log_recorder.rs` |
| Model mapping | `crates/sdkwork-models-catalog-service` snapshot + `in_memory_pricing_catalog.rs` |
