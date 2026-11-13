import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_dashboard/sdkwork_cloudrouter_flutter_mobile_console_dashboard.dart';

void main() {
  testWidgets('home renders the cloud platform structure', (tester) async {
    final destinations = <String>[];
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: SingleChildScrollView(
            child: ConsoleHomeScreen(onNavigate: destinations.add),
          ),
        ),
      ),
    );

    expect(find.text('AI 云计算平台'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('会员中心'), findsWidgets);
    expect(find.text('快速充值'), findsOneWidget);
    expect(find.text('API 密钥'), findsOneWidget);
    expect(find.text('用量账单'), findsOneWidget);
    expect(find.text('全部服务'), findsOneWidget);
    expect(find.text('模型与定价'), findsOneWidget);
    expect(find.text('体验中心'), findsOneWidget);

    await tester.tap(find.text('API 密钥'));
    expect(destinations, contains('apiKeys'));

    await tester.tap(find.text('快速充值'));
    expect(destinations, contains('recharge'));

    await tester.ensureVisible(find.text('模型与定价'));
    await tester.tap(find.text('模型与定价'));
    expect(destinations, contains('catalog'));

    await tester.ensureVisible(find.text('体验中心'));
    await tester.tap(find.text('体验中心'));
    expect(destinations, contains('playground'));
  });
}
