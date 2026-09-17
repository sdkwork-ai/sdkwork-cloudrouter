# sdkwork_cloudrouter_flutter_mobile_console_dashboard

Console overview and gateway health.

SDK access is injected: this package never constructs an SDK client. The root
bootstrap creates `CloudRouterAppSdkClients` and hands the typed console ports to
`ConsoleDashboardService`.

Aligned with the PC console surface paths `/console/dashboard`, `/console/gateway`.

Authority: `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` sections 3 and 4.
