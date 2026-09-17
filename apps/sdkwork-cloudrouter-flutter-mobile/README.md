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

## Verification

```bash
flutter analyze
node --test tests/flutter-mobile-surface-contract.test.mjs
```
