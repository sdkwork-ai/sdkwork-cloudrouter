import { Panel } from '@sdkwork/cloudrouter-h5-commons';
import type { ConsoleUsageRecord, ConsoleUsageStatus } from '@sdkwork/cloudrouter-contracts';
import { formatIsoTimestamp, formatMinorUnitsAsCurrency, formatTokenCount } from '@sdkwork/cloudrouter-service';

export interface ConsoleUsageLabels {
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

export function ConsoleUsageView({ records, locale, labels }: ConsoleUsageViewProps) {
  return (
    <Panel title={labels.columnModel}>
      <ul className="divide-y divide-white/10">
        {records.map((record) => (
          <li key={record.id} className="flex items-start justify-between gap-3 py-2 text-[11px]">
            <div className="min-w-0">
              <p className="truncate text-gray-100">{record.model}</p>
              <p className="text-gray-500">
                {formatIsoTimestamp(record.occurredAt, locale) ?? '-'} · {statusLabel(record.status, labels)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-gray-200">
                {formatTokenCount(record.totalTokens, locale)} {labels.columnTokens}
              </p>
              <p className="text-gray-400">
                {formatMinorUnitsAsCurrency(record.costMinorUnits, 'CNY', locale)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
