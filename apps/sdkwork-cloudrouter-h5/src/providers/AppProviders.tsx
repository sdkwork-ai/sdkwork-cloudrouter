import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import {
  createConsoleTranslator,
  resolveConsoleLocale,
  type SdkworkConsoleLocale,
} from '@sdkwork/cloudrouter-h5-i18n';
import {
  getCloudRouterTokenManager,
  readCloudRouterSession,
} from '@sdkwork/cloudrouter-h5-core/session';
import {
  applyH5SiteBrandingToDocument,
  useH5SiteBranding,
} from '@sdkwork/cloudrouter-h5-core/branding';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import {
  applyThemePreference,
  nextThemePreference,
  persistThemePreference,
  resolveEffectiveThemePreference,
  resolveInitialThemePreference,
  type ResolvedThemePreference,
  type ThemePreference,
} from '../themePreference.js';
import { createCloudRouterIamAuth } from '../bootstrap/iamAuth.js';

export interface ConsoleRuntimeConfiguration {
  readonly platform: 'h5' | 'mini-program' | 'flutter' | 'harmony';
  readonly environment: string;
  readonly profileId: string;
  readonly ports: CloudRouterConsolePorts;
}

export interface ConsoleRuntimeValue extends ConsoleRuntimeConfiguration {
  readonly locale: SdkworkConsoleLocale;
  readonly brand: string;
  readonly brandName: string;
  readonly brandShortName: string;
  readonly brandDescription: string;
  readonly brandLogoUrl?: string;
  readonly authenticated: boolean;
  /** Signed-in IAM account subject, when the session exposes one. */
  readonly accountId: string | null;
  readonly isDark: boolean;
  readonly theme: ThemePreference;
  readonly translate: (key: string) => string;
  readonly toggleTheme: () => void;
  /** Explicit theme preference used by the shared settings page. */
  readonly setTheme: (theme: ThemePreference) => void;
  /** IAM-owned sign-in/sign-up/recovery controller rendered by the auth routes. */
  readonly iamAuthController: ReturnType<typeof createCloudRouterIamAuth>['controller'];
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
  const [accountId, setAccountId] = useState<string | null>(
    () => readCloudRouterSession().subject,
  );
  const [theme, setTheme] = useState<ThemePreference>(() => resolveInitialThemePreference());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedThemePreference>(
    () => resolveEffectiveThemePreference(resolveInitialThemePreference()),
  );
  // One shared branding read feeds the navbar, home, sign-in page, and document
  // title. Operators configure the name/logo in `/admin/site`, the same
  // `system.site.runtime` authority the PC portal uses.
  const branding = useH5SiteBranding();
  // The IAM H5 auth screens own the credential UI and the session commit. The
  // host only mirrors a committed session into the CloudRouter stores/TokenManager.
  const [iamAuth] = useState(() => createCloudRouterIamAuth({
    onSessionCommitted: () => {
      setAuthenticated(true);
      setAccountId(readCloudRouterSession().subject);
    },
  }));

  useLayoutEffect(() => {
    const syncTheme = () => {
      const nextResolvedTheme = applyThemePreference(theme);
      setResolvedTheme((currentTheme) =>
        currentTheme === nextResolvedTheme ? currentTheme : nextResolvedTheme,
      );
    };

    syncTheme();
    persistThemePreference(theme);

    if (theme !== 'system' || typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mediaQuery) {
      return undefined;
    }

    mediaQuery.addEventListener('change', syncTheme);
    return () => {
      mediaQuery.removeEventListener('change', syncTheme);
    };
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => nextThemePreference(currentTheme));
  }, []);

  useLayoutEffect(() => {
    applyH5SiteBrandingToDocument(branding);
  }, [branding]);

  const value = useMemo<ConsoleRuntimeValue>(() => {
    const locale = resolveConsoleLocale();
    const translate = createConsoleTranslator(locale);
    return {
      ...runtimeConfiguration,
      locale,
      brand: branding.shortName || branding.siteName,
      brandName: branding.siteName,
      brandShortName: branding.shortName || branding.siteName,
      brandDescription: branding.description,
      ...(branding.logoUrl ? { brandLogoUrl: branding.logoUrl } : {}),
      authenticated,
      accountId,
      isDark: resolvedTheme === 'dark',
      theme,
      translate,
      toggleTheme,
      setTheme: (nextTheme) => setTheme(nextTheme),
      iamAuthController: iamAuth.controller,
      signOut: () => {
        // IAM owns the server-side session revocation; local state is cleared
        // regardless so a failed network call cannot leave the UI signed in.
        void iamAuth.controller.logout().catch(() => {});
        runtimeConfiguration.ports.session.clearSession();
        getCloudRouterTokenManager().clearTokens();
        setAuthenticated(false);
        setAccountId(null);
      },
    };
  }, [accountId, authenticated, branding, iamAuth, resolvedTheme, runtimeConfiguration, theme, toggleTheme]);

  return <ConsoleRuntimeContext.Provider value={value}>{children}</ConsoleRuntimeContext.Provider>;
}
