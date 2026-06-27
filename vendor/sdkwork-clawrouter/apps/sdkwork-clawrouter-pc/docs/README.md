# PC App Docs

## Purpose
`docs/` stores documentation that is local to the PC React application surface.

## Owner
SDKWork ClawRouter PC maintainers.

## Allowed Content
PC app notes, UI package documentation, local runbooks, browser verification notes, and links to root documentation.

## Forbidden Content
Copied root standards, generated SDK transport output, live secrets, runtime data, logs, caches, and repository-wide docs that belong in root `docs/`.

## Related Specs
- `../../../../sdkwork-specs/DOCUMENTATION_SPEC.md`
- `../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`

## Verification
- `python -B tools/architecture_standard_guardian.py` from the repository root
