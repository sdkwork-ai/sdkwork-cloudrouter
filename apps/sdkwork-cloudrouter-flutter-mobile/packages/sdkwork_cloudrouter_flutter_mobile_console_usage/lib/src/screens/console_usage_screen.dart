import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

import '../models/console_usage_models.dart';
import '../services/console_usage_service.dart';
import '../state/console_usage_state.dart';

/// Console request and token usage records.
///
/// The screen reads through the injected service/state only; it never talks to a
/// transport client directly.
class ConsoleUsageScreen extends StatefulWidget {
  const ConsoleUsageScreen({required this.service, super.key});

  final ConsoleUsageService service;

  @override
  State<ConsoleUsageScreen> createState() => _ConsoleUsageScreenState();
}

class _ConsoleUsageScreenState extends State<ConsoleUsageScreen> {
  ConsoleUsageState _state = initialConsoleUsageState();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _state = _state.copyWith(loading: true, errorMessage: '');
    });
    try {
      final page = await widget.service.load();
      if (!mounted) {
        return;
      }
      setState(() {
        _state = _state.copyWith(items: page.items, loading: false);
      });
    } catch (cause) {
      if (!mounted) {
        return;
      }
      setState(() {
        _state = _state.copyWith(loading: false, errorMessage: cause.toString());
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = resolveSdkworkCloudRouterScreenStatus(
      _state.items.length,
      _state.loading,
      _state.errorMessage,
    );
    if (status != SdkworkCloudRouterScreenStatus.ready) {
      return Scaffold(
        appBar: AppBar(title: const Text('usage')),
        body: SdkworkCloudRouterStatusView(message: status.name),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('usage')),
      body: ListView.builder(
        itemCount: _state.items.length,
        itemBuilder: (context, index) {
          final item = _state.items[index];
          return ListTile(
            title: Text(item.label.isEmpty ? item.id : item.label),
            subtitle: Text(item.value),
          );
        },
      ),
    );
  }
}
