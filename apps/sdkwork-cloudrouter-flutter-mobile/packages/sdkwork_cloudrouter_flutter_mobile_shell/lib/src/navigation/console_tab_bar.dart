import 'package:flutter/material.dart';

import 'console_tab_descriptors.dart';
import 'console_tab_glyph.dart';

/// Bottom tab bar for the Cloud Router console.
///
/// Uses the platform-native selected slot: each destination is a
/// `NavigationDestination` whose `icon` / `selectedIcon` pair is the outline /
/// filled variant of the same glyph (`APP_FLUTTER_UI_SPEC.md` section 5). The
/// bar renders only on tab root routes and is owned by the shell, never by a
/// capability screen.
class ConsoleTabBar extends StatelessWidget {
  const ConsoleTabBar({
    required this.tabs,
    required this.currentIndex,
    required this.onSelect,
    this.labels,
    super.key,
  });

  final List<SdkworkCloudRouterConsoleTab> tabs;
  final int currentIndex;
  final ValueChanged<int> onSelect;

  /// Optional title-key to label map resolved by the root from the capability
  /// copy records; falls back to the route key when absent.
  final Map<String, String>? labels;

  @override
  Widget build(BuildContext context) {
    return NavigationBar(
      selectedIndex: currentIndex,
      onDestinationSelected: onSelect,
      destinations: <Widget>[
        for (var index = 0; index < tabs.length; index += 1)
          NavigationDestination(
            icon: ConsoleTabGlyphIcon(tabs[index].glyph, filled: false),
            selectedIcon: ConsoleTabGlyphIcon(tabs[index].glyph, filled: true),
            label: labels?[tabs[index].titleKey] ?? tabs[index].routeKey,
          ),
      ],
    );
  }
}
