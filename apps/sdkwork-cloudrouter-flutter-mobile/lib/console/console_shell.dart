import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_api_keys/sdkwork_cloudrouter_flutter_mobile_console_api_keys.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_catalog/sdkwork_cloudrouter_flutter_mobile_console_catalog.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_dashboard/sdkwork_cloudrouter_flutter_mobile_console_dashboard.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_usage/sdkwork_cloudrouter_flutter_mobile_console_usage.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_shell/sdkwork_cloudrouter_flutter_mobile_shell.dart';

import '../runtime_scope.dart';

/// Console tab host.
///
/// This is the single composition point that wires the four console capability
/// screens into the shell tab bar (`APP_FLUTTER_UI_SPEC.md` section 5): the
/// services are constructed from the injected console ports, the copy is
/// resolved from the active locale, and the tab bar lives only here — never in
/// a capability screen. The sign-in route is not a tab and renders no tab bar.
class ConsoleShell extends StatefulWidget {
  const ConsoleShell({super.key});

  @override
  State<ConsoleShell> createState() => _ConsoleShellState();
}

class _ConsoleShellState extends State<ConsoleShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final runtime = CloudRouterRuntimeScope.of(context);
    final locale = normalizeSdkworkCloudRouterLocale(
      Localizations.localeOf(context).toLanguageTag(),
    );

    final dashboardCopy = ConsoleDashboardMessages.resolve(locale);
    final usageCopy = ConsoleUsageMessages.resolve(locale);
    final apiKeysCopy = ConsoleApiKeysMessages.resolve(locale);
    final catalogCopy = ConsoleCatalogMessages.resolve(locale);

    final labels = <String, String>{
      'cloudrouter.console.dashboard.title': dashboardCopy.title,
      'cloudrouter.console.usage.title': usageCopy.title,
      'cloudrouter.console.apiKeys.title': apiKeysCopy.title,
      'cloudrouter.console.catalog.title': catalogCopy.title,
    };

    final dashboardService = ConsoleDashboardService(ports: runtime.consolePorts);
    final usageService = ConsoleUsageService(ports: runtime.consolePorts);
    final apiKeysService = ConsoleApiKeysService(ports: runtime.consolePorts);
    final catalogService = ConsoleCatalogService(ports: runtime.consolePorts);

    final sharedCopy = SdkworkCloudRouterMessages.sharedCopy(locale);

    return ConsoleShellScaffold(
      tabs: consoleTabs,
      currentIndex: _currentIndex,
      onSelectTab: (index) {
        if (index == _currentIndex) return;
        setState(() {
          _currentIndex = index;
        });
      },
      appTitle: sharedCopy.appTitle,
      labels: labels,
      children: <Widget>[
        ConsoleDashboardScreen(service: dashboardService, copy: dashboardCopy),
        ConsoleUsageScreen(service: usageService, copy: usageCopy),
        ConsoleApiKeysScreen(service: apiKeysService, copy: apiKeysCopy),
        ConsoleCatalogScreen(service: catalogService, copy: catalogCopy),
      ],
    );
  }
}
