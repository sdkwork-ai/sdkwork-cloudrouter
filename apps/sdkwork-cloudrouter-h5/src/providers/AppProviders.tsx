import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  createConsoleTranslator,
  resolveConsoleLocale,
  type SdkworkConsoleLocale,
} from '@sdkwork/cloudrouter-h5-i18n';
import {
  getCloudRouterTokenManager,
  readCloudRouterSession,
} from '@sdkwork/cloudrouter-h5-core/session';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import {
  signInConsoleSession,
  type ConsoleSignInCredentials,
} from '../app-auth/appSession.js';

export type { ConsoleSignInCredentials } from '../app-auth/appSession.js';

export interface ConsoleRuntimeConfiguration {
  readonly platform: 'h5' | 'mini-program' | 'flutter' | 'harmony';
  readonly environment: string;
  readonly profileId: string;
  readonly ports: CloudRouterConsolePorts;
}

export interface ConsoleRuntimeValue extends ConsoleRuntimeConfiguration {
  readonly locale: SdkworkConsoleLocale;
  readonly brand: string;
  readonly authenticated: boolean;
  readonly translate: (key: string) => string;
  readonly signIn: (credentials: ConsoleSignInCredentials) => Promise<void>;
  readonly signOut: () => void;
}

const ConsoleRuntimeContext = createContext<ConsoleRuntimeValue | null>(null);

let pendingConfiguration: ConsoleRuntimeConfiguration | null = null;
let configurationListener: ((configuration: ConsoleRuntimeConfiguration) => void) | null = null;
let configuration: ConsoleRuntimeConfiguration | null = null;

/** Called by the bootstrap, which runs before React mounts. */
export function configureConsoleRuntime(next: ConsoleRuntimeConfiguration): void {
  configuration = next;
  pendingConfiguration = null;
  configurationListener?.(next);
}

export function consumePendingConsoleRuntime(): ConsoleRuntimeConfiguration | null {
  return pendingConfiguration ?? configuration;
}

export function useConsoleRuntime(): ConsoleRuntimeValue {
  const value = useContext(ConsoleRuntimeContext);
  if (!value) throw new Error('useConsoleRuntime must be used inside ConsoleRuntimeProvider.');
  return value;
}

export interface ConsoleRuntimeProviderProps {
  readonly configuration: ConsoleRuntimeConfiguration;
  readonly children: ReactNode;
}

export function ConsoleRuntimeProvider({ configuration: runtimeConfiguration, children }: ConsoleRuntimeProviderProps) {
  // The console gate reads `authenticated` as a prop, so a successful sign-in
  // has to publish a new runtime value; deriving it once from storage would
  // leave the gate on the credential form after the session was created.
  const [authenticated, setAuthenticated] = useState(
    () => readCloudRouterSession().authenticated,
  );
  const value = useMemo<ConsoleRuntimeValue>(() => {
    const locale = resolveConsoleLocale();
    const translate = createConsoleTranslator(locale);
    return {
      ...runtimeConfiguration,
      locale,
      brand: 'SDKWork CloudRouter',
      authenticated,
      translate,
      signIn: async (credentials) => {
        await signInConsoleSession(credentials);
        setAuthenticated(true);
      },
      signOut: () => {
        runtimeConfiguration.ports.session.clearSession();
        getCloudRouterTokenManager().clearTokens();
        setAuthenticated(false);
      },
    };
  }, [authenticated, runtimeConfiguration]);

  return <ConsoleRuntimeContext.Provider value={value}>{children}</ConsoleRuntimeContext.Provider>;
}
