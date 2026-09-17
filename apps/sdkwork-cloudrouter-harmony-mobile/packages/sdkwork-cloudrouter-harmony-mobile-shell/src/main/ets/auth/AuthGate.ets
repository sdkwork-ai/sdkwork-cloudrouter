/**
 * AuthGate integration.
 *
 * Route guards are shell/runtime responsibilities. Capability packages
 * declare auth mode and permission hints only.
 */
export interface CloudRouterHarmonyAuthGateDecision {
  readonly allowed: boolean;
  readonly reason?: string;
}

export function evaluateCloudRouterHarmonyAuthGate(
  auth: 'public' | 'required',
  isAuthenticated: boolean,
): CloudRouterHarmonyAuthGateDecision {
  if (auth === 'public' || isAuthenticated) {
    return { allowed: true };
  }
  return { allowed: false, reason: 'authentication-required' };
}
