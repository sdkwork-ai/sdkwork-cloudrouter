> Migrated from `docs/superpowers/specs/2026-05-20-appbase-commerce-platform-design.md` on 2026-06-24.
> Owner: SDKWork maintainers
>
> **Cloud Router status (2026-06-29):** Commerce app-api routes are federated from sibling T1 capability route crates when Cloud Router runs with a database-backed runtime profile.

# Appbase Commerce Platform Design

Reusable commerce foundations live in sibling T1 capability repositories (`sdkwork-account`, `sdkwork-payment`, `sdkwork-promotion`, `sdkwork-membership`, `sdkwork-order`, `sdkwork-shop`, `sdkwork-catalog`). Cloud Router does not re-implement those handlers locally.

## Cloud Router Live Integration

| Surface | Authority |
| --- | --- |
| Federated commerce app-api handlers | `crates/sdkwork-routes-cloudrouter-app-api/src/commerce_runtime.rs` |
| Admin commerce domains | `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudrouter-pc-admin-*` |
| SDK bootstrap | `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudroutes-pc-commons/src/sdk-clients.ts` |
| Console T1 ports | `apps/sdkwork-cloudrouter-pc/packages/sdkwork-cloudroutes-pc-commons/src/domain-service-providers.ts` |
| Runtime env materialization | `crates/sdkwork-cloudrouter-http/src/cloud_web_resolver.rs` |
| Debt governance | `scripts/check-commerce-debt.mjs` |

Database-backed Cloud Router bootstrap:

1. Materialize the workspace `SDKWORK_DATABASE_*` profile once; each capability consumes that same connection identity while retaining only its capability-owned app root metadata.
2. Bootstrap legacy-compatible T1 service hosts (`PaymentServiceHost`, `PromotionServiceHost`) for recharge and wallet exchange routes.
3. Merge T1 app-api routers through `merge_federated_app_capability_router` alongside existing IAM and Invoice federation.

Additional commerce domains (`account`, `membership`, `order`, `shop`, `catalog`) remain staged until legacy appbase schema cutover and sibling manifest/bootstrap debt are cleared. The Cloud Router lifecycle plan excludes account migrations during federation so they never run against the legacy schema; it does not create a capability-scoped database environment contract.

Zero-config/default router surfaces intentionally omit commerce handlers; contract OpenAPI still documents the routes for SDK generation.

Retired in Cloud Router: legacy monolithic commerce service facades, deleted `sdkwork-commerce` workspace packages, `.commerce` backend client namespace, and legacy monolithic capability transport layers.

## Verification

```bash
node scripts/check-commerce-debt.mjs
cd apps/sdkwork-cloudrouter-pc && node --test commerce-debt-runtime.test.ts
cargo test -p sdkwork-cloudrouter-standalone-gateway database_config_commerce_foundation_reads_exchange_rules_for_session_scope -- --nocapture
cargo test -p sdkwork-cloudrouter-standalone-gateway database_config_recharge_lists_packages -- --nocapture
```
