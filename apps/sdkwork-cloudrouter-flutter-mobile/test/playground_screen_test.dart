import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:sdkwork_agents_app_sdk/sdkwork_agents_app_sdk.dart';
import 'package:sdkwork_agents_flutter_mobile_conversation/sdkwork_agents_flutter_mobile_conversation.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_console_playground/sdkwork_cloudrouter_flutter_mobile_console_playground.dart';

void main() {
  testWidgets('playground mounts the shared Agents conversation surface',
      (tester) async {
    final service = _FakeConversationService();
    await tester.pumpWidget(
      MaterialApp(
        home: ConsolePlaygroundScreen(
          client: SdkworkAppClient.withBaseUrl(
            baseUrl: 'http://127.0.0.1:3905',
          ),
          service: service,
        ),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.byType(AgentsConversationChatScreen), findsOneWidget);
    expect(service.loadedSessions, isTrue);
  });
}

class _FakeConversationService implements AgentsConversationService {
  bool loadedSessions = false;

  @override
  Future<String> resolveDefaultModel({String? preferred}) async => 'gpt-5';

  @override
  Future<List<AgentsConversationSession>> listSessions() async {
    loadedSessions = true;
    return const <AgentsConversationSession>[];
  }

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
