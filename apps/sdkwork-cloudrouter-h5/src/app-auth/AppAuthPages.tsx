/**
 * Hosted app sign-in pages for the H5 renderer.
 *
 * They are ordinary hash routes on the mobile renderer so a phone that opened
 * a native app's `/iam/v3/oauth/authorize` link (or that was returned to
 * `/auth/login` by the IAM authorization server) sees the same hosted flow as
 * the PC renderer, and the final `/auth/desktop/launch` page hands the
 * authorization code back through the app's registered deep link.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Route } from 'lucide-react';

import { SdkworkIamH5AuthLoginSurface } from '@sdkwork/iam-h5-auth';
import {
  createConsoleTranslator,
  resolveConsoleLocale,
} from '@sdkwork/cloudrouter-h5-i18n';
import { resolveCloudRouterAppApiBaseUrl } from '@sdkwork/cloudrouter-h5-core/sdk';

import {
  AUTHORIZATION_STATE_PARAM,
  buildAppAuthorizeForwardUrl,
  buildAppLaunchPath,
  isSafeAppLaunchUrl,
  planAppAuthorizeEntry,
  type AppAuthorizeEntryPlan,
} from './appAuthorizeEntry.js';
import {
  completeAppAuthorization,
  isConsoleSessionAuthenticated,
} from './appSession.js';
import { useConsoleRuntime } from '../providers/AppProviders.js';

/** Automatic deep-link hand-off delay so the success state paints first. */
const AUTO_LAUNCH_DELAY_MS = 400;

/** Shared translator for the auth pages, independent of the console provider. */
function useAppAuthTranslate(): (key: string) => string {
  return useMemo(() => createConsoleTranslator(resolveConsoleLocale()), []);
}

function readParameter(search: string, name: string): string | undefined {
  const value = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(name);
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? undefined : trimmed;
}

/** Whether a redirect URL is a deep link the operating system must route. */
function isAppDeepLink(redirectUrl: string): boolean {
  return isSafeAppLaunchUrl(redirectUrl);
}

interface AuthCardProps {
  readonly children: ReactNode;
  readonly title: string;
  readonly description: string;
  readonly testId: string;
}

function AuthCard({ children, title, description, testId }: AuthCardProps) {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-surface px-[0.9rem] text-ink"
      data-testid={testId}
    >
      <section className="w-full max-w-sm space-y-4">
        <header className="space-y-1.5">
          <span
            aria-hidden
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand"
          >
            <Route className="h-5 w-5" />
          </span>
          <h1 className="pt-1 text-xl font-semibold tracking-tight">{title}</h1>
          <p className="text-[12px] leading-5 text-ink-muted">{description}</p>
        </header>
        {children}
      </section>
    </main>
  );
}

/** The hosted authorize entry: forward to IAM, continue on login, or report. */
export function AppAuthorizeEntryPage() {
  const translate = useAppAuthTranslate();
  const location = useLocation();
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const plan: AppAuthorizeEntryPlan = useMemo(
    () => planAppAuthorizeEntry(location.search, {
      appApiBaseUrl: resolveCloudRouterAppApiBaseUrl(),
      pageOrigin: window.location.origin,
    }),
    [location.search],
  );

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (plan.kind === 'forward') {
      window.location.replace(buildAppAuthorizeForwardUrl(plan));
      return;
    }
    if (plan.kind === 'hosted-login') {
      navigate(plan.path, { replace: true });
    }
  }, [navigate, plan]);

  const problem = plan.kind === 'invalid'
    ? plan.problem
    : plan.kind === 'missing-request' ? 'missing-parameter' : undefined;
  const invalid = problem !== undefined;

  return (
    <AuthCard
      description={invalid ? translate('cloudrouter.auth.app.invalidDescription') : translate('cloudrouter.auth.app.description')}
      testId="cloudrouter-h5-app-sign-in"
      title={invalid ? translate('cloudrouter.auth.app.invalidTitle') : translate('cloudrouter.auth.app.title')}
    >
      {invalid ? (
        <>
          <p className="rounded-xl border border-line bg-canvas px-3.5 py-3 text-[11px] text-ink-muted">
            <span className="mr-2 font-semibold text-ink">{translate('cloudrouter.auth.app.problemLabel')}</span>
            <span className="font-mono">{problem}</span>
          </p>
          <p className="text-[11px] leading-5 text-ink-subtle">{translate('cloudrouter.auth.app.hint')}</p>
          <Link className="inline-block text-xs font-medium text-brand underline" to="/">
            {translate('cloudrouter.auth.app.backToConsole')}
          </Link>
        </>
      ) : null}
    </AuthCard>
  );
}

/** The hosted login page that completes the pending app authorization. */
export function AppSignInPage() {
  const translate = useAppAuthTranslate();
  const runtime = useConsoleRuntime();
  const location = useLocation();
  const navigate = useNavigate();
  const authorizationStateId = readParameter(location.search, AUTHORIZATION_STATE_PARAM);
  const [error, setError] = useState<string | null>(null);
  const completionStartedRef = useRef(false);

  const finishAuthorization = useCallback(async (stateId: string) => {
    const redirectUrl = await completeAppAuthorization(stateId);
    if (isAppDeepLink(redirectUrl)) {
      navigate(buildAppLaunchPath(redirectUrl), { replace: true });
      return;
    }
    window.location.assign(redirectUrl);
  }, [navigate]);

  useEffect(() => {
    if (authorizationStateId === undefined || completionStartedRef.current) return;
    if (!runtime.authenticated && !isConsoleSessionAuthenticated()) return;
    completionStartedRef.current = true;
    void finishAuthorization(authorizationStateId)
      .catch((completionError: unknown) => {
        setError(completionError instanceof Error ? completionError.message : translate('cloudrouter.auth.app.failed'));
      });
  }, [authorizationStateId, finishAuthorization, runtime.authenticated, translate]);

  if (authorizationStateId === undefined) {
    return (
      <AuthCard
        description={translate('cloudrouter.auth.app.invalidDescription')}
        testId="cloudrouter-h5-app-sign-in"
        title={translate('cloudrouter.auth.app.invalidTitle')}
      >
        <Link className="inline-block text-xs font-medium text-brand underline" to="/">
          {translate('cloudrouter.auth.app.backToConsole')}
        </Link>
      </AuthCard>
    );
  }

  if (error !== null) {
    return (
      <AuthCard
        description={translate('cloudrouter.auth.app.failed')}
        testId="cloudrouter-h5-app-sign-in"
        title={translate('cloudrouter.auth.app.invalidTitle')}
      >
        <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-xs text-danger">
          {error}
        </p>
        <Link className="inline-block text-xs font-medium text-brand underline" to="/">
          {translate('cloudrouter.auth.app.backToConsole')}
        </Link>
      </AuthCard>
    );
  }

  // IAM owns the hosted sign-in UI (password/code/register/recovery/scan/
  // third-party), exactly as it does for the console route. The host only
  // completes the pending app authorization once IAM commits the session.
  return (
    <SdkworkIamH5AuthLoginSurface
      controller={runtime.iamAuthController}
      locale={runtime.locale}
      onAuthenticated={() => {
        if (completionStartedRef.current) return;
        completionStartedRef.current = true;
        void finishAuthorization(authorizationStateId).catch((completionError: unknown) => {
          setError(completionError instanceof Error ? completionError.message : translate('cloudrouter.auth.app.failed'));
        });
      }}
    />
  );
}

/** The hand-off page that fires the deep link back into the app. */
export function AppLaunchPage() {
  const translate = useAppAuthTranslate();
  const location = useLocation();
  // The query string is attacker-influenced: only a native app hand-off
  // (custom scheme or loopback) may be auto-navigated to.
  const requestedRedirectUrl = readParameter(location.search, 'redirectUrl') ?? '';
  const redirectUrl = isSafeAppLaunchUrl(requestedRedirectUrl) ? requestedRedirectUrl : '';
  const [phase, setPhase] = useState<'launching' | 'launched' | 'failed'>(
    redirectUrl === '' ? 'failed' : 'launching',
  );
  const attemptedRef = useRef(false);

  useEffect(() => {
    if (redirectUrl === '' || attemptedRef.current) return undefined;
    attemptedRef.current = true;
    const timer = globalThis.setTimeout(() => {
      try {
        window.location.assign(redirectUrl);
        setPhase('launched');
      } catch {
        setPhase('failed');
      }
    }, AUTO_LAUNCH_DELAY_MS);
    return () => { globalThis.clearTimeout(timer); };
  }, [redirectUrl]);

  if (redirectUrl === '') {
    return (
      <AuthCard
        description={translate('cloudrouter.auth.app.missingRedirect')}
        testId="cloudrouter-h5-app-launch"
        title={translate('cloudrouter.auth.app.launchTitle')}
      >
        <Link className="inline-block text-xs font-medium text-brand underline" to="/">
          {translate('cloudrouter.auth.app.backToConsole')}
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      description={translate('cloudrouter.auth.app.launchDescription')}
      testId="cloudrouter-h5-app-launch"
      title={translate('cloudrouter.auth.app.launchTitle')}
    >
      <button
        className="w-full rounded-xl bg-brand-fill px-4 py-3 text-sm font-semibold text-on-brand shadow-sm"
        onClick={() => {
          try {
            window.location.assign(redirectUrl);
            setPhase('launched');
          } catch {
            setPhase('failed');
          }
        }}
        type="button"
      >
        {translate('cloudrouter.auth.app.launchOpen')}
      </button>
      {/* A user-activated anchor still reaches a custom scheme when the
          browser blocks the scripted navigation. The text is copy, never the
          URL, so the one-time authorization code is not rendered. */}
      <a
        className="block w-full rounded-xl border border-line bg-surface px-4 py-3 text-center text-xs font-medium text-ink"
        data-testid="cloudrouter-h5-app-launch-link"
        href={redirectUrl}
        onClick={() => { setPhase('launched'); }}
      >
        {translate('cloudrouter.auth.app.launchLink')}
      </a>
      <p className="rounded-xl border border-line bg-canvas px-3.5 py-3 text-[11px] leading-5 text-ink-muted">
        {phase === 'failed'
          ? translate('cloudrouter.auth.app.launchFailed')
          : translate('cloudrouter.auth.app.launchHint')}
      </p>
      <Link className="inline-block text-xs font-medium text-brand underline" to="/">
        {translate('cloudrouter.auth.app.backToConsole')}
      </Link>
    </AuthCard>
  );
}
