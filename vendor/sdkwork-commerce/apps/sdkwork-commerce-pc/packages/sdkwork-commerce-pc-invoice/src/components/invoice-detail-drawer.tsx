import {
  Button,
  DetailDrawer,
  DetailDrawerMetric,
  DetailDrawerMetrics,
  DetailDrawerSection,
} from "@sdkwork/ui-pc-react";
import type { SdkworkInvoiceController } from "../invoice-controller";
import { useSdkworkInvoiceControllerState } from "../invoice-controller";
import { createSdkworkInvoiceToneStyle } from "../invoice-appearance";
import {
  resolveSdkworkInvoiceStatusTone,
  useSdkworkInvoiceIntl,
} from "../invoice-intl";

export interface SdkworkInvoiceDetailDrawerProps {
  controller: SdkworkInvoiceController;
}

export function SdkworkInvoiceDetailDrawer({
  controller,
}: SdkworkInvoiceDetailDrawerProps) {
  const state = useSdkworkInvoiceControllerState(controller);
  const detail = state.detail;
  const {
    copy,
    formatCurrencyCny,
    formatDetailSummary,
    formatInvoiceType,
    formatItemMeta,
    formatStatus,
    formatTimestamp,
    formatTitleType,
  } = useSdkworkInvoiceIntl();
  const metricTone = resolveSdkworkInvoiceStatusTone(detail?.status);

  return (
    <DetailDrawer
      description={detail?.title || copy.detail.description}
      footer={(
        <div className="flex flex-wrap justify-end gap-3">
          {detail?.canEdit ? (
            <Button onClick={() => controller.openEditDialog(detail.id)} type="button" variant="outline">
              {copy.actions.edit}
            </Button>
          ) : null}
          {detail?.canSubmit ? (
            <Button onClick={() => void controller.submitInvoice(detail.id)} type="button">
              {copy.actions.submitInvoice}
            </Button>
          ) : null}
          {detail?.canCancel ? (
            <Button onClick={() => void controller.cancelInvoice({ invoiceId: detail.id })} type="button" variant="outline">
              {copy.actions.cancelInvoice}
            </Button>
          ) : null}
          <Button onClick={() => controller.closeDetail()} type="button" variant="ghost">
            {copy.actions.close}
          </Button>
        </div>
      )}
      onOpenChange={(open) => {
        if (!open) {
          controller.closeDetail();
        }
      }}
      open={state.isDetailOpen}
      summary={detail ? formatDetailSummary(detail.id) : copy.detail.loading}
      title={copy.detail.title}
    >
      {state.isDetailLoading || !detail ? (
        <div className="text-sm text-[var(--sdk-color-text-secondary)]">{copy.detail.loading}</div>
      ) : (
        <>
          <DetailDrawerMetrics columns={3}>
            <DetailDrawerMetric label={copy.detail.totalAmount} value={formatCurrencyCny(detail.totalAmountCny)} />
            <DetailDrawerMetric
              label={copy.detail.status}
              tone={metricTone === "neutral" ? "default" : metricTone}
              value={formatStatus(detail.status, detail.statusLabel)}
            />
            <DetailDrawerMetric label={copy.detail.invoiceType} value={formatInvoiceType(detail.type)} />
          </DetailDrawerMetrics>

          <DetailDrawerSection description={copy.overview.description} title={copy.overview.title}>
            <div className="grid gap-3 text-sm text-[var(--sdk-color-text-secondary)] sm:grid-cols-2">
              <div>{copy.overview.invoiceCode}: {detail.invoiceCode || copy.common.emptyValue}</div>
              <div>{copy.overview.invoiceNo}: {detail.invoiceNo || copy.common.emptyValue}</div>
              <div>{copy.overview.titleType}: {formatTitleType(detail.titleType)}</div>
              <div>{copy.overview.currency}: {detail.currency || copy.common.emptyValue}</div>
              <div>{copy.overview.createdAt}: {formatTimestamp(detail.createdAt)}</div>
              <div>{copy.overview.invoiceTime}: {formatTimestamp(detail.invoiceTime)}</div>
            </div>
          </DetailDrawerSection>

          <DetailDrawerSection description={copy.tax.description} title={copy.tax.title}>
            <div className="grid gap-3 text-sm text-[var(--sdk-color-text-secondary)] sm:grid-cols-2">
              <div>{copy.tax.taxNo}: {detail.taxNo || copy.common.emptyValue}</div>
              <div>{copy.tax.taxRate}: {detail.taxRate !== null ? `${detail.taxRate}%` : copy.common.emptyValue}</div>
              <div>{copy.tax.taxAmount}: {formatCurrencyCny(detail.taxAmountCny)}</div>
              <div>{copy.tax.amountExcludingTax}: {formatCurrencyCny(detail.amountExcludingTaxCny)}</div>
              <div>{copy.tax.bankName}: {detail.bankName || copy.common.emptyValue}</div>
              <div>{copy.tax.bankAccount}: {detail.bankAccount || copy.common.emptyValue}</div>
              <div>{copy.tax.registerAddress}: {detail.registerAddress || copy.common.emptyValue}</div>
              <div>{copy.tax.registerPhone}: {detail.registerPhone || copy.common.emptyValue}</div>
            </div>
          </DetailDrawerSection>

          <DetailDrawerSection description={copy.items.description} title={copy.items.title}>
            <div className="space-y-3">
              {detail.items.length === 0 ? (
                <div className="text-sm text-[var(--sdk-color-text-secondary)]">{copy.items.empty}</div>
              ) : detail.items.map((item) => (
                <div
                  className="rounded-[1rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] px-4 py-3"
                  key={item.id}
                  style={createSdkworkInvoiceToneStyle("neutral", {
                    backgroundWeight: 4,
                    borderWeight: 10,
                  })}
                >
                  <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{item.name}</div>
                  <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                    {formatItemMeta(item.quantity, item.unit, item.totalAmountCny)}
                  </div>
                  {item.specification ? (
                    <div className="mt-1 text-xs text-[var(--sdk-color-text-muted)]">
                      {copy.items.specification}: {item.specification}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </DetailDrawerSection>

          {detail.electronicUrl ? (
            <DetailDrawerSection description={copy.delivery.description} title={copy.delivery.title}>
              <a
                className="text-sm font-medium text-[var(--sdk-color-brand-primary)] underline underline-offset-4"
                href={detail.electronicUrl}
                rel="noreferrer"
                target="_blank"
              >
                {copy.actions.openElectronicInvoice}
              </a>
            </DetailDrawerSection>
          ) : null}
        </>
      )}
    </DetailDrawer>
  );
}
