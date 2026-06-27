import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Cpu,
  Layers,
  RefreshCw,
  Search,
  Zap,
} from 'lucide-react';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons';
import {
  formatDecimalAmount,
  formatUserAgentDeviceLabel,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { useTranslation } from 'react-i18next';
import { UsageService, UsageLog } from './usageService';
import { formatUsageLogLocalTime } from './usageFormatting';

const DEFAULT_PAGE_SIZE = 10;
const SPEND_DECIMAL_DIGITS = 9;

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

  return (
    <div className="w-full mx-auto box-border h-[calc(100vh-72px)] overflow-hidden flex flex-col gap-6 animate-in fade-in duration-500 bg-slate-50 p-[5px] dark:bg-[#121212]">
      <div className="shrink-0 bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/5 rounded-xl p-3 shadow-sm flex flex-col md:flex-row flex-wrap items-center gap-3">
        <div className="relative w-full md:w-auto flex-1 min-w-[180px]">
          <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={draftQuery.startTime}
            onChange={(event) => updateDraftQuery({ startTime: event.target.value })}
            placeholder={t('console.usage.startTimePlaceholder', 'Start time, for example 2026-04-21 00:00:00')}
            className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-lobster-500 focus:ring-1 focus:ring-lobster-500/20 text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm md:shadow-none"
          />
        </div>

        <div className="relative w-full md:w-auto flex-1 min-w-[180px]">
          <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={draftQuery.endTime}
            onChange={(event) => updateDraftQuery({ endTime: event.target.value })}
            placeholder={t('console.usage.endTimePlaceholder', 'End time, for example 2026-04-21 23:59:59')}
            className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-lobster-500 focus:ring-1 focus:ring-lobster-500/20 text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm md:shadow-none"
          />
        </div>

        <div className="relative w-full md:w-auto flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={draftQuery.searchQuery}
            onChange={(event) => updateDraftQuery({ searchQuery: event.target.value })}
            placeholder={t('console.usage.searchPlaceholder', '搜索密钥、模型、请求或路径...')}
            className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:border-lobster-500 focus:ring-1 focus:ring-lobster-500/20 text-slate-800 dark:text-white transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 shadow-sm md:shadow-none"
          />
        </div>

        <div className="relative w-full md:w-auto flex-[0.5] min-w-[140px]">
          <Layers className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select
            value={draftQuery.status}
            onChange={(event) => updateDraftQuery({ status: event.target.value as UsageLogStatus })}
            className="w-full appearance-none bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 pl-9 pr-8 py-2 rounded-lg text-sm focus:outline-none focus:border-lobster-500 focus:ring-1 focus:ring-lobster-500/20 text-slate-800 dark:text-white transition-all cursor-pointer shadow-sm md:shadow-none"
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
            className="flex-1 md:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            {t('common.actions.query')}
          </button>
          <button
            type="button"
            onClick={() => void resetFilters()}
            className="px-4 py-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-sm font-medium transition-colors border border-slate-200 dark:border-white/10 shadow-sm md:shadow-none"
          >
            {t('common.actions.reset')}
          </button>
          <button
            type="button"
            onClick={() => void loadUsageLogs()}
            className="px-2.5 py-2 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-lg text-sm transition-colors border border-slate-200 dark:border-white/10 shadow-sm md:shadow-none"
            title={t('common.actions.refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

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
        ) : usageLogs.length === 0 ? (
          <BusinessStatePanel
            kind="empty"
            title={t('console.usage.emptyTitle', '未找到使用日志')}
            description={t('console.usage.emptyDescription', 'The usage logs API returned an empty page for the current query.')}
            onRetry={() => void loadUsageLogs()}
            className="flex-1 min-h-0 border-0 bg-transparent"
          />
        ) : (
          <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[1460px]">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#1e1e1e] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/5 select-none text-xs">
                <tr>
                  <th className="px-4 py-3.5 font-medium">{t('console.usage.table.time', 'Time')}</th>
                  <th className="px-4 py-3.5 font-medium">{t('console.usage.table.key', 'Key')}</th>
                  <th className="px-4 py-3.5 font-medium">{t('console.usage.table.group', 'Group')}</th>
                  <th className="px-4 py-3.5 font-medium">{t('console.usage.table.status', 'Status')}</th>
                  <th className="px-4 py-3.5 font-medium">{t('console.usage.table.type', 'Type')}</th>
                  <th className="px-4 py-3.5 font-medium">{t('console.usage.table.model', 'Model')}</th>
                  <th className="px-4 py-3.5 font-medium text-center">{t('console.usage.table.latency', 'Latency')}</th>
                  <th className="px-4 py-3.5 font-medium text-right">{t('console.usage.table.input', 'Input')}</th>
                  <th className="px-4 py-3.5 font-medium text-right">{t('console.usage.table.output', 'Output')}</th>
                  <th className="px-4 py-3.5 font-medium text-right">{t('console.usage.table.cost', 'Spend')}</th>
                  <th className="px-4 py-3.5 font-medium text-center">{t('console.usage.table.ip', 'IP')}</th>
                  <th className="px-4 py-3.5 font-medium text-center">{t('console.usage.table.userAgent', 'User Agent')}</th>
                  <th className="px-4 py-3.5 font-medium">{t('console.usage.table.details', '详情')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300 relative text-xs">
                {usageLogs.map((log) => {
                  const expanded = expandedIds.includes(log.id);
                  const displayModel = log.providerNativeModel || log.model;
                  const modelTooltip = log.requestedModelCatalogKey || displayModel;
                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={(e) => toggleExpand(log.id, e)}
                        className={`group cursor-pointer transition-colors ${
                          expanded
                            ? 'bg-blue-50 dark:bg-blue-900/10'
                            : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-4 py-3.5 font-mono text-xs flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                          <span className="p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                            {expanded ? <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-500" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
                          </span>
                          {formatUsageLogLocalTime(log.time)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded">
                            {log.tokenName}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            title={log.group}
                            className="inline-block max-w-[160px] truncate text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                          >
                            {log.group}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${
                              log.status === 'error'
                                ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                                : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                            }`}
                          >
                            {log.status === 'error' ? <AlertTriangle className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                            {log.status === 'error' ? t('console.usage.status.error', 'Error') : t('console.usage.status.success', 'Success')}
                            {log.httpStatus > 0 && <span className="font-mono">{log.httpStatus}</span>}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                            {log.type}
                          </span>
                        </td>
                        <td
                          title={modelTooltip}
                          className="px-4 py-3.5 font-medium text-blue-600 dark:text-blue-400 flex items-center gap-1.5"
                        >
                          <Cpu className="w-3.5 h-3.5 opacity-70" />
                          <span className="inline-block max-w-[220px] truncate">{displayModel}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="text-amber-600 dark:text-amber-400 font-mono text-[10px] bg-amber-50 dark:bg-amber-500/10 px-1.5 rounded border border-amber-100 dark:border-transparent">{log.totalTime}</span>
                            <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10px] bg-emerald-50 dark:bg-emerald-500/10 px-1.5 rounded border border-emerald-100 dark:border-transparent">{log.ttft}</span>
                            {log.isStream && (
                              <span className="text-[10px] bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 px-1.5 rounded font-bold border border-blue-200 dark:border-transparent">{t('console.usage.badge.stream', 'stream')}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right flex flex-col items-end justify-center h-full min-h-[48px]">
                          <span className="font-mono text-slate-800 dark:text-slate-200">{log.inputTokens}</span>
                          <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                            {t('console.usage.metric.cache', 'cache')} {log.cacheReadTokens}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono text-slate-800 dark:text-slate-200 align-top pt-4">
                          {log.outputTokens}
                        </td>
                        <td className="px-4 py-3.5 text-right font-mono font-medium text-rose-600 dark:text-rose-500 flex items-center justify-end gap-1 min-h-[48px] align-top pt-4 justify-self-end w-full text-xs">
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          {formatDecimalAmount(log.cost, SPEND_DECIMAL_DIGITS)}
                        </td>
                        <td className="px-4 py-3.5 text-center align-top pt-4">
                          <span className="font-mono text-xs text-slate-500 border-b border-dashed border-slate-300 dark:border-white/20">
                            {log.ip || '-'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center align-top pt-4">
                          <span
                            title={log.userAgent}
                            className="inline-block max-w-[160px] truncate text-xs text-slate-500 border-b border-dashed border-slate-300 dark:border-white/20"
                          >
                            {formatUserAgentDeviceLabel(log.userAgent)}
                          </span>
                        </td>
                        <td className="px-4 py-2 align-top pt-3 text-[11px] leading-relaxed">
                          <div className="text-slate-500 dark:text-slate-400">
                            {t('console.usage.metric.multiplier', 'multiplier')} <span className="text-slate-800 dark:text-slate-300 font-mono">{formatDecimalAmount(log.multiplier, 6)}x</span>
                          </div>
                          <div className="flex items-center gap-1 whitespace-nowrap text-slate-500">
                            {t('console.usage.metric.input', 'input')} <Zap className="w-3 h-3 text-rose-500/70" /> {formatDecimalAmount(log.baseInputPrice, 6)} / 1M
                          </div>
                          <div className="flex items-center gap-1 whitespace-nowrap text-slate-500">
                            {t('console.usage.metric.cache', 'cache')} <Zap className="w-3 h-3 text-rose-500/70" /> {formatDecimalAmount(log.cacheReadPrice, 6)} / 1M
                          </div>
                        </td>
                      </tr>

                      {expanded && (
                        <tr className="bg-slate-50 dark:bg-[#1e1e1e]">
                          <td colSpan={13} className="p-0 border-t border-b border-slate-200 dark:border-white/5">
                            <div className="py-5 px-6 flex gap-6 text-xs">
                              <div className="flex flex-col gap-3 text-slate-500 text-right font-medium min-w-[100px] shrink-0">
                                <div>{t('console.usage.detail.requestId', 'Request ID')}</div>
                                <div>{t('console.usage.detail.cacheTokens', 'Cache tokens')}</div>
                                <div>{t('console.usage.detail.pricing', 'Pricing')}</div>
                                <div className="mt-7">{t('console.usage.detail.formula', 'Formula')}</div>
                                <div className="mt-[72px]">{t('console.usage.detail.reasoning', 'Reasoning')}</div>
                                <div>{t('console.usage.detail.path', 'Path')}</div>
                                {log.status === 'error' && <div>{t('console.usage.detail.error', 'Error')}</div>}
                              </div>

                              <div className="flex flex-col gap-3 text-slate-700 dark:text-slate-300">
                                <div className="font-mono text-[11px] py-0.5 text-slate-500 dark:text-slate-400">{log.requestId}</div>
                                <div className="font-mono text-[11px] py-0.5 text-slate-500 dark:text-slate-400">{log.cacheReadTokens}</div>

                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1 px-3 bg-white dark:bg-white/5 rounded border border-slate-200 dark:border-white/5 w-fit shadow-sm dark:shadow-none">
                                  <span>{t('console.usage.metric.input', 'input')} <Zap className="w-3 h-3 inline-block text-rose-500 -mt-0.5" /> {formatDecimalAmount(log.baseInputPrice, 6)} / 1M {t('console.usage.unit.tokens', 'tokens')},</span>
                                  <span>{t('console.usage.metric.output', 'output')} <Zap className="w-3 h-3 inline-block text-rose-500 -mt-0.5" /> {formatDecimalAmount(log.baseOutputPrice, 6)} / 1M {t('console.usage.unit.tokens', 'tokens')},</span>
                                  <span>{t('console.usage.metric.cache', 'cache')} <Zap className="w-3 h-3 inline-block text-rose-500 -mt-0.5" /> {formatDecimalAmount(log.cacheReadPrice, 6)} / 1M {t('console.usage.unit.tokens', 'tokens')},</span>
                                  <span>{t('console.usage.metric.multiplier', 'multiplier')} {formatDecimalAmount(log.multiplier, 6)}x</span>
                                </div>

                                <div className="mt-1 flex flex-col gap-1.5 p-3 bg-white dark:bg-[#161616] rounded-lg border border-slate-200 dark:border-white/5 font-mono text-[11px] shadow-sm dark:shadow-none">
                                  <div className="text-slate-500 dark:text-slate-400">{t('console.usage.detail.inputPrice', 'input price:')} <Zap className="w-3 h-3 inline-block text-rose-500/80 -mt-0.5" /> {formatDecimalAmount(log.baseInputPrice, 6)} / 1M {t('console.usage.unit.tokens', 'tokens')}</div>
                                  <div className="text-slate-500 dark:text-slate-400">{t('console.usage.detail.outputPrice', 'output price:')} <Zap className="w-3 h-3 inline-block text-rose-500/80 -mt-0.5" /> {formatDecimalAmount(log.baseOutputPrice, 6)} / 1M {t('console.usage.unit.tokens', 'tokens')}</div>
                                  <div className="text-slate-500 dark:text-slate-400 mb-1">{t('console.usage.detail.cachePrice', 'cache price:')} <Zap className="w-3 h-3 inline-block text-rose-500/80 -mt-0.5" /> {formatDecimalAmount(log.cacheReadPrice, 6)} / 1M {t('console.usage.unit.tokens', 'tokens')}</div>
                                  <div className="text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-white/5 p-2 rounded">
                                    {`(${t('console.usage.metric.input', 'input')} ${log.inputTokens - log.cacheReadTokens} / 1M * `}
                                    <Zap className="w-3 h-3 inline-block text-rose-500/80 -mt-0.5" />
                                    {` ${formatDecimalAmount(log.baseInputPrice, 6)} + ${t('console.usage.metric.cache', 'cache')} ${log.cacheReadTokens} / 1M * `}
                                    <Zap className="w-3 h-3 inline-block text-rose-500/80 -mt-0.5" />
                                    {` ${formatDecimalAmount(log.cacheReadPrice, 6)} + ${t('console.usage.metric.output', 'output')} ${log.outputTokens} / 1M * `}
                                    <Zap className="w-3 h-3 inline-block text-rose-500/80 -mt-0.5" />
                                    {` ${formatDecimalAmount(log.baseOutputPrice, 6)}) * ${t('console.usage.metric.multiplier', 'multiplier')} ${formatDecimalAmount(log.multiplier, 6)} = `}
                                    <Zap className="w-3 h-3 inline-block text-rose-500 -mt-0.5" />
                                    <span className="font-bold text-rose-600 dark:text-rose-500 ml-1">{formatDecimalAmount(log.cost, SPEND_DECIMAL_DIGITS)}</span>
                                  </div>
                                  <div className="text-slate-400 dark:text-slate-500 mt-1 italic">{t('console.usage.detail.reference', 'Reference only; the ledger is the source of truth.')}</div>
                                </div>

                                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{log.reasoningEffort}</div>
                                <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{log.path}</div>
                                {log.status === 'error' && (
                                  <div className="max-w-[760px] rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                                    <div className="font-mono text-[11px]">
                                      {[log.errorType, log.errorCode, log.httpStatus > 0 ? `HTTP ${log.httpStatus}` : ''].filter(Boolean).join(' / ') || t('console.usage.status.error', 'Error')}
                                    </div>
                                    {log.errorMessage && (
                                      <div className="mt-1 whitespace-normal break-words leading-relaxed">{log.errorMessage}</div>
                                    )}
                                  </div>
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

        <div className="shrink-0 p-4 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-[#1e1e1e]/50">
          <div className="text-slate-500">
            {t('console.usage.pagination.showing', 'Showing {{start}} - {{end}} of {{total}}', {
              start: visibleStart,
              end: visibleEnd,
              total: totalLogs,
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 mr-2">{t('console.usage.pagination.page', 'Page {{page}} / {{pageCount}}', { page, pageCount })}</span>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => void goToPage(page - 1)}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 disabled:opacity-50"
            >
              <ChevronRight className="w-3.5 h-3.5 rotate-180" />
            </button>
            <span className="w-7 h-7 flex items-center justify-center rounded bg-blue-600 text-white font-medium">{page}</span>
            <button
              type="button"
              disabled={page >= pageCount || loading}
              onClick={() => void goToPage(page + 1)}
              className="w-7 h-7 flex items-center justify-center rounded border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/5 disabled:opacity-50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
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
              className="ml-2 bg-white dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 rounded px-2 py-1 focus:outline-none focus:border-lobster-500 text-slate-700 dark:text-slate-300"
            >
              <option value={10}>{t('console.usage.pagination.pageSize', '{{size}} / page', { size: 10 })}</option>
              <option value={20}>{t('console.usage.pagination.pageSize', '{{size}} / page', { size: 20 })}</option>
              <option value={50}>{t('console.usage.pagination.pageSize', '{{size}} / page', { size: 50 })}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
