import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

/// 体验中心 is a host-level tab backed by the Agents app SDK.
const List<SdkworkCloudRouterRouteRegistration> consolePlaygroundRouteContributions =
    <SdkworkCloudRouterRouteRegistration>[
  SdkworkCloudRouterRouteRegistration(
    id: 'playground',
    routeName: '/playground',
    titleKey: 'cloudrouter.console.playground.title',
    authRequired: true,
    screen: 'playground',
  ),
];
