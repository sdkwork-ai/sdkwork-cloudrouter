# Admin Membership Center Completeness Design

## Status

This specification defines the next iteration of the admin Membership Center in
`sdkwork-clawrouter`.

The implementation must complete the admin-facing CRUD and status-management
workflows that are already backed by the generated backend SDK and the standard
appbase commerce membership APIs. It must not create a parallel member-center, billing, or
compatibility system.

The user confirmed this scope on 2026-05-23:

- Do not change database tables, columns, indexes, migrations, or embedded
  schemas.
- Complete the admin Membership Center using the existing generated backend SDK
  surface where possible.
- Keep entitlement records read-only because they are fulfillment-derived data.
- Define independent CRUD page subcomponents.
- Implement create and edit workflows with drawer-based forms.
- Improve data initialization logic and data integrity diagnostics.

## Goal

Make the admin Membership Center operationally complete for the existing
membership business surface:

- Membership package groups can be listed, created, edited, and disabled.
- Membership packages can be listed, created, edited, and disabled.
- Membership plans can be listed, created, edited, and disabled.
- Membership members can be listed and have their membership status maintained.
- Membership entitlements can be listed, filtered, refreshed, and inspected as
  read-only fulfillment records.
- Recharge packages can keep their existing CRUD behavior but move into the same
  independent page and drawer structure.
- Seed initialization can prove not only row counts but also relationship
  completeness across plans, package groups, packages, SKUs, recharge packages,
  products, and payment methods.

## Non-Goals

- Do not add manual create, update, or delete operations for membership
  entitlements. Entitlements are granted by purchase and fulfillment workflows.
- Do not add database schema changes.
- Do not hand-edit generated SDK output.
- Do not add raw `fetch`, `axios`, `XMLHttpRequest`, string-built backend URLs,
  manual auth headers, or backend-local SDK forks in the portal.
- Do not add `/memberships`, `/billing/memberships`, or legacy billing compatibility routes.
- Do not change the visual language of the admin console. The work should use
  the existing table, button, badge, modal/drawer, loading, error, and empty-state
  patterns already used by the portal.
- Do not convert soft-delete semantics into hard deletes. Current backend delete
  operations disable records.

## Current State

The admin Membership Center is already routed and uses the standard membership
package:

- Portal route registration:
  - `apps/sdkwork-clawrouter-pc/src/App.tsx`
  - `/admin/memberships/packages`
  - `/admin/memberships/plans`
  - `/admin/memberships/members`
  - `/admin/memberships/entitlements`
  - `/admin/memberships/recharge-packages`
- Admin navigation:
  - `apps/sdkwork-clawrouter-pc/src/AdminLayout.tsx`
- Portal package:
  - `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships`
- Service boundary:
  - `apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/membershipsService.ts`

The service already uses the generated backend SDK through
`getClawRouterBackendSdkClient().commerce.*` and must keep doing so.

The backend membership router already exposes the required management endpoints:

- `GET /backend/v3/api/memberships/plans`
- `POST /backend/v3/api/memberships/plans`
- `PUT /backend/v3/api/memberships/plans/{planId}`
- `DELETE /backend/v3/api/memberships/plans/{planId}`
- `GET /backend/v3/api/memberships/packages`
- `POST /backend/v3/api/memberships/packages`
- `PUT /backend/v3/api/memberships/packages/{packageId}`
- `DELETE /backend/v3/api/memberships/packages/{packageId}`
- `GET /backend/v3/api/memberships/package_groups`
- `POST /backend/v3/api/memberships/package_groups`
- `PUT /backend/v3/api/memberships/package_groups/{packageGroupId}`
- `DELETE /backend/v3/api/memberships/package_groups/{packageGroupId}`
- `GET /backend/v3/api/memberships/members`
- `PATCH /backend/v3/api/memberships/members/{membershipId}/status`
- `GET /backend/v3/api/memberships/entitlements`

The generated backend TypeScript SDK already exposes these operations under:

- `commerce.memberships.plans.*`
- `commerce.memberships.packages.*`
- `commerce.memberships.packageGroups.*`
- `commerce.memberships.members.*`
- `commerce.memberships.entitlements.*`
- `commerce.recharges.packages.*`

The current portal implementation has these gaps:

- `packages` has an add drawer-like modal, but submit only closes the UI and does
  not call the package create API.
- `package groups` has an add modal, but submit only closes the UI and does not
  call the package group create API.
- `plans` supports create but does not expose edit or delete/disable.
- `members` lists records but does not expose status maintenance.
- `entitlements` lists records but has minimal error, empty, refresh, and filter
  handling.
- `rechargePackages` has CRUD behavior mixed into the large `index.tsx` file
  instead of an independent page and drawer form.
- `index.tsx` is doing too much. It owns routing, page state, list state, modal
  state, forms, table rendering, and mutation behavior.

## Architecture

Refactor the admin memberships package into small, page-oriented units while
keeping the public export stable.

Target file layout:

```text
apps/sdkwork-clawrouter-pc/packages/sdkwork-clawrouter-pc-admin-memberships/src/
  index.tsx
  membershipsService.ts
  components/
    MembershipAdminPageShell.tsx
    MembershipDrawer.tsx
    MembershipStatusBadge.tsx
    MembershipEmptyState.tsx
  pages/
    MembershipPackagesPage.tsx
    MembershipPackageGroupsPage.tsx
    MembershipPlansPage.tsx
    MembershipMembersPage.tsx
    MembershipEntitlementsPage.tsx
    MembershipRechargePackagesPage.tsx
  forms/
    MembershipPlanDrawerForm.tsx
    MembershipPackageDrawerForm.tsx
    MembershipPackageGroupDrawerForm.tsx
    MembershipRechargePackageDrawerForm.tsx
    MembershipMemberStatusDrawerForm.tsx
```

Responsibilities:

- `index.tsx`
  - Export `MembershipsAdmin`.
  - Resolve `sectionId`.
  - Render the appropriate independent page component.
  - Avoid holding page-specific list or form state.
- `membershipsService.ts`
  - Own backend SDK calls, response normalization, input validation, and
    generated-SDK request parameter creation.
  - Expose typed functions for pages and forms.
  - Continue importing backend SDK access only through
    `sdkwork-clawroutes-pc-commons/runtime`.
- `pages/*Page.tsx`
  - Own list loading, filters, selected row, drawer open state, delete/disable
    confirmation state, mutation refresh, loading, error, and empty states for
    exactly one admin subpage.
  - Do not call generated SDK directly. Pages call `membershipsService.ts`.
- `forms/*DrawerForm.tsx`
  - Own form fields, local validation presentation, submit button state, and
    mapping between record data and mutation inputs.
  - Receive `mode`, initial record, required lookup lists, `onCancel`, and
    `onSubmit` props.
- `components/MembershipDrawer.tsx`
  - Provide a reusable right-side drawer shell.
  - Support create, edit, and status-update flows.
  - Keep layout stable on desktop and mobile.
- `components/MembershipStatusBadge.tsx`
  - Centralize status badge styles for active, inactive, disabled, suspended,
    cancelled, expired, and exhausted states.
- `components/MembershipAdminPageShell.tsx`
  - Provide consistent page heading, actions row, refresh action, error state,
    and empty-state framing.

## Page Designs

### Membership Package Groups Page

The package group page manages `membership_package_group`.

Capabilities:

- List package groups.
- Refresh list.
- Create package group in a drawer.
- Edit package group in a drawer.
- Disable package group through `memberships.packageGroups.delete`.

Fields:

- `code`
- `name`
- `description`
- `billingCycle`
- `durationDays`
- `sortWeight`
- `status`

The page should show package count when available. If only the group list API is
loaded, package count can be derived by also loading packages and grouping by
`packageGroupId`.

### Membership Packages Page

The package page manages `membership_package`.

Capabilities:

- List membership packages.
- Filter by package group, plan, and status when parameters are supported by the
  generated SDK.
- Refresh list.
- Create package in a drawer.
- Edit package in a drawer.
- Disable package through `memberships.packages.delete`.

Fields:

- `code`
- `packageGroupId`
- `planId`
- `name`
- `priceAmount`
- `currencyCode`
- `durationDays`
- `status`

The create and edit drawer must load plan and package-group options. It must not
allow submission without a valid group, plan, name, code, non-negative price, and
positive duration.

### Membership Plans Page

The plan page manages `membership_plan`.

Capabilities:

- List membership plans.
- Refresh list.
- Create plan in a drawer.
- Edit plan in a drawer.
- Disable plan through `memberships.plans.delete`.

Fields:

- `code`
- `name`
- `rank`
- `status`
- `benefits`

Benefits are editable as a simple structured list. The first version should
support these benefit fields:

- `name`
- `benefitKey`
- `type`
- `description`
- `icon`
- `usageLimit`

The form should preserve existing benefits on edit. If the operator clears all
benefits, it should send an empty benefits array intentionally.

### Membership Members Page

The members page manages status changes for `membership_subscription`.

Capabilities:

- List memberships.
- Filter by `user_id`, `plan_id`, and `status` where SDK parameters exist.
- Refresh list.
- Open a status-maintenance drawer.
- Update status through `memberships.members.status.update`.

Allowed statuses:

- `active`
- `inactive`
- `expired`
- `suspended`
- `cancelled`

The page must not create or delete membership records. Memberships are created by
purchase and fulfillment flows.

### Membership Entitlements Page

The entitlements page is a read-only audit page for
`entitlement_grant`.

Capabilities:

- List entitlements.
- Filter by `membership_id`, `plan_id`, and `status` where SDK parameters exist.
- Refresh list.
- Show clear loading, error, and empty states.

No create, edit, or delete controls should be shown.

### Membership Recharge Packages Page

The recharge packages page manages `commerce_recharge_package` through the
existing recharge package backend SDK methods.

Capabilities:

- List recharge packages.
- Refresh list.
- Create recharge package in a drawer.
- Edit recharge package in a drawer.
- Disable/delete recharge package through `recharges.packages.delete`.

Fields:

- `rmb`
- `bonus`
- `status`

The existing validation should be retained:

- RMB amount is required and has at most two decimal places.
- Bonus is a non-negative integer.
- Status defaults to `active`.

## Drawer Interaction

All create, edit, and member status-update flows must use a right-side drawer.

Drawer behavior:

- Desktop width should be stable, approximately `480px` to `560px`.
- Mobile width should be full viewport width.
- The drawer should include title, optional description, form body, inline error
  region, cancel button, and primary submit button.
- The overlay should close on cancel or successful submit.
- Esc/overlay close can be supported if it follows existing portal patterns.
- Submit disables buttons and shows a loader.
- Validation errors remain inside the drawer.
- Successful submit closes the drawer, refreshes the page data, and preserves the
  current filter/selection where practical.

Delete/disable confirmation can remain a lightweight confirmation flow. It does
not need to use the drawer unless the existing admin pattern already favors a
drawer for destructive actions.

## Service API

`membershipsService.ts` should expose these page-facing functions:

```ts
fetchMembershipAdminPackageCatalog()
fetchMembershipAdminPackageGroups()
createMembershipAdminPackageGroup(input)
updateMembershipAdminPackageGroup(packageGroupId, input)
deleteMembershipAdminPackageGroup(packageGroupId)

fetchMembershipAdminPackages(params?)
createMembershipAdminPackage(input)
updateMembershipAdminPackage(packageId, input)
deleteMembershipAdminPackage(packageId)

fetchMembershipAdminPlans()
createMembershipAdminPlan(input)
updateMembershipAdminPlan(planId, input)
deleteMembershipAdminPlan(planId)

fetchMembershipAdminMembers(params?)
updateMembershipAdminMemberStatus(membershipId, input)

fetchMembershipAdminEntitlements(params?)

fetchMembershipAdminRechargePackages()
createMembershipAdminRechargePackage(input)
updateMembershipAdminRechargePackage(packageId, input)
deleteMembershipAdminRechargePackage(packageId)
```

Input types should be explicit and local to this package. They should map to the
generated SDK mutation request shapes, but page components should not depend on
generated SDK types directly.

Service validation:

- IDs must be non-empty.
- Codes must contain only ASCII letters, numbers, `_`, and `-`.
- Names must be non-empty.
- Price amounts must be non-negative money strings with at most two decimals.
- Duration days must be a positive integer.
- Sort weight must be a non-negative integer.
- Rank must be a non-negative integer.
- Status must be in the backend-supported enum for the relevant resource.

## Backend and Contract

No backend API contract change is expected for this iteration because the
required management operations already exist in:

- `docs/schema-registry/frontend-field-contracts/operations/backend-commerce-memberships.yaml`
- `generated/openapi/clawrouter-backend-openapi.json`
- `sdks/clawrouter-backend-sdk/clawrouter-backend-sdk-typescript/src/api/commerce.ts`

If implementation discovers a generated SDK method is missing, the fix must
follow the normal contract-first path:

1. Update `docs/schema-registry/frontend-field-contracts.yaml` or the relevant
   fragment.
2. Regenerate `generated/api/api-contract-manifest.json`.
3. Regenerate `generated/openapi/clawrouter-backend-openapi.json`.
4. Regenerate the backend SDK.
5. Run the SDK guardian.

No hand-written fallback is allowed.

## Data Initialization and Integrity

The existing seed entry points stay in
`sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-membership-sqlx-rust/src/seed.rs`:

- `upsert_sqlite_commerce_experience_seed`
- `upsert_postgres_commerce_experience_seed`
- `sqlite_commerce_experience_seed_complete`
- `postgres_commerce_experience_seed_complete`

The boolean complete checks should remain for compatibility.

Add diagnostic integrity checks that return structured issues rather than only
`true` or `false`. The exact Rust type can be simple and serializable enough for
tests, for example:

```rust
pub struct CommerceExperienceSeedIntegrityReport {
    pub complete: bool,
    pub issues: Vec<CommerceExperienceSeedIntegrityIssue>,
}

pub struct CommerceExperienceSeedIntegrityIssue {
    pub code: String,
    pub table: String,
    pub message: String,
}
```

The diagnostic checks should cover SQLite and Postgres with equivalent behavior:

- Seed products exist:
  - `seed-product-membership`
  - `seed-product-points-recharge`
- Membership plans exist and are active:
  - `free`
  - `basic`
  - `pro`
  - `premium`
- Membership package groups exist and are active:
  - `membership-month`
  - `membership-year`
  - `membership-day`
  - `membership-week`
- Membership packages exist and are active:
  - 16 expected seeded packages.
- Every active membership package references an existing active membership plan.
- Every active membership package references an existing active membership
  package group.
- Every active membership package references an existing membership SKU.
- Every membership SKU references `seed-product-membership`.
- Every active recharge package references an existing recharge SKU.
- Every recharge SKU references `seed-product-points-recharge`.
- Each seeded membership package group has the expected package coverage.
- Required payment methods exist and are active:
  - `wechat`
  - `alipay`
  - `stripe`

The diagnostics should produce stable `code` values so tests can assert exact
failure modes, such as:

- `missing_seed_product`
- `missing_membership_plan`
- `missing_membership_package_group`
- `missing_membership_package`
- `orphan_membership_package_plan`
- `orphan_membership_package_group`
- `orphan_membership_package_sku`
- `invalid_membership_sku_product`
- `orphan_recharge_package_sku`
- `invalid_recharge_sku_product`
- `incomplete_membership_package_group`
- `missing_payment_method`

The existing complete checks can delegate to the diagnostic check and return
`report.complete`.

## Data Completeness Matrix

| Area | Data source | Admin behavior | Initialization check |
| --- | --- | --- | --- |
| Membership plans | `membership_plan` | list/create/edit/disable | required seeded plans active |
| Package groups | `membership_package_group` | list/create/edit/disable | required seeded groups active |
| Packages | `membership_package`, `commerce_product_sku` | list/create/edit/disable | required packages, plan/group/sku links |
| Members | `membership_subscription` | list/status update | purchase-created data, no seed requirement |
| Entitlements | `entitlement_grant` | read-only list/filter | purchase-created data, no seed requirement |
| Recharge packages | `commerce_recharge_package`, `commerce_product_sku` | list/create/edit/disable | required packages and SKU links |
| Payment methods | `commerce_payment_method` | not edited here | required seed methods active |

## Testing

Follow test-first implementation.

Portal runtime tests should verify:

- `MembershipsAdmin` routes each `sectionId` to an independent page component.
- `MembershipPackagesPage`, `MembershipPackageGroupsPage`,
  `MembershipPlansPage`, `MembershipMembersPage`,
  `MembershipEntitlementsPage`, and `MembershipRechargePackagesPage` exist.
- Create and edit flows use `MembershipDrawer` or the drawer form components.
- Package group, package, plan, member status, and recharge package service
  functions exist.
- Service functions call the generated backend SDK methods.
- The membership service does not contain raw `fetch`, `axios`, or
  `/backend/v3/api` string-built calls.
- Entitlements page does not expose create, edit, or delete controls.

Rust SQLx tests should verify:

- Complete seed data returns an integrity report with `complete = true` and no
  issues.
- Removing or disabling a seeded membership plan reports
  `missing_membership_plan`.
- Creating a membership package with a missing plan reports
  `orphan_membership_package_plan`.
- Creating a membership package with a missing group reports
  `orphan_membership_package_group`.
- Creating a membership package with a missing SKU reports
  `orphan_membership_package_sku`.
- Moving a membership SKU to the wrong product reports
  `invalid_membership_sku_product`.
- Removing a recharge SKU reports `orphan_recharge_package_sku`.
- Moving a recharge SKU to the wrong product reports
  `invalid_recharge_sku_product`.
- Existing admin membership CRUD tests still pass.

Expected verification commands:

```powershell
node --test admin-membership-recharge-runtime.test.ts admin-membership-entitlement-runtime.test.ts membership-runtime.test.ts
cargo test -p sdkwork_membership_subscription_sqlx --test membership_sqlx_standard
pnpm --dir apps/sdkwork-clawrouter-pc typecheck
python -B -m tools.schema_quality_gate
```

If generated backend SDK files are regenerated, also run:

```powershell
python -B -m tools.api_contract_manifest
python -B -m tools.clawrouter_openapi_generator
node sdks\clawrouter-backend-sdk\bin\generate-sdk.mjs --language typescript
python -B -m tools.clawrouter_sdk_guardian
```

## Rollout

Implementation should be incremental:

1. Add failing portal runtime tests for page decomposition and service CRUD
   functions.
2. Add failing Rust integrity diagnostics tests.
3. Refactor `index.tsx` into independent page and drawer components.
4. Complete `membershipsService.ts` methods using only the generated backend SDK.
5. Add seed integrity diagnostics while preserving existing complete checks.
6. Run targeted tests.
7. Run typecheck and schema quality checks.

## Open Questions

- The exact drawer visual implementation should follow existing portal
  components if one exists. If there is no reusable drawer, add a small local
  `MembershipDrawer` component in the admin memberships package.
- Delete labels should use user-facing "Disable" or "Delete" consistently with
  existing admin copy. Backend semantics are disable/soft-delete.
- Benefits editing should remain intentionally simple in this iteration. Complex
  benefit policy logic can be introduced later through a separate plan.
