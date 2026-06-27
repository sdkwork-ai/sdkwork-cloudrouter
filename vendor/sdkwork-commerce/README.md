# sdkwork-commerce

> **Deprecation:** This repository is a **migration-only** composition shell. Authoritative decision:
> [docs/architecture/tech/TECH-2026-06-24-commerce-repository-dissolution.md](docs/architecture/tech/TECH-2026-06-24-commerce-repository-dissolution.md).
> Do **not** add new T0 monolith HTTP surfaces, route crates, or `sdkwork-commerce-pc` packages here.
> Implement capability work in T1 siblings (`sdkwork-shop`, `sdkwork-order`, `sdkwork-payment`, `sdkwork-merchandise`, …).

SDKWork commerce **migration workspace** (legacy T0): composed gateway HTTP surface, IAM wrappers, and PC operator packages being split into per-capability repositories.

T1 capabilities (shop, order, payment, account, …) live in sibling `../sdkwork-*` repositories and are consumed via path dependencies — not duplicated under `crates/`.

## Architecture

- **T0 (this repo, retiring)**: legacy router composition and cross-capability bootstrap during the split.
- **T1 (sibling repos, canonical)**: domain services, `sdkwork-routes-*` HTTP crates, SQL repositories, `*-api-server`, `apps/sdkwork-<capability>-pc/`.
- Authoritative API contracts: per-T1 `apis/`; generated SDKs: per-T1 `sdks/`.
- PC application source: `apps/sdkwork-commerce-pc/` is **migration source only** (see dissolution doc).

Alignment tracker: [docs/architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md](docs/architecture/tech/TECH-2026-06-24-commerce-capability-repo-split-alignment.md)

## Standards

Start from `../sdkwork-specs/`:

- [SOUL.md](../sdkwork-specs/SOUL.md)
- [SDKWORK_WORKSPACE_SPEC.md](../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md)
- [API_SPEC.md](../sdkwork-specs/API_SPEC.md)
- [SDK_SPEC.md](../sdkwork-specs/SDK_SPEC.md)
- [DOCUMENTATION_SPEC.md](../sdkwork-specs/DOCUMENTATION_SPEC.md)

Do not copy canonical standard text into this repository.

## SDK And OpenAPI

```bash
pnpm run sdk:check
pnpm run sdk:generate
```

## Verification

```bash
cargo test --workspace
cargo fmt --all --check
node --test sdks/test/verify-commerce-migration-cleanup.test.mjs
pnpm run typecheck
```

Sync capability Canon docs across sibling repos:

```bash
node tools/sync_commerce_capability_docs.mjs
```

## Documentation Canon

- [docs/README.md](docs/README.md)
- [docs/product/prd/PRD.md](docs/product/prd/PRD.md)
- [docs/architecture/tech/TECH_ARCHITECTURE.md](docs/architecture/tech/TECH_ARCHITECTURE.md)

## Application Roots

- [apps directory index](apps/README.md)
