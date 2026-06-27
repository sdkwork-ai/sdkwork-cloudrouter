import type { ReactNode } from "react";
import {
  ArrowLeft,
  CreditCard,
  LayoutGrid,
  LockKeyhole,
} from "lucide-react";
import {
  Button,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import type {
  SdkworkMembershipPlan,
  SdkworkMembershipSummary,
} from "@sdkwork/commerce-pc-membership";
import type {
  SdkworkSubscriptionAction,
  SdkworkSubscriptionCheckoutEstimate,
  SdkworkSubscriptionStage,
} from "../subscription";
import {
  createSdkworkSubscriptionPanelStyle,
  createSdkworkSubscriptionToneStyle,
} from "../subscription-appearance";
import { useSdkworkSubscriptionIntl } from "../subscription-intl";
import { SdkworkSubscriptionSelectedPlanCard } from "./subscription-selected-plan-card";

export interface SdkworkSubscriptionStageShellProps {
  activeAction: SdkworkSubscriptionAction;
  activeStage: SdkworkSubscriptionStage;
  checkout: SdkworkSubscriptionCheckoutEstimate;
  couponCount: number;
  isAuthenticated: boolean;
  onBackToPlans: () => void;
  onContinueToCheckout: () => void;
  paymentContent: ReactNode;
  planContent: ReactNode;
  planCount: number;
  selectedPlan: SdkworkMembershipPlan | null;
  summary: SdkworkMembershipSummary;
}

export function SdkworkSubscriptionStageShell({
  activeAction,
  activeStage,
  checkout,
  couponCount,
  isAuthenticated,
  onBackToPlans,
  onContinueToCheckout,
  paymentContent,
  planContent,
  planCount,
  selectedPlan,
  summary,
}: SdkworkSubscriptionStageShellProps) {
  const {
    copy,
    formatCurrencyCny,
    formatDurationDays,
    formatPoints,
    resolveActionLabel,
  } = useSdkworkSubscriptionIntl();
  const actionLabel = resolveActionLabel(activeAction);
  const isPlanStage = activeStage === "plans";

  return (
    <section className="space-y-6">
      <div
        className="relative overflow-hidden rounded-[2rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-md)]"
        style={createSdkworkSubscriptionPanelStyle("accent", {
          backgroundWeight: 8,
          surfaceWeight: 98,
        })}
      >
        <div className="relative px-6 py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
                {copy.stageShell.purchaseStagesEyebrow}
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
                {isPlanStage ? copy.stageShell.planStageTitle : copy.stageShell.checkoutTitle}
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
                {isPlanStage ? copy.stageShell.planStageDescription : copy.stageShell.checkoutDescription}
              </p>
            </div>

            {isPlanStage ? (
              <div className="rounded-full bg-[var(--sdk-color-surface-panel-muted)] px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-secondary)]">
                {copy.stageShell.twoStepFlow}
              </div>
            ) : (
              <Button onClick={onBackToPlans} type="button" variant="ghost">
                <ArrowLeft className="h-4 w-4" />
                {copy.actions.backToPlans}
              </Button>
            )}
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div
              className={`rounded-[1.6rem] border px-4 py-4 shadow-[var(--sdk-shadow-soft)] ${
                isPlanStage
                  ? ""
                  : "border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)]"
              }`}
              style={isPlanStage
                ? createSdkworkSubscriptionPanelStyle("brand", {
                  backgroundWeight: 10,
                  surfaceColor: "var(--sdk-color-surface-panel-muted)",
                  surfaceWeight: 98,
                })
                : undefined}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[1rem] border"
                  style={createSdkworkSubscriptionToneStyle("brand", {
                    backgroundWeight: 14,
                    borderWeight: 26,
                  })}
                >
                  <LayoutGrid className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.stageShell.stepPlanTitle}</div>
                  <div className="mt-1 text-xs text-[var(--sdk-color-text-secondary)]">
                    {copy.stageShell.stepPlanDescription}
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`rounded-[1.6rem] border px-4 py-4 shadow-[var(--sdk-shadow-soft)] ${
                isPlanStage
                  ? "border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)]"
                  : ""
              }`}
              style={!isPlanStage
                ? createSdkworkSubscriptionPanelStyle("success", {
                  backgroundWeight: 10,
                  surfaceColor: "var(--sdk-color-surface-panel-muted)",
                  surfaceWeight: 98,
                })
                : undefined}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-[1rem] border"
                  style={createSdkworkSubscriptionToneStyle("success", {
                    backgroundWeight: 14,
                    borderWeight: 26,
                  })}
                >
                  <CreditCard className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{copy.stageShell.stepCheckoutTitle}</div>
                  <div className="mt-1 text-xs text-[var(--sdk-color-text-secondary)]">
                    {copy.stageShell.stepCheckoutDescription}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isPlanStage ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(24rem,0.92fr)]">
          <div>{planContent}</div>

          <aside className="overflow-hidden rounded-[2rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-6 shadow-[var(--sdk-shadow-md)]">
            <div
              className="rounded-[1.6rem] border px-4 py-4 text-sm text-[var(--sdk-color-text-primary)] shadow-[var(--sdk-shadow-soft)]"
              style={createSdkworkSubscriptionPanelStyle("brand", {
                backgroundWeight: 10,
                surfaceWeight: 94,
              })}
            >
              <div className="font-semibold">{copy.stageShell.readyTitle}</div>
              <div className="mt-1 text-xs leading-5">
                {copy.stageShell.readyDescription}
              </div>
            </div>

            <div className="mt-5">
              <SdkworkSubscriptionSelectedPlanCard selectedPlan={selectedPlan} />
            </div>

            <div className="mt-5 rounded-[1.6rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-5 py-5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--sdk-color-text-secondary)]">{copy.stageShell.currentLevelLabel}</span>
                <span className="font-semibold text-[var(--sdk-color-text-primary)]">{summary.currentLevelName}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--sdk-color-text-secondary)]">{copy.stageShell.plannedActionLabel}</span>
                <span className="font-semibold text-[var(--sdk-color-text-primary)]">{actionLabel}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--sdk-color-text-secondary)]">{copy.stageShell.availablePlansLabel}</span>
                <span className="font-semibold text-[var(--sdk-color-text-primary)]">{planCount}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--sdk-color-text-secondary)]">{copy.stageShell.couponsReadyLabel}</span>
                <span className="font-semibold text-[var(--sdk-color-text-primary)]">{couponCount}</span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-[var(--sdk-color-text-secondary)]">{copy.stageShell.checkoutAmountLabel}</span>
                <span className="font-semibold text-[var(--sdk-color-text-primary)]">
                  {formatCurrencyCny(checkout.payableAmountCny)}
                </span>
              </div>
            </div>

            {!isAuthenticated ? (
              <StatusNotice className="mt-5" title={copy.stageShell.signInRequiredTitle} tone="warning">
                {copy.stageShell.signInRequiredDescription}
              </StatusNotice>
            ) : null}

            <Button
              className="mt-6 w-full rounded-2xl py-6 text-base font-semibold"
              disabled={!selectedPlan}
              onClick={onContinueToCheckout}
              type="button"
            >
              {copy.actions.continueToCheckout}
            </Button>
          </aside>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.04fr)_minmax(24rem,0.96fr)]">
          <section
            className="overflow-hidden rounded-[2rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-md)]"
            style={createSdkworkSubscriptionPanelStyle("accent", {
              backgroundWeight: 8,
              surfaceWeight: 98,
            })}
          >
            <div className="relative px-6 py-6">
              <div className="relative">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-2xl">
                    <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
                      {copy.stageShell.lockedPackageLabel}
                    </div>
                    <h3 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
                      {copy.stageShell.checkoutTitle}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
                      {copy.stageShell.checkoutDescription}
                    </p>
                  </div>

                  <div
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] shadow-sm"
                    style={createSdkworkSubscriptionToneStyle("neutral", {
                      backgroundWeight: 10,
                      borderWeight: 18,
                    })}
                  >
                    <LockKeyhole className="h-3.5 w-3.5" />
                    {copy.stageShell.lockedBadge}
                  </div>
                </div>

                <div className="mt-6">
                  <SdkworkSubscriptionSelectedPlanCard selectedPlan={selectedPlan} />
                </div>

                {selectedPlan ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.4rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-4 py-4">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
                        {copy.stageShell.priceLabel}
                      </div>
                      <div className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
                        {formatCurrencyCny(selectedPlan.priceCny)}
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-4 py-4">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
                        {copy.stageShell.durationLabel}
                      </div>
                      <div className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
                        {formatDurationDays(selectedPlan.durationDays)}
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-4 py-4">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
                        {copy.stageShell.includedPointsLabel}
                      </div>
                      <div className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">
                        {formatPoints(selectedPlan.includedPoints)} {copy.common.points}
                      </div>
                    </div>
                    <div className="rounded-[1.4rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-4 py-4">
                      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
                        {copy.stageShell.actionLabel}
                      </div>
                      <div className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{actionLabel}</div>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6 rounded-[1.5rem] border border-dashed border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-4 py-4 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
                  {copy.stageShell.checkoutAmountLabel} {formatCurrencyCny(checkout.payableAmountCny)}. {copy.stageShell.checkoutStatusDescription}
                </div>
              </div>
            </div>
          </section>

          <div>{paymentContent}</div>
        </div>
      )}
    </section>
  );
}
