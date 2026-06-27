# Deployments

## Purpose

Deployment descriptors, release handoff files, environment topology notes, and deployment runbooks live here.

## Owner

SDKWork Commerce maintainers own this directory. Changes must follow the repository `AGENTS.md` entrypoint and the canonical SDKWork specs under `../sdkwork-specs/`.

## Allowed Content

- Docker, Kubernetes, systemd, nginx, topology, and release handoff documentation.
- Safe examples with placeholders.

## Forbidden Content

- Live secrets, private keys, mutable runtime data, local override config, production-only credentials, or generated SDK transport output.

## Related Specs

- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/DEPLOYMENT_SPEC.md`
- `../sdkwork-specs/NGINX_SPEC.md`
- `../sdkwork-specs/RELEASE_SPEC.md`
- `../sdkwork-specs/SECURITY_SPEC.md`

## Verification

Run release/deployment preflight checks when this directory is active and keep repository static checks passing.
