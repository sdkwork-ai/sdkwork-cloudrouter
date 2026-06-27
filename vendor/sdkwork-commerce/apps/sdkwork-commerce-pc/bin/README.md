# bin

Purpose: operational script entrypoint directory for the SDKWork Commerce PC application root.

Owner: `sdkwork-commerce-pc` application runtime and release maintainers.

Allowed content: cross-platform start, stop, restart, status, diagnostics, desktop launch, and packaging helper scripts that call package commands.

Forbidden content: business logic, generated SDK output, checked-in secrets, host-local runtime state, and scripts that bypass SDKWork package commands.

Related specs: `../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`, `../../../sdkwork-specs/CONFIG_SPEC.md`, and `../../../sdkwork-specs/ENVIRONMENT_SPEC.md`.

Verification: run `node --test sdks/test/verify-commerce-standard-architecture.test.mjs` from the repository root.
