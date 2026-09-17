# sdks/

This directory follows `SDK_WORKSPACE_GENERATION_SPEC.md`.

Harmony roots consume the application-owned generated app SDK from the
repository-level `sdks/` workspace. They must not contain hand-edited
generated output.

Current coverage of `sdks/cloudrouter-app-sdk`:

| Target | Workspace | State |
| --- | --- | --- |
| typescript | `cloudrouter-app-sdk-typescript` | materialized |
| flutter | `cloudrouter-app-sdk-flutter` | materialized |
| arkts | _none_ | not produced by the SDK generation chain yet |

Until an ArkTS target exists, this root consumes the app-api surface through
an adapted port declared in
`packages/sdkwork-cloudrouter-harmony-mobile-core/src/main/ets/sdk/CloudRouterAppSdkClient.ets`.
Feature packages never fill this gap with raw request APIs or manual auth
headers.
