# H5 Application SDK Workspace

## Purpose
`sdks/` owns application-root SDK workspaces and generator inputs for the H5 surface when that surface needs a local SDK authority.

## Owner
SDKWork CloudRouter H5 maintainers.

## Allowed Content
Only generator inputs, SDK family manifests, and generated workspaces produced by the canonical generator, laid out by `SDK_WORKSPACE_GENERATION_SPEC.md`.

## Forbidden Content
Hand-edited generated output, forked copies of the repository-level CloudRouter SDK families, raw HTTP client replacements, and credentials.

## Current State
Empty on purpose. The H5 renderer consumes `@sdkwork/cloudrouter-app-sdk` and the shared service packages through workspace dependencies; it owns no separate SDK authority.

## Related Specs
- `../../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`
- `../../../../sdkwork-specs/SDK_SPEC.md`
- `../../../../sdkwork-specs/APP_H5_ARCHITECTURE_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/verify-repo.mjs --root ../..`
