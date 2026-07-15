import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock3,
  Crown,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';
import {
  Button,
  LoadingBlock,
  StatusNotice,
} from '@sdkwork/ui-pc-react';
import {
  SdkworkMembershipIntlProvider,
  useSdkworkMembershipController,
  useSdkworkMembershipControllerState,
  useSdkworkMembershipIntl,
  type SdkworkMembershipSummary,
} from '@sdkwork/membership-pc-membership';

import { ClawRouterTokenPlanSurface } from '../token-plan/ClawRouterTokenPlanSurface.tsx';
import { resolveConsoleMembershipLocale } from './consoleCommerceLocale.ts';

const TOKEN_PLAN_SECTION_ID = 'claw-router-membership-token-plan';

export function ClawRouterMembershipPage() {
  const { i18n } = useTranslation();
  const locale = resolveConsoleMembershipLocale(i18n.resolvedLanguage ?? i18n.language);

  return (
    <SdkworkMembershipIntlProvider locale={locale}>
      <ClawRouterMembershipPageContent />
    </SdkworkMembershipIntlProvider>
  );
}

function ClawRouterMembershipPageContent() {
  const controller = useSdkworkMembershipController();
  const state = useSdkworkMembershipControllerState(controller);
  const { copy } = useSdkworkMembershipIntl();

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void controller.bootstrap().catch(() => undefined);
    }
  }, [controller, state.isBootstrapped, state.isLoading, state.lastError]);

  function scrollToTokenPlans() {
    document.getElementById(TOKEN_PLAN_SECTION_ID)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }

  return (
    <div className="h-full overflow-y-auto bg-zinc-50 text-zinc-950 dark:bg-black dark:text-white">
      <div className="w-full max-w-none px-4 pb-8 pt-5 sm:px-6 sm:pt-7 lg:px-8">
        <MembershipOverview
          isLoading={state.isLoading}
          onRefresh={() => void controller.refresh().catch(() => undefined)}
          onViewPlans={scrollToTokenPlans}
          summary={state.dashboard.summary}
        />

        {state.isLoading && !state.isBootstrapped ? (
          <div className="mt-4 rounded-3xl border border-zinc-200 bg-white px-5 py-8 dark:border-zinc-800 dark:bg-zinc-950">
            <LoadingBlock label={copy.page.loading} />
          </div>
        ) : null}

        {state.lastError ? (
          <div className="mt-4">
            <StatusNotice tone="danger" title={copy.page.errorTitle}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">{state.lastError}</span>
                <Button
                  disabled={state.isLoading}
                  loading={state.isLoading}
                  onClick={() => void controller.refresh().catch(() => undefined)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {copy.actions.refresh}
                </Button>
              </div>
            </StatusNotice>
          </div>
        ) : null}
      </div>

      <section
        aria-label={copy.plans.title}
        className="scroll-mt-6 border-t border-zinc-200 bg-white pt-2 dark:border-zinc-800 dark:bg-black"
        data-membership-token-plan
        id={TOKEN_PLAN_SECTION_ID}
      >
        <ClawRouterTokenPlanSurface />
      </section>
    </div>
  );
}

interface MembershipOverviewProps {
  isLoading: boolean;
  onRefresh: () => void;
  onViewPlans: () => void;
  summary: SdkworkMembershipSummary;
}

function MembershipOverview({
  isLoading,
  onRefresh,
  onViewPlans,
  summary,
}: MembershipOverviewProps) {
  const {
    copy,
    formatDuration,
    formatIncludedPoints,
    formatStatus,
  } = useSdkworkMembershipIntl();

  const stats: ReadonlyArray<{
    icon: typeof Crown;
    label: string;
    value: string;
  }> = [
    {
      icon: Crown,
      label: copy.hero.currentLevel,
      value: summary.currentLevelName,
    },
    {
      icon: WalletCards,
      label: copy.hero.points,
      value: summary.pointBalance === null
        ? copy.common.noValue
        : formatIncludedPoints(summary.pointBalance),
    },
    {
      icon: Clock3,
      label: copy.hero.remaining,
      value: formatDuration(summary.remainingDays),
    },
    {
      icon: ShieldCheck,
      label: copy.hero.status,
      value: formatStatus(summary.status),
    },
  ];

  return (
    <section
      className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      data-membership-monochrome-overview
    >
      <div className="grid gap-8 px-5 py-7 sm:px-7 sm:py-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(24rem,0.85fr)] lg:items-end lg:px-9 lg:py-10">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {copy.hero.eyebrow}
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-white">
            {copy.hero.title}
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-zinc-600 dark:text-zinc-400">
            {copy.hero.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:ring-offset-black"
              onClick={onViewPlans}
              type="button"
            >
              {summary.isMember ? copy.actions.upgrade : copy.actions.selectPlan}
            </button>
            <button
              aria-label={copy.actions.refresh}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900 dark:focus-visible:ring-offset-black"
              disabled={isLoading}
              onClick={onRefresh}
              type="button"
            >
              <RefreshCw
                className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
                aria-hidden="true"
              />
              {copy.actions.refresh}
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-black"
                key={stat.label}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-500">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  <span>{stat.label}</span>
                </div>
                <div className="mt-3 truncate text-lg font-bold tabular-nums text-zinc-950 dark:text-white">
                  {stat.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
