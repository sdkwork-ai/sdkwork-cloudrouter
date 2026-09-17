# sdkwork_cloudrouter_flutter_mobile_console_api_keys

API key listing, creation, and revocation.

SDK access is injected: this package never constructs an SDK client. The root
bootstrap creates `CloudRouterAppSdkClients` and hands the typed console ports to
`ConsoleApiKeysService`.

Aligned with the PC console surface paths `/console/api-keys`.

Authority: `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` sections 3 and 4.
