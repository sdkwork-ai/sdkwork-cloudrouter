# Admin Membership Center Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the admin Membership Center with independent CRUD page components, drawer-based create/edit flows, generated backend SDK service coverage, and seed integrity diagnostics.

**Architecture:** Keep the portal package boundary stable by exporting `MembershipsAdmin` from `index.tsx`, but move each membership subpage into focused `pages/*Page.tsx` files and drawer forms into `forms/*DrawerForm.tsx`. Keep all remote calls inside `membershipsService.ts` through `getClawRouterBackendSdkClient().commerce.*`; add Rust seed diagnostics in the membership SQLx seed module without schema changes.

**Tech Stack:** React 19, TypeScript, lucide-react, generated `@sdkwork/clawrouter-backend-sdk`, Node `node:test`, Rust, Axum, SQLx SQLite/Postgres.

---

## File Structure

- Modify: `apps/sdkwork-clawrouter-pc/admin-membership-entitlement-runtime.test.ts`
  - Add static coverage for independent admin membership pages, drawer forms, service CRUD functions, and read-only entitlements.
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/membershipsService.ts`
  - Add typed mutation inputs and service functions for package groups, packages, plan update/delete, member status update, and filtered reads.
- Replace: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/index.tsx`
  - Keep only `MembershipsAdmin` export and `sectionId` dispatch.
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/components/MembershipAdminPageShell.tsx`
  - Shared page heading, actions, loading/error/empty wrappers.
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/components/MembershipDrawer.tsx`
  - Right-side drawer shell for create/edit/status forms.
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/components/MembershipStatusBadge.tsx`
  - Shared status badge rendering.
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/components/MembershipEmptyState.tsx`
  - Small reusable empty state.
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/forms/MembershipPlanDrawerForm.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/forms/MembershipPackageDrawerForm.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/forms/MembershipPackageGroupDrawerForm.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/forms/MembershipRechargePackageDrawerForm.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/forms/MembershipMemberStatusDrawerForm.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipPackagesPage.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipPackageGroupsPage.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipPlansPage.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipMembersPage.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipEntitlementsPage.tsx`
- Create: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipRechargePackagesPage.tsx`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-membership-sqlx-rust/src/seed.rs`
  - Add seed integrity report structs and SQLite/Postgres diagnostic checks.
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-membership-sqlx-rust/src/lib.rs`
  - Re-export new seed integrity report functions/types if needed.
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-membership-sqlx-rust/tests/membership_sqlx_standard.rs`
  - Add tests for complete diagnostics and broken seed diagnostics.

## Task 1: Portal Runtime Tests

**Files:**
- Modify: `apps/sdkwork-clawrouter-pc/admin-membership-entitlement-runtime.test.ts`

- [ ] **Step 1: Write failing tests for page decomposition and CRUD service coverage**

Add assertions that:

```ts
const indexSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/index.tsx");
const serviceSource = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/membershipsService.ts");
const packagesPage = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipPackagesPage.tsx");
const groupsPage = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipPackageGroupsPage.tsx");
const plansPage = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipPlansPage.tsx");
const membersPage = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipMembersPage.tsx");
const entitlementsPage = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipEntitlementsPage.tsx");
const rechargePage = readPortalFile("./packages/sdkwork-clawrouter-pc-admin-memberships/src/pages/MembershipRechargePackagesPage.tsx");

assert.match(indexSource, /MembershipPackagesPage/);
assert.match(indexSource, /MembershipPackageGroupsPage/);
assert.match(indexSource, /MembershipPlansPage/);
assert.match(indexSource, /MembershipMembersPage/);
assert.match(indexSource, /MembershipEntitlementsPage/);
assert.match(indexSource, /MembershipRechargePackagesPage/);
assert.doesNotMatch(indexSource, /function PlansTab/);
assert.doesNotMatch(indexSource, /function MembersTab/);
assert.match(serviceSource, /createMembershipAdminPackageGroup/);
assert.match(serviceSource, /updateMembershipAdminPackageGroup/);
assert.match(serviceSource, /deleteMembershipAdminPackageGroup/);
assert.match(serviceSource, /createMembershipAdminPackage/);
assert.match(serviceSource, /updateMembershipAdminPackage/);
assert.match(serviceSource, /deleteMembershipAdminPackage/);
assert.match(serviceSource, /updateMembershipAdminPlan/);
assert.match(serviceSource, /deleteMembershipAdminPlan/);
assert.match(serviceSource, /updateMembershipAdminMemberStatus/);
assert.doesNotMatch(serviceSource, /\bfetch\s*\(/);
assert.doesNotMatch(serviceSource, /\baxios\b/);
assert.doesNotMatch(serviceSource, /\/backend\/v3\/api/);
for (const source of [packagesPage, groupsPage, plansPage, membersPage, rechargePage]) {
  assert.match(source, /MembershipDrawer/);
}
assert.doesNotMatch(entitlementsPage, /createMembershipAdminEntitlement|updateMembershipAdminEntitlement|deleteMembershipAdminEntitlement/);
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test admin-membership-entitlement-runtime.test.ts
```

Expected: FAIL because the new page/form files do not exist or functions are missing.

## Task 2: Rust Seed Integrity Tests

**Files:**
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-membership-sqlx-rust/tests/membership_sqlx_standard.rs`

- [ ] **Step 1: Write failing tests for seed integrity diagnostics**

Add tests that call:

```rust
let report = sdkwork_membership_subscription_sqlx::sqlite_commerce_experience_seed_integrity_report(&pool).await.expect("integrity report");
assert!(report.complete);
assert!(report.issues.is_empty());
```

Then mutate seeded data and assert exact issue codes:

```rust
sqlx::query("UPDATE membership_plan SET status = 'disabled' WHERE plan_no = 'pro'")
    .execute(&pool)
    .await
    .expect("disable plan");
let report = sdkwork_membership_subscription_sqlx::sqlite_commerce_experience_seed_integrity_report(&pool).await.expect("integrity report");
assert!(!report.complete);
assert!(report.issues.iter().any(|issue| issue.code == "missing_membership_plan"));
```

Add similar focused checks for:

- `orphan_membership_package_plan`
- `orphan_membership_package_group`
- `orphan_membership_package_sku`
- `invalid_membership_sku_product`
- `orphan_recharge_package_sku`
- `invalid_recharge_sku_product`

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
cargo test -p sdkwork_membership_subscription_sqlx --test membership_sqlx_standard seed_integrity -- --nocapture
```

Expected: FAIL because integrity report functions/types do not exist.

## Task 3: Service CRUD Boundary

**Files:**
- Modify: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/membershipsService.ts`

- [ ] **Step 1: Implement minimal service functions to satisfy portal tests**

Add typed inputs and functions for package groups, packages, plans, and member status. Use only:

```ts
getClawRouterBackendSdkClient().commerce.memberships.packageGroups.*
getClawRouterBackendSdkClient().commerce.memberships.packages.*
getClawRouterBackendSdkClient().commerce.memberships.plans.*
getClawRouterBackendSdkClient().commerce.memberships.members.status.update
```

- [ ] **Step 2: Add validation helpers**

Implement local validation helpers:

- `requiredMembershipText`
- `requiredMembershipCode`
- `requiredPositiveInteger`
- `requiredNonNegativeInteger`
- `requiredMoneyAmount`
- `requiredMembershipStatus`

- [ ] **Step 3: Run portal runtime test**

Run:

```powershell
node --test admin-membership-entitlement-runtime.test.ts
```

Expected: still FAIL until page files are created.

## Task 4: Page and Drawer Components

**Files:**
- Replace: `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/index.tsx`
- Create all `components/*`, `forms/*`, and `pages/*` files listed above.

- [ ] **Step 1: Implement shared components**

Create reusable drawer, shell, empty state, and status badge components. Use existing admin styling classes and lucide icons.

- [ ] **Step 2: Implement drawer forms**

Each form accepts `mode`, optional initial record, `onSubmit`, and `onCancel`. Each form handles only local input state and submit button state.

- [ ] **Step 3: Implement page components**

Each page owns its own data loading and mutation refresh:

- Package groups: list/create/edit/delete.
- Packages: list/create/edit/delete with plan/group options.
- Plans: list/create/edit/delete.
- Members: list/status update.
- Entitlements: read-only list/filter/refresh.
- Recharge packages: list/create/edit/delete.

- [ ] **Step 4: Simplify `index.tsx`**

Keep only `MembershipsAdmin`, `sectionId` resolution, and page dispatch.

- [ ] **Step 5: Run portal tests**

Run:

```powershell
node --test admin-membership-entitlement-runtime.test.ts admin-membership-recharge-runtime.test.ts
```

Expected: PASS after implementation.

## Task 5: Seed Integrity Diagnostics

**Files:**
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-membership-sqlx-rust/src/seed.rs`
- Modify: `sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-membership-sqlx-rust/src/lib.rs`

- [ ] **Step 1: Add report types**

Add:

```rust
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommerceExperienceSeedIntegrityReport {
    pub complete: bool,
    pub issues: Vec<CommerceExperienceSeedIntegrityIssue>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CommerceExperienceSeedIntegrityIssue {
    pub code: String,
    pub table: String,
    pub message: String,
}
```

- [ ] **Step 2: Implement SQLite diagnostic checks**

Add `sqlite_commerce_experience_seed_integrity_report`.

- [ ] **Step 3: Implement Postgres diagnostic checks**

Add `postgres_commerce_experience_seed_integrity_report` with equivalent SQL semantics.

- [ ] **Step 4: Delegate bool complete checks to reports**

Make existing complete functions return `report.complete`.

- [ ] **Step 5: Re-export functions/types**

Update `src/lib.rs` if exports are not already covered.

- [ ] **Step 6: Run Rust tests**

Run:

```powershell
cargo test -p sdkwork_membership_subscription_sqlx --test membership_sqlx_standard
```

Expected: PASS.

## Task 6: Typecheck and Quality Gates

**Files:**
- No new files unless tests reveal necessary fixes.

- [ ] **Step 1: Run targeted node tests**

Run:

```powershell
node --test admin-membership-recharge-runtime.test.ts admin-membership-entitlement-runtime.test.ts membership-runtime.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run Rust membership test**

Run:

```powershell
cargo test -p sdkwork_membership_subscription_sqlx --test membership_sqlx_standard
```

Expected: PASS.

- [ ] **Step 3: Run portal typecheck**

Run:

```powershell
pnpm --dir apps/sdkwork-clawrouter-pc typecheck
```

Expected: PASS or report exact pre-existing/non-membership failures.

- [ ] **Step 4: Run schema quality gate**

Run:

```powershell
python -B -m tools.schema_quality_gate
```

Expected: PASS or report exact pre-existing/non-membership failures.
