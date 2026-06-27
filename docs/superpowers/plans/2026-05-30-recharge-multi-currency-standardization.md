# Recharge Multi-Currency Standardization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standardized recharge package and recharge settings system with admin-managed multi-currency configuration, seeded defaults, and frontend real-time point calculation.

**Architecture:** Recharge packages remain stored in `commerce_recharge_package` with explicit `currency_code`, while authoritative recharge conversion settings are exposed through dedicated recharge settings APIs and persisted on the `commerce_exchange_rule` `CASH -> POINTS` row using `rate` plus structured JSON in `remark`. App and admin frontend code consume only generated SDK contracts and normalize shared recharge DTOs instead of depending on legacy `rmb/bonus/points` semantics.

**Tech Stack:** Rust (`axum`, `sqlx`), TypeScript/React, OpenAPI contract generation, generated SDKs.

---

### Task 1: Lock the target contract and test behavior

**Files:**
- Modify: `docs/schema-registry/frontend-field-contracts/shared/entities/commerce.yaml`
- Modify: `docs/schema-registry/frontend-field-contracts/operations/app-commerce-recharges.yaml`
- Modify: `docs/schema-registry/frontend-field-contracts/operations/backend-commerce-recharges.yaml`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-http-rust/tests/app_recharge_checkout_router.rs`
- Modify: `services/sdkwork-clawrouter-admin-gateway/tests/database_config_router.rs`
- Modify: `apps/sdkwork-clawrouter-pc/billing-runtime.test.ts`
- Modify: `apps/sdkwork-clawrouter-pc/admin-membership-recharge-runtime.test.ts`

- [ ] **Step 1: Add failing tests for multi-currency recharge packages, recharge settings, and frontend custom amount behavior**
- [ ] **Step 2: Run the targeted tests to verify they fail for the expected legacy-model reasons**
- [ ] **Step 3: Update shared commerce entities and app/backend recharge operation schemas to the target DTOs**

### Task 2: Redesign Rust recharge domain and app recharge handlers

**Files:**
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-payment-rust/src/domain/mod.rs`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-payment-rust/src/commands/mod.rs`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-http-rust/src/recharge_router.rs`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-http-rust/src/lib.rs`

- [ ] **Step 1: Replace legacy recharge DTOs with multi-currency package/settings/order shapes**
- [ ] **Step 2: Update app recharge routes to expose package list, recharge settings, and standard order create payloads**
- [ ] **Step 3: Re-run app recharge router tests and confirm progress**

### Task 3: Implement multi-currency recharge storage and seed data

**Files:**
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust/src/sqlite_recharge.rs`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-storage-sqlx-rust/src/postgres_recharge.rs`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-bootstrap-rust/src/lib.rs`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-commerce-membership-sqlx-rust/src/seed.rs`

- [ ] **Step 1: Implement recharge points calculation from base CNY ratio plus currency-to-CNY conversion**
- [ ] **Step 2: Make package matching use `packageId` when present and preserve package currency through order/payment writes**
- [ ] **Step 3: Seed 18 default recharge packages and default `CASH -> POINTS` recharge settings**
- [ ] **Step 4: Re-run recharge seed and storage-focused tests**

### Task 4: Implement admin recharge package/settings backend

**Files:**
- Modify: `services/sdkwork-clawrouter-router-service/src/ports/admin_marketing_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/api/admin_marketing.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/sqlite/admin_marketing_store.rs`
- Modify: `services/sdkwork-clawrouter-router-service/src/infrastructure/sql/postgres/admin_marketing_store.rs`

- [ ] **Step 1: Replace legacy admin recharge package mutation/list models with standardized fields**
- [ ] **Step 2: Add dedicated recharge settings read/update endpoints in admin marketing API**
- [ ] **Step 3: Persist recharge settings on the `CASH -> POINTS` exchange rule with structured remark JSON**
- [ ] **Step 4: Re-run admin recharge and database router tests**

### Task 5: Regenerate contract outputs and SDKs

**Files:**
- Modify: `docs/schema-registry/frontend-field-contracts.yaml`
- Regenerate: `generated/api/api-contract-manifest.json`
- Regenerate: `generated/openapi/clawrouter-app-openapi.json`
- Regenerate: `generated/openapi/clawrouter-backend-openapi.json`
- Regenerate: `sdks/clawrouter-app-sdk/**`
- Regenerate: `sdks/clawrouter-backend-sdk/**`

- [ ] **Step 1: Compile the modular frontend contract snapshot**
- [ ] **Step 2: Regenerate manifest and OpenAPI snapshots**
- [ ] **Step 3: Regenerate app/backend SDKs and run SDK guardian**

### Task 6: Connect admin membership center and app recharge UI

**Files:**
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/membershipsService.ts`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipRechargePackagesPage.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/forms/MembershipRechargePackageDrawerForm.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-recharge/src/rechargeService.ts`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-console-recharge/src/RechargeView.tsx`
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-vip/src/VipView.tsx`

- [ ] **Step 1: Add backend SDK wrappers and normalization for recharge settings and standardized package fields**
- [ ] **Step 2: Add admin membership-center settings maintenance and package currency editing**
- [ ] **Step 3: Add app-side recharge settings fetch and real-time custom amount point calculation**
- [ ] **Step 4: Preserve existing VIP login guard changes while wiring shared recharge selector behavior**
- [ ] **Step 5: Re-run targeted portal runtime tests**

### Task 7: Final verification

**Files:**
- Verify only

- [ ] **Step 1: Run focused Rust tests for app recharge and admin recharge**
- [ ] **Step 2: Run focused portal runtime tests covering recharge and membership center**
- [ ] **Step 3: Run contract/SDK quality gates relevant to touched surfaces**
