import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

/// Profile is a host-level tab, not a console SDK capability: it exposes the
/// shared account/settings surface without owning generated SDK clients.
const List<SdkworkCloudRouterRouteRegistration> consoleProfileRouteContributions =
    <SdkworkCloudRouterRouteRegistration>[
  SdkworkCloudRouterRouteRegistration(
    id: 'profile',
    routeName: '/profile',
    titleKey: 'cloudrouter.console.profile.title',
    authRequired: true,
    screen: 'profile',
  ),
];
