# Plugins

## Purpose
`plugins/` stores application or runtime plugin source packages. Agent and Codex plugin metadata lives under `.sdkwork/plugins/` instead.

## Owner
SDKWork Claw Router plugin maintainers.

## Allowed Content
Runtime plugin source packages, plugin component specs, plugin READMEs, extension manifests, tests, and integration examples.

## Forbidden Content
Repository agent plugins, Codex plugin cache files, generated SDK output, vendored unrelated toolchains, runtime databases, local logs, caches, and secrets.

## Related Specs
- `../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../../sdkwork-specs/COMPONENT_SPEC.md`

## Verification
- `python -B tools/architecture_standard_guardian.py`
