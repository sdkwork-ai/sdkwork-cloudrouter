# H5 App Docs

## Purpose
`docs/` stores documentation that is local to the H5 mobile application surface.

## Owner
SDKWork CloudRouter H5 maintainers.

## Allowed Content
H5 app notes, mobile host and Capacitor profile runbooks, browser verification notes, mobile release notes, and links to the repository-level Canon.

## Forbidden Content
Copied root standards, generated SDK transport output, live secrets, runtime data, logs, caches, and repository-wide docs that belong in root `docs/`.

## Related Specs
- `../../../../sdkwork-specs/DOCUMENTATION_SPEC.md`
- `../../../../sdkwork-specs/APP_H5_ARCHITECTURE_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/check-apps-directory-index.mjs --root ../..`
