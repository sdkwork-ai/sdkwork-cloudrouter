# Mini Program Application Assets

## Purpose
`assets/` is the mini program application asset root defined by `APP_ASSETS_SPEC.md`. It owns catalog and store media separately from runtime page assets under `src/assets/` and `src/images/`.

## Owner
SDKWork CloudRouter mini program maintainers and the product design owner.

## Source Of Truth
Design masters live under `source/` or the design owner's retained workspace; curated exports move to `media/`, and published catalog media is delivered through Drive/CDN URLs instead of being bundled.

## Rights Basis
Photography, illustration, store screenshots, and mini program QR composites are SDKWork-owned product captures or licensed assets recorded by the design owner. An asset without a recorded rights basis must not be committed.

## Allowed Content
- `resources/` — runtime or content resources owned by the mini program surface.
- `media/` — catalog and store media (`icons/`, `covers/`, `screenshots/`, `previews/`, `store/`).
- `capture/` — capture configuration and capture evidence metadata.
- `source/` — optional editable design masters.

## Forbidden Content
Tab bar and page icons that the WeChat runtime loads (those belong in `src/images/`), generated thumbnails, OS metadata files, editor swap files, credentials, app ids that are not placeholders, and any path imported by page source.

## Update Procedure
1. Export the curated file into `resources/` or `media/` with the `APP_ASSETS_SPEC.md` path grammar.
2. Record the manifest entry (`path`, dimensions, format, size, alpha, capture metadata) before enabling it.
3. Run `node ../../../../sdkwork-specs/tools/check-app-assets-standard.mjs --root ../..`.

## Current State
The skeleton is in place and the manifest still uses the legacy media binding. `capture/capture.config.json` is authored when creation-time capture is enabled for this root; until then no capture command is registered.

## Related Specs
- `../../../../sdkwork-specs/APP_ASSETS_SPEC.md`
- `../../../../sdkwork-specs/ICON_SPEC.md`
- `../../../../sdkwork-specs/MINI_PROGRAM_APP_ARCHITECTURE_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/check-app-assets-standard.mjs --root ../..`
