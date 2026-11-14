import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SdkworkSubscriptionCatalogTeamProps } from '@sdkwork/membership-pc-subscription/catalog';

import { CloudRouterTokenPlanSurface } from './CloudRouterTokenPlanSurface.tsx';
import { cloudRouterTeamSubscriptionPort } from './team/cloudRouterTeamSubscriptionPort.ts';

/**
 * Token plan page shell.
 *
 * The audience switch and the team seat surface are owned by the shared
 * membership subscription package; this page only supplies the Cloud Router
 * implementation of the team port and the page chrome.
 */
export function CloudRouterTokenPlanPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;
  const team = useMemo<SdkworkSubscriptionCatalogTeamProps>(() => ({
    port: cloudRouterTeamSubscriptionPort,
    translate: (key, defaultValue) => String(t(key, defaultValue ?? key)),
    ...(locale ? { locale } : {}),
  }), [locale, t]);

  return (
    <div className="w-full bg-zinc-50 dark:bg-black" data-token-plan-page>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 lg:px-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
            {t('nav.tokenPlan', 'Token Plan')}
          </h1>
        </header>
      </div>

      <CloudRouterTokenPlanSurface team={team} />
    </div>
  );
}
