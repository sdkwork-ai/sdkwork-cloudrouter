import type { ReactNode } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { SdkworkIamH5AuthLoginSurface } from '@sdkwork/iam-h5-auth';
import { CLOUDROUTER_CONSOLE_ROUTES } from '@sdkwork/cloudrouter-contracts';

import { useConsoleRuntime } from './providers/AppProviders.js';

/**
 * Console sign-in route.
 *
 * The credential UI is the shared `@sdkwork/iam-h5-auth` surface: password,
 * verification-code, registration, recovery, third-party, scan-login, and
 * tenant/organization selection all come from the IAM package. The host only
 * provides the IAM controller and the post-login navigation target.
 */
export function ConsoleSignInRoute() {
  const runtime = useConsoleRuntime();
  const navigate = useNavigate();
  const location = useLocation();

  if (runtime.authenticated) {
    return <Navigate to={CLOUDROUTER_CONSOLE_ROUTES.dashboard.path} replace />;
  }

  const handleAuthenticated = () => {
    const requestedTarget = (location.state as { from?: unknown } | null)?.from;
    const target =
      typeof requestedTarget === 'string'
      && requestedTarget.startsWith('/')
      && requestedTarget !== '/sign-in'
        ? requestedTarget
        : CLOUDROUTER_CONSOLE_ROUTES.dashboard.path;
    navigate(target, { replace: true });
  };

  const requestedFrom = (location.state as { from?: unknown } | null)?.from;
  const from =
    typeof requestedFrom === 'string'
    && requestedFrom.startsWith('/')
    && requestedFrom !== '/sign-in'
      ? requestedFrom
      : undefined;
  // A direct/deep-link login has no previous app page; only show Back when the
  // auth surface was reached from another page (explicit `from` or a non-zero
  // router history index).
  const historyIndex = typeof window === 'undefined' ? 0 : window.history.state?.idx;
  const canGoBack = from !== undefined
    || (typeof historyIndex === 'number' && historyIndex > 0);
  const handleBack = () => {
    if (from !== undefined) {
      navigate(from, { replace: true });
      return;
    }
    navigate(-1);
  };

  return (
    <SdkworkIamH5AuthLoginSurface
      controller={runtime.iamAuthController}
      locale={runtime.locale}
      onAuthenticated={handleAuthenticated}
      {...(canGoBack ? { onBack: handleBack } : {})}
    />
  );
}

export interface AppAuthGateProps {
  readonly children: ReactNode;
}

/**
 * Session gate for stacked surfaces that render outside the console shell
 * (order center, order detail, and the unified cashier). It renders the shared
 * IAM login surface until a session exists; the runtime's session-commit bridge
 * flips `authenticated` and the gate then renders the deep-linked child.
 */
export function AppAuthGate({ children }: AppAuthGateProps) {
  const runtime = useConsoleRuntime();

  if (runtime.authenticated) {
    return <>{children}</>;
  }

  return (
    <SdkworkIamH5AuthLoginSurface
      controller={runtime.iamAuthController}
      locale={runtime.locale}
    />
  );
}
