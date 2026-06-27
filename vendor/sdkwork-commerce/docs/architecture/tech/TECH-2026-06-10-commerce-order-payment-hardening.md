> Migrated from `docs/superpowers/plans/2026-06-10-commerce-order-payment-hardening.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Commerce Order Payment Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Harden SDKWork Commerce order and payment storage so the schema proves core industry-aligned order/payment invariants.

**Architecture:** Keep the existing SQLx storage crate and single foundation migration as the source of truth. Add tests first in `commerce_storage_standard.rs`, then patch only the migration and authored storage catalog/index metadata needed to satisfy the new invariants.

**Tech Stack:** Rust 2021, SQLx-oriented authored storage contracts, Cargo tests, SDKWork database standards.

---

## File Structure

- Modify: `crates/sdkwork-commerce-storage-repository-sqlx/tests/commerce_storage_standard.rs`
  - Adds focused tests for order and payment/refund schema invariants.
- Modify: `crates/sdkwork-commerce-storage-repository-sqlx/migrations/0001_commerce_foundation.sql`
  - Adds minimal order/payment/refund columns and unique indexes.
- Modify: `crates/sdkwork-commerce-storage-repository-sqlx/src/lib.rs`
  - Registers any new named indexes in `commerce_database_indexes()`.

No generated SDK output should be edited. Existing dirty changes in unrelated files should remain untouched.

### Task 1: Add Order Schema Invariant Tests

**Files:**
- Modify: `crates/sdkwork-commerce-storage-repository-sqlx/tests/commerce_storage_standard.rs`

- [ ] **Step 1: Write failing order schema tests**

Add a test that extracts `commerce_order`, `commerce_order_item`, and
`commerce_order_amount_breakdown` with `table_definition(...)` and asserts:

```rust
assert!(order.contains("payment_status TEXT NOT NULL"));
assert!(order.contains("fulfillment_status TEXT NOT NULL"));
assert!(order.contains("refund_status TEXT NOT NULL"));
assert!(item.contains("product_id TEXT"));
assert!(item.contains("shop_id TEXT"));
assert!(item.contains("sku_snapshot_json TEXT NOT NULL DEFAULT '{}'"));
assert!(item.contains("discount_amount TEXT NOT NULL DEFAULT '0'"));
assert!(item.contains("tax_amount TEXT NOT NULL DEFAULT '0'"));
assert!(item.contains("fulfillment_status TEXT NOT NULL"));
assert!(item.contains("refund_status TEXT NOT NULL"));
assert!(breakdown.contains("UNIQUE (tenant_id, order_id, allocation_type, order_item_id, source_type, source_id)"));
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
cargo test --manifest-path crates/sdkwork-commerce-storage-repository-sqlx/Cargo.toml order_tables_separate_lifecycle_and_amount_allocation_facts
```

Expected: FAIL because the columns/unique key are not present yet.

### Task 2: Patch Order Schema

**Files:**
- Modify: `crates/sdkwork-commerce-storage-repository-sqlx/migrations/0001_commerce_foundation.sql`

- [ ] **Step 1: Add minimal order columns and unique key**

Add `payment_status`, `fulfillment_status`, and `refund_status` to
`commerce_order`. Add item snapshot/status/amount fields to
`commerce_order_item`. Replace the overly broad amount-breakdown uniqueness
with allocation-dimension uniqueness.

- [ ] **Step 2: Run focused order test**

Run:

```bash
cargo test --manifest-path crates/sdkwork-commerce-storage-repository-sqlx/Cargo.toml order_tables_separate_lifecycle_and_amount_allocation_facts
```

Expected: PASS.

### Task 3: Add Payment Intent And Refund Audit Tests

**Files:**
- Modify: `crates/sdkwork-commerce-storage-repository-sqlx/tests/commerce_storage_standard.rs`

- [ ] **Step 1: Write failing payment/refund tests**

Add a test that extracts `commerce_payment_intent` and `commerce_refund` and asserts:

```rust
assert!(intent.contains("payment_intent_no TEXT NOT NULL"));
assert!(intent.contains("UNIQUE (tenant_id, payment_intent_no)"));
assert!(intent.contains("UNIQUE (tenant_id, order_id, idempotency_key)"));
assert!(refund.contains("organization_id TEXT"));
assert!(refund.contains("order_id TEXT NOT NULL"));
assert!(refund.contains("currency_code TEXT NOT NULL"));
assert!(refund.contains("refund_reason_code TEXT"));
assert!(refund.contains("requested_by_type TEXT NOT NULL"));
assert!(refund.contains("requested_by TEXT"));
assert!(refund.contains("UNIQUE (tenant_id, order_id, idempotency_key)"));
```

- [ ] **Step 2: Run test to verify RED**

Run:

```bash
cargo test --manifest-path crates/sdkwork-commerce-storage-repository-sqlx/Cargo.toml payment_intent_and_refund_tables_are_auditable_and_idempotent
```

Expected: FAIL because payment intent number and refund audit fields are missing.

### Task 4: Patch Payment Intent And Refund Schema

**Files:**
- Modify: `crates/sdkwork-commerce-storage-repository-sqlx/migrations/0001_commerce_foundation.sql`

- [ ] **Step 1: Add payment intent and refund fields**

Add `payment_intent_no`, unique keys, and refund audit fields. Keep existing
provider attempt, webhook, reconciliation, fee, and dispute tables unchanged.

- [ ] **Step 2: Run focused payment/refund test**

Run:

```bash
cargo test --manifest-path crates/sdkwork-commerce-storage-repository-sqlx/Cargo.toml payment_intent_and_refund_tables_are_auditable_and_idempotent
```

Expected: PASS.

### Task 5: Update Index Catalog And Aggregate Storage Tests

**Files:**
- Modify: `crates/sdkwork-commerce-storage-repository-sqlx/src/lib.rs`
- Modify: `crates/sdkwork-commerce-storage-repository-sqlx/tests/commerce_storage_standard.rs`

- [ ] **Step 1: Add named index metadata if needed**

If the schema uses `CREATE UNIQUE INDEX` for new uniqueness, add those names to
`commerce_database_indexes()`.

- [ ] **Step 2: Run storage crate tests**

Run:

```bash
cargo test --manifest-path crates/sdkwork-commerce-storage-repository-sqlx/Cargo.toml
```

Expected: PASS.

### Task 6: Broader Verification

**Files:** no planned edits.

- [ ] **Step 1: Run relevant broader checks**

Run:

```bash
pnpm test:node
cargo test --workspace
```

Expected: PASS or report exact failures if unrelated dirty workspace changes affect the result.

- [ ] **Step 2: Report evidence**

Summarize:

- files changed;
- tests run;
- pass/fail outputs;
- remaining P2 backlog;
- unrelated dirty worktree files left untouched.

