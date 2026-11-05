# Flutter App Scripts

## Purpose
`scripts/` stores thin Flutter app command entrypoints for surface build, validation, host generation, and release utilities.

## Owner
SDKWork CloudRouter Flutter tooling maintainers.

## Allowed Content
Application-local shell or Dart wrapper scripts, `flutter`/`dart` invocation helpers, host generation helpers, and script READMEs.

## Forbidden Content
Reusable repository tooling that belongs in root `tools/`, long-lived business logic, generated SDK output, keystores or signing material, local secrets, build output, and runtime data.

## Current State
Empty on purpose: the Flutter surface builds through the standard `flutter build` / `flutter run --dart-define-from-file=env/<profile>.json` commands. Add a script here only when a helper cannot live in the owning package or the shared tooling.

## Related Specs
- `../../../../sdkwork-specs/FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md`
- `../../../../sdkwork-specs/DART_CODE_SPEC.md`

## Verification
- `flutter analyze`
- `flutter test`
