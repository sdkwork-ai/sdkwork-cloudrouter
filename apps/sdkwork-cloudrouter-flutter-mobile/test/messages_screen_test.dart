import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_messages/sdkwork_cloudrouter_flutter_mobile_console_messages.dart';

void main() {
  testWidgets('messages loads inbox, opens a conversation, and sends text',
      (tester) async {
    final repository = _FakeMessagesRepository();
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: ConsoleMessagesScreen(repository: repository)),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text('设计助手'), findsOneWidget);
    expect(find.text('你好'), findsOneWidget);

    await tester.tap(find.text('设计助手'));
    await tester.pumpAndSettle();

    expect(find.text('你好'), findsOneWidget);

    await tester.enterText(find.byType(TextField), '收到');
    await tester.tap(find.byIcon(Icons.send));
    await tester.pumpAndSettle();

    expect(repository.sent, contains('收到'));
  });
}

class _FakeMessagesRepository implements ConsoleMessagesRepository {
  final List<String> sent = <String>[];

  @override
  Future<List<ConsoleConversation>> loadConversations() async =>
      const <ConsoleConversation>[
        ConsoleConversation(
          id: 'c1',
          title: '设计助手',
          summary: '你好',
          unreadCount: 2,
        ),
      ];

  @override
  Future<List<ConsoleMessage>> loadMessages(String conversationId) async =>
      const <ConsoleMessage>[
        ConsoleMessage(
          id: 'm1',
          text: '你好',
          sender: '设计助手',
          mine: false,
        ),
      ];

  @override
  Future<void> sendText(String conversationId, String text) async {
    sent.add(text);
  }
}
