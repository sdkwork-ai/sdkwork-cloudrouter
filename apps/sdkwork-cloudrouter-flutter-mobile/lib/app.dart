import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

import 'auth_gate.dart';
import 'bootstrap/runtime.dart';
import 'runtime_scope.dart';

class CloudRouterApp extends StatelessWidget {
  const CloudRouterApp({required this.runtime, super.key});

  final CloudRouterFlutterRuntime runtime;

  @override
  Widget build(BuildContext context) {
    return CloudRouterRuntimeScope(
      runtime: runtime,
      child: MaterialApp(
        title: 'SDKWork CloudRouter',
        theme: buildSdkworkCloudRouterTheme(),
        home: const CloudRouterAuthGate(),
      ),
    );
  }
}
