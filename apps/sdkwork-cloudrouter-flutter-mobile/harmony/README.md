# HarmonyOS Host

## Purpose

`harmony/` is the HarmonyOS (Stage model) host project for the Flutter mobile
application. It embeds the Flutter engine, renders the single `FlutterPage`, and
produces the `HAP` package consumed by the Huawei AppGallery lane
(`etc/store-publishing/huawei-appgallery.json`).

## Ownership

SDKWork CloudRouter Flutter maintainers own this project. The Dart UI, services,
and packages stay in `lib/` and `packages/`; this directory contains only the
device host, resources, and build configuration.

## Required Toolchain

Stock Flutter has no `hap` target. Building this project requires:

- the OpenHarmony Flutter fork (the `flutter_ohos` engine), which generates
  `harmony/entry/src/main/ets/plugins/GeneratedPluginRegistrant.ets` and
  materializes `harmony/har/flutter.har` on the first build;
- DevEco Studio 5.0+ with `hvigorw` and `ohpm` on `PATH`;
- a signing profile from AppGallery Connect (`build-profile.json5`
  `signingConfigs`, never committed).

The checked-in project lets the host be reviewed and keeps `APP_HARMONY` a real
shipped target; the [build lane](../../../sdkwork-specs/tools/lib/app-publish/packagers/flutter-mobile.mjs)
fails closed with guidance when the fork is absent.

## Build

```sh
# From the application root, with the OpenHarmony Flutter fork active:
flutter build hap --release

# Or from this directory with DevEco:
hvigorw assembleHap --mode module -p product=default -p buildMode=release
```

The signed package lands under `harmony/entry/build/default/outputs/` as
`*.hap`; the publish toolchain collects it as `harmony.hap`.

## Identity

| Field | Value |
| --- | --- |
| `bundleName` | `com.sdkwork.cloudrouter.mobile` |
| Version | `app.json5#versionName` must track `agent.app.config.json#release.currentVersion` |
| Module icon | `assets/media/store/harmony/app-icon-216.png` (copied into `resources/base/media/`) |

## Verification

- `node ../../../sdkwork-specs/tools/check-app-manifest-standard.mjs --root ../`
- `node ../scripts/check-platform-host.mjs` (bundle id/version/resources agree across the three hosts)
- `node ../scripts/check-store-publishing.mjs`
- `flutter build hap --release` on a host with the OpenHarmony fork.
