# sdkwork-clawrouter-pc-admin-upstream

ClawRouter backend administration for upstream suppliers, upstream accounts, and upstream account groups.

The package owns the `/admin/upstream` work surface and calls management APIs only through the generated `@sdkwork/clawrouter-backend-sdk` client injected by `@sdkwork/clawrouter-pc-admin-core`.

## Verification

```powershell
pnpm --filter @sdkwork/clawrouter-pc-admin-upstream typecheck
```
