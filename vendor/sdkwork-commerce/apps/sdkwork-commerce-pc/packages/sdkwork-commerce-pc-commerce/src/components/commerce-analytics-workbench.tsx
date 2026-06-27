import { StatusBadge } from "@sdkwork/ui-pc-react";
import { useSdkworkCommerceIntl } from "../commerce-intl";
import type {
  SdkworkCommerceAlert,
  SdkworkCommerceProductPerformance,
  SdkworkCommerceRevenueRecord,
} from "../commerce-service";

export interface SdkworkCommerceAnalyticsWorkbenchProps {
  alerts: readonly SdkworkCommerceAlert[];
  productPerformance: readonly SdkworkCommerceProductPerformance[];
  recentRevenueRecords: readonly SdkworkCommerceRevenueRecord[];
}

function resolveAlertVariant(alert: SdkworkCommerceAlert): "danger" | "warning" | "default" {
  switch (alert.severity) {
    case "danger":
      return "danger";
    case "warning":
      return "warning";
    default:
      return "default";
  }
}

export function SdkworkCommerceAnalyticsWorkbench({
  alerts,
  productPerformance,
  recentRevenueRecords,
}: SdkworkCommerceAnalyticsWorkbenchProps) {
  const {
    copy,
    formatCurrency,
    formatDate,
    formatOrderCount,
    formatShare,
  } = useSdkworkCommerceIntl();

  return (
    <section className="space-y-4 rounded-[1.75rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
          {copy.workbench.eyebrow}
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--sdk-color-text-primary)]">
          {copy.workbench.title}
        </h2>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="rounded-[1.35rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-elevated)]">
          <div className="border-b border-[var(--sdk-color-border-subtle)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">{copy.workbench.revenueRecordsTitle}</h3>
          </div>
          <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
            {recentRevenueRecords.length === 0 ? (
              <div className="px-5 py-8 text-sm text-[var(--sdk-color-text-secondary)]">
                {copy.workbench.revenueRecordsEmpty}
              </div>
            ) : recentRevenueRecords.map((record) => (
              <div className="px-5 py-4" key={record.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-[var(--sdk-color-text-primary)]">{record.productTitle}</div>
                    <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                      {record.orderNo}
                    </div>
                    <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                      {formatDate(record.timestamp)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[var(--sdk-color-text-primary)]">
                      {formatCurrency(record.amountCny)}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                      {record.channel}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-elevated)]">
          <div className="border-b border-[var(--sdk-color-border-subtle)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">{copy.workbench.productTitle}</h3>
          </div>
          <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
            {productPerformance.length === 0 ? (
              <div className="px-5 py-8 text-sm text-[var(--sdk-color-text-secondary)]">
                {copy.workbench.productEmpty}
              </div>
            ) : productPerformance.map((product) => (
              <div className="px-5 py-4" key={product.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-[var(--sdk-color-text-primary)]">{product.title}</div>
                    <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                      {formatOrderCount(product.orderCount)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-[var(--sdk-color-text-primary)]">
                      {formatCurrency(product.totalRevenueCny)}
                    </div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                      {formatShare(product.sharePercent)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-elevated)]">
          <div className="border-b border-[var(--sdk-color-border-subtle)] px-5 py-4">
            <h3 className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">{copy.workbench.alertsTitle}</h3>
          </div>
          <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
            {alerts.length === 0 ? (
              <div className="px-5 py-8 text-sm text-[var(--sdk-color-text-secondary)]">
                {copy.workbench.alertsEmpty}
              </div>
            ) : alerts.map((alert) => (
              <div className="px-5 py-4" key={alert.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-[var(--sdk-color-text-primary)]">{alert.title}</div>
                    <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">{alert.description}</div>
                  </div>
                  <StatusBadge
                    label={alert.metric}
                    status={alert.severity}
                    variant={resolveAlertVariant(alert)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
