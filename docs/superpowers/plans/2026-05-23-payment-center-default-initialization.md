# Payment Center Default Initialization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add complete inactive default payment-center initialization data for new Claw Router installations.

**Architecture:** Extend the appbase commerce storage migration with payment provider, provider account, channel, and route-rule tables. Extend the commerce bootstrap seed catalog with standard payment center records, then make the existing commerce experience installer upsert those records idempotently while preserving admin-owned credential fields and active statuses.

**Tech Stack:** Rust, SQLx, SQLite, PostgreSQL, appbase commerce native Rust packages, Claw Router database installer tests.

---

### Task 1: Payment Storage Contract

**Files:**
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/migrations/0001_commerce_foundation.sql`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/lib.rs`
- Test: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/tests/commerce_storage_standard.rs`

- [ ] Write failing storage tests expecting payment provider, provider account, channel, and route-rule tables plus indexes.
- [ ] Run `cargo test -p sdkwork_commerce_storage_sqlx commerce_storage_standard -- payment`.
- [ ] Add payment configuration tables and indexes to the initial migration.
- [ ] Add tables to `commerce_database_tables`, migration plan, repository bindings, and payment SQL catalog.
- [ ] Re-run the storage tests.

### Task 2: Bootstrap Seed Catalog

**Files:**
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-bootstrap-rust/src/lib.rs`
- Test: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-bootstrap-rust/tests/commerce_bootstrap_standard.rs`

- [ ] Write failing bootstrap tests expecting seven standard methods, six providers, six provider accounts, thirty-six channels, and thirty-six route rules.
- [ ] Run `cargo test -p sdkwork_commerce_bootstrap commerce_experience_seed_manifest_initializes_reusable_membership_and_recharge_catalogs`.
- [ ] Add seed structs and catalog functions for providers, accounts, channels, and route rules.
- [ ] Include the new counts and seed arrays in the commerce experience manifest payload.
- [ ] Re-run bootstrap tests.

### Task 3: Installer Seed Upserts

**Files:**
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-membership-sqlx-rust/src/seed.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/database_installer.rs`

- [ ] Write failing installer tests expecting inactive payment methods, providers, provider accounts, channels, and route rules after install.
- [ ] Add failing repair preservation coverage for edited provider account fields and active statuses.
- [ ] Run `cargo test -p sdkwork_clawrouter_router_service --test database_installer sqlite_installer_seeds_complete_inactive_payment_center_defaults`.
- [ ] Add SQLite and PostgreSQL upsert functions for the new seed rows.
- [ ] Add integrity checks for inactive/default payment center rows.
- [ ] Re-run targeted installer tests.

### Task 4: Runtime Standard Alignment

**Files:**
- Modify: `tests/test_commerce_standard.py`
- Modify if needed: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/sqlite_recharge.rs`
- Modify if needed: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/postgres_recharge.rs`

- [ ] Write failing standard tests asserting seed method codes match OpenAPI method enums.
- [ ] Ensure recharge lookup still only accepts active methods and supports the canonical `wechat_pay` method code where relevant.
- [ ] Run `python -B -m unittest tests.test_commerce_standard`.

### Task 5: Final Verification

**Files:**
- No production files expected.

- [ ] Run storage package tests.
- [ ] Run bootstrap package tests.
- [ ] Run membership SQLx seed tests if present.
- [ ] Run targeted database installer tests.
- [ ] Run commerce standard Python tests.
- [ ] Inspect `git diff --check`.
