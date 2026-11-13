/// One conversation in the Cloud Router message inbox.
class ConsoleConversation {
  const ConsoleConversation({
    required this.id,
    required this.title,
    this.summary = '',
    this.unreadCount = 0,
    this.lastActivityAt,
  });

  final String id;
  final String title;
  final String summary;
  final int unreadCount;
  final String? lastActivityAt;
}

/// One message in a conversation.
class ConsoleMessage {
  const ConsoleMessage({
    required this.id,
    required this.text,
    required this.sender,
    required this.mine,
    this.occurredAt,
    this.seq,
  });

  final String id;
  final String text;
  final String sender;
  final bool mine;
  final String? occurredAt;
  final String? seq;
} 

/// IM data port used by the messages screens.
///
/// The screen never talks to a generated client directly, so the host can swap
/// the implementation in tests and keep the retry/error states deterministic.
abstract class ConsoleMessagesRepository {
  Future<List<ConsoleConversation>> loadConversations();

  Future<List<ConsoleMessage>> loadMessages(String conversationId);

  Future<void> sendText(String conversationId, String text);
}
