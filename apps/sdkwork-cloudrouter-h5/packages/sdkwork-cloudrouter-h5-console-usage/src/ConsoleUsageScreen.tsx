import { useCallback, useEffect, useState } from 'react';

import type { ConsoleUsageRecord } from '@sdkwork/cloudrouter-contracts';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import { loadConsoleUsagePage } from '@sdkwork/cloudrouter-service';

import { ConsoleUsageView, type ConsoleUsageLabels } from './ConsoleUsageView.js';

export interface ConsoleUsageScreenProps {
  readonly ports: CloudRouterConsolePorts;
  readonly locale: string;
  readonly labels: ConsoleUsageLabels & {
    readonly loading: string;
    readonly empty: string;
    readonly reload: string;
  };
}

export function ConsoleUsageScreen({ ports, locale, labels }: ConsoleUsageScreenProps) {
  const [records, setRecords] = useState<readonly ConsoleUsageRecord[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadConsoleUsagePage(ports, { pageSize: 20 })
      .then((page) => {
        if (active) setRecords(page.items);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : labels.empty);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ports, labels.empty]);

  useEffect(() => reload(), [reload]);

  if (loading) return <p className="py-6 text-center text-xs text-gray-400">{labels.loading}</p>;
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">
        <p>{error}</p>
        <button type="button" onClick={reload} className="mt-2 rounded-md border border-red-400/60 px-2 py-1 text-[11px]">
          {labels.reload}
        </button>
      </div>
    );
  }
  if (records.length === 0) return <p className="py-6 text-center text-xs text-gray-400">{labels.empty}</p>;
  return <ConsoleUsageView records={records} locale={locale} labels={labels} />;
}
