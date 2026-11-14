import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Layers, ShieldCheck } from 'lucide-react';
import { Button, StatusNotice } from '@sdkwork/ui-pc-react';

import { resolveTeamPlanErrorCopy } from './teamPlanErrorCopy.ts';
import {
  normalizeTeamPlanError,
  updateTeamSeatPolicy,
  type TeamPlanServiceError,
  type TeamSeatPolicy,
  type TeamSubscriptionOverview,
} from './teamSubscriptionService.ts';
import type { TeamPlanNotify } from './TeamPlanCards.tsx';

export interface TeamSeatPolicyProps {
  onNotify: TeamPlanNotify;
  /** Receives the overview returned by the policy endpoint. */
  onUpdated: (overview: TeamSubscriptionOverview) => void;
  overview: TeamSubscriptionOverview;
}

const POLICY_OPTIONS: ReadonlyArray<{
  descriptionFallback: string;
  descriptionKey: string;
  icon: typeof Layers;
  labelFallback: string;
  labelKey: string;
  value: TeamSeatPolicy;
}> = [
  {
    descriptionFallback: 'Block assignments beyond purchased seats and prompt an upgrade.',
    descriptionKey: 'token_plan.team.policy_strict_hint',
    icon: ShieldCheck,
    labelFallback: 'Strict capacity',
    labelKey: 'token_plan.team.policy_strict',
    value: 'strict',
  },
  {
    descriptionFallback: 'Allow more assignments than purchased seats and reconcile billing later.',
    descriptionKey: 'token_plan.team.policy_flex_hint',
    icon: Layers,
    labelFallback: 'Allow overflow',
    labelKey: 'token_plan.team.policy_flex',
    value: 'flex_overflow',
  },
];

/**
 * Organization seat policy form.
 *
 * The form keeps a local draft and re-renders from the overview the endpoint
 * returns; nothing is shown as saved before the server accepts it.
 */
export function TeamSeatPolicy({ onNotify, onUpdated, overview }: TeamSeatPolicyProps) {
  const { t } = useTranslation();
  const [autoAssignSeat, setAutoAssignSeat] = useState(overview.autoAssignSeat);
  const [seatPolicy, setSeatPolicy] = useState<TeamSeatPolicy>(overview.seatPolicy);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<TeamPlanServiceError | null>(null);

  const isDirty = autoAssignSeat !== overview.autoAssignSeat || seatPolicy !== overview.seatPolicy;
  const errorCopy = saveError ? resolveTeamPlanErrorCopy(saveError.reason) : null;

  function handleSave(): void {
    if (isSaving || !isDirty) {
      return;
    }
    setSaveError(null);
    setIsSaving(true);

    void updateTeamSeatPolicy({ autoAssignSeat, seatPolicy })
      .then((nextOverview) => {
        // Re-render from the returned overview instead of an optimistic patch.
        setAutoAssignSeat(nextOverview.autoAssignSeat);
        setSeatPolicy(nextOverview.seatPolicy);
        onUpdated(nextOverview);
        onNotify(t('token_plan.team.policy_saved', 'Seat policy updated.'), 'success');
      })
      .catch((error: unknown) => {
        setSaveError(normalizeTeamPlanError(error));
      })
      .finally(() => {
        setIsSaving(false);
      });
  }

  return (
    <section
      className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-white/10 dark:bg-zinc-950"
      data-team-seat-policy
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight text-slate-950 dark:text-white">
            {t('token_plan.team.policy_title', 'Seat policy')}
          </h2>
          <p className="mt-1 max-w-xl text-sm leading-6 text-slate-500 dark:text-slate-400">
            {t(
              'token_plan.team.seat_management_desc',
              'Each member can hold at most one seat. Revoking a seat frees it for another member.',
            )}
          </p>
        </div>
      </div>

      {saveError && errorCopy ? (
        <div className="mt-4">
          <StatusNotice
            title={t(errorCopy.key, {
              defaultValue: errorCopy.fallback,
              seats: overview.seatsPurchased,
            })}
            tone="danger"
          />
        </div>
      ) : null}

      <div className="mt-5 flex items-start justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900 dark:text-white">
            {t('token_plan.team.auto_assign', 'Assign new members automatically')}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {t(
              'token_plan.team.auto_assign_hint',
              'When a seat is free, a newly joined member receives it automatically.',
            )}
          </p>
        </div>
        <button
          aria-checked={autoAssignSeat}
          aria-label={t('token_plan.team.auto_assign', 'Assign new members automatically')}
          className={`relative mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-black ${
            autoAssignSeat
              ? 'border-lobster-500 bg-lobster-500'
              : 'border-slate-300 bg-slate-200 dark:border-white/20 dark:bg-white/10'
          }`}
          disabled={isSaving}
          onClick={() => setAutoAssignSeat((current) => !current)}
          role="switch"
          type="button"
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
              autoAssignSeat ? 'translate-x-[1.375rem]' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      <fieldset className="mt-4" disabled={isSaving}>
        <legend className="text-sm font-medium text-slate-900 dark:text-white">
          {t('token_plan.team.seat_policy', 'Over-seat policy')}
        </legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2" role="radiogroup">
          {POLICY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = seatPolicy === option.value;
            return (
              <button
                aria-checked={isSelected}
                className={`flex items-start gap-3 rounded-md border px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                  isSelected
                    ? 'border-lobster-500 bg-lobster-500/[0.06]'
                    : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-zinc-950 dark:hover:bg-white/5'
                }`}
                key={option.value}
                onClick={() => setSeatPolicy(option.value)}
                role="radio"
                type="button"
              >
                <span
                  className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    isSelected
                      ? 'bg-lobster-500 text-white'
                      : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300'
                  }`}
                >
                  <Icon aria-hidden="true" className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-950 dark:text-white">
                    {t(option.labelKey, option.labelFallback)}
                    {isSelected ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-lobster-500" /> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {t(option.descriptionKey, option.descriptionFallback)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 flex items-center justify-end gap-3">
        <Button
          className="bg-lobster-500 text-white hover:bg-lobster-600 focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-40"
          disabled={!isDirty || isSaving}
          loading={isSaving}
          onClick={handleSave}
          type="button"
        >
          {isSaving
            ? t('token_plan.team.policy_saving', 'Saving…')
            : t('token_plan.team.policy_save', 'Save policy')}
        </Button>
      </div>
    </section>
  );
}
