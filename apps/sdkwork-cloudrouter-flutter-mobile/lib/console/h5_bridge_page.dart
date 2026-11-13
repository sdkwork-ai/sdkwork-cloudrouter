import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

/// In-app H5 bridge for commerce surfaces owned by the H5 root.
///
/// Membership, recharge, and orders are shared H5 pages; embedding the H5 route
/// keeps the mobile roots on one commerce implementation instead of creating a
/// second Flutter copy. The H5 page owns its IAM session.
class ConsoleH5BridgePage extends StatefulWidget {
  const ConsoleH5BridgePage({
    required this.url,
    required this.title,
    super.key,
  });

  final String url;
  final String title;

  @override
  State<ConsoleH5BridgePage> createState() => _ConsoleH5BridgePageState();
}

class _ConsoleH5BridgePageState extends State<ConsoleH5BridgePage> {
  late final WebViewController _controller;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..loadRequest(Uri.parse(widget.url));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.title)),
      body: WebViewWidget(controller: _controller),
    );
  }
}
