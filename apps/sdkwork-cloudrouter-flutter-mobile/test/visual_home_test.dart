import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_dashboard/sdkwork_cloudrouter_flutter_mobile_console_dashboard.dart';

void main() {
  testWidgets('home visual baseline', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      MaterialApp(
        theme: buildSdkworkCloudRouterTheme(),
        home: Scaffold(
          body: ConsoleHomeScreen(onNavigate: (_) {}),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await expectLater(
      find.byType(ConsoleHomeScreen),
      matchesGoldenFile('goldens/home-light.png'),
    );
  });

  testWidgets('home dark visual baseline', (tester) async {
    await tester.binding.setSurfaceSize(const Size(390, 844));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await tester.pumpWidget(
      MaterialApp(
        theme: buildSdkworkCloudRouterDarkTheme(),
        home: Scaffold(
          body: ConsoleHomeScreen(onNavigate: (_) {}),
        ),
      ),
    );
    await tester.pumpAndSettle();
    await expectLater(
      find.byType(ConsoleHomeScreen),
      matchesGoldenFile('goldens/home-dark.png'),
    );
  });
}
