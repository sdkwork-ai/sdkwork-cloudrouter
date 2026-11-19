import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_community/sdkwork_cloudrouter_flutter_mobile_console_community.dart';

void main() {
  CommunityRepository repository() => CommunityRepository.forSession(
        appApiBaseUrl: 'http://127.0.0.1:3905/app/v3/api',
      );

  testWidgets('create screen renders the native circle form', (tester) async {
    await tester.pumpWidget(
      MaterialApp(home: CommunityCreateScreen(repository: repository())),
    );

    expect(find.text('创建圈子'), findsOneWidget);
    expect(find.text('圈子名称'), findsOneWidget);
    expect(find.text('付费圈子'), findsOneWidget);
    expect(find.text('创建'), findsOneWidget);
  });

  testWidgets('post composer renders title, body, and tags', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: CommunityPostScreen(
          repository: repository(),
          circleId: '1001',
        ),
      ),
    );

    expect(find.text('发布动态'), findsOneWidget);
    expect(find.text('标题（可选）'), findsOneWidget);
    expect(find.text('内容'), findsOneWidget);
    expect(find.text('标签（逗号或空格分隔）'), findsOneWidget);
  });
}
