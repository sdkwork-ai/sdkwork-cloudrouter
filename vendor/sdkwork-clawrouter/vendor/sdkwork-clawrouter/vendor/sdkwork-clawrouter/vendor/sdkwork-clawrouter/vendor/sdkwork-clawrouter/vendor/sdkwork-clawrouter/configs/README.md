# Configs

## Purpose
`configs/` stores source-controlled safe config templates, config schemas, profile examples, and non-secret runtime defaults.

## Owner
SDKWork Claw Router configuration and runtime maintainers.

## Allowed Content
Safe templates, schemas, profile examples, documented defaults, non-secret sample environment files, and config validation fixtures.

## Forbidden Content
Live secrets, local override files, private service endpoints, runtime user config, databases, cache, logs, and generated SDK transport output.

## Related Specs
- `../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../../sdkwork-specs/CONFIG_SPEC.md`
- `../../sdkwork-specs/ENVIRONMENT_SPEC.md`
- `../../sdkwork-specs/RUNTIME_DIRECTORY_SPEC.md`

## Verification
- `python -B tools/architecture_standard_guardian.py`
