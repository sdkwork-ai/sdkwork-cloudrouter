import 'package:flutter/material.dart';
import 'package:sdkwork_cloudrouter_flutter_mobile_commons/sdkwork_cloudrouter_flutter_mobile_commons.dart';

import '../copy/console_dashboard_messages.dart';
import '../services/console_dashboard_service.dart';
import '../state/console_dashboard_state.dart';

/// Console overview and gateway health.
///
/// The screen reads through the injected service/state only; it never talks to a
/// transport client directly. The shell owns the app bar and the bottom tab bar
/// (`APP_FLUTTER_UI_SPEC.md` section 5), so this widget is a bare scroll body:
/// full-bleed sections with square corners, inset stat tiles, and loading /
/// empty / error states.
class ConsoleDashboardScreen extends StatefulWidget {
  const ConsoleDashboardScreen({
    required this.service,
    required this.copy,
    super.key,
  });

  final ConsoleDashboardService service;
  final ConsoleDashboardCopy copy;

  @override
  State<ConsoleDashboardScreen> createState() => _ConsoleDashboardScreenState();
}

class _ConsoleDashboardScreenState extends State<ConsoleDashboardScreen> {
  ConsoleDashboardState _state = initialConsoleDashboardState();

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _state = _state.copyWith(loading: true, errorMessage: '');
    });
    try {
      final snapshot = await widget.service.load();
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(snapshot: snapshot, loading: false);
      });
    } catch (cause) {
      if (!mounted) return;
      setState(() {
        _state = _state.copyWith(loading: false, errorMessage: cause.toString());
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = resolveSdkworkCloudRouterScreenStatus(
      _state.snapshot == null ? 0 : 1,
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
    final snapshot = _state.snapshot!;
    final locale = Localizations.localeOf(context).toLanguageTag();
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        children: [
          if (snapshot.windowLabel != null)
            SdkworkCloudRouterSection(
              padding: const EdgeInsets.symmetric(horizontal: 14.4, vertical: 10),
              child: Text(
                snapshot.windowLabel!,
                style: const TextStyle(
                  fontSize: 11,
                  color: Color(SdkworkCloudRouterFlutterTokens.colorAccent),
                ),
              ),
            ),
          SdkworkCloudRouterSection(
            child: Column(
              children: [
                Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: _StatTile(
                        label: widget.copy.requests,
                        value: formatTokenCount(snapshot.totalRequests, locale),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatTile(
                        label: widget.copy.tokens,
                        value: formatTokenCount(snapshot.totalTokens, locale),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Expanded(
                      child: _StatTile(
                        label: widget.copy.cost,
                        value: formatMinorUnitsAsCurrency(snapshot.costMinorUnits, snapshot.currency, locale),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _StatTile(
                        label: widget.copy.errorRate,
                        value: formatPercent(snapshot.errorRate, locale),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Inset stat tile; inset elements inside a full-bleed section may keep a
/// radius (`APP_FLUTTER_UI_SPEC.md` section 5).
class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(SdkworkCloudRouterFlutterTokens.colorSurfaceRaised),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Color(SdkworkCloudRouterFlutterTokens.colorTextMuted),
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w600,
              color: Color(SdkworkCloudRouterFlutterTokens.colorText),
            ),
          ),
        ],
      ),
    );
  }
}
