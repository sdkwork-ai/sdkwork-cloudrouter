> Owner: SDKWork maintainers
> Updated: 2026-06-24
> Status: **active — authoritative**
> Supersedes: standalone `sdkwork-commerce-pc` repo proposal (rejected)

# Commerce Repository Dissolution

## Decision

**Retire the `sdkwork-commerce` monolith repository.** Pre-launch, no T0 composition crate, no aggregated commerce PC application repo.

Each T1 capability repository is the **sole owner** of:

- domain (`crates/`)
- database (`database/`)
- HTTP contracts (`apis/`)
- SDK families (`sdks/`)
- standalone `*-api-server`
- **PC client surface** (`apps/sdkwork-<capability>-pc/`)

Reference implementation: `sdkwork-shop` → `apps/sdkwork-shop-pc/`.

## Target architecture

```text
┌──────────────────────────────────────────────────────────────┐
│  Composition application repos (optional, consumer-only)      │
│  sdkwork-mall, sdkwork-clawrouter, …                          │
│  → workspace-import T1 PC packages + per-T1 SDKs              │
│  → NO monolith HTTP crate, NO sdkwork-commerce-pc repo          │
└────────────────────────────┬─────────────────────────────────┘
                             │ generated SDK + IAM
┌────────────────────────────▼─────────────────────────────────┐
│  sdkwork-deployments — gateway / topology only                  │
└────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────────┐
│  T1 capability repos (10) — full stack per capability          │
│  shop | merchandise | catalog | inventory | order | payment   │
│  account | membership | promotion | invoice                   │
│  each: crates/ database/ apis/ sdks/ apps/sdkwork-*-pc/        │
└──────────────────────────────────────────────────────────────┘
```

**IAM:** `sdkwork-iam`; applied at each T1 `*-api-server` host.

**No** `sdkwork-commerce-router-composition`, **no** `sdkwork-commerce-api-server`, **no** `sdkwork-commerce-pc` git repository.

## PC module distribution

`sdkwork-commerce/apps/sdkwork-commerce-pc/` is a **migration source only**. Packages move into the owning capability repo and are renamed per `NAMING_SPEC.md`:

| Source package | Target repository | Target PC app root | Renamed package |
| --- | --- | --- | --- |
| `sdkwork-commerce-pc-order` | `sdkwork-order` | `apps/sdkwork-order-pc/` | `sdkwork-order-pc-order` |
| `sdkwork-commerce-pc-checkout`, `sdkwork-commerce-pc-billing` | `sdkwork-order` | `apps/sdkwork-order-pc/` | `sdkwork-order-pc-checkout`, `sdkwork-order-pc-billing` |
| `sdkwork-commerce-pc-payment` | `sdkwork-payment` | `apps/sdkwork-payment-pc/` | `sdkwork-payment-pc-payment` |
| `sdkwork-commerce-pc-wallet` | `sdkwork-account` | `apps/sdkwork-account-pc/` | `sdkwork-account-pc-wallet` |
| `sdkwork-commerce-pc-membership`, `membership-purchase` | `sdkwork-membership` | `apps/sdkwork-membership-pc/` | `sdkwork-membership-pc-*` |
| `sdkwork-commerce-pc-admin-membership` | `sdkwork-membership` | `apps/sdkwork-membership-pc/` | `sdkwork-membership-pc-admin-membership` |
| `sdkwork-commerce-pc-coupon`, `offer`, `pricing`, `points` | `sdkwork-promotion` | `apps/sdkwork-promotion-pc/` | `sdkwork-promotion-pc-*` |
| `sdkwork-commerce-pc-invoice` | `sdkwork-invoice` | `apps/sdkwork-invoice-pc/` | `sdkwork-invoice-pc-invoice` |
| `sdkwork-commerce-pc-admin-product` | `sdkwork-merchandise` | `apps/sdkwork-merchandise-pc/` | `sdkwork-merchandise-pc-admin-product` |
| `sdkwork-commerce-pc-entitlement`, `subscription` | `sdkwork-membership` | `apps/sdkwork-membership-pc/` | `sdkwork-membership-pc-*` |
| `sdkwork-commerce-pc-commerce` | decompose | buyer flows → mall or per-capability app packages | — |
| `sdkwork-commerce-pc-core`, `admin-core`, `shell`, `admin-shell`, `commons`, `host` | per T1 repo | each `apps/sdkwork-<cap>-pc/` | `sdkwork-<cap>-pc-core`, `sdkwork-<cap>-pc-shell`, … |

Client contracts under `packages/common/commerce/*` split the same way (mirror `sdkwork-shop/packages/common/shop/*`):

- `@sdkwork/order-service`, `@sdkwork/order-contracts` → `sdkwork-order`
- `@sdkwork/payment-service`, … → `sdkwork-payment`
- etc.

Composed SDK families (`sdks/sdkwork-commerce-*-sdk`) **dissolve** into per-T1 `sdks/` workspaces; composition apps import multiple T1 SDKs.

## What moves where (non-PC)

| Asset in `sdkwork-commerce` | Target |
| --- | --- |
| `apis/*` | Split to each T1 `apis/` |
| `database/ddl/baseline/*` | Split to each T1 `database/` |
| `configs/topology/*`, gateway TOML | `sdkwork-deployments` |
| `crates/sdkwork-commerce-*` (api-server, composition, …) | Delete after gateway cutover |
| `packages/common/commerce/*` | Split to T1 `packages/common/<capability>/` |
| `sdks/sdkwork-commerce-*-sdk/` | Split / replace with per-T1 SDK families |

## Execution phases

| Phase | Goal | Exit criterion |
| --- | --- | --- |
| **D0** | Doc canon + freeze monolith | This doc + PC distribution doc active |
| **D1** | PC packages → T1 repos | Each T1 has `apps/sdkwork-<cap>-pc/`; commerce-pc packages removed |
| **D2** | Client contracts + SDK per T1 | `@sdkwork/<cap>-service` in owning repo; mall/clawrouter paths updated |
| **D3** | Gateway → deployments | split-services topology validates |
| **D4** | Database + OpenAPI per T1 | No commerce baseline DDL |
| **D5** | Delete Rust monolith crates | No `sdkwork-commerce-api-server` |
| **D6** | Archive `sdkwork-commerce` git repo | Redirect README only |

## Explicit non-goals

- **`sdkwork-commerce-pc` as a standalone git repository** — violates building-block model (`SDKWORK_WORKSPACE_SPEC.md`, `APP_PC_ARCHITECTURE_SPEC.md`).
- Keeping a central composed commerce PC app that owns all capability modules.
- Rebuilding T0 under another name.

## Verification

Per T1 after PC migration:

```powershell
cd E:\sdkwork-space\sdkwork-<capability>
pnpm install
pnpm verify          # when Node/PC surface present
cargo test --workspace
```

Composition apps:

```powershell
cd E:\sdkwork-space\sdkwork-mall
pnpm verify
```

## Documentation hygiene

- Active: this file + [TECH-2026-06-24-commerce-pc-capability-distribution.md](TECH-2026-06-24-commerce-pc-capability-distribution.md)
- Retired: split-alignment T0 composition wording, standalone commerce-pc repo references
