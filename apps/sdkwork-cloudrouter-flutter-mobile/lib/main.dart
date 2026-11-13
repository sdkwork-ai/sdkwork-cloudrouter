import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

import 'app.dart';
import 'bootstrap/runtime.dart';
import 'bootstrap/sdkwork_tls_trust.dart';

Future<void> main() async {
  // The HTTPS trust layer must be installed before any HTTP client is
  // created, so it runs ahead of binding initialization and services.
  SdkworkTlsTrust.installForApp();

  WidgetsFlutterBinding.ensureInitialized();
  final preferences = await SharedPreferences.getInstance();
  cloudRouterThemeMode.value = cloudRouterThemeModeFromPreference(
    preferences.getString(cloudRouterThemeStorageKey),
  );
  final runtime = await bootstrap();
  runApp(CloudRouterApp(runtime: runtime));
}
