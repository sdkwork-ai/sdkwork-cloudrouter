import 'package:flutter/material.dart';

import '../community_repository.dart';

/// Native post composer. New entries are submitted for moderation by the
/// backend; the detail screen shows the author's pending entry with a badge.
class CommunityPostScreen extends StatefulWidget {
  const CommunityPostScreen({
    required this.repository,
    required this.circleId,
    super.key,
  });

  final CommunityRepository repository;
  final String circleId;

  @override
  State<CommunityPostScreen> createState() => _CommunityPostScreenState();
}

class _CommunityPostScreenState extends State<CommunityPostScreen> {
  final TextEditingController _title = TextEditingController();
  final TextEditingController _body = TextEditingController();
  final TextEditingController _tags = TextEditingController();
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _body.dispose();
    _tags.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final body = _body.text.trim();
    if (body.isEmpty || _submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final title = _title.text.trim().isEmpty
          ? (body.length > 40 ? body.substring(0, 40) : body)
          : _title.text.trim();
      final tags = _tags.text
          .split(RegExp(r'[,，\s]+'))
          .map((tag) => tag.trim())
          .where((tag) => tag.isNotEmpty)
          .toList(growable: false);
      final created = await widget.repository.createPost(
        widget.circleId,
        title: title,
        body: body,
        tags: tags,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            created?.reviewState == 'approved' ? '发布成功' : '已提交审核，审核通过后展示',
          ),
        ),
      );
      Navigator.of(context).pop(true);
    } catch (error) {
      if (!mounted) return;
      setState(() => _error = error.toString());
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('发布动态'),
        actions: <Widget>[
          TextButton(
            onPressed: _submitting ? null : _submit,
            child: const Text('发布'),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error!,
                  style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          TextField(
            controller: _title,
            decoration: const InputDecoration(
                labelText: '标题（可选）', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _body,
            minLines: 6,
            maxLines: 12,
            decoration: const InputDecoration(
              labelText: '内容',
              alignLabelWithHint: true,
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _tags,
            decoration: const InputDecoration(
                labelText: '标签（逗号或空格分隔）', border: OutlineInputBorder()),
          ),
        ],
      ),
    );
  }
}
