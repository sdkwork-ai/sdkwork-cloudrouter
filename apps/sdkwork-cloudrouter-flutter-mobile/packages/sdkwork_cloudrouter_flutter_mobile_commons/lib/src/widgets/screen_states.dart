import 'package:flutter/material.dart';

import '../theme/design_tokens.dart';

/// Domain-neutral screen/list state primitives.
///
/// Capability packages map their own data onto these payload-free primitives.
enum SdkworkCloudRouterScreenStatus { loading, ready, empty, error }

SdkworkCloudRouterScreenStatus resolveSdkworkCloudRouterScreenStatus(
  int itemCount,
  bool loading,
  String? errorMessage,
) {
  if (loading) {
    return SdkworkCloudRouterScreenStatus.loading;
  }
  if (errorMessage != null && errorMessage.isNotEmpty) {
    return SdkworkCloudRouterScreenStatus.error;
  }
  return itemCount == 0
      ? SdkworkCloudRouterScreenStatus.empty
      : SdkworkCloudRouterScreenStatus.ready;
}

/// Payload-free status view used by capability screens.
///
/// `APP_FLUTTER_UI_SPEC.md` section 5 requires every screen to cover loading,
/// empty, and error states; the retry affordance keeps failure recoverable.
class SdkworkCloudRouterStatusView extends StatelessWidget {
  const SdkworkCloudRouterStatusView({
    required this.status,
    required this.loadingLabel,
    required this.emptyLabel,
    required this.errorMessage,
    required this.retryLabel,
    this.onRetry,
    super.key,
  });

  final SdkworkCloudRouterScreenStatus status;
  final String loadingLabel;
  final String emptyLabel;
  final String errorMessage;
  final String retryLabel;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case SdkworkCloudRouterScreenStatus.loading:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(
                  width: 28,
                  height: 28,
                  child: CircularProgressIndicator(strokeWidth: 2.4),
                ),
                const SizedBox(height: 12),
                Text(loadingLabel, style: const TextStyle(fontSize: 13)),
              ],
            ),
          ),
        );
      case SdkworkCloudRouterScreenStatus.error:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  errorMessage.isNotEmpty ? errorMessage : emptyLabel,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13),
                ),
                if (onRetry != null) ...[
                  const SizedBox(height: 12),
                  OutlinedButton(onPressed: onRetry, child: Text(retryLabel)),
                ],
              ],
            ),
          ),
        );
      case SdkworkCloudRouterScreenStatus.empty:
        return Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(emptyLabel, textAlign: TextAlign.center, style: const TextStyle(fontSize: 13)),
          ),
        );
      case SdkworkCloudRouterScreenStatus.ready:
        return const SizedBox.shrink();
    }
  }
}

/// Full-bleed section surface.
///
/// The section spans the window width with zero horizontal margin and square
/// corners; the documented content inset is applied as the section's own
/// horizontal padding (`APP_FLUTTER_UI_SPEC.md` section 5).
class SdkworkCloudRouterSection extends StatelessWidget {
  const SdkworkCloudRouterSection({
    required this.child,
    this.title,
    this.trailing,
    this.padding = const EdgeInsets.symmetric(
      horizontal: SdkworkCloudRouterFlutterTokens.contentInset,
      vertical: 12,
    ),
    super.key,
  });

  final Widget child;
  final String? title;
  final Widget? trailing;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      color: const Color(SdkworkCloudRouterFlutterTokens.colorSurface),
      padding: padding,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (title != null || trailing != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                children: [
                  if (title != null)
                    Expanded(
                      child: Text(
                        title!,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Color(SdkworkCloudRouterFlutterTokens.colorText),
                        ),
                      ),
                    ),
                  if (trailing != null) trailing!,
                ],
              ),
            ),
          child,
        ],
      ),
    );
  }
}

/// Full-bleed list row with a bottom divider; square corners by design.
class SdkworkCloudRouterRow extends StatelessWidget {
  const SdkworkCloudRouterRow({
    required this.child,
    this.onTap,
    this.padding = const EdgeInsets.symmetric(
      horizontal: SdkworkCloudRouterFlutterTokens.contentInset,
      vertical: 12,
    ),
    super.key,
  });

  final Widget child;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry padding;

  @override
  Widget build(BuildContext context) {
    final content = Container(
      width: double.infinity,
      color: const Color(SdkworkCloudRouterFlutterTokens.colorSurface),
      padding: padding,
      child: child,
    );
    if (onTap == null) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          content,
          const Divider(height: 1),
        ],
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        InkWell(onTap: onTap, child: content),
        const Divider(height: 1),
      ],
    );
  }
}
