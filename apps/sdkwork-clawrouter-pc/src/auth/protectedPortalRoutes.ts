import { Fragment, createElement, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import {
  buildPortalAuthLoginRedirect,
  hasPortalIamSession,
  isPortalAuthRoute,
  isProtectedPortalPath,
  PROTECTED_PORTAL_ROUTE_PREFIXES,
  resolvePortalAuthenticatedAuthRouteRedirect,
  verifyCurrentPortalAdminAccess,
  type PortalAdminAccessState,
} from '@sdkwork/clawroutes-pc-commons/runtime';

export { PROTECTED_PORTAL_ROUTE_PREFIXES, isProtectedPortalPath };

export interface ProtectedPortalLocationLike {
  hash?: string;
  pathname: string;
  search?: string;
}

export type ProtectedPortalAccessDecision =
  | { allowed: true }
  | { allowed: false; reason: 'login-required'; redirectTo: string };

export function buildProtectedPortalLoginRedirect(location: ProtectedPortalLocationLike): string {
  return buildPortalAuthLoginRedirect(location);
}

export function resolveProtectedPortalAccess({
  hasSession,
  location,
}: {
  hasSession: boolean;
  location: ProtectedPortalLocationLike;
}): ProtectedPortalAccessDecision {
  if (!isProtectedPortalPath(location.pathname) || hasSession) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'login-required',
    redirectTo: buildProtectedPortalLoginRedirect(location),
  };
}

export function PortalAuthenticatedAuthRouteGuard({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (hasPortalIamSession() && isPortalAuthRoute(location.pathname)) {
    return createElement(Navigate, {
      replace: true,
      to: resolvePortalAuthenticatedAuthRouteRedirect({ location }),
    });
  }

  return createElement(Fragment, null, children);
}

export function RequirePortalSession({ children }: { children: ReactNode }) {
  const location = useLocation();
  const decision = resolveProtectedPortalAccess({
    hasSession: hasPortalIamSession(),
    location,
  });

  if ('redirectTo' in decision) {
    return createElement(Navigate, { replace: true, to: decision.redirectTo });
  }

  return createElement(Fragment, null, children);
}

export function RequireAdminSession({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { t } = useTranslation();
  const [adminAccessState, setAdminAccessState] = useState<PortalAdminAccessState>('checking');
  const loginDecision = resolveProtectedPortalAccess({
    hasSession: hasPortalIamSession(),
    location,
  });

  useEffect(() => {
    let active = true;
    setAdminAccessState('checking');
    verifyCurrentPortalAdminAccess()
      .then((state) => {
        if (active) {
          setAdminAccessState(state);
        }
      })
      .catch(() => {
        if (active) {
          setAdminAccessState('error');
        }
      });
    return () => {
      active = false;
    };
  }, [location.pathname]);

  if ('redirectTo' in loginDecision) {
    return createElement(Navigate, { replace: true, to: loginDecision.redirectTo });
  }

  if (adminAccessState === 'checking') {
    return createElement(
      'div',
      {
        className:
          'min-h-screen bg-slate-50 px-6 py-24 text-sm font-medium text-slate-600 dark:bg-[#0a0a0a] dark:text-slate-300',
      },
      t('shared.auth.adminAccess.checking'),
    );
  }

  if (adminAccessState === 'anonymous') {
    return createElement(Navigate, {
      replace: true,
      to: buildProtectedPortalLoginRedirect(location),
    });
  }

  if (adminAccessState === 'forbidden') {
    return createElement(
      'div',
      {
        className:
          'min-h-screen bg-slate-50 px-6 py-24 text-center dark:bg-[#0a0a0a]',
        role: 'alert',
      },
      createElement(
        'h1',
        {
          className: 'text-lg font-semibold text-slate-900 dark:text-white',
        },
        t('shared.auth.adminAccess.forbiddenTitle'),
      ),
      createElement(
        'p',
        {
          className: 'mt-3 text-sm text-slate-600 dark:text-slate-300',
        },
        t('shared.auth.adminAccess.forbiddenDescription'),
      ),
    );
  }

  if (adminAccessState === 'error') {
    return createElement(
      'div',
      {
        className:
          'min-h-screen bg-slate-50 px-6 py-24 text-sm font-medium text-red-600 dark:bg-[#0a0a0a] dark:text-red-400',
        role: 'alert',
      },
      t('shared.auth.adminAccess.verifyError'),
    );
  }

  return createElement(Fragment, null, children);
}
