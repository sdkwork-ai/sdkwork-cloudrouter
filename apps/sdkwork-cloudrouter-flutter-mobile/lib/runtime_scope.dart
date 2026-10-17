import 'package:flutter/material.dart';

import 'bootstrap/runtime.dart';

/// Inherited runtime scope for the CloudRouter Flutter root.
///
/// Lives in its own library so the auth gate and the console shell can read the
/// bootstrapped runtime without importing the app root (which imports them).
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
