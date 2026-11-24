import { Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { MembershipTranslate } from '../catalog/membershipDefinition.js';
import type { MembershipTeamCatalog } from '../runtime.js';
import {
  buildTeamCycleOptions,
  clampTeamSeatCount,
  computeTeamSeatTotal,
  formatTeamCnyAmount,
  groupTeamPlanPackages,
  parseTeamSeatInput,
  resolveAdditionalSeatBounds,
  resolveDefaultAdditionalSeatCount,
  resolveDefaultTeamSeatCount,
  resolveTeamPeriodLabel,
  resolveTeamSeatBounds,
  selectTeamPlanPackage,
  type TeamCycleOption,
  type TeamSeatBounds,
} from '../team/teamPricing.js';
import type { TeamPackage, TeamSubscriptionOverview } from '../team/teamContract.js';

export type TeamPlanMode = 'expand' | 'subscribe';

export interface TeamBuyDraft {
  readonly action: 'add_seats' | 'purchase';
  readonly originalPriceLabel?: string;
  readonly packageId: string;
  readonly packageName: string;
  readonly periodLabel: string;
  readonly seats: number;
  readonly total: number;
  readonly targetPlanName?: string;
}

export interface TeamPlanCardsProps {
  readonly busy: boolean;
  readonly catalog: MembershipTeamCatalog;
  readonly mode: TeamPlanMode;
  readonly onBuy: (draft: TeamBuyDraft) => void;
  readonly overview: TeamSubscriptionOverview | null;
  readonly t: MembershipTranslate;
}

function seatBoundsFor(
  mode: TeamPlanMode,
  pkg: TeamPackage,
): TeamSeatBounds {
  const bounds = resolveTeamSeatBounds(pkg);
  return mode === 'expand' ? resolveAdditionalSeatBounds(bounds) : bounds;
}

function defaultSeatsFor(
  mode: TeamPlanMode,
  pkg: TeamPackage,
  overview: TeamSubscriptionOverview | null,
): number {
  const bounds = resolveTeamSeatBounds(pkg);
  return mode === 'expand'
    ? resolveDefaultAdditionalSeatCount(bounds)
    : resolveDefaultTeamSeatCount(bounds, overview?.seatsPurchased ?? 0);
}

interface SeatStepperProps {
  readonly bounds: TeamSeatBounds;
  readonly busy: boolean;
  readonly onChange: (seats: number) => void;
  readonly t: MembershipTranslate;
  readonly value: number;
}

function SeatStepper({ bounds, busy, onChange, t, value }: SeatStepperProps) {
  const [text, setText] = useState<string>(String(value));
  const [editing, setEditing] = useState(false);
  const display = editing ? text : String(value);
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label={t('team.seats.decrease', '减少坐席')}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-[16px] text-ink disabled:opacity-40"
        disabled={busy || value <= bounds.min}
        onClick={() => onChange(Math.max(bounds.min, value - 1))}
        type="button"
      >
        −
      </button>
      <input
        aria-label={t('team.seats.count', '坐席数量')}
        className="h-9 w-16 rounded-lg border border-line bg-surface text-center text-[14px] font-semibold tabular-nums text-ink outline-none focus:border-brand"
        inputMode="numeric"
        onBlur={() => {
          setEditing(false);
          const normalized = clampTeamSeatCount(parseTeamSeatInput(text, bounds), bounds);
          setText(String(normalized));
          onChange(normalized);
        }}
        onChange={(event) => {
          setEditing(true);
          setText(event.target.value.replaceAll(/[^0-9]/gu, '').slice(0, 5));
        }}
        value={display}
      />
      <button
        aria-label={t('team.seats.increase', '增加坐席')}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-[16px] text-ink disabled:opacity-40"
        disabled={busy || value >= bounds.max}
        onClick={() => onChange(Math.min(bounds.max, value + 1))}
        type="button"
      >
        +
      </button>
      <span className="text-[11px] tabular-nums text-ink-subtle">
        {bounds.min}–{bounds.max}
      </span>
    </div>
  );
}

/**
 * Mobile team plan cards: one card per team plan for the selected billing cycle.
 *
 * Both modes share the card: `subscribe` buys a new team subscription with the
 * total seat count, `expand` adds seats to the active subscription. Seat counts
 * are stepper-first (no dense table) and the total is always per-seat price ×
 * seats, matching the PC pricing rule.
 */
export function TeamPlanCards({
  busy,
  catalog,
  mode,
  onBuy,
  overview,
  t,
}: TeamPlanCardsProps) {
  const cycleOptions = useMemo(
    () => buildTeamCycleOptions(catalog.packages, catalog.groups, t),
    [catalog, t],
  );
  const [activeCycleKey, setActiveCycleKey] = useState<string>('');
  const activeOption: TeamCycleOption | undefined = cycleOptions.find(
    (option) => option.key === activeCycleKey,
  ) ?? cycleOptions[0];
  const planGroups = useMemo(
    () => groupTeamPlanPackages(activeOption?.packages ?? []),
    [activeOption],
  );
  const [seatDrafts, setSeatDrafts] = useState<Record<string, number>>({});

  if (catalog.packages.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-[13px] text-ink-subtle">
        {t('team.plans.empty', '暂无团队订阅套餐。')}
      </div>
    );
  }

  return (
    <section data-team-plan-cards>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cycleOptions.map((option) => {
          const selected = option.key === activeOption?.key;
          return (
            <button
              aria-selected={selected}
              className={`min-h-10 shrink-0 rounded-full border px-3.5 text-[13px] font-medium ${
                selected
                  ? 'border-brand bg-brand-fill text-on-brand'
                  : 'border-line bg-surface text-ink-muted'
              }`}
              key={option.key}
              onClick={() => setActiveCycleKey(option.key)}
              role="tab"
              type="button"
            >
              {option.label}
              {option.description ? (
                <span
                  className={`ml-1 rounded px-1 py-0.5 text-[10px] font-semibold ${
                    selected ? 'bg-white/20 text-white' : 'bg-brand-soft text-brand'
                  }`}
                >
                  {option.description}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-col gap-3">
        {planGroups.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-8 text-center text-[13px] text-ink-subtle">
            {t('team.plans.emptyCycle', '该计费周期暂无可选团队套餐。')}
          </p>
        ) : null}
        {planGroups.map((group) => {
          const pkg = selectTeamPlanPackage(group, activeOption);
          if (!pkg) {
            return null;
          }
          const bounds = seatBoundsFor(mode, pkg);
          const draftKey = `${mode}:${activeOption?.key ?? ''}:${group.key}`;
          const seats = seatDrafts[draftKey] ?? defaultSeatsFor(mode, pkg, overview);
          const unitPrice = Number(pkg.price);
          const total = computeTeamSeatTotal(unitPrice, seats);
          const originalUnit = Number(pkg.originalPrice);
          const originalTotal = Number.isFinite(originalUnit) && originalUnit > 0
            ? computeTeamSeatTotal(originalUnit, seats)
            : null;
          const cycle = activeOption?.billingCycle ?? null;
          const periodLabel = `${t('team.plans.seatCount', '{{seats}} 个坐席').replace(
            '{{seats}}',
            String(seats),
          )} · ${resolveTeamPeriodLabel(cycle, t)}`;
          const pointsPerSeat = Number(pkg.seatPointsAmount);
          return (
            <article
              className="rounded-2xl border border-line bg-surface p-4"
              data-team-plan={group.key}
              key={group.key}
            >
              <header className="flex items-start justify-between gap-2">
                <h3 className="text-[16px] font-semibold text-ink">
                  {group.planName}
                </h3>
                {group.recommended ? (
                  <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                    {t('team.plans.recommended', '推荐')}
                  </span>
                ) : null}
              </header>

              <div className="mt-2 flex flex-wrap items-baseline gap-1.5">
                <span className="text-[22px] font-bold leading-none text-ink">
                  {formatTeamCnyAmount(unitPrice)}
                </span>
                <span className="text-[12px] text-ink-subtle">
                  {t('team.plans.perSeat', '/ 坐席')}
                  {resolveTeamPeriodLabel(cycle, t)}
                </span>
                {originalTotal !== null ? (
                  <span className="text-[11px] text-ink-subtle line-through">
                    {formatTeamCnyAmount(originalUnit)}
                  </span>
                ) : null}
              </div>
              {pointsPerSeat > 0 ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-ink-muted">
                  <Sparkles aria-hidden="true" className="h-3 w-3 text-amber-500" />
                  {t('team.plans.seatPoints', '每坐席 {{points}} 算力积分').replace(
                    '{{points}}',
                    new Intl.NumberFormat('zh-CN').format(pointsPerSeat),
                  )}
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-[12px] font-medium text-ink-muted">
                  {mode === 'expand'
                    ? t('team.plans.addSeatsLabel', '扩容坐席数')
                    : t('team.seats.count', '坐席数量')}
                </span>
                <SeatStepper
                  bounds={bounds}
                  busy={busy}
                  onChange={(next) =>
                    setSeatDrafts((current) => ({ ...current, [draftKey]: next }))}
                  t={t}
                  value={seats}
                />
              </div>

              <div className="mt-3 flex items-end justify-between gap-2 rounded-xl border border-line bg-canvas px-3 py-2">
                <div className="min-w-0">
                  <p className="text-[11px] text-ink-subtle">
                    {mode === 'expand'
                      ? t('team.plans.addHint', '在现有坐席基础上新增，不改变到期时间')
                      : t('team.plans.subscribeHint', '开通后按套餐等级与坐席数生效')}
                  </p>
                  <p className="mt-0.5 text-[11px] text-ink-muted">{periodLabel}</p>
                </div>
                <div className="text-right">
                  <p className="text-[18px] font-bold leading-none text-brand tabular-nums">
                    {formatTeamCnyAmount(total)}
                  </p>
                  {originalTotal !== null ? (
                    <p className="mt-0.5 text-[11px] text-ink-subtle line-through tabular-nums">
                      {formatTeamCnyAmount(originalTotal)}
                    </p>
                  ) : null}
                </div>
              </div>

              <button
                className="mt-3 min-h-11 w-full rounded-full bg-brand-fill text-[14px] font-semibold text-on-brand active:bg-brand-fill-strong disabled:opacity-60"
                disabled={busy || seats < bounds.min || seats > bounds.max}
                onClick={() => onBuy({
                  action: mode === 'expand' ? 'add_seats' : 'purchase',
                  ...(originalTotal !== null
                    ? { originalPriceLabel: formatTeamCnyAmount(originalTotal) }
                    : {}),
                  packageId: pkg.id,
                  packageName: group.planName,
                  periodLabel,
                  seats,
                  total,
                  ...(group.planName ? { targetPlanName: group.planName } : {}),
                })}
                type="button"
              >
                {mode === 'expand'
                  ? t('team.plans.addSeatsCta', '扩容 {{seats}} 个坐席')
                    .replace('{{seats}}', String(seats))
                  : t('team.plans.subscribeCta', '开通 {{seats}} 个坐席')
                    .replace('{{seats}}', String(seats))}
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
