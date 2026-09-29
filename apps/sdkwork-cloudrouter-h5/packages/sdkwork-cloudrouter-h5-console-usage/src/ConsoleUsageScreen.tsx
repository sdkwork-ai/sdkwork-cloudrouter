import { useCallback, useEffect, useState } from 'react';

import type { ConsoleUsageRecord } from '@sdkwork/cloudrouter-contracts';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import { loadConsoleUsagePage } from '@sdkwork/cloudrouter-service';

import { ConsoleUsageView, type ConsoleUsageLabels } from './ConsoleUsageView.js';

/** Bounded server page size; additional pages are appended via "load more". */
const USAGE_PAGE_SIZE = 20;

export interface ConsoleUsageScreenProps {
  readonly ports: CloudRouterConsolePorts;
  readonly locale: string;
  readonly labels: ConsoleUsageLabels & {
    readonly loading: string;
    readonly empty: string;
    readonly reload: string;
    readonly loadMore: string;
  };
}

export function ConsoleUsageScreen({ ports, locale, labels }: ConsoleUsageScreenProps) {
  const [records, setRecords] = useState<readonly ConsoleUsageRecord[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const reload = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadConsoleUsagePage(ports, { pageSize: USAGE_PAGE_SIZE })
      .then((page) => {
        if (!active) return;
        setRecords(page.items);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
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

  const loadMore = useCallback(() => {
    if (loadingMore || nextCursor === null) return;
    setLoadingMore(true);
    setError(null);
    loadConsoleUsagePage(ports, { pageSize: USAGE_PAGE_SIZE, cursor: nextCursor })
      .then((page) => {
        setRecords((previous) => [...previous, ...page.items]);
        setNextCursor(page.nextCursor);
        setHasMore(page.hasMore);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : labels.empty);
      })
      .finally(() => setLoadingMore(false));
  }, [ports, nextCursor, loadingMore, labels.empty]);

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
  return (
    <div className="space-y-3">
      <ConsoleUsageView records={records} locale={locale} labels={labels} />
      {hasMore && nextCursor !== null && (
        <button
          type="button"
          disabled={loadingMore}
          onClick={loadMore}
          className="w-full rounded-md border border-white/15 px-3 py-2 text-xs text-gray-300 disabled:opacity-50"
        >
          {loadingMore ? labels.loading : labels.loadMore}
        </button>
      )}
    </div>
  );
}
