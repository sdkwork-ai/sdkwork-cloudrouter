import { Button } from "@sdkwork/ui-pc-react";
import type {
  SdkworkMembershipBenefit,
  SdkworkMembershipSummary,
} from "@sdkwork/commerce-pc-membership";
import {
  createSdkworkSubscriptionPanelStyle,
  createSdkworkSubscriptionToneStyle,
} from "../subscription-appearance";
import { useSdkworkSubscriptionIntl } from "../subscription-intl";

export interface SdkworkSubscriptionPlanGridProps {
  benefits: SdkworkMembershipBenefit[];
  onSelectPlan: (packageId: number) => void;
  plans: Array<{
    description?: string | null;
    durationDays?: number | null;
    id: string;
    includedPoints: number;
    name: string;
    originalPriceCny?: number | null;
    packageId: number;
    priceCny: number;
    recommended: boolean;
    tags: string[];
  }>;
  selectedPackageId: number | null;
  summary: SdkworkMembershipSummary;
}

export function SdkworkSubscriptionPlanGrid({
  benefits,
  onSelectPlan,
  plans,
  selectedPackageId,
  summary,
}: SdkworkSubscriptionPlanGridProps) {
  const {
    copy,
    formatCurrentBalance,
    formatCurrencyCny,
    formatDurationDays,
    formatPoints,
  } = useSdkworkSubscriptionIntl();
  const isFreeCurrent = !summary.isMember;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-md)]">
      <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-6">
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
          {copy.planGrid.titleEyebrow}
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
          {copy.planGrid.title}
        </h2>
      </div>

      <div className="grid gap-5 px-6 py-6 xl:grid-cols-2">
        <article
          className={`flex h-full flex-col rounded-[1.9rem] border px-6 py-6 shadow-[var(--sdk-shadow-soft)] ${
            isFreeCurrent
              ? ""
              : "border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)]"
          }`}
          style={isFreeCurrent
            ? createSdkworkSubscriptionPanelStyle("brand", {
              backgroundWeight: 8,
              surfaceWeight: 94,
            })
            : undefined}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
                {copy.planGrid.freeMembershipTitle}
              </div>
              <div className="mt-3 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
                {copy.planGrid.freeMembershipDescription}
              </div>
            </div>

            <span
              className="rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] shadow-[var(--sdk-shadow-soft)]"
              style={isFreeCurrent
                ? createSdkworkSubscriptionToneStyle("brand", {
                  backgroundWeight: 12,
                  borderWeight: 24,
                })
                : undefined}
            >
              {isFreeCurrent ? copy.planGrid.currentTag : copy.planGrid.entryTier}
            </span>
          </div>

          <div className="mt-8 text-5xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
            {formatCurrencyCny(0)}
          </div>
          <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
            {summary.isAuthenticated ? copy.planGrid.noRecurringCharge : copy.planGrid.signInToActivatePremiumCheckout}
          </div>
          <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
            {formatCurrentBalance(summary.pointBalance ?? summary.points ?? 0)}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <span
              className="rounded-full border px-3 py-1 text-xs font-medium shadow-[var(--sdk-shadow-soft)]"
              style={createSdkworkSubscriptionToneStyle("neutral", {
                backgroundWeight: 10,
                borderWeight: 18,
              })}
            >
              {copy.planGrid.entryTier}
            </span>
            <span
              className="rounded-full border px-3 py-1 text-xs font-medium shadow-[var(--sdk-shadow-soft)]"
              style={createSdkworkSubscriptionToneStyle("neutral", {
                backgroundWeight: 10,
                borderWeight: 18,
              })}
            >
              {summary.currentLevelName}
            </span>
          </div>

          <Button
            className="mt-auto w-full rounded-2xl py-6 text-base font-semibold"
            disabled
            type="button"
            variant={isFreeCurrent ? "secondary" : "outline"}
          >
            {isFreeCurrent ? copy.planGrid.currentPlanButton : copy.planGrid.freeBaselineButton}
          </Button>
        </article>

        {plans.length === 0 ? (
          <div className="rounded-[1.6rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-10 text-sm text-[var(--sdk-color-text-secondary)]">
            {copy.planGrid.noPlans}
          </div>
        ) : plans.map((plan) => {
          const isSelected = plan.packageId === selectedPackageId;
          const showOriginalPrice = plan.originalPriceCny !== null
            && plan.originalPriceCny !== undefined
            && plan.originalPriceCny > plan.priceCny;

          return (
            <article
              className={`relative flex h-full flex-col rounded-[1.9rem] border px-6 py-6 shadow-[var(--sdk-shadow-soft)] ${
                isSelected
                  ? ""
                  : "border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)]"
              }`}
              key={plan.id}
              style={isSelected
                ? createSdkworkSubscriptionPanelStyle("accent", {
                  backgroundWeight: 12,
                  surfaceWeight: 96,
                })
                : undefined}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
                    {plan.name}
                  </div>
                  <div className="mt-3 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
                    {plan.description || copy.selectedPlan.fallbackDescription}
                  </div>
                </div>

                {plan.recommended ? (
                  <span
                    className="rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-white shadow-[var(--sdk-shadow-soft)]"
                    style={createSdkworkSubscriptionToneStyle("accent", {
                      backgroundWeight: 100,
                      borderWeight: 100,
                    })}
                  >
                    {copy.paymentMethods.recommended}
                  </span>
                ) : null}
              </div>

              <div className="mt-8">
                {showOriginalPrice ? (
                  <div className="text-sm text-[var(--sdk-color-text-muted)] line-through">
                    {formatCurrencyCny(plan.originalPriceCny)}
                  </div>
                ) : null}
                <div className="mt-2 text-5xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
                  {formatCurrencyCny(plan.priceCny)}
                </div>
              </div>

              <div
                className="mt-5 rounded-[1.5rem] border px-4 py-4 shadow-[var(--sdk-shadow-soft)]"
                style={createSdkworkSubscriptionPanelStyle("accent", {
                  backgroundWeight: 8,
                  borderWeight: 16,
                  surfaceColor: "var(--sdk-color-surface-panel-muted)",
                  surfaceWeight: 96,
                })}
              >
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
                  {copy.stageShell.selectedPackageLabel}
                </div>
                <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  {formatDurationDays(plan.durationDays)}
                </div>
                <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                  {formatPoints(plan.includedPoints)} {copy.common.points}
                </div>
              </div>

              {plan.tags.length > 0 ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {plan.tags.map((tag) => (
                    <span
                      className="rounded-full border px-3 py-1 text-xs font-medium shadow-[var(--sdk-shadow-soft)]"
                      key={`${plan.id}-${tag}`}
                      style={createSdkworkSubscriptionToneStyle("neutral", {
                        backgroundWeight: 10,
                        borderWeight: 18,
                      })}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}

              <Button
                className="mt-auto w-full rounded-2xl py-6 text-base font-semibold"
                onClick={() => onSelectPlan(plan.packageId)}
                type="button"
                variant={isSelected ? "primary" : "outline"}
              >
                {isSelected ? copy.actions.selectedPlan : copy.actions.selectPlan}
              </Button>
            </article>
          );
        })}
      </div>

      <div className="border-t border-[var(--sdk-color-border-subtle)] px-6 py-6">
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
          {copy.planGrid.benefitsEyebrow}
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {benefits.length === 0 ? (
            <div className="rounded-[1.4rem] border border-dashed border-[var(--sdk-color-border-default)] px-4 py-4 text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.planGrid.benefitsEmpty}
            </div>
          ) : benefits.map((benefit) => (
            <div
              className="min-w-[14rem] rounded-[1.4rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-4 py-4"
              key={benefit.id}
            >
              <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{benefit.name}</div>
              <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                {benefit.description || copy.planGrid.benefitFallback}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
