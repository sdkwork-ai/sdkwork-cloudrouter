import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

/// Route contributions for the api_keys capability.
///
/// Route ids are the canonical Cloud Router console route ids and stay aligned
/// with the PC, H5, mini program, and HarmonyOS roots. Route metadata must not
/// declare HTTP API paths, SDK methods, or transport details.
const List<SdkworkCloudRouterRouteRegistration> console_api_keysRouteContributions =
    <SdkworkCloudRouterRouteRegistration>[
  SdkworkCloudRouterRouteRegistration(
    id: 'console.router.apiKeys.list',
    routeName: '/api-keys',
    titleKey: 'cloudrouter.console.apiKeys.title',
    authRequired: true,
    screen: 'ConsoleApiKeysScreen',
  ),
];
