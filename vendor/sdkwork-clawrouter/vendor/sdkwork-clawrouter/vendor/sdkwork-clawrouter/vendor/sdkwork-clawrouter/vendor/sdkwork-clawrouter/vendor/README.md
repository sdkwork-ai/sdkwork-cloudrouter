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
