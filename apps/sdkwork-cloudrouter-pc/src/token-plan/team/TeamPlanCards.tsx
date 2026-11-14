import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Minus, Plus, Sparkles, Ticket, UsersRound } from 'lucide-react';
import { Button, EmptyState, LoadingBlock, StatusNotice } from '@sdkwork/ui-pc-react';
import type { SdkworkOrderCheckoutSummary } from '@sdkwork/order-pc-checkout';

import { CloudRouterTeamCheckoutDialog } from './CloudRouterTeamCheckoutDialog.tsx';
import {
  clampTeamSeatCount,
  computeTeamSeatTotal,
  formatTeamCnyAmount,
  groupTeamPlanPackages,
  parseTeamSeatInput,
  resolveDefaultTeamSeatCount,
  resolveTeamSeatBounds,
  selectTeamPlanPackage,
  type TeamBillingCycle,
  type TeamSeatBounds,
} from './teamPlanPricing.ts';
import {
  listTeamPackages,
  normalizeTeamPlanError,
  startTeamCheckout,
  type TeamPlanPackage,
  type TeamPlanServiceError,
  type TeamCheckoutPayment,
} from './teamSubscriptionService.ts';

/** Notification sink shared by the team surface (see `useTokenPlanNotify`). */
export type TeamPlanNotify = (
  message: string,
  tone: 'error' | 'info' | 'success',
) => void;

export interface TeamPlanCardsProps {
  /** Current purchased seats; the stepper floor when expanding a subscription. */
  initialSeats: number;
  /**
   * `subscribe` starts the first team subscription (`purchase`).
   * `expand` adds seats to the active subscription (`renew` with the new total).
   */
  mode: 'expand' | 'subscribe';
  onCheckoutCompleted: () => void;
  onNotify: TeamPlanNotify;
}

interface TeamCheckoutSession {
  payment: TeamCheckoutPayment;
  summary: SdkworkOrderCheckoutSummary;
}

const BILLING_CYCLES: readonly TeamBillingCycle[] = ['month', 'year'];

/**
 * Team plan cards: one column per catalog plan, priced per seat.
 *
 * The catalog is grouped by `planId`; each plan sells a monthly and/or annual
 * package (`recurrenceCycle`). The card owns the seat stepper, the computed
 * total, and the checkout hand-off to the order-owned dialog.
 */
export function TeamPlanCards({
  initialSeats,
  mode,
  onCheckoutCompleted,
  onNotify,
}: TeamPlanCardsProps) {
  const { t } = useTranslation();
  const [packages, setPackages] = useState<TeamPlanPackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<TeamPlanServiceError | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [billingCycle, setBillingCycle] = useState<TeamBillingCycle>('month');
  const [seatDrafts, setSeatDrafts] = useState<Record<string, string>>({});
  const [purchasingPackageId, setPurchasingPackageId] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<TeamPlanServiceError | null>(null);
  const [session, setSession] = useState<TeamCheckoutSession | null>(null);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setLoadError(null);

    void listTeamPackages()
      .then((items) => {
        if (active) {
          setPackages(items);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setLoadError(normalizeTeamPlanError(error));
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [reloadToken]);

  const groups = groupTeamPlanPackages(packages);

  function setSeatDraft(groupKey: string, value: string): void {
    setSeatDrafts((current) => ({ ...current, [groupKey]: value }));
  }

  function stepSeat(groupKey: string, nextSeats: number, bounds: TeamSeatBounds): void {
    setSeatDraft(groupKey, String(clampTeamSeatCount(nextSeats, bounds)));
  }

  function handleBuy(
    pkg: TeamPlanPackage,
    seats: number,
    total: number,
    cycleLabel: string,
  ): void {
    if (purchasingPackageId) {
      return;
    }
    setCheckoutError(null);
    setPurchasingPackageId(pkg.id);

    void startTeamCheckout({
      action: mode === 'expand' ? 'renew' : 'purchase',
      packageId: pkg.id,
      seats,
    })
      .then((payment) => {
        setSession({
          payment,
          summary: {
            id: payment.orderId ?? pkg.id,
            name: pkg.name,
            originalPriceLabel: pkg.originalPrice
              ? formatTeamCnyAmount(Number(pkg.originalPrice) * seats)
              : undefined,
            periodLabel: `${t('token_plan.team.checkout_seats', { seats })} · ${cycleLabel}`,
            priceLabel: formatTeamCnyAmount(total),
          },
        });
      })
      .catch((error: unknown) => {
        setCheckoutError(normalizeTeamPlanError(error));
      })
      .finally(() => {
        setPurchasingPackageId(null);
      });
  }

  function handleCheckoutCompleted(): void {
    setSession(null);
    onNotify(t('token_plan.team.checkout_success', 'Team subscription activated.'), 'success');
    onCheckoutCompleted();
  }

  return (
    <section className="space-y-6" data-team-plan-cards>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {mode === 'expand'
              ? t('token_plan.team.buy_more_seats', 'Buy more seats')
              : t('token_plan.team.title', 'Team subscription')}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {t('token_plan.team.subtitle', 'One organization, one bill, seats assigned to your members.')}
          </p>
        </div>

        <div
          aria-label={t('token_plan.team.period', 'Billing period')}
          className="inline-flex shrink-0 self-start rounded-md border border-slate-200 bg-slate-100 p-0.5 dark:border-white/10 dark:bg-white/5 sm:self-auto"
          role="group"
        >
          {BILLING_CYCLES.map((cycle) => {
            const isActive = cycle === billingCycle;
            return (
              <button
                aria-pressed={isActive}
                className={`min-h-9 rounded-[0.3rem] px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                }`}
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                type="button"
              >
                {t(
                  cycle === 'year' ? 'token_plan.team.billing_annual' : 'token_plan.team.billing_monthly',
                  cycle === 'year' ? 'Annual' : 'Monthly',
                )}
              </button>
            );
          })}
        </div>
      </div>

      {billingCycle === 'year' ? (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
          {t('token_plan.team.billing_annual_hint', 'Save about 17% with annual billing.')}
        </p>
      ) : null}

      {checkoutError ? (
        <StatusNotice
          title={t('token_plan.team.checkout_failed', 'Team subscription payment could not be started.')}
          tone="danger"
        >
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              onClick={() => setCheckoutError(null)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {t('close', 'Close')}
            </Button>
          </div>
        </StatusNotice>
      ) : null}

      {isLoading ? (
        <LoadingBlock label={t('token_plan.team.loading', 'Loading team subscription…')} />
      ) : null}

      {!isLoading && loadError ? (
        <StatusNotice title={t('token_plan.team.load_failed', 'Unable to load team subscription.')} tone="danger">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              onClick={() => setReloadToken((token) => token + 1)}
              size="sm"
              type="button"
              variant="ghost"
            >
              {t('token_plan.team.retry', 'Retry')}
            </Button>
          </div>
        </StatusNotice>
      ) : null}

      {!isLoading && !loadError && groups.length === 0 ? (
        <EmptyState
          description={t('token_plan.team.empty_packages', 'No team plans are available right now.')}
        />
      ) : null}

      {!isLoading && !loadError && groups.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {groups.map((group) => {
            const activePackage = selectTeamPlanPackage(group, billingCycle);
            if (!activePackage) {
              return null;
            }
            const bounds = resolveTeamSeatBounds(activePackage);
            const draft = seatDrafts[group.planId]
              ?? String(resolveDefaultTeamSeatCount(bounds, initialSeats));
            const parsedSeats = parseTeamSeatInput(draft, bounds);
            const seats = clampTeamSeatCount(parsedSeats, bounds);
            const total = computeTeamSeatTotal(activePackage.price, seats);
            const isPurchasing = purchasingPackageId === activePackage.id;
            const unitPrice = formatTeamCnyAmount(Number(activePackage.price));
            const originalPrice = activePackage.originalPrice
              ? formatTeamCnyAmount(Number(activePackage.originalPrice))
              : null;
            const periodLabel = t(
              activePackage.recurrenceCycle === 'year'
                ? 'token_plan.team.per_period_year'
                : 'token_plan.team.per_period_month',
              activePackage.recurrenceCycle === 'year' ? '/ year' : '/ month',
            );

            return (
              <article
                className={`flex min-w-0 flex-col rounded-3xl border bg-white p-5 shadow-sm transition-colors dark:bg-zinc-950 ${
                  group.recommended
                    ? 'border-lobster-500/60 ring-1 ring-lobster-500/20'
                    : 'border-slate-200 dark:border-white/10'
                }`}
                data-team-plan-card={group.planId}
                key={group.planId}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="min-w-0 truncate text-base font-semibold text-slate-950 dark:text-white">
                    {group.planName}
                  </h3>
                  {group.recommended ? (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-lobster-500/10 px-2 py-1 text-[0.7rem] font-semibold text-lobster-600 dark:text-lobster-400">
                      <Sparkles aria-hidden="true" className="h-3 w-3" />
                      {t('token_plan.team.recommended', 'Recommended')}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-3xl font-semibold tabular-nums text-slate-950 dark:text-white">
                    {unitPrice}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('token_plan.team.per_seat', '/ seat')}
                    {periodLabel}
                  </span>
                  {originalPrice ? (
                    <span className="text-sm tabular-nums text-slate-400 line-through dark:text-slate-500">
                      {originalPrice}
                    </span>
                  ) : null}
                </div>

                {Number(activePackage.seatPointsAmount) > 0 ? (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Ticket aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                    {t('token_plan.team.points_included', {
                      points: Number(activePackage.seatPointsAmount).toLocaleString('en-US'),
                    })}
                  </p>
                ) : null}

                <div className="mt-5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                      htmlFor={`team-seat-input-${group.planId}`}
                    >
                      {t('token_plan.team.seat_label', 'Seats')}
                    </label>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <UsersRound aria-hidden="true" className="h-3.5 w-3.5" />
                      {t('token_plan.team.seat_unit', 'seat')}
                    </span>
                  </div>

                  <div className="flex items-stretch gap-2">
                    <button
                      aria-label={`${t('token_plan.team.seat_label', 'Seats')} −`}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      disabled={seats <= bounds.min || isPurchasing}
                      onClick={() => stepSeat(group.planId, seats - 1, bounds)}
                      type="button"
                    >
                      <Minus aria-hidden="true" className="h-4 w-4" />
                    </button>
                    <input
                      aria-describedby={`team-seat-hint-${group.planId}`}
                      className="h-9 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-center text-sm font-semibold tabular-nums text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
                      id={`team-seat-input-${group.planId}`}
                      inputMode="numeric"
                      onBlur={() => setSeatDraft(group.planId, String(seats))}
                      onChange={(event) => setSeatDraft(
                        group.planId,
                        event.target.value.replaceAll(/[^0-9]/g, '').slice(0, 5),
                      )}
                      pattern="[0-9]*"
                      type="text"
                      value={draft}
                    />
                    <button
                      aria-label={`${t('token_plan.team.seat_label', 'Seats')} +`}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
                      disabled={seats >= bounds.max || isPurchasing}
                      onClick={() => stepSeat(group.planId, seats + 1, bounds)}
                      type="button"
                    >
                      <Plus aria-hidden="true" className="h-4 w-4" />
                    </button>
                  </div>

                  <p
                    className="min-h-4 text-xs text-amber-600 dark:text-amber-400"
                    id={`team-seat-hint-${group.planId}`}
                    role="status"
                  >
                    {parsedSeats < bounds.min
                      ? t('token_plan.team.seat_min_hint', { min: bounds.min })
                      : null}
                    {parsedSeats > bounds.max
                      ? t('token_plan.team.seat_max_hint', { max: bounds.max })
                      : null}
                  </p>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-4 dark:border-white/10">
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {t('token_plan.team.total', 'Total')}
                  </span>
                  <span className="text-lg font-semibold tabular-nums text-slate-950 dark:text-white">
                    {formatTeamCnyAmount(total)}
                  </span>
                </div>

                <Button
                  className="mt-4 w-full bg-lobster-500 text-white hover:bg-lobster-600 focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={isPurchasing}
                  loading={isPurchasing}
                  onClick={() => handleBuy(activePackage, seats, total, periodLabel)}
                  type="button"
                >
                  <Check aria-hidden="true" className="h-4 w-4" />
                  {t('token_plan.team.buy_seats', { seats })}
                </Button>
              </article>
            );
          })}
        </div>
      ) : null}

      <CloudRouterTeamCheckoutDialog
        isOpen={session !== null}
        onClose={() => setSession(null)}
        onCompleted={handleCheckoutCompleted}
        payment={session?.payment ?? null}
        summary={session?.summary ?? null}
      />
    </section>
  );
}
