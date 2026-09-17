/// Named-route registry assembly for the Flutter mobile shell.
///
/// Route ids are the canonical Cloud Router console route ids from
/// `@sdkwork/cloudrouter-contracts`; physical Flutter route names may differ
/// while route ids stay stable across platforms.
class SdkworkCloudRouterRouteRegistration {
  const SdkworkCloudRouterRouteRegistration({
    required this.id,
    required this.routeName,
    required this.titleKey,
    required this.authRequired,
    required this.screen,
  });

  final String id;
  final String routeName;
  final String titleKey;
  final bool authRequired;
  final String screen;
}

List<SdkworkCloudRouterRouteRegistration> createSdkworkCloudRouterRouteRegistry(
  List<SdkworkCloudRouterRouteRegistration> routes,
) {
  return routes
      .where((route) => route.routeName.isNotEmpty && route.id.isNotEmpty)
      .toList(growable: false);
}
