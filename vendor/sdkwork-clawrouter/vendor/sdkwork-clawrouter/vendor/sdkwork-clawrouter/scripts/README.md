# Scripts

## Purpose
`scripts/` stores thin command entrypoints for build, verification, generation, migration, packaging, local development, and release workflows.

## Owner
SDKWork Claw Router tooling and release maintainers.

## Allowed Content
Node, Python, PowerShell, or shell entrypoints that orchestrate canonical tools and keep reusable logic in `tools/` or proper packages.

## Forbidden Content
Long-lived business logic, generated SDK transport output, runtime state, caches, logs, local credentials, and script-only replacements for SDKWork standards.

## Related Specs
- `../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../../sdkwork-specs/ENGINEERING_WORKFLOW_SPEC.md`
- `../../sdkwork-specs/TEST_SPEC.md`

## Verification
- `python -B tools/architecture_standard_guardian.py`
- `node scripts/run-claw-router-application.test.mjs`
