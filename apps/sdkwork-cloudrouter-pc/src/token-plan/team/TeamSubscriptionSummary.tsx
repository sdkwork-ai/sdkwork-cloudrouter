import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  ShieldCheck,
  TicketCheck,
  TriangleAlert,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react';
import { Button } from '@sdkwork/ui-pc-react';

import type { TeamSeatComposition } from './teamRosterComposition.ts';
import type { TeamSubscriptionOverview } from './teamSubscriptionService.ts';

const STATUS_COPY: Record<string, { fallback: string; key: string }> = {
  active: { fallback: 'Active', key: 'token_plan.team.status_active' },
  cancelled: { fallback: 'Cancelled', key: 'token_plan.team.status_cancelled' },
  expired: { fallback: 'Expired', key: 'token_plan.team.status_expired' },
  grace_period: { fallback: 'Grace period', key: 'token_plan.team.status_grace' },
  pending_activation: { fallback: 'Activating', key: 'token_plan.team.status_pending' },
};

export interface TeamSubscriptionSummaryProps {
  /**
   * IAM-derived team facts: member counts, the viewer role, and the seat
   * overflow derivation. Membership only supplies the overview.
   */
  composition: TeamSeatComposition;
  /**
   * Opens the plan cards so the owner can buy more seats. Omit it for members
   * without seat-management rights; the CTA is then hidden.
   */
  onBuyMoreSeats?: () => void;
  overview: TeamSubscriptionOverview;
}

function formatTeamDate(value: string | undefined, locale: string): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
}

/**
 * Active team subscription summary: status, plan, billing period, seat usage,
 * and the unlicensed-member warning.
 */
export function TeamSubscriptionSummary({
  composition,
  onBuyMoreSeats,
  overview,
}: TeamSubscriptionSummaryProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const statusCopy = STATUS_COPY[overview.status ?? ''] ?? {
    fallback: 'Not subscribed',
    key: 'token_plan.team.status_none',
  };
  const startsAt = formatTeamDate(overview.startsAt, locale);
  const expiresAt = formatTeamDate(overview.expiresAt, locale);
  const seatPercent = overview.seatsPurchased > 0
    ? Math.min(100, Math.round((overview.seatsUsed / overview.seatsPurchased) * 100))
    : 0;
  const hasUnlicensedMembers = composition.overSeat || composition.unlicensedMembers > 0;

  const tiles: ReadonlyArray<{ icon: typeof Users; label: string; value: number }> = [
    { icon: Users, label: t('token_plan.team.seats_purchased', 'Purchased'), value: overview.seatsPurchased },
    { icon: UserCheck, label: t('token_plan.team.seats_used', 'Assigned'), value: overview.seatsUsed },
    { icon: TicketCheck, label: t('token_plan.team.seats_available', 'Available'), value: overview.seatsAvailable },
    { icon: UsersRound, label: t('token_plan.team.members_total', 'Organization members'), value: composition.membersTotal },
    { icon: UserPlus, label: t('token_plan.team.unlicensed_members', 'Waiting for a seat'), value: composition.unlicensedMembers },
  ];

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-zinc-950"
      data-team-subscription-summary
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {t('token_plan.team.current_plan', 'Current plan')}
          </p>
          <h2 className="mt-1 truncate text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {overview.planName ?? t('token_plan.team.title', 'Team subscription')}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500 dark:text-slate-400">
            <CalendarClock aria-hidden="true" className="h-4 w-4 shrink-0" />
            {startsAt && expiresAt
              ? `${startsAt} – ${expiresAt}`
              : expiresAt
                ? t('token_plan.team.renews_on', { date: expiresAt })
                : t('token_plan.team.period', 'Billing period')}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
            <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
            {t(statusCopy.key, statusCopy.fallback)}
          </span>
          {onBuyMoreSeats ? (
            <Button onClick={onBuyMoreSeats} type="button" variant="secondary">
              {t('token_plan.team.buy_more_seats', 'Buy more seats')}
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">
            {t('token_plan.team.seats_used', 'Assigned')}
          </span>
          <span className="tabular-nums text-slate-500 dark:text-slate-400">
            {overview.seatsUsed} / {overview.seatsPurchased}
          </span>
        </div>
        <div
          aria-label={t('token_plan.team.seats_used', 'Assigned')}
          aria-valuemax={Math.max(overview.seatsPurchased, overview.seatsUsed)}
          aria-valuemin={0}
          aria-valuenow={overview.seatsUsed}
          className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
          role="progressbar"
        >
          <div
            className={`h-full rounded-full transition-[width] ${
              composition.overSeat ? 'bg-amber-500' : 'bg-lobster-500'
            }`}
            style={{ width: `${seatPercent}%` }}
          />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => {
          const Icon = tile.icon;
          return (
            <div
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 dark:border-white/10 dark:bg-white/5"
              key={tile.label}
            >
              <dt className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{tile.label}</span>
              </dt>
              <dd className="mt-1.5 text-xl font-semibold tabular-nums text-slate-950 dark:text-white">
                {tile.value}
              </dd>
            </div>
          );
        })}
      </dl>

      {hasUnlicensedMembers ? (
        <div
          className="mt-5 flex items-start gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
          data-team-over-seat
        >
          <TriangleAlert aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">
              {t('token_plan.team.over_seat_warning', {
                count: composition.unlicensedMembers,
              })}
            </p>
            <p className="mt-1 text-xs opacity-80">
              {t(
                'token_plan.team.over_seat_hint',
                'Assign a free seat, revoke a member, or buy more seats.',
              )}
            </p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
