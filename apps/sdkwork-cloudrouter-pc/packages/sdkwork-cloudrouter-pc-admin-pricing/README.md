# sdkwork-cloudrouter-pc-admin-pricing

CloudRouter backend administration for the billing/rating engine: pricing plans, rate cards, and pricing rules.

The package owns three independent admin surfaces under `/admin/pricing/**` — `/admin/pricing/plans`, `/admin/pricing/rateCards`, and `/admin/pricing/rules` (each with its own sidebar entry, route, and page component) — and calls management APIs only through the generated `@sdkwork/cloudrouter-backend-sdk` `pricing` family (`client.pricing.plans|rateCards|rules`) injected by `@sdkwork/cloudrouter-pc-admin-core`. The bare `/admin/pricing` path redirects to `/admin/pricing/plans`.

Pricing plans define the base price side, currency, rounding mode, minimum charge, and effective window; rate cards bind a plan to a subject (default / api key / account group / account / user / organization) with priority; pricing rules scope plan-level multipliers, markups, or unit-price overrides to products, operations, meters, providers, regions, or catalog keys. All mutations are audit-logged server-side (`ops_audit_log`) and soft-delete safe.

## Verification

```powershell
pnpm --filter @sdkwork/cloudrouter-pc-admin-pricing typecheck
```
