# Deployments

## Purpose
`deployments/` stores deployment descriptors, topology examples, packaging handoff files, infrastructure examples, and deployment runbooks.

## Owner
SDKWork Claw Router release and operations maintainers.

## Allowed Content
Docker, Kubernetes, systemd, nginx, release handoff, environment topology, deployment runbooks, and non-secret deployment examples.

## Forbidden Content
Live secrets, private keys, local overrides, runtime user config, production database dumps, logs, caches, and generated SDK transport output.

## Related Specs
- `../../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../../sdkwork-specs/DEPLOYMENT_SPEC.md`
- `../../sdkwork-specs/RELEASE_SPEC.md`

## Verification
- `python -B tools/architecture_standard_guardian.py`
- `pnpm.cmd release:preflight`
