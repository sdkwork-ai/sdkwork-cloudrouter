/// Auth gate evaluation for the Flutter mobile shell.
///
/// Route guards are shell/runtime responsibilities. Capability packages declare
/// auth mode and permission hints only.
class SdkworkCloudRouterAuthGateDecision {
  const SdkworkCloudRouterAuthGateDecision({required this.allowed, this.reason});

  final bool allowed;
  final String? reason;
}

SdkworkCloudRouterAuthGateDecision evaluateSdkworkCloudRouterAuthGate({
  required bool authRequired,
  required bool isAuthenticated,
}) {
  if (!authRequired || isAuthenticated) {
    return const SdkworkCloudRouterAuthGateDecision(allowed: true);
  }
  return const SdkworkCloudRouterAuthGateDecision(
    allowed: false,
    reason: 'authentication-required',
  );
}
