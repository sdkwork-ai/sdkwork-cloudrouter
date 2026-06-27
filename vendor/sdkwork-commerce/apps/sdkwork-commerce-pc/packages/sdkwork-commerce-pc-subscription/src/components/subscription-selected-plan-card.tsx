import { StatusNotice } from "@sdkwork/ui-pc-react";
import type { SdkworkMembershipPlan } from "@sdkwork/commerce-pc-membership";
import {
  createSdkworkSubscriptionPanelStyle,
  createSdkworkSubscriptionToneStyle,
} from "../subscription-appearance";
import { useSdkworkSubscriptionIntl } from "../subscription-intl";

export interface SdkworkSubscriptionSelectedPlanCardProps {
  selectedPlan: SdkworkMembershipPlan | null;
}

export function SdkworkSubscriptionSelectedPlanCard({
  selectedPlan,
}: SdkworkSubscriptionSelectedPlanCardProps) {
  const {
    copy,
    formatCurrencyCny,
    formatDurationDays,
    formatPoints,
  } = useSdkworkSubscriptionIntl();

  if (!selectedPlan) {
    return (
      <StatusNotice title={copy.selectedPlan.noPlanSelectedTitle}>
        {copy.selectedPlan.noPlanSelectedDescription}
      </StatusNotice>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[1.75rem] border border-[var(--sdk-color-border-default)] px-5 py-5 shadow-[var(--sdk-shadow-soft)]"
      style={createSdkworkSubscriptionPanelStyle("accent", {
        backgroundWeight: 10,
        surfaceWeight: 96,
      })}
    >
      <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
        {copy.selectedPlan.eyebrow}
      </div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-2xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
            {selectedPlan.name}
          </div>
          <div className="mt-2 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
            {selectedPlan.description || copy.selectedPlan.fallbackDescription}
          </div>
        </div>

        <div className="text-right">
          <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
            {copy.priceSummary.amountDueLabel}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
            {formatCurrencyCny(selectedPlan.priceCny)}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold shadow-[var(--sdk-shadow-soft)]"
          style={createSdkworkSubscriptionToneStyle("neutral", {
            backgroundWeight: 10,
            borderWeight: 18,
          })}
        >
          {formatDurationDays(selectedPlan.durationDays)}
        </span>
        <span
          className="rounded-full border px-3 py-1 text-xs font-semibold shadow-[var(--sdk-shadow-soft)]"
          style={createSdkworkSubscriptionToneStyle("neutral", {
            backgroundWeight: 10,
            borderWeight: 18,
          })}
        >
          {formatPoints(selectedPlan.includedPoints)} {copy.common.points}
        </span>
        {selectedPlan.tags.map((tag) => (
          <span
            className="rounded-full border px-3 py-1 text-xs font-semibold shadow-[var(--sdk-shadow-soft)]"
            key={`${selectedPlan.id}-${tag}`}
            style={createSdkworkSubscriptionToneStyle("neutral", {
              backgroundWeight: 10,
              borderWeight: 18,
            })}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
