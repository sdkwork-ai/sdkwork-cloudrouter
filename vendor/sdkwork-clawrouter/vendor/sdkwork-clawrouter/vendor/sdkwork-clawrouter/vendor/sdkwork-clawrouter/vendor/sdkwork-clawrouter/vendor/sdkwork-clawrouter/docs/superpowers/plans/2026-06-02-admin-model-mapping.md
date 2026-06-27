# Admin Model Mapping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin model mapping configuration with schema, backend CRUD/resolve APIs, generated backend SDK coverage, and portal admin UI.

**Architecture:** Use `ai_model_mapping_rule` as the rule header, `ai_model_mapping_rule_item` for multiple child model relationships, and `ai_model_mapping_rule_binding` for associated content. Backend resolution applies `provider_account > channel > channel_group > vendor > global`. Portal code calls the generated backend SDK only.

**Tech Stack:** Rust Axum + sqlx SQLite/Postgres stores, schema registry YAML + generated OpenAPI/SDK, React/TypeScript admin portal.

---

### Task 1: Contract Tests

- [ ] Add `tests/test_admin_model_mapping_runtime_standard.py` assertions for rule, item, and binding tables.
- [ ] Add `apps/sdkwork-clawrouter-pc/admin-model-mapping-runtime.test.ts` assertions for rule list, associated content, multi-item mapping rows, and edit semantics.
- [ ] Run both tests and confirm RED.

### Task 2: Schema And API Contract

- [ ] Add `ai_model_mapping_rule`, `ai_model_mapping_rule_item`, and `ai_model_mapping_rule_binding` to the AI schema registry.
- [ ] Add `/admin/model/mappings` frontend models with `mappingItems` and `bindings`.
- [ ] Add backend operations for list/create/update/delete/resolve using generated request and response schemas.
- [ ] Regenerate schema manifest, SQL schema, API manifest, OpenAPI, and backend SDK.

### Task 3: Rust Backend

- [ ] Extend the admin model store port with mapping rule, item, and binding CRUD/resolve types.
- [ ] Add Axum routes under `/backend/v3/api/ai/model_mappings`.
- [ ] Implement SQLite and Postgres persistence with transactional reconciliation of child items and bindings.
- [ ] Add or update focused API/store tests for `provider_account > channel > channel_group > vendor > global`.

### Task 4: Portal UI

- [ ] Add `ModelMappingService` using `getClawRouterBackendSdkClient().ai.modelMappings`.
- [ ] Add `ModelMappingAdmin` under `/admin/model/mappings` as a rule list.
- [ ] Add the associated content column and `ModelMappingBindingsCell`.
- [ ] Add create/edit form support for rule bindings and multi-row mapping item CRUD.
- [ ] Keep UI minimal: tabs, search, new button, table, and one edit dialog.

### Task 5: Verification

- [ ] Run focused Python contract test.
- [ ] Run focused Node runtime tests.
- [ ] Run focused Rust tests.
- [ ] Run SDK guardian and portal type/build checks; report unrelated existing failures.
