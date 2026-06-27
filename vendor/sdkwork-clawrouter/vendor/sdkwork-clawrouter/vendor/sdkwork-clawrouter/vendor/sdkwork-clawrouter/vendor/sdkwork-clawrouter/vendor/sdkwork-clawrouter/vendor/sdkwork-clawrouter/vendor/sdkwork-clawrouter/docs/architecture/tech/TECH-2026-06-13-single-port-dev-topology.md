> Migrated from `docs/superpowers/plans/2026-06-13-single-port-dev-topology.md` on 2026-06-24.
> Owner: SDKWork maintainers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make single-port integrated startup the default development topology for `sdkwork-clawrouter` and sibling `sdkwork-api-cloud-gateway`.

**Architecture:** Keep low-level split capability only behind tests or explicit internal validation, while changing public `dev` entrypoints, templates, and docs to single-port-first behavior. Product developers should see one entry port by default.

**Tech Stack:** Node.js scripts, package.json script surface, TOML runtime config, Rust gateway runtime tests, Markdown docs.

---

### Task 1: Update Claw Router default-facing script surface

**Files:**
- Modify: `package.json`
- Modify: `scripts/run-claw-router-application.mjs`
- Modify: `scripts/dev/start-workspace.mjs`
- Test: `scripts/run-claw-router-application.test.mjs`

- [ ] **Step 1: Write or extend failing tests for default single-port messaging**

- [ ] **Step 2: Run the targeted script tests and confirm they fail for the expected default/split wording**

- [ ] **Step 3: Update product script help and command messaging so split/distributed is no longer presented as a normal development path**

- [ ] **Step 4: Keep all-in-one single-port commands as the default surface and demote any remaining split commands to internal validation wording**

- [ ] **Step 5: Re-run the targeted script tests and confirm they pass**

### Task 2: Update Claw Router documentation and dry-run expectations

**Files:**
- Modify: `specs/README.md`
- Modify: `README.md`
- Modify: `docs/installation/README.md`
- Modify: `docs/installation/en-US/source-install.md`
- Modify: `docs/installation/zh-CN/source-install.md`

- [ ] **Step 1: Identify docs that currently describe split or multi-port local development as normal**

- [ ] **Step 2: Update docs to describe single-port integrated startup as the default local topology**

- [ ] **Step 3: Ensure any remaining split mention is explicitly marked internal validation only**

- [ ] **Step 4: Run targeted text searches to confirm default docs no longer teach multi-port dev as the standard path**

### Task 3: Change sdkwork-api-cloud-gateway default dev to single-port integrated mode

**Files:**
- Modify: `../sdkwork-api-cloud-gateway/package.json`
- Modify: `../sdkwork-api-cloud-gateway/configs/sdkwork-api-cloud-gateway.development.toml.example`
- Modify: `../sdkwork-api-cloud-gateway/README.md`
- Modify: `../sdkwork-api-cloud-gateway/crates/sdkwork-api-cloud-gateway-api-server/README.md`
- Test: `../sdkwork-api-cloud-gateway/crates/sdkwork-api-cloud-gateway-config/tests/config_tests.rs` if required

- [ ] **Step 1: Write or update a failing config/runtime expectation test if the repo already checks default config semantics**

- [ ] **Step 2: Change default `pnpm dev` away from the split upstream template**

- [ ] **Step 3: Rewrite the development TOML template so its default mode is single-port integrated instead of dozens of split upstream base URLs**

- [ ] **Step 4: Update gateway docs so the standard run path is one port and split is internal validation only**

- [ ] **Step 5: Run narrow gateway verification for config or runtime expectations**

### Task 4: Verify default topology behavior in both repos

**Files:**
- Modify only if verification reveals gaps

- [ ] **Step 1: Run `node scripts/run-claw-router-application.mjs plan --dev-env-file .env.postgres`**

- [ ] **Step 2: Confirm the rendered default Claw Router dev topology still exposes one public entry port**

- [ ] **Step 3: Run the narrowest `sdkwork-api-cloud-gateway` dev/config verification command used by its repo**

- [ ] **Step 4: Confirm default gateway dev no longer depends on the large split upstream port list**

- [ ] **Step 5: Summarize residual split-only test/internal paths that remain by design**

