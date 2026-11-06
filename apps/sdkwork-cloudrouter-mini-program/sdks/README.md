# Mini Program Application SDK Workspace

## Purpose
`sdks/` owns application-root SDK workspaces and generator inputs for the mini program surface when that surface needs a local SDK authority.

## Owner
SDKWork CloudRouter mini program maintainers.

## Allowed Content
Only generator inputs, SDK family manifests, and generated workspaces produced by the canonical generator, laid out by `SDK_WORKSPACE_GENERATION_SPEC.md`.

## Forbidden Content
Hand-edited generated output, forked copies of the repository-level CloudRouter SDK families, raw `wx.request` transport replacing the generated app SDK, and credentials.

## Current State
Empty on purpose. The mini program consumes `@sdkwork/cloudrouter-app-sdk` through `@sdkwork/cloudrouter-mp-core`; it owns no separate SDK authority.

## Related Specs
- `../../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`
- `../../../../sdkwork-specs/SDK_SPEC.md`
- `../../../../sdkwork-specs/MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/verify-repo.mjs --root ../..`
