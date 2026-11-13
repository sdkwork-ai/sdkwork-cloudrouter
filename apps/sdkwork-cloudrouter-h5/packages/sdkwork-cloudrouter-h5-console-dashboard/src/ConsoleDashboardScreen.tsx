import { useCallback, useEffect, useState } from 'react';

import type { ConsoleOverviewSnapshot } from '@sdkwork/cloudrouter-contracts';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import { loadConsoleOverview } from '@sdkwork/cloudrouter-service';

import { ConsoleDashboardView, type ConsoleDashboardLabels } from './ConsoleDashboardView.js';

export interface ConsoleDashboardScreenProps {
  readonly ports: CloudRouterConsolePorts;
  readonly locale: string;
  readonly labels: ConsoleDashboardLabels & {
    readonly loading: string;
    readonly empty: string;
    readonly reload: string;
  };
}

export function ConsoleDashboardScreen({
  ports,
  locale,
  labels,
}: ConsoleDashboardScreenProps) {
  const [snapshot, setSnapshot] = useState<ConsoleOverviewSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadConsoleOverview(ports)
      .then((next) => {
        if (active) setSnapshot(next);
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

  if (loading) {
    return (
      <p className="bg-surface px-[0.9rem] py-10 text-center text-xs text-ink-subtle">
        {labels.loading}
      </p>
    );
  }
  if (error) {
    return (
      <div className="border-b border-line bg-danger-soft px-[0.9rem] py-4 text-xs text-danger">
        <p>{error}</p>
        <button
          type="button"
          onClick={reload}
          className="mt-2 rounded-md border border-danger/40 px-2.5 py-1 text-[11px] font-medium"
        >
          {labels.reload}
        </button>
      </div>
    );
  }
  if (!snapshot) {
    return (
      <p className="bg-surface px-[0.9rem] py-10 text-center text-xs text-ink-subtle">
        {labels.empty}
      </p>
    );
  }
  return <ConsoleDashboardView snapshot={snapshot} locale={locale} labels={labels} />;
}
