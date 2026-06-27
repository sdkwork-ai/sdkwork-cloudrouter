# Agent Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first SDKWork agent platform slice: standard contracts in appbase plus Claw Router run/metering contracts.

**Architecture:** `sdkwork-appbase` provides framework-neutral agent contracts. Claw Router implements product-facing Rust API contracts and SQL-backed persistence for run creation, step metadata, and metering linkage. UI/admin work follows after generated SDK contracts are stable.

**Tech Stack:** TypeScript/Vitest in `sdkwork-appbase`; Rust/Axum/SQLx in Claw Router; schema registry generated PostgreSQL DDL.

---

### Task 1: Appbase Agent Standard Contracts

**Files:**
- Create: `../sdkwork-appbase/packages/common/intelligence/sdkwork-agent-contracts/package.json`
- Create: `../sdkwork-appbase/packages/common/intelligence/sdkwork-agent-contracts/tsconfig.json`
- Create: `../sdkwork-appbase/packages/common/intelligence/sdkwork-agent-contracts/README.md`
- Create: `../sdkwork-appbase/packages/common/intelligence/sdkwork-agent-contracts/src/index.ts`
- Create: `../sdkwork-appbase/packages/common/intelligence/sdkwork-agent-contracts/tests/agent-contracts.standard.test.ts`
- Modify: `../sdkwork-appbase/tsconfig.base.json`
- Modify: `../sdkwork-appbase/package.json`

- [ ] Write failing standard tests for agent tables, API routes, lifecycle, MCP/skill/memory bindings, and metering events.
- [ ] Run the appbase package test and confirm the missing package failure.
- [ ] Implement the package contracts.
- [ ] Run the package test and appbase typecheck.

### Task 2: Claw Router Agent Run Contract

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/app_generation_agent_run_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/app_generation_agent.rs`
- Modify: `services/sdkwork-clawrouter-router-service/tests/app_generation_history_api.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/app_generation_agent_run_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/app_generation_agent_run_store.rs`

- [ ] Write failing route tests requiring `agent`, `run`, `steps`, `usage`, and `meteringEvents` in the response.
- [ ] Run the focused Rust test and confirm failure.
- [ ] Extend command/outcome structs and route normalization.
- [ ] Update SQLite/Postgres stores to populate metadata and response fields.
- [ ] Run focused Rust tests.

### Task 3: Schema Registry Agent Tables

**Files:**
- Modify: `docs/schema-registry/sdkwork-clawrouter.tables.yaml`
- Modify: `generated/schema/postgres/schema.sql`

- [ ] Add schema contract entries for `ai_agent`, `ai_agent_version`, `ai_agent_run`, `ai_agent_run_step`, `ai_agent_memory`, `ai_agent_tool_binding`, and `ai_agent_mcp_server`.
- [ ] Regenerate schema SQL with `python tools/schema_compiler.py`.
- [ ] Run schema quality gates.

### Task 4: Verification

- [ ] Run appbase package tests.
- [ ] Run appbase typecheck.
- [ ] Run focused Claw Router Rust tests.
- [ ] Run schema/compiler quality checks.
- [ ] Summarize remaining phase-two MCP/skill runtime work.

