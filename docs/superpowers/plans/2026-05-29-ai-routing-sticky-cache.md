# AI Routing Sticky Cache Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the high-performance AI relay routing foundation: API route profiles, provider-object sticky bindings, idempotency records, config-version invalidation, and a non-bloated route snapshot path.

**Architecture:** Database remains normalized around channel, resource, endpoint, model, and policy facts. Runtime route selection uses immutable catalog/cache snapshots and derives model routes from facts instead of persistent `channel_group x model x api` candidate projections. Sticky object route and config version data are modeled explicitly so Redis/local cache refresh can be coordinated across distributed instances.

**Tech Stack:** Rust, sqlx, SQLite/PostgreSQL schema registry, existing `RuntimeCacheManager`, generated schema tooling.

---

### Task 1: Route Snapshot Query Contract

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/tests/sql_pricing_catalog_contract.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/queries/snapshot.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/queries.rs`

- [ ] Write failing tests that `load_provider_routes` is derived from normalized channel/resource/credential facts.
- [ ] Change Postgres and SQLite snapshot SQL to derive routes from `ai_channel_resource`, `ai_channel_credential`, `ai_channel`, resource groups, and model mapping rules.
- [ ] Verify focused Rust contract tests.

### Task 2: Schema Registry Tables

**Files:**
- Modify: `docs/schema-registry/tables/017-integration.yaml`
- Modify generated schema outputs through tooling.

- [ ] Write failing schema tests for `ai_provider_object_route`, `ai_config_version`, and `ai_config_change_event`; route taxonomy stays in code and policy rules.
- [ ] Add registry definitions with compact indexes and TTL/hash lookup fields.
- [ ] Regenerate effective registry, manifest, PostgreSQL DDL, and OpenAPI components.

### Task 3: Runtime Cache Namespaces

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/tests/cache_runtime.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/application/cache_runtime.rs`

- [ ] Write failing tests for default routing cache namespaces.
- [ ] Add route snapshot, provider object route, idempotency, config version, and disabled channel namespaces.
- [ ] Verify cache runtime tests.

### Task 4: Sticky Route Domain Model

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/src/domain/routing.rs`
- Modify: `services/sdkwork-clawrouter-edge-runtime/src/openai_route_taxonomy.rs`

- [ ] Write failing tests for route strategy classification on stateless, create-sticky, parent-sticky, lookup-sticky, and primary-channel API families.
- [ ] Add route strategy/failure/model requirement enums and extend OpenAI classification.
- [ ] Verify gateway taxonomy tests.

### Task 5: Final Verification

- [ ] Run focused Rust tests for SQL contract, cache runtime, pricing loader, and OpenAI route taxonomy.
- [ ] Run schema compiler/check tests.
- [ ] Report exact verification status and remaining gaps.
