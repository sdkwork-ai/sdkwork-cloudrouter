import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlignLeft, Activity, Server, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons';
import type { GatewayTrace, PageInfo } from '@sdkwork/clawrouter-pc-console-core/sdk';
import { GatewayService } from './gatewayService';

const GATEWAY_TRACE_PAGE_SIZE = 20;

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

type GatewaySummary = {
  total: number;
  success: number;
  failed: number;
  uniqueAccounts: number;
};

function getLoadErrorMessage(error: unknown, fallback: string, t: TranslationFunction): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.startsWith('console.')) {
      return t(message, fallback);
    }
  }
  return fallback;
}

function summarizeTraces(traces: GatewayTrace[]): GatewaySummary {
  return traces.reduce<GatewaySummary>(
    (summary, trace) => {
      summary.total += 1;
      if (trace.status >= 200 && trace.status < 400) {
        summary.success += 1;
      } else {
        summary.failed += 1;
      }
      return summary;
    },
    {
      total: 0,
      success: 0,
      failed: 0,
      uniqueAccounts: new Set(traces.map((trace) => trace.upstreamAccount).filter(Boolean)).size,
    },
  );
}

export function GatewayView() {
  const { t } = useTranslation();
  const [traces, setTraces] = useState<GatewayTrace[]>([]);
  const [pageInfo, setPageInfo] = useState<PageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);
  const requestGenerationRef = useRef(0);
  const continuationTokenRef = useRef<object | null>(null);

  const loadTraces = useCallback(async (isActive: () => boolean = () => true) => {
    const requestGeneration = ++requestGenerationRef.current;
    continuationTokenRef.current = null;
    setLoading(true);
    setLoadingMore(false);
    setLoadError(null);
    setLoadMoreError(null);
    try {
      const page = await GatewayService.fetchTraces({ pageSize: GATEWAY_TRACE_PAGE_SIZE });
      if (isActive() && requestGeneration === requestGenerationRef.current) {
        setTraces(page.items);
        setPageInfo(page.pageInfo);
      }
    } catch (error) {
      if (isActive() && requestGeneration === requestGenerationRef.current) {
        setLoadError(getLoadErrorMessage(
          error,
          t('console.gateway.states.loadErrorFallback'),
          t,
        ));
      }
    } finally {
      if (isActive() && requestGeneration === requestGenerationRef.current) {
        setLoading(false);
      }
    }
  }, [t]);

  const loadMoreTraces = useCallback(async () => {
    const cursor = pageInfo?.hasMore ? pageInfo.nextCursor : null;
    if (loading || cursor === null || continuationTokenRef.current !== null) {
      return;
    }

    const requestGeneration = requestGenerationRef.current;
    const continuationToken = {};
    continuationTokenRef.current = continuationToken;
    setLoadingMore(true);
    setLoadMoreError(null);
    try {
      const page = await GatewayService.fetchTraces({
        cursor,
        pageSize: GATEWAY_TRACE_PAGE_SIZE,
      });
      if (
        requestGeneration === requestGenerationRef.current
        && continuationTokenRef.current === continuationToken
      ) {
        setTraces((current) => [...current, ...page.items]);
        setPageInfo(page.pageInfo);
      }
    } catch (error) {
      if (
        requestGeneration === requestGenerationRef.current
        && continuationTokenRef.current === continuationToken
      ) {
        setLoadMoreError(getLoadErrorMessage(
          error,
          t('console.gateway.states.loadMoreErrorFallback'),
          t,
        ));
      }
    } finally {
      if (continuationTokenRef.current === continuationToken) {
        continuationTokenRef.current = null;
        if (requestGeneration === requestGenerationRef.current) {
          setLoadingMore(false);
        }
      }
    }
  }, [loading, pageInfo, t]);

  useEffect(() => {
    let active = true;
    void loadTraces(() => active);
    return () => {
      active = false;
      requestGenerationRef.current += 1;
      continuationTokenRef.current = null;
    };
  }, [loadTraces]);

  const summary = useMemo(() => summarizeTraces(traces), [traces]);

  return (
    <div className="mx-auto min-h-full w-full space-y-4 bg-slate-50 animate-in fade-in duration-500 dark:bg-[#121212] lg:space-y-5">
      <div className="space-y-1 px-1">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('console.gateway.title')}</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('console.gateway.subtitle')}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/10 p-2 rounded-xl shadow-sm">
        <SummaryItem icon={<AlignLeft className="w-4 h-4 text-blue-500" />} label={t('console.gateway.summary.traceRows')} value={summary.total.toString()} />
        <SummaryItem icon={<Activity className="w-4 h-4 text-emerald-500" />} label={t('console.gateway.summary.successful')} value={summary.success.toString()} />
        <SummaryItem icon={<Timer className="w-4 h-4 text-rose-500" />} label={t('console.gateway.summary.failed')} value={summary.failed.toString()} />
        <SummaryItem icon={<Server className="w-4 h-4 text-indigo-500" />} label={t('console.gateway.summary.accounts')} value={summary.uniqueAccounts.toString()} />
      </div>

      <div className="space-y-3 flex flex-col items-start w-full">
        <div className="flex items-center justify-between w-full mb-1">
          <h3 className="font-semibold text-slate-900 dark:text-white">{t('console.gateway.table.title')}</h3>
          <span className="text-xs text-slate-500 dark:text-slate-400">{t('console.gateway.table.description')}</span>
        </div>

        <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/10 rounded-xl shadow-sm overflow-hidden flex flex-col w-full min-h-[420px]">
          {loading ? (
            <BusinessStatePanel
              kind="loading"
              title={t('console.gateway.states.loading')}
              className="min-h-[420px] border-0 bg-transparent"
            />
          ) : loadError ? (
            <BusinessStatePanel
              kind="error"
              title={t('console.gateway.states.loadErrorTitle')}
              description={loadError}
              onRetry={() => void loadTraces()}
              retryLabel={t('common.actions.retry')}
              className="min-h-[420px] border-0 bg-transparent"
            />
          ) : traces.length === 0 ? (
            <BusinessStatePanel
              kind="empty"
              title={t('console.gateway.states.emptyTitle')}
              description={t('console.gateway.states.emptyDescription')}
              className="min-h-[420px] border-0 bg-transparent"
            />
          ) : (
            <div className="flex min-h-[420px] flex-col">
              <GatewayTraceTable traces={traces} />
              <GatewayTracePagination
                hasMore={pageInfo?.hasMore === true && pageInfo.nextCursor !== null}
                loading={loadingMore}
                error={loadMoreError}
                onLoadMore={() => void loadMoreTraces()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="p-3 border-l first:border-l-0 border-slate-100 dark:border-white/5">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
        {icon}
        {label}
      </div>
      <div className="text-lg text-slate-900 dark:text-white font-bold">{value}</div>
    </div>
  );
}

function GatewayTracePagination({
  hasMore,
  loading,
  error,
  onLoadMore,
}: {
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  onLoadMore: () => void;
}) {
  const { t } = useTranslation();
  if (!hasMore) {
    return null;
  }

  return (
    <div className="mt-auto flex flex-col items-center gap-2 border-t border-slate-200 px-4 py-3 dark:border-white/10" aria-live="polite">
      {error ? <p className="text-sm text-rose-600 dark:text-rose-400" role="alert">{error}</p> : null}
      <button
        type="button"
        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
        disabled={loading}
        aria-busy={loading}
        onClick={onLoadMore}
      >
        {loading
          ? t('console.gateway.pagination.loadingMore')
          : error
            ? t('common.actions.retry')
            : t('console.gateway.pagination.loadMore')}
      </button>
    </div>
  );
}

function GatewayTraceTable({ traces }: { traces: GatewayTrace[] }) {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
          <tr>
            <th className="px-4 py-2.5 font-medium">{t('console.gateway.table.traceId')}</th>
            <th className="px-4 py-2.5 font-medium">{t('console.gateway.table.timestamp')}</th>
            <th className="px-4 py-2.5 font-medium">{t('console.gateway.table.clientIp')}</th>
            <th className="px-4 py-2.5 font-medium">{t('console.gateway.table.method')}</th>
            <th className="px-4 py-2.5 font-medium">{t('console.gateway.table.endpoint')}</th>
            <th className="px-4 py-2.5 font-medium text-center">{t('console.gateway.table.status')}</th>
            <th className="px-4 py-2.5 font-medium text-right">{t('console.gateway.table.duration')}</th>
            <th className="px-4 py-2.5 font-medium">{t('console.gateway.table.routedAccount')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-white/5 text-slate-700 dark:text-slate-300">
          {traces.map((trace, index) => (
            <tr key={`${trace.id}:${trace.time}:${index}`} className="hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors font-mono text-xs">
              <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{trace.id}</td>
              <td className="px-4 py-2.5 text-slate-500">{trace.time}</td>
              <td className="px-4 py-2.5 text-slate-500">{trace.ip}</td>
              <td className="px-4 py-2.5">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                    trace.method === 'POST'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  }`}
                >
                  {trace.method}
                </span>
              </td>
              <td className="px-4 py-2.5 text-slate-500">{trace.endpoint}</td>
              <td className="px-4 py-2.5 text-center">
                <span
                  className={`inline-block px-1.5 py-0.5 rounded text-[10px] uppercase font-bold ${
                    trace.status >= 200 && trace.status < 400
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400'
                      : 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400'
                  }`}
                >
                  {trace.status}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right">{trace.duration}</td>
              <td className="px-4 py-2.5 text-slate-500">{trace.upstreamAccount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
