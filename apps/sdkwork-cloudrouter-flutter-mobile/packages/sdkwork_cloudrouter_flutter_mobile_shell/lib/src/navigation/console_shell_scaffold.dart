import 'package:flutter/material.dart';

import 'console_tab_bar.dart';
import 'console_tab_descriptors.dart';

/// Scaffold that hosts the four console tabs.
///
/// The tab bar appears only here, on the tab root routes, and is decided once in
/// the composition layer (`APP_FLUTTER_UI_SPEC.md` section 5): the app bar
/// carries the app title plus the active tab title, the body keeps every tab
/// alive through an [IndexedStack], and [ConsoleTabBar] owns the bottom bar.
/// Capability screens stay bare scroll bodies.
class ConsoleShellScaffold extends StatelessWidget {
  const ConsoleShellScaffold({
    required this.tabs,
    required this.currentIndex,
    required this.onSelectTab,
    required this.children,
    this.appTitle,
    this.labels,
    super.key,
  });

  final List<SdkworkCloudRouterConsoleTab> tabs;
  final int currentIndex;
  final ValueChanged<int> onSelectTab;

  /// One bare screen body per tab, in [tabs] order.
  final List<Widget> children;

  /// App-level title shown next to the active tab title.
  final String? appTitle;

  /// Optional title-key to label map for the tab bar and app bar.
  final Map<String, String>? labels;

  @override
  Widget build(BuildContext context) {
    final tab = tabs[currentIndex];
    final tabTitle = labels?[tab.titleKey] ?? tab.routeKey;
    return Scaffold(
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            if (appTitle != null)
              Text(
                appTitle!,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13),
              ),
            Text(
              tabTitle,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
          ],
        ),
      ),
      body: IndexedStack(index: currentIndex, children: children),
      bottomNavigationBar: ConsoleTabBar(
        tabs: tabs,
        currentIndex: currentIndex,
        onSelect: onSelectTab,
        labels: labels,
      ),
    );
  }
}
