# sdkwork-clawrouter-pc-admin-upstream

ClawRouter backend administration for upstream suppliers, upstream accounts, and upstream account groups.

The package owns three independent admin surfaces under `/admin/upstream/**` — `/admin/upstream/suppliers`, `/admin/upstream/accounts`, and `/admin/upstream/account-groups` (each with its own sidebar entry, route, and page component) — and calls management APIs only through the generated `@sdkwork/clawrouter-backend-sdk` client injected by `@sdkwork/clawrouter-pc-admin-core`. The legacy `/admin/upstream` path redirects to `/admin/upstream/suppliers`.

## Verification

```powershell
pnpm --filter @sdkwork/clawrouter-pc-admin-upstream typecheck
```
