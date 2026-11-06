# H5 Operational Scripts

## Purpose
`bin/` owns cross-platform operational entrypoints for this H5 application root.

## Owner
SDKWork CloudRouter H5 maintainers.

## Allowed Content
Thin build, install, run, diagnostics, and mobile-host helper entrypoints grouped under `ios/` and `android/`. Each helper delegates to the repository root `pnpm.cmd` / `pnpm` commands or the owning package's toolchain instead of reimplementing them.

## Forbidden Content
A second build system, duplicated repository scripts, generated native project output, committed binaries, signing material, secrets, and runtime user data.

## Current State
The H5 surface ships as a browser renderer only. No Capacitor host package exists yet, so `ios/` and `android/` are reserved and carry no runnable entrypoint.

## Related Specs
- `../../../../sdkwork-specs/APP_H5_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/MODULE_BIN_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/check-apps-directory-index.mjs --root ../..`
- `node ../../../../sdkwork-specs/tools/check-client-host-packages.mjs --root ../..`
