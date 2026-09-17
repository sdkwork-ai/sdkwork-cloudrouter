# sdkwork_cloudrouter_flutter_mobile_core

Core package: generated Dart app SDK clients, the console ports adapter, and the
session boundary.

## Generated Dart SDK gap (must be fixed upstream)

`cloudrouter_app_sdk` is generated as a thin transport. As of this writing:

- `ai.usageLogsList()`, `iam.apiKeysList()` accept **no query parameters**, so
  pagination and filters cannot be sent.
- `iam.apiKeysCreate()` issues `POST /iam/api_keys` **without a request body**,
  while the wire contract requires `name`, `quota`, `isUnlimitedQuota`,
  `modalities`, `ipLimit`, and `expires`. Calling it produces a
  contract-invalid request.
- `ai.modelsList([page, pageSize, q, ...])` and `ai.dashboardOverviewRetrieve()`
  are complete.

`createCloudRouterConsolePorts` therefore throws a documented `UnsupportedError`
for key creation instead of issuing a call that would fail the wire contract. The
gap is asserted by `test/console_ports_test.dart` so it cannot be silently
"fixed" by pretending the SDK accepts a body.

## Authority

- `APP_SDK_INTEGRATION_SPEC.md` section 4
- `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` sections 3 and 4
