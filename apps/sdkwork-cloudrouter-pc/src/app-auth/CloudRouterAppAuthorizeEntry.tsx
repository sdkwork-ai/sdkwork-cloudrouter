/**
 * The hosted OAuth authorization page (`/iam/v3/oauth/authorize` and its
 * versionless `/iam/oauth/authorize` alias, plus the `/oauth/app` alias).
 *
 * A native SDKWork application opens this path on the platform origin in the
 * system browser. A complete authorization request renders the hosted IAM auth
 * surface in place on this route: an anonymous visitor sees the SDKWork login
 * form, and a signed-in browser sees the account-choice step. The hosted page
 * creates the pending authorization state at the moment the browser actually
 * signs in or confirms the account, completes it after sign-in, and lands on
 * `/oauth/desktop/launch`, which fires the registered deep link back into the
 * application.
 *
 * The page renders no product chrome of its own beyond the shared auth header:
 * it is an authorization surface with a visible failure state, so a malformed
 * link never appears to be an ordinary site page.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { BrandMark } from '@sdkwork/cloudroutes-pc-commons';
import { useResolvedBrandLogoUrl, useSiteBranding } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { SdkworkAuthSurfaceHeader } from '@sdkwork/auth-pc-react';
import { CloudRouterAuthRoutes } from '../auth/CloudRouterAuthRoutes.tsx';
import { planAppAuthorizeEntry } from './appAuthorizeEntry.ts';

/**
 * Render the hosted OAuth authorization page.
 *
 * A valid request (with or without the IAM authorization state) hands the page
 * to the hosted auth surface; only an invalid or incomplete link renders the
 * failure state here.
 * @returns the hosted auth surface or its failure state.
 */
export function CloudRouterAppAuthorizeEntry() {
  const { t } = useTranslation();
  const location = useLocation();
  const plan = useMemo(() => planAppAuthorizeEntry(location.search), [location.search]);
  const siteBranding = useSiteBranding();
  const brandLogoUrl = useResolvedBrandLogoUrl(siteBranding);
  const displaySiteName = siteBranding.shortName || siteBranding.siteName;
  const brand = { name: displaySiteName, logoUrl: brandLogoUrl };
  // Same backend-configured lockup as the homepage navbar so the failure state
  // still shows the product the visitor came from.
  const brandHeader = (
    <span className="flex min-w-0 items-center gap-2">
      <BrandMark branding={siteBranding} />
      <span className="hidden truncate text-base font-bold tracking-tight text-slate-900 dark:text-white sm:inline md:max-w-[10rem] lg:max-w-[12rem]">
        {displaySiteName}
      </span>
    </span>
  );

  // A valid app authorization renders the hosted login on this route. The
  // hosted page creates the pending state when the visitor signs in, so an
  // anonymous visitor reaches the login form without an intermediate page.
  if (plan.kind === 'create' || plan.kind === 'hosted') {
    return <CloudRouterAuthRoutes />;
  }

  const problem = plan.kind === 'invalid' ? plan.problem : undefined;

  return (
    <div
      className="relative flex min-h-screen flex-col bg-[var(--sdkwork-auth-page-background-color,#fafafa)] p-4 dark:bg-zinc-950 sm:p-8"
      data-testid="cloudrouter-app-sign-in"
    >
      <div className="relative z-20 mx-auto w-full max-w-[560px]">
        <SdkworkAuthSurfaceHeader brand={brand} brandNode={brandHeader} />
      </div>
      <div className="flex flex-1 items-center justify-center py-10">
        <section className="w-full max-w-[560px] rounded-3xl bg-white/92 p-8 shadow-2xl ring-1 ring-zinc-200/70 dark:bg-zinc-900/92 dark:ring-zinc-800 sm:p-10">
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            {t('auth.appSignIn.invalidTitle')}
          </h1>
          <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            {t('auth.appSignIn.invalidDescription')}
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
          <Link
            className="mt-6 inline-block text-sm font-semibold text-primary-600 hover:text-primary-500 dark:text-primary-400"
            to="/"
          >
            {t('auth.appSignIn.home')}
          </Link>
        </section>
      </div>
    </div>
  );
}
