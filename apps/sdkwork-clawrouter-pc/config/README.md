# PC App Config

## Purpose
`config/` stores PC React application-local safe config templates and architecture-local configuration notes.

## Owner
SDKWork ClawRouter PC maintainers.

## Allowed Content
Non-secret PC app config templates, local config schemas, documented defaults, and examples that are specific to this application surface.

## Forbidden Content
Live secrets, local overrides, runtime user config, generated SDK transport output, logs, caches, and repository-wide environment/runtime values that belong in root `etc/`.

## Related Specs
- `../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/CONFIG_SPEC.md`
- `../../../../sdkwork-specs/SOURCE_CONFIG_SPEC.md`
- `../../../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`

## Verification
- `python -B tools/architecture_standard_guardian.py` from the repository root
