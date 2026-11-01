/**
 * The hosted app sign-in entry (`/iam/v3/oauth/authorize` and its versionless
 * `/iam/oauth/authorize` alias, plus the `/auth/app` alias).
 *
 * A native SDKWork application opens this path on the platform origin in the
 * system browser. The page validates the authorization request and continues
 * the navigation on the IAM authorization server, which owns the pending
 * authorization state and returns the browser to the hosted login on this
 * origin. Once the login completes, the SDKWork auth page lands on
 * `/auth/desktop/launch`, and that page fires the registered deep link back
 * into the application.
 *
 * The page renders no product chrome: it is a redirect surface with a visible
 * failure state, so a malformed link never appears to be an ordinary site page.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { resolveSharedDependencySurfaceBaseUrl } from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  APP_API_PREFIX,
  buildAppAuthorizeForwardUrl,
  planAppAuthorizeEntry,
} from './appAuthorizeEntry.ts';

/**
 * Render (and immediately drive) the hosted app sign-in entry.
 * @returns the redirect surface or its failure state.
 */
export function CloudRouterAppAuthorizeEntry() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const startedRef = useRef(false);
  const pageOrigin = typeof window === 'undefined' ? '' : window.location.origin;
  const plan = useMemo(
    () => planAppAuthorizeEntry(location.search, {
      appApiBaseUrl: resolveSharedDependencySurfaceBaseUrl(APP_API_PREFIX) ?? APP_API_PREFIX,
      pageOrigin,
    }),
    [location.search, pageOrigin],
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

  const failed = plan.kind === 'invalid' || plan.kind === 'missing-request';
  const problem = plan.kind === 'invalid' ? plan.problem : undefined;

  return (
    <main
      className="flex min-h-screen items-center justify-center bg-zinc-100 px-6 py-16 dark:bg-zinc-950"
      data-testid="cloudrouter-app-sign-in"
    >
      <section className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          {failed ? t('auth.appSignIn.invalidTitle') : t('auth.appSignIn.title')}
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          {failed ? t('auth.appSignIn.invalidDescription') : t('auth.appSignIn.description')}
        </p>
        {problem === undefined ? null : (
          <p className="mt-4 rounded-lg bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-500 dark:bg-zinc-950/60 dark:text-zinc-400">
            <span className="mr-2 font-sans font-semibold text-zinc-700 dark:text-zinc-200">
              {t('auth.appSignIn.problemLabel')}
            </span>
            {problem}
          </p>
        )}
        <p className="mt-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {t('auth.appSignIn.hint')}
        </p>
        {failed ? (
          <Link
            className="mt-6 inline-block text-sm font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400"
            to="/"
          >
            {t('auth.appSignIn.home')}
          </Link>
        ) : null}
      </section>
    </main>
  );
}
