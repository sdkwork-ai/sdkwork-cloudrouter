import { PageHeader, Panel } from '@sdkwork/cloudrouter-h5-commons';
import type { ConsoleUsageRecord, ConsoleUsageStatus } from '@sdkwork/cloudrouter-contracts';
import { formatIsoTimestamp, formatMinorUnitsAsCurrency, formatTokenCount } from '@sdkwork/cloudrouter-service';

export interface ConsoleUsageLabels {
  readonly title: string;
  readonly summary: string;
  readonly columnModel: string;
  readonly columnTokens: string;
  readonly columnCost: string;
  readonly columnStatus: string;
  readonly columnTime: string;
  readonly statusSucceeded: string;
  readonly statusFailed: string;
  readonly statusProcessing: string;
  readonly statusUnknown: string;
}

export interface ConsoleUsageViewProps {
  readonly records: readonly ConsoleUsageRecord[];
  readonly locale: string;
  readonly labels: ConsoleUsageLabels;
}

function statusLabel(status: ConsoleUsageStatus, labels: ConsoleUsageLabels): string {
  if (status === 'succeeded') return labels.statusSucceeded;
  if (status === 'failed') return labels.statusFailed;
  if (status === 'processing') return labels.statusProcessing;
  return labels.statusUnknown;
}

function statusClassName(status: ConsoleUsageStatus): string {
  if (status === 'succeeded') return 'text-emerald-600 dark:text-emerald-400';
  if (status === 'failed') return 'text-danger';
  if (status === 'processing') return 'text-brand';
  return 'text-ink-subtle';
}

/**
 * Usage records as full-bleed list rows: each row spans the viewport width
 * with square corners and keeps a documented 0.9rem content inset.
 */
export function ConsoleUsageView({ records, locale, labels }: ConsoleUsageViewProps) {
  return (
    <div className="flex flex-col">
      <PageHeader title={labels.title} summary={labels.summary} />
      <Panel>
        <ul className="divide-y divide-line">
          {records.map((record) => (
            <li key={record.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-ink">{record.model}</p>
                <p className="mt-0.5 text-[11px] text-ink-subtle">
                  {formatIsoTimestamp(record.occurredAt, locale) ?? '-'} ·{' '}
                  <span className={statusClassName(record.status)}>
                    {statusLabel(record.status, labels)}
                  </span>
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[12px] font-medium text-ink">
                  {formatTokenCount(record.totalTokens, locale)}{' '}
                  <span className="text-[10px] font-normal text-ink-subtle">
                    {labels.columnTokens}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {formatMinorUnitsAsCurrency(record.costMinorUnits, 'CNY', locale)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
