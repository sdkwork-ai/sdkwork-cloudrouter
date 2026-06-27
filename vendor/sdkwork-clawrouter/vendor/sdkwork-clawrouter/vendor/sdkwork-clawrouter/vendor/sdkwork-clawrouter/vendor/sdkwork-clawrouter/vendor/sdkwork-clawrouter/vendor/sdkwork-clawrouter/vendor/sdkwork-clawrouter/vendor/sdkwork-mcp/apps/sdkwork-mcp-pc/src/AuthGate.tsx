import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SdkworkIamAuthRoutes } from '@sdkwork/auth-pc-react';

import {
  resolveSdkworkMCPPcAuthAppearance,
  resolveSdkworkMCPPcAuthLocale,
  resolveSdkworkMCPPcAuthRuntimeConfig,
} from './bootstrap/authConfig';
import type { SdkworkMCPPcRuntime } from './bootstrap/runtime';
import {
  hasSdkworkMCPPcAuthenticatedSession,
  resolveSdkworkMCPPcAuthGateDecision,
} from './authGateLogic';

export interface AuthGateProps {
  children: ReactNode;
  runtime: SdkworkMCPPcRuntime;
}

export function AuthGate({ children, runtime }: AuthGateProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState(() => runtime.session.getSnapshot());

  useEffect(() => runtime.session.subscribe(setSnapshot), [runtime.session]);

  const decision = useMemo(
    () =>
      resolveSdkworkMCPPcAuthGateDecision({
        hasSession: hasSdkworkMCPPcAuthenticatedSession(snapshot),
        homePath: '/mcp-hub',
        location,
      }),
    [location, snapshot],
  );

  useEffect(() => {
    if (decision.kind !== 'redirect') {
      return;
    }
    navigate(decision.to, { replace: true });
  }, [decision, navigate]);

  if (decision.kind === 'redirect') {
    return null;
  }

  if (decision.kind === 'auth-route') {
    const authProps = {
      appearance: resolveSdkworkMCPPcAuthAppearance(),
      basePath: '/auth',
      getRuntime: () => runtime.iamRuntime,
      homePath: '/mcp-hub',
      locale: resolveSdkworkMCPPcAuthLocale(runtime.config.i18n.defaultLocale),
      runtimeConfig: resolveSdkworkMCPPcAuthRuntimeConfig(),
      viewportMode: 'flow' as const,
    };

    return (
      <SdkworkIamAuthRoutes
        {...(authProps as unknown as Parameters<typeof SdkworkIamAuthRoutes>[0])}
      />
    );
  }

  return <>{children}</>;
}
