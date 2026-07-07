# Route Manifests

## Purpose

`sdks/_route-manifests/` stores SDKWork HTTP route manifest inputs for Claw Router. Each manifest records `requestContext: WebRequestContext`, `apiSurface`, handler ownership, auth mode, and materialized OpenAPI extensions.

Open-api routes that mirror third-party platform protocols must keep operation-level `x-sdkwork-wire-protocol: external` and `x-sdkwork-external-protocol-id` in the route manifest as well as authority OpenAPI and derived SDK inputs. Omitted `x-sdkwork-wire-protocol` means SDKWork-owned custom API (`sdkwork-v3`) and must not be treated as a compatibility exemption.

## Owner

SDKWork Claw Router API maintainers.

## Allowed Content

- `*.route-manifest.json` generated or maintained from OpenAPI authority
- Surface-specific subdirectories: `app-api/`, `backend-api/`, `open-api/`

## Forbidden Content

- Hand-edited generated SDK transport output
- Secrets or environment-specific URLs

## Related Specs

- `../../../sdkwork-specs/WEB_FRAMEWORK_SPEC.md`
- `../../../sdkwork-specs/API_SPEC.md`
- `../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`

## Verification

- `pnpm api:standard-extensions:check`
- `python tools/sdkwork_standard_alignment_guardian.py`
