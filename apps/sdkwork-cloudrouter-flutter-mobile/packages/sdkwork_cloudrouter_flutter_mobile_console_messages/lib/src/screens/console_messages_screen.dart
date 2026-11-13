import 'package:flutter/material.dart';

import '../messages/console_messages_repository.dart';
import 'console_chat_screen.dart';

/// IM inbox tab: loads the signed-in user's conversation inbox and opens a
/// conversation. The screen owns loading/error/empty states and never builds a
/// transport client.
class ConsoleMessagesScreen extends StatefulWidget {
  const ConsoleMessagesScreen({required this.repository, super.key});

  final ConsoleMessagesRepository repository;

  @override
  State<ConsoleMessagesScreen> createState() => _ConsoleMessagesScreenState();
}

class _ConsoleMessagesScreenState extends State<ConsoleMessagesScreen> {
  final List<ConsoleConversation> _conversations = <ConsoleConversation>[];
  bool _loading = true;
  String? _error;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  List<ConsoleConversation> get _filtered {
    final query = _query.trim().toLowerCase();
    if (query.isEmpty) return _conversations;
    return _conversations
        .where((conversation) =>
            conversation.title.toLowerCase().contains(query) ||
            conversation.summary.toLowerCase().contains(query))
        .toList(growable: false);
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final conversations = await widget.repository.loadConversations();
      if (!mounted) return;
      setState(() {
        _conversations
          ..clear()
          ..addAll(conversations);
        _loading = false;
      });
    } catch (cause) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = cause.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading && _conversations.isEmpty) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_error != null && _conversations.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: <Widget>[
              const Icon(Icons.cloud_off_outlined, size: 36),
              const SizedBox(height: 12),
              const Text('消息加载失败'),
              const SizedBox(height: 4),
              Text(
                _error!,
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
              const SizedBox(height: 12),
              FilledButton(
                onPressed: _load,
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      );
    }
    final conversations = _filtered;
    return Column(
      children: <Widget>[
        Padding(
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 8),
          child: Row(
            children: <Widget>[
              Expanded(
                child: TextField(
                  onChanged: (value) => setState(() => _query = value),
                  decoration: InputDecoration(
                    hintText: '搜索会话',
                    prefixIcon: const Icon(Icons.search),
                    isDense: true,
                    filled: true,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              IconButton(
                tooltip: '刷新',
                onPressed: _load,
                icon: const Icon(Icons.refresh),
              ),
            ],
          ),
        ),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _load,
            child: conversations.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: <Widget>[
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 96),
                        child: Center(
                          child: Text(
                            _query.trim().isEmpty ? '暂无消息' : '未找到会话',
                          ),
                        ),
                      ),
                    ],
                  )
                : ListView.separated(
                    physics: const AlwaysScrollableScrollPhysics(),
                    itemCount: conversations.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (context, index) {
                      final conversation = conversations[index];
                      return ListTile(
                        leading: CircleAvatar(
                          child: Text(_initial(conversation.title)),
                        ),
                        title: Text(
                          conversation.title,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        subtitle: Text(
                          conversation.summary.isEmpty
                              ? '暂无消息内容'
                              : conversation.summary,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        trailing: conversation.unreadCount > 0
                            ? Badge(
                                label: Text('${conversation.unreadCount}'),
                                child: const Icon(Icons.chevron_right),
                              )
                            : const Icon(Icons.chevron_right),
                        onTap: () async {
                          await Navigator.of(context).push<void>(
                            MaterialPageRoute<void>(
                              builder: (_) => ConsoleChatScreen(
                                repository: widget.repository,
                                conversation: conversation,
                              ),
                            ),
                          );
                          if (mounted) {
                            await _load();
                          }
                        },
                      );
                    },
                  ),
          ),
        ),
      ],
    );
  }

  String _initial(String title) {
    final trimmed = title.trim();
    if (trimmed.isEmpty) return '消';
    return trimmed.substring(0, 1);
  }
}
