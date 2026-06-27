> Owner: SDKWork maintainers
> Updated: 2026-06-24
> Status: active
> Parent: [TECH-2026-06-24-commerce-capability-repo-split-alignment.md](TECH-2026-06-24-commerce-capability-repo-split-alignment.md)

# Commerce Module Completeness Roadmap

## Purpose

T1 **repository split** (10/10) is complete: domain, SQL, and HTTP live in sibling repos; commerce T0 composes routers with IAM. This document tracks **industry-grade module completeness** per capability: owned database lifecycle, full app/backend HTTP surfaces, standalone deployability, SDK authority, and client surfaces (PC / H5 / Flutter).

**Completion criteria** (per `DATABASE_FRAMEWORK_SPEC.md`, `API_SPEC.md`, `APP_PC_ARCHITECTURE_SPEC.md`, `SDK_SPEC.md`):

| Layer | Complete when |
| --- | --- |
| Database | Repo owns `database/` manifest + baseline/migrations for its tables; bootstrap works without commerce monolith DDL |
| Domain | Service crate exposes capability commands/queries; no cross-capability SQL writes |
| App HTTP | All OpenAPI app operations implemented in T1 router with IAM-ready handlers |
| Backend HTTP | Admin/OMS/finance operations implemented and merged in T0 **and** T1 standalone server |
| SDK | Repo-local or composed OpenAPI authority; generated SDK smoke tests green |
| Standalone | `*-api-server` exposes same routers as composition (pool-wired), not health-only stubs |
| PC | Capability or composed package covers primary user journeys via generated SDK |
| H5 / Flutter | Declared in `sdkwork.app.config.json` with app root, or documented sibling consumer |

## Current posture (honest)

| Capability | DB owned | App HTTP (T0) | Backend admin (T0) | Standalone api-server | Local OpenAPI | PC package | H5 | Flutter |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| shop | partial | partial | partial | **app + backend wired** | yes | stub (`sdkwork-shop-pc`) | — | — |
| merchandise | misaligned DDL | via T0 catalog admin | yes (T0) | app health / backend catalog admin | placeholder | stub | — | — |
| catalog | read adapter | yes | health only | pool-wired (browse) | composed | via mall/commerce | — | — |
| inventory | composed DDL | yes | yes | **app + backend wired** | composed | — | — | — |
| order | composed DDL | yes | **partial (management)** | app + **backend admin wired** | composed | commerce-pc-order | — | — |
| payment | composed DDL | yes | yes | **app + backend wired** | composed | commerce-pc-payment | — | — |
| account | composed DDL | yes | **missing** | **app wired** / backend health | composed | wallet/billing | — | — |
| membership | composed DDL | yes | yes | **app + backend wired** | composed | membership/admin | — | — |
| promotion | composed DDL | yes | **missing** | **app wired** / backend health | composed | coupon/offer/points | — | — |
| invoice | composed DDL | yes | **missing** | **app wired** / backend health | composed | commerce-pc-invoice | — | — |

**Client strategy today**

- **`sdkwork-commerce-pc`**: monetization console (wallet, payment, order, invoice, membership, catalog admin, membership admin). Not a full mall.
- **`sdkwork-mall-pc`** (sibling): retail marketplace (cart, catalog browse, shop, merchant, broad admin).
- **H5 / Flutter commerce**: not started; naming spec defines targets; no manifests yet.

## Phased work (post-split)

### Phase M1 — Standalone HTTP parity (app routes complete; backend admin partial)

Wire T1 `*-api-server` to pool-based routers (pattern: `sdkwork-order` app routes). **Done (2026-06-24):** payment, inventory, account, promotion, invoice, shop, membership app routes; payment/inventory/membership/shop/merchandise backend where routers exist. **Remaining:** order/account/promotion/invoice backend admin (M2); catalog standalone host pool bootstrap; merchandise app remains health-only by design (browse → catalog).

### Phase M2 — Backend admin / OMS / finance (in progress)

Merge backend routers into T0 composition and implement admin handlers. **Done (2026-06-24):** order management (`orders.management.*`, events, cancellations). **Remaining:** invoice, promotion, wallet/account, fulfillment/after-sales/shipment/refund backend; manifest stubs restored for unmaterialized backend prefixes until each router lands.

Fix applied: `manifest_stub_router` no longer marks invoice/promotion/wallet/etc. as materialized without a merged router (prevents silent 404).

### Phase M3 — Database ownership split

Extract capability DDL from `sdkwork-commerce/database/ddl/baseline/0001_commerce_legacy_baseline.sql` into each T1 repo; fix merchandise baseline; add `database.manifest.json` per repo; commerce retains bootstrap orchestration only.

### Phase M4 — Per-capability SDK authorities

Publish repo-local OpenAPI where integrators need independent versioning; keep composed commerce SDK for PC/mall.

### Phase M5 — PC admin expansion

Add commerce-pc-admin packages for order, payment, shop, inventory, promotion, invoice (backend SDK already defines operations). Wire admin shell navigation.

### Phase M6 — H5 client

Scaffold `apps/sdkwork-commerce-h5` (or capability-specific H5) per `FRONTEND_SPEC.md`; reuse app SDK + IAM H5 patterns from sdkwork-iam.

### Phase M7 — Flutter client

Scaffold `apps/sdkwork-commerce-flutter-mobile` per app manifest spec; consume composed app SDK via Dart facade.

## Verification gates

```powershell
# Platform (required today)
cd E:\sdkwork-space\sdkwork-commerce
pnpm run verify
pnpm run topology:validate
pnpm run gateway:validate:cloud

# Per capability (target: all green after M1–M3)
cd E:\sdkwork-space\sdkwork-<capability>
cargo test --workspace
cargo clippy --workspace --tests -- -D warnings
```

## Non-goals (this tracker)

- Duplicating mall UX inside commerce-pc (use `sdkwork-mall-pc`).
- Reintroducing local `crates/sdkwork-commerce-*-service` duplicates in commerce.
