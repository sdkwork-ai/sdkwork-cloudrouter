> Migrated from `docs/superpowers/plans/2026-05-21-appbase-commerce-standard-phase1.md` on 2026-06-24.
> Owner: SDKWork maintainers
>
> **Cloud Router status (2026-06-29): Archived.** Phase-1 appbase commerce rollout tasks do not apply to Cloud Router PC integration; use domain transport alignment tests instead.

# Appbase Commerce Standard Phase 1 (Archive)

Superseded for Cloud Router by completed domain transport migration and `check:commerce-debt` governance.

## Verification

```bash
pnpm check:commerce-debt:strict
cd apps/sdkwork-cloudrouter-pc && node --test commerce-debt-runtime.test.ts commerce-business-runtime.test.ts
```
