import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buildPortalAuthLoginRedirect } from '@sdkwork/cloudroutes-pc-commons';

import {
  CloudRouterTokenPlanAudienceTabs,
  type CloudRouterTokenPlanAudience,
} from './CloudRouterTokenPlanAudienceTabs.tsx';
import { CloudRouterTokenPlanSurface } from './CloudRouterTokenPlanSurface.tsx';
import { CloudRouterTeamPlanPage } from './team/CloudRouterTeamPlanPage.tsx';

/**
 * Token plan page shell.
 *
 * The audience switch is the Cloud Router composition seam: the personal
 * catalog (`CloudRouterTokenPlanSurface`) stays audience-agnostic and mounted
 * from the console membership page too, while the organization (team) seat
 * surface is composed here only.
 */
export function CloudRouterTokenPlanPage() {
  const { t } = useTranslation();
  const [audience, setAudience] = useState<CloudRouterTokenPlanAudience>('personal');

  function handleLoginRequired(): void {
    const redirectTo = buildPortalAuthLoginRedirect(window.location);
    window.location.assign(redirectTo);
  }

  return (
    <div className="w-full bg-zinc-50 dark:bg-black" data-token-plan-page>
      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6 lg:px-8">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
            {t('nav.tokenPlan', 'Token Plan')}
          </h1>
        </header>
        <div className="mt-6">
          <CloudRouterTokenPlanAudienceTabs active={audience} onChange={setAudience} />
        </div>
      </div>

      {audience === 'personal' ? (
        <CloudRouterTokenPlanSurface />
      ) : (
        <CloudRouterTeamPlanPage onLoginRequired={handleLoginRequired} />
      )}
    </div>
  );
}
