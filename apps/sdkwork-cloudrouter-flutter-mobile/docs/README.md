# Flutter App Docs

## Purpose
`docs/` stores documentation that is local to the Flutter mobile application surface.

## Owner
SDKWork CloudRouter Flutter maintainers.

## Allowed Content
Flutter app notes, Android/iOS platform runbooks, HTTPS trust and signing notes, release notes, and links to the repository-level Canon.

## Forbidden Content
Copied root standards, generated SDK output, keystores or signing material, live secrets, build output, and repository-wide docs that belong in root `docs/`.

## Related Specs
- `../../../../sdkwork-specs/DOCUMENTATION_SPEC.md`
- `../../../../sdkwork-specs/FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/check-apps-directory-index.mjs --root ../..`
