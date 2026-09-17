import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

import '../models/console_dashboard_models.dart';
import '../services/console_dashboard_service.dart';
import '../state/console_dashboard_state.dart';

/// Console overview and gateway health.
///
/// The screen reads through the injected service/state only; it never talks to a
/// transport client directly.
class ConsoleDashboardScreen extends StatefulWidget {
  const ConsoleDashboardScreen({required this.service, super.key});

  final ConsoleDashboardService service;

  @override
  State<ConsoleDashboardScreen> createState() => _ConsoleDashboardScreenState();
}

class _ConsoleDashboardScreenState extends State<ConsoleDashboardScreen> {
  ConsoleDashboardState _state = initialConsoleDashboardState();

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
        appBar: AppBar(title: const Text('dashboard')),
        body: SdkworkCloudRouterStatusView(message: status.name),
      );
    }
    return Scaffold(
      appBar: AppBar(title: const Text('dashboard')),
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
