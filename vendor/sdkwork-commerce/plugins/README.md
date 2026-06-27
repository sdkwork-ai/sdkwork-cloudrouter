# Plugins

## Purpose

Application or runtime plugin source packages live here when Commerce owns installable runtime extensions.

## Owner

SDKWork Commerce maintainers own this directory. Changes must follow the repository `AGENTS.md` entrypoint and the canonical SDKWork specs under `../sdkwork-specs/`.

## Allowed Content

- Runtime plugin source packages with component specs.
- Plugin examples and tests for Commerce-owned runtime extension points.

## Forbidden Content

- Agent plugins; those belong under `.sdkwork/plugins/`.
- Generated SDK transport output.
- Vendored unrelated toolchains, secrets, runtime databases, or cache files.

## Related Specs

- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/COMPONENT_SPEC.md`
- `../sdkwork-specs/SECURITY_SPEC.md`
- `../sdkwork-specs/TEST_SPEC.md`

## Verification

Add component-level verification when a plugin is introduced; keep `node --test sdks/test/verify-commerce-standard-architecture.test.mjs` passing.
