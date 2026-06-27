> Migrated from `docs/superpowers/plans/2026-05-23-test-efficiency-optimization.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Test Efficiency Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add low-risk test workflow tooling that makes daily validation faster and prevents aborted Rust tests from poisoning later runs on Windows.

**Architecture:** Keep production code unchanged. Add root package scripts that route Rust verification through a small Node runner with named profiles, isolated Cargo target directories, optional test-thread limits, and dry-run visibility. Add a Windows-aware process cleanup helper for repository-local Rust test binaries. Keep scoped profiles on a shared `target-rust-tests/daily` target dir so admin/app/gateway/product daily checks reuse the same compilation cache while still avoiding the normal `target/debug` tree.

**Tech Stack:** Node.js ESM scripts, Cargo, pnpm, existing `run-claw-router-application.test.mjs` product tooling tests.

---

### Task 1: Product Tooling Tests

**Files:**
- Modify: `scripts/run-claw-router-application.test.mjs`
- Modify: `package.json`
- Create: `scripts/run-claw-router-rust-tests.mjs`
- Create: `scripts/stop-claw-router-test-processes.mjs`

- [x] **Step 1: Add assertions for new package scripts**

Add assertions that `package.json` exposes:

```js
assert.equal(
  rootPackage.scripts['test:rust:quick'],
  'node scripts/run-claw-router-rust-tests.mjs quick',
);
assert.equal(
  rootPackage.scripts['test:rust:admin-api'],
  'node scripts/run-claw-router-rust-tests.mjs admin-api',
);
assert.equal(
  rootPackage.scripts['test:rust:runtime'],
  'node scripts/run-claw-router-rust-tests.mjs runtime',
);
assert.equal(
  rootPackage.scripts['test:rust:full'],
  'node scripts/run-claw-router-rust-tests.mjs full',
);
assert.equal(
  rootPackage.scripts['test:rust:stop'],
  'node scripts/stop-claw-router-test-processes.mjs',
);
```

- [x] **Step 2: Add script module unit tests**

Import both scripts and assert that dry-run plans produce the expected Cargo commands and that Windows cleanup is scoped to repository-local `target` processes.

- [x] **Step 3: Run test to verify failure before implementation**

Run: `node scripts/run-claw-router-application.test.mjs`

Expected before implementation: FAIL because scripts and exports do not exist.

### Task 2: Rust Test Runner

**Files:**
- Create: `scripts/run-claw-router-rust-tests.mjs`
- Modify: `package.json`

- [x] **Step 1: Implement named profiles**

Profiles:

```text
quick      format plus focused config/provider/admin smoke tests
admin-api  admin-api route tests split by test target
runtime    product/gateway/admin/app/installer runtime integration tests
full       cargo test --workspace
```

- [x] **Step 2: Isolate Cargo artifacts**

Use `CARGO_TARGET_DIR=target-rust-tests/daily` by default for scoped profiles and `target-rust-tests/full` for the full workspace profile, so dev servers and aborted tests do not lock `target/debug/*.exe` while daily profiles still share compile artifacts.

- [x] **Step 3: Add dry-run support**

Run: `node scripts/run-claw-router-rust-tests.mjs admin-api --dry-run`

Expected: prints each Cargo command without executing it.

### Task 3: Process Cleanup Helper

**Files:**
- Create: `scripts/stop-claw-router-test-processes.mjs`
- Modify: `package.json`

- [x] **Step 1: Implement Windows-aware cleanup**

On Windows, enumerate PowerShell `Get-Process` results and stop only processes whose executable path lives below this repository's `target`, `target-*`, or `.tmp` test output directories. On non-Windows, print a no-op message.

- [x] **Step 2: Add dry-run support**

Run: `node scripts/stop-claw-router-test-processes.mjs --dry-run`

Expected: prints matching processes without stopping them.

### Task 4: Verification

**Files:**
- Modify: none

- [x] **Step 1: Run product tooling tests**

Run: `node scripts/run-claw-router-application.test.mjs`

Expected: PASS.

- [x] **Step 2: Run new dry-run commands**

Run:

```bash
node scripts/run-claw-router-rust-tests.mjs quick --dry-run
node scripts/run-claw-router-rust-tests.mjs admin-api --dry-run
node scripts/stop-claw-router-test-processes.mjs --dry-run
```

Expected: all exit 0 and print scoped plans.

- [x] **Step 3: Run focused Rust verification**

Run:

```bash
node scripts/run-claw-router-rust-tests.mjs quick
```

Expected: PASS, or report the first real failing test with isolated target artifacts.

### Task 5: Broader Test-System Scan

**Files:**
- Modify: `scripts/run-claw-router-rust-tests.mjs`
- Modify: `scripts/run-claw-router-application.test.mjs`
- Modify: `package.json`
- Create: `scripts/measure-claw-router-test-targets.mjs`

- [x] **Step 1: Add more scoped Rust profiles**

Added `app-api`, `gateway`, and `product-relay` profiles so daily work can target the slowest integration surfaces without running the original broad package group.

- [x] **Step 2: Add curated target timing script**

Added `scripts/measure-claw-router-test-targets.mjs` and `pnpm test:rust:measure` for curated slow targets:

```text
sdkwork-clawrouter-admin-api-server:database_config_router
sdkwork-clawrouter-app-api-server:database_config_router
sdkwork-clawrouter-cloud-gateway:database_config_router
sdkwork-clawrouter-cloud-gateway:provider_passthrough_route
sdkwork-clawrouter-cloud-gateway:edge_server
sdkwork-clawrouter-router-service:openai_compatible_http_relay
sdkwork-claw-installer:installer_cli
```

- [x] **Step 3: Measure representative slow targets**

Measured selected targets with `target-rust-tests/measure`:

```text
sdkwork-clawrouter-cloud-gateway edge_server: cold 142.2s, hot 0.7s
sdkwork-clawrouter-router-service sqlite_pricing_catalog_loader: cold 97.9s, hot 0.3s
sdkwork-clawrouter-cloud-gateway provider_adapter_invocation: 4.0s
```

The evidence shows these targets are not slow at runtime; cold compilation dominates. Fixed sleeps in `edge_server.rs` are tied to streaming and timeout semantics and are not currently the bottleneck.

- [x] **Step 4: Share daily Cargo cache across scoped profiles**

Changed scoped profile default target dir from `target-rust-tests/<profile>` to `target-rust-tests/daily`. This preserves isolation from dev server artifacts in `target/debug` while allowing `quick`, `admin-api`, `app-api`, `gateway`, and `product-relay` to reuse compilation work.

- [x] **Step 5: Harden Windows process cleanup**

Made `stop-claw-router-test-processes.mjs` tolerate already-exited repo-local processes during stop operations. This avoids cleanup failures caused by race conditions while stopping stale test binaries.

### Updated Verification Notes

- `node scripts/run-claw-router-application.test.mjs`: PASS.
- `node scripts/run-claw-router-rust-tests.mjs quick`: PASS.
- `node scripts/run-claw-router-rust-tests.mjs quick` hot cache: 3.9s.
- `node scripts/measure-claw-router-test-targets.mjs --dry-run --target sdkwork-clawrouter-admin-api-server:database_config_router --target sdkwork-clawrouter-app-api-server:database_config_router`: PASS.
- `cargo check -p sdkwork-claw-http`: PASS.

