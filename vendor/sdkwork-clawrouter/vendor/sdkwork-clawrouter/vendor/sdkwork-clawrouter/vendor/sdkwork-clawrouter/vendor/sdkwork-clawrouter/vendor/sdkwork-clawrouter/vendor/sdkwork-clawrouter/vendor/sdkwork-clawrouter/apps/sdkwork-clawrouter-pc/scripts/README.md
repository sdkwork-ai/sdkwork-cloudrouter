# PC App Scripts

## Purpose
`scripts/` stores thin PC app command entrypoints for portal build, dependency checks, smoke tests, and local package setup.

## Owner
SDKWork ClawRouter PC tooling maintainers.

## Allowed Content
Application-local Node scripts, browser smoke entrypoints, build wrappers, package initialization helpers, and script READMEs.

## Forbidden Content
Reusable repository tooling that belongs in root `tools/`, long-lived business logic, generated SDK output, local secrets, logs, caches, and runtime data.

## Related Specs
- `../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/TYPESCRIPT_CODE_SPEC.md`
- `../../../../sdkwork-specs/TEST_SPEC.md`

## Verification
- `pnpm.cmd --dir apps/sdkwork-clawrouter-pc typecheck`
- `python -B tools/architecture_standard_guardian.py` from the repository root
