import 'package:sdkwork_cloudrouter_flutter_mobile_console_api_keys/sdkwork_cloudrouter_flutter_mobile_console_api_keys.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_catalog/sdkwork_cloudrouter_flutter_mobile_console_catalog.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_dashboard/sdkwork_cloudrouter_flutter_mobile_console_dashboard.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_usage/sdkwork_cloudrouter_flutter_mobile_console_usage.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

/// Assembles the console route registry from the capability contributions.
///
/// Every console capability contributes its canonical route id, path, title
/// key, and auth mode; the root composes them once. The sign-in route is not a
/// tab and is not contributed here.
List<SdkworkCloudRouterRouteRegistration> createRoutes() {
  return createSdkworkCloudRouterRouteRegistry(<SdkworkCloudRouterRouteRegistration>[
    ...console_dashboardRouteContributions,
    ...console_usageRouteContributions,
    ...console_api_keysRouteContributions,
    ...console_catalogRouteContributions,
  ]);
}

/// Verifies the assembled registry against the shell tab descriptors.
///
/// The tab bar order is the canonical `CLOUDROUTER_CONSOLE_ROUTE_ORDER` mirrored
/// by `consoleTabs`; this check fails fast when a capability path or title key
/// drifts from the tab bar so the Flutter root cannot silently lose a tab.
void verifyConsoleRouteAlignment(List<SdkworkCloudRouterRouteRegistration> routes) {
  for (final tab in consoleTabs) {
    final match = routes.where((route) => route.routeName == tab.path).toList();
    if (match.length != 1) {
      throw StateError(
        'Console route alignment failed for ${tab.routeKey}: expected exactly one '
        'contribution for ${tab.path}, found ${match.length}.',
      );
    }
    if (match.single.titleKey != tab.titleKey) {
      throw StateError(
        'Console route alignment failed for ${tab.routeKey}: title key '
        '${match.single.titleKey} does not match the tab descriptor ${tab.titleKey}.',
      );
    }
    if (!match.single.authRequired) {
      throw StateError(
        'Console route alignment failed for ${tab.routeKey}: tab routes must require auth.',
      );
    }
  }
}
