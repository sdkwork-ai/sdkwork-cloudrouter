import { PageHeader, Panel } from '@sdkwork/cloudrouter-h5-commons';
import type { ConsoleCatalogRateRow } from '@sdkwork/cloudrouter-contracts';

export interface ConsoleCatalogLabels {
  readonly title: string;
  readonly summary: string;
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
    <div className="flex flex-col">
      <PageHeader title={labels.title} summary={labels.summary} />
      <Panel>
        <ul className="divide-y divide-line">
          {rows.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{row.model}</p>
                <p className="mt-0.5 text-[11px] text-ink-subtle">
                  {labels.columnVendor}: {row.vendor} · {row.unit}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] text-ink-muted">
                  <span className="text-ink-subtle">{labels.columnInput}</span>{' '}
                  <span className="font-medium text-ink">
                    {formatPrice(row.inputPricePerMillionTokens, row.currency, locale)}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  <span className="text-ink-subtle">{labels.columnOutput}</span>{' '}
                  <span className="font-medium text-ink">
                    {formatPrice(row.outputPricePerMillionTokens, row.currency, locale)}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
