import { Panel } from '@sdkwork/cloudrouter-h5-commons';
import type { ConsoleCatalogRateRow } from '@sdkwork/cloudrouter-contracts';

export interface ConsoleCatalogLabels {
  readonly columnVendor: string;
  readonly columnModel: string;
  readonly columnInput: string;
  readonly columnOutput: string;
}

export interface ConsoleCatalogViewProps {
  readonly rows: readonly ConsoleCatalogRateRow[];
  readonly locale: string;
  readonly labels: ConsoleCatalogLabels;
}

function formatPrice(value: number | null, currency: string, locale: string): string {
  if (value === null) return '-';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 4,
  }).format(value);
}

/**
 * Pricing catalog as full-bleed list rows: each row spans the viewport width
 * with square corners and keeps a documented 0.9rem content inset.
 */
export function ConsoleCatalogView({ rows, locale, labels }: ConsoleCatalogViewProps) {
  return (
    <Panel title={labels.columnModel}>
      <ul className="divide-y divide-white/10">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start justify-between gap-3 py-2 text-[11px]">
            <div className="min-w-0">
              <p className="truncate text-gray-100">{row.model}</p>
              <p className="text-gray-500">
                {labels.columnVendor}: {row.vendor} · {row.unit}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-gray-200">
                {labels.columnInput}: {formatPrice(row.inputPricePerMillionTokens, row.currency, locale)}
              </p>
              <p className="text-gray-400">
                {labels.columnOutput}: {formatPrice(row.outputPricePerMillionTokens, row.currency, locale)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
