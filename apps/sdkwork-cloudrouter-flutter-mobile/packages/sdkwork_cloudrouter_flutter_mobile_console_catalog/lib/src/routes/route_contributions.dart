import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

/// Route contributions for the catalog capability.
///
/// Route ids are the canonical Cloud Router console route ids and stay aligned
/// with the PC, H5, mini program, and HarmonyOS roots. Route metadata must not
/// declare HTTP API paths, SDK methods, or transport details.
const List<SdkworkCloudRouterRouteRegistration> console_catalogRouteContributions =
    <SdkworkCloudRouterRouteRegistration>[
  SdkworkCloudRouterRouteRegistration(
    id: 'console.router.catalog.pricing',
    routeName: '/catalog',
    titleKey: 'cloudrouter.console.catalog.title',
    authRequired: true,
    screen: 'ConsoleCatalogScreen',
  ),
];
