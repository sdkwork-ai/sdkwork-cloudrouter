> Migrated from `docs/superpowers/plans/2026-05-10-group-account-pool-routing.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Group Account Pool Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route each authenticated OpenAI-compatible request through the account pool configured for the channel group.

**Architecture:** Reuse the existing `ai_routing_policy`, `ai_routing_profile`, and `ai_routing_rule` tables as the standard policy model. Add focused routing domain objects, load them into the pricing catalog snapshot, and move provider route selection into an independent `ProviderRouteSelector` application component.

**Tech Stack:** Rust, Axum, SQLx, existing OpenAI-compatible relay ports, existing schema registry tables.

---

### Task 1: Red Tests

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/tests/openai_chat_api.rs`
- Modify: `services/sdkwork-clawrouter-router-service/tests/sql_pricing_catalog_contract.rs`

- [ ] Add a chat API test where two API keys in different groups request the same model and must hit different `channel_id/base_url/secret_ref`.
- [ ] Add SQL catalog tests that require routing policy/rule rows to be loaded into snapshots.
- [ ] Run the targeted tests and confirm they fail for missing group account-pool routing.

### Task 2: Routing Domain and Catalog Port

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/domain/routing.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/domain/mod.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/pricing_catalog.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/in_memory_pricing_catalog.rs`

- [ ] Define `RoutingPolicy`, `RoutingRule`, `RoutingPolicyScope`, and `RouteCandidate`.
- [ ] Expose catalog methods to list routing policies and rules.
- [ ] Add in-memory catalog support for tests.

### Task 3: SQL Snapshot Loading

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/queries/snapshot.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/rows.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/catalog.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/row_mapping.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/row_mapping.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/loader.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/loader.rs`

- [ ] Load active policies whose default profiles are active.
- [ ] Load active rules with `candidate_channels`, `fallback_chain`, and `constraints`.
- [ ] Reject invalid routing JSON before serving the runtime snapshot.

### Task 4: Route Selector

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/application/provider_route_selector.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/mod.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/openai_runtime.rs`

- [ ] Implement `ProviderRouteSelector`.
- [ ] Match group-scoped policy first, then organization/tenant/global fallback.
- [ ] Match rule by requested catalog key or wildcard.
- [ ] Select the first priced candidate channel from `candidate_channels`, then fallback chain, then legacy provider route ordering.
- [ ] Return deterministic OpenAI-compatible errors for missing or misconfigured pools.

### Task 5: Verification

**Files:**
- Targeted tests only, no generated SDK edits.

- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test openai_chat_api --offline`.
- [ ] Run `cargo test -p sdkwork-clawrouter-router-service --test sql_pricing_catalog_contract --offline`.
- [ ] Run relay tests for chat, embeddings, and responses.
- [ ] Report any environment-only failures separately from business failures.

