> Owner: SDKWork maintainers
> Status: **retired** — Product Center admin UI removed from Claw Router (pre-launch relay focus)

## Retirement notice

As of 2026-06-30, Claw Router Admin no longer mounts `/admin/catalog/*` or `@sdkwork/clawrouter-pc-admin-catalog`. Product catalog, orders, payments, memberships, marketing, and finance admin surfaces belong to `sdkwork-manager` or their owning domain applications—not the relay control plane.

Claw Router Admin retains **model governance** via `@sdkwork/models-pc-admin-catalog` under `/admin/model/*` (vendors, resources, upstream sites, mappings). That is routing/catalog metadata, not commerce product administration.

## Historical reference (archived)

The former Product Center operated categories, products, SKUs, attributes, and price lists through `getClawRouterBackendSdkClient().catalog.*`. Backend catalog APIs may remain for domain composition; only the Claw Router portal admin package was removed.

Verification for the current relay-only admin surface:

```bash
cd apps/sdkwork-clawrouter-pc
node --import tsx --test commerce-debt-runtime.test.ts console-access-routing-retirement-runtime.test.ts
PYTHONPATH=. python -B tools/bootstrap_frontend_route_classification.py --root ../.. --check
```
