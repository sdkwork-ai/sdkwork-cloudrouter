# H5 App Scripts

## Purpose
`scripts/` stores thin H5 app command entrypoints for surface build, validation, host generation, and release utilities.

## Owner
SDKWork CloudRouter H5 tooling maintainers.

## Allowed Content
Application-local Node scripts, capability-profile generation helpers, mobile host helper wrappers, and script READMEs.

## Forbidden Content
Reusable repository tooling that belongs in root `tools/`, long-lived business logic, generated SDK output, local secrets, logs, caches, and runtime data.

## Current State
Empty on purpose: the H5 surface builds through `package.json` scripts and `sdkwork-specs/tools/build-browser-client.mjs`; add a script here only when a helper cannot live in the owning package or the shared tooling.

## Related Specs
- `../../../../sdkwork-specs/APP_H5_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`

## Verification
- `pnpm typecheck`
- `pnpm check`
