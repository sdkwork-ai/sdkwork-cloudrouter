import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_core/sdkwork_cloudrouter_flutter_mobile_core.dart';

import '../community_repository.dart';

/// Native circle creation. Full editing (cover/avatar media, tabs, groups,
/// tiers) continues in the shared H5 management workspace.
class CommunityCreateScreen extends StatefulWidget {
  const CommunityCreateScreen({required this.repository, super.key});

  final CommunityRepository repository;

  @override
  State<CommunityCreateScreen> createState() => _CommunityCreateScreenState();
}

class _CommunityCreateScreenState extends State<CommunityCreateScreen> {
  final TextEditingController _title = TextEditingController();
  final TextEditingController _description = TextEditingController();
  final TextEditingController _price = TextEditingController();
  final TextEditingController _tags = TextEditingController();
  bool _isPaid = false;
  bool _submitting = false;
  String? _error;

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _price.dispose();
    _tags.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _title.text.trim();
    if (title.isEmpty || _submitting) return;
    setState(() {
      _submitting = true;
      _error = null;
    });
    try {
      final created = await widget.repository.createCircle(
        title: title,
        description: _description.text.trim(),
        isPaid: _isPaid,
        price: _isPaid ? double.tryParse(_price.text.trim()) : null,
        tags: _tags.text
            .split(RegExp(r'[,，\s]+'))
            .map((tag) => tag.trim())
            .where((tag) => tag.isNotEmpty)
            .toList(growable: false),
        tabs: const <String>['feeds', 'resources', 'groups'],
      );
      if (!mounted) return;
      Navigator.of(context).pop<CommunityCategory>(created);
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
      appBar: AppBar(title: const Text('创建圈子')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: <Widget>[
          if (_error != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_error!, style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          TextField(
            controller: _title,
            decoration: const InputDecoration(labelText: '圈子名称', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _description,
            minLines: 3,
            maxLines: 6,
            decoration: const InputDecoration(labelText: '圈子简介', border: OutlineInputBorder()),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _tags,
            decoration: const InputDecoration(labelText: '标签（逗号或空格分隔）', border: OutlineInputBorder()),
          ),
          SwitchListTile(
            contentPadding: EdgeInsets.zero,
            title: const Text('付费圈子'),
            value: _isPaid,
            onChanged: (value) => setState(() => _isPaid = value),
          ),
          if (_isPaid)
            TextField(
              controller: _price,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(labelText: '价格（元）', border: OutlineInputBorder()),
            ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _submitting ? null : _submit,
            child: Text(_submitting ? '创建中…' : '创建'),
          ),
        ],
      ),
    );
  }
}

