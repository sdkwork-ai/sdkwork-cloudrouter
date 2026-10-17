import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

import '../copy/console_api_keys_messages.dart';
import '../models/console_api_keys_models.dart';
import '../services/console_api_keys_service.dart';
import '../state/console_api_keys_state.dart';

/// API key listing, creation, and revocation.
///
/// The screen reads through the injected service/state only; it never talks to a
/// transport client directly. The shell owns the app bar and the bottom tab bar
/// (`APP_FLUTTER_UI_SPEC.md` section 5), so this widget is a bare scroll body:
/// full-bleed create form, one-time secret banner, and full-bleed key rows.
class ConsoleApiKeysScreen extends StatefulWidget {
  const ConsoleApiKeysScreen({
    required this.service,
    required this.copy,
    super.key,
  });

  final ConsoleApiKeysService service;
  final ConsoleApiKeysCopy copy;

  @override
  State<ConsoleApiKeysScreen> createState() => _ConsoleApiKeysScreenState();
}

class _ConsoleApiKeysScreenState extends State<ConsoleApiKeysScreen> {
  ConsoleApiKeysState _state = initialConsoleApiKeysState();
  final TextEditingController _nameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _state = _state.copyWith(loading: true, errorMessage: '', notice: '');
    });
    try {
      final page = await widget.service.load();
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(items: page.items, loading: false);
      });
    } catch (cause) {
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(loading: false, errorMessage: cause.toString());
      });
    }
  }

  Future<void> _create() async {
    if (_state.creating) return;
    final name = _nameController.text.trim();
    if (name.isEmpty) return;
    setState(() {
      _state = _state.copyWith(creating: true, errorMessage: '', notice: '', createdSecret: '');
    });
    try {
      final created = await widget.service.createKey(name);
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(
          creating: false,
          createdSecret: created.secret ?? created.key.maskedKey,
        );
      });
      _nameController.clear();
      await _load();
    } catch (cause) {
      if (!mounted) return;
      final message = cause.toString();
      final isGap = cause is UnsupportedError;
      setState(() {
        _state = _state.copyWith(
          creating: false,
          errorMessage: isGap ? '' : widget.copy.createFailed,
          notice: isGap ? widget.copy.createGap : message,
        );
      });
    }
  }

  Future<void> _revoke(ConsoleApiKeySummary key) async {
    if (_state.revokingId.isNotEmpty) return;
    setState(() {
      _state = _state.copyWith(revokingId: key.id, errorMessage: '', notice: '');
    });
    try {
      await widget.service.revokeKey(key.id);
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(revokingId: '');
      });
      await _load();
    } catch (cause) {
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(revokingId: '', notice: cause.toString());
      });
    }
  }

  String _statusLabel(ConsoleApiKeyStatus status) {
    switch (status) {
      case ConsoleApiKeyStatus.active:
        return widget.copy.statusActive;
      case ConsoleApiKeyStatus.disabled:
        return widget.copy.statusDisabled;
      case ConsoleApiKeyStatus.revoked:
        return widget.copy.statusRevoked;
      case ConsoleApiKeyStatus.unknown:
        return widget.copy.statusUnknown;
    }
  }

  @override
  Widget build(BuildContext context) {
    final locale = Localizations.localeOf(context).toLanguageTag();
    final status = resolveSdkworkCloudRouterScreenStatus(
      _state.items.length,
      _state.loading,
      _state.errorMessage,
    );
    if (status != SdkworkCloudRouterScreenStatus.ready) {
      return SdkworkCloudRouterStatusView(
        status: status,
        loadingLabel: widget.copy.loading,
        emptyLabel: widget.copy.empty,
        errorMessage: _state.errorMessage,
        retryLabel: widget.copy.reload,
        onRetry: _load,
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        itemCount: _state.items.length + 2 + (_state.notice.isNotEmpty ? 1 : 0),
        itemBuilder: (context, index) {
          if (index == 0) {
            return _CreateForm(
              controller: _nameController,
              copy: widget.copy,
              creating: _state.creating,
              onCreate: _create,
            );
          }
          if (_state.notice.isNotEmpty && index == 1) {
            return _NoticeBar(message: _state.notice);
          }
          if (_state.createdSecret.isNotEmpty && index == (_state.notice.isNotEmpty ? 2 : 1)) {
            return _CreatedSecretBanner(copy: widget.copy, secret: _state.createdSecret);
          }
          final rowIndex =
              index - 2 - (_state.notice.isNotEmpty ? 1 : 0) - (_state.createdSecret.isNotEmpty ? 1 : 0);
          if (rowIndex < _state.items.length) {
            final key = _state.items[rowIndex];
            final revoking = _state.revokingId == key.id;
            return SdkworkCloudRouterRow(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          key.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(SdkworkCloudRouterFlutterTokens.colorText),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          key.maskedKey.isEmpty ? '-' : key.maskedKey,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(SdkworkCloudRouterFlutterTokens.colorTextMuted),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${_statusLabel(key.status)} · ${formatIsoTimestamp(key.createdAt, locale) ?? '-'}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(SdkworkCloudRouterFlutterTokens.colorTextMuted),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  if (key.status != ConsoleApiKeyStatus.revoked)
                    OutlinedButton(
                      onPressed: revoking ? null : () => _revoke(key),
                      child: Text(revoking ? widget.copy.revoking : widget.copy.revoke),
                    ),
                ],
              ),
            );
          }
          return const SizedBox.shrink();
        },
      ),
    );
  }
}

/// Full-bleed create form; inset controls keep their own rounded corners.
class _CreateForm extends StatelessWidget {
  const _CreateForm({
    required this.controller,
    required this.copy,
    required this.creating,
    required this.onCreate,
  });

  final TextEditingController controller;
  final ConsoleApiKeysCopy copy;
  final bool creating;
  final VoidCallback onCreate;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(SdkworkCloudRouterFlutterTokens.colorSurface),
      padding: const EdgeInsets.all(SdkworkCloudRouterFlutterTokens.contentInset),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            copy.summary,
            style: const TextStyle(
              fontSize: 11,
              color: Color(SdkworkCloudRouterFlutterTokens.colorTextMuted),
            ),
          ),
          const SizedBox(height: 10),
          TextField(
            controller: controller,
            enabled: !creating,
            style: const TextStyle(fontSize: 13),
            decoration: InputDecoration(
              hintText: copy.namePlaceholder,
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: creating ? null : onCreate,
              child: Text(creating ? copy.creating : copy.create),
            ),
          ),
        ],
      ),
    );
  }
}

/// One-time plaintext secret banner; square full-bleed warning surface.
class _CreatedSecretBanner extends StatelessWidget {
  const _CreatedSecretBanner({required this.copy, required this.secret});

  final ConsoleApiKeysCopy copy;
  final String secret;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF422006),
      padding: const EdgeInsets.symmetric(
        horizontal: SdkworkCloudRouterFlutterTokens.contentInset,
        vertical: 10,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            copy.createdOnce,
            style: const TextStyle(fontSize: 11, color: Color(0xFFFBBF24)),
          ),
          const SizedBox(height: 4),
          SelectableText(
            secret,
            style: const TextStyle(fontSize: 12, color: Color(0xFFFDE68A)),
          ),
        ],
      ),
    );
  }
}

/// Inline notice for declared transport gaps; keeps failures explainable.
class _NoticeBar extends StatelessWidget {
  const _NoticeBar({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(0xFF082F49),
      padding: const EdgeInsets.symmetric(
        horizontal: SdkworkCloudRouterFlutterTokens.contentInset,
        vertical: 10,
      ),
      child: Text(
        message,
        style: const TextStyle(fontSize: 11, color: Color(0xFF7DD3FC)),
      ),
    );
  }
}
