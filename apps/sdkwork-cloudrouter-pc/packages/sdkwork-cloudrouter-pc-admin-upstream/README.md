# sdkwork-cloudrouter-pc-admin-upstream

CloudRouter backend administration for upstream suppliers, upstream accounts, and upstream account groups.

The package owns three independent admin surfaces under `/admin/upstream/**` — `/admin/upstream/suppliers`, `/admin/upstream/accounts`, and `/admin/upstream/account-groups` (each with its own sidebar entry, route, and page component) — and calls management APIs only through the generated `@sdkwork/cloudrouter-backend-sdk` client injected by `@sdkwork/cloudrouter-pc-admin-core`. The legacy `/admin/upstream` path redirects to `/admin/upstream/suppliers`.

## Relay balance and recharge

`/admin/upstream/suppliers` shows each relay supplier's cached balance next to a
`充值` / `Recharge` action. The balance is the sum of the supplier accounts'
cached `ai_upstream_account.upstream_balance_*` values; it is refreshed live when
the dialog opens.

`SupplierRechargeDialog` is the decoupled recharge component. It renders the
relay's own package catalog (the same structure as the console recharge sheet:
package grid, custom amount, agreement, pay) and owns no transport code:
`supplierRechargeService` calls the management API, and the backend resolves the
supplier's relay API key and calls the relay Open API (`/v1/recharge/balance`,
`/v1/recharge/options`, `/v1/recharge/orders`) on the browser's behalf. The
browser never receives that API key.

## Verification

```powershell
pnpm --filter @sdkwork/cloudrouter-pc-admin-upstream typecheck
pnpm --filter @sdkwork/cloudrouter-pc-admin-upstream test
```
