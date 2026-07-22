import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Cpu,
  Layers,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react';
import { BusinessStatePanel, BusinessStateTableRow } from '@sdkwork/clawroutes-pc-commons';
import {
  formatUserAgentDeviceLabel,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { useTranslation } from 'react-i18next';
import { UsageService, UsageLog } from './usageService';
import { formatUsageLogLocalTime } from './usageFormatting';

const DEFAULT_PAGE_SIZE = 20;
const DISPLAY_DECIMAL_DIGITS = 2;

function formatDisplayAmount(value: string): string {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return (0).toFixed(DISPLAY_DECIMAL_DIGITS);
  }
  return num.toFixed(DISPLAY_DECIMAL_DIGITS);
}

type UsageLogStatus = 'all' | 'success' | 'error';

type UsageLogQueryState = {
  page: number;
  pageSize: number;
  searchQuery: string;
  status: UsageLogStatus;
  startTime: string;
  endTime: string;
};

const defaultUsageLogQuery: UsageLogQueryState = {
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  searchQuery: '',
  status: 'all',
  startTime: '',
  endTime: '',
};

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

function getUsageLoadErrorMessage(error: unknown, fallback: string, t: TranslationFunction): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message.startsWith('console.')) {
      return t(message, fallback);
    }
    if (message) {
      return message;
    }
  }
  return fallback;
}

function buildUsageLogQuery(query: UsageLogQueryState): Record<string, string | number> {
  const params: Record<string, string | number> = {
    page: query.page,
    pageSize: query.pageSize,
  };
  const searchQuery = query.searchQuery.trim();
  const startTime = query.startTime.trim();
  const endTime = query.endTime.trim();

  if (searchQuery) {
    params.searchQuery = searchQuery;
  }
  if (query.status !== 'all') {
    params.status = query.status;
  }
  if (startTime) {
    params.startTime = startTime;
  }
  if (endTime) {
    params.endTime = endTime;
  }
  return params;
}

function toSafeNumber(value: string | number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function UsageView() {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [query, setQuery] = useState<UsageLogQueryState>(defaultUsageLogQuery);
  const [draftQuery, setDraftQuery] = useState<UsageLogQueryState>(defaultUsageLogQuery);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const page = query.page;
  const pageSize = query.pageSize;
  const pageCount = Math.max(1, Math.ceil(totalLogs / pageSize));
  const visibleStart = usageLogs.length > 0 ? (page - 1) * pageSize + 1 : 0;
  const visibleEnd = usageLogs.length > 0 ? visibleStart + usageLogs.length - 1 : 0;

  const pageStats = useMemo(() => {
    if (usageLogs.length === 0) {
      return { pageCost: 0, errorCount: 0, errorRate: 0, inputTokens: 0, outputTokens: 0 };
    }
    let pageCost = 0;
    let errorCount = 0;
    let inputTokens = 0;
    let outputTokens = 0;
    for (const log of usageLogs) {
      pageCost += toSafeNumber(log.cost);
      if (log.status === 'error') errorCount += 1;
      inputTokens += log.inputTokens || 0;
      outputTokens += log.outputTokens || 0;
    }
    return {
      pageCost,
      errorCount,
      errorRate: errorCount / usageLogs.length,
      inputTokens,
      outputTokens,
    };
  }, [usageLogs]);

  const loadUsageLogs = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await UsageService.fetchLogs(buildUsageLogQuery(query));
      if (isActive()) {
        setUsageLogs(data.logs);
        setTotalLogs(data.total);
        setExpandedIds([]);
      }
    } catch (error) {
      if (isActive()) {
        setUsageLogs([]);
        setTotalLogs(0);
        setExpandedIds([]);
        setLoadError(getUsageLoadErrorMessage(error, t('console.usage.loadErrorFallback', '使用日志加载失败。'), t));
      }
    } finally {
      if (isActive()) {
        setLoading(false);
      }
    }
  }, [query, t]);

  useEffect(() => {
    let active = true;
    void loadUsageLogs(() => active);
    return () => {
      active = false;
    };
  }, [loadUsageLogs]);

  const applyFilters = useCallback(() => {
    const nextQuery = {
      ...draftQuery,
      page: 1,
    };
    setDraftQuery(nextQuery);
    setQuery(nextQuery);
  }, [draftQuery]);

  const resetFilters = useCallback(() => {
    setDraftQuery(defaultUsageLogQuery);
    setQuery(defaultUsageLogQuery);
  }, []);

  const goToPage = useCallback((targetPage: number) => {
    const nextPage = Math.min(Math.max(1, targetPage), pageCount);
    const nextQuery = {
      ...query,
      page: nextPage,
    };
    setDraftQuery(nextQuery);
    setQuery(nextQuery);
  }, [pageCount, query]);

  const updateDraftQuery = useCallback(
    (patch: Partial<UsageLogQueryState>) => {
      setDraftQuery(current => ({
        ...current,
        ...patch,
      }));
    },
    [],
  );

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const errorRatePercent = pageStats.errorRate > 0
    ? `${(pageStats.errorRate * 100).toFixed(1)}%`
    : '0%';

  return (
    <div className="mx-auto box-border flex h-full w-full flex-col gap-4 overflow-hidden bg-slate-50 animate-in fade-in duration-500 dark:bg-[#121212]">
      {/* 页面标题 + 关键指标摘要 */}
      <div className="shrink-0 px-1 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            {t('console.menu.usage', '调用统计')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('console.usage.subtitle', '查看 API 调用日志、计费明细与性能指标')}
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full md:w-auto">
          <div className="flex flex-col px-3.5 py-2 rounded-lg bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/5 shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
              {t('console.usage.stat.total', '总记录')}
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">
              {totalLogs.toLocaleString()}
            </span>
          </div>
          <div className="flex flex-col px-3.5 py-2 rounded-lg bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/5 shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
              {t('console.usage.stat.pageCost', '本页花费')}
            </span>
            <span className="text-sm font-semibold text-rose-600 dark:text-rose-400 font-mono">
              {formatDisplayAmount(String(pageStats.pageCost))}
            </span>
          </div>
          <div className="flex flex-col px-3.5 py-2 rounded-lg bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/5 shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
              {t('console.usage.stat.errorRate', '本页错误率')}
            </span>
            <span className={`text-sm font-semibold font-mono ${pageStats.errorCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {errorRatePercent}
            </span>
          </div>
          <div className="flex flex-col px-3.5 py-2 rounded-lg bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/5 shadow-sm">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">
              {t('console.usage.stat.tokens', '本页 Tokens')}
            </span>
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 font-mono">
              {(pageStats.inputTokens + pageStats.outputTokens).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 筛选条 */}
      <div className="shrink-0 bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/5 rounded-xl p-3 shadow-sm flex flex-col md:flex-row flex-wrap items-center gap-3">
        <div className="relative w-full md:w-auto flex-1 min-w-[180px]">
          <input
            type="text"
            value={draftQuery.startTime}
            onChange={(event) => updateDraftQuery({ startTime: event.target.value })}
            placeholder={t('console.usage.startTimePlaceholder', 'Start time, for example 2026-04-21 00:00:00')}
            className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="relative w-full md:w-auto flex-1 min-w-[180px]">
          <input
            type="text"
            value={draftQuery.endTime}
            onChange={(event) => updateDraftQuery({ endTime: event.target.value })}
            placeholder={t('console.usage.endTimePlaceholder', 'End time, for example 2026-04-21 23:59:59')}
            className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="relative w-full md:w-auto flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={draftQuery.searchQuery}
            onChange={(event) => updateDraftQuery({ searchQuery: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void applyFilters();
            }}
            placeholder={t('console.usage.searchPlaceholder', '搜索密钥、模型、请求或路径...')}
            className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        <div className="relative w-full md:w-auto min-w-[140px]">
          <Layers className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={draftQuery.status}
            onChange={(event) => updateDraftQuery({ status: event.target.value as UsageLogStatus })}
            className="w-full appearance-none bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 pl-9 pr-8 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 text-slate-800 dark:text-white transition-all cursor-pointer"
          >
            <option value="all">{t('console.usage.status.all', 'All statuses')}</option>
            <option value="success">{t('console.usage.status.success', 'Success')}</option>
            <option value="error">{t('console.usage.status.error', 'Error')}</option>
          </select>
          <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={() => void applyFilters()}
            className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:ring-offset-1 dark:focus:ring-offset-[#252525]"
          >
            {t('common.actions.query')}
          </button>
          <button
            type="button"
            onClick={() => void resetFilters()}
            className="px-3.5 py-2 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {t('common.actions.reset')}
          </button>
          <button
            type="button"
            onClick={() => void loadUsageLogs()}
            className="px-2.5 py-2 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-sm transition-colors border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            title={t('common.actions.refresh')}
            aria-label={t('common.actions.refresh')}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 表格卡片 */}
      <div className="bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/5 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 w-full">
        {loading ? (
          <BusinessStatePanel
            kind="loading"
            title={t('console.usage.loading', '正在加载使用日志...')}
            className="flex-1 min-h-0 border-0 bg-transparent"
          />
        ) : loadError ? (
          <BusinessStatePanel
            kind="error"
            title={t('console.usage.loadErrorTitle', '使用日志加载失败')}
            description={loadError}
            onRetry={() => void loadUsageLogs()}
            className="flex-1 min-h-0 border-0 bg-transparent"
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[1200px]">
              <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-[#1c1c1c] text-slate-600 dark:text-slate-300 border-b-2 border-slate-200 dark:border-white/10 select-none">
                <tr>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">{t('console.usage.table.time', 'Time')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">{t('console.usage.table.key', 'Key')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">{t('console.usage.table.group', 'Group')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">{t('console.usage.table.status', 'Status')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">{t('console.usage.table.type', 'Type')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">{t('console.usage.table.model', 'Model')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-center">{t('console.usage.table.latency', 'Latency')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">{t('console.usage.table.input', 'Input')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">{t('console.usage.table.output', 'Output')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-right">{t('console.usage.table.cost', 'Spend')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-center">{t('console.usage.table.ip', 'IP')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider text-center">{t('console.usage.table.userAgent', 'User Agent')}</th>
                  <th className="px-4 py-3 font-semibold text-[11px] uppercase tracking-wider">{t('console.usage.table.details', '详情')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300 text-xs">
                {usageLogs.length === 0 ? (
                  <BusinessStateTableRow
                    kind="empty"
                    colSpan={13}
                    title={t('console.usage.emptyTitle', '未找到使用日志')}
                    description={t('console.usage.emptyDescription', 'The usage logs API returned an empty page for the current query.')}
                    onRetry={() => void loadUsageLogs()}
                  />
                ) : usageLogs.map((log, index) => {
                  const expanded = expandedIds.includes(log.id);
                  const displayModel = log.providerNativeModel || log.model;
                  const modelTooltip = log.requestedModelCatalogKey || displayModel;
                  const rowBg = expanded
                    ? 'bg-blue-50/70 dark:bg-blue-500/[0.06]'
                    : index % 2 === 1
                      ? 'bg-slate-50/50 dark:bg-white/[0.015] hover:bg-slate-100/80 dark:hover:bg-white/[0.04]'
                      : 'hover:bg-slate-100/80 dark:hover:bg-white/[0.04]';
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={(e) => toggleExpand(log.id, e)}
                        className={`group cursor-pointer transition-colors ${rowBg}`}
                      >
                        {/* Time */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-mono">
                            <span className="p-0.5 rounded-md group-hover:bg-slate-200 dark:group-hover:bg-white/10 transition-colors">
                              {expanded
                                ? <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                : <ChevronRight className="w-4 h-4 text-slate-400" />}
                            </span>
                            <span>{formatUsageLogLocalTime(log.time)}</span>
                          </div>
                        </td>
                        {/* Key */}
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-block font-mono text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-md text-slate-700 dark:text-slate-200">
                            {log.tokenName}
                          </span>
                        </td>
                        {/* Group */}
                        <td className="px-4 py-3 align-middle">
                          <span
                            title={log.group}
                            className="inline-block max-w-[160px] truncate text-[11px] px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                          >
                            {log.group}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="px-4 py-3 align-middle">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border font-medium ${
                              log.status === 'error'
                                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                            }`}
                          >
                            {log.status === 'error' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            {log.status === 'error' ? t('console.usage.status.error', 'Error') : t('console.usage.status.success', 'Success')}
                            {log.httpStatus > 0 && <span className="font-mono opacity-75">{log.httpStatus}</span>}
                          </span>
                        </td>
                        {/* Type */}
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-block text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 font-medium">
                            {log.type}
                          </span>
                        </td>
                        {/* Model */}
                        <td className="px-4 py-3 align-middle">
                          <div
                            title={modelTooltip}
                            className="flex items-center gap-1.5 font-medium text-blue-600 dark:text-blue-400"
                          >
                            <Cpu className="w-3.5 h-3.5 opacity-70 shrink-0" />
                            <span className="inline-block max-w-[220px] truncate">{displayModel}</span>
                          </div>
                        </td>
                        {/* Latency */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-amber-700 dark:text-amber-400 font-mono text-[11px] bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-500/20">{log.totalTime}</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[11px] bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-100 dark:border-emerald-500/20">{log.ttft}</span>
                            {log.isStream && (
                              <span className="text-[11px] bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded font-semibold border border-blue-200 dark:border-blue-500/20">stream</span>
                            )}
                          </div>
                        </td>
                        {/* Input */}
                        <td className="px-4 py-3 align-middle text-right">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-mono text-slate-800 dark:text-slate-200">{log.inputTokens.toLocaleString()}</span>
                            {log.cacheReadTokens > 0 && (
                              <span className="text-[10px] text-slate-400 font-mono">
                                {t('console.usage.metric.cache', 'cache')} {log.cacheReadTokens.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Output */}
                        <td className="px-4 py-3 align-middle text-right font-mono text-slate-800 dark:text-slate-200">
                          {log.outputTokens.toLocaleString()}
                        </td>
                        {/* Cost */}
                        <td className="px-4 py-3 align-middle text-right">
                          <div className="flex items-center justify-end gap-1 text-rose-600 dark:text-rose-400 font-mono font-medium">
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>{formatDisplayAmount(log.cost)}</span>
                          </div>
                        </td>
                        {/* IP */}
                        <td className="px-4 py-3 align-middle text-center">
                          <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                            {log.ip || '—'}
                          </span>
                        </td>
                        {/* User Agent */}
                        <td className="px-4 py-3 align-middle text-center">
                          <span
                            title={log.userAgent}
                            className="inline-block max-w-[160px] truncate text-[11px] text-slate-500 dark:text-slate-400"
                          >
                            {formatUserAgentDeviceLabel(log.userAgent)}
                          </span>
                        </td>
                        {/* Details */}
                        <td className="px-4 py-3 align-middle">
                          <div className="flex flex-col gap-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                            <div>
                              <span className="text-slate-400 dark:text-slate-500">{t('console.usage.metric.multiplier', 'multiplier')}</span>{' '}
                              <span className="text-slate-700 dark:text-slate-200 font-mono">{formatDisplayAmount(log.multiplier)}x</span>
                            </div>
                            <div className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
                              {formatDisplayAmount(log.baseInputPrice)} / {formatDisplayAmount(log.cacheReadPrice)}
                            </div>
                          </div>
                        </td>
                      </tr>

                      {/* 展开详情行 */}
                      {expanded && (
                        <tr className="bg-slate-50/80 dark:bg-[#1c1c1c]">
                          <td colSpan={13} className="p-0 border-t border-b border-slate-200 dark:border-white/5">
                            <div className="py-4 px-5">
                              <div className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-xs">
                                {/* Request ID */}
                                <div className="text-right font-medium text-slate-500 dark:text-slate-400 self-center">{t('console.usage.detail.requestId', 'Request ID')}</div>
                                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 self-center">{log.requestId}</div>

                                {/* Cache tokens */}
                                <div className="text-right font-medium text-slate-500 dark:text-slate-400 self-center">{t('console.usage.detail.cacheTokens', 'Cache tokens')}</div>
                                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 self-center">{log.cacheReadTokens.toLocaleString()}</div>

                                {/* Pricing */}
                                <div className="text-right font-medium text-slate-500 dark:text-slate-400 self-start pt-1">{t('console.usage.detail.pricing', 'Pricing')}</div>
                                <div className="self-start">
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-1 px-3 bg-white dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/5 w-fit shadow-sm dark:shadow-none">
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {t('console.usage.metric.input', 'input')} <span className="font-mono text-rose-600 dark:text-rose-400">{formatDisplayAmount(log.baseInputPrice)}</span>
                                      <span className="text-slate-400"> / 1M {t('console.usage.unit.tokens', 'tokens')}</span>
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {t('console.usage.metric.output', 'output')} <span className="font-mono text-rose-600 dark:text-rose-400">{formatDisplayAmount(log.baseOutputPrice)}</span>
                                      <span className="text-slate-400"> / 1M {t('console.usage.unit.tokens', 'tokens')}</span>
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {t('console.usage.metric.cache', 'cache')} <span className="font-mono text-rose-600 dark:text-rose-400">{formatDisplayAmount(log.cacheReadPrice)}</span>
                                      <span className="text-slate-400"> / 1M {t('console.usage.unit.tokens', 'tokens')}</span>
                                    </span>
                                    <span className="text-slate-600 dark:text-slate-300">
                                      {t('console.usage.metric.multiplier', 'multiplier')} <span className="font-mono text-blue-600 dark:text-blue-400">{formatDisplayAmount(log.multiplier)}x</span>
                                    </span>
                                  </div>
                                </div>

                                {/* Formula */}
                                <div className="text-right font-medium text-slate-500 dark:text-slate-400 self-start pt-1">{t('console.usage.detail.formula', 'Formula')}</div>
                                <div className="self-start">
                                  <div className="flex flex-col gap-1.5 p-3 bg-white dark:bg-[#161616] rounded-lg border border-slate-200 dark:border-white/5 font-mono text-[11px] shadow-sm dark:shadow-none max-w-[640px]">
                                    <div className="text-slate-500 dark:text-slate-400">
                                      {t('console.usage.detail.inputPrice', 'input price:')} <span className="text-rose-600 dark:text-rose-400">{formatDisplayAmount(log.baseInputPrice)}</span> / 1M {t('console.usage.unit.tokens', 'tokens')}
                                    </div>
                                    <div className="text-slate-500 dark:text-slate-400">
                                      {t('console.usage.detail.outputPrice', 'output price:')} <span className="text-rose-600 dark:text-rose-400">{formatDisplayAmount(log.baseOutputPrice)}</span> / 1M {t('console.usage.unit.tokens', 'tokens')}
                                    </div>
                                    <div className="text-slate-500 dark:text-slate-400 mb-1">
                                      {t('console.usage.detail.cachePrice', 'cache price:')} <span className="text-rose-600 dark:text-rose-400">{formatDisplayAmount(log.cacheReadPrice)}</span> / 1M {t('console.usage.unit.tokens', 'tokens')}
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-2.5 rounded leading-relaxed break-all">
                                      {`(${t('console.usage.metric.input', 'input')} ${(log.inputTokens - log.cacheReadTokens).toLocaleString()} / 1M × ${formatDisplayAmount(log.baseInputPrice)}`}
                                      {` + ${t('console.usage.metric.cache', 'cache')} ${log.cacheReadTokens.toLocaleString()} / 1M × ${formatDisplayAmount(log.cacheReadPrice)}`}
                                      {` + ${t('console.usage.metric.output', 'output')} ${log.outputTokens.toLocaleString()} / 1M × ${formatDisplayAmount(log.baseOutputPrice)})`}
                                      {` × ${formatDisplayAmount(log.multiplier)} = `}
                                      <span className="font-bold text-rose-600 dark:text-rose-400">{formatDisplayAmount(log.cost)}</span>
                                    </div>
                                    <div className="text-slate-400 dark:text-slate-500 italic text-[10px]">{t('console.usage.detail.reference', 'Reference only; the ledger is the source of truth.')}</div>
                                  </div>
                                </div>

                                {/* Reasoning */}
                                <div className="text-right font-medium text-slate-500 dark:text-slate-400 self-center">{t('console.usage.detail.reasoning', 'Reasoning')}</div>
                                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 self-center">{log.reasoningEffort || '—'}</div>

                                {/* Path */}
                                <div className="text-right font-medium text-slate-500 dark:text-slate-400 self-center">{t('console.usage.detail.path', 'Path')}</div>
                                <div className="font-mono text-[11px] text-slate-600 dark:text-slate-300 self-center break-all">{log.path}</div>

                                {/* Error */}
                                {log.status === 'error' && (
                                  <>
                                    <div className="text-right font-medium text-rose-600 dark:text-rose-400 self-start pt-1">{t('console.usage.detail.error', 'Error')}</div>
                                    <div className="self-start max-w-[760px]">
                                      <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                                        <div className="font-mono text-[11px]">
                                          {[log.errorType, log.errorCode, log.httpStatus > 0 ? `HTTP ${log.httpStatus}` : ''].filter(Boolean).join(' / ') || t('console.usage.status.error', 'Error')}
                                        </div>
                                        {log.errorMessage && (
                                          <div className="mt-1 whitespace-normal break-words leading-relaxed">{log.errorMessage}</div>
                                        )}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 分页栏 */}
        <div className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50/80 dark:bg-[#1c1c1c]/60">
          <div className="text-slate-500 dark:text-slate-400">
            {t('console.usage.pagination.showing', 'Showing {{start}} - {{end}} of {{total}}', {
              start: visibleStart,
              end: visibleEnd,
              total: totalLogs,
            })}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void goToPage(1)}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label={t('console.usage.pagination.first', '第一页')}
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void goToPage(page - 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label={t('console.usage.pagination.prev', '上一页')}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-3 h-7 flex items-center rounded-md bg-blue-600 text-white font-medium text-[11px] shadow-sm">{page}</span>
            <span className="text-slate-400 dark:text-slate-500 px-1">/</span>
            <span className="text-slate-600 dark:text-slate-300 font-medium px-1">{pageCount}</span>
            <button
              type="button"
              disabled={page >= pageCount || loading}
              onClick={() => void goToPage(page + 1)}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label={t('console.usage.pagination.next', '下一页')}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              disabled={page >= pageCount || loading}
              onClick={() => void goToPage(pageCount)}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label={t('console.usage.pagination.last', '最后一页')}
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
            <div className="relative ml-2">
              <select
                value={draftQuery.pageSize}
                onChange={(event) => {
                  const nextPageSize = Number(event.target.value);
                  const nextQuery = {
                    ...draftQuery,
                    page: 1,
                    pageSize: nextPageSize,
                  };
                  setDraftQuery(nextQuery);
                  setQuery(nextQuery);
                }}
                className="appearance-none bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded-md pl-2.5 pr-7 py-1 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 cursor-pointer text-[11px]"
              >
                <option value={10}>{t('console.usage.pagination.pageSize', '{{size}} / page', { size: 10 })}</option>
                <option value={20}>{t('console.usage.pagination.pageSize', '{{size}} / page', { size: 20 })}</option>
                <option value={50}>{t('console.usage.pagination.pageSize', '{{size}} / page', { size: 50 })}</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
