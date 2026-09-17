import 'package:flutter/material.dart';

import 'auth_gate.dart';
import 'bootstrap/runtime.dart';

class CloudRouterApp extends StatelessWidget {
  const CloudRouterApp({required this.runtime, super.key});

  final CloudRouterFlutterRuntime runtime;

  @override
  Widget build(BuildContext context) {
    return CloudRouterRuntimeScope(
      runtime: runtime,
      child: MaterialApp(
        title: 'SDKWork CloudRouter',
        theme: ThemeData(colorSchemeSeed: const Color(0xFF0F172A)),
        home: const CloudRouterAuthGate(),
      ),
    );
  }
}

class CloudRouterRuntimeScope extends InheritedWidget {
  const CloudRouterRuntimeScope({
    required this.runtime,
    required super.child,
    super.key,
  });

  final CloudRouterFlutterRuntime runtime;

  static CloudRouterFlutterRuntime of(BuildContext context) {
    final scope =
        context.dependOnInheritedWidgetOfExactType<CloudRouterRuntimeScope>();
    if (scope == null) {
      throw StateError('CloudRouterRuntimeScope is not available.');
    }
    return scope.runtime;
  }

  @override
  bool updateShouldNotify(CloudRouterRuntimeScope oldWidget) {
    return !identical(runtime, oldWidget.runtime);
  }
}
