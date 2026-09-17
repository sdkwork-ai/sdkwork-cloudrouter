import { useCallback, useMemo } from 'react';

import { AuthGate as ConsoleAuthGate } from '@sdkwork/cloudrouter-h5-shell';

import { useConsoleRuntime } from './providers/AppProviders.js';

export interface AppAuthGateProps {
  readonly children: React.ReactNode;
}

/**
 * App-level gate: composes the shell sign-in view with the core session and the
 * generated app SDK auth flow owned by the bootstrap.
 */
export function AppAuthGate({ children }: AppAuthGateProps) {
  const runtime = useConsoleRuntime();
  const labels = useMemo(
    () => ({
      title: runtime.translate('cloudrouter.auth.signIn.title'),
      hint: runtime.translate('cloudrouter.auth.signIn.hint'),
      email: runtime.translate('cloudrouter.auth.signIn.email'),
      password: runtime.translate('cloudrouter.auth.signIn.password'),
      submit: runtime.translate('cloudrouter.auth.signIn.submit'),
      submitting: runtime.translate('cloudrouter.auth.signIn.submitting'),
      failed: runtime.translate('cloudrouter.auth.signIn.failed'),
    }),
    [runtime],
  );

  const handleSignIn = useCallback(
    async (credentials: { email: string; password: string }) => {
      await runtime.signIn(credentials);
    },
    [runtime],
  );

  return (
    <ConsoleAuthGate
      authenticated={runtime.authenticated}
      labels={labels}
      brand={runtime.brand}
      onSignIn={handleSignIn}
    >
      {children}
    </ConsoleAuthGate>
  );
}
