# Flutter Application SDK Workspace

## Purpose
`sdks/` owns application-root SDK workspaces and generator inputs for the Flutter surface when that surface needs a local Dart SDK authority.

## Owner
SDKWork CloudRouter Flutter maintainers.

## Allowed Content
Only generator inputs, SDK family manifests, and generated Dart packages produced by the canonical generator, laid out by `SDK_WORKSPACE_GENERATION_SPEC.md`.

## Forbidden Content
Hand-edited generated output, forked copies of the repository-level CloudRouter SDK families, raw `http` client replacements, and credentials.

## Current State
Empty on purpose. The Flutter app consumes the generated Dart app SDK through `packages/sdkwork_cloudrouter_flutter_mobile_core`; it owns no separate SDK authority.

## Related Specs
- `../../../../sdkwork-specs/SDK_WORKSPACE_GENERATION_SPEC.md`
- `../../../../sdkwork-specs/SDK_SPEC.md`
- `../../../../sdkwork-specs/FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/verify-repo.mjs --root ../..`
