# Mini Program App Docs

## Purpose
`docs/` stores documentation that is local to the mini program application surface.

## Owner
SDKWork CloudRouter mini program maintainers.

## Allowed Content
Mini program app notes, platform (WeChat/Alipay) review notes, package-size and subpackage runbooks, route projection notes, release notes, and links to the repository-level Canon.

## Forbidden Content
Copied root standards, generated runtime bundles under `src/runtime/`, live secrets, app ids that are not placeholders, logs, caches, and repository-wide docs that belong in root `docs/`.

## Related Specs
- `../../../../sdkwork-specs/DOCUMENTATION_SPEC.md`
- `../../../../sdkwork-specs/MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/check-apps-directory-index.mjs --root ../..`
