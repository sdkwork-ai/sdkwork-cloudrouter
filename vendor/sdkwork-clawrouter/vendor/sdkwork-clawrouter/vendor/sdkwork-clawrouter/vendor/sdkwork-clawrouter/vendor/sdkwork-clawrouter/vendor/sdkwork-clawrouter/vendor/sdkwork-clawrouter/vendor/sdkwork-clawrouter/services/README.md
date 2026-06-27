# Services

## Purpose
`services/` stores existing Rust product service and host crates for Claw Router runtime composition.

## Owner
SDKWork Claw Router Rust runtime maintainers.

## Allowed Content
Existing product service crates, gateway and installer service crates, service-local tests, component specs, and runtime host code already declared in the Cargo workspace.

## Forbidden Content
New router API route crates, generated SDK transport output, frontend packages, runtime databases, local secrets, logs, and caches. New route crates belong under `crates/sdkwork-routes-<capability>-<surface>/`.

## Related Specs
- `../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../../sdkwork-specs/RUST_CODE_SPEC.md`
- `../../sdkwork-specs/NAMING_SPEC.md`

## Verification
- `cargo check --workspace`
- `python -B -m unittest tests.test_sdkwork_routes_api_package_standard`
