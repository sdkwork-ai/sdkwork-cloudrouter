# sdkwork_cloudrouter_flutter_mobile_console_usage

Console request and token usage records.

SDK access is injected: this package never constructs an SDK client. The root
bootstrap creates `CloudRouterAppSdkClients` and hands the typed console ports to
`ConsoleUsageService`.

Aligned with the PC console surface paths `/console/usage`.

Authority: `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` sections 3 and 4.
