import type { ConsoleCatalogRateRow } from '@sdkwork/cloudrouter-contracts';
import { Panel } from '@sdkwork/cloudrouter-h5-commons';

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

export function ConsoleCatalogView({ rows, locale, labels }: ConsoleCatalogViewProps) {
  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Panel key={row.id}>
          <p className="text-xs text-gray-100">{row.model}</p>
          <p className="text-[10px] text-gray-500">
            {labels.columnVendor}: {row.vendor} · {row.unit}
          </p>
          <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <dt className="text-gray-500">{labels.columnInput}</dt>
              <dd className="text-gray-200">
                {formatPrice(row.inputPricePerMillionTokens, row.currency, locale)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">{labels.columnOutput}</dt>
              <dd className="text-gray-200">
                {formatPrice(row.outputPricePerMillionTokens, row.currency, locale)}
              </dd>
            </div>
          </dl>
        </Panel>
      ))}
    </div>
  );
}
