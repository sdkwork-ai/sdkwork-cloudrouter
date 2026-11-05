# PC Application SDK Workspace

## Purpose
`sdks/` owns application-root SDK workspaces and generator inputs for the PC surface when that surface needs a local SDK authority.

## Owner
SDKWork CloudRouter PC maintainers.

## Allowed Content
Only generator inputs, SDK family manifests, and generated workspaces produced by the canonical generator, laid out by `SDK_WORKSPACE_GENERATION_SPEC.md`.

## Forbidden Content
Hand-edited generated output, forked copies of `sdks/cloudrouter-app-sdk`, `sdks/cloudrouter-backend-sdk`, or `sdks/cloudrouter-open-sdk`, raw HTTP client replacements, and credentials.

## Current State
Empty on purpose. The PC renderer consumes the repository-level SDK families in `sdks/` (`@sdkwork/cloudrouter-app-sdk`, `@sdkwork/cloudrouter-backend-sdk`) through workspace packages; it owns no separate SDK authority.

## Related Specs
- `../../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`
- `../../../../sdkwork-specs/SDK_SPEC.md`
- `../../../../sdkwork-specs/APP_PC_ARCHITECTURE_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/verify-repo.mjs --root ../..`
