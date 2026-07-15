import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Bell,
  Clock,
  ExternalLink,
  Gauge,
  Image as ImageIcon,
  Loader2,
  PieChart as PieChartIcon,
  RefreshCw,
  Server,
  TrendingUp,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons';

import {
  DashboardService,
  type Announcement,
  type ConfigurationDomain,
  type DashboardTimeRange,
} from './dashboardService';

import { useTranslation } from 'react-i18next';
type TranslationFunction = ReturnType<typeof useTranslation>['t'];

const SERIES = [
  { key: 'llm (Text)', label: (t: TranslationFunction) => t("console.dashboard.dashboardview.text.1bpl7go", "文本对话"), modality: 'text', color: '#eab308' },
  { key: 'image (Midjourney/DALL-E)', label: (t: TranslationFunction) => t("console.dashboard.dashboardview.text.k704rx", "图像生成"), modality: 'image', color: '#ec4899' },
  { key: 'video (Runway/Sora)', label: (t: TranslationFunction) => t("console.dashboard.dashboardview.text.79ganj", "视频生成"), modality: 'video', color: '#8b5cf6' },
  { key: 'audio (Whisper)', label: (t: TranslationFunction) => t("console.dashboard.dashboardview.text.1h7etym", "语音生成"), modality: 'audio', color: '#10b981' },
  { key: 'music (Suno)', label: (t: TranslationFunction) => t("console.dashboard.dashboardview.text.1opihgh", "音乐生成"), modality: 'music', color: '#0ea5e9' },
] as const;

const DEFAULT_VISIBLE_SERIES = SERIES.reduce<Record<string, boolean>>((acc, item) => {
  acc[item.key] = true;
  return acc;
}, {});

// Time-range selector labels use the aggregation granularity (按小时/按天/按月/按年)
// so each option unambiguously describes how data is bucketed, not the window span.
const TIME_RANGE_LABELS: Record<DashboardTimeRange, (t: TranslationFunction) => string> = {
  hourly: (t) => t("console.dashboard.dashboardview.text.granularityHour", "按小时"),
  daily: (t) => t("console.dashboard.dashboardview.text.granularityDay", "按天"),
  monthly: (t) => t("console.dashboard.dashboardview.text.granularityMonth", "按月"),
  yearly: (t) => t("console.dashboard.dashboardview.text.granularityYear", "按年"),
};

// Window span shown in the chart subtitle (e.g. "近 10 年 · 10 个数据点").
const TIME_RANGE_WINDOWS: Record<DashboardTimeRange, (t: TranslationFunction) => string> = {
  hourly: (t) => t("console.dashboard.dashboardview.text.1vwlyi4", "24 小时"),
  daily: (t) => t("console.dashboard.dashboardview.text.16arzm9", "30 天"),
  monthly: (t) => t("console.dashboard.dashboardview.text.1prdfbw", "12 个月"),
  yearly: (t) => t("console.dashboard.dashboardview.text.ee5di", "10 年"),
};

function getDashboardLoadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

type ConfigurationDomainSpeedState = {
  status: 'testing' | 'success' | 'error';
  latencyMs?: number;
  message?: string | null;
};

export function DashboardView() {
  const { t } = useTranslation();
  const [metricType, setMetricType] = useState<'cost' | 'requests'>('cost');
  const [timeRange, setTimeRange] = useState<DashboardTimeRange>('daily');
  const [chartType, setChartType] = useState<'bar' | 'area'>('area');
  const [visibleSeries, setVisibleSeries] = useState(DEFAULT_VISIBLE_SERIES);
  const [domainSpeedStates, setDomainSpeedStates] = useState<Record<string, ConfigurationDomainSpeedState>>({});
  const [snapshot, setSnapshot] = useState(() => DashboardService.emptyDashboardSnapshot());
  const [hasData, setHasData] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  // Refs avoid re-creating loadDashboard (and thus re-triggering the effect) on data arrival,
  // while still letting the render branch read `hasData` reactively.
  const hasDataRef = useRef(false);
  const requestIdRef = useRef(0);

  const loadDashboard = useCallback(async () => {
    const currentRequestId = ++requestIdRef.current;
    const firstLoad = !hasDataRef.current;
    if (firstLoad) {
      setIsInitialLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setLoadError(null);
    try {
      const data = await DashboardService.fetchDashboardOverview(timeRange);
      if (currentRequestId !== requestIdRef.current) {
        // A newer request has started; ignore this stale response.
        return;
      }
      setSnapshot(data);
      hasDataRef.current = true;
      setHasData(true);
      setLoadMessage(data.warnings[0] ?? null);
    } catch (error) {
      if (currentRequestId !== requestIdRef.current) {
        return;
      }
      const message = getDashboardLoadErrorMessage(
        error,
        t("console.dashboard.dashboardview.text.loadErrorFallback", "看板数据加载失败。"),
      );
      if (firstLoad) {
        // No prior data to keep; fall back to an empty snapshot for the full error state.
        setSnapshot(DashboardService.emptyDashboardSnapshot(timeRange));
      }
      // On a refresh failure, keep the previous snapshot so the dashboard stays usable.
      setLoadError(message);
    } finally {
      if (currentRequestId === requestIdRef.current) {
        if (firstLoad) {
          setIsInitialLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    }
  }, [timeRange, t]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const isBusy = isInitialLoading || isRefreshing;
  const showFullLoading = isInitialLoading && !hasData;
  const showFullError = Boolean(loadError) && !hasData;

  const chartData = useMemo(() => {
    return snapshot.chartData.map((item) => {
      const row: Record<string, number | string> = { time: item.time };
      for (const series of SERIES) {
        const value = item[series.key];
        row[series.key] = metricType === 'cost' ? value : Math.round(value);
      }
      return row;
    });
  }, [metricType, snapshot.chartData]);

  const totalValue = useMemo(() => {
    return chartData.reduce((sum, item) => {
      return sum + SERIES.reduce((seriesSum, series) => seriesSum + numberFrom(item[series.key]), 0);
    }, 0);
  }, [chartData]);

  // Thin X-axis ticks for dense series (24 hourly / 30 daily points) while
  // showing every label for the coarser monthly (12) / yearly (10) ranges.
  const xAxisInterval = chartData.length > 12 ? Math.ceil(chartData.length / 10) : 0;

  const pieData = useMemo(() => {
    const totalRequests = snapshot.topModels.reduce((sum, item) => sum + item.requests, 0);
    return SERIES.map((series) => {
      const requests = snapshot.topModels
        .filter((item) => item.modality === series.modality)
        .reduce((sum, item) => sum + item.requests, 0);
      return {
        name: series.label(t),
        value: totalRequests > 0 ? Math.round((requests / totalRequests) * 100) : 0,
        color: series.color,
      };
    });
  }, [snapshot.topModels, t]);

  const chartTooltipStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid rgba(148, 163, 184, 0.35)',
    borderRadius: '8px',
    boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.12)',
    color: '#1e293b',
  };

  const toggleSeries = (key: string) => {
    setVisibleSeries((current) => ({ ...current, [key]: !current[key] }));
  };

  const openConfigurationDomain = useCallback((domain: string) => {
    if (typeof window === 'undefined') {
      return;
    }
    window.open(resolveConfigurationDomainHref(domain), '_blank', 'noopener,noreferrer');
  }, []);

  const handleMeasureConfigurationDomain = useCallback(async (item: ConfigurationDomain) => {
    setDomainSpeedStates((current) => ({
      ...current,
      [item.id]: { status: 'testing' },
    }));
    try {
      const latencyMs = await measureConfigurationDomain(item.domain);
      setDomainSpeedStates((current) => ({
        ...current,
        [item.id]: { status: 'success', latencyMs },
      }));
    } catch (error) {
      const message = error instanceof Error ? translateDashboardLocalValue(error.message, error.message, t) : null;
      setDomainSpeedStates((current) => ({
        ...current,
        [item.id]: { status: 'error', message },
      }));
    }
  }, [t]);

  const maxModelRequests = snapshot.topModels[0]?.requests ?? 0;

  return (
    <div className="min-h-[calc(100vh-72px)] w-full space-y-2 bg-slate-50 px-[5px] pb-[5px] text-slate-800 dark:bg-[#121212] dark:text-slate-100">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={<Wallet className="h-4 w-4 text-blue-500" />}
          title={t("console.dashboard.dashboardview.text.uvto1d", "可用额度")}
          value={t("console.dashboard.dashboardview.text.pointsValue", "{{value}} 点", { value: formatCredits(snapshot.summary.availableCredits) })}
          valueIcon={<Zap className="h-6 w-6 text-amber-500" />}
          footerLabel={t("console.dashboard.dashboardview.text.totalUsedCredits", "历史总消耗")}
          footerValue={t("console.dashboard.dashboardview.text.pointsValue", "{{value}} 点", { value: formatCredits(snapshot.summary.totalUsedCredits) })}
          action={
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#1f1f1f] dark:text-slate-300 dark:hover:bg-white/10"
              disabled={isBusy}
              onClick={() => void loadDashboard()}
              title={t("console.dashboard.dashboardview.text.1j62q6w", "刷新数据")}
              aria-label={t("console.dashboard.dashboardview.text.1j62q6w", "刷新数据")}
            >
              <RefreshCw className={`h-4 w-4 ${isBusy ? 'animate-spin' : ''}`} />
            </button>
          }
        />
        <MetricCard
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          title={t("console.dashboard.dashboardview.text.totalRequestCount", "总请求次数")}
          value={formatCount(snapshot.summary.totalRequestCount)}
          footerLabel={t("console.dashboard.dashboardview.text.windowRequestCount", "当前周期请求")}
          footerValue={t("console.dashboard.dashboardview.text.timesValue", "{{value}} 次", { value: formatCount(snapshot.summary.requestCount) })}
          sparkline={snapshot.requestSparkline}
          sparklineColor="#10b981"
        />
        <MetricCard
          icon={<ImageIcon className="h-4 w-4 text-pink-500" />}
          title={t("console.dashboard.dashboardview.text.174ug4u", "多模态用量")}
          value={formatCount(
            snapshot.summary.imageRequests +
              snapshot.summary.videoRequests +
              snapshot.summary.audioRequests +
              snapshot.summary.musicRequests,
          )}
          footerLabel={t("console.dashboard.dashboardview.text.15zvvl1", "图像 / 视频 / 音频 / 音乐")}
          footerValue={`${formatCount(snapshot.summary.imageRequests)} / ${formatCount(snapshot.summary.videoRequests)} / ${formatCount(snapshot.summary.audioRequests)} / ${formatCount(snapshot.summary.musicRequests)}`}
          sparkline={snapshot.multimodalSparkline}
          sparklineColor="#ec4899"
        />
        <MetricCard
          icon={<Clock className="h-4 w-4 text-indigo-500" />}
          title={t("console.dashboard.dashboardview.text.1celmyr", "吞吐性能")}
          value={`${formatCount(snapshot.summary.rpm)} RPM`}
          footerLabel={t("console.dashboard.dashboardview.text.tpm", "每分钟 Token")}
          footerValue={formatCount(snapshot.summary.tpm)}
          sparkline={snapshot.performanceSparkline}
          sparklineColor="#6366f1"
        />
      </div>

      {loadMessage && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          {loadMessage}
        </div>
      )}

      {showFullLoading ? (
        <BusinessStatePanel
          kind="loading"
          title={t("console.dashboard.dashboardview.text.loadingTitle", "正在加载看板数据...")}
          description={t("console.dashboard.dashboardview.text.loadingDescription", "正在获取用量、模型排行和系统消息。")}
          className="rounded-lg border border-slate-200 bg-white dark:border-white/5 dark:bg-[#252525]"
        />
      ) : showFullError ? (
        <BusinessStatePanel
          kind="error"
          title={t("console.dashboard.dashboardview.text.loadErrorTitle", "看板数据加载失败")}
          description={loadError ?? undefined}
          onRetry={() => void loadDashboard()}
          className="rounded-lg border border-slate-200 bg-white dark:border-white/5 dark:bg-[#252525]"
        />
      ) : (
        <>
      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
          <span className="flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-hidden="true" />
            {loadError}
          </span>
          <button
            type="button"
            disabled={isRefreshing}
            onClick={() => void loadDashboard()}
            className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            {t("console.dashboard.dashboardview.text.retry", "重试")}
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
        <div className="flex flex-col gap-2 xl:col-span-2">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#252525]">
            <div className="flex flex-col gap-2 border-b border-slate-100 p-3 dark:border-white/5 md:flex-row md:items-center md:justify-between">
              <div className="flex flex-col gap-1">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <Activity className="h-5 w-5 text-blue-500" /> {t("console.dashboard.dashboardview.text.1bgdsz6", "用量趋势")}</h2>
                <p className="flex items-center gap-1.5 pl-7 text-xs font-medium text-slate-400 dark:text-slate-500">
                  <span>{t("console.dashboard.dashboardview.text.rangePrefix", "近")} {TIME_RANGE_WINDOWS[timeRange](t)}</span>
                  <span className="text-slate-300 dark:text-slate-600">·</span>
                  <span>{t("console.dashboard.dashboardview.text.pointCount", "{{count}} 个数据点", { count: chartData.length })}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <SegmentedControl
                  options={[
                    { value: 'cost', label: t("console.dashboard.dashboardview.text.1j4app0", "费用") },
                    { value: 'requests', label: t("console.dashboard.dashboardview.text.ch807w", "请求") },
                  ]}
                  value={metricType}
                  onChange={(value) => setMetricType(value as 'cost' | 'requests')}
                />
                <SegmentedControl
                  options={Object.entries(TIME_RANGE_LABELS).map(([value, label]) => ({ value, label: label(t) }))}
                  value={timeRange}
                  disabled={isRefreshing}
                  onChange={(value) => setTimeRange(value as DashboardTimeRange)}
                />
                <SegmentedControl
                  options={[
                    { value: 'area', label: t("console.dashboard.dashboardview.text.qhtww0", "面积图") },
                    { value: 'bar', label: t("admin.dashboard.index.text.mnf7mo", "柱状图") },
                  ]}
                  value={chartType}
                  onChange={(value) => setChartType(value as 'bar' | 'area')}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 dark:border-white/5 dark:bg-[#1e1e1e]/50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("console.dashboard.dashboardview.text.3jbcte", "合计")}</span>
                <span className="flex items-center gap-1 font-mono text-xl font-bold">
                  {metricType === 'cost' && <Zap className="h-4 w-4 text-amber-500" />}
                  {formatMetricValue(totalValue, metricType)}
                </span>
              </div>
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                {SERIES.map((series) => (
                  <button
                    key={series.key}
                    className={`flex items-center gap-1.5 transition-opacity ${visibleSeries[series.key] ? 'hover:opacity-80' : 'opacity-40 grayscale'}`}
                    onClick={() => toggleSeries(series.key)}
                  >
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: series.color }} />
                    {series.label(t)}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative h-[320px] w-full p-3">
              <div className={`h-full w-full transition-opacity duration-200 ${isRefreshing ? 'pointer-events-none opacity-40' : 'opacity-100'}`}>
                {chartData.length === 0 ? (
                  <EmptyState label={t("console.dashboard.dashboardview.text.na2gzj", "暂无趋势数据")} />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.14} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} interval={xAxisInterval} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} tickFormatter={formatAxis} width={50} />
                      <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [formatMetricValue(value, metricType), undefined]} />
                      {SERIES.map((series) =>
                        visibleSeries[series.key] ? <Bar key={series.key} dataKey={series.key} name={series.label(t)} stackId="usage" fill={series.color} radius={[4, 4, 0, 0]} /> : null,
                      )}
                    </BarChart>
                  ) : (
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.14} />
                      <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} interval={xAxisInterval} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }} tickFormatter={formatAxis} width={50} />
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [formatMetricValue(value, metricType), undefined]} />
                        {SERIES.map((series) =>
                          visibleSeries[series.key] ? (
                            <Area key={series.key} type="monotone" dataKey={series.key} name={series.label(t)} stackId="usage" stroke={series.color} fill={series.color} fillOpacity={0.2} strokeWidth={2} />
                          ) : null,
                        )}
                      </AreaChart>
                    )}
                  </ResponsiveContainer>
                )}
              </div>
              {isRefreshing && (
                <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                  <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[#252525]/90 dark:text-slate-300">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />
                    {t("console.dashboard.dashboardview.text.refreshing", "刷新中…")}
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#252525]">
            <div className="flex items-center justify-between border-b border-slate-100 p-3 dark:border-white/5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <TrendingUp className="h-4 w-4 text-emerald-500" /> {t("console.dashboard.dashboardview.text.k4ppgb", "模型排行")}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-xs uppercase text-slate-500 dark:border-white/5 dark:bg-white/[0.02] dark:text-slate-400">
                  <tr>
                    <th className="w-16 px-3 py-2.5 text-center font-semibold">{t("console.dashboard.dashboardview.text.1cp4aqw", "排名")}</th>
                    <th className="px-3 py-2.5 font-semibold">{t("console.dashboard.dashboardview.text.btc9qz", "模型 / 供应商")}</th>
                    <th className="px-3 py-2.5 font-semibold">{t("console.dashboard.dashboardview.text.12udcev", "模态")}</th>
                    <th className="px-3 py-2.5 text-right font-semibold">{t("console.dashboard.dashboardview.text.18c8c2x", "请求量")}</th>
                    <th className="px-3 py-2.5 text-right font-semibold">{t("console.dashboard.dashboardview.text.1j4app0", "费用")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {snapshot.topModels.length === 0 ? (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-400" colSpan={5}>{t("console.dashboard.dashboardview.text.12269p7", "暂无模型排行数据")}</td>
                    </tr>
                  ) : (
                    snapshot.topModels.map((row, index) => {
                      const widthPercent = maxModelRequests > 0 ? Math.max(2, Math.round((row.requests / maxModelRequests) * 100)) : 0;
                      return (
                        <tr key={`${row.rank}-${row.name}-${row.supplier}-${index}`} className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5">
                          <td className="px-3 py-2.5 text-center">
                            <span className="inline-block h-6 w-6 rounded-md bg-slate-100 text-center text-xs font-bold leading-6 text-slate-500 dark:bg-white/5 dark:text-slate-400">{row.rank}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className="font-mono text-[13px] font-semibold text-slate-800 dark:text-slate-100">{row.name}</span>
                              <span className="text-[11px] text-slate-500">{row.supplier}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="rounded-md bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:bg-white/10 dark:text-slate-300">{row.modality}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold ${row.isUp ? 'text-emerald-500' : 'text-rose-500'}`}>{row.trend}</span>
                                <span className="font-mono text-sm font-medium">{formatCount(row.requests)}</span>
                              </div>
                              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-[#1e1e1e]">
                                <div className="h-full rounded-full bg-blue-500/50 dark:bg-blue-400/50" style={{ width: `${widthPercent}%` }} />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className="font-mono text-sm font-bold text-slate-800 dark:text-white">{formatCredits(row.cost)} {t("console.dashboard.dashboardview.text.1gb9aus", "点")}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2 xl:col-span-1">
          <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#252525]">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-3 dark:border-white/5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Server className="h-4 w-4 text-sky-500" /> {t("console.dashboard.dashboardview.text.configInfo", "配置信息")}
              </h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                {t("console.dashboard.dashboardview.text.domainCount", "{{count}} 个服务节点", { count: snapshot.configurationDomains.length })}
              </span>
            </div>
            <div className="max-h-[280px] overflow-y-auto p-2.5">
              {snapshot.configurationDomains.length === 0 ? (
                <EmptyState label={t("console.dashboard.dashboardview.text.noConfigIp", "未配置 IP")} />
              ) : (
                <div className="space-y-2">
                {snapshot.configurationDomains.map((item) => {
                  const speedState = domainSpeedStates[item.id];
                  const speedLabel = formatConfigurationDomainSpeedState(speedState, t);
                  const nodeStatusLabel = formatConfigurationDomainStatus(item.status, t);
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-100 bg-slate-50/50 p-2.5 transition-colors hover:border-slate-200 hover:bg-slate-50 dark:border-white/5 dark:bg-white/[0.02] dark:hover:border-white/10 dark:hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100" title={item.name}>
                            {item.name}
                          </span>
                          <span
                            className={`shrink-0 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${configurationStatusClassName(item.status)}`}
                            title={nodeStatusLabel}
                          >
                            {nodeStatusLabel}
                          </span>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-sky-400/40 dark:hover:bg-sky-400/10 dark:hover:text-sky-200"
                            title={t("console.dashboard.dashboardview.text.openDomain", "跳转")}
                            aria-label={t("console.dashboard.dashboardview.text.openDomain", "跳转")}
                            onClick={() => openConfigurationDomain(item.domain)}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-wait disabled:opacity-70 dark:border-white/10 dark:text-slate-300 dark:hover:border-emerald-400/40 dark:hover:bg-emerald-400/10 dark:hover:text-emerald-200"
                            title={t("console.dashboard.dashboardview.text.speedTest", "测速")}
                            aria-label={t("console.dashboard.dashboardview.text.speedTest", "测速")}
                            disabled={speedState?.status === 'testing'}
                            onClick={() => void handleMeasureConfigurationDomain(item)}
                          >
                            {speedState?.status === 'testing'
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Gauge className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                        <span className="flex items-center gap-1 min-w-0">
                          <span className="shrink-0 text-slate-400 dark:text-slate-500">{t("console.dashboard.dashboardview.text.configDomain", "域名")}</span>
                          <span className="truncate font-mono text-slate-600 dark:text-slate-300" title={item.domain}>{item.domain}</span>
                        </span>
                        {item.ip && (
                          <span className="flex items-center gap-1">
                            <span className="text-slate-400 dark:text-slate-500">IP</span>
                            <span className="font-mono text-slate-500 dark:text-slate-400">{item.ip}</span>
                          </span>
                        )}
                        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${configurationSpeedClassName(speedState)}`}>
                          {speedLabel}
                        </span>
                      </div>
                      {item.remark && (
                        <div className="mt-1 truncate text-[11px] text-slate-400 dark:text-slate-500" title={item.remark}>
                          {item.remark}
                        </div>
                      )}
                    </div>
                  );
                })}
                </div>
              )}
            </div>
          </section>

          <section className="flex h-[240px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#252525]">
            <div className="flex items-center justify-between border-b border-slate-100 p-2.5 dark:border-white/5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <PieChartIcon className="h-4 w-4 text-blue-500" /> {t("console.dashboard.dashboardview.text.da5r28", "模态分布")}</h3>
            </div>
            <div className="flex flex-1 items-center p-2.5">
              {pieData.length === 0 ? (
                <EmptyState label={t("console.dashboard.dashboardview.text.q1xtoy", "暂无分布数据")} />
              ) : (
                <>
                  <div className="h-full w-1/2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={5} stroke="none">
                          {pieData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={chartTooltipStyle} formatter={(value: number) => [`${value}%`, t("console.dashboard.dashboardview.text.wu2yr5", "占比")]} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex w-1/2 flex-col justify-center gap-2 pl-2">
                    {pieData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="text-xs font-bold">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="flex min-h-[200px] flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-[#252525]">
            <div className="flex items-center justify-between border-b border-slate-100 p-2.5 dark:border-white/5">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Bell className="h-4 w-4 text-blue-500" /> {t("console.dashboard.dashboardview.text.1qzse", "系统消息")}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2.5">
              {snapshot.announcements.length === 0 ? (
                <EmptyState label={t("console.dashboard.dashboardview.text.1jcj3x0", "暂无系统消息")} />
              ) : (
                <div className="space-y-2">
                  {snapshot.announcements.map((notice) => (
                    <div key={notice.id} className="group relative border-l-2 border-slate-200 pl-4 dark:border-white/10">
                      <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full ring-4 ring-white dark:ring-[#252525]" style={{ backgroundColor: announcementColor(notice.type) }} />
                      <div className="mb-1 line-clamp-1 cursor-pointer text-sm text-slate-700 transition-colors hover:text-blue-600 dark:text-slate-300 dark:hover:text-white">{formatDashboardAnnouncementText(notice, t)}</div>
                      <div className="font-mono text-[11px] text-slate-500">{formatDashboardAnnouncementTime(notice, t) || '-'}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  valueIcon?: React.ReactNode;
  footerLabel: string;
  footerValue: string;
  sparkline?: { value: number }[];
  sparklineColor?: string;
  action?: React.ReactNode;
}

function MetricCard({ icon, title, value, valueIcon, footerLabel, footerValue, sparkline = [], sparklineColor = '#3b82f6', action }: MetricCardProps) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-blue-500/30 dark:border-white/5 dark:bg-[#252525]">
      <div className="relative z-10">
        <div className="mb-0.5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            {icon} {title}
          </div>
          {action}
        </div>
        <div className="mb-2 mt-1 flex items-center gap-1.5 text-2xl font-bold text-slate-800 dark:text-white lg:text-3xl">
          {valueIcon}
          {value}
        </div>
        <div className="border-t border-slate-100 pt-3 dark:border-white/5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            <Activity className="h-3.5 w-3.5 text-purple-400" /> {footerLabel}
          </div>
          <div className="mt-0.5 text-sm font-bold text-slate-600 dark:text-slate-300">{footerValue}</div>
        </div>
      </div>
      {sparkline.length > 0 && (
        <div className="absolute bottom-3 right-0 h-16 w-1/2 opacity-30">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkline}>
              <Line type="monotone" dataKey="value" stroke={sparklineColor} strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

interface SegmentedControlProps {
  options: { value: string; label: string }[];
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

function SegmentedControl({ options, value, disabled, onChange }: SegmentedControlProps) {
  return (
    <div className={`flex rounded-lg border border-slate-200 bg-slate-100 p-1 transition-opacity dark:border-white/5 dark:bg-[#1e1e1e] ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
            value === option.value
              ? 'bg-white text-slate-800 shadow-sm dark:bg-white/10 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">{label}</div>;
}

function formatConfigurationDomainSpeedState(
  state: ConfigurationDomainSpeedState | undefined,
  t: TranslationFunction,
): string {
  if (!state) {
    return t("console.dashboard.dashboardview.text.speedUntested", "未测速");
  }
  if (state.status === 'testing') {
    return t("console.dashboard.dashboardview.text.speedTesting", "测速中");
  }
  if (state.status === 'success' && typeof state.latencyMs === 'number') {
    return t("console.dashboard.dashboardview.text.speedMs", "{{value}} ms", { value: state.latencyMs });
  }
  return state.message || t("console.dashboard.dashboardview.text.speedFailed", "测速失败");
}

function formatConfigurationDomainStatus(status: string, t: TranslationFunction): string {
  const normalized = status.toLowerCase();
  if (normalized === 'online') {
    return t("console.dashboard.dashboardview.text.statusOnline", "在线");
  }
  if (normalized === 'warning') {
    return t("console.dashboard.dashboardview.text.statusWarning", "告警");
  }
  if (normalized === 'offline') {
    return t("console.dashboard.dashboardview.text.statusOffline", "离线");
  }
  return t("console.dashboard.dashboardview.text.statusUnknown", "未知");
}

function configurationStatusClassName(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === 'online') {
    return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300';
  }
  if (normalized === 'warning') {
    return 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300';
  }
  if (normalized === 'offline') {
    return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300';
  }
  return 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300';
}

function configurationSpeedClassName(state: ConfigurationDomainSpeedState | undefined): string {
  if (state?.status === 'success') {
    return 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300';
  }
  if (state?.status === 'testing') {
    return 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300';
  }
  if (state?.status === 'error') {
    return 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300';
  }
  return 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-300';
}

function resolveConfigurationDomainHref(domain: string): string {
  if (typeof window === 'undefined') {
    return domain;
  }
  return new URL(domain, window.location.href).toString();
}

function measureConfigurationDomain(domain: string, timeoutMs = 5000): Promise<number> {
  if (typeof window === 'undefined' || typeof Image === 'undefined') {
    return Promise.reject(new Error('console.dashboard.dashboardview.text.measurementUnavailable'));
  }

  const url = createConfigurationDomainSpeedUrl(domain);
  const startedAt = performance.now();
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    let timeout = 0;
    const finish = (callback: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      callback();
    };
    timeout = window.setTimeout(() => {
      finish(() => reject(new Error('console.dashboard.dashboardview.text.speedTimeout')));
    }, timeoutMs);
    const resolveLatency = () => {
      finish(() => resolve(Math.max(1, Math.round(performance.now() - startedAt))));
    };

    image.referrerPolicy = 'no-referrer';
    image.onload = resolveLatency;
    image.onerror = resolveLatency;
    image.src = url;
  });
}

function createConfigurationDomainSpeedUrl(domain: string): string {
  const base = typeof window !== 'undefined' ? window.location.href : 'http://localhost/';
  const url = new URL(domain, base);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('console.dashboard.dashboardview.text.domainProtocolError');
  }
  url.pathname = '/favicon.ico';
  url.search = `?claw_router_speed_test=${Date.now()}`;
  url.hash = '';
  return url.toString();
}

function formatDashboardAnnouncementText(notice: Announcement, t: TranslationFunction): string {
  return translateDashboardLocalValue(notice.textI18nKey ?? notice.text, notice.text, t);
}

function formatDashboardAnnouncementTime(notice: Announcement, t: TranslationFunction): string {
  return translateDashboardLocalValue(notice.timeI18nKey ?? notice.time, notice.time, t);
}

function translateDashboardLocalValue(value: string, fallback: string, t: TranslationFunction): string {
  if (value.startsWith('console.dashboard.dashboardview.text.')) {
    return t(value, fallback);
  }
  return value;
}

function formatCredits(value: number): string {
  if (!Number.isFinite(value)) {
    return '0.00';
  }
  return new Intl.NumberFormat('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatCount(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value);
}

function formatMetricValue(value: number, metricType: 'cost' | 'requests'): string {
  return metricType === 'cost' ? formatCredits(value) : formatCount(value);
}

function formatAxis(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}k`;
  }
  return String(value);
}

function numberFrom(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function announcementColor(type: string): string {
  if (type === 'error') {
    return '#f43f5e';
  }
  if (type === 'success') {
    return '#10b981';
  }
  if (type === 'warning') {
    return '#f59e0b';
  }
  return '#3b82f6';
}
