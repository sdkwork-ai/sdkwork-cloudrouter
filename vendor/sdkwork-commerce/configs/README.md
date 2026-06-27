# Configs

## Purpose

Repository-level safe config templates, schemas, profile examples, and non-secret defaults live here.

## Owner

SDKWork Commerce maintainers own this directory. Changes must follow the repository `AGENTS.md` entrypoint and the canonical SDKWork specs under `../sdkwork-specs/`.

## Allowed Content

- Repository-wide config schemas.
- Safe profile examples and non-secret defaults.
- Documentation for config composition outside an app-root `config/` directory.

## Forbidden Content

- Runtime secrets, tokens, database passwords, Redis credentials, private keys, local override files, or user-private config.

## Related Specs

- `../sdkwork-specs/SDKWORK_WORKSPACE_SPEC.md`
- `../sdkwork-specs/CONFIG_SPEC.md`
- `../sdkwork-specs/ENVIRONMENT_SPEC.md`
- `../sdkwork-specs/RUNTIME_DIRECTORY_SPEC.md`
- `../sdkwork-specs/SECURITY_SPEC.md`

## Verification

Run config-specific validation when active and keep architecture static checks passing.
