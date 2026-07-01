> Migrated from `docs/superpowers/plans/2026-05-20-appbase-commerce-account-wallet-ledger.md` on 2026-06-24.
> Owner: SDKWork maintainers
>
> **Claw Router status (2026-06-29): Archived for this repository.** Wallet admin uses `getClawRouterBackendSdkClient().wallet.*` and `getClawRouterBackendSdkClient().recharges.*`. Console wallet uses T1 `@sdkwork/account-pc-wallet` via domain service providers.

# Appbase Commerce Account / Wallet / Ledger (Archive)

Historical plan for appbase-owned wallet ledger modules. Claw Router implementation authority:

- Admin: `packages/sdkwork-clawrouter-pc-admin-wallet`
- SDK: `getClawRouterBackendSdkClient().wallet.*`
- Console: `@sdkwork/account-pc-wallet` + `configureClawRouterDomainServiceProviders`

Do not reintroduce legacy commerce service facades or legacy commerce PC packages in Claw Router.

## Verification

```bash
node scripts/check-commerce-debt.mjs
```
