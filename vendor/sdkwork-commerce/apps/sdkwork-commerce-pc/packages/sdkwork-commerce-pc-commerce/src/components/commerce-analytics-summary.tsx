import {
  AlertTriangle,
  BarChart3,
  CircleDollarSign,
  ReceiptText,
} from "lucide-react";
import {
  createSdkworkCommercePanelStyle,
  createSdkworkCommerceToneStyle,
} from "../commerce-appearance";
import { useSdkworkCommerceIntl } from "../commerce-intl";
import type { SdkworkCommerceAnalyticsSummary as SdkworkCommerceAnalyticsSummaryMetrics } from "../commerce-service";

export interface SdkworkCommerceAnalyticsSummaryPanelProps {
  summary: SdkworkCommerceAnalyticsSummaryMetrics;
}

export function SdkworkCommerceAnalyticsSummaryPanel({
  summary,
}: SdkworkCommerceAnalyticsSummaryPanelProps) {
  const { copy, formatCurrency, formatTrackedOrders } = useSdkworkCommerceIntl();

  const metricCards = [
    {
      icon: CircleDollarSign,
      key: "totalRevenueCny",
      label: copy.analyticsSummary.totalRevenue,
      tone: "accent" as const,
    },
    {
      icon: BarChart3,
      key: "averageOrderValueCny",
      label: copy.analyticsSummary.averageOrderValue,
      tone: "brand" as const,
    },
    {
      icon: ReceiptText,
      key: "totalSuccessfulOrders",
      label: copy.analyticsSummary.totalSuccessfulOrders,
      tone: "success" as const,
    },
    {
      icon: AlertTriangle,
      key: "activeAlerts",
      label: copy.analyticsSummary.activeAlerts,
      tone: "warning" as const,
    },
  ] as const;

  function resolveMetricValue(
    key: (typeof metricCards)[number]["key"],
  ): string {
    switch (key) {
      case "totalRevenueCny":
      case "averageOrderValueCny":
        return formatCurrency(summary[key]);
      default:
        return `${summary[key]}`;
    }
  }

  return (
    <section className="space-y-4 rounded-[1.75rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
            {copy.analyticsSummary.eyebrow}
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--sdk-color-text-primary)]">
            {copy.analyticsSummary.title}
          </h2>
        </div>
        <div className="text-sm text-[var(--sdk-color-text-secondary)]">
          {formatTrackedOrders(summary.totalRevenueRecords)}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;

          return (
            <div
              className="rounded-[1.35rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-elevated)] p-4"
              key={card.key}
              style={createSdkworkCommercePanelStyle(card.tone, {
                backgroundWeight: 6,
                borderWeight: 14,
                surfaceColor: "var(--sdk-color-surface-elevated)",
              })}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                    {card.label}
                  </div>
                  <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
                    {resolveMetricValue(card.key)}
                  </div>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[1rem] border"
                  style={createSdkworkCommerceToneStyle(card.tone, {
                    backgroundWeight: 12,
                    borderWeight: 22,
                  })}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
