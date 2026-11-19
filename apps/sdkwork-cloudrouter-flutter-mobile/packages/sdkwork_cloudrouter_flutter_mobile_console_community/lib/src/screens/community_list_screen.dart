import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

import '../community_repository.dart';
import '../widgets/community_network_image.dart';
import 'community_create_screen.dart';
import 'community_detail_screen.dart';

/// Native circle discovery workspace.
///
/// The complete management and paid-membership surfaces stay in the shared H5
/// workspace, reachable from the app bar, so native browsing never hides a
/// capability the domain already implements.
class CommunityListScreen extends StatefulWidget {
  const CommunityListScreen({
    required this.repository,
    required this.onOpenWeb,
    this.currentUserId,
    super.key,
  });

  final CommunityRepository repository;
  final void Function(String path) onOpenWeb;
  final String? currentUserId;

  @override
  State<CommunityListScreen> createState() => _CommunityListScreenState();
}

class _CommunityListScreenState extends State<CommunityListScreen> {
  final TextEditingController _search = TextEditingController();
  List<CommunityCategory> _circles = const <CommunityCategory>[];
  bool _loading = true;
  bool _mineOnly = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final circles = await widget.repository.listCircles();
      if (!mounted) return;
      setState(() {
        _circles = circles;
        _loading = false;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _error = error.toString();
        _loading = false;
      });
    }
  }

  List<CommunityCategory> get _visible {
    final query = _search.text.trim().toLowerCase();
    return _circles.where((circle) {
      if (_mineOnly && !circle.isJoined) return false;
      if (query.isEmpty) return true;
      return circle.title.toLowerCase().contains(query) ||
          (circle.description ?? '').toLowerCase().contains(query);
    }).toList(growable: false);
  }

  Future<void> _openCreate() async {
    final created = await Navigator.of(context).push<CommunityCategory>(
      MaterialPageRoute<CommunityCategory>(
        builder: (_) => CommunityCreateScreen(repository: widget.repository),
      ),
    );
    if (created != null) {
      await _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('圈子社群'),
        actions: <Widget>[
          IconButton(
            tooltip: '完整社区工作区',
            onPressed: () => widget.onOpenWeb('/community'),
            icon: const Icon(Icons.open_in_new),
          ),
          IconButton(
            tooltip: '刷新',
            onPressed: _load,
            icon: const Icon(Icons.refresh),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openCreate,
        icon: const Icon(Icons.add),
        label: const Text('创建圈子'),
      ),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: TextField(
              controller: _search,
              onChanged: (_) => setState(() {}),
              decoration: InputDecoration(
                prefixIcon: const Icon(Icons.search),
                hintText: '搜索圈子',
                isDense: true,
                border:
                    OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: SegmentedButton<bool>(
              segments: const <ButtonSegment<bool>>[
                ButtonSegment<bool>(value: false, label: Text('发现')),
                ButtonSegment<bool>(value: true, label: Text('我加入的')),
              ],
              selected: <bool>{_mineOnly},
              onSelectionChanged: (selection) =>
                  setState(() => _mineOnly = selection.first),
            ),
          ),
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator())
                : _error != null
                    ? _ErrorState(message: _error!, onRetry: _load)
                    : _visible.isEmpty
                        ? const Center(child: Text('暂无可展示的圈子'))
                        : RefreshIndicator(
                            onRefresh: _load,
                            child: ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 0, 16, 96),
                              itemCount: _visible.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 10),
                              itemBuilder: (context, index) {
                                final circle = _visible[index];
                                return Card(
                                  clipBehavior: Clip.antiAlias,
                                  child: ListTile(
                                    contentPadding: const EdgeInsets.symmetric(
                                        horizontal: 14, vertical: 10),
                                    leading: _CircleAvatar(
                                      circle: circle,
                                      repository: widget.repository,
                                    ),
                                    title: Row(
                                      children: <Widget>[
                                        Expanded(
                                            child: Text(circle.title,
                                                maxLines: 1,
                                                overflow:
                                                    TextOverflow.ellipsis)),
                                        if (circle.isJoined)
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 8, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: theme
                                                  .colorScheme.primaryContainer,
                                              borderRadius:
                                                  BorderRadius.circular(20),
                                            ),
                                            child: Text('已加入',
                                                style:
                                                    theme.textTheme.labelSmall),
                                          ),
                                      ],
                                    ),
                                    subtitle: Text(
                                      '${circle.memberCount} 成员 · ${circle.postCount} 动态${circle.isPaid ? ' · 付费' : ''}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    onTap: () {
                                      Navigator.of(context).push<void>(
                                        MaterialPageRoute<void>(
                                          builder: (_) => CommunityDetailScreen(
                                            repository: widget.repository,
                                            circleId: circle.id,
                                            currentUserId: widget.currentUserId,
                                            onOpenWeb: widget.onOpenWeb,
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

class _CircleAvatar extends StatelessWidget {
  const _CircleAvatar({required this.circle, required this.repository});

  final CommunityCategory circle;
  final CommunityRepository repository;

  @override
  Widget build(BuildContext context) {
    final url = circle.avatar;
    return SizedBox(
      width: 48,
      height: 48,
      child: ClipOval(
        child: url == null || url.isEmpty
            ? Container(
                color: Theme.of(context).colorScheme.primaryContainer,
                alignment: Alignment.center,
                child: Text(
                    circle.title.isEmpty ? '圈' : circle.title.substring(0, 1)),
              )
            : CommunityNetworkImage(repository: repository, uri: url),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: <Widget>[
            const Icon(Icons.error_outline, size: 36),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            FilledButton(onPressed: onRetry, child: const Text('重试')),
          ],
        ),
      ),
    );
  }
}
