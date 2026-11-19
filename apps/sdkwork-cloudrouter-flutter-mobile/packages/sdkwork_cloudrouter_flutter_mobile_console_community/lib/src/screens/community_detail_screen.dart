import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

import '../community_repository.dart';
import 'community_post_screen.dart';

/// Native circle workspace: feed, resources, members, groups, custom tabs, and
/// the about panel. Management and paid membership continue in the shared H5
/// workspace, which is one action away from the app bar.
class CommunityDetailScreen extends StatefulWidget {
  const CommunityDetailScreen({
    required this.repository,
    required this.circleId,
    required this.onOpenWeb,
    this.currentUserId,
    super.key,
  });

  final CommunityRepository repository;
  final String circleId;
  final String? currentUserId;
  final void Function(String path) onOpenWeb;

  @override
  State<CommunityDetailScreen> createState() => _CommunityDetailScreenState();
}

class _CommunityDetailScreenState extends State<CommunityDetailScreen> {
  CommunityCategory? _circle;
  List<CommunityEntry> _posts = const <CommunityEntry>[];
  List<CommunityEntry> _resources = const <CommunityEntry>[];
  List<CommunityEntry> _tabPosts = const <CommunityEntry>[];
  List<CommunityMemberResponse> _members = const <CommunityMemberResponse>[];
  List<CommunityGroupResponse> _groups = const <CommunityGroupResponse>[];
  List<CommunityMembershipTier> _tiers = const <CommunityMembershipTier>[];
  bool _loading = true;
  String? _error;
  String _tab = 'feed';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final circle = await widget.repository.getCircle(widget.circleId);
      final results = await Future.wait<dynamic>(<Future<dynamic>>[
        widget.repository.listPosts(widget.circleId),
        widget.repository.listResources(widget.circleId),
        widget.repository.listMembers(widget.circleId),
        widget.repository.listGroups(widget.circleId),
        widget.repository.listTiers(widget.circleId),
      ]);
      if (!mounted) return;
      setState(() {
        _circle = circle;
        _posts = results[0] as List<CommunityEntry>;
        _resources = results[1] as List<CommunityEntry>;
        _members = results[2] as List<CommunityMemberResponse>;
        _groups = results[3] as List<CommunityGroupResponse>;
        _tiers = results[4] as List<CommunityMembershipTier>;
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

  List<({String id, String label})> get _tabs {
    final configured = _circle?.tabs ?? const <String>['feeds', 'resources', 'groups'];
    final ids = <String>[];
    for (final id in configured) {
      if (id == 'resources' ||
          id == 'groups' ||
          id == 'news' ||
          id == 'docs' ||
          id == 'repos' ||
          id == 'software') {
        ids.add(id);
      }
    }
    ids.insert(0, 'feed');
    ids.add('members');
    ids.add('about');
    final labels = <String, String>{
      'feed': '动态',
      'resources': '资源',
      'groups': '群组',
      'news': '新闻',
      'docs': '文档',
      'repos': '开源',
      'software': '软件',
      'members': '成员',
      'about': '关于',
    };
    return ids.map((id) => (id: id, label: labels[id] ?? id)).toList(growable: false);
  }

  Future<void> _selectTab(String tab) async {
    setState(() => _tab = tab);
    if (tab == 'news' || tab == 'docs' || tab == 'repos' || tab == 'software') {
      try {
        final posts = await widget.repository.listTabPosts(widget.circleId, tab);
        if (mounted) setState(() => _tabPosts = posts);
      } catch (_) {
        if (mounted) setState(() => _tabPosts = const <CommunityEntry>[]);
      }
    }
  }

  Future<void> _join() async {
    final circle = _circle;
    if (circle == null) return;
    if (circle.isPaid) {
      await showModalBottomSheet<void>(
        context: context,
        showDragHandle: true,
        builder: (sheetContext) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: <Widget>[
                Text('选择会员等级', style: Theme.of(sheetContext).textTheme.titleMedium),
                const SizedBox(height: 8),
                ..._tiers.map(
                  (tier) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: Text(tier.name),
                    subtitle: Text('${tier.durationDays} 天'),
                    trailing: Text('¥${tier.price}'),
                  ),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: () {
                    Navigator.of(sheetContext).pop();
                    widget.onOpenWeb('/community/${circle.id}');
                  },
                  child: const Text('继续支付'),
                ),
              ],
            ),
          ),
        ),
      );
      return;
    }
    try {
      await widget.repository.joinCircle(circle.id);
      await _load();
    } catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('加入失败：$error')));
    }
  }

  Future<void> _openPostComposer() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute<bool>(
        builder: (_) => CommunityPostScreen(
          repository: widget.repository,
          circleId: widget.circleId,
        ),
      ),
    );
    if (created == true) {
      await _load();
    }
  }

  Future<void> _toggleLike(CommunityEntry entry) async {
    try {
      await widget.repository.setReaction(entry.id, active: true);
    } catch (_) {
      // Reactions are best-effort; the list keeps the last server snapshot.
    }
  }

  Future<void> _openComments(CommunityEntry entry) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => _CommentsSheet(
        repository: widget.repository,
        entryId: entry.id,
      ),
    );
    await _load();
  }

  Future<void> _deletePost(CommunityEntry entry) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('删除动态'),
        content: const Text('确定删除这条动态吗？'),
        actions: <Widget>[
          TextButton(onPressed: () => Navigator.of(dialogContext).pop(false), child: const Text('取消')),
          FilledButton(onPressed: () => Navigator.of(dialogContext).pop(true), child: const Text('删除')),
        ],
      ),
    );
    if (confirmed != true) return;
    await widget.repository.deletePost(entry.id);
    await _load();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final circle = _circle;
    return Scaffold(
      appBar: AppBar(
        title: Text(circle?.title ?? '圈子'),
        actions: <Widget>[
          if (circle != null && circle.isJoined)
            IconButton(
              tooltip: '管理圈子',
              onPressed: () => widget.onOpenWeb('/community/${circle.id}/profile'),
              icon: const Icon(Icons.settings_outlined),
            ),
          IconButton(
            tooltip: '完整社区工作区',
            onPressed: () => widget.onOpenWeb('/community/${widget.circleId}'),
            icon: const Icon(Icons.open_in_new),
          ),
        ],
      ),
      floatingActionButton: circle != null && circle.isJoined
          ? FloatingActionButton(
              onPressed: _openPostComposer,
              child: const Icon(Icons.edit_outlined),
            )
          : null,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: <Widget>[
                        Text(_error!, textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                        FilledButton(onPressed: _load, child: const Text('重试')),
                      ],
                    ),
                  ),
                )
              : circle == null
                  ? const Center(child: Text('圈子不存在'))
                  : RefreshIndicator(
                      onRefresh: _load,
                      child: ListView(
                        padding: const EdgeInsets.only(bottom: 96),
                        children: <Widget>[
                          _Header(circle: circle, onJoin: _join),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: Row(
                              children: _tabs
                                  .map(
                                    (tab) => Padding(
                                      padding: const EdgeInsets.only(right: 8),
                                      child: ChoiceChip(
                                        label: Text(tab.label),
                                        selected: _tab == tab.id,
                                        onSelected: (_) => _selectTab(tab.id),
                                      ),
                                    ),
                                  )
                                  .toList(growable: false),
                            ),
                          ),
                          ..._buildTab(theme),
                        ],
                      ),
                    ),
    );
  }

  List<Widget> _buildTab(ThemeData theme) {
    if (_tab == 'feed') {
      return _postList(_posts);
    }
    if (_tab == 'resources') {
      if (_resources.isEmpty) return <Widget>[const _Empty(label: '暂无资源')];
      return _resources
          .map(
            (entry) => Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: ListTile(
                leading: const Icon(Icons.description_outlined),
                title: Text(entry.title),
                subtitle: Text((entry.tags ?? const <String>[]).join(' · ')),
                trailing: const Icon(Icons.open_in_new),
                onTap: () => widget.onOpenWeb('/community/${widget.circleId}?tab=resources'),
              ),
            ),
          )
          .toList(growable: false);
    }
    if (_tab == 'groups') {
      if (_groups.isEmpty) return <Widget>[const _Empty(label: '暂无群组')];
      return _groups
          .map(
            (group) => Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: ListTile(
                leading: const Icon(Icons.groups_outlined),
                title: Text(group.name),
                subtitle: Text('${group.platform} · ${group.memberCount} 人'),
              ),
            ),
          )
          .toList(growable: false);
    }
    if (_tab == 'members') {
      if (_members.isEmpty) return <Widget>[const _Empty(label: '暂无成员')];
      return _members
          .map(
            (member) => ListTile(
              leading: const Icon(Icons.person_outline),
              title: Text(member.userName),
              subtitle: Text(
                '${member.role} · ${member.status}${member.tierName == null ? '' : ' · ${member.tierName}'}',
              ),
            ),
          )
          .toList(growable: false);
    }
    if (_tab == 'about') {
      return <Widget>[
        Padding(
          padding: const EdgeInsets.all(16),
          child: Text(
            _circle?.description ?? '—',
            style: theme.textTheme.bodyMedium,
          ),
        ),
      ];
    }
    return _postList(_tabPosts);
  }

  List<Widget> _postList(List<CommunityEntry> entries) {
    if (entries.isEmpty) return <Widget>[const _Empty(label: '暂无动态')];
    return entries
        .map(
          (entry) => _PostCard(
            entry: entry,
            currentUserId: widget.currentUserId,
            onLike: () => _toggleLike(entry),
            onComment: () => _openComments(entry),
            onDelete: () => _deletePost(entry),
          ),
        )
        .toList(growable: false);
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.circle, required this.onJoin});

  final CommunityCategory circle;
  final VoidCallback onJoin;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        if (circle.coverImage != null && circle.coverImage!.isNotEmpty)
          Image.network(
            circle.coverImage!,
            height: 160,
            fit: BoxFit.cover,
            errorBuilder: (_, __, ___) => const SizedBox(height: 160),
          )
        else
          Container(height: 160, color: theme.colorScheme.primaryContainer),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(
            children: <Widget>[
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: <Widget>[
                    Text(circle.title, style: theme.textTheme.titleLarge),
                    const SizedBox(height: 4),
                    Text(
                      '${circle.memberCount} 成员 · ${circle.postCount} 动态',
                      style: theme.textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              if (!circle.isJoined)
                FilledButton(
                  onPressed: onJoin,
                  child: Text(circle.isPaid ? '¥${circle.price ?? 0} 加入' : '加入圈子'),
                )
              else
                const Chip(label: Text('已加入')),
            ],
          ),
        ),
        if (circle.description != null && circle.description!.isNotEmpty)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: Text(circle.description!, style: theme.textTheme.bodyMedium),
          ),
      ],
    );
  }
}

class _PostCard extends StatelessWidget {
  const _PostCard({
    required this.entry,
    required this.onLike,
    required this.onComment,
    required this.onDelete,
    this.currentUserId,
  });

  final CommunityEntry entry;
  final String? currentUserId;
  final VoidCallback onLike;
  final VoidCallback onComment;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isPending = entry.reviewState != 'approved';
    final canDelete = currentUserId != null && entry.author.id == currentUserId;
    final media = entry.media ?? const <String>[];
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: <Widget>[
            Row(
              children: <Widget>[
                Expanded(child: Text(entry.author.name, style: theme.textTheme.titleSmall)),
                if (isPending)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade100,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: const Text('审核中', style: TextStyle(fontSize: 11)),
                  ),
                if (canDelete)
                  IconButton(
                    tooltip: '删除动态',
                    onPressed: onDelete,
                    icon: const Icon(Icons.delete_outline, size: 18),
                  ),
              ],
            ),
            const SizedBox(height: 6),
            Text(entry.body ?? entry.excerpt ?? entry.title, style: theme.textTheme.bodyMedium),
            if (media.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: media
                      .take(3)
                      .map(
                        (uri) => Image.network(
                          uri,
                          width: 96,
                          height: 96,
                          fit: BoxFit.cover,
                          errorBuilder: (_, __, ___) => const SizedBox(width: 96, height: 96),
                        ),
                      )
                      .toList(growable: false),
                ),
              ),
            const SizedBox(height: 8),
            Row(
              children: <Widget>[
                TextButton.icon(
                  onPressed: onLike,
                  icon: const Icon(Icons.favorite_border, size: 18),
                  label: Text('${entry.stats.reactionCount ?? 0}'),
                ),
                TextButton.icon(
                  onPressed: onComment,
                  icon: const Icon(Icons.mode_comment_outlined, size: 18),
                  label: Text('${entry.stats.commentCount ?? 0}'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CommentsSheet extends StatefulWidget {
  const _CommentsSheet({required this.repository, required this.entryId});

  final CommunityRepository repository;
  final String entryId;

  @override
  State<_CommentsSheet> createState() => _CommentsSheetState();
}

class _CommentsSheetState extends State<_CommentsSheet> {
  final TextEditingController _controller = TextEditingController();
  List<CommunityComment> _comments = const <CommunityComment>[];
  bool _loading = true;
  bool _sending = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final comments = await widget.repository.listComments(widget.entryId);
      if (mounted) {
        setState(() {
          _comments = comments;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _send() async {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() => _sending = true);
    try {
      await widget.repository.addComment(widget.entryId, text);
      _controller.clear();
      await _load();
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: SizedBox(
        height: 420,
        child: Column(
          children: <Widget>[
            const Padding(
              padding: EdgeInsets.all(12),
              child: Text('评论', style: TextStyle(fontWeight: FontWeight.w600)),
            ),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : _comments.isEmpty
                      ? const Center(child: Text('暂无评论'))
                      : ListView.builder(
                          itemCount: _comments.length,
                          itemBuilder: (context, index) {
                            final comment = _comments[index];
                            return ListTile(
                              dense: true,
                              title: Text(comment.author.name),
                              subtitle: Text(comment.body),
                            );
                          },
                        ),
            ),
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
                child: Row(
                  children: <Widget>[
                    Expanded(
                      child: TextField(
                        controller: _controller,
                        decoration: const InputDecoration(hintText: '写评论…', isDense: true),
                      ),
                    ),
                    const SizedBox(width: 8),
                    FilledButton(onPressed: _sending ? null : _send, child: const Text('发送')),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _Empty extends StatelessWidget {
  const _Empty({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Center(child: Text(label)),
    );
  }
}

