import 'console_tab_glyph.dart';

/// Console tab descriptors for the Flutter mobile shell.
///
/// Mirrors `CLOUDROUTER_CONSOLE_TABS` from `@sdkwork/cloudrouter-contracts`
/// (route keys, paths, title keys, and glyphs in `CLOUDROUTER_CONSOLE_ROUTE_ORDER`
/// order). The sign-in route is deliberately absent: it is not a tab.
///
/// The shell is the single composition point that decides which routes are tabs
/// (`APP_FLUTTER_UI_SPEC.md` section 5); capability packages only contribute
/// screens and never declare tab bars.
class SdkworkCloudRouterConsoleTab {
  const SdkworkCloudRouterConsoleTab({
    required this.routeKey,
    required this.path,
    required this.titleKey,
    required this.glyph,
  });

  final String routeKey;
  final String path;
  final String titleKey;
  final ConsoleTabGlyph glyph;
}

/// The four console tabs in canonical order: overview, usage, API keys, models.
const List<SdkworkCloudRouterConsoleTab> consoleTabs = <SdkworkCloudRouterConsoleTab>[
  SdkworkCloudRouterConsoleTab(
    routeKey: 'dashboard',
    path: '/dashboard',
    titleKey: 'cloudrouter.console.dashboard.title',
    glyph: ConsoleTabGlyph.dashboard,
  ),
  SdkworkCloudRouterConsoleTab(
    routeKey: 'usage',
    path: '/usage',
    titleKey: 'cloudrouter.console.usage.title',
    glyph: ConsoleTabGlyph.receipt,
  ),
  SdkworkCloudRouterConsoleTab(
    routeKey: 'apiKeys',
    path: '/api-keys',
    titleKey: 'cloudrouter.console.apiKeys.title',
    glyph: ConsoleTabGlyph.key,
  ),
  SdkworkCloudRouterConsoleTab(
    routeKey: 'catalog',
    path: '/catalog',
    titleKey: 'cloudrouter.console.catalog.title',
    glyph: ConsoleTabGlyph.barChart,
  ),
];
