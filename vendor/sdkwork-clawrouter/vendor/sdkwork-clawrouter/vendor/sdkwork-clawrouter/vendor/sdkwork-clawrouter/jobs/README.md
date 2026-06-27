# Jobs

## Purpose
`jobs/` stores job definitions, schedules, queue bindings, batch descriptors, maintenance runbooks, and non-Rust job packages.

## Owner
SDKWork Claw Router operations and platform maintainers.

## Allowed Content
Schedule manifests, queue contracts, batch job descriptors, maintenance runbooks, operational examples, and links to worker crates.

## Forbidden Content
Rust worker implementation code, runtime queue state, local logs, caches, production credentials, database dumps, and generated SDK output.

## Related Specs
- `../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../../sdkwork-specs/RUNTIME_DIRECTORY_SPEC.md`
- `../../sdkwork-specs/DEPLOYMENT_SPEC.md`

## Verification
- `python -B tools/architecture_standard_guardian.py`
