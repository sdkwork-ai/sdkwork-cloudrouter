import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sdkwork_agents_app_sdk/sdkwork_agents_app_sdk.dart';
import 'package:sdkwork_agents_flutter_mobile_conversation/sdkwork_agents_flutter_mobile_conversation.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_messages/sdkwork_cloudrouter_flutter_mobile_console_messages.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_playground/sdkwork_cloudrouter_flutter_mobile_console_playground.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_profile/sdkwork_cloudrouter_flutter_mobile_console_profile.dart';

void main() {
  setUp(() {
    SharedPreferences.setMockInitialValues(<String, Object>{});
  });

  testWidgets('profile visual baseline', (tester) async {
    await _pumpAtPhoneSize(
      tester,
      const Scaffold(body: ConsoleProfileScreen()),
    );
    await expectLater(
      find.byType(ConsoleProfileScreen),
      matchesGoldenFile('goldens/profile-light.png'),
    );
  });

  testWidgets('settings visual baseline', (tester) async {
    await _pumpAtPhoneSize(
      tester,
      const Scaffold(body: ConsoleProfileScreen()),
    );
    await tester.tap(find.text('设置'));
    await tester.pumpAndSettle();
    await expectLater(
      find.byType(Scaffold).last,
      matchesGoldenFile('goldens/settings-light.png'),
    );
  });

  testWidgets('messages visual baseline', (tester) async {
    await _pumpAtPhoneSize(
      tester,
      Scaffold(body: ConsoleMessagesScreen(repository: _InboxRepository())),
    );
    await expectLater(
      find.byType(ConsoleMessagesScreen),
      matchesGoldenFile('goldens/messages-light.png'),
    );
  });

  testWidgets('playground visual baseline', (tester) async {
    await _pumpAtPhoneSize(
      tester,
      ConsolePlaygroundScreen(
        client: SdkworkAppClient.withBaseUrl(baseUrl: 'http://127.0.0.1:3905'),
        service: _PlaygroundService(),
      ),
    );
    await expectLater(
      find.byType(AgentsConversationChatScreen),
      matchesGoldenFile('goldens/playground-light.png'),
    );
  });
}

Future<void> _pumpAtPhoneSize(WidgetTester tester, Widget home) async {
  await tester.binding.setSurfaceSize(const Size(390, 844));
  addTearDown(() => tester.binding.setSurfaceSize(null));
  await tester.pumpWidget(
    MaterialApp(
      theme: buildSdkworkCloudRouterTheme(),
      home: home,
    ),
  );
  await tester.pumpAndSettle();
}

class _InboxRepository implements ConsoleMessagesRepository {
  @override
  Future<List<ConsoleConversation>> loadConversations() async =>
      const <ConsoleConversation>[
        ConsoleConversation(id: '1', title: '设计助手', summary: '方案已更新', unreadCount: 2),
        ConsoleConversation(id: '2', title: '运维告警', summary: 'CPU 使用率 82%', unreadCount: 0),
        ConsoleConversation(id: '3', title: '产品讨论', summary: '明天同步', unreadCount: 1),
      ];

  @override
  Future<List<ConsoleMessage>> loadMessages(String conversationId) async =>
      const <ConsoleMessage>[];

  @override
  Future<void> sendText(String conversationId, String text) async {}
}

class _PlaygroundService implements AgentsConversationService {
  @override
  Future<String> resolveDefaultModel({String? preferred}) async => 'gpt-5';

  @override
  Future<List<AgentsConversationSession>> listSessions() async =>
      const <AgentsConversationSession>[];

  @override
  Future<AgentsConversationSession> createSession(String title) async {
    throw UnimplementedError();
  }

  @override
  Future<void> renameSession(String sessionId, String title) async {}

  @override
  Future<void> deleteSession(String sessionId) async {}

  @override
  Future<AgentsConversationMessagePage> listMessages(
    String sessionId, {
    String? cursor,
  }) async {
    return const AgentsConversationMessagePage(items: [], hasMore: false);
  }

  @override
  Future<AgentsConversationTurnResult> streamTurn(
    AgentsConversationTurnInput input,
    AgentsConversationStreamHandlers handlers,
  ) async {
    throw UnimplementedError();
  }
}
