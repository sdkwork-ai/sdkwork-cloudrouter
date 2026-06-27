# Route Manifests

## Purpose

`sdks/_route-manifests/` stores SDKWork HTTP route manifest inputs for Claw Router. Each manifest records `requestContext: WebRequestContext`, `apiSurface`, handler ownership, and auth mode for materialized OpenAPI extensions.

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
