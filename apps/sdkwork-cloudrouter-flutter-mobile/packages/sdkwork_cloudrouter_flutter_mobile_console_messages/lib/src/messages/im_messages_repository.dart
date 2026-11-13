import 'package:flutter/foundation.dart';
import 'package:im_sdk_generated/im_sdk_generated.dart';

import 'console_messages_repository.dart';

/// IM app SDK implementation of [ConsoleMessagesRepository].
///
/// Every call goes through the generated `SdkworkImClient`; no raw HTTP or
/// hand-built authorization header lives in the screen layer.
class ImMessagesRepository implements ConsoleMessagesRepository {
  ImMessagesRepository({
    required this.client,
    this.currentUserId,
  });

  /// Creates a client for the gateway origin (the generated paths add
  /// `/im/v3/api` themselves).
  factory ImMessagesRepository.forSession({
    required String gatewayBaseUrl,
    String? accessToken,
    String? authToken,
    String? currentUserId,
  }) {
    return ImMessagesRepository(
      client: SdkworkImClient.withBaseUrl(
        baseUrl: gatewayBaseUrl,
        accessToken: accessToken,
        authToken: authToken,
      ),
      currentUserId: currentUserId,
    );
  }

  final SdkworkImClient client;
  final String? currentUserId;

  @override
  Future<List<ConsoleConversation>> loadConversations() async {
    final response = await client.chat.inboxList(50);
    final items = _items(response?.data);
    return items
        .map(_conversationFromJson)
        .whereType<ConsoleConversation>()
        .toList(growable: false);
  }

  @override
  Future<List<ConsoleMessage>> loadMessages(String conversationId) async {
    final response =
        await client.chat.conversationsMessagesList(conversationId, null, 50);
    final items = _items(response?.data);
    final messages = items
        .map(_messageFromJson)
        .whereType<ConsoleMessage>()
        .toList(growable: false);
    await _markReadBestEffort(conversationId, messages);
    return messages;
  }

  @override
  Future<void> sendText(String conversationId, String text) async {
    await client.chat.conversationsMessagesCreate(
      conversationId,
      PostMessageRequest(
        text: text,
        clientMsgId: 'cloudrouter-${DateTime.now().microsecondsSinceEpoch}',
      ),
    );
  }

  List<Map<String, dynamic>> _items(dynamic data) {
    if (data is! Map) return const <Map<String, dynamic>>[];
    final items = data['items'];
    if (items is! List) return const <Map<String, dynamic>>[];
    return items
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }

  ConsoleConversation? _conversationFromJson(Map<String, dynamic> json) {
    final id = json['conversationId']?.toString();
    if (id == null || id.isEmpty) return null;
    final peer = json['peer'];
    final peerMap = peer is Map ? peer : const <String, dynamic>{};
    final preferences = json['preferences'];
    final preferenceMap =
        preferences is Map ? preferences : const <String, dynamic>{};
    if (preferenceMap['isHidden'] == true) return null;
    final title = (json['displayName'] ??
            peerMap['displayName'] ??
            peerMap['name'] ??
            '会话')
        .toString();
    return ConsoleConversation(
      id: id,
      title: title,
      summary: (json['lastSummary'] ?? '').toString(),
      unreadCount: _int(json['unreadCount']),
      lastActivityAt: json['lastActivityAt']?.toString(),
    );
  }

  ConsoleMessage? _messageFromJson(Map<String, dynamic> json) {
    final id = json['messageId']?.toString();
    if (id == null || id.isEmpty) return null;
    final body = json['body'];
    final bodyMap = body is Map ? body : const <String, dynamic>{};
    final sender = json['sender'];
    final senderMap = sender is Map ? sender : const <String, dynamic>{};
    final text = (bodyMap['text'] ?? json['summary'] ?? '').toString();
    if (text.isEmpty) return null;
    final senderId = senderMap['id']?.toString();
    final senderName =
        (senderMap['displayName'] ?? senderId ?? '对方').toString();
    return ConsoleMessage(
      id: id,
      text: text,
      sender: senderName,
      mine: currentUserId != null && senderId == currentUserId,
      occurredAt: json['occurredAt']?.toString(),
      seq: json['messageSeq']?.toString(),
    );
  }

  /// Read-cursor advancement is advisory: failing it must never hide the
  /// transcript the user already loaded, so the failure is logged and left to
  /// the next open/refresh.
  Future<void> _markReadBestEffort(
    String conversationId,
    List<ConsoleMessage> messages,
  ) async {
    int? lastSeq;
    for (final message in messages) {
      final value = int.tryParse(message.seq ?? '');
      if (value != null && (lastSeq == null || value > lastSeq)) {
        lastSeq = value;
      }
    }
    if (lastSeq == null) return;
    try {
      await client.chat.conversationsReadCursorUpdate(
        conversationId,
        UpdateReadCursorRequest(readSeq: '$lastSeq'),
      );
    } catch (error) {
      debugPrint('[cloudrouter-messages] read cursor update failed: $error');
    }
  }

  int _int(dynamic value) {
    if (value is int) return value;
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }
}
