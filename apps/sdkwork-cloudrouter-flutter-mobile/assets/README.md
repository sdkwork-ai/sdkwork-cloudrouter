# Flutter Application Assets

## Purpose
`assets/` is the Flutter application asset root defined by `APP_ASSETS_SPEC.md`. It owns application resources and catalog/store media separately from `lib/` sources.

## Owner
SDKWork CloudRouter Flutter maintainers and the product design owner.

## Source Of Truth
Design masters live under `source/` or the design owner's retained workspace; curated exports move to `media/`, and published catalog media is delivered through Drive/CDN URLs instead of being bundled.

## Rights Basis
Photography, illustration, store screenshots, and device-frame composites are SDKWork-owned product captures or licensed assets recorded by the design owner. An asset without a recorded rights basis must not be committed.

## Allowed Content
- `resources/` — runtime or content resources referenced by the Flutter surface.
- `media/` — catalog and store media (`icons/`, `covers/`, `screenshots/`, `previews/`, `store/`).
- `capture/` — capture configuration and capture evidence metadata.
- `source/` — optional editable design masters.

## Forbidden Content
Generated thumbnails, OS metadata files, editor swap files, keystores, credentials, imports of `media/` from `lib/`, and store media bundled into the app artifact.

## Update Procedure
1. Export the curated file into `resources/` or `media/` with the `APP_ASSETS_SPEC.md` path grammar.
2. Declare bundled runtime resources in `pubspec.yaml#flutter.assets`; store media stays undeclared.
3. Record the manifest entry before enabling it, then run `node ../../../../sdkwork-specs/tools/check-app-assets-standard.mjs --root ../..`.

## Store Media Workflow
Store screenshots are captured from the shipped screens, never mocked up:

1. `node scripts/capture-store-media.mjs` writes raw PNGs and `capture-report.json` under `.sdkwork/tmp/assets-capture/`.
2. Review the raw captures, then `node scripts/promote-store-media.mjs` copies the five screens per shelf into `media/store/screenshots/`.
3. `python scripts/generate-store-images.py` regenerates the brand icon, launcher icons, catalog cover, and Google feature graphic, and strips the alpha channel from every store screenshot.
4. `node scripts/sync-store-publishing.mjs --write` projects the store-tagged media and lanes into `agent.app.config.json`; `node scripts/check-store-publishing.mjs` verifies it.

## Current State
The `sdkwork-app-assets.v1` marker is adopted. `capture/capture.config.json`
registers the `flutter-widget-test` adapter at the canonical iOS, Android,
HarmonyOS, and generic-mobile viewports. `media/icons/`, `media/covers/`,
`media/store/screenshots/`, and `media/store/{apple,google,huawei,harmony}/`
hold the real mark and capture set; no placeholder media remains enabled.

## Related Specs
- `../../../../sdkwork-specs/APP_ASSETS_SPEC.md`
- `../../../../sdkwork-specs/ICON_SPEC.md`
- `../../../../sdkwork-specs/FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md`

## Verification
- `node ../../../../sdkwork-specs/tools/check-app-assets-standard.mjs --root ../..`
