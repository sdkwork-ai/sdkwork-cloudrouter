import 'package:flutter/material.dart';
import 'package:sdkwork_agents_app_sdk/sdkwork_agents_app_sdk.dart';
import 'package:sdkwork_agents_flutter_mobile_conversation/sdkwork_agents_flutter_mobile_conversation.dart';

/// Agents-backed 体验中心 tab.
///
/// The screen uses the shared Agents Flutter conversation capability (controller
/// + chat surface) and only supplies the CloudRouter composition: the signed-in
/// Agents SDK client and the built-in assistant provisioning port.
class ConsolePlaygroundScreen extends StatefulWidget {
  const ConsolePlaygroundScreen({
    required this.client,
    this.service,
    super.key,
  });

  final SdkworkAppClient client;

  /// Test seam; production creates the shared conversation service from
  /// [client].
  final AgentsConversationService? service;

  @override
  State<ConsolePlaygroundScreen> createState() => _ConsolePlaygroundScreenState();
}

class _ConsolePlaygroundScreenState extends State<ConsolePlaygroundScreen> {
  late final AgentsConversationController _controller;

  @override
  void initState() {
    super.initState();
    final service = widget.service ??
        createAgentsConversationService(
          widget.client,
          const _BuiltInAgentPort(),
        );
    _controller = AgentsConversationController(
      service: service,
      localeTag: 'zh-CN',
    );
    _controller.loadSessions();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, _) {
        return AgentsConversationChatScreen(
          state: _controller.state,
          onSend: _controller.sendTurn,
          onNewSession: _controller.startNewSession,
          onOpenHistory: () => _openHistory(context),
          translate: _controller.translate,
        );
      },
    );
  }

  Future<void> _openHistory(BuildContext context) async {
    final sessions = _controller.state.sessions;
    await showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (sheetContext) => SafeArea(
        child: sessions.isEmpty
            ? const Padding(
                padding: EdgeInsets.all(32),
                child: Center(child: Text('暂无历史会话')),
              )
            : ListView.builder(
                shrinkWrap: true,
                itemCount: sessions.length,
                itemBuilder: (context, index) {
                  final session = sessions[index];
                  return ListTile(
                    title: Text(
                      session.title.isEmpty ? '未命名会话' : session.title,
                    ),
                    onTap: () {
                      Navigator.of(sheetContext).pop();
                      _controller.openSession(session);
                    },
                  );
                },
              ),
      ),
    );
  }
}

/// Built-in conversational assistant; the backend owns the agent record.
class _BuiltInAgentPort implements AgentsConversationAgentPort {
  const _BuiltInAgentPort();

  @override
  Future<String> ensureAgent({String? model}) async =>
      agentsDefaultConversationAgentId;

  @override
  Future<void> updateAgentModel(String agentId, String model) async {}
}
