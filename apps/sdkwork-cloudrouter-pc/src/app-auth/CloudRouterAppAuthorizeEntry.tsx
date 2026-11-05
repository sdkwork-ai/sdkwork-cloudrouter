/**
 * The hosted OAuth authorization page (`/iam/v3/oauth/authorize` and its
 * versionless `/iam/oauth/authorize` alias, plus the `/auth/app` alias).
 *
 * A native SDKWork application opens this path on the platform origin in the
 * system browser. Both routes render this same page and keep the authorization
 * request parameters untouched: the page creates the pending IAM authorization
 * state through the app SDK, then renders the IAM login surface in place on the
 * same route. After sign-in the SDKWork auth page completes the authorization
 * and lands on `/auth/desktop/launch`, which fires the registered deep link
 * back into the application.
 *
 * The page renders no product chrome: it is an authorization surface with a
 * visible failure state, so a malformed link never appears to be an ordinary
 * site page.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getSdkworkAppbaseAppSdkClient } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { buildSdkworkDesktopAuthErrorRedirect } from '@sdkwork/auth-pc-react';
import { CloudRouterAuthRoutes } from '../auth/CloudRouterAuthRoutes.tsx';
import { planAppAuthorizeEntry } from './appAuthorizeEntry.ts';

/**
 * Render the hosted OAuth authorization page: create the pending state when the
 * request is complete, otherwise render the IAM login surface in place.
 * @returns the authorization surface or its failure state.
 */
export function CloudRouterAppAuthorizeEntry() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const createStartedRef = useRef(false);
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const plan = useMemo(() => planAppAuthorizeEntry(location.search), [location.search]);

  useEffect(() => {
    if (plan.kind !== 'create' || createStartedRef.current) return;
    createStartedRef.current = true;
    void (async () => {
      try {
        const created = await getSdkworkAppbaseAppSdkClient().oauth.authorizations.create({
          clientId: plan.request.clientId,
          responseType: 'code',
          redirectUri: plan.request.redirectUri,
          scope: plan.request.scope,
          state: plan.request.state,
          codeChallenge: plan.request.codeChallenge,
          codeChallengeMethod: 'S256',
        });
        const nextSearch = new URLSearchParams(location.search);
        nextSearch.set('oauthAuthorizationStateId', created.authorizationStateId);
        navigate(
          { pathname: location.pathname, search: `?${nextSearch.toString()}` },
          { replace: true },
        );
      } catch (error) {
        // A native app is waiting on its deep link. Report a state-creation
        // failure immediately instead of leaving it until the flow deadline;
        // only the SDKWork callback shape derived from the client id is used.
        const errorRedirect = buildSdkworkDesktopAuthErrorRedirect({
          clientId: plan.request.clientId,
          error: 'server_error',
          errorDescription:
            'The hosted authorization could not be started. Start the login again.',
          redirectUri: plan.request.redirectUri,
          state: plan.request.state,
        });
        if (errorRedirect) {
          window.location.assign(errorRedirect);
          return;
        }
        setCreateError(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [location.pathname, location.search, navigate, plan]);

  // The IAM state exists: render the hosted login on this route instead of
  // handing the browser to another page.
  if (plan.kind === 'hosted') {
    return <CloudRouterAuthRoutes />;
  }

  const failed = plan.kind === 'invalid' || plan.kind === 'missing-request'
    || (plan.kind === 'create' && createError !== undefined);
  const problem = plan.kind === 'invalid' ? plan.problem : createError;

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
