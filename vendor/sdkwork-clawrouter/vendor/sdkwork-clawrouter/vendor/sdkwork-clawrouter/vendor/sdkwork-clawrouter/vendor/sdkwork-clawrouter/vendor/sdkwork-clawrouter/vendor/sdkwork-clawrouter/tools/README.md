# Tools

## Purpose
`tools/` stores reusable developer, validation, generation, migration, and operator tools that are not shipped as application runtime code.

## Owner
SDKWork Claw Router tooling maintainers.

## Allowed Content
Python guardians, generators, validators, migration helpers, operator utilities, schemas for tools, and tool-local tests when appropriate.

## Forbidden Content
Runtime service implementation, generated SDK transport output, local caches, credentials, user-private config, and one-off shell logic that belongs in `scripts/`.

## Related Specs
- `../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../../sdkwork-specs/CODE_STYLE_SPEC.md`
- `../../sdkwork-specs/TEST_SPEC.md`

## Verification
- `python -B tools/architecture_standard_guardian.py`
- `python -B -m unittest discover tests`
