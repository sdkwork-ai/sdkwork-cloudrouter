# Scripts

## Purpose

Thin command entrypoints for build, verification, generation, migration, packaging, and release workflows live here.

## Owner

SDKWork Commerce maintainers own this directory. Changes must follow the repository `AGENTS.md` entrypoint and the canonical SDKWork specs under `../sdkwork-specs/`.

## Allowed Content

- Thin wrappers that call canonical package, Cargo, or SDKWork tooling.
- Cross-platform script entrypoints with reusable logic kept in `tools/` or packages.

## Forbidden Content

- Reusable business logic, SDK generator replacements, generated SDK transport output, secrets, runtime data, or long-lived local state.

## Related Specs

- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`
- `../sdkwork-specs/SDK_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`

## Verification

Run the script target plus `node --test sdks/test/verify-commerce-standard-architecture.test.mjs` after adding or changing script entrypoints.
