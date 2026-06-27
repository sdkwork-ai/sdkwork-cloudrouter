# APIs

## Purpose

Author-owned Commerce API contract sources and materialization inputs live here before SDK family generation.

## Owner

SDKWork Commerce maintainers own this directory. Changes must follow the repository `AGENTS.md` entrypoint and the canonical SDKWork specs under `../sdkwork-specs/`.

## Allowed Content

- OpenAPI source inputs grouped by surface and domain.
- API examples, changelogs, validation fixtures, and contract materialization inputs.

## Forbidden Content

- Generated SDK transport output.
- SDK family workspaces.
- Runtime server, handler, repository, or UI implementation code.
- Generated SDK control-plane `.sdkwork/` files.

## Related Specs

- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/API_SPEC.md`
- `../sdkwork-specs/SDK_SPEC.md`
- `../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`

## Verification

Run `node --test sdks/test/verify-commerce-standard-architecture.test.mjs` and `pnpm run sdk:check` after API or SDK input changes.
