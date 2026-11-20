# iOS Host

## Purpose

`ios/` is the iOS host project for the Flutter mobile application. It ships the
`IPA` consumed by the App Store Connect lane
(`etc/store-publishing/apple-app-store.json`) and matches the Android/HarmonyOS
identity exactly.

## Ownership

SDKWork CloudRouter Flutter maintainers own this project. The Dart UI, services,
and packages stay in `lib/` and `packages/`.

## Identity

| Field | Value |
| --- | --- |
| Bundle identifier | `com.sdkwork.cloudrouter.mobile` (`RunnerTests` uses the `.RunnerTests` suffix) |
| Display name | `CloudRouter` |
| Deployment target | iOS 15.0 |
| Device family | iPhone only (`TARGETED_DEVICE_FAMILY = 1`); iPad is not claimed until a tablet layout and iPad 13" screenshots exist, and `check-platform-host.mjs` fails if the Xcode family and `runtime.targetPlatforms` disagree |
| App icons | `Runner/Assets.xcassets/AppIcon.appiconset/` regenerated from the brand mark by `scripts/generate-store-images.py` |

## Build

Building requires macOS with Xcode 15+ (the host here is Windows, so CI for this
lane runs on a macOS runner):

```sh
flutter build ipa --release --export-method app-store
```

The signed package lands under `build/ios/ipa/*.ipa`; the publish toolchain
collects it as `ios.ipa`.

## Signing

Signing certificates and provisioning profiles are supplied by the CI secret
store and referenced by `etc/store-publishing/apple-app-store.json`
(`submission.credentialRefs`). No certificate, profile, team id, or App Store
Connect key is committed.

## Verification

- `node ../../../sdkwork-specs/tools/check-app-manifest-standard.mjs --root ../`
- `node ../scripts/check-store-publishing.mjs`
- `flutter build ipa --release` on macOS.
