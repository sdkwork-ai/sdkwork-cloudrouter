import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

/// 消息 is a host-level tab backed by the IM app SDK, not a console SDK
/// capability: the screen owns no generated CloudRouter transport.
const List<SdkworkCloudRouterRouteRegistration> consoleMessagesRouteContributions =
    <SdkworkCloudRouterRouteRegistration>[
  SdkworkCloudRouterRouteRegistration(
    id: 'messages',
    routeName: '/messages',
    titleKey: 'cloudrouter.console.messages.title',
    authRequired: true,
    screen: 'messages',
  ),
];
