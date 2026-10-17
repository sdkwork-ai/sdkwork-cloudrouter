import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

import '../copy/console_usage_messages.dart';
import '../models/console_usage_models.dart';
import '../services/console_usage_service.dart';
import '../state/console_usage_state.dart';

/// Console usage and billing records.
///
/// The screen reads through the injected service/state only; it never talks to a
/// transport client directly. The shell owns the app bar and the bottom tab bar
/// (`APP_FLUTTER_UI_SPEC.md` section 5), so this widget is a bare scroll body:
/// full-bleed rows with square corners and loading / empty / error states.
class ConsoleUsageScreen extends StatefulWidget {
  const ConsoleUsageScreen({
    required this.service,
    required this.copy,
    super.key,
  });

  final ConsoleUsageService service;
  final ConsoleUsageCopy copy;

  @override
  State<ConsoleUsageScreen> createState() => _ConsoleUsageScreenState();
}

class _ConsoleUsageScreenState extends State<ConsoleUsageScreen> {
  ConsoleUsageState _state = initialConsoleUsageState();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _state = _state.copyWith(loading: true, errorMessage: '', notice: '');
    });
    try {
      final page = await widget.service.load();
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(
          items: page.items,
          page: page.page,
          hasMore: page.hasMore,
          loading: false,
        );
      });
    } catch (cause) {
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(loading: false, errorMessage: cause.toString());
      });
    }
  }

  Future<void> _loadMore() async {
    if (_state.loadingMore) return;
    setState(() {
      _state = _state.copyWith(loadingMore: true, notice: '');
    });
    try {
      final page = await widget.service.loadPage(_state.page + 1);
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(
          items: <ConsoleUsageRecord>[..._state.items, ...page.items],
          page: page.page,
          hasMore: page.hasMore,
          loadingMore: false,
        );
      });
    } catch (cause) {
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(loadingMore: false, notice: cause.toString());
      });
    }
  }

  String _statusLabel(ConsoleUsageStatus status) {
    switch (status) {
      case ConsoleUsageStatus.succeeded:
        return widget.copy.statusSucceeded;
      case ConsoleUsageStatus.failed:
        return widget.copy.statusFailed;
      case ConsoleUsageStatus.processing:
        return widget.copy.statusProcessing;
      case ConsoleUsageStatus.unknown:
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
        itemCount: _state.items.length + (_state.hasMore ? 1 : 0) + (_state.notice.isNotEmpty ? 1 : 0),
        itemBuilder: (context, index) {
          if (_state.notice.isNotEmpty && index == 0) {
            return _NoticeBar(message: _state.notice);
          }
          final rowIndex = _state.notice.isNotEmpty ? index - 1 : index;
          if (rowIndex < _state.items.length) {
            final record = _state.items[rowIndex];
            return SdkworkCloudRouterRow(
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          record.model,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Color(SdkworkCloudRouterFlutterTokens.colorText),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${formatIsoTimestamp(record.occurredAt, locale) ?? '-'} · ${_statusLabel(record.status)}',
                          style: const TextStyle(
                            fontSize: 11,
                            color: Color(SdkworkCloudRouterFlutterTokens.colorTextMuted),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${formatTokenCount(record.totalTokens, locale)} ${widget.copy.columnTokens}',
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(SdkworkCloudRouterFlutterTokens.colorText),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        formatMinorUnitsAsCurrency(record.costMinorUnits, 'CNY', locale),
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(SdkworkCloudRouterFlutterTokens.colorAccent),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            );
          }
          return Padding(
            padding: const EdgeInsets.all(14.4),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton(
                onPressed: _state.loadingMore ? null : _loadMore,
                child: Text(_state.loadingMore ? widget.copy.loading : widget.copy.loadMore),
              ),
            ),
          );
        },
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
      padding: const EdgeInsets.symmetric(horizontal: 14.4, vertical: 10),
      child: Text(
        message,
        style: const TextStyle(fontSize: 11, color: Color(0xFF7DD3FC)),
      ),
    );
  }
}
