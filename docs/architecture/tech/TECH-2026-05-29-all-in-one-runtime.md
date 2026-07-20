> Migrated from `docs/superpowers/plans/2026-05-29-all-in-one-runtime.md` on 2026-06-24.
> Owner: SDKWork maintainers

# All-In-One Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the default local and single-server startup use one Rust API/edge process while preserving the existing distributed multi-process topology as an explicit mode.

**Architecture:** The Rust edge server remains the single HTTP entrypoint, but it can route `/v1`, `/backend/v3/api`, and `/app/v3/api` to in-process Axum routers instead of HTTP upstreams. Development starts the portal Vite process plus the all-in-one Rust edge process; production `pnpm start` starts one Rust process by default.

**Tech Stack:** Rust/Axum/Tower for in-process request dispatch, Node ESM scripts for launcher orchestration, existing `cargo test` and `node:test` harnesses.

---

### Task 1: Add In-Process Edge Dispatch Tests

**Files:**
- Modify: `crates/sdkwork-clawrouter-edge-runtime/tests/edge_server.rs`

- [ ] **Step 1: Write failing tests**

Add tests proving an edge router can dispatch gateway, backend, and app paths to in-process routers and that `/readyz` probes those routers without opening upstream ports.

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server edge_server_can_dispatch_to_in_process_upstreams --offline`

Expected: FAIL because `edge_server_router_with_in_process_upstreams` and `EdgeInProcessUpstreams` do not exist.

- [ ] **Step 3: Implement minimal Rust edge support**

Modify `crates/sdkwork-clawrouter-edge-runtime/src/edge_server.rs` to add `EdgeInProcessUpstreams` and a new router constructor. Dispatch matching API paths through cloned Axum routers with `tower::ServiceExt::oneshot`; keep existing HTTP forwarding as the default.

- [ ] **Step 4: Run test to verify it passes**

Run: `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server edge_server_can_dispatch_to_in_process_upstreams --offline`

Expected: PASS.

### Task 2: Add All-In-One Runtime Builder

**Files:**
- Modify: `crates/sdkwork-clawrouter-edge-runtime/Cargo.toml`
- Modify: `crates/sdkwork-clawrouter-edge-runtime/src/lib.rs`
- Modify: `crates/sdkwork-clawrouter-edge-runtime/src/main.rs`

- [ ] **Step 1: Write failing test**

Extend the SQLite edge smoke test to build an all-in-one router from real gateway/admin/app routers without spawning three service listeners.

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke all_in_one_edge_router_serves_sqlite_gateway_admin_and_app_without_service_ports --offline`

Expected: FAIL because the all-in-one builder does not exist.

- [ ] **Step 3: Implement minimal builder**

Promote `sdkwork-clawrouter-admin-gateway` and `sdkwork-clawrouter-standalone-gateway` from dev-dependencies to dependencies of `sdkwork-clawrouter-edge-runtime`. Add `all_in_one_edge_router_from_env` and `serve_all_in_one_edge_server_with_runtime_config`, then make `src/main.rs` use that path when `SDKWORK_CLAW_ALL_IN_ONE_RUNTIME=1`.

- [ ] **Step 4: Run focused tests**

Run: `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke all_in_one_edge_router_serves_sqlite_gateway_admin_and_app_without_service_ports --offline`

Expected: PASS.

### Task 3: Make Local Launcher Default To All-In-One

**Files:**
- Modify: `scripts/dev/start-workspace.mjs`
- Modify: `scripts/run-claw-router-application.mjs`
- Modify: `package.json`
- Test: `scripts/run-claw-router-application.test.mjs`

- [ ] **Step 1: Write failing Node tests**

Add assertions that default `server` mode starts only blocking installer steps plus `portal` and `server`, sets `SDKWORK_CLAW_ALL_IN_ONE_RUNTIME=1`, and points Vite API proxy targets at the edge server. Add a distributed-mode assertion that preserves the current gateway/admin/app/portal/server plan.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/run-claw-router-application.test.mjs --test-name-pattern "all-in-one"`

Expected: FAIL because launcher plans still default to distributed services.

- [ ] **Step 3: Implement launcher mode split**

Make `start-workspace.mjs` default to `runtimeMode: "all-in-one"`, add `--distributed`, and update dry-run/access output. Add root scripts for explicit distributed startup.

- [ ] **Step 4: Run focused Node tests**

Run: `node scripts/run-claw-router-application.test.mjs --test-name-pattern "all-in-one|distributed"`

Expected: PASS.

### Task 4: Make Production Start All-In-One By Default

**Files:**
- Modify: `scripts/start-claw-router-production.mjs`
- Test: `scripts/run-claw-router-application.test.mjs`

- [ ] **Step 1: Write failing tests**

Add assertions that production start defaults to `SDKWORK_CLAW_ALL_IN_ONE_RUNTIME=1` and that explicit upstream forwarding switches to distributed mode.

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/run-claw-router-application.test.mjs --test-name-pattern "production.*all-in-one"`

Expected: FAIL because production start does not set the all-in-one env.

- [ ] **Step 3: Implement production env changes**

Set all-in-one by default, preserve existing forwarding behavior when any `--*-forward-url` is provided or `--distributed` is passed, and update startup output.

- [ ] **Step 4: Run focused tests**

Run: `node scripts/run-claw-router-application.test.mjs --test-name-pattern "production.*all-in-one|start-production"`

Expected: PASS.

### Task 5: Documentation And Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Update docs**

Document the default two-process local flow, one-process production flow, and explicit distributed flow.

- [ ] **Step 2: Run focused verification**

Run:
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server edge_server_can_dispatch_to_in_process_upstreams --offline`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke all_in_one_edge_router_serves_sqlite_gateway_admin_and_app_without_service_ports --offline`
- `node scripts/run-claw-router-application.test.mjs --test-name-pattern "all-in-one|distributed|start-production"`

Expected: PASS.

