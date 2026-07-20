import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart2,
  Boxes,
  CircleAlert,
  Coins,
  Database,
  DollarSign,
  ExternalLink,
  Fingerprint,
  Image,
  Key,
  Loader2,
  MessageSquare,
  Mic,
  RefreshCw,
  Users,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import {
  AdminDashboardService,
  type DashboardSummaryCard,
  type PieChartData,
  type RecentUsageTrace,
  type TrafficData,
} from './dashboardService';

type ChartPayloadEntry = {
  color?: string;
  name?: string | number;
  value?: string | number;
  payload?: {
    name?: string | number;
    value?: string | number;
    chartValue?: string | number;
    tokens?: string | number;
    requests?: string | number;
    points?: string | number;
    chartTokens?: string | number;
    chartRequests?: string | number;
    chartPoints?: string | number;
  };
};

type CustomTooltipProps = {
  active?: boolean;
  payload?: ChartPayloadEntry[];
  label?: string | number;
};

type CustomPieLegendProps = {
  payload?: ChartPayloadEntry[];
  unit: '$' | '%';
};

type DashboardTrendMetric = 'tokens' | 'points' | 'requests';

const TREND_CHART_DATA_KEYS = {
  tokens: 'chartTokens',
  points: 'chartPoints',
  requests: 'chartRequests',
} as const;

const SUMMARY_CARD_ICONS = [
  Users,
  Boxes,
  BarChart2,
  Database,
  Image,
  CircleAlert,
  Coins,
  DollarSign,
] as const;
const SUMMARY_CARD_COLORS = [
  'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10',
  'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10',
  'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10',
  'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-500/10',
  'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-500/10',
  'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
  'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
  'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
] as const;

type DashboardChartTab = 'modelDistribution' | 'userConsumption';

export function DashboardAdmin() {
  const { t, i18n } = useTranslation();
  const [chartTab, setChartTab] = useState<DashboardChartTab>('modelDistribution');
  const [trendMetric, setTrendMetric] = useState<DashboardTrendMetric>('tokens');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  const [loading, setLoading] = useState(true);
  const [refreshRequest, setRefreshRequest] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [summaryCards, setSummaryCards] = useState<DashboardSummaryCard[]>([]);
  const [userConsumptionData, setUserConsumptionData] = useState<PieChartData[]>([]);
  const [multimodalData, setMultimodalData] = useState<PieChartData[]>([]);
  const [trafficData, setTrafficData] = useState<TrafficData[]>([]);
  const [modelDistribution, setModelDistribution] = useState<PieChartData[]>([]);
  const [recentUsage, setRecentUsage] = useState<RecentUsageTrace[]>([]);
  const trendChartDataKey = TREND_CHART_DATA_KEYS[trendMetric];
  useEffect(() => {
    let disposed = false;
    setLoading(true);
    setErrorMessage('');
    AdminDashboardService.fetchDashboardData(t)
      .then(data => {
        if (disposed) {
          return;
        }
        setSummaryCards(data.summaryCards);
        setUserConsumptionData(data.userConsumption);
        setMultimodalData(data.multimodal);
        setTrafficData(data.traffic);
        setModelDistribution(data.modelDistribution);
        setRecentUsage(data.recentUsage);
        setLastUpdatedAt(new Date());
      })
      .catch(error => {
        if (disposed) {
          return;
        }
        setErrorMessage(error instanceof Error ? error.message : t("admin.dashboard.index.text.1s2i7d1", "加载大盘数据失败"));
      })
      .finally(() => {
        if (!disposed) {
          setLoading(false);
        }
      });
    return () => {
      disposed = true;
    };
  }, [refreshRequest, t]);

  const getTrendMetricLabel = (name: string | number | undefined): string | undefined => {
    if (name === 'tokens' || name === 'chartTokens') {
      return t("admin.dashboard.index.text.1rty913", "Token 消耗");
    }
    if (name === 'points' || name === 'chartPoints') {
      return t('admin.dashboard.trend.points', '积分消耗');
    }
    if (name === 'requests' || name === 'chartRequests') {
      return t("admin.dashboard.index.text.1j8nxcs", "API 请求");
    }
    return undefined;
  };

  const readTooltipValue = (entry: ChartPayloadEntry): string | number => {
    if (entry.name === 'chartTokens') {
      return entry.payload?.tokens ?? 0;
    }
    if (entry.name === 'chartRequests') {
      return entry.payload?.requests ?? 0;
    }
    if (entry.name === 'chartPoints') {
      return entry.payload?.points ?? 0;
    }
    if (entry.name === 'chartValue') {
      return entry.payload?.value ?? 0;
    }
    return entry.value ?? 0;
  };

  const CustomTooltip = ({ active, payload = [], label }: CustomTooltipProps) => {
    if (active && payload.length) {
      return (
        <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-white/10 p-3 rounded-lg shadow-xl outline-none">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">{label}</p>
          <div className="flex flex-col gap-1.5">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color ?? '#64748b' }} />
                <span className="text-slate-600 dark:text-slate-400">
                  {getTrendMetricLabel(entry.name) ?? String(entry.name === 'chartValue' ? label ?? entry.payload?.name ?? '' : entry.name ?? '')}
                </span>
                <span className="font-semibold text-slate-900 dark:text-white ml-auto pl-4">
                  {Number(readTooltipValue(entry)).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPieLegend = ({ payload = [], unit }: CustomPieLegendProps) => {
    return (
      <ul className="flex flex-col gap-3">
        {payload.map((entry, index) => (
          <li key={`item-${index}`} className="flex items-center justify-between text-xs w-full">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color ?? '#64748b' }} />
              <span className="text-slate-600 dark:text-slate-400 font-medium">{entry.value}</span>
            </div>
            <span className="ml-4 font-bold tabular-nums text-slate-900 dark:text-white">
              {unit === '$' ? `$${entry.payload?.value ?? 0}` : `${entry.payload?.value ?? 0}${unit}`}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const hasSnapshot = summaryCards.length > 0;
  const updatedAtLabel = lastUpdatedAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage?.startsWith('zh') ? 'zh-CN' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(lastUpdatedAt)
    : t('admin.dashboard.updated.never', '尚未更新');

  if (loading && !hasSnapshot) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <span className="text-slate-500 dark:text-slate-400">{t("admin.dashboard.index.text.1chgta4", "加载大盘数据中...")}</span>
      </div>
    );
  }

  if (errorMessage && !hasSnapshot) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center space-y-3 px-6 text-center">
        <Activity className="w-8 h-8 text-red-500" />
        <span className="text-sm font-medium text-slate-900 dark:text-white">{t("admin.dashboard.index.text.1colgfp", "大盘数据加载失败")}</span>
        <span className="max-w-xl text-xs text-slate-500 dark:text-slate-400">{errorMessage}</span>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          onClick={() => setRefreshRequest((request) => request + 1)}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          {t('admin.dashboard.retry', '重试')}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 overflow-y-auto custom-scrollbar">
      <div className="flex min-h-full w-full flex-col space-y-4 pb-8">

      <div className="flex min-h-12 flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2 dark:border-white/10 dark:bg-[#17191f]">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-900 dark:text-white">
            {t('admin.dashboard.title', '运营概览')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('admin.dashboard.updatedAt', '更新于 {{time}}', { time: updatedAtLabel })}
          </p>
        </div>
        <button
          aria-label={t('admin.dashboard.refresh', '刷新大盘数据')}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-wait disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          disabled={loading}
          onClick={() => setRefreshRequest((request) => request + 1)}
          title={t('admin.dashboard.refresh', '刷新大盘数据')}
          type="button"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.dashboard.refreshAction', '刷新')}
        </button>
      </div>

      {errorMessage ? (
        <div className="mx-4 flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300" role="alert">
          <span className="min-w-0 truncate">{errorMessage}</span>
          <button
            className="shrink-0 font-medium underline underline-offset-2"
            onClick={() => setRefreshRequest((request) => request + 1)}
            type="button"
          >
            {t('admin.dashboard.retry', '重试')}
          </button>
        </div>
      ) : null}

      {/* Top Value Cards (Grid of 8) */}
      <div className="grid grid-cols-1 gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card, index) => {
          const Icon = SUMMARY_CARD_ICONS[index] ?? Activity;
          const color = SUMMARY_CARD_COLORS[index] ?? 'text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-white/10';
          return (
            <div key={card.label} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 dark:border-white/10 dark:bg-[#1a1a1a] dark:hover:border-white/20">
              <div className={`mt-0.5 rounded-md p-2.5 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900 dark:text-white">{card.value}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate">{card.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Full-Width Chart Card with Integrated Filters */}
      <div className="mx-4 flex min-h-[450px] shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white whitespace-nowrap">{t("admin.dashboard.index.text.yomhnm", "聚合指标大盘")}</h3>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {t('admin.dashboard.timeRange.dailySnapshot', '日维度')}
            </span>

            <div className="hidden h-6 w-px bg-slate-200 dark:bg-white/10 sm:block"></div>

            {/* Chart Type Toggle */}
            <div aria-label={t('admin.dashboard.chartType', '图表类型')} className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-white/5 dark:bg-[#121212]" role="group">
              <button
                aria-pressed={chartType === 'area'}
                onClick={() => setChartType('area')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${chartType === 'area' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t("admin.dashboard.index.text.12bof9e", "折线图")}</button>
              <button
                aria-pressed={chartType === 'bar'}
                onClick={() => setChartType('bar')}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${chartType === 'bar' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t("admin.dashboard.index.text.mnf7mo", "柱状图")}</button>
            </div>

            <div className="h-6 w-px bg-slate-200 dark:bg-white/10 hidden sm:block"></div>

            {/* Metric Toggle */}
            <div aria-label={t('admin.dashboard.metric', '趋势指标')} className="flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-white/5 dark:bg-[#121212]" role="group">
              <button
                aria-pressed={trendMetric === 'tokens'}
                onClick={() => setTrendMetric('tokens')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${trendMetric === 'tokens' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t("admin.dashboard.index.text.1rty913", "Token 消耗")}</button>
              <button
                aria-pressed={trendMetric === 'points'}
                onClick={() => setTrendMetric('points')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${trendMetric === 'points' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t('admin.dashboard.trend.points', '积分消耗')}</button>
              <button
                aria-pressed={trendMetric === 'requests'}
                onClick={() => setTrendMetric('requests')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${trendMetric === 'requests' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t("admin.dashboard.index.text.1j8nxcs", "API 请求")}</button>
            </div>
          </div>
        </div>

        <div className="relative mt-2 h-80 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={trafficData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorMetric" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={trendMetric === 'points' ? '#f59e0b' : trendMetric === 'requests' ? '#10b981' : '#3b82f6'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={trendMetric === 'points' ? '#f59e0b' : trendMetric === 'requests' ? '#10b981' : '#3b82f6'} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" strokeOpacity={0.15} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(val: number) => trendMetric === 'tokens' ? `${val/1000}k` : String(val)} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(150,150,150,0.2)', strokeWidth: 1 }} />
                <Area
                  type="monotone"
                  dataKey={trendChartDataKey}
                  stroke={trendMetric === 'points' ? '#f59e0b' : trendMetric === 'requests' ? '#10b981' : '#3b82f6'}
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMetric)"
                />
              </AreaChart>
            ) : (
              <BarChart data={trafficData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888" strokeOpacity={0.15} />
                <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} tickFormatter={(val: number) => trendMetric === 'tokens' ? `${val/1000}k` : String(val)} />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(150,150,150,0.1)' }} />
                <Bar
                  dataKey={trendChartDataKey}
                  fill={trendMetric === 'points' ? '#f59e0b' : trendMetric === 'requests' ? '#10b981' : '#3b82f6'}
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sub Charts (Model & Multimodal) */}
      <div className="mx-4 grid min-h-[360px] shrink-0 grid-cols-1 gap-4 lg:grid-cols-2">

        {/* Left Chart Card: Model Distribution */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {chartTab === 'modelDistribution'
                ? t("admin.dashboard.index.text.zct0j2", "模型分布")
                : t("admin.dashboard.index.text.f8emjh", "用户消费榜")}
            </h3>
            <div className="flex bg-slate-100 dark:bg-[#121212] rounded-lg p-1 border border-slate-200 dark:border-white/5">
              <button
                onClick={() => setChartTab('modelDistribution')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${chartTab === 'modelDistribution' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t("admin.dashboard.index.text.zct0j2", "模型分布")}</button>
              <button
                onClick={() => setChartTab('userConsumption')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${chartTab === 'userConsumption' ? 'bg-white dark:bg-[#222] text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t("admin.dashboard.index.text.f8emjh", "用户消费榜")}</button>
            </div>
          </div>
          <div className="relative h-72 shrink-0">
            {chartTab === 'modelDistribution' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelDistribution} layout="vertical" margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} width={140} />
                  <Tooltip cursor={{ fill: 'rgba(150,150,150,0.05)' }} content={<CustomTooltip />} />
                  <Bar dataKey="chartValue" radius={[0, 4, 4, 0]} barSize={14}>
                    {modelDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={userConsumptionData}
                    cx="40%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="chartValue"
                    stroke="none"
                    cornerRadius={4}
                  >
                    {userConsumptionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                    itemStyle={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}
                    formatter={(_value, _name, item) => `$${Number(item?.payload?.value ?? 0)}`}
                  />
                  <Legend
                    layout="vertical"
                    verticalAlign="middle"
                    align="right"
                    content={<CustomPieLegend unit="$" />}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Right Chart Card: Multimodal Capabilities */}
        <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
          <div className="mb-6 flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t("admin.dashboard.index.text.d43g8g", "多模态能力调用占比")}</h3>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-slate-500"><Image className="w-3.5 h-3.5" /> {t("admin.dashboard.index.text.1a5k09c", "视觉")}</span>
              <span className="flex items-center gap-1 text-xs text-slate-500"><Mic className="w-3.5 h-3.5" /> {t("admin.dashboard.index.text.113w1g1", "语音")}</span>
            </div>
          </div>
          <div className="relative flex h-72 shrink-0 items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={multimodalData}
                  cx="40%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="chartValue"
                  stroke="none"
                  cornerRadius={4}
                >
                  {multimodalData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                  itemStyle={{ fontSize: '13px', color: '#fff', fontWeight: 500 }}
                  formatter={(_value, _name, item) => `${Number(item?.payload?.value ?? 0)}%`}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  content={<CustomPieLegend unit="%" />}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Table */}
      <div className="mx-4 mt-2 flex min-h-[320px] flex-1 shrink-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t("admin.dashboard.index.text.13upnw7", "平台实时调用流水 (Live Traces)")}</h3>
          <Link to="/admin/record" className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors gap-1">
            {t("admin.dashboard.index.text.19174dl", "查看完整日志")}<ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-white/[0.02] border-y border-slate-200 dark:border-white/5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">{t("admin.dashboard.index.text.1i45bsn", "调用方 (用户/API Key)")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.index.text.1uqn9fe", "请求目标 (模型)")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.index.text.pptmtb", "计费模式")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.index.text.1i0melp", "消耗计费量 (In / Out | Count)")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.index.text.un4skd", "计算成本")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.index.text.hin7vi", "请求时间")}</th>
                <th className="px-4 py-3">{t("admin.dashboard.index.text.11bow1c", "路由状态")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {recentUsage.length === 0 ? (
                <tr>
                  <td className="px-4 py-12 text-center text-sm text-slate-500 dark:text-slate-400" colSpan={7}>
                    {t('admin.dashboard.recentUsage.empty', '暂无调用记录')}
                  </td>
                </tr>
              ) : null}
              {recentUsage.map((item) => {
                const isSuccess = item.status.trim().toLowerCase() === 'success';
                const statusLabel = item.status.trim() || 'unknown';
                return (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                       {item.isApiUser ? <Key className="w-3.5 h-3.5 text-indigo-500" /> : <Fingerprint className="w-3.5 h-3.5 text-slate-400" />}
                       <span className="font-medium text-slate-900 dark:text-slate-300">{item.user}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono font-medium items-center gap-1.5 shadow-sm">
                       {item.type === 'image' ? <Image className="w-3 h-3 text-amber-500" /> : <MessageSquare className="w-3 h-3 text-blue-500" />} {item.model}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.billingMode === 'token' ? (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 tracking-wide">
                        {t("admin.dashboard.index.text.11f9jft", "按 Token")}</span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 tracking-wide">
                        {t("admin.dashboard.index.text.158oqsl", "按 次数")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {item.billingMode === 'token' ? (
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400" title="Input Tokens">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-500/10">
                            <ArrowDownRight className="w-3 h-3 text-emerald-500" />
                          </span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{item.usageIn?.toLocaleString()}</span>
                        </span>
                        <div className="w-px h-3 bg-slate-200 dark:bg-white/10"></div>
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400" title="Output Tokens">
                          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-50 dark:bg-blue-500/10">
                            <ArrowUpRight className="w-3 h-3 text-blue-500" />
                          </span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">{item.usageOut?.toLocaleString()}</span>
                        </span>
                      </div>
                    ) : (
                       <span className="text-slate-700 dark:text-slate-300 font-medium bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md border border-slate-200 dark:border-white/10 flex items-center w-fit gap-1.5 shadow-sm">
                         <Activity className="w-3 h-3 text-amber-500" /> {item.usageCount} <span className="opacity-60 text-[10px]">REQS</span>
                       </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-emerald-600 dark:text-emerald-400">{item.cost}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{item.time}</td>
                  <td className="px-4 py-3">
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded w-fit border ${isSuccess ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20'}`}>
                       <div className={`w-1.5 h-1.5 rounded-full ${isSuccess ? 'bg-emerald-500' : 'bg-red-500'}`} /> {statusLabel}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
