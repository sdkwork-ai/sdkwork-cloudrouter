> Owner: SDKWork maintainers
> Updated: 2026-06-24
> Status: **active**

# Commerce PC Capability Distribution

## Principle

Per `SDKWORK_WORKSPACE_SPEC.md` and `APP_PC_ARCHITECTURE_SPEC.md`:

- A **domain/capability git repository** owns `apis/`, `crates/`, `sdks/`, **and** its PC application root `apps/sdkwork-<capability>-pc/`.
- PC feature packages use `sdkwork-<capability>-pc-<feature>` naming (`NAMING_SPEC.md`).
- A monolithic `sdkwork-commerce-pc` repository or application that aggregates all commerce modules **must not** exist.

**Template:** `sdkwork-shop/apps/sdkwork-shop-pc/` (core + shell + capability packages + `packages/common/shop/*`).

## Rename rules

| Old | New |
| --- | --- |
| `@sdkwork/commerce-pc-order` | `@sdkwork/order-pc-order` |
| `sdkwork-commerce-pc-order/` | `sdkwork-order-pc-order/` |
| `@sdkwork/commerce-service` (order calls) | `@sdkwork/order-service` |
| `sdkwork-commerce/apps/.../packages/...` | `sdkwork-order/apps/sdkwork-order-pc/packages/...` |

Apply the same pattern: replace `commerce-pc` with `<capability>-pc`, workspace root with owning repo.

## Full package map

| # | Source (`sdkwork-commerce-pc`) | Owner repo | PC app root | Target package(s) |
| --- | --- | --- | --- | --- |
| 1 | `sdkwork-commerce-pc-order` | `sdkwork-order` | `apps/sdkwork-order-pc/` | `sdkwork-order-pc-order` |
| 2 | `sdkwork-commerce-pc-checkout` | `sdkwork-order` | `apps/sdkwork-order-pc/` | `sdkwork-order-pc-checkout` |
| 3 | `sdkwork-commerce-pc-billing` | `sdkwork-order` | `apps/sdkwork-order-pc/` | `sdkwork-order-pc-billing` |
| 4 | `sdkwork-commerce-pc-payment` | `sdkwork-payment` | `apps/sdkwork-payment-pc/` | `sdkwork-payment-pc-payment` |
| 5 | `sdkwork-commerce-pc-wallet` | `sdkwork-account` | `apps/sdkwork-account-pc/` | `sdkwork-account-pc-wallet` |
| 6 | `sdkwork-commerce-pc-membership` | `sdkwork-membership` | `apps/sdkwork-membership-pc/` | `sdkwork-membership-pc-membership` |
| 7 | `sdkwork-commerce-pc-membership-purchase` | `sdkwork-membership` | `apps/sdkwork-membership-pc/` | `sdkwork-membership-pc-membership-purchase` |
| 8 | `sdkwork-commerce-pc-admin-membership` | `sdkwork-membership` | `apps/sdkwork-membership-pc/` | `sdkwork-membership-pc-admin-membership` |
| 9 | `sdkwork-commerce-pc-entitlement` | `sdkwork-membership` | `apps/sdkwork-membership-pc/` | `sdkwork-membership-pc-entitlement` |
| 10 | `sdkwork-commerce-pc-subscription` | `sdkwork-membership` | `apps/sdkwork-membership-pc/` | `sdkwork-membership-pc-subscription` |
| 11 | `sdkwork-commerce-pc-coupon` | `sdkwork-promotion` | `apps/sdkwork-promotion-pc/` | `sdkwork-promotion-pc-coupon` |
| 12 | `sdkwork-commerce-pc-offer` | `sdkwork-promotion` | `apps/sdkwork-promotion-pc/` | `sdkwork-promotion-pc-offer` |
| 13 | `sdkwork-commerce-pc-pricing` | `sdkwork-promotion` | `apps/sdkwork-promotion-pc/` | `sdkwork-promotion-pc-pricing` |
| 14 | `sdkwork-commerce-pc-points` | `sdkwork-promotion` | `apps/sdkwork-promotion-pc/` | `sdkwork-promotion-pc-points` |
| 15 | `sdkwork-commerce-pc-invoice` | `sdkwork-invoice` | `apps/sdkwork-invoice-pc/` | `sdkwork-invoice-pc-invoice` |
| 16 | `sdkwork-commerce-pc-admin-product` | `sdkwork-merchandise` | `apps/sdkwork-merchandise-pc/` | `sdkwork-merchandise-pc-admin-product` |
| 17 | `sdkwork-commerce-pc-commerce` | `sdkwork-mall` (composition) | `apps/sdkwork-mall-pc/` | buyer dashboard slices → existing mall packages |
| 18 | `sdkwork-commerce-pc-core` | per repo | each `apps/sdkwork-<cap>-pc/` | `sdkwork-<cap>-pc-core` |
| 19 | `sdkwork-commerce-pc-admin-core` | per repo (admin) | each with backend admin UI | `sdkwork-<cap>-pc-admin-core` |
| 20 | `sdkwork-commerce-pc-shell` | per repo | each `apps/sdkwork-<cap>-pc/` | `sdkwork-<cap>-pc-shell` |
| 21 | `sdkwork-commerce-pc-admin-shell` | per repo (admin) | each with admin UI | `sdkwork-<cap>-pc-admin-shell` |
| 22 | `sdkwork-commerce-pc-commons` | per repo | split shared types into `<cap>-contracts` | — |
| 23 | `sdkwork-commerce-pc-host` | per repo | host adapter in `<cap>-pc-core` | — |

## Per-repo scaffold (each T1 with PC surface)

Mirror `sdkwork-shop`:

```text
sdkwork-<capability>/
  packages/common/<capability>/
    sdkwork-<capability>-contracts/
    sdkwork-<capability>-service/
  apps/sdkwork-<capability>-pc/
    sdkwork.app.config.json
    packages/
      sdkwork-<capability>-pc-core/
      sdkwork-<capability>-pc-shell/
      sdkwork-<capability>-pc-<feature>/   # migrated modules
    src/                                   # thin bootstrap
  sdks/                                    # app + backend SDK for this capability
  pnpm-workspace.yaml
  package.json
```

## Consumer updates

| Consumer | Today | After D1/D2 |
| --- | --- | --- |
| `sdkwork-mall` | `../sdkwork-commerce/packages/common/commerce/*` | `../sdkwork-order/...`, `../sdkwork-payment/...`, per-T1 paths |
| `sdkwork-clawrouter` | commerce PC packages | per-T1 workspace imports |
| `sdkwork-im` | commerce app SDK | per-T1 or mall-composed imports |

## Migration checklist (per capability)

- [ ] Scaffold `apps/sdkwork-<cap>-pc/` from shop template
- [ ] Move + rename PC packages; update imports (`@sdkwork/<cap>-service`)
- [ ] Split `packages/common/<cap>/` contracts + service facade
- [ ] Wire `pnpm-workspace.yaml` + root `package.json` scripts
- [ ] Point SDK gen to T1 `apis/` + `sdks/`
- [ ] Update component.spec.json roots
- [ ] Remove source packages from `sdkwork-commerce-pc`
- [ ] `pnpm verify` in owner repo + affected consumers

## Status

| Capability | PC app root | Packages migrated |
| --- | --- | --- |
| shop | ✅ `sdkwork-shop-pc` | ✅ (native) |
| order | ✅ `sdkwork-order-pc` | ✅ `sdkwork-order-pc-order` (checkout/billing pending) |
| payment | ✅ `sdkwork-payment-pc` | ✅ `sdkwork-payment-pc-payment` |
| account | ✅ `sdkwork-account-pc` | ✅ `sdkwork-account-pc-wallet` |
| promotion | ✅ `sdkwork-promotion-pc` | ✅ `sdkwork-promotion-pc-coupon`, ✅ `sdkwork-promotion-pc-points`, ✅ `sdkwork-promotion-pc-offer`, ✅ `sdkwork-promotion-pc-pricing` |
| membership | ✅ `sdkwork-membership-pc` | ✅ `sdkwork-membership-pc-membership`, ✅ `sdkwork-membership-pc-subscription` (entitlement/admin pending) |
| invoice | ⬜ pending | ⬜ |
| merchandise | ⬜ pending | ⬜ |
| inventory | ⬜ pending | ⬜ |
| catalog | ⬜ pending | ⬜ |
