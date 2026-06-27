import { EmptyState } from "@sdkwork/ui-pc-react";
import { formatSdkworkCommerceCurrencyCny as formatSdkworkCurrencyCny } from "@sdkwork/commerce-service";
import type { SdkworkBillingBreakdownRow } from "../billing";
import {
  createSdkworkBillingPanelStyle,
  createSdkworkBillingToneStyle,
} from "../billing-appearance";
import { useSdkworkBillingIntl } from "../billing-intl";

export interface SdkworkBillingBreakdownTableProps {
  onSelect?: (rowId: string) => void;
  rows: SdkworkBillingBreakdownRow[];
  selectedRowId: string | null;
}

export function SdkworkBillingBreakdownTable({
  onSelect,
  rows,
  selectedRowId,
}: SdkworkBillingBreakdownTableProps) {
  const { copy, formatBreakdownKind } = useSdkworkBillingIntl();

  if (rows.length === 0) {
    return (
      <div
        className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-6 shadow-[var(--sdk-shadow-sm)]"
        style={createSdkworkBillingPanelStyle("neutral", {
          backgroundWeight: 6,
          borderWeight: 16,
        })}
      >
        <EmptyState
          description={copy.breakdown.emptyDescription}
          title={copy.breakdown.emptyTitle}
        />
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]"
      style={createSdkworkBillingPanelStyle("neutral", {
        backgroundWeight: 5,
        borderWeight: 14,
      })}
    >
      <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.7fr)_minmax(6rem,0.8fr)_minmax(6rem,0.8fr)] gap-3 border-b border-[var(--sdk-color-border-subtle)] px-5 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
        <div>{copy.breakdown.segmentHeader}</div>
        <div className="text-right">{copy.breakdown.shareHeader}</div>
        <div className="text-right">{copy.breakdown.unitsHeader}</div>
        <div className="text-right">{copy.breakdown.costHeader}</div>
      </div>

      <div className="divide-y divide-[var(--sdk-color-border-subtle)]">
        {rows.map((row) => (
          <button
            className={`grid w-full grid-cols-[minmax(0,1.4fr)_minmax(5rem,0.7fr)_minmax(6rem,0.8fr)_minmax(6rem,0.8fr)] gap-3 px-5 py-4 text-left transition-colors ${
              selectedRowId === row.id
                ? ""
                : "hover:bg-[var(--sdk-color-surface-panel-muted)]"
            }`}
            key={row.id}
            onClick={() => onSelect?.(row.id)}
            style={selectedRowId === row.id
              ? createSdkworkBillingToneStyle("accent", {
                backgroundWeight: 10,
                borderWeight: 22,
              })
              : undefined}
            type="button"
          >
            <div className="min-w-0">
              <div className="truncate text-base font-semibold text-[var(--sdk-color-text-primary)]">
                {row.label}
              </div>
              <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                {formatBreakdownKind(row.kind)}
              </div>
            </div>
            <div className="text-right text-sm font-medium text-[var(--sdk-color-text-secondary)]">
              {row.share}%
            </div>
            <div className="text-right text-sm font-medium text-[var(--sdk-color-text-secondary)]">
              {row.units}
            </div>
            <div className="text-right text-sm font-semibold text-[var(--sdk-color-text-primary)]">
              {formatSdkworkCurrencyCny(row.costCny)}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
