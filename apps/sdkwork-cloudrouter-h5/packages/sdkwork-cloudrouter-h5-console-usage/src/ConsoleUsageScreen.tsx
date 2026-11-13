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
  if (records.length === 0) {
    return (
      <p className="bg-surface px-[0.9rem] py-10 text-center text-xs text-ink-subtle">
        {labels.empty}
      </p>
    );
  }
  return (
    <div className="flex flex-col">
      <ConsoleUsageView records={records} locale={locale} labels={labels} />
      {hasMore && nextCursor !== null && (
        <div className="bg-surface px-[0.9rem] pb-4">
          <button
            type="button"
            disabled={loadingMore}
            onClick={loadMore}
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-xs font-medium text-ink-muted transition-colors active:bg-surface-elevated disabled:opacity-50"
          >
            {loadingMore ? labels.loading : labels.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}
