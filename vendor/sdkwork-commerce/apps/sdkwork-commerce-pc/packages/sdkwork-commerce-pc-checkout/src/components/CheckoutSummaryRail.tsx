import {
  Button,
  StatusNotice,
} from "@sdkwork/ui-pc-react";
import { createSdkworkCheckoutGlassStyle } from "../checkout-appearance";
import type {
  SdkworkCheckoutSource,
  SdkworkCheckoutSummary,
} from "../checkout";
import { useSdkworkCheckoutIntl } from "../checkout-intl";

export interface SdkworkCheckoutSummaryRailProps {
  invoiceRequested: boolean;
  isAuthenticated: boolean;
  isMutating: boolean;
  lastError?: string;
  onSubmit: () => void;
  onToggleInvoiceRequested: (requested: boolean) => void;
  source: SdkworkCheckoutSource | null;
  summary: SdkworkCheckoutSummary;
}

export function SdkworkCheckoutSummaryRail({
  invoiceRequested,
  isAuthenticated,
  isMutating,
  lastError,
  onSubmit,
  onToggleInvoiceRequested,
  source,
  summary,
}: SdkworkCheckoutSummaryRailProps) {
  const {
    copy,
    formatCouponDeduction,
    formatCurrencyCny,
  } = useSdkworkCheckoutIntl();
  const requiresPaymentMethod = Boolean(source && summary.payableAmountCny > 0 && !summary.paymentMethodLabel);

  return (
    <aside className="rounded-[1.8rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-md)] lg:sticky lg:top-5">
      <div className="rounded-[1.3rem] border border-sky-400/30 bg-sky-500/8 px-4 py-3 text-sm text-sky-700">
        <div className="font-semibold">{copy.summaryRail.bannerTitle}</div>
        <div className="mt-1 text-xs leading-5">
          {copy.summaryRail.bannerDescription}
        </div>
      </div>

      {!isAuthenticated ? (
        <StatusNotice className="mt-5" title={copy.summaryRail.signInRequiredTitle} tone="warning">
          {copy.summaryRail.signInRequiredDescription}
        </StatusNotice>
      ) : null}

      {lastError ? (
        <StatusNotice className="mt-5" title={copy.summaryRail.errorTitle} tone="danger">
          {lastError}
        </StatusNotice>
      ) : null}

      {source ? (
        <div className="mt-5 rounded-[1.35rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-4 py-4">
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
            {copy.summaryRail.activeSourceEyebrow}
          </div>
          <div className="mt-2 text-2xl font-semibold text-[var(--sdk-color-text-primary)]">{source.title}</div>
          <div className="mt-2 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">{source.description}</div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span
              className="rounded-full border px-3 py-1 text-xs font-semibold text-[var(--sdk-color-text-secondary)] shadow-[var(--sdk-shadow-soft)]"
              style={createSdkworkCheckoutGlassStyle("neutral", {
                backgroundWeight: 8,
                borderWeight: 20,
                surfaceColor: "var(--sdk-color-surface-panel)",
                surfaceWeight: 90,
              })}
            >
              {source.billingLabel}
            </span>
            {source.tags.map((tag) => (
              <span
                className="rounded-full border px-3 py-1 text-xs font-semibold text-[var(--sdk-color-text-secondary)] shadow-[var(--sdk-shadow-soft)]"
                key={tag}
                style={createSdkworkCheckoutGlassStyle("neutral", {
                  backgroundWeight: 8,
                  borderWeight: 20,
                  surfaceColor: "var(--sdk-color-surface-panel)",
                  surfaceWeight: 90,
                })}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ) : (
        <StatusNotice className="mt-5" title={copy.summaryRail.noSourceTitle}>
          {copy.summaryRail.noSourceDescription}
        </StatusNotice>
      )}

      <div className="mt-5 rounded-[1.35rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-4 py-4">
        <div className="flex items-center justify-between gap-4 text-sm">
          <span className="text-[var(--sdk-color-text-secondary)]">{copy.summaryRail.originalPrice}</span>
          <span className="font-semibold text-[var(--sdk-color-text-primary)]">
            {formatCurrencyCny(summary.originalAmountCny)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-sm">
          <span className="text-[var(--sdk-color-text-secondary)]">{copy.summaryRail.couponDeduction}</span>
          <span className="font-semibold text-rose-500">
            {formatCouponDeduction(summary.discountAmountCny)}
          </span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-sm">
          <span className="text-[var(--sdk-color-text-secondary)]">{copy.summaryRail.coupon}</span>
          <span className="font-semibold text-[var(--sdk-color-text-primary)]">{summary.couponLabel || copy.common.emptyValue}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-sm">
          <span className="text-[var(--sdk-color-text-secondary)]">{copy.summaryRail.paymentMethod}</span>
          <span className="font-semibold text-[var(--sdk-color-text-primary)]">{summary.paymentMethodLabel || copy.summaryRail.unselectedPaymentMethod}</span>
        </div>
        <div className="mt-3 flex items-center justify-between gap-4 text-sm">
          <span className="text-[var(--sdk-color-text-secondary)]">{copy.summaryRail.balanceCoverage}</span>
          <span className="font-semibold text-[var(--sdk-color-text-primary)]">
            {formatCurrencyCny(summary.balanceCoverageCny)}
          </span>
        </div>
        <div className="mt-4 border-t border-[var(--sdk-color-border-subtle)] pt-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-[var(--sdk-color-text-secondary)]">{copy.summaryRail.amountDue}</span>
            <span className="text-2xl font-semibold text-[var(--sdk-color-text-primary)]">
              {formatCurrencyCny(summary.payableAmountCny)}
            </span>
          </div>
        </div>
      </div>

      <Button
        className="mt-5 w-full"
        disabled={!summary.invoiceEligible}
        onClick={() => onToggleInvoiceRequested(!invoiceRequested)}
        type="button"
        variant={invoiceRequested ? "secondary" : "outline"}
      >
        {invoiceRequested ? copy.summaryRail.invoiceRequested : copy.summaryRail.enableInvoice}
      </Button>

      <Button
        className="mt-3 w-full"
        disabled={!isAuthenticated || !source || requiresPaymentMethod}
        loading={isMutating}
        onClick={onSubmit}
        type="button"
      >
        {source?.action.label || copy.summaryRail.continue}
      </Button>
    </aside>
  );
}
