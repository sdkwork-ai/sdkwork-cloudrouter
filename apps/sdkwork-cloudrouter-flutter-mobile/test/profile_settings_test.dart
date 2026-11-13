import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_profile/sdkwork_cloudrouter_flutter_mobile_console_profile.dart';
import 'package:sdkwork_settings_flutter/sdkwork_settings_flutter.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  testWidgets('profile opens the shared settings center with voice settings',
      (tester) async {    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(body: ConsoleProfileScreen()),
      ),
    );

    await tester.tap(find.text('设置'));
    await tester.pumpAndSettle();

    expect(find.byType(SdkworkSettingsScreen), findsOneWidget);
    expect(find.text('语音'), findsWidgets);

    await tester.tap(find.text('语音').hitTestable().first);
    await tester.pumpAndSettle();

    expect(find.text('语音播报'), findsOneWidget);
    expect(find.text('语速'), findsOneWidget);
  });

  testWidgets('profile exposes host-owned sign out', (tester) async {
    var signedOut = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: ConsoleProfileScreen(
            onSignOut: () async {
              signedOut = true;
            },
          ),
        ),
      ),
    );

    await tester.scrollUntilVisible(find.text('退出登录'), 200);
    await tester.tap(find.text('退出登录'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('退出'));
    await tester.pumpAndSettle();

    expect(signedOut, isTrue);
  });
}
