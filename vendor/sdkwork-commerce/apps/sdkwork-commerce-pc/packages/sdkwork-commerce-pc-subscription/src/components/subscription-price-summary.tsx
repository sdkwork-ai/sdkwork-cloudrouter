import type { SdkworkSubscriptionCheckoutEstimate } from "../subscription";
import {
  createSdkworkSubscriptionPanelStyle,
  createSdkworkSubscriptionToneStyle,
} from "../subscription-appearance";
import { useSdkworkSubscriptionIntl } from "../subscription-intl";

export interface SdkworkSubscriptionPriceSummaryProps {
  checkout: SdkworkSubscriptionCheckoutEstimate;
  paymentMethodLabel?: string | null;
}

export function SdkworkSubscriptionPriceSummary({
  checkout,
  paymentMethodLabel,
}: SdkworkSubscriptionPriceSummaryProps) {
  const {
    copy,
    formatCurrencyCny,
  } = useSdkworkSubscriptionIntl();

  return (
    <div
      className="rounded-[1.6rem] border border-[var(--sdk-color-border-default)] px-4 py-4 shadow-[var(--sdk-shadow-soft)]"
      style={createSdkworkSubscriptionPanelStyle("accent", {
        backgroundWeight: 8,
        surfaceWeight: 96,
      })}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--sdk-color-text-secondary)]">{copy.priceSummary.originalPriceLabel}</span>
        <span className="font-semibold text-[var(--sdk-color-text-primary)]">
          {formatCurrencyCny(checkout.originalAmountCny)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <span className="text-[var(--sdk-color-text-secondary)]">{copy.priceSummary.couponDeductionLabel}</span>
        <span
          className="font-semibold"
          style={createSdkworkSubscriptionToneStyle("accent", {
            backgroundWeight: 0,
            borderWeight: 0,
          })}
        >
          - {formatCurrencyCny(checkout.discountAmountCny)}
        </span>
      </div>
      {paymentMethodLabel ? (
        <div className="mt-3 flex items-center justify-between gap-3 text-sm">
          <span className="text-[var(--sdk-color-text-secondary)]">{copy.priceSummary.paymentRailLabel}</span>
          <span className="font-semibold text-[var(--sdk-color-text-primary)]">{paymentMethodLabel}</span>
        </div>
      ) : null}
      <div
        className="mt-4 rounded-[1.25rem] border px-4 py-4 shadow-[var(--sdk-shadow-soft)]"
        style={createSdkworkSubscriptionToneStyle("accent", {
          backgroundWeight: 8,
          borderWeight: 18,
        })}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-medium text-[var(--sdk-color-text-secondary)]">{copy.priceSummary.amountDueLabel}</span>
          <span className="text-2xl font-semibold text-[var(--sdk-color-text-primary)]">
            {formatCurrencyCny(checkout.payableAmountCny)}
          </span>
        </div>
      </div>
    </div>
  );
}
