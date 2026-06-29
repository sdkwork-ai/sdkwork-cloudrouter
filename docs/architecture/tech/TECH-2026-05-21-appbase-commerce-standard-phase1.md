> Migrated from `docs/superpowers/plans/2026-05-21-appbase-commerce-standard-phase1.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Appbase Commerce Standard Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the billing-centered commerce contract surface with a new no-compatibility standard that is organized around catalog, cart, address, checkout, order, payment, refund, fulfillment, membership, recharge, wallet, coupon, and invoice domains.

**Architecture:** This phase is contract and governance only. It updates the reusable commerce contracts, route catalog, capability/integration manifests, and the guardian scripts that enforce no-`billing` rules. It does not implement order-center or payment-center business logic yet; those become later phases once the contract surface is locked.

**Tech Stack:** TypeScript, Rust, Python unittest, YAML, JSON, the existing appbase commerce packages under `<workspace-root>/sdkwork-appbase`, and the existing `specs/API_SPEC.md` governance rules.

---

## Scope Boundaries

This phase is intentionally narrow:

- In scope: no-compatibility API contract renaming, app/backend route taxonomy, operationId governance, no-`billing` lint rules, manifest alignment, and verification-command cleanup.
- In scope: contract-level updates for commerce domain groups such as catalog, cart, checkout, orders, payments, refunds, fulfillments, memberships, recharges, wallet, coupons, and invoices.
- In scope: updates to the appbase capability/integration catalogs and the guard scripts that enforce integration rules.
- Out of scope: order-center persistence, payment-center provider adapters, checkout orchestration implementation, SQL schema migrations, and fulfillment/wallet/membership runtime behavior. Those are separate plans.
- Out of scope: any compatibility alias, response envelope compatibility mode, legacy `/billing` route, or product-local fallback commerce store.

## File Structure

Modify these files first because they define the public contract and the enforcement gates:

- Modify `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-contracts/src/index.ts`
  - Replace the single `billing` namespace with domain-oriented namespaces and operation groups.
  - Remove every `billing` path, SDK tag, and surface name from the public contract map.
- Modify `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-sdk-ports/src/index.ts`
  - Align service ports with the new commerce domains and remove `billing` naming.
- Modify `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-service/src/index.ts`
  - Replace legacy app service call groups with the new standard operation tree.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/src/lib.rs`
  - Rewrite route metadata for app and backend surface paths, tags, and operation ids.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/tests/commerce_http_standard.rs`
  - Lock the new route taxonomy and reject `/billing` paths or surface-prefixed operation ids.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/tests/app_commerce_foundation_router.rs`
  - Update router assertions to the new standard surface groups.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/tests/app_recharge_checkout_router.rs`
  - Update recharge/checkout assertions to the new standard route taxonomy.
- Modify `<workspace-root>/sdkwork-clawrouter/specs/appbase-integration.yaml`
  - Remove `billing` verification names and align the integration manifest to the new standard contract.
- Modify `<workspace-root>/sdkwork-clawrouter/tests/test_appbase_integration_guardian.py`
  - Add failing tests for `billing` namespace, `/billing` route paths, legacy verification command names, and compatibility-mode assumptions.
- Modify `<workspace-root>/sdkwork-clawrouter/tests/test_appbase_capability_guardian.py`
  - Add failing tests for `billing`-named SDK namespaces, forbidden appbase shadow paths, and reusable-package import boundaries.
- Modify `<workspace-root>/sdkwork-clawrouter/tools/appbase_integration_guardian.py`
  - Enforce no-`billing`, no compatibility envelope, and no surface-prefixed operationId rules.
- Modify `<workspace-root>/sdkwork-clawrouter/tools/appbase_capability_guardian.py`
  - Enforce no-`billing` namespace/package leakage and no concrete Claw Router SDK imports inside reusable appbase packages.
- Modify `<workspace-root>/sdkwork-clawrouter/docs/superpowers/specs/2026-05-20-appbase-commerce-platform-design.md`
  - Keep the superseded note in sync so nobody reuses the old billing-centered draft.
- Modify `<workspace-root>/sdkwork-clawrouter/docs/schema-registry/frontend-route-classification.yaml`
  - Reclassify commerce routes by domain instead of billing-first grouping if the current route taxonomy still contains the old split.
- Modify `<workspace-root>/sdkwork-clawrouter/docs/schema-registry/frontend-field-contracts.yaml`
  - Remove any contract aliasing that exists only to preserve the old billing shape.

## Task 1: Replace the Commerce Contract Namespace

**Files:**
- Modify: `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-contracts/src/index.ts`
- Modify: `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-sdk-ports/src/index.ts`
- Modify: `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-service/src/index.ts`
- Test: `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-contracts/tests/commerce-contracts.standard.test.ts`
- Test: `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-sdk-ports/tests/commerce-sdk-ports.standard.test.ts`
- Test: `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-service/tests/commerce-service.standard.test.ts`

- [ ] **Step 1: Write the failing contract tests**

Add assertions that fail until the new contract tree exists:

```ts
expect(SDKWORK_COMMERCE_STANDARD.sdkNamespaces).not.toContain("billing");
expect(SDKWORK_COMMERCE_API_ROUTES).toHaveProperty("catalog");
expect(SDKWORK_COMMERCE_API_ROUTES).toHaveProperty("orders");
expect(SDKWORK_COMMERCE_API_ROUTES).toHaveProperty("payments");
expect(JSON.stringify(SDKWORK_COMMERCE_API_ROUTES)).not.toContain("/billing/");
```

Add service-port assertions that the public app contract exposes only the new domain groups, not a `billing` umbrella.

- [ ] **Step 2: Run the contract tests and confirm they fail**

Run:

```powershell
pnpm.cmd --dir <workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-contracts test
pnpm.cmd --dir <workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-sdk-ports test
pnpm.cmd --dir <workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-service test
```

Expected: tests fail because the current contract still exposes the legacy `billing` shape.

- [ ] **Step 3: Replace the namespace and operation groups**

Implement the new top-level resource groups and operation names:

- `catalog`
- `cart`
- `addresses`
- `checkout`
- `orders`
- `payments`
- `refunds`
- `fulfillments`
- `memberships`
- `recharges`
- `wallet`
- `coupons`
- `invoices`

Remove all `billing` namespace constants, tags, and legacy app-side method paths.

- [ ] **Step 4: Run the contract tests and confirm they pass**

Run the same `pnpm` test commands again.

Expected: tests pass and no public contract reference contains `/billing` or `billing` as the SDK namespace.

- [ ] **Step 5: Record the change**

Commit only the contract changes and their tests once they are green.

## Task 2: Rewrite the HTTP Route Taxonomy

**Files:**
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/src/lib.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/tests/commerce_http_standard.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/tests/app_commerce_foundation_router.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/tests/app_recharge_checkout_router.rs`

- [ ] **Step 1: Write the failing route tests**

Add assertions that the route metadata contains only the new domain paths and that no route path or tag uses `billing`.

Example checks:

```rust
assert!(paths.contains(&"/app/v3/api/orders"));
assert!(paths.contains(&"/app/v3/api/payments/intents"));
assert!(!paths.iter().any(|path| path.contains("/billing/")));
assert!(!operation_ids.iter().any(|id| id.starts_with("app.") || id.starts_with("backend.")));
```

- [ ] **Step 2: Run the HTTP contract tests and confirm they fail**

Run:

```powershell
cargo test -p sdkwork_commerce_http
```

Expected: the route assertions fail until the path taxonomy and operation ids are updated.

- [ ] **Step 3: Rewrite route metadata**

Replace the current billing-centered metadata with standard app/backend route groups. Keep path parameters in `{lowerCamelCase}` and preserve `lower_snake_case` static path segments.

The updated route catalog must reflect:

- app browsing and buyer flows under `catalog`, `cart`, `addresses`, `checkout`, `orders`, `payments`, `refunds`, `fulfillments`, `memberships`, `recharges`, `wallet`, `coupons`, and `invoices`
- backend management under the same bounded contexts plus `inventory`, `commerce_reports`, and `audit`
- operation ids as resource trees such as `orders.list`, `payments.intents.create`, and `payments.routeRules.list`

- [ ] **Step 4: Run the HTTP contract tests and confirm they pass**

Run:

```powershell
cargo test -p sdkwork_commerce_http
```

Expected: the route metadata tests pass and there are no `/billing` paths left in the route catalog.

- [ ] **Step 5: Lock the new route taxonomy**

Keep the route tests as a permanent guard so future changes cannot reintroduce `billing` or surface-prefixed operation ids.

## Task 3: Harden the Capability and Integration Guards

**Files:**
- Modify: `<workspace-root>/sdkwork-clawrouter/specs/appbase-integration.yaml`
- Modify: `<workspace-root>/sdkwork-clawrouter/tests/test_appbase_integration_guardian.py`
- Modify: `<workspace-root>/sdkwork-clawrouter/tests/test_appbase_capability_guardian.py`
- Modify: `<workspace-root>/sdkwork-clawrouter/tools/appbase_integration_guardian.py`
- Modify: `<workspace-root>/sdkwork-clawrouter/tools/appbase_capability_guardian.py`
- Modify: `<workspace-root>/sdkwork-clawrouter/docs/schema-registry/frontend-route-classification.yaml`
- Modify: `<workspace-root>/sdkwork-clawrouter/docs/schema-registry/frontend-field-contracts.yaml`
- Modify: `<workspace-root>/sdkwork-appbase/specs/appbase-capabilities.yaml`

- [ ] **Step 1: Add failing guardian tests**

Add tests that explicitly fail when:

- an appbase integration manifest declares `billing` as a namespace or route prefix
- a verification command still points at a billing-named test module
- a capability catalog exposes a `billing`-named SDK namespace
- a reusable appbase package imports a concrete Claw Router SDK
- a route classification file preserves legacy billing-first grouping

Example expectations:

```python
self.assertIn("no `/billing` namespace", messages)
self.assertIn("billing", messages)
self.assertIn("compatibility envelopes", messages)
```

- [ ] **Step 2: Run the guardian tests and confirm they fail**

Run:

```powershell
python -B -m unittest tests.test_appbase_capability_guardian tests.test_appbase_integration_guardian
```

Expected: the new tests fail until the manifests and guard scripts enforce the new standard.

- [ ] **Step 3: Implement the guardrails**

Update the guardian scripts so they reject:

- `/billing` paths
- `billing` as a commerce SDK namespace
- `billing` in new commerce table names
- `app.` or `backend.` prefixes in operationId
- compatibility envelope modes and other legacy compatibility shims
- verification commands that still reference billing-named modules

Update the appbase capability and integration manifests so they describe the new domain decomposition and no longer encode the old billing grouping.

- [ ] **Step 4: Run the guardian tests and confirm they pass**

Run:

```powershell
python -B -m unittest tests.test_appbase_capability_guardian tests.test_appbase_integration_guardian
```

Expected: the guards pass, and any future reintroduction of billing-style compatibility will fail immediately.

- [ ] **Step 5: Keep the guardrails versioned**

Do not weaken these guards later to ease migration. This standard is intentionally new-system only.

## Task 4: Update Verification Commands and Superseded Documentation

**Files:**
- Modify: `<workspace-root>/sdkwork-clawrouter/docs/superpowers/specs/2026-05-20-appbase-commerce-platform-design.md`
- Modify: `<workspace-root>/sdkwork-clawrouter/docs/superpowers/specs/2026-05-21-appbase-commerce-standard-design.md`
- Modify: `<workspace-root>/sdkwork-clawrouter/specs/appbase-integration.yaml`
- Modify: any renamed verification test modules that still contain `billing` in the filename

- [ ] **Step 1: Rename verification targets away from billing**

Replace any verification command or test module name that still says `test_commerce_billing_standard` or similar with a neutral standard name such as `test_commerce_standard`.

This includes the integration manifest verification command list.

- [ ] **Step 2: Update the superseded note**

Keep the 2026-05-20 design doc marked as superseded so future work does not restart from the old billing-centered assumptions.

- [ ] **Step 3: Make the new design doc the canonical reference**

Ensure the 2026-05-21 spec is the only document developers should consult when building commerce foundation work.

- [ ] **Step 4: Run a final search for legacy tokens**

Run:

```powershell
rg -n "/billing|billing namespace|billing-centered|test_commerce_billing_standard|CommerceSdkNamespace = /"billing/"" <workspace-root>/sdkwork-clawrouter <workspace-root>/sdkwork-appbase -S
```

Expected: only the superseded-note and explicit removal rules mention billing; no active contract, route, or verification target should still depend on it.

- [ ] **Step 5: Commit the documentation and manifest cleanup**

Commit the final doc and manifest changes once the search is clean.

## Task 5: Final Validation Matrix

**Files:**
- All files touched in Tasks 1-4

- [ ] **Step 1: Run the full contract and guardian matrix**

Run:

```powershell
pnpm.cmd --dir <workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-contracts test
pnpm.cmd --dir <workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-sdk-ports test
pnpm.cmd --dir <workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-service test
cargo test -p sdkwork_commerce_http
python -B -m unittest tests.test_appbase_capability_guardian tests.test_appbase_integration_guardian
```

Expected: all checks pass.

- [ ] **Step 2: Confirm the no-compatibility invariants**

Verify that the final state contains:

- no public `billing` namespace in appbase commerce
- no `/billing` app or backend route paths
- no surface-prefixed operation ids
- no compatibility envelopes
- no legacy fallback commerce stores
- no verification command names that still encode billing

- [ ] **Step 3: Prepare the next phase handoff**

Once Phase 1 is green, hand off to the next plan for unified order center and unified payment center implementation. Do not start that work in this phase.

