import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

/// Route contributions for the dashboard capability.
///
/// Route ids are the canonical Cloud Router console route ids and stay aligned
/// with the PC, H5, mini program, and HarmonyOS roots. Route metadata must not
/// declare HTTP API paths, SDK methods, or transport details.
const List<SdkworkCloudRouterRouteRegistration> console_dashboardRouteContributions =
    <SdkworkCloudRouterRouteRegistration>[
  SdkworkCloudRouterRouteRegistration(
    id: 'console.router.dashboard.overview',
    routeName: '/dashboard',
    titleKey: 'cloudrouter.console.dashboard.title',
    authRequired: true,
    screen: 'ConsoleDashboardScreen',
  ),
];
