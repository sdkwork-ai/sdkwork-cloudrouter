# Tools

## Purpose

Developer, validation, SDK generation, migration, and operator tooling lives here.

## Owner

SDKWork Commerce maintainers own this directory. Changes must follow the repository `AGENTS.md` entrypoint and the canonical SDKWork specs under `../sdkwork-specs/`.

## Allowed Content

- Deterministic Node or script-based generators, validators, and migration utilities.
- Thin wrappers around canonical SDKWork tooling when the wrapper records the canonical tool it invokes.

## Forbidden Content

- Runtime application code.
- Generated SDK transport output.
- Stubs that replace canonical SDKWork generators for committed output.
- Secrets, local credentials, or machine-specific state.

## Related Specs

- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`
- `../sdkwork-specs/SDK_SPEC.md`
- `../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`

## Verification

Run `pnpm run sdk:check`, `pnpm run test:node`, or the focused tool test after changing shared tools.
