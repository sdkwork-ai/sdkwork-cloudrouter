# Forum Default Tutorial Seed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install SDKWork Claw Router with professional default forum tutorial articles backed by real forum database tables.

**Architecture:** Add a bundled `data/forum/forum-seed.json` catalog and a Rust `forum_seed` importer that writes Java-compatible rows into `plus_feeds`, `plus_comments`, `plus_content_vote`, and `plus_favorite`. Wire the importer into `DatabaseInstaller` status, repair, and first-install flows using the existing checksum migration pattern.

**Tech Stack:** Rust, sqlx SQLite/Postgres, serde JSON, existing `DatabaseInstaller`, `SqliteForumStore`, Node-free Rust integration tests.

---

### Task 1: Installer Test Contract

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/tests/database_installer.rs`

- [ ] **Step 1: Write the failing test**

Replace the old “forum tables empty after install” assertion with checks that installation creates tutorial forum rows, comments, engagement rows, and a `forum` seed migration.

- [ ] **Step 2: Run test to verify it fails**

Run: `cargo test -p sdkwork-clawrouter-router-service --test database_installer sqlite_installer_installs_schema_and_sdkwork_models_catalog_once -- --exact`
Expected: FAIL because no forum seed rows or migration exist yet.

### Task 2: Bundled Forum Seed Data

**Files:**
- Create: `data/forum/README.md`
- Create: `data/forum/forum-seed.json`

- [ ] **Step 1: Add curated Chinese tutorial content**

Create 8 professional default forum posts covering quick start, overall usage, model access, routing, API keys, Playground, monitoring/billing, and forum use.

- [ ] **Step 2: Keep ids stable**

Use fixed numeric ids and `sdkwork-forum-*` UUIDs so imports are idempotent and repairable.

### Task 3: Rust Forum Seed Importer

**Files:**
- Create: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/forum_seed.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/mod.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/installer.rs`

- [ ] **Step 1: Implement JSON loader and payload hash**

Deserialize `data/forum/forum-seed.json`, validate minimal counts and relationships, and expose `bundled_forum_seed_payload`.

- [ ] **Step 2: Implement SQLite/Postgres imports**

Upsert seed rows into `plus_feeds`, `plus_comments`, `plus_content_vote`, and `plus_favorite` with metadata, JSON fields, status codes, and stable ids.

- [ ] **Step 3: Implement completeness checks**

Check canonical counts and representative fields so status detects missing or drifted forum tutorial rows.

- [ ] **Step 4: Wire installer**

Call forum seed import during install and status repair. Record migration key `forum:{CURRENT_SCHEMA_VERSION}`.

### Task 4: Verification

**Files:**
- Test: `services/sdkwork-clawrouter-router-service/tests/database_installer.rs`
- Test: `services/sdkwork-clawrouter-router-service/tests/sqlite_forum_store.rs`

- [ ] **Step 1: Run focused installer test**

Run: `cargo test -p sdkwork-clawrouter-router-service --test database_installer sqlite_installer_installs_schema_and_sdkwork_models_catalog_once -- --exact`
Expected: PASS.

- [ ] **Step 2: Run forum store tests**

Run: `cargo test -p sdkwork-clawrouter-router-service --test sqlite_forum_store`
Expected: PASS.

- [ ] **Step 3: Run forum runtime standard**

Run: `python -B -m unittest tests.test_forum_runtime_standard`
Expected: PASS or report exact existing failures.
