import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, LogIn, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button, LoadingBlock, StatusNotice } from '@sdkwork/ui-pc-react';

import { useTokenPlanNotify } from '../tokenPlanNotify.tsx';
import { TeamPlanCards } from './TeamPlanCards.tsx';
import { TeamSeatDirectory } from './TeamSeatDirectory.tsx';
import { TeamSeatPolicy } from './TeamSeatPolicy.tsx';
import { TeamSubscriptionSummary } from './TeamSubscriptionSummary.tsx';
import { resolveTeamPlanErrorCopy } from './teamPlanErrorCopy.ts';
import {
  getTeamOverview,
  normalizeTeamPlanError,
  type TeamPlanServiceError,
  type TeamSubscriptionOverview,
} from './teamSubscriptionService.ts';

/**
 * Organization (team) token plan container.
 *
 * Data access is centralized in `teamSubscriptionService.ts`, which is the only
 * module that resolves `getSdkworkMembershipAppSdkClient()` and
 * `getCloudRouterMembershipCheckoutService()`.
 *
 * This component owns the overview request lifecycle only: bootstrap, retry,
 * unauthenticated sign-in guidance, and the summary / seat-management
 * composition.
 */

export interface CloudRouterTeamPlanPageProps {
  /** Sends a signed-out visitor to the portal login. */
  onLoginRequired: () => void;
}

interface TeamPlanState {
  isBootstrapped: boolean;
  isLoading: boolean;
  lastError: TeamPlanServiceError | null;
  overview: TeamSubscriptionOverview | null;
}

const INITIAL_TEAM_PLAN_STATE: TeamPlanState = {
  isBootstrapped: false,
  isLoading: false,
  lastError: null,
  overview: null,
};

const ROLE_COPY: Record<string, { fallback: string; key: string }> = {
  admin: { fallback: 'Admin', key: 'token_plan.team.role_admin' },
  member: { fallback: 'Member', key: 'token_plan.team.role_member' },
  owner: { fallback: 'Owner', key: 'token_plan.team.role_owner' },
};

function useTeamPlanController() {
  const [state, setState] = useState<TeamPlanState>(INITIAL_TEAM_PLAN_STATE);

  const run = useCallback(async (silent: boolean): Promise<void> => {
    setState((current) => (
      silent ? current : { ...current, isLoading: true, lastError: null }
    ));

    try {
      const overview = await getTeamOverview();
      setState({ isBootstrapped: true, isLoading: false, lastError: null, overview });
    } catch (error) {
      const normalized = normalizeTeamPlanError(error);
      setState((current) => (
        silent && current.overview
          // A background refresh never replaces a valid overview with an error.
          ? { ...current, isBootstrapped: true, isLoading: false }
          : { ...current, isBootstrapped: true, isLoading: false, lastError: normalized }
      ));
    }
  }, []);

  const bootstrap = useCallback(() => run(false), [run]);

  const refresh = useCallback(() => {
    void run(true).catch(() => undefined);
  }, [run]);

  const replaceOverview = useCallback((overview: TeamSubscriptionOverview) => {
    setState({ isBootstrapped: true, isLoading: false, lastError: null, overview });
  }, []);

  return { bootstrap, refresh, replaceOverview, state };
}

export function CloudRouterTeamPlanPage({ onLoginRequired }: CloudRouterTeamPlanPageProps) {
  const { t } = useTranslation();
  const { bootstrap, refresh, replaceOverview, state } = useTeamPlanController();
  const { NotifyOutlet, onNotify } = useTokenPlanNotify();
  const [isExpanding, setIsExpanding] = useState(false);

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading && !state.lastError) {
      void bootstrap().catch(() => undefined);
    }
  }, [bootstrap, state.isBootstrapped, state.isLoading, state.lastError]);

  function handleCheckoutCompleted(): void {
    setIsExpanding(false);
    refresh();
  }

  const overview = state.overview;
  const lastError = state.lastError;
  const errorCopy = lastError ? resolveTeamPlanErrorCopy(lastError.reason) : null;
  const roleCopy = ROLE_COPY[overview?.viewerRole ?? ''] ?? null;

  return (
    <div
      className="mx-auto w-full max-w-7xl px-4 pb-10 md:px-6 lg:px-8"
      data-team-plan-surface
    >
      <NotifyOutlet />

      {state.isLoading && !overview ? (
        <LoadingBlock label={t('token_plan.team.loading', 'Loading team subscription…')} />
      ) : null}

      {!overview && lastError && errorCopy ? (
        <div className="mt-2" data-team-plan-error={lastError.reason}>
          {lastError.reason === 'unauthenticated' ? (
            <StatusNotice title={t('errors.result.40101', 'Authentication is required')} tone="warning">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">
                  {t('errors.result.40101', 'Authentication is required')}
                </span>
                <Button onClick={onLoginRequired} type="button">
                  <LogIn aria-hidden="true" className="h-4 w-4" />
                  {t('nav.signin', 'Sign In')}
                </Button>
              </div>
            </StatusNotice>
          ) : lastError.reason === 'organization_scope_required' ? (
            <StatusNotice title={t('token_plan.team.no_org', 'No organization selected')} tone="warning">
              <span className="text-sm">
                {t(
                  'token_plan.team.no_org_hint',
                  'Switch to a team organization to purchase and manage team seats.',
                )}
              </span>
            </StatusNotice>
          ) : (
            <StatusNotice
              title={t('token_plan.team.load_failed', 'Unable to load team subscription.')}
              tone="danger"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm">{t(errorCopy.key, errorCopy.fallback)}</span>
                <Button
                  disabled={state.isLoading}
                  loading={state.isLoading}
                  onClick={() => void bootstrap().catch(() => undefined)}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  <RefreshCw aria-hidden="true" className="h-4 w-4" />
                  {t('token_plan.team.retry', 'Retry')}
                </Button>
              </div>
            </StatusNotice>
          )}
        </div>
      ) : null}

      {overview ? (
        <>
          <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                {t('token_plan.team.org_label', 'Organization')}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Building2 aria-hidden="true" className="h-5 w-5 shrink-0 text-slate-400" />
                <h1 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {overview.organizationName?.trim()
                    || t('token_plan.team.no_org', 'No organization selected')}
                </h1>
                {roleCopy ? (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
                    <ShieldCheck aria-hidden="true" className="h-3 w-3" />
                    {t(roleCopy.key, roleCopy.fallback)}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                {t('token_plan.team.subtitle', 'One organization, one bill, seats assigned to your members.')}
              </p>
            </div>

            <Button
              className="self-start sm:self-auto"
              disabled={state.isLoading}
              loading={state.isLoading}
              onClick={() => void bootstrap().catch(() => undefined)}
              size="sm"
              type="button"
              variant="ghost"
            >
              <RefreshCw aria-hidden="true" className="h-4 w-4" />
              {t('token_plan.team.retry', 'Retry')}
            </Button>
          </header>

          {overview.hasSubscription ? (
            <div className="space-y-5">
              {isExpanding ? (
                <TeamPlanCards
                  initialSeats={overview.seatsPurchased}
                  mode="expand"
                  onCheckoutCompleted={handleCheckoutCompleted}
                  onNotify={onNotify}
                />
              ) : null}

              <TeamSubscriptionSummary
                onBuyMoreSeats={
                  overview.canManageSeats && !isExpanding ? () => setIsExpanding(true) : undefined
                }
                overview={overview}
              />

              {overview.canManageSeats ? (
                <TeamSeatDirectory onSeatChanged={refresh} overview={overview} />
              ) : null}

              {overview.canManageSeats ? (
                <TeamSeatPolicy
                  onNotify={onNotify}
                  onUpdated={replaceOverview}
                  overview={overview}
                />
              ) : null}
            </div>
          ) : (
            <TeamPlanCards
              initialSeats={0}
              mode="subscribe"
              onCheckoutCompleted={handleCheckoutCompleted}
              onNotify={onNotify}
            />
          )}
        </>
      ) : null}
    </div>
  );
}
