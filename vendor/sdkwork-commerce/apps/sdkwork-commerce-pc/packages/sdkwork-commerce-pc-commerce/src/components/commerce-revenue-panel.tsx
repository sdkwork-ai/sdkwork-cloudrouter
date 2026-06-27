import {
  createSdkworkCommerceRevenueBarStyle,
  createSdkworkCommerceRevenueLineStyle,
} from "../commerce-appearance";
import { useSdkworkCommerceIntl } from "../commerce-intl";
import type {
  SdkworkCommerceProductPerformance,
  SdkworkCommerceRevenueTrendPoint,
} from "../commerce-service";

export interface SdkworkCommerceRevenuePanelProps {
  productPerformance: readonly SdkworkCommerceProductPerformance[];
  revenueTrend: readonly SdkworkCommerceRevenueTrendPoint[];
}

function buildTrendPath(points: readonly SdkworkCommerceRevenueTrendPoint[]): string {
  if (points.length === 0) {
    return "";
  }

  const maxRevenue = Math.max(...points.map((point) => point.revenueCny), 1);

  return points
    .map((point, index) => {
      const x = points.length === 1 ? 16 : 16 + (index / (points.length - 1)) * 288;
      const y = 112 - (point.revenueCny / maxRevenue) * 92;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

export function SdkworkCommerceRevenuePanel({
  productPerformance,
  revenueTrend,
}: SdkworkCommerceRevenuePanelProps) {
  const {
    copy,
    formatCurrency,
    formatOrdersAov,
    formatShare,
    formatTrend,
  } = useSdkworkCommerceIntl();
  const trendPath = buildTrendPath(revenueTrend);
  const totalRevenue = productPerformance.reduce((sum, item) => sum + item.totalRevenueCny, 0);

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(22rem,0.95fr)]">
      <div className="rounded-[1.75rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
              {copy.revenue.analyticsEyebrow}
            </div>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--sdk-color-text-primary)]">
              {copy.revenue.title}
            </h2>
          </div>
          <div className="text-sm text-[var(--sdk-color-text-secondary)]">
            {formatCurrency(totalRevenue)}
          </div>
        </div>

        <div className="mt-5 rounded-[1.35rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-elevated)] p-4">
          {revenueTrend.length === 0 ? (
            <div className="flex h-36 items-center justify-center text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.revenue.emptyTrend}
            </div>
          ) : (
            <div className="space-y-4">
              <svg
                aria-label={copy.revenue.chartAria}
                className="h-32 w-full"
                viewBox="0 0 320 128"
              >
                <path
                  d="M 16 112 H 304"
                  fill="none"
                  stroke="color-mix(in srgb, var(--sdk-color-border-default) 85%, transparent)"
                  strokeDasharray="4 6"
                  strokeWidth="1"
                />
                <path
                  d={trendPath}
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                  style={createSdkworkCommerceRevenueLineStyle()}
                />
              </svg>

              <div className="grid gap-3 sm:grid-cols-3">
                {revenueTrend.map((point) => (
                  <div
                    className="rounded-[1rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-panel)] p-3"
                    key={point.bucketKey}
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                      {point.label}
                    </div>
                    <div className="mt-2 text-lg font-semibold text-[var(--sdk-color-text-primary)]">
                      {formatCurrency(point.revenueCny)}
                    </div>
                    <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                      {formatOrdersAov(point.orders, point.averageOrderValueCny)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
            {copy.revenue.productMixEyebrow}
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--sdk-color-text-primary)]">
            {copy.revenue.productMixTitle}
          </h2>
        </div>

        <div className="mt-5 space-y-3">
          {productPerformance.length === 0 ? (
            <div className="rounded-[1.2rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-elevated)] px-4 py-8 text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.revenue.productEmpty}
            </div>
          ) : productPerformance.map((product) => (
            <div
              className="rounded-[1.2rem] border border-[var(--sdk-color-border-subtle)] bg-[var(--sdk-color-surface-elevated)] p-4"
              key={product.id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-[var(--sdk-color-text-primary)]">{product.title}</div>
                  <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                    {formatOrdersAov(product.orderCount, product.totalRevenueCny)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                    {formatShare(product.sharePercent)}
                  </div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                    {formatTrend(product.trendDeltaPercent)}
                  </div>
                </div>
              </div>

              <div className="mt-3 h-2 rounded-full bg-[var(--sdk-color-surface-panel)]">
                <div
                  className="h-2 rounded-full"
                  style={{
                    ...createSdkworkCommerceRevenueBarStyle(),
                    width: `${Math.max(8, Math.min(product.sharePercent, 100))}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
