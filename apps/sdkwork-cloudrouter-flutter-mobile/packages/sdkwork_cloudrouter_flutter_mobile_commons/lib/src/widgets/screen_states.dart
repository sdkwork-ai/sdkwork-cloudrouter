import 'package:flutter/material.dart';

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

/// Payload-free status widget used by capability screens.
class SdkworkCloudRouterStatusView extends StatelessWidget {
  const SdkworkCloudRouterStatusView({super.key, required this.message});

  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Text(message, textAlign: TextAlign.center),
      ),
    );
  }
}
