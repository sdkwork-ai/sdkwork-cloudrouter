import { useEffect, useState } from "react";
import {
  CreditCard,
  Crown,
} from "lucide-react";
import {
  Button,
} from "@sdkwork/ui-pc-react/components/ui/button";
import {
  StatusNotice,
} from "@sdkwork/ui-pc-react/components/ui/feedback/states";
import {
  createSdkworkMembershipPanelStyle,
  createSdkworkMembershipToneStyle,
  formatSdkworkMembershipDurationLabel,
  formatSdkworkMembershipIncludedPointsLabel,
  type SdkworkMembershipController,
  type SdkworkMembershipPlan,
} from "@sdkwork/commerce-pc-membership";
import { createMembershipCheckoutRouteIntent } from "@sdkwork/commerce-pc-membership";
import { formatSdkworkCommerceCurrencyCny as formatSdkworkCurrencyCny } from "@sdkwork/commerce-service";
import { resolveSdkworkMembershipPurchaseMode } from "../membership-purchase";
import { useSdkworkMembershipPurchaseIntl } from "../membership-purchase-intl";
import {
  sdkworkMembershipPurchaseService,
  type SdkworkMembershipPurchaseService,
} from "../membership-purchase-service";

export interface SdkworkMembershipPurchaseMenuProps {
  checkoutBasePath?: string;
  controller: SdkworkMembershipController;
  onNavigate?: (route: string) => void;
  onOpenCenter?: () => void;
  onPurchased?: (plan: SdkworkMembershipPlan) => void;
  purchaseFlow?: "checkout" | "direct";
  purchaseService?: Pick<SdkworkMembershipPurchaseService, "submitPackagePurchase">;
}

const PAYMENT_METHODS = ["WECHAT", "ALIPAY"] as const;

function resolveMembershipPurchaseFlow(
  purchaseFlow: SdkworkMembershipPurchaseMenuProps["purchaseFlow"],
  onNavigate?: (route: string) => void,
): "checkout" | "direct" {
  if (purchaseFlow === "direct") {
    return "direct";
  }

  if (purchaseFlow === "checkout") {
    return "checkout";
  }

  return onNavigate ? "checkout" : "direct";
}

export function SdkworkMembershipPurchaseMenu({
  checkoutBasePath,
  controller,
  onNavigate,
  onOpenCenter,
  onPurchased,
  purchaseFlow,
  purchaseService,
}: SdkworkMembershipPurchaseMenuProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<(typeof PAYMENT_METHODS)[number]>("WECHAT");
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(controller.getState().selectedPlanId);
  const [state, setState] = useState(controller.getState());
  const {
    copy,
    formatPaymentMethod,
    locale,
  } = useSdkworkMembershipPurchaseIntl();
  const selectedPlan = state.dashboard.plans.find((plan) => plan.packageId === selectedPackageId)
    ?? state.dashboard.plans.find((plan) => plan.packageId === state.selectedPlanId)
    ?? state.dashboard.plans[0]
    ?? null;
  const mode = resolveSdkworkMembershipPurchaseMode({
    plan: selectedPlan,
    summary: state.dashboard.summary,
  });
  const resolvedPurchaseFlow = resolveMembershipPurchaseFlow(purchaseFlow, onNavigate);
  const usesCheckoutFlow = resolvedPurchaseFlow === "checkout";
  const canSubmit = Boolean(selectedPlan) && state.dashboard.summary.isAuthenticated && !state.isMutating && !isSubmitting;

  useEffect(() => controller.subscribe(() => {
    setState(controller.getState());
  }), [controller]);

  useEffect(() => {
    if (!state.isBootstrapped && !state.isLoading) {
      void controller.bootstrap();
    }
  }, [controller, state.isBootstrapped, state.isLoading]);

  useEffect(() => {
    if (selectedPackageId && state.dashboard.plans.some((plan) => plan.packageId === selectedPackageId)) {
      return;
    }

    setSelectedPackageId(
      state.dashboard.plans.find((plan) => plan.recommended)?.packageId
      ?? state.dashboard.plans[0]?.packageId
      ?? null,
    );
  }, [selectedPackageId, state.dashboard.plans]);

  function submitSelectedPlan(): void {
    if (!selectedPlan || !canSubmit) {
      return;
    }

    if (usesCheckoutFlow && onNavigate) {
      onNavigate(
        createMembershipCheckoutRouteIntent({
          basePath: checkoutBasePath,
          mode,
          plan: selectedPlan,
        }).route,
      );
      onPurchased?.(selectedPlan);
      return;
    }

    setPurchaseError(null);
    setIsSubmitting(true);
    const input = {
      packageId: selectedPlan.packageId,
      paymentMethod,
    };
    const request = (purchaseService ?? sdkworkMembershipPurchaseService).submitPackagePurchase({
      ...input,
      mode,
      plan: {
        durationDays: selectedPlan.durationDays,
        packageId: selectedPlan.packageId,
      },
      summary: state.dashboard.summary,
    }).then(async (result) => {
      await controller.refresh();
      return result;
    });

    void request.then(() => {
      onPurchased?.(selectedPlan);
    }).catch((error: unknown) => {
      setPurchaseError(error instanceof Error ? error.message : "Membership purchase failed.");
    }).finally(() => {
      setIsSubmitting(false);
    });
  }

  return (
    <div
      className="w-[min(92vw,30rem)] rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-4 shadow-[var(--sdk-shadow-lg)]"
      style={createSdkworkMembershipPanelStyle("brand", {
        backgroundWeight: 4,
        borderWeight: 18,
      })}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
            {copy.header.title}
          </div>
          <div className="mt-1 text-lg font-semibold text-[var(--sdk-color-text-primary)]">{copy.menu.title}</div>
        </div>
        <div
          className="flex h-10 w-10 items-center justify-center rounded-[1rem] border"
          style={createSdkworkMembershipToneStyle("accent", {
            backgroundWeight: 12,
            borderWeight: 24,
          })}
        >
          <Crown className="h-5 w-5" />
        </div>
      </div>

      {!state.dashboard.summary.isAuthenticated ? (
        <StatusNotice className="mt-4" title={copy.menu.signInRequiredTitle} tone="warning">
          {copy.menu.signInRequiredDescription}
        </StatusNotice>
      ) : null}

      {purchaseError ? (
        <StatusNotice className="mt-4" title={copy.menu.purchaseFailedTitle} tone="danger">
          {purchaseError}
        </StatusNotice>
      ) : null}

      <div className="mt-4 grid gap-3">
        {state.dashboard.plans.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-[var(--sdk-color-border-default)] px-4 py-6 text-sm text-[var(--sdk-color-text-secondary)]">
            <div className="font-semibold text-[var(--sdk-color-text-primary)]">{copy.menu.emptyTitle}</div>
            <div className="mt-2">{copy.menu.emptyDescription}</div>
          </div>
        ) : state.dashboard.plans.map((plan) => {
          const isSelected = selectedPlan?.packageId === plan.packageId;

          return (
            <button
              aria-pressed={isSelected}
              className="rounded-[1.25rem] border px-4 py-4 text-left"
              key={plan.id}
              onClick={() => {
                setSelectedPackageId(plan.packageId);
                controller.selectPlan(plan.packageId);
              }}
              style={createSdkworkMembershipPanelStyle(isSelected ? "accent" : "neutral", {
                backgroundWeight: isSelected ? 10 : 4,
                borderWeight: isSelected ? 28 : 14,
                surfaceColor: "var(--sdk-color-surface-panel-muted)",
              })}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold text-[var(--sdk-color-text-primary)]">{plan.name}</div>
                  <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                    {formatSdkworkMembershipDurationLabel(plan.durationDays, locale)}
                    {" · "}
                    {formatSdkworkMembershipIncludedPointsLabel(plan.includedPoints, locale)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-[var(--sdk-color-text-primary)]">
                    {formatSdkworkCurrencyCny(plan.priceCny, locale)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--sdk-color-text-muted)]">
                    {isSelected ? copy.actions.selected : copy.actions.selectPlan}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-4">
        {!usesCheckoutFlow ? (
          <>
            <div className="text-sm font-medium text-[var(--sdk-color-text-primary)]">{copy.menu.paymentMethod}</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <Button
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  type="button"
                  variant={paymentMethod === method ? "secondary" : "outline"}
                >
                  <CreditCard className="h-4 w-4" />
                  {formatPaymentMethod(method)}
                </Button>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-[1.25rem] border border-dashed border-[var(--sdk-color-border-default)] px-4 py-4 text-sm text-[var(--sdk-color-text-secondary)]">
            {copy.menu.checkoutFlowDescription}
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button onClick={onOpenCenter} type="button" variant="ghost">
          {copy.actions.openCenter}
        </Button>
        <Button disabled={!canSubmit} loading={state.isMutating || isSubmitting} onClick={submitSelectedPlan} type="button">
          {usesCheckoutFlow
            ? copy.actions.continueToCheckout
            : mode === "purchase"
              ? copy.actions.confirm
              : mode === "renew"
                ? copy.actions.renew
                : copy.actions.upgrade}
        </Button>
      </div>
    </div>
  );
}
