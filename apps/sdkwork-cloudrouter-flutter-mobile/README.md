# sdkwork-cloudrouter-flutter-mobile

SDKWork CloudRouter Flutter mobile application root.

## Packages

| Package | Role | Purpose |
| --- | --- | --- |
| `sdkwork_cloudrouter_flutter_mobile_core` | frontend-core | Generated Dart app SDK clients, console ports, session boundary. |
| `sdkwork_cloudrouter_flutter_mobile_commons` | frontend-commons | Design tokens, screen states, locale helpers. |
| `sdkwork_cloudrouter_flutter_mobile_shell` | frontend-shell | Route registry and auth gate decision. |
| `sdkwork_cloudrouter_flutter_mobile_console_dashboard` | frontend-feature | Console overview and gateway health. |
| `sdkwork_cloudrouter_flutter_mobile_console_usage` | frontend-feature | Console request and token usage records. |
| `sdkwork_cloudrouter_flutter_mobile_console_api_keys` | frontend-feature | API key listing, creation, and revocation. |
| `sdkwork_cloudrouter_flutter_mobile_console_catalog` | frontend-feature | Official model and pricing catalog. |

## Runtime env

Gradle/Xcode builds receive the runtime env through `--dart-define`, materialized
from `env/sdkwork.<deploymentProfile>.<environment>.json` by
`pnpm workflow:materialize-client-env` (see `etc/sdkwork.deployment.config.json`).

## Known generated-SDK gap

The generated Dart transport `cloudrouter_app_sdk` currently declares list methods without
query parameters and `apiKeysCreate()` without a request body, so the Flutter root
cannot express the pagination/filter/body contract that the TypeScript roots use.
Where the SDK cannot express a wire call, the Dart port throws a documented
`UnsupportedError` instead of issuing a call that would fail the wire contract.
See `packages/sdkwork_cloudrouter_flutter_mobile_core/README.md`.

## Platforms and stores

| Platform | Host project | Package | Market lane |
| --- | --- | --- | --- |
| iOS | `ios/` (Xcode 15, macOS build) | `ios.ipa` | `APPLE_APP_STORE` |
| Android | `android/` (Gradle) | `android.aab` | `GOOGLE_PLAY`, `HUAWEI_APPGALLERY` |
| HarmonyOS | `harmony/` (DevEco 5, OpenHarmony Flutter fork) | `harmony.hap` | `HUAWEI_APPGALLERY` |

Every market owns an independent document in `etc/store-publishing/` (identity,
listing copy, track, rollout countries, credential references, media and
artifact mapping). Submission targets are planned independently: AppGallery's
Android target is ready as soon as `android.aab` exists, while its HarmonyOS
target waits for `harmony.hap`. `scripts/check-store-publishing.mjs` validates
the lanes and `scripts/sync-store-publishing.mjs --write` projects them into
`agent.app.config.json` (`publish.stores`, `release.notes[].metadata
.marketReleases`, store-tagged media). The workflow and China/US rules are
documented in `etc/store-publishing/README.md`.

Store screenshots are real captures of the shipped console screens, produced by
`test/store_media_capture_test.dart` and promoted into
`assets/media/store/screenshots/`; see `assets/README.md`.

## Verification

```bash
flutter analyze
flutter test
node --test tests/flutter-mobile-surface-contract.test.mjs
node --test tests/store-publishing.test.mjs
node --test tests/store-submission.test.mjs
node --test tests/platform-host.test.mjs
node scripts/check-platform-host.mjs
node scripts/check-store-publishing.mjs
node scripts/release-preflight.mjs --artifacts <built-artifacts-dir>
node ../../../sdkwork-specs/tools/check-app-manifest-standard.mjs --root .
node ../../../sdkwork-specs/tools/check-app-assets-standard.mjs --root .
```

The shared publish orchestrator discovers the Flutter root from `pubspec.yaml`,
emits the three delivery platforms and, with `--stores`, one plan per market:

```bash
node ../../../sdkwork-specs/tools/publish-app.mjs \
  --workspace ../../.. --repo sdkwork-cloudrouter --app cloudrouter-flutter-mobile \
  --dry-run --allow-pre-release --stores
```

`release-preflight.mjs` composes the platform-host check, the store-publishing
check and the submission plan. `verify-release.mjs` is the full regression gate:
it runs `flutter analyze` (error-level only), `flutter test`, the application
Node suites, host/store/manifest/assets/source-config checks and the shared
toolchain tests, writes `.sdkwork/tmp/release-verification.json`, and reports
each store target as ready or blocked:

```bash
node scripts/verify-release.mjs --artifacts <built-artifacts-dir>
```

It fails closed when a declared artifact has not been built; external console
steps are reported without failing the local gate. `flutter analyze` currently
reports pre-existing package-level infos/warnings (the gate fails only on
error-level diagnostics). iOS and HarmonyOS artifacts require macOS/Xcode and
the OpenHarmony Flutter fork respectively; both hosts are checked in, and the
Android lane is built and verified on this host.
