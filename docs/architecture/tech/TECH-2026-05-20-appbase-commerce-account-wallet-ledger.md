> Migrated from `docs/superpowers/plans/2026-05-20-appbase-commerce-account-wallet-ledger.md` on 2026-06-24.
> Owner: SDKWork maintainers

# Appbase Commerce Account Wallet Ledger Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first reusable appbase commerce foundation block for account, wallet, ledger, and idempotency so other applications can integrate these capabilities without copying `sdkwork-clawrouter` code.

**Architecture:** Add typed appbase account/wallet contracts in `sdkwork-商���-account-rust`, concrete SQLite/Postgres SQLx stores in `sdkwork-商���-storage-sqlx-rust`, runtime operation contracts in `sdkwork-商���-runtime-rust`, and mountable Axum app/admin routers in `sdkwork-商���-http-rust` or a new focused Axum crate if the existing HTTP crate should stay contract-only. The first slice must use existing `commerce_account`, `commerce_account_ledger_entry`, and `commerce_idempotency_key` tables only; any table, column, index, migration, or embedded schema change requires explicit user confirmation before implementation.

**Tech Stack:** Rust 2021, SQLx 0.8, Axum 0.8, SQLite/Postgres, existing appbase commerce crates under `../sdkwork-appbase/packages/native-rust/commerce`, generated SDK boundary rules from `clawrouter-app-sdk-integration` and `clawrouter-backend-sdk-integration`.

---

## Scope Boundaries

This plan implements Phase B foundation slice only:

- In scope: account summary, wallet overview, wallet accounts, wallet transaction list/detail, wallet operation lookup by request number, idempotency store, transaction manager, append-only ledger mutation helpers, typed runtime operations, and basic app/admin routers.
- In scope: disabled-capability responses for top-up, withdrawal, transfer, exchange, and token deduction until their service handlers exist.
- Out of scope: payment provider adapters, order checkout, coupon issuance, points recharge, refunds, invoices, settlements, and claw-router migration removal. Those become separate plans after this base passes.
- Out of scope unless user confirms: any database migration or schema change.

## File Structure

Create or modify these appbase files:

- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-account-rust/src/domain/mod.rs`
  - Add typed wallet/account read models and ledger append outcome.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-account-rust/src/queries/mod.rs`
  - Add wallet/account query structs.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-account-rust/src/commands/mod.rs`
  - Add generic wallet ledger command structs that do not mention claw-router.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-account-rust/src/ports/mod.rs`
  - Split read and write traits for account summary, wallet reads, ledger append, and idempotency.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-account-rust/src/service/mod.rs`
  - Extend service contract with wallet and idempotent ledger operations.
- Create `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/account.rs`
  - Shared account SQLx row mapping, validation, and decimal helpers.
- Create `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/sqlite_account.rs`
  - SQLite implementation for account/wallet/ledger/idempotency.
- Create `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/postgres_account.rs`
  - Postgres implementation with row locking for mutations.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/lib.rs`
  - Export store types and keep the existing SQL catalog functions intact.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/Cargo.toml`
  - Add dependencies only if required: `sqlx`, `serde`, `serde_json`, `sdkwork_commerce_core`, `sdkwork_commerce_account`.
- Create `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-runtime-rust/src/account_runtime.rs`
  - Runtime handler for appbase account/wallet read operations and ledger mutation dispatch.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-runtime-rust/src/lib.rs`
  - Register wallet/account operation contracts and export the account runtime handler.
- Create `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/src/account_router.rs`
  - Axum routers for account summary and wallet read operations.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/src/lib.rs`
  - Export account router and update route metadata for wallet operations.
- Modify `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/Cargo.toml`
  - Add `axum`, `serde`, `serde_json`, `sqlx`, and storage/account dependencies only if the router lives in this crate.
- Modify `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-contracts/src/index.ts`
  - Align TypeScript operation catalog only if Rust operation ids differ from existing appbase contract names.
- Modify `<workspace-root>/sdkwork-clawrouter/docs/superpowers/specs/2026-05-20-appbase-commerce-platform-design.md`
  - Add a short implementation-status note after the slice lands.

## Task 1: Account/Wallet Domain Contracts

**Files:**
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-account-rust/src/domain/mod.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-account-rust/src/queries/mod.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-account-rust/src/commands/mod.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-account-rust/src/ports/mod.rs`
- Test: inline unit tests in `domain/mod.rs`, `queries/mod.rs`, and `commands/mod.rs`

- [ ] **Step 1: Add failing domain tests**

Add tests for:

```rust
#[test]
fn wallet_account_item_rejects_empty_account_id() {
    let error = WalletAccountItem::new(
        "",
        "100001",
        None,
        "1",
        CommerceAccountAssetType::Points,
        Some("POINT"),
        "0",
        "0",
        "active",
        0,
    )
    .expect_err("empty account id must fail");
    assert_eq!(error.code(), "validation");
}

#[test]
fn wallet_transaction_item_requires_request_no_and_idempotency_key() {
    let error = WalletTransactionItem::new(
        "ledger-1",
        "account-1",
        "100001",
        None,
        "1",
        CommerceAccountAssetType::Points,
        CommerceLedgerDirection::Credit,
        "10",
        "10",
        "recharge",
        "txn-1",
        "",
        "",
        "2026-05-20T00:00:00Z",
    )
    .expect_err("request number and idempotency key must be required");
    assert_eq!(error.code(), "validation");
}
```

- [ ] **Step 2: Run domain tests and verify they fail**

Run:

```powershell
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-account-rust\Cargo.toml wallet_account_item_rejects_empty_account_id wallet_transaction_item_requires_request_no_and_idempotency_key
```

Expected: compile failure or failing tests because `WalletAccountItem` and `WalletTransactionItem` do not exist yet.

- [ ] **Step 3: Implement minimal typed domain/query/command types**

Add these public types:

```rust
pub struct WalletAccountItem { /* account id, tenant, org, owner, asset type, currency, balances, status, version */ }
pub struct WalletOverview { pub accounts: Vec<WalletAccountItem> }
pub struct WalletTransactionItem { /* ledger id, account id, tenant, org, owner, asset, direction, amount, balance_after, business_type, transaction_no, request_no, idempotency_key, created_at */ }
pub struct WalletOperation { pub request_no: String, pub transactions: Vec<WalletTransactionItem> }
pub struct AppendLedgerEntryOutcome { pub account: WalletAccountItem, pub ledger_entry: WalletTransactionItem, pub replayed: bool }
pub struct WalletAccountListQuery { pub tenant_id: String, pub organization_id: Option<String>, pub owner_user_id: String, pub asset_type: Option<CommerceAccountAssetType> }
pub struct WalletTransactionListQuery { pub tenant_id: String, pub organization_id: Option<String>, pub owner_user_id: String, pub account_id: Option<String>, pub asset_type: Option<CommerceAccountAssetType>, pub page: Option<i64>, pub page_size: Option<i64>, pub cursor: Option<String> }
pub struct WalletTransactionDetailQuery { pub tenant_id: String, pub organization_id: Option<String>, pub owner_user_id: String, pub transaction_id: String }
pub struct WalletOperationQuery { pub tenant_id: String, pub organization_id: Option<String>, pub owner_user_id: String, pub request_no: String }
```

Keep constructors strict:

- non-empty tenant/user/account/transaction/request/idempotency identifiers
- `page_size` clamped or rejected consistently with membership style
- no product-specific fields

- [ ] **Step 4: Run domain tests and verify they pass**

Run the same command from Step 2.

Expected: tests pass.

- [ ] **Step 5: Commit**

```powershell
git add ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-account-rust\src
git commit -m "feat(appbase-commerce): add account wallet domain contracts"
```

## Task 2: SQLx Account Storage Traits And SQLite Store

**Files:**
- Create: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/account.rs`
- Create: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/sqlite_account.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/lib.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/Cargo.toml`
- Test: inline `#[cfg(test)]` module in `sqlite_account.rs`

- [ ] **Step 1: Add failing SQLite tests**

Use an in-memory SQLite pool. Apply the existing migration SQL with:

```rust
sqlx::query(sdkwork_commerce_storage_sqlx::commerce_initial_migration_sql())
    .execute(&pool)
    .await
    .unwrap();
```

Add tests:

```rust
#[tokio::test]
async fn sqlite_wallet_lists_accounts_after_ledger_credit() { /* create store, append credit 100 points, assert account and ledger */ }

#[tokio::test]
async fn sqlite_ledger_append_replays_same_idempotency_key() { /* same request hash/key returns replayed outcome */ }

#[tokio::test]
async fn sqlite_ledger_append_rejects_idempotency_hash_conflict() { /* same key different hash returns conflict */ }

#[tokio::test]
async fn sqlite_debit_rejects_insufficient_balance() { /* debit more than available returns invalid_state or conflict */ }
```

- [ ] **Step 2: Run SQLite tests and verify they fail**

Run:

```powershell
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-storage-sqlx-rust\Cargo.toml sqlite_wallet_
```

Expected: compile failure because store types are missing.

- [ ] **Step 3: Implement `SqliteCommerceAccountStore`**

Implement:

```rust
pub struct SqliteCommerceAccountStore { pool: SqlitePool }

impl SqliteCommerceAccountStore {
    pub fn new(pool: SqlitePool) -> Self;
    pub async fn retrieve_summary(&self, query: AccountSummaryQuery) -> Result<AccountSummary, CommerceServiceError>;
    pub async fn list_wallet_accounts(&self, query: WalletAccountListQuery) -> Result<Vec<WalletAccountItem>, CommerceServiceError>;
    pub async fn retrieve_wallet_overview(&self, query: WalletAccountListQuery) -> Result<WalletOverview, CommerceServiceError>;
    pub async fn list_wallet_transactions(&self, query: WalletTransactionListQuery) -> Result<Vec<WalletTransactionItem>, CommerceServiceError>;
    pub async fn retrieve_wallet_transaction(&self, query: WalletTransactionDetailQuery) -> Result<Option<WalletTransactionItem>, CommerceServiceError>;
    pub async fn retrieve_wallet_operation(&self, query: WalletOperationQuery) -> Result<Option<WalletOperation>, CommerceServiceError>;
    pub async fn append_ledger_entry(&self, command: AppendLedgerEntryCommand, request_hash: CommerceRequestHash) -> Result<AppendLedgerEntryOutcome, CommerceServiceError>;
}
```

Implementation rules:

- Begin a SQLite transaction for ledger mutation.
- Check `commerce_idempotency_key` by `(tenant_id, scope, idempotency_key)`.
- Replay completed requests with same request hash.
- Reject same key with different request hash.
- Create or load account by `(tenant_id, organization_id, owner_user_id, asset_type, currency_code)`.
- Update account balance and version.
- Insert exactly one `commerce_account_ledger_entry` for each new balance mutation.
- Complete the idempotency row with a stable response JSON.
- Use the existing tables only.

- [ ] **Step 4: Run SQLite tests and verify they pass**

Run:

```powershell
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-storage-sqlx-rust\Cargo.toml sqlite_wallet_
```

Expected: SQLite tests pass.

- [ ] **Step 5: Commit**

```powershell
git add ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-storage-sqlx-rust
git commit -m "feat(appbase-commerce): add sqlite account wallet ledger store"
```

## Task 3: Postgres Store With Row Locking

**Files:**
- Create: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/postgres_account.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-storage-sqlx-rust/src/lib.rs`
- Test: inline `#[cfg(test)]` tests that compile without requiring a live Postgres server, plus optional ignored integration tests gated by `SDKWORK_TEST_POSTGRES_URL`

- [ ] **Step 1: Add failing compile-level Postgres tests**

Add tests that instantiate query builders or call validation helpers without a database. Add ignored integration tests for live Postgres:

```rust
#[tokio::test]
#[ignore = "requires SDKWORK_TEST_POSTGRES_URL"]
async fn postgres_wallet_lists_accounts_after_ledger_credit() { /* same behavior as SQLite */ }
```

- [ ] **Step 2: Run compile-level tests and verify they fail**

Run:

```powershell
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-storage-sqlx-rust\Cargo.toml postgres_account -- --include-ignored
```

Expected: missing Postgres store type or ignored live test reports environment skip.

- [ ] **Step 3: Implement `PostgresCommerceAccountStore`**

Use the same public methods as SQLite. For mutations:

- Use `BEGIN`.
- Lock existing account row with `FOR UPDATE`.
- If account does not exist, insert then lock/read it inside the same transaction.
- Lock idempotency row or insert the locked row with unique-key conflict handling.
- Use parameter placeholders `$1`, `$2`, etc.
- Do not rely on SQLite-specific `INSERT OR` syntax.

- [ ] **Step 4: Run storage test suite**

Run:

```powershell
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-storage-sqlx-rust\Cargo.toml
```

Expected: non-ignored tests pass. If `SDKWORK_TEST_POSTGRES_URL` is not configured, report that live Postgres tests were skipped/ignored.

- [ ] **Step 5: Commit**

```powershell
git add ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-storage-sqlx-rust
git commit -m "feat(appbase-commerce): add postgres account wallet ledger store"
```

## Task 4: Runtime Operation Contracts

**Files:**
- Create: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-runtime-rust/src/account_runtime.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-runtime-rust/src/lib.rs`
- Test: inline unit tests in runtime crate

- [ ] **Step 1: Add failing runtime contract tests**

Test that these operations resolve and have the correct execution policy:

```rust
account.summary.retrieve              ReadOnly
wallet.overview.retrieve              ReadOnly
wallet.accounts.list                  ReadOnly
wallet.transactions.list              ReadOnly
wallet.transactions.retrieve          ReadOnly
wallet.operations.retrieve            ReadOnly
ledger.entries.append                 TransactionalWrite
```

Also test that `ledger.entries.append` requires idempotency and transaction.

- [ ] **Step 2: Run runtime tests and verify they fail**

Run:

```powershell
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-runtime-rust\Cargo.toml wallet_operation_contracts
```

Expected: missing operation contracts.

- [ ] **Step 3: Register contracts and capabilities**

Update `operation_contracts()`, `first_slice_capability_manifest()`, and account service binding:

```rust
op("wallet.overview.retrieve", "commerce.account", OperationExecutionPolicy::ReadOnly, "commerce.account.wallet")
op("wallet.accounts.list", "commerce.account", OperationExecutionPolicy::ReadOnly, "commerce.account.wallet")
op("wallet.transactions.list", "commerce.account", OperationExecutionPolicy::ReadOnly, "commerce.account.ledger")
op("wallet.transactions.retrieve", "commerce.account", OperationExecutionPolicy::ReadOnly, "commerce.account.ledger")
op("wallet.operations.retrieve", "commerce.account", OperationExecutionPolicy::ReadOnly, "commerce.account.ledger")
op("ledger.entries.append", "commerce.account", OperationExecutionPolicy::TransactionalWrite, "commerce.account.ledger")
```

Add an account runtime handler that delegates to a generic account service/store trait. Keep it storage-agnostic.

- [ ] **Step 4: Run runtime tests and verify they pass**

Run:

```powershell
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-runtime-rust\Cargo.toml wallet_operation_contracts
```

Expected: tests pass.

- [ ] **Step 5: Commit**

```powershell
git add ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-runtime-rust
git commit -m "feat(appbase-commerce): register wallet ledger runtime operations"
```

## Task 5: Mountable Appbase Axum Router

**Files:**
- Create: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/src/account_router.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/src/lib.rs`
- Modify: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/sdkwork-商���-http-rust/Cargo.toml`
- Test: router tests in `account_router.rs`

- [ ] **Step 1: Add failing router tests**

Use `tower::ServiceExt` and an in-memory SQLite store. Test:

- `GET /app/v3/api/billing/wallet/accounts` returns real account rows.
- `GET /app/v3/api/billing/wallet/transactions` returns ledger rows.
- `GET /app/v3/api/billing/wallet/operations/{requestNo}` returns the operation.
- Missing subject headers return `4010` or a stable appbase auth error.
- Disabled mutation routes return explicit unsupported capability, not empty success.

- [ ] **Step 2: Run router tests and verify they fail**

Run:

```powershell
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-http-rust\Cargo.toml wallet_router_
```

Expected: compile failure because router does not exist.

- [ ] **Step 3: Implement router factory**

Expose:

```rust
pub fn app_account_wallet_router_with_store(store: Arc<dyn AppbaseAccountWalletStore + Send + Sync>) -> Router;
pub fn app_account_wallet_router_with_sqlite_pool(pool: SqlitePool) -> Router;
pub fn app_account_wallet_router_with_postgres_pool(pool: PgPool) -> Router;
```

Use header names consistently with appbase/runtime context:

- `x-sdkwork-tenant-id`
- `x-sdkwork-organization-id`
- `x-sdkwork-user-id`
- `x-sdkwork-session-id`

Return envelope-compatible JSON:

```json
{ "code": "2000", "msg": "SUCCESS", "data": ... }
```

For disabled mutation placeholders, return a stable non-success error:

```json
{ "code": "unsupported-capability", "msg": "commerce capability is disabled" }
```

- [ ] **Step 4: Run router tests and verify they pass**

Run:

```powershell
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-http-rust\Cargo.toml wallet_router_
```

Expected: tests pass.

- [ ] **Step 5: Commit**

```powershell
git add ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-http-rust
git commit -m "feat(appbase-commerce): add account wallet app router"
```

## Task 6: Contract Alignment And Guardrails

**Files:**
- Modify: `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-contracts/src/index.ts`
- Modify: `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-sdk-ports/src/index.ts`
- Modify: `<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-service/src/index.ts`
- Test: existing package tests under appbase common commerce

- [ ] **Step 1: Add failing TypeScript contract tests if operation drift exists**

Check whether Rust operation ids and TS operation ids match. If drift exists, add tests in:

```text
<workspace-root>/sdkwork-appbase/packages/common/commerce/sdkwork-商���-contracts/tests/commerce-contracts.standard.test.ts
```

Expected operation ids must include:

```ts
"wallet.overview.retrieve"
"wallet.accounts.list"
"wallet.transactions.list"
"wallet.transactions.retrieve"
"wallet.operations.retrieve"
```

- [ ] **Step 2: Run contract tests and verify failure if drift exists**

Run from `<workspace-root>/sdkwork-appbase` if package scripts exist:

```powershell
pnpm --filter @sdkwork/commerce-contracts test
pnpm --filter @sdkwork/commerce-sdk-ports test
pnpm --filter @sdkwork/commerce-service test
```

Expected: pass if no drift, fail if operation ids are missing.

- [ ] **Step 3: Align TS contracts without importing claw-router SDKs**

If changes are needed:

- Keep `@sdkwork/commerce-service` dependent only on generic SDK ports.
- Do not import `@sdkwork/clawrouter-app-sdk` or `@sdkwork/clawrouter-backend-sdk` in appbase packages.
- Replace `unknown` only where response types can be safely standardized in this slice.
- Do not invent frontend-only DTOs that contradict Rust route output.

- [ ] **Step 4: Run contract tests and appbase guardian**

Run:

```powershell
pnpm --filter @sdkwork/commerce-contracts test
pnpm --filter @sdkwork/commerce-sdk-ports test
pnpm --filter @sdkwork/commerce-service test
python -B -m tools.appbase_capability_guardian --root .
```

Expected: tests pass and guardian reports `Appbase capability guardian passed`.

- [ ] **Step 5: Commit**

```powershell
git add ..\sdkwork-appbase\packages\common\commerce
git commit -m "feat(appbase-commerce): align wallet account contracts"
```

## Task 7: Claw-Router Integration Shim

**Files:**
- Modify: `<workspace-root>/sdkwork-clawrouter/services/sdkwork-clawrouter-standalone-gateway/src/lib.rs`
- Modify only if needed: `<workspace-root>/sdkwork-clawrouter/services/sdkwork-clawrouter-router-service/src/api/app_commerce.rs`
- Test: app-api/router tests or focused cargo checks

- [ ] **Step 1: Add failing integration test**

Add or update a test that proves `/app/v3/api/billing/wallet/accounts` is served by appbase store when a DB pool is configured, not by `app_commerce.rs` empty list.

- [ ] **Step 2: Run focused claw-router test and verify failure**

Run:

```powershell
cargo test -p sdkwork-clawrouter-standalone-gateway wallet_accounts_uses_appbase_commerce_store
```

Expected: fails before integration because route still uses product-local empty implementation.

- [ ] **Step 3: Mount appbase account/wallet router before product fallback**

In `sdkwork-clawrouter-standalone-gateway`, when SQLite/Postgres pool is available:

- construct `SqliteCommerceAccountStore` or `PostgresCommerceAccountStore`
- merge appbase account/wallet router
- keep product-local routes only for operations not yet implemented by appbase
- avoid raw SQL reimplementation in claw-router

Do not remove product-local code in this task unless all its covered operations have appbase equivalents.

- [ ] **Step 4: Run focused claw-router checks**

Run:

```powershell
cargo check -p sdkwork-clawrouter-standalone-gateway
cargo test -p sdkwork-clawrouter-standalone-gateway wallet_accounts_uses_appbase_commerce_store
python -B -m tools.frontend_operation_audit --check
python -B -m tools.appbase_capability_guardian --root .
```

Expected: checks pass. If unrelated existing test failures appear, record them with exact names and do not mask them.

- [ ] **Step 5: Commit**

```powershell
git add services\sdkwork-clawrouter-standalone-gateway ..\sdkwork-appbase\packages\native-rust\commerce
git commit -m "feat(claw-router): mount appbase wallet account router"
```

## Task 8: Documentation And Final Verification

**Files:**
- Modify: `<workspace-root>/sdkwork-clawrouter/docs/superpowers/specs/2026-05-20-appbase-commerce-platform-design.md`
- Optional create: `<workspace-root>/sdkwork-appbase/packages/native-rust/commerce/README.md` section or appbase common commerce README update

- [ ] **Step 1: Update implementation status**

Add a short section:

```markdown
### Phase B Slice 1 Status

Implemented:
- appbase account/wallet/ledger domain contracts
- SQLite/Postgres account wallet stores
- runtime operation contracts
- mountable app account/wallet router
- claw-router app-api integration shim

Still pending:
- top-up/withdrawal/transfer/exchange command handlers
- points recharge/order/payment/coupon/refund/invoice/settlement migration
```

- [ ] **Step 2: Run final verification**

Run:

```powershell
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-account-rust\Cargo.toml
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-storage-sqlx-rust\Cargo.toml
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-runtime-rust\Cargo.toml
cargo test --manifest-path ..\sdkwork-appbase\packages\native-rust\commerce\sdkwork-商���-http-rust\Cargo.toml
cargo check -p sdkwork-clawrouter-standalone-gateway
python -B -m tools.frontend_operation_audit --check
python -B -m tools.appbase_capability_guardian --root .
```

Expected: all commands pass, except explicitly reported unrelated pre-existing failures.

- [ ] **Step 3: Review diff for boundaries**

Run:

```powershell
git diff --stat
rg -n "@sdkwork/clawrouter-(app|backend|open)-sdk|sdkwork_clawrouter_router_service|claw-router|ClawRouter" ..\sdkwork-appbase\packages\common\commerce ..\sdkwork-appbase\packages\native-rust\commerce
```

Expected:

- no appbase reusable package imports concrete claw-router SDKs
- no appbase public API mentions claw-router product concepts
- no database migration/schema edits unless explicitly approved

- [ ] **Step 4: Commit docs**

```powershell
git add docs\superpowers\specs\2026-05-20-appbase-commerce-platform-design.md docs\superpowers\plans\2026-05-20-appbase-commerce-account-wallet-ledger.md
git commit -m "docs(appbase-commerce): plan wallet account foundation slice"
```

## Implementation Notes

- Use `rg` before editing to confirm there is not already an equivalent helper.
- Follow the style of `sdkwork-商���-membership-sqlx-rust`: concrete store files per database, reusable types, thin routers, and no product dependency.
- Keep `sdkwork-商���-storage-sqlx-rust/src/lib.rs` exports small if the file is split; do not rewrite the catalog wholesale.
- All balance math should use canonical string decimal/integer helpers. Do not use floating point for balances.
- For this slice, ledger append may support `cash`, `points`, and `token`, but command handlers for top-up/withdrawal/transfer/exchange remain disabled until their own plan.
- If SQLx compile-time macros require a live database, use runtime `sqlx::query`/`query_as` patterns consistent with the existing codebase.
- Do not remove old `sdkwork-clawrouter-router-service` commerce routes until appbase has functional parity and tests prove the mounted appbase route is used.

## Follow-Up Plans

After this plan passes, create separate plans for:

1. `appbase-commerce-points-recharge-exchange-token`
2. `appbase-commerce-order-payment-webhook-refund`
3. `appbase-commerce-coupon-promotion-admin`
4. `appbase-commerce-invoice-settlement-finance`
5. `claw-router-commerce-old-code-removal`

