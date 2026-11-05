# SDKWork CloudRouter Flutter Mobile Component Specs

This directory is the local standards index for `sdkwork-cloudrouter-flutter-mobile`.

Root SDKWork standards remain authoritative. Local component specs can narrow or document this component, but they must not contradict [the root standards](../../../../sdkwork-specs/README.md).

## Component

| Field | Value |
| --- | --- |
| Name | `sdkwork-cloudrouter-flutter-mobile` |
| Type | `flutter-mobile-app-root` |
| Root | `sdkwork-cloudrouter/apps/sdkwork-cloudrouter-flutter-mobile` |
| Domain | `platform` |
| Capability | `router` |
| Surface | `app` |
| Languages | `dart`, `flutter` |
| Status | `standardizing` |

## Contract Manifest

- [component.spec.json](./component.spec.json) is the machine-readable component contract.
- The Dart package family is `sdkwork_cloudrouter_flutter_mobile_core`, `_commons`, `_shell`, and `_console_*`, each with its own `specs/` directory.
- Generated Dart SDK output is represented at its SDK family root instead of duplicating local specs in generated folders.

## Canonical Specs

| Spec | Applies Because |
| --- | --- |
| [FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md](../../../../sdkwork-specs/FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md) | Flutter mobile root layout, package taxonomy, platform adapters, and release rules. |
| [APP_FLUTTER_UI_SPEC.md](../../../../sdkwork-specs/APP_FLUTTER_UI_SPEC.md) | Flutter app and console package split and platform adapter boundary. |
| [APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md](../../../../sdkwork-specs/APP_CLIENT_ARCHITECTURE_ALIGNMENT_SPEC.md) | Cross-client package taxonomy and dependency direction. |
| [APP_COMPOSITION_SPEC.md](../../../../sdkwork-specs/APP_COMPOSITION_SPEC.md) | Core package composition entrypoints. |
| [APP_SDK_INTEGRATION_SPEC.md](../../../../sdkwork-specs/APP_SDK_INTEGRATION_SPEC.md) | Generated Dart app SDK, IAM runtime, and session wiring. |
| [DART_CODE_SPEC.md](../../../../sdkwork-specs/DART_CODE_SPEC.md) | Null safety, analyzer, formatting, and async rules. |
| [CODE_STYLE_SPEC.md](../../../../sdkwork-specs/CODE_STYLE_SPEC.md) | Common code style and build source integrity. |
| [NAMING_SPEC.md](../../../../sdkwork-specs/NAMING_SPEC.md) | Dart package, file, and route naming. |

## Entrypoints

- `lib/main.dart` — process entry.
- `lib/app.dart`, `lib/auth_gate.dart` — root app shell and auth gate.
- `lib/bootstrap/runtime.dart` — bootstrap assembly (`environment` → session → host adapters → SDK clients → routes).
- `lib/sdkwork_cloudrouter_flutter_mobile.dart` — public library barrel.

## Runtime Configuration

- Materialized build input: `env/sdkwork.<deployment-profile>.<environment>.json`, injected with `--dart-define-from-file`.
- Runtime templates: `config/app/runtime-env.<deployment-profile>.<environment>.example.json`.
- Host packaging metadata: `config/host/`.
- Deployment index: `etc/sdkwork.deployment.config.json` (`kind = sdkwork.component-deployment`).

## Local Extension Specs

- No local extension specs are declared yet.

## Verification

- `flutter analyze`
- `flutter test`
- `node --test tests/flutter-mobile-surface-contract.test.mjs`
