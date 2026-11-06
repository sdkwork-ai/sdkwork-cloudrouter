# PC Operational Scripts

## Purpose
`bin/` owns cross-platform operational entrypoints for this PC application root.

## Owner
SDKWork CloudRouter PC maintainers.

## Allowed Content
Thin launcher, diagnostics, and packaging helpers grouped by host OS under `windows/`, `linux/`, and `macos/`. Every helper delegates to the repository root `pnpm.cmd` / `pnpm` commands or the module `bin/` entrypoints instead of reimplementing them.

## Forbidden Content
A second build system, duplicated repository scripts, generated artifacts, committed binaries, secrets, and runtime user data.

## Current State
The PC surface ships as a browser renderer only. No Tauri, Electron, or Capacitor host package exists yet, so each platform directory is reserved and carries no runnable entrypoint.

## Related Specs
- `../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/DESKTOP_APP_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/MODULE_BIN_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/check-apps-directory-index.mjs --root ../..`
- `node ../../../../sdkwork-specs/tools/check-client-host-packages.mjs --root ../..`
