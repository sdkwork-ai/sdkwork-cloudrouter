# sdkwork_cloudrouter_flutter_mobile_console_catalog

Official model and pricing catalog.

SDK access is injected: this package never constructs an SDK client. The root
bootstrap creates `CloudRouterAppSdkClients` and hands the typed console ports to
`ConsoleCatalogService`.

Aligned with the PC console surface paths `/models`, `/pricing`, `/rankings`.

Authority: `FLUTTER_APP_MOBILE_ARCHITECTURE_SPEC.md` sections 3 and 4.
