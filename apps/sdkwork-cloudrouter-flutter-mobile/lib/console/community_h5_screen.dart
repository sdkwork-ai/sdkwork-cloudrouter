import 'package:flutter/material.dart';

import 'h5_bridge_page.dart';

/// Community (圈子社群) entry for the Flutter mobile shell.
///
/// The community workspace (circles, posts, comments, members, groups, paid
/// tiers, and the circle cashier) is owned by the H5 renderer, the same shared
/// implementation the mini program opens. The Flutter root embeds that route so
/// the capability stays complete without a second, diverging native copy.
class CommunityH5Screen extends StatelessWidget {
  const CommunityH5Screen({required this.url, super.key});

  final String url;

  @override
  Widget build(BuildContext context) {
    return ConsoleH5BridgePage(url: url, title: '圈子社群');
  }
}
