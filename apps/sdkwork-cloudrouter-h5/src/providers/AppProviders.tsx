import { createContext, useContext, useMemo, type ReactNode } from 'react';

import {
  createConsoleTranslator,
  resolveConsoleLocale,
  type SdkworkConsoleLocale,
} from '@sdkwork/cloudrouter-h5-i18n';
import {
  applyCloudRouterSessionTokens,
  getCloudRouterTokenManager,
  readCloudRouterSession,
} from '@sdkwork/cloudrouter-h5-core/session';
import { getCloudRouterH5AppSdkClient } from '@sdkwork/cloudrouter-h5-core/sdk';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';

export interface ConsoleRuntimeConfiguration {
  readonly platform: 'h5' | 'mini-program' | 'flutter' | 'harmony';
  readonly environment: string;
  readonly profileId: string;
  readonly ports: CloudRouterConsolePorts;
}

export interface ConsoleSignInCredentials {
  readonly email: string;
  readonly password: string;
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
  const value = useMemo<ConsoleRuntimeValue>(() => {
    const locale = resolveConsoleLocale();
    const translate = createConsoleTranslator(locale);
    return {
      ...runtimeConfiguration,
      locale,
      brand: 'SDKWork CloudRouter',
      authenticated: readCloudRouterSession().authenticated,
      translate,
      signIn: async (credentials) => {
        const authToken = await requestSessionToken(getCloudRouterH5AppSdkClient(), credentials);
        applyCloudRouterSessionTokens(authToken.accessToken, authToken.authToken);
      },
      signOut: () => {
        runtimeConfiguration.ports.session.clearSession();
        getCloudRouterTokenManager().clearTokens();
      },
    };
  }, [runtimeConfiguration]);

  return <ConsoleRuntimeContext.Provider value={value}>{children}</ConsoleRuntimeContext.Provider>;
}

interface SessionTokenPair {
  readonly accessToken: string;
  readonly authToken: string;
}

/**
 * Creates an app session. The generated app SDK exposes IAM user settings but not
 * the session bootstrap endpoint, so the session call goes through the SDK-owned
 * HTTP client to keep headers, base URL, and error handling in one boundary.
 */
async function requestSessionToken(
  client: { http: { request: (path: string, options: Record<string, unknown>) => Promise<unknown> } },
  credentials: ConsoleSignInCredentials,
): Promise<SessionTokenPair> {
  const payload = (await client.http.request('/auth/sessions', {
    method: 'POST',
    body: { account: credentials.email, password: credentials.password },
  })) as Record<string, unknown>;
  const accessToken = typeof payload.accessToken === 'string' ? payload.accessToken : '';
  const authToken = typeof payload.authToken === 'string' ? payload.authToken : '';
  if (!accessToken && !authToken) {
    throw new Error('CloudRouter sign-in returned no session token.');
  }
  return { accessToken, authToken };
}
