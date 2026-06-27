import { ShieldCheck } from "lucide-react";
import {
  Button,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import type { SdkworkMembershipPlan } from "@sdkwork/commerce-pc-membership";
import type {
  SdkworkSubscriptionAction,
  SdkworkSubscriptionCheckoutEstimate,
  SdkworkSubscriptionPaymentMethodOption,
} from "../subscription";
import {
  createSdkworkSubscriptionPanelStyle,
  createSdkworkSubscriptionToneStyle,
} from "../subscription-appearance";
import { useSdkworkSubscriptionIntl } from "../subscription-intl";
import type { SdkworkSubscriptionCoupon } from "../subscription-service";
import { SdkworkSubscriptionCouponList } from "./subscription-coupon-list";
import { SdkworkSubscriptionPaymentMethods } from "./subscription-payment-methods";
import { SdkworkSubscriptionPriceSummary } from "./subscription-price-summary";
import { SdkworkSubscriptionSelectedPlanCard } from "./subscription-selected-plan-card";

export interface SdkworkSubscriptionCheckoutPanelProps {
  activeAction: SdkworkSubscriptionAction;
  checkout: SdkworkSubscriptionCheckoutEstimate;
  coupons: SdkworkSubscriptionCoupon[];
  isAuthenticated: boolean;
  isMutating: boolean;
  lastError?: string;
  onClearCoupon: () => void;
  onSelectCoupon: (couponId: string | null) => void;
  onSelectPaymentMethod: (paymentMethodId: string) => void;
  onSubmit: () => void;
  paymentMethods: SdkworkSubscriptionPaymentMethodOption[];
  selectedCouponId: string | null;
  selectedPlan: SdkworkMembershipPlan | null;
}

export function SdkworkSubscriptionCheckoutPanel({
  activeAction,
  checkout,
  coupons,
  isAuthenticated,
  isMutating,
  lastError,
  onClearCoupon,
  onSelectCoupon,
  onSelectPaymentMethod,
  onSubmit,
  paymentMethods,
  selectedCouponId,
  selectedPlan,
}: SdkworkSubscriptionCheckoutPanelProps) {
  const {
    copy,
    resolveActionButtonLabel,
    resolveActionTitle,
  } = useSdkworkSubscriptionIntl();
  const selectedPaymentMethod = paymentMethods.find((method) => method.id === checkout.selectedPaymentMethodId) ?? null;

  return (
    <aside
      className="relative overflow-hidden rounded-[2rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-6 shadow-[var(--sdk-shadow-md)] lg:sticky lg:top-6"
      style={createSdkworkSubscriptionPanelStyle("accent", {
        backgroundWeight: 8,
        surfaceWeight: 98,
      })}
    >
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
              {resolveActionTitle(activeAction)}
            </div>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
              {copy.checkoutPanel.title}
            </h2>
            <div className="mt-2 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
              {copy.checkoutPanel.description}
            </div>
          </div>

          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
            style={createSdkworkSubscriptionToneStyle("success", {
              backgroundWeight: 12,
              borderWeight: 24,
            })}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {copy.checkoutPanel.lockedBadge}
          </div>
        </div>

        {!isAuthenticated ? (
          <StatusNotice className="mt-5" title={copy.checkoutPanel.signInRequiredTitle} tone="warning">
            {copy.checkoutPanel.signInRequiredDescription}
          </StatusNotice>
        ) : null}

        {lastError ? (
          <StatusNotice className="mt-5" title={copy.checkoutPanel.checkoutErrorTitle} tone="danger">
            {lastError}
          </StatusNotice>
        ) : null}

        <div className="mt-5">
          <SdkworkSubscriptionSelectedPlanCard selectedPlan={selectedPlan} />
        </div>

        <div className="mt-5">
          <SdkworkSubscriptionCouponList
            coupons={coupons}
            onClearCoupon={onClearCoupon}
            onSelectCoupon={onSelectCoupon}
            selectedCouponId={selectedCouponId}
          />
        </div>

        <div className="mt-5">
          <SdkworkSubscriptionPaymentMethods
            methods={paymentMethods}
            onSelectPaymentMethod={onSelectPaymentMethod}
            selectedPaymentMethodId={checkout.selectedPaymentMethodId}
          />
        </div>

        <div className="mt-5">
          <SdkworkSubscriptionPriceSummary
            checkout={checkout}
            paymentMethodLabel={selectedPaymentMethod?.label}
          />
        </div>

        <Button
          className="mt-6 w-full rounded-2xl py-6 text-base font-semibold"
          disabled={!isAuthenticated || !selectedPlan || !checkout.selectedPaymentMethodId}
          loading={isMutating}
          onClick={onSubmit}
          type="button"
        >
          {resolveActionButtonLabel(activeAction)}
        </Button>
      </div>
    </aside>
  );
}
