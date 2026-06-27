# sdkwork-commerce vendor snapshot

The standalone `sdkwork-commerce` workspace checkout was retired from `sdkwork-space` on 2026-06-26.

## Remote archive

Canonical history remains on GitHub:

- Repository: https://github.com/Sdkwork-Cloud/sdkwork-commerce
- Active branch: `main`
- Pre-retirement backup: `archive/remote-main-2026-06-26`
- Final retirement snapshot: `archive/final-main-2026-06-26`

## Local usage

Claw Router and sibling workspaces consume transitional commerce TypeScript packages, generated SDK slices, and Rust crates from this vendored path until T1 domain modules fully replace the remaining surfaces.

Do not reintroduce `sdkwork-space/sdkwork-commerce` as a sibling checkout. Update consumer manifests to reference `vendor/sdkwork-commerce` (Claw Router) or `../sdkwork-clawrouter/vendor/sdkwork-commerce` (sibling repos).

## Debt tracking

This vendored snapshot is **transitional technical debt** tracked by:

- Dissolution plan: `../../sdkwork-specs/MIGRATION_SPEC.md` §8
- Debt scanner: `../scripts/check-commerce-debt.mjs`
- Allowed transitional packages: `@sdkwork/commerce-service`, `@sdkwork/commerce-contracts`, `@sdkwork/commerce-sdk-ports`, `@sdkwork/commerce-app-sdk`, `@sdkwork/commerce-backend-sdk`

## Removal criteria

This vendored snapshot may be deleted when all of the following are true:

1. `sdkwork-mall/pnpm-workspace.yaml` no longer references `vendor/sdkwork-commerce` packages.
2. `sdkwork-mall/tsconfig.base.json` path aliases point to per-T1 SDK sources.
3. `check-commerce-debt.mjs` reports zero transitional commerce dependencies.
4. Per-T1 TypeScript packages (`@sdkwork/<capability>-service`, `@sdkwork/<capability>-contracts`) are published in their owning T1 repositories.
5. Per-T1 generated SDK families (`sdkwork-<capability>-app-sdk`, `sdkwork-<capability>-backend-sdk`) replace the composed commerce SDK families.
