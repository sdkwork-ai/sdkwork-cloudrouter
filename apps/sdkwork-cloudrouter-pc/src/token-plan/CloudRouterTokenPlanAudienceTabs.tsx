import { Building2, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export type CloudRouterTokenPlanAudience = 'personal' | 'team';

interface CloudRouterTokenPlanAudienceTabsProps {
  active: CloudRouterTokenPlanAudience;
  onChange: (audience: CloudRouterTokenPlanAudience) => void;
}

const AUDIENCES: readonly CloudRouterTokenPlanAudience[] = ['personal', 'team'];

/**
 * Top-level audience switch for the token plan page.
 *
 * This is the Cloud Router composition seam: the shared membership subscription
 * catalog stays audience-agnostic, while the personal catalog and the
 * organization (team) seat surface are selected here.
 */
export function CloudRouterTokenPlanAudienceTabs({
  active,
  onChange,
}: CloudRouterTokenPlanAudienceTabsProps) {
  const { t } = useTranslation();

  return (
    <div
      aria-label={t('token_plan.audience.label', 'Subscription type')}
      className="flex justify-center"
      data-token-plan-audience-tabs
      role="tablist"
    >
      <div className="inline-flex rounded-full border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900 max-sm:grid max-sm:w-full max-sm:grid-cols-2 max-sm:rounded-2xl">
        {AUDIENCES.map((audience) => {
          const isActive = audience === active;
          const Icon = audience === 'personal' ? UserRound : Building2;
          return (
            <button
              aria-selected={isActive}
              className={`relative flex items-center justify-center gap-2 rounded-full px-7 py-2.5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-black max-sm:rounded-xl ${
                isActive
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
              }`}
              data-audience={audience}
              key={audience}
              onClick={() => onChange(audience)}
              role="tab"
              type="button"
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
              <span className="whitespace-nowrap">
                {t(
                  audience === 'personal' ? 'token_plan.audience.personal' : 'token_plan.audience.team',
                  audience === 'personal' ? '个人订阅' : '团队订阅',
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
