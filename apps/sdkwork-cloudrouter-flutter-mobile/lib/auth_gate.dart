import 'package:flutter/material.dart';

import 'bootstrap/runtime.dart';

/// Root auth gate. The shell owns the guard decision; this widget only projects
/// it. Capability packages declare auth requirements and never redirect.
class CloudRouterAuthGate extends StatelessWidget {
  const CloudRouterAuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final runtime = CloudRouterRuntimeScope.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('SDKWork CloudRouter')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            runtime.session.authenticated
                ? 'SDKWork CloudRouter Flutter console'
                : 'SDKWork CloudRouter Flutter sign-in required',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
