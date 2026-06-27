> Migrated from `docs/superpowers/plans/2026-05-29-api-reference-aggregate-groups.md` on 2026-06-24.
> Owner: SDKWork maintainers

# API Reference Aggregate Groups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the gateway API Reference group to AI aggregation API and add planned payment/cloud API groups before App API without creating fake endpoints.

**Architecture:** Extend the schema-tabs manifest with backwards-compatible group status metadata. Keep `gateway`, `app`, and `backend` IDs stable; planned groups have no schema URLs and render as empty planned API groups in API Reference while SDK Reference filters them out.

**Tech Stack:** Rust Axum schema-tabs response, React/TypeScript API Reference runtime, Node runtime tests, Rust service router tests.

---

### Task 1: API Reference Runtime

**Files:**
- Modify: `apps/sdkwork-clawrouter-pc/api-reference-playground-runtime.test.ts`
- Modify: `../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/apiReferenceSchemaTabs.ts`
- Modify: `../sdkwork-documents/apps/sdkwork-documents-pc/packages/sdkwork-documents-pc-api-reference/src/pages/ApiReference.tsx`

- [ ] **Step 1: Write failing runtime tests**
  Add tests proving planned `payment-aggregate` and `cloud-services` tabs survive normalization, remain ordered before `app`, fetch no schemas, expose `status: "planned"`, and keep SDK Reference limited to `gateway`, `app`, and `backend`.

- [ ] **Step 2: Run focused Node test to verify RED**
  Run: `pnpm.cmd --dir apps\sdkwork-clawrouter-pc exec tsx api-reference-playground-runtime.test.ts`
  Expected: FAIL because empty schema tabs are currently filtered out and gateway display is still `Default Open API`.

- [ ] **Step 3: Implement minimal frontend runtime support**
  Add tab `status`/`description`, allow planned tabs with empty `schemaUrls`, keep planned systems in API Reference, skip schema fetches for planned tabs, map gateway display to `AI聚合API`, and render a planned empty state.

- [ ] **Step 4: Re-run focused Node test**
  Run: `pnpm.cmd --dir apps\sdkwork-clawrouter-pc exec tsx api-reference-playground-runtime.test.ts`
  Expected: PASS.

### Task 2: Runtime Schema-Tabs Contract

**Files:**
- Modify: `crates/sdkwork-claw-http/src/contract_routes.rs`
- Modify: `crates/sdkwork-claw-http/tests/service_router.rs`
- Modify: `crates/sdkwork-clawrouter-cloud-gateway/tests/edge_server.rs`
- Modify: `apps/sdkwork-clawrouter-pc/scripts/smoke-production-browser.mjs`

- [ ] **Step 1: Write/update failing Rust and smoke assertions**
  Expect five schema tabs ordered as `gateway`, `payment-aggregate`, `cloud-services`, `app`, `backend`, with planned status for the new empty groups.

- [ ] **Step 2: Run focused Rust test to verify RED**
  Run: `cargo test -p sdkwork-claw-http service_router_exposes_ordered_openapi_schema_tabs_from_route_config`
  Expected: FAIL because runtime still emits only three tabs.

- [ ] **Step 3: Implement minimal schema-tabs response changes**
  Add planned schema tab metadata and rename the gateway tab display name to `AI聚合API`; do not change `/openapi.json` info title or any API paths.

- [ ] **Step 4: Re-run focused Rust test**
  Run: `cargo test -p sdkwork-claw-http service_router_exposes_ordered_openapi_schema_tabs_from_route_config`
  Expected: PASS.

### Task 3: Verification

- [ ] Run `pnpm.cmd --dir apps\sdkwork-clawrouter-pc exec tsx api-reference-playground-runtime.test.ts`
- [ ] Run `cargo test -p sdkwork-claw-http service_router_exposes_ordered_openapi_schema_tabs_from_route_config`
- [ ] Run `cargo test -p sdkwork-clawrouter-cloud-gateway edge_server_serves_portal_assets_and_openapi_contracts`
- [ ] Run `pnpm.cmd --dir apps\sdkwork-clawrouter-pc typecheck`

