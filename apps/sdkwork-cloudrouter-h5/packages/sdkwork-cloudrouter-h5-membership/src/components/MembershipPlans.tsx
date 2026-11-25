import { Check, Sparkles } from 'lucide-react';

import type {
  MembershipBillingCycle,
  MembershipPlanCard,
  MembershipTranslate,
} from '../catalog/membershipDefinition.js';

export interface BillingCycleTabsProps {
  readonly cycles: readonly MembershipBillingCycle[];
  readonly onSelect: (index: number) => void;
  readonly selectedIndex: number;
  readonly t: MembershipTranslate;
}

/**
 * Billing-cycle switcher (the PC package groups).
 *
 * The PC surface renders a centered tab row; on a phone the same cycles are a
 * horizontally scrollable chip rail so the discount labels ("5.8折") stay
 * readable without shrinking the tap target below 44px.
 */
export function BillingCycleTabs({ cycles, onSelect, selectedIndex, t }: BillingCycleTabsProps) {
  if (cycles.length === 0) {
    return null;
  }

  return (
    <div className="mt-4" data-membership-billing-cycles>
      <p
        className="mb-2 px-3 text-[12px] font-medium text-ink-subtle"
        id="membership-billing-cycle-label"
      >
        {t('cycles.title', '选择计费周期')}
      </p>
      <div
        aria-labelledby="membership-billing-cycle-label"
        className="flex gap-2 overflow-x-auto px-3 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
      >
        {cycles.map((cycle, index) => {
          const selected = index === selectedIndex;
          return (
            <button
              aria-selected={selected}
              className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-medium transition-colors ${
                selected
                  ? 'border-brand bg-brand-fill text-on-brand'
                  : 'border-line bg-surface text-ink-muted'
              }`}
              key={`${cycle.label}-${index}`}
              onClick={() => onSelect(index)}
              role="tab"
              type="button"
            >
              <span>{cycle.label}</span>
              {cycle.discountLabel ? (
                <span
                  className={`rounded px-1 py-0.5 text-[10px] font-semibold ${
                    selected ? 'bg-white/20 text-white' : 'bg-brand-soft text-brand'
                  }`}
                >
                  {cycle.discountLabel}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface PlanCardListProps {
  readonly onSelect: (packageId: number) => void;
  readonly plans: readonly MembershipPlanCard[];
  readonly t: MembershipTranslate;
}

/**
 * Vertical plan cards for the selected billing cycle.
 *
 * One card per purchasable package, ordered by catalog weight. The card keeps
 * every field the PC plan card shows (level name, price, original price,
 * period, monthly compute credits, conversion rule, feature rows) but stacks
 * them for a single-column thumb scroll.
 */
export function PlanCardList({ onSelect, plans, t }: PlanCardListProps) {
  if (plans.length === 0) {
    return (
      <div className="mx-3 mt-3 rounded-xl bg-surface px-4 py-8 text-center text-[13px] text-ink-subtle">
        {t('plans.empty', '该计费周期暂无可选套餐')}
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-3 px-3" data-membership-plans>
      {plans.map((plan) => (
        <article
          className={`rounded-2xl border bg-surface p-4 ${
            plan.isCurrentPlan ? 'border-brand/60' : 'border-line'
          }`}
          data-membership-plan-card={plan.membershipTierKey}
          key={plan.id}
        >
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="flex flex-wrap items-center gap-1.5 text-[17px] font-semibold text-ink">
                {plan.name}
                {plan.recommended ? (
                  <span className="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                    {t('plans.recommended', '推荐')}
                  </span>
                ) : null}
                {plan.isCurrentPlan ? (
                  <span className="rounded bg-surface-elevated px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
                    {t('plans.current', '当前计划')}
                  </span>
                ) : null}
              </h3>
              {plan.subtitle ? (
                <p className="mt-1 text-[11px] leading-snug text-ink-subtle">{plan.subtitle}</p>
              ) : null}
            </div>
            {plan.discountTag ? (
              <span className="shrink-0 rounded-full bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
                {plan.discountTag}
              </span>
            ) : null}
          </header>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[13px] font-semibold text-ink">¥</span>
            <span className="text-[30px] font-bold leading-none tracking-tight text-ink">
              {plan.priceLabel.replace(/^¥/u, '')}
            </span>
            <span className="text-[12px] text-ink-subtle">{plan.periodLabel}</span>
            {plan.originalPriceLabel ? (
              <span className="text-[12px] text-ink-subtle line-through">
                {plan.originalPriceLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-3 rounded-xl border border-line bg-canvas px-3 py-2.5">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
              <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-amber-500" />
              {plan.pointsAllowanceLabel}
            </p>
            {plan.pointsConversionLabel ? (
              <p className="mt-0.5 text-[11px] text-ink-subtle">{plan.pointsConversionLabel}</p>
            ) : null}
          </div>

          <ul className="mt-3 space-y-2">
            {plan.features.map((feature) => (
              <li className="flex items-center justify-between gap-2" key={`${plan.id}-${feature.text}`}>
                <span className="flex min-w-0 items-center gap-2">
                  <Check
                    aria-hidden="true"
                    className={`h-3.5 w-3.5 shrink-0 ${
                      feature.mutedCheck ? 'text-transparent' : 'text-emerald-500'
                    }`}
                  />
                  <span className="truncate text-[12px] text-ink-muted">{feature.text}</span>
                </span>
                {feature.tag ? (
                  <span className="shrink-0 rounded border border-line bg-surface-elevated px-1.5 py-0.5 text-[10px] font-semibold text-ink-subtle">
                    {feature.tag}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          <button
            className={`mt-4 min-h-11 w-full rounded-full text-[14px] font-semibold transition-colors ${
              plan.isCurrentPlan
                ? 'cursor-not-allowed bg-surface-elevated text-ink-subtle'
                : 'bg-brand-fill text-on-brand active:bg-brand-fill-strong'
            }`}
            disabled={plan.isCurrentPlan || plan.packageId <= 0}
            onClick={() => onSelect(plan.packageId)}
            type="button"
          >
            {plan.isCurrentPlan
              ? t('cta.currentPlan', '当前计划')
              : plan.packageId <= 0
                ? t('cta.unavailable', '暂时无法购买')
                : t('cta.subscribe', '立即开通')}
          </button>
        </article>
      ))}
    </div>
  );
}
