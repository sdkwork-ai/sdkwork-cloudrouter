> Migrated from `docs/superpowers/plans/2026-05-29-rust-test-performance-report.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Rust Test Performance Report

## Summary

The current slow `cargo test --workspace` experience is primarily a compilation scope problem, not a single slow test problem.

Measured workspace facts:

- `40` workspace members
- `249` Rust test targets
- `1022` `#[tokio::test]` functions
- `568` `#[test]` functions

The most important immediate cause in the reported command is:

```powershell
$env:CARGO_BUILD_JOBS='1'; cargo test --workspace
```

`CARGO_BUILD_JOBS=1` forces Cargo to compile with a single build job. On this workspace, that turns cold and partially warm runs into long serialized builds.

There is also a structural multiplier:

- many service packages depend on `sdkwork-clawrouter-router-service`
- many integration tests live in `tests/*.rs`
- each `tests/*.rs` file becomes an independent test binary
- `--workspace` compiles and links the full surface, including packages that are not part of the current edit

## Findings

1. `cargo test --workspace` is too broad for daily development.

The workspace includes application services, provider adapters, SDK-related packages, and `sdkwork-appbase` crates. Using `--workspace` for normal iteration pulls all of that into the test build graph.

2. The current command disables build parallelism.

`CARGO_BUILD_JOBS=1` is useful only when intentionally reducing machine pressure or debugging build contention. It is the wrong default for normal verification on this repository.

3. Test-target fan-out is amplifying compile and link time.

This repository uses many Rust integration test files under `tests/`. Cargo builds each file as a separate binary, so large packages such as `sdkwork-clawrouter-router-service` and `sdkwork-clawrouter-edge-runtime` pay repeated link cost.

4. Some test helpers were making compile scope broader than necessary.

Before this change, `crates/sdkwork-claw-test-support` depended directly on `services/sdkwork-clawrouter-router-service` only to reuse API-key hashing logic. That pulled the product dependency chain into unrelated test builds that only needed lightweight helpers.

5. Some SQLite-backed tests were rebuilding the same seed state repeatedly.

`seeded_sqlite_catalog()` recreated schema and seed data every time it was called. That added avoidable runtime cost across gateway, admin-api, and app-api integration tests.

## Changes Implemented

### 1. Removed the unnecessary product dependency from test support

Updated:

- `crates/sdkwork-claw-test-support/Cargo.toml`
- `crates/sdkwork-claw-test-support/src/lib.rs`

Change:

- removed direct dependency on `sdkwork-clawrouter-router-service`
- replaced reused hasher wiring with a local HMAC-SHA256 helper using workspace crypto crates already available

Effect:

- shrinks compile scope for packages that only need common test fixtures
- reduces avoidable recompilation pressure in admin/app/gateway test flows

### 2. Added seeded SQLite template reuse

Updated:

- `crates/sdkwork-claw-test-support/src/lib.rs`

Change:

- `seeded_sqlite_catalog()` now creates a reusable seeded SQLite template once
- each test invocation copies that template into an isolated database file
- template creation is protected by a file lock so concurrent test processes do not race
- added a regression test proving returned databases remain isolated

Effect:

- cuts repeated schema creation and seed work from many route tests
- preserves test isolation while reducing repeated setup cost

### 3. Hardened Rust test tooling against inherited single-job builds

Updated:

- `scripts/run-claw-router-rust-tests.mjs`
- `scripts/measure-claw-router-test-targets.mjs`
- `scripts/run-claw-router-application.test.mjs`

Change:

- scoped Rust test scripts now clear inherited `CARGO_BUILD_JOBS` by default
- added explicit `--build-jobs <count>` support when throttling is intentional
- tooling tests now assert that a shell-level `CARGO_BUILD_JOBS=1` does not silently poison daily runs

Effect:

- prevents an interactive shell or IDE task from accidentally serializing repository test builds
- keeps fast-path scripts predictable while still allowing explicit overrides

### 4. Added repository-level Cargo defaults for faster daily testing

Updated:

- `Cargo.toml`
- `.cargo/config.toml`

Change:

- added `default-members` so plain root `cargo test` stays focused on the main application surface instead of every `sdkwork-appbase` workspace member
- set `[profile.test] debug = 1` to reduce Windows test link and debug-info cost with a low-risk compromise
- defaulted `SDKWORK_CLAW_HTTP_OPENAPI_BUILD_MODE` to `copy` at the repository Cargo layer so direct `cargo test` avoids unnecessary OpenAPI regeneration unless explicitly overridden

Effect:

- narrows plain root Cargo test scope for normal development
- reduces test artifact size and link overhead
- speeds direct Cargo workflows, not only Node wrapper scripts

### 5. Added an ultra-fast Rust smoke profile and trimmed timeout-test waits

Updated:

- `package.json`
- `scripts/run-claw-router-rust-tests.mjs`
- `scripts/run-claw-router-application.test.mjs`
- `services/sdkwork-clawrouter-router-service/tests/openai_compatible_http_relay.rs`

Change:

- added `pnpm test:rust:smoke` for the smallest useful Rust verification path
- smoke runs only a shared SQLite fixture sanity test plus the admin sqlite product-model route smoke
- shortened fixed waits in timeout-focused product relay tests while preserving timeout margins

Effect:

- gives day-to-day edits a smaller entrypoint than `quick`
- reduces hot-path runtime for timeout-only relay tests without changing their intent

### 6. Reused a seeded route-scoped gateway test template for repeated heavy OpenAI passthrough setup

Updated:

- `crates/sdkwork-claw-test-support/src/lib.rs`
- `crates/sdkwork-clawrouter-edge-runtime/tests/provider_passthrough_route.rs`

Change:

- added `SeededSqliteCatalog::fork()` so tests can clone an already-prepared SQLite fixture instead of reseeding from scratch
- made `fork()` copy SQLite sidecar files (`-wal`, `-shm`, `-journal`) so cloned databases preserve committed test state correctly
- introduced a lazily initialized OpenAI passthrough group-route template in the gateway test file
- converted the repeated `seed_openai_passthrough_group_channel_routes(...)` setup path to clone that prepared template and only rewrite per-test mock base URLs
- added a focused gateway regression test that verifies the cloned template still contains the seeded channel routes, pricing rows, API key fixture, and rewritten target URLs

Effect:

- removes repeated execution of the same heavy route-seeding SQL block across the largest cluster of gateway passthrough tests
- preserves per-test database isolation while shifting the expensive part of setup to a one-time lazy template build
- keeps the optimization local to test harness code, with no production behavior change

### 7. Removed real TTL waits from pure in-memory cache tests with controllable monotonic clocks

Updated:

- `services/sdkwork-clawrouter-router-service/src/application/cache_runtime.rs`
- `services/sdkwork-clawrouter-router-service/src/application/model_rankings_service.rs`
- `services/sdkwork-clawrouter-router-service/tests/cache_runtime.rs`
- `services/sdkwork-clawrouter-router-service/tests/model_rankings_service.rs`

Change:

- added opt-in clock injection constructors for `LocalCacheBackend` and `ModelRankingsService`
- kept default production constructors on real `Instant::now()`
- converted pure in-memory TTL expiry tests to use a manual monotonic clock instead of `sleep(Duration::from_millis(1_100))`
- targeted the hot path tests that previously waited for cache expiry:
  - `cache_runtime_refreshes_one_namespace_without_touching_other_namespaces`
  - `cache_writes_use_namespace_policy_ttl`
  - `cache_writes_apply_namespace_policy_ttl_jitter`
  - `model_rankings_service_respects_snapshot_cache_max_age_before_fallback_ttl`

Effect:

- removes `5.5s` of warm runtime waits across the targeted product cache tests
- keeps cache semantics identical because the expiry logic still compares monotonic instants, only the clock source becomes injectable in tests
- avoids the false optimization path of `tokio::time::pause()`, which does not help modules that use `std::time::Instant`

### 8. Tightened delayed streaming test fixtures in app runtime SSE coverage

Updated:

- `services/sdkwork-clawrouter-router-service/tests/app_runtime_api.rs`

Change:

- reduced the synthetic delayed second-stream chunk from `250ms` to `120ms` in the slow stream relay fixtures
- reduced the explicit disconnect-settle wait from `350ms` to `200ms` in the client-disconnect replay test
- kept the first-frame timeout and the cross-node cancel/reconnect assertions unchanged

Effect:

- removes roughly `130ms` from every test that consumes the delayed stream fixture
- keeps the behavioral window needed for:
  - reconnect-after-first-event
  - parallel subscribers on different nodes
  - distributed cancel before provider completion
- improves the full `app_runtime_api` warm target because several SSE tests share the same delayed fixture

### 9. Replaced remaining app runtime SSE completion sleeps with store notifications

Updated:

- `services/sdkwork-clawrouter-router-service/tests/app_runtime_api.rs`

Change:

- added a completion `Notify` to `TestAppRuntimeStore`
- replaced the fixed disconnect settle wait with `wait_for_complete_invocation()`
- replaced the cancelled-terminal-event polling loop with the same event-driven completion wait
- kept bounded `tokio::time::timeout(...)` guards so the tests still fail fast if completion regresses

Effect:

- removes polling and fixed completion sleeps from the remaining app runtime SSE assertions
- reduced `app_runtime_stream_execution_continues_after_client_disconnect_and_reconnect_replays_completion` from about `0.20s` to `0.13s`
- reduced `app_runtime_stream_completion_preserves_existing_cancelled_terminal_event_status` to `0.00s`
- keeps the same correctness signal while making the tests less timing-sensitive

### 10. Tightened OpenAI relay timeout fixtures again around the real timeout boundary

Updated:

- `services/sdkwork-clawrouter-router-service/tests/openai_compatible_http_relay.rs`

Change:

- reduced the synthetic slow-response delay from `200ms` to `50ms` for the `20ms` timeout cases
- reduced the slow-body timeout threshold from `500ms` to `300ms`
- reduced the post-header slow-body delay from `2s` to `450ms`
- retained clear timeout margins and repeated the body-timeout exact test three times to confirm stability

Effect:

- reduced the full `openai_compatible_http_relay` warm target from `0.52s` to `0.33s`
- reduced the exact slow-body-timeout test from `0.52s` to `0.31s` to `0.32s`
- preserved the actual behavior under test: timeout before an upstream body arrives, without leaking provider secrets

### 11. Replaced time-based concurrency waits in model rankings API tests with an explicit hold gate

Updated:

- `services/sdkwork-clawrouter-router-service/tests/model_rankings_api.rs`

Change:

- removed the `120ms` slow refresh stub and `20ms` stagger sleep from the concurrent refresh conflict test
- added a test-only hold gate so the first refresh request can signal when it has entered the store and remain blocked until the test releases it
- asserted the second request conflicts while the first is genuinely in-flight, then released the first request and confirmed it succeeds

Effect:

- reduced `admin_model_ranking_manual_refresh_route_rejects_concurrent_refresh` from `0.12s` to `0.00s`
- reduced the full `model_rankings_api` warm target from `0.13s` to `0.00s`
- improved correctness by replacing best-effort timing with explicit synchronization

### 12. Removed retry/backoff and overlap sleeps from model ranking refresh worker tests

Updated:

- `services/sdkwork-clawrouter-router-service/tests/model_ranking_refresh_worker.rs`

Change:

- set `max_retry_attempts: 0` in the alert-threshold test because that test validates consecutive-failure alerting, not retry behavior
- replaced the overlap test's `50ms` slow refresh plus `5ms` stagger sleep with a test-only hold gate and explicit start/release signaling
- kept the timeout-path test on `#[tokio::test(start_paused = true)]`, since that path was already correctly virtualized

Effect:

- reduced `model_ranking_refresh_worker_recommends_alert_after_delayed_failure_threshold` from `2.03s` to `0.00s`
- reduced `model_ranking_refresh_worker_skips_overlapping_run_for_same_worker` from about `0.05s` to `0.00s`
- reduced the full `model_ranking_refresh_worker` warm target from `2.00s` to `0.11s`
- preserved coverage separation by keeping retry semantics tested in `model_ranking_refresh_worker_retries_transient_failure_before_success`

### 13. Hardened the main verification gate against inherited single-job Cargo builds

Updated:

- `scripts/verify-claw-router-application.mjs`
- `scripts/run-claw-router-application.test.mjs`

Change:

- `verify` Rust steps now clear inherited `CARGO_BUILD_JOBS` by default, matching the scoped Rust runner behavior
- added `--build-jobs <count>` to `verify` so intentional throttling remains available without relying on ambient shell state
- added tooling contract coverage proving:
  - inherited `CARGO_BUILD_JOBS=1` does not leak into verify Rust steps
  - explicit `--build-jobs` values do propagate when requested

Effect:

- prevents `pnpm verify` from becoming unintentionally serialized when a developer shell or IDE task previously exported `CARGO_BUILD_JOBS=1`
- removes a hidden source of slow local verification that was still present even after the scoped Rust test runner had been hardened
- keeps release and CI operators able to opt into controlled build parallelism explicitly

### 14. Added an auto-selecting Rust test entrypoint for local development

Updated:

- `package.json`
- `scripts/run-claw-router-rust-tests.mjs`
- `scripts/run-claw-router-application.test.mjs`

Change:

- added `pnpm test:rust:auto`
- added `auto` profile support to the Rust test runner
- `auto` now:
  - reads changed files from the current worktree by default
  - accepts repeated `--changed-file <path>` hints for deterministic manual narrowing
  - accepts `--staged` to ignore unstaged local noise and inspect only staged Git changes
  - accepts `--base-ref <ref>` to ignore local dirty state and inspect only committed branch changes since the merge-base with `<ref>`
  - runs an exact integration-test target when a changed file is already under `services/*/tests/*.rs`
  - infers nearby Rust test targets from common `services/*/src/*.rs` names such as:
    - `app_runtime.rs` -> `app_runtime_api`, `postgres_app_runtime_sql_contract`, `sqlite_app_runtime_store`
    - `edge_server.rs` -> `edge_server`
  - detects shared `services/*/tests/common/*.rs` helper edits and narrows to the integration-test targets that directly include that helper
  - detects `crates/sdkwork-clawrouter-router-service-test-support/src/*.rs` edits and narrows to the product integration-test targets that import that shared fixture crate
  - falls back to existing scoped profiles like `gateway`, `product-relay`, `runtime`, or `quick` when the change is broader or ambiguous
  - rejects mixing multiple auto change selectors in the same invocation
- added tooling contract coverage for:
  - default `auto` fallback without a Git worktree
  - exact test-target selection from changed test files
  - exact target inference from changed source files
  - fallback profile selection for broader package changes
  - staged-only selection that ignores unrelated unstaged changes
  - base-ref selection that ignores unrelated dirty worktree changes

Effect:

- removes a large part of the manual “which Rust command should I run for this edit?�?overhead
- reduces the chance that developers jump from a narrow source edit straight to `cargo test --workspace`
- keeps the fast path conservative: exact-target selection where the repo naming makes that safe, existing curated profiles otherwise

## Verification

Executed after the change:

- `cargo test -p sdkwork-claw-test-support --lib`
- `cargo test -p sdkwork-clawrouter-admin-gateway --test sqlite_product_model_route`
- `node scripts/run-claw-router-application.test.mjs`
- `node scripts/run-claw-router-rust-tests.mjs quick`
- `node scripts/run-claw-router-rust-tests.mjs smoke`
- `cargo test -p sdkwork-clawrouter-router-service --test openai_compatible_http_relay openai_compatible_relay_times_out`
- `cargo test -p sdkwork-clawrouter-router-service --test model_rankings_service --target-dir target-rust-tests/iter-product`
- `cargo test -p sdkwork-clawrouter-router-service --test cache_runtime --target-dir target-rust-tests/iter-product`
- `cargo test -p sdkwork-clawrouter-router-service --test app_runtime_api --target-dir target-rust-tests/iter-product`
- `cargo test -p sdkwork-clawrouter-router-service --test app_runtime_api app_runtime_stream_execution_continues_after_client_disconnect_and_reconnect_replays_completion --target-dir target-rust-tests/iter-product -- --exact`
- `cargo test -p sdkwork-clawrouter-router-service --test app_runtime_api app_runtime_stream_completion_preserves_existing_cancelled_terminal_event_status --target-dir target-rust-tests/iter-product -- --exact`
- `cargo test -p sdkwork-clawrouter-router-service --test openai_compatible_http_relay --target-dir target-rust-tests/iter-product`
- `cargo test -p sdkwork-clawrouter-router-service --test openai_compatible_http_relay openai_compatible_relay_times_out_slow_upstream_bodies_without_leaking_secret --target-dir target-rust-tests/iter-product -- --exact` (run three times)
- `cargo test -p sdkwork-clawrouter-router-service --test model_rankings_api --target-dir target-rust-tests/iter-product`
- `cargo test -p sdkwork-clawrouter-router-service --test model_rankings_api admin_model_ranking_manual_refresh_route_rejects_concurrent_refresh --target-dir target-rust-tests/iter-product -- --exact`
- `cargo test -p sdkwork-clawrouter-router-service --test model_ranking_refresh_worker --target-dir target-rust-tests/iter-product`
- `cargo test -p sdkwork-clawrouter-router-service --test model_ranking_refresh_worker model_ranking_refresh_worker_recommends_alert_after_delayed_failure_threshold --target-dir target-rust-tests/iter-product -- --exact`
- `cargo test -p sdkwork-clawrouter-router-service --test model_ranking_refresh_worker model_ranking_refresh_worker_skips_overlapping_run_for_same_worker --target-dir target-rust-tests/iter-product -- --exact`
- `node scripts/run-claw-router-application.test.mjs`
- `node scripts/run-claw-router-rust-tests.mjs auto --dry-run --changed-file services/sdkwork-clawrouter-router-service/src/api/app_runtime.rs`
- `node scripts/run-claw-router-rust-tests.mjs auto --dry-run --changed-file crates/sdkwork-clawrouter-edge-runtime/src/runtime.rs`
- `node scripts/run-claw-router-rust-tests.mjs auto --dry-run --staged`
- `node scripts/run-claw-router-rust-tests.mjs auto --dry-run --base-ref main`

Observed result:

- `sdkwork-claw-test-support` tests passed
- representative `sdkwork-clawrouter-admin-gateway` integration test passed
- repository tooling tests passed
- scoped quick Rust test profile passed end-to-end
- scoped smoke Rust test profile passed end-to-end
- timeout-focused relay regression tests passed after reducing fixed waits
- `SeededSqliteCatalog::fork()` isolation regression test passed
- route-scoped OpenAI passthrough template-fork regression test passed
- full `model_rankings_service` test target passed with the clock-injected TTL tests now finishing in `0.00s`
- full `cache_runtime` test target passed with the clock-injected TTL tests now finishing in `0.01s`
- full `app_runtime_api` test target passed with all 54 tests green and a warm target runtime of `0.26s`
- the exact app runtime disconnect/reconnect completion test passed at `0.13s`
- the exact cancelled-terminal-event preservation test passed at `0.00s`
- the full `openai_compatible_http_relay` warm target passed at `0.33s`
- the exact slow-body timeout relay test passed three consecutive times at `0.31s` to `0.32s`
- the full `model_rankings_api` warm target passed at `0.00s`
- the exact concurrent-refresh conflict test passed at `0.00s`
- the full `model_ranking_refresh_worker` warm target passed at `0.11s`
- the exact alert-threshold and overlap tests each passed at `0.00s`
- tooling contract tests passed with the new verify build-job isolation and override coverage
- tooling contract tests passed with the new `test:rust:auto` profile and its exact-target/fallback/staged/base-ref selection rules
- `test:rust:auto` dry-run for `app_runtime.rs` narrowed to:
  - `app_runtime_api`
  - `postgres_app_runtime_sql_contract`
  - `sqlite_app_runtime_store`
- `test:rust:auto` dry-run for `gateway/src/runtime.rs` fell back to the curated `gateway` profile as intended
- contract coverage confirmed `--staged` ignores unrelated unstaged files and keeps only the staged exact target
- contract coverage confirmed `--base-ref main` ignores dirty worktree noise and keeps only committed exact targets from the branch diff
- `test:rust:auto` dry-run for `crates/sdkwork-clawrouter-router-service-test-support/src/lib.rs` narrowed to sqlite/product-store and product API targets that import that shared fixture crate
- `test:rust:auto` dry-run for `services/sdkwork-clawrouter-router-service/tests/common/mod.rs` narrowed to API targets that directly include `mod common;`

### 15. Reduced seeded SQLite template lock contention cost during concurrent test startup

Updated:

- `crates/sdkwork-claw-test-support/src/lib.rs`

Change:

- replaced the fixed `100ms` sqlite template lock retry sleep with a capped exponential backoff:
  - `10ms`
  - `20ms`
  - `40ms`
  - `80ms`
  - capped at `100ms` for longer waits
- kept the existing `120s` safety timeout unchanged
- added a focused unit test that locks the retry-delay contract in place

Effect:

- when multiple Rust integration test binaries start together and race to reuse the seeded SQLite template, short lock waits no longer pay a full `100ms` penalty on every collision
- preserves the previous long-wait ceiling and timeout semantics, so this stays a low-risk shared-fixture optimization rather than a behavioral change

## Verification

Executed after the change:

- `cargo test -p sdkwork-claw-test-support`
- `cargo test -p sdkwork-clawrouter-admin-gateway --test sqlite_product_model_route -- --exact`

Observed result:

- all `sdkwork-claw-test-support` tests passed
- the new `sqlite_template_lock_retry_delay_starts_small_and_caps` regression test passed
- seeded SQLite template creation, copy isolation, and `fork()` regression coverage all stayed green
- a representative downstream consumer target that opens the seeded SQLite catalog still passed

### 16. Reduced installed SQLite template lock contention cost for product store tests

Updated:

- `crates/sdkwork-clawrouter-router-service-test-support/src/lib.rs`
- `services/sdkwork-clawrouter-router-service/tests/sqlite_admin_access_group_store.rs`

Change:

- moved the installed SQLite fixture helper into `sdkwork-clawrouter-router-service-test-support` so product integration tests reuse one shared test-support crate instead of path-including the same helper module into many test binaries
- replaced the fixed `100ms` installed-sqlite template lock retry sleep with the same capped exponential backoff used by the shared seeded SQLite fixture:
  - `10ms`
  - `20ms`
  - `40ms`
  - `80ms`
  - capped at `100ms`
- kept the existing `120s` timeout unchanged
- added a focused regression test for the retry-delay contract in the shared test-support crate

Effect:

- concurrent product sqlite store tests that race on installed/schema/repair template initialization avoid paying a full `100ms` on every short lock collision
- keeps template correctness and cross-process safety intact while shaving shared setup latency from a path used by many sqlite-backed product store tests
- removing path-included helper duplication also cuts repeated compile work across the product SQLite integration-test binaries that share this fixture

## Verification

Executed after the change:

- `cargo test -p sdkwork-clawrouter-router-service-test-support`
- `cargo test -p sdkwork-clawrouter-router-service --test sqlite_admin_access_group_store sqlite_admin_access_group_store_allows_one_channel_in_multiple_groups -- --exact`

Observed result:

- the shared product test-support crate passed, including the new installed-sqlite retry-delay regression test
- a representative sqlite store target still initialized schema templates and passed its existing behavior test

Verification note:

- representative gateway behavior tests in `provider_passthrough_route.rs` are currently noisy in this worktree for reasons outside this optimization pass
- a representative example still returns `503` even when restored to the original direct seeding path, so those failures are not a reliable signal for the new template-reuse change itself
- because of that, this optimization was verified at the fixture/harness layer rather than by asserting unrelated gateway behavior now passes

## Remaining Low-ROI Hotspots

The most obvious remaining waits inside the optimized product test targets are now either intentional or too small to justify broader production-surface changes:

- `services/sdkwork-clawrouter-router-service/tests/app_runtime_api.rs`
  - the delayed second SSE chunk remains at `120ms`
  - it is still carrying reconnect/cancel timing semantics shared by several distributed stream tests, so pushing it lower now has a higher flake risk than payoff
- `services/sdkwork-clawrouter-router-service/tests/cache_runtime.rs`
  - one `5ms` cursor-expiry wait remains
  - removing it cleanly would require injecting a wall-clock source into `RuntimeCacheManager` for cursor issuance/validation, while the full target is already only `0.02s`
- `services/sdkwork-clawrouter-router-service/tests/model_ranking_refresh_worker.rs`
  - the retry-path test still exercises real retry flow
  - that remaining cost is intentional because this is the one place where waiting is the behavior under test, not just a fixture convenience

## Recommended Daily Workflow

For normal development, do not use:

```powershell
$env:CARGO_BUILD_JOBS='1'; cargo test --workspace
```

Use the scoped repository runner that already exists:

```powershell
pnpm test:rust:smoke
pnpm test:rust:quick
pnpm test:rust:admin-api
pnpm test:rust:app-api
pnpm test:rust:gateway
pnpm test:rust:product-relay
pnpm test:rust:runtime
```

Why this is better:

- `smoke` provides a very small, high-frequency Rust path for fixture and route sanity checks
- scoped profiles avoid compiling unrelated workspace members
- daily profiles share `target-rust-tests/daily`
- they stay isolated from `target/debug` artifacts used by local dev servers
- daily scripts now ignore inherited `CARGO_BUILD_JOBS=1` unless you explicitly pass `--build-jobs`

Plain root `cargo test` is now also safer for day-to-day use because `default-members` excludes the large `sdkwork-appbase` satellite crates from the default workspace test set. Use `cargo test --workspace` only when you intentionally want the full surface.

For the fastest useful Rust feedback loop, start with:

```powershell
pnpm test:rust:smoke
```

Then move up to `quick`, and only then to package- or domain-level profiles if the change actually touches those surfaces.

### 17. Narrowed shared product fixture crate edits to module-specific test targets

Updated:

- `crates/sdkwork-clawrouter-router-service-test-support/src/lib.rs`
- `crates/sdkwork-clawrouter-router-service-test-support/src/shared.rs`
- `crates/sdkwork-clawrouter-router-service-test-support/src/schema.rs`
- `crates/sdkwork-clawrouter-router-service-test-support/src/repair.rs`
- `crates/sdkwork-clawrouter-router-service-test-support/src/installed.rs`
- `scripts/run-claw-router-rust-tests.mjs`
- `scripts/run-claw-router-application.test.mjs`

Change:

- split the shared product SQLite fixture crate into module files for:
  - `schema_sqlite_pool`
  - `repair_sqlite_pool`
  - `installed_sqlite_pool`
- kept the public crate-root API stable, so downstream tests still import from `sdkwork_clawrouter_router_service_test_support`
- taught `test:rust:auto` to treat `schema.rs`, `repair.rs`, and `installed.rs` edits differently by scanning downstream tests for the affected exported helper symbol instead of treating every fixture-crate edit as a full fanout event

Effect:

- changing schema-only fixture setup no longer pulls in repair-only or installed-only consumers
- changing repair-only fixture setup no longer pulls in schema-only store targets
- changing installed-only fixture setup now narrows to `database_installer` instead of the entire shared fixture consumer set

## Verification

Executed after the change:

- `node scripts/run-claw-router-application.test.mjs`
- `cargo test -p sdkwork-clawrouter-router-service-test-support`
- `node scripts/run-claw-router-rust-tests.mjs auto --dry-run --changed-file crates/sdkwork-clawrouter-router-service-test-support/src/schema.rs`
- `node scripts/run-claw-router-rust-tests.mjs auto --dry-run --changed-file crates/sdkwork-clawrouter-router-service-test-support/src/repair.rs`
- `node scripts/run-claw-router-rust-tests.mjs auto --dry-run --changed-file crates/sdkwork-clawrouter-router-service-test-support/src/installed.rs`

Observed result:

- tooling contract coverage passed for the new module-specific narrowing
- the shared product fixture crate still compiled and passed its retry-delay regression test
- `schema.rs` narrowed to the schema-backed product API/store targets only
- `repair.rs` narrowed to the repair-backed product API/store/installer targets only
- `installed.rs` narrowed to `database_installer` only

### 18. Split installed database installer coverage into a dedicated integration target

Updated:

- `services/sdkwork-clawrouter-router-service/tests/database_installer.rs`
- `services/sdkwork-clawrouter-router-service/tests/database_installer_installed.rs`
- `scripts/run-claw-router-application.test.mjs`

Change:

- moved the three `installed_sqlite_pool()`-backed installer regressions out of the broad `database_installer` target into a dedicated `database_installer_installed` integration target:
  - version-only upgrade path
  - catalog sync rollback path
  - canonical ranking catalog-key import path
- left the existing repair-backed installer target focused on repair, bootstrap, and catalog status behaviors
- updated the `test:rust:auto` contract so changes to `crates/sdkwork-clawrouter-router-service-test-support/src/installed.rs` now narrow to `database_installer_installed` instead of the broader `database_installer`

Effect:

- installed-fixture edits no longer rebuild and execute the large repair-heavy installer target
- the broad installer target keeps its existing behavior coverage, but the installed-only path now has a smaller binary and shorter exact-test loop
- `test:rust:auto` for `installed.rs` now resolves to one dedicated target with only the installed-fixture regressions

## Verification

Executed after the change:

- `node scripts/run-claw-router-application.test.mjs`
- `cargo test -p sdkwork-clawrouter-router-service --test database_installer_installed sqlite_installer_upgrades_existing_installation_when_versions_change -- --exact`
- `cargo test -p sdkwork-clawrouter-router-service --test database_installer_installed sqlite_installer_catalog_sync_failure_rolls_back_catalog_rows -- --exact`
- `cargo test -p sdkwork-clawrouter-router-service --test database_installer sqlite_installer_imports_course_comment_seed_with_canonical_scope_fields -- --exact`
- `node scripts/run-claw-router-rust-tests.mjs auto --dry-run --changed-file crates/sdkwork-clawrouter-router-service-test-support/src/installed.rs`

Observed result:

- tooling contract coverage passed with the new dedicated installed-installer target expectation
- the moved installed-fixture upgrade and rollback regressions both passed in `database_installer_installed`
- a representative repair-backed installer regression still passed in the original `database_installer` target
- `installed.rs` now narrows to `cargo test -p sdkwork-clawrouter-router-service --test database_installer_installed`

### 19. Added event-driven wake-up for the gateway usage settlement worker

Updated:

- `crates/sdkwork-clawrouter-edge-runtime/src/runtime.rs`
- `crates/sdkwork-clawrouter-edge-runtime/tests/database_config_router.rs`

Change:

- changed gateway runtime settlement-worker startup to create a `tokio::sync::Notify` wake signal when the background worker is enabled
- wrapped the gateway usage recorder so a successful `record_gateway_usage(...)` call notifies the settlement worker immediately after the usage fact is written
- changed the worker loop to wait on either the existing periodic interval or an immediate wake notification from a newly recorded usage fact
- added a regression test that sets `interval_millis: 30_000` and still requires settlement success within `750ms`

Effect:

- removes the old forced wait for the next worker tick after a gateway request records billable usage
- keeps the periodic scan as a safety net for already-pending rows or missed notifications
- reduces timing sensitivity in settlement tests and improves real runtime settlement latency without changing settlement semantics

## Verification

Executed after the change:

- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_background_settlement_worker_wakes_on_new_usage_without_waiting_full_interval --target-dir target-rust-tests/iter-gateway -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_background_settlement_worker_settles_recorded_chat_usage --target-dir target-rust-tests/iter-gateway -- --exact`

Observed result:

- the new long-interval wake-up regression passed, proving the worker no longer waits for the next scheduled scan to settle freshly recorded usage
- the original background-settlement regression still passed with the event-assisted wake path in place
- even after removing the interval-bound wait, the exact `database_config_router` settlement targets still take about `44s` end-to-end in this worktree, which means the remaining dominant cost is elsewhere

Verification note:

- the broader `database_config_router` target is currently noisy in this worktree with unrelated `502` / `503` relay failures outside the usage-settlement wakeup path

### 20. Applied all-in-one SQLite runtime pool safeguards to the regular gateway runtime path

Updated:

- `crates/sdkwork-clawrouter-edge-runtime/src/runtime.rs`

Change:

- extracted regular gateway SQLite pool setup into shared helper functions for:
  - effective file-based SQLite pool max connections
  - pool acquire timeout
  - SQLite connect options with foreign keys, WAL, and busy timeout
- changed the regular `router_with_database_*` runtime path to use the same file-based SQLite pool floor logic that the all-in-one runtime path already used
- added unit coverage that locks in:
  - file-based SQLite runtime pools are raised above `1` connection
  - in-memory SQLite keeps the configured max connections
  - runtime pool acquire timeout stays explicitly configured

Effect:

- avoids running the normal gateway runtime against a file-based SQLite pool with `max_connections = 1` while catalog-refresh and settlement workers are active
- reduces serialized contention between request handling and background tasks in `database_config_router`
- removes another source of avoidable hot-target latency without changing user-facing behavior

## Verification

Executed after the change:

- `cargo test -p sdkwork-clawrouter-edge-runtime gateway_runtime_sqlite_pool_options --target-dir target-rust-tests/iter-gateway`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_background_settlement_worker_wakes_on_new_usage_without_waiting_full_interval --target-dir target-rust-tests/iter-gateway -- --exact`

Observed result:

- the new pool-option unit tests passed
- the wake-up exact gateway settlement regression still passed
- the warm exact target runtime for `database_config_router_background_settlement_worker_wakes_on_new_usage_without_waiting_full_interval` improved from about `44.22s` to `33.70s`

Verification note:

- an additional rerun later in the session hit unrelated compile failures in `services/sdkwork-clawrouter-router-service/src/application/payment_intent_runtime.rs` and `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/payment_intent_runtime_store.rs`, so broader rebuild-based verification for that moment was not a valid signal for this gateway pool change itself

## 21. Prepared a startup-install skip path for seeded gateway settlement tests

Root-cause refinement:

- the remaining hot `database_config_router` settlement tests do not only pay for route assembly and runtime workers
- they also use `seeded_sqlite_catalog()` fixtures together with public gateway helpers that default to `StartupInstallMode::Ensure`
- for these tests, that means each router startup re-enters installer work even though the fixture already contains the catalog, route, gateway API key, and usage-settlement tables required by the test scenario

Change:

- added a regression in `crates/sdkwork-clawrouter-edge-runtime/tests/database_config_router.rs` that exercises the seeded gateway catalog with `StartupInstallMode::Skip`
- switched the two hottest settlement-path tests in that file to call the explicit startup-mode helper with `StartupInstallMode::Skip`
- kept the scope tight to the exact background-settlement scenarios rather than changing the whole gateway test surface at once

Verification:

- `cargo fmt -p sdkwork-clawrouter-edge-runtime`
- `cargo test -p sdkwork-claw-test-support seeded_sqlite_catalog_contains_embedding_model_and_route --target-dir target-rust-tests/iter-support`
- `cargo test -p sdkwork-claw-test-support seeded_sqlite_catalog_can_seed_usage_settlement_appbase_points_account --target-dir target-rust-tests/iter-support`

Observed result:

- the seeded SQLite fixture still verifies its route/catalog content
- the seeded SQLite fixture still verifies the usage-settlement account seeding path
- this strengthens the hypothesis that the expensive part is redundant startup installation, not missing fixture data for the settlement tests themselves

Historical blocker at that point:

- end-to-end gateway test remeasurement is currently blocked by unrelated compile failures in `services/sdkwork-clawrouter-standalone-gateway/src/lib.rs`
- the failure pattern is mechanical argument/type drift in `router_with_api_key_management_store_and_database_status(...)` call sites, but that is outside the gateway test-performance scope and should be repaired separately before taking a clean before/after timing on this skip-mode change

## 22. Remeasured the skip-install settlement path after clearing compile-path noise

Follow-up verification:

- `cargo check -p sdkwork-clawrouter-router-service --lib --target-dir target-rust-tests/iter-product-2`
- `cargo check -p sdkwork-clawrouter-standalone-gateway --lib --target-dir target-rust-tests/iter-app-api-3`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_seeded_catalog_supports_skip_startup_install_mode --target-dir target-rust-tests/iter-gateway-skip-2 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_background_settlement_worker_wakes_on_new_usage_without_waiting_full_interval --target-dir target-rust-tests/iter-gateway-skip-2 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_background_settlement_worker_wakes_on_new_usage_without_waiting_full_interval --target-dir target-rust-tests/iter-gateway-skip-2 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_background_settlement_worker_settles_recorded_chat_usage --target-dir target-rust-tests/iter-gateway-skip-2 -- --exact`

Observed result:

- the new seeded-catalog skip-mode regression passed
- the first exact wake-up run still paid one-time target-dir compile cost, but the test body itself finished in about `0.20s`
- the warm exact wake-up run finished in about `0.18s` with Cargo reporting `0.46s` total command time
- the warm exact settlement run finished in about `0.18s` with Cargo reporting `0.49s` total command time
- compared with the prior warm wake-up measurement of about `33.70s`, routing these seeded settlement tests through `StartupInstallMode::Skip` removes roughly `33.5s` from the hot runtime path

Important interpretation:

- this result confirms the dominant remaining cost was repeated startup installation on an already prepared SQLite fixture, not the settlement worker loop itself
- cold compile cost is still real in a fresh target dir, but the day-to-day pain for repeated exact runs is now effectively gone for these two gateway settlement targets

Verification note:

- a broader `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router --target-dir target-rust-tests/iter-gateway-skip-2` run exceeded the session timeout, so this round's performance conclusions are intentionally scoped to the exact hot targets above

## 23. Expanded the seeded-catalog skip-install path across the full gateway database-config router suite

Root-cause confirmation:

- after the settlement-path win, the rest of `crates/sdkwork-clawrouter-edge-runtime/tests/database_config_router.rs` still used public gateway helpers that default to `StartupInstallMode::Ensure`
- fresh measurements confirmed that this was not limited to the background-settlement tests:
  - `database_config_router_loads_sqlite_catalog_for_openai_models` previously finished its test body in about `39.08s`
  - `database_config_router_uses_provider_relay_config_for_chat_completions` previously finished its test body in about `56.47s`
- both tests use `seeded_sqlite_catalog()` and do not exercise installer behavior directly, so they were still paying redundant startup installation on every router startup

Change:

- added a local helper in `crates/sdkwork-clawrouter-edge-runtime/tests/database_config_router.rs` that builds routers for `SeededSqliteCatalog` fixtures through:
  - `router_with_database_api_key_provider_configs_usage_settlement_worker_config_and_startup_install_mode(...)`
  - with `StartupInstallMode::Skip`
- rerouted the remaining seeded gateway tests in that file through the helper, including:
  - catalog load
  - provider relay chat / streaming / responses / embeddings
  - route-scoped secret-map chat / streaming / responses / embeddings
  - retry-policy coverage
  - the existing settlement worker scenarios

Verification:

- `cargo fmt -p sdkwork-clawrouter-edge-runtime`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_seeded_catalog_supports_skip_startup_install_mode --target-dir target-rust-tests/iter-gateway-wave5 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_loads_sqlite_catalog_for_openai_models --target-dir target-rust-tests/iter-gateway-wave5 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_uses_provider_relay_config_for_chat_completions --target-dir target-rust-tests/iter-gateway-wave5 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_uses_provider_secret_map_for_route_scoped_chat_relay --target-dir target-rust-tests/iter-gateway-wave5 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router database_config_router_background_settlement_worker_wakes_on_new_usage_without_waiting_full_interval --target-dir target-rust-tests/iter-gateway-wave5 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router --target-dir target-rust-tests/iter-gateway-wave5`

Observed result:

- `database_config_router_loads_sqlite_catalog_for_openai_models` dropped from about `39.08s` to about `0.04s`
- `database_config_router_uses_provider_relay_config_for_chat_completions` dropped from about `56.47s` to about `0.07s`
- `database_config_router_uses_provider_secret_map_for_route_scoped_chat_relay` finished in about `0.08s`
- `database_config_router_background_settlement_worker_wakes_on_new_usage_without_waiting_full_interval` remained fast at about `0.21s`
- the full warm `database_config_router` integration target now completes `15` tests in about `0.80s`

Important interpretation:

- the main day-to-day slowdown in this gateway suite was not request handling, background workers, or provider relay logic
- it was repeated installer work on an already install-ready seeded SQLite fixture
- once that redundant install path was removed consistently, the entire `database_config_router` test binary became effectively instant for iterative development

New blocker discovered while probing the next hotspot:

- follow-up measurement attempts on `provider_passthrough_route` and `edge_server_sqlite_smoke` are currently blocked by unrelated compile errors in:
  - `services/sdkwork-clawrouter-router-service/src/application/payment_intent_runtime.rs`
  - `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/payment_intent_runtime_store.rs`
  - `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/payment_intent_runtime_store.rs`
  - `services/sdkwork-clawrouter-router-service/src/api/payment_aggregate.rs`
- the current failure pattern is refund-runtime signature and struct-field drift around the new `items` field, which is outside the gateway test-performance change itself
- until that compile surface is repaired, clean timing for the next gateway integration-test hotspots will remain partially blocked

## 24. Reduced repeated installer work inside edge-server SQLite smoke tests without weakening installed-catalog assumptions

Root-cause investigation:

- the next measured hotspot was `crates/sdkwork-clawrouter-edge-runtime/tests/edge_server_sqlite_smoke.rs`
- warm exact timing showed the main proxy smoke test was still very expensive even after compile work dropped out:
  - `edge_server_proxies_real_sqlite_gateway_admin_and_app_services` finished in about `79.69s`
- this file starts multiple service routers against the same copied SQLite fixture:
  - gateway via the database-config runtime helper
  - admin via the database-config runtime helper
  - app via the database-config runtime helper
- each of those startup paths performs installation work before loading catalog/runtime state

Important failed hypothesis:

- a naive `StartupInstallMode::Skip` conversion on this smoke suite was **not** safe
- when the suite was switched to skip installation directly, `/v1/models` returned `gpt-4o-mini` instead of the expected installed-state `gpt-5.5-pro`
- that proved these smoke tests depend on installer-upgraded catalog state, unlike the earlier `database_config_router` settlement fixtures

Change:

- kept the scope inside `crates/sdkwork-clawrouter-edge-runtime/tests/edge_server_sqlite_smoke.rs`
- introduced local test helpers that:
  - build a shared SQLite runtime once per smoke test
  - run `DatabaseInstaller::ensure_installed()` once on that shared pool
  - reuse the resulting loaded catalog for admin/app shared-runtime routers
  - construct the gateway router through the existing explicit startup-mode helper with `StartupInstallMode::Skip`, relying on the already-installed database state
- this removes repeated per-service installer work while preserving the installed-catalog semantics the smoke tests assert

Verification:

- `cargo fmt -p sdkwork-clawrouter-edge-runtime`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke edge_server_proxies_real_sqlite_gateway_admin_and_app_services --target-dir target-rust-tests/iter-gateway-wave8 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke all_in_one_edge_router_serves_sqlite_gateway_admin_and_app_without_service_ports --target-dir target-rust-tests/iter-gateway-wave8 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke edge_server_proxies_app_router_console_routing_api_through_generated_sdk_paths --target-dir target-rust-tests/iter-gateway-wave8 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke --target-dir target-rust-tests/iter-gateway-wave8`

Observed result:

- `edge_server_proxies_real_sqlite_gateway_admin_and_app_services` improved from about `79.69s` to about `49.44s`
- `all_in_one_edge_router_serves_sqlite_gateway_admin_and_app_without_service_ports` completed in about `48.81s`
- `edge_server_proxies_app_router_console_routing_api_through_generated_sdk_paths` completed in about `51.17s`
- the full warm `edge_server_sqlite_smoke` target now completes `3` tests in about `54.81s`

Important interpretation:

- the main win here came from avoiding repeated installer runs across gateway/admin/app service startup within the same smoke test
- unlike the earlier seeded gateway database-config suite, this edge-server smoke suite still depends on installed-state catalog content, so install-skipping must be paired with a one-time shared installation step
- the remaining exact-test cost is now concentrated in that single per-test installation pass, which suggests the next step is an installed-and-cached seeded SQLite template rather than more router-level skip wiring

For one-off direct Cargo runs, prefer:

```powershell
cargo test -p sdkwork-clawrouter-admin-gateway --test sqlite_product_model_route
cargo test -p sdkwork-clawrouter-edge-runtime --test database_config_router
cargo test -p sdkwork-clawrouter-router-service --test openai_compatible_http_relay
```

Only run full workspace tests for merge gates, release validation, or broad refactors.

## Next High-Value Optimizations

1. Consolidate heavy integration tests inside the heaviest packages.

Large numbers of `tests/*.rs` files increase binary count and link time. Merging closely related targets into fewer integration binaries will reduce compile overhead.

2. Split test-support into light and heavy layers.

Keep crypto/header/token helpers in a lightweight crate or module, and keep database-seeded helpers separate. That avoids recompiling database-heavy fixtures for tests that only need auth helpers.

3. Introduce `cargo nextest` for execution scheduling.

This improves test execution ergonomics and scheduling, but it does not solve the main cold-build problem by itself. It should be treated as a second-phase improvement after scope reduction.

4. Keep `CARGO_BUILD_JOBS` unset during normal development.

If machine load needs throttling, lower it intentionally for that session only. Do not bake `1` into the default workflow.

5. Promote explicit install-skip helpers only for fixtures that are demonstrably install-ready.

This round proved that the gain is not limited to settlement-path tests: a whole seeded gateway suite can drop from tens of seconds per exact run to sub-second total runtime when redundant install work is removed safely. The next pass should extend the same pattern to other seeded/installed suites, but only after verifying their invariants and clearing unrelated compile blockers that currently hide the next hotspots.

6. Add an installed-and-cached seeded SQLite template for smoke suites that need post-installer catalog state.

The edge-server smoke suite still spends about `49-51s` per exact run because it performs one real installation pass per test. Caching the installed seeded state as a reusable template should remove most of that remaining runtime without reverting to unsafe direct skip mode.

6. Prefer injected monotonic clocks over paused Tokio time for pure in-memory TTL tests.

This pass confirmed that `tokio::time::pause()` is not useful when the production code measures expiry with `std::time::Instant`. Similar tests should use injectable clocks instead of real sleeps.

7. Promote more heavy seeded gateway scenarios to reusable template layers.

This pass only covered the repeated OpenAI passthrough group-route cluster. Similar template reuse should also be considered for the header-auth and default-route variants if they keep showing up in measurements.

## Bottom Line

The current slowness is expected from the combination of a very large workspace, a wide `--workspace` test command, many integration test binaries, and forced single-job compilation.

The implemented change reduces both compile scope and repeated SQLite setup cost. The biggest remaining win is workflow discipline: daily development should use scoped test commands, and full workspace runs should stay reserved for intentional full verification.

## 25. Cached seeded-plus-installed SQLite smoke state and removed the last per-test installer pass

Root-cause investigation:

- the previous `edge_server_sqlite_smoke` optimization still left one expensive step per exact test:
  - create seeded SQLite fixture
  - run `DatabaseInstaller::ensure_installed()` once for that test
  - then reuse the installed pool across gateway/admin/app startup
- that kept each exact smoke test around `49-51s`, even though the repeated per-service installer work was already gone
- a direct attempt to switch this suite over to the generic `installed_sqlite_catalog_copy()` fixture was rejected:
  - it did not preserve the smoke suite's seeded gateway/auth/routing fixture assumptions
  - it produced missing seeded rows and invalid gateway auth behavior
- the correct remaining optimization was therefore not "use the generic installed fixture"
- it was "cache the smoke suite's own seeded fixture after installer upgrade, then fork it per test"

Change:

- kept the scope inside `crates/sdkwork-clawrouter-edge-runtime/tests/edge_server_sqlite_smoke.rs`
- removed the abandoned `installed_*` gateway smoke experiment and its extra dev-dependency from `crates/sdkwork-clawrouter-edge-runtime/Cargo.toml`
- added a file-locked local template builder that:
  - starts from `seeded_sqlite_catalog()`
  - runs one real `DatabaseInstaller::ensure_installed()` pass
  - vacuums and stores that result as a reusable seeded+installed SQLite template
  - forks the template into an isolated DB per test before startup
- retained the existing shared-runtime pattern on top of that forked installed DB:
  - gateway startup uses `StartupInstallMode::Skip`
  - admin/app reuse the loaded shared runtime
- added a focused regression:
  - `seeded_installed_gateway_catalog_supports_skip_startup_install_mode_for_smoke_suite`
  - this proves the cached template still serves the installed-state `/v1/models` response with `gpt-5.5-pro`

Verification:

- `cargo check -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke --target-dir target-rust-tests/iter-gateway-wave9`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke seeded_installed_gateway_catalog_supports_skip_startup_install_mode_for_smoke_suite --target-dir target-rust-tests/iter-gateway-wave9 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke edge_server_proxies_real_sqlite_gateway_admin_and_app_services --target-dir target-rust-tests/iter-gateway-wave9 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke all_in_one_edge_router_serves_sqlite_gateway_admin_and_app_without_service_ports --target-dir target-rust-tests/iter-gateway-wave9 -- --exact`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke edge_server_proxies_app_router_console_routing_api_through_generated_sdk_paths --target-dir target-rust-tests/iter-gateway-wave9 -- --exact`
- `cargo fmt -p sdkwork-clawrouter-edge-runtime`
- `cargo test -p sdkwork-clawrouter-edge-runtime --test edge_server_sqlite_smoke --target-dir target-rust-tests/iter-gateway-wave9`

Observed result:

- first exact run of the new regression, including template creation, completed in about `49.69s`
- warm exact rerun of the same regression completed in about `2.08s`
- `edge_server_proxies_real_sqlite_gateway_admin_and_app_services` improved from about `49.44s` to about `2.29s`
- `all_in_one_edge_router_serves_sqlite_gateway_admin_and_app_without_service_ports` improved from about `48.81s` to about `2.19s`
- `edge_server_proxies_app_router_console_routing_api_through_generated_sdk_paths` improved from about `51.17s` to about `1.93s`
- the full warm `edge_server_sqlite_smoke` target now completes `4` tests in about `2.40s`

Important interpretation:

- the dominant remaining runtime in this smoke suite was not router startup, network proxying, or shared-runtime wiring
- it was the last per-test installer pass on top of the seeded fixture
- caching the suite-specific seeded+installed state removes that final heavy setup while preserving all of the installed-catalog assertions the smoke tests depend on
- this is the safe high-water mark for this suite:
  - no semantic downgrade to the generic installed fixture
  - no unsafe skip-install against raw seeded state
  - no loss of per-test isolation, because every test still forks its own DB copy before execution

