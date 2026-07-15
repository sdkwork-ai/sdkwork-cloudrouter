import { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, Coins, Database, RefreshCw, Search, Users, Zap } from 'lucide-react';
import type { TFunction } from 'i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel, BusinessStateTableRow } from '@sdkwork/clawroutes-pc-commons/components/BusinessState';
import {
  AdminAnalyticsService,
  type AdminAnalyticsInsight,
  type AdminAnalyticsModelRankItem,
  type AdminAnalyticsOverview,
  type AdminAnalyticsRankMetric,
  type AdminAnalyticsTimeRange,
  type AdminAnalyticsUserRankItem,
  type PieChartData,
  createEmptyAnalyticsOverview,
} from './analyticsService';

type AnalyticsSection = 'overview' | 'users' | 'models' | 'distributions' | 'insights';

type MetricCard = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: string;
  icon: typeof Activity;
};

type ChartPayloadEntry = {
  color?: string;
  name?: string | number;
  value?: string | number;
  payload?: Record<string, unknown>;
};

type TooltipProps = {
  active?: boolean;
  payload?: ChartPayloadEntry[];
  label?: string | number;
};

const TIME_RANGES: AdminAnalyticsTimeRange[] = ['hourly', 'daily', 'weekly', 'monthly', 'yearly'];
const RANK_METRICS: AdminAnalyticsRankMetric[] = ['points', 'tokens', 'requests'];
const SECTIONS: AnalyticsSection[] = ['overview', 'users', 'models', 'distributions', 'insights'];
const DEFAULT_OVERVIEW = createEmptyAnalyticsOverview();

export function AnalyticsAdmin() {
  const { t, i18n } = useTranslation();
  const [timeRange, setTimeRange] = useState<AdminAnalyticsTimeRange>('daily');
  const [rankMetric, setRankMetric] = useState<AdminAnalyticsRankMetric>('points');
  const [activeSection, setActiveSection] = useState<AnalyticsSection>('overview');
  const [search, setSearch] = useState('');
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await AdminAnalyticsService.fetchOverview({ timeRange, rankingSize: 12 });
      setOverview(data);
    } catch (error) {
      setOverview(createEmptyAnalyticsOverview(timeRange));
      setLoadError(error instanceof Error ? error.message : t('admin.analytics.errors.loadFallback', 'Analytics data could not be loaded.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, [timeRange]);

  const normalizedSearch = search.trim().toLowerCase();
  const displayOverview = overview ?? DEFAULT_OVERVIEW;
  const isInitialLoading = loading && overview === null;
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const users = displayOverview.userRankings[rankMetric].filter((item) => {
    if (!normalizedSearch) {
      return true;
    }
    return [item.userId, item.userName, item.email ?? ''].some((value) => value.toLowerCase().includes(normalizedSearch));
  });
  const models = displayOverview.modelRankings[rankMetric].filter((item) => {
    if (!normalizedSearch) {
      return true;
    }
    return [item.model, item.catalogKey, item.vendor, item.modality].some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  const metricCards = useMemo(() => buildMetricCards(displayOverview, t, locale), [displayOverview, t, locale]);

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div />
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-[#111]">
              {TIME_RANGES.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    timeRange === range
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-300'
                      : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {t(`admin.analytics.timeRange.${range}`, range)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => { void loadOverview(); }}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:text-blue-300"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('admin.analytics.actions.refresh', 'Refresh')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {metricCards.map((card) => (
            <div
              key={card.key}
              data-admin-analytics-metric-card
              className="flex min-w-0 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{card.label}</div>
                <div className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
                  {isInitialLoading ? '--' : card.value}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">
                  {isInitialLoading ? t('admin.analytics.states.loadingShort', 'Loading') : card.detail}
                </div>
              </div>
              <div className={`ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${card.tone}`}>
                <card.icon className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside
          data-admin-analytics-sidebar
          className="rounded-xl border border-slate-200 bg-white p-2 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] lg:overflow-y-auto"
        >
          <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
            {SECTIONS.map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
                  activeSection === section
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white'
                }`}
              >
                <span>{t(`admin.analytics.sections.${section}`, section)}</span>
                <span className="text-[11px] font-semibold tabular-nums opacity-70">
                  {isInitialLoading ? '--' : sectionCount(section, displayOverview, locale)}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <main className="min-h-0 overflow-y-auto pr-1">
          <div className="flex flex-col gap-4">
            {loadError ? (
              <BusinessStatePanel
                kind="error"
                title={t('admin.analytics.states.loadError', 'Analytics data could not be loaded')}
                description={loadError}
                onRetry={() => { void loadOverview(); }}
                retryLabel={t('common.retry', 'Retry')}
                className="rounded-xl border border-red-200 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/5"
              />
            ) : null}

            {(activeSection === 'overview' || activeSection === 'users' || activeSection === 'models') ? (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t('admin.analytics.trend.title', 'Usage trend')}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t('admin.analytics.trend.subtitle', 'Requests, tokens, points, and active users')}
                      </p>
                    </div>
                  </div>
                  <div className="h-72">
                    {loading ? (
                      <BusinessStatePanel kind="loading" title={t('admin.analytics.states.loading', 'Loading analytics...')} className="h-full min-h-0" />
                    ) : displayOverview.trend.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={displayOverview.trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                          <defs>
                            <linearGradient id="adminAnalyticsPoints" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#2563eb" stopOpacity={0.26} />
                              <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#94a3b8" strokeOpacity={0.18} />
                          <XAxis dataKey="time" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                          <Tooltip content={<AnalyticsTooltip t={t} locale={locale} />} />
                          <Area type="monotone" dataKey="points" stroke="#2563eb" strokeWidth={2} fill="url(#adminAnalyticsPoints)" />
                          <Area type="monotone" dataKey="tokens" stroke="#10b981" strokeWidth={2} fillOpacity={0} />
                          <Area type="monotone" dataKey="requests" stroke="#f59e0b" strokeWidth={2} fillOpacity={0} />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <BusinessStatePanel kind="empty" title={t('admin.analytics.states.noTrend', 'No trend data')} className="h-full min-h-0" />
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        {t('admin.analytics.distribution.modelTitle', 'Model distribution')}
                      </h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t('admin.analytics.distribution.modelSubtitle', 'Request share by model')}
                      </p>
                    </div>
                  </div>
                  <div className="h-72">
                    {loading ? (
                      <BusinessStatePanel kind="loading" title={t('admin.analytics.states.loading', 'Loading analytics...')} className="h-full min-h-0" />
                    ) : displayOverview.modelDistribution.length > 0 ? (
                      <DistributionBarChart data={displayOverview.modelDistribution} t={t} locale={locale} />
                    ) : (
                      <BusinessStatePanel kind="empty" title={t('admin.analytics.states.noModelDistribution', 'No model distribution data')} className="h-full min-h-0" />
                    )}
                  </div>
                </section>
              </div>
            ) : null}

            {(activeSection === 'overview' || activeSection === 'users' || activeSection === 'models') ? (
              <section
                data-admin-analytics-table
                className="flex min-h-[320px] max-h-[min(640px,calc(100dvh-260px))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {activeSection === 'models'
                        ? t('admin.analytics.rankings.modelsTitle', 'Model ranking')
                        : t('admin.analytics.rankings.usersTitle', 'User ranking')}
                    </h3>
                    <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-[#111]">
                      {RANK_METRICS.map((metric) => (
                        <button
                          key={metric}
                          type="button"
                          onClick={() => setRankMetric(metric)}
                          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                            rankMetric === metric
                              ? 'bg-white text-blue-600 shadow-sm dark:bg-white/10 dark:text-blue-300'
                              : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                          }`}
                        >
                          {t(`admin.analytics.rankMetric.${metric}`, metric)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="relative w-full lg:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={t('admin.analytics.filters.search', 'Search user, model, vendor...')}
                      className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-blue-500/70"
                    />
                  </div>
                </div>
                {activeSection === 'models' ? (
                  <ModelRankingTable
                    items={models}
                    loading={loading}
                    loadError={loadError}
                    onRetry={loadOverview}
                    t={t}
                    locale={locale}
                  />
                ) : (
                  <UserRankingTable
                    items={users}
                    loading={loading}
                    loadError={loadError}
                    onRetry={loadOverview}
                    t={t}
                    locale={locale}
                  />
                )}
              </section>
            ) : null}

            {activeSection === 'distributions' ? (
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <DistributionPanel
                  title={t('admin.analytics.distribution.modelTitle', 'Model distribution')}
                  subtitle={t('admin.analytics.distribution.modelSubtitle', 'Request share by model')}
                  loadingTitle={t('admin.analytics.states.loading', 'Loading analytics...')}
                  emptyTitle={t('admin.analytics.states.noModelDistribution', 'No model distribution data')}
                  data={displayOverview.modelDistribution}
                  loading={loading}
                  t={t}
                  locale={locale}
                />
                <DistributionPanel
                  title={t('admin.analytics.distribution.modalityTitle', 'Modality distribution')}
                  subtitle={t('admin.analytics.distribution.modalitySubtitle', 'Text, image, video, audio, music, and embedding calls')}
                  loadingTitle={t('admin.analytics.states.loading', 'Loading analytics...')}
                  emptyTitle={t('admin.analytics.states.noModalityDistribution', 'No modality distribution data')}
                  data={displayOverview.modalityDistribution}
                  loading={loading}
                  t={t}
                  locale={locale}
                  pie
                />
              </section>
            ) : null}

            {activeSection === 'insights' ? (
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.analytics.insights.title', 'Operational insights')}</h3>
                <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-2">
                  {loading ? (
                    <BusinessStatePanel kind="loading" title={t('admin.analytics.states.loading', 'Loading analytics...')} className="xl:col-span-2" />
                  ) : displayOverview.insights.length === 0 ? (
                    <BusinessStatePanel kind="empty" title={t('admin.analytics.states.noInsights', 'No insights')} className="xl:col-span-2" />
                  ) : displayOverview.insights.map((insight) => (
                    <InsightCard key={insight.key} insight={insight} t={t} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function UserRankingTable({
  items,
  loading,
  loadError,
  onRetry,
  t,
  locale,
}: {
  items: AdminAnalyticsUserRankItem[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => Promise<void>;
  t: TFunction<'translation', undefined>;
  locale: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">{t('admin.analytics.table.rank', 'Rank')}</th>
            <th className="px-4 py-3">{t('admin.analytics.table.user', 'User')}</th>
            <th className="px-4 py-3 text-right">{t('admin.analytics.table.points', 'Points')}</th>
            <th className="px-4 py-3 text-right">{t('admin.analytics.table.tokens', 'Tokens')}</th>
            <th className="px-4 py-3 text-right">{t('admin.analytics.table.requests', 'Requests')}</th>
            <th className="px-4 py-3">{t('admin.analytics.table.models', 'Models')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-white/5">
        {loading ? (
          <BusinessStateTableRow colSpan={6} kind="loading" title={t('admin.analytics.states.loading', 'Loading analytics...')} />
        ) : loadError ? (
          <BusinessStateTableRow
            colSpan={6}
            kind="error"
              title={t('admin.analytics.states.loadError', 'Analytics data could not be loaded')}
              description={loadError}
            onRetry={() => { void onRetry(); }}
            retryLabel={t('common.retry', 'Retry')}
          />
        ) : items.length === 0 ? (
          <BusinessStateTableRow colSpan={6} kind="empty" title={t('admin.analytics.states.noUsers', 'No user ranking data')} />
        ) : items.map((item) => (
          <tr key={`${item.rank}-${item.userId}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
              <td className="px-4 py-3 font-mono text-xs text-slate-500">#{item.rank}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900 dark:text-white">{item.userName}</div>
                <div className="mt-0.5 text-xs text-slate-500">{item.email ?? item.userId}</div>
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">{formatDecimal(item.points, locale)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCompactNumber(item.totalTokens, locale)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatInteger(item.requestCount, locale)}</td>
              <td className="px-4 py-3">
                <InlineDistribution data={item.modelDistribution} t={t} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelRankingTable({
  items,
  loading,
  loadError,
  onRetry,
  t,
  locale,
}: {
  items: AdminAnalyticsModelRankItem[];
  loading: boolean;
  loadError: string | null;
  onRetry: () => Promise<void>;
  t: TFunction<'translation', undefined>;
  locale: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
          <tr>
            <th className="px-4 py-3">{t('admin.analytics.table.rank', 'Rank')}</th>
            <th className="px-4 py-3">{t('admin.analytics.table.model', 'Model')}</th>
            <th className="px-4 py-3">{t('admin.analytics.table.vendor', 'Vendor')}</th>
            <th className="px-4 py-3">{t('admin.analytics.table.modality', 'Modality')}</th>
            <th className="px-4 py-3 text-right">{t('admin.analytics.table.points', 'Points')}</th>
            <th className="px-4 py-3 text-right">{t('admin.analytics.table.tokens', 'Tokens')}</th>
            <th className="px-4 py-3 text-right">{t('admin.analytics.table.requests', 'Requests')}</th>
            <th className="px-4 py-3 text-right">{t('admin.analytics.table.users', 'Users')}</th>
            <th className="px-4 py-3 text-right">{t('admin.analytics.table.errorRate', 'Error rate')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-white/5">
        {loading ? (
          <BusinessStateTableRow colSpan={9} kind="loading" title={t('admin.analytics.states.loading', 'Loading analytics...')} />
        ) : loadError ? (
          <BusinessStateTableRow
            colSpan={9}
            kind="error"
              title={t('admin.analytics.states.loadError', 'Analytics data could not be loaded')}
              description={loadError}
            onRetry={() => { void onRetry(); }}
            retryLabel={t('common.retry', 'Retry')}
          />
        ) : items.length === 0 ? (
          <BusinessStateTableRow colSpan={9} kind="empty" title={t('admin.analytics.states.noModels', 'No model ranking data')} />
        ) : items.map((item) => (
          <tr key={`${item.rank}-${item.catalogKey}`} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
              <td className="px-4 py-3 font-mono text-xs text-slate-500">#{item.rank}</td>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900 dark:text-white">{item.model}</div>
                <div className="mt-0.5 max-w-xs truncate font-mono text-xs text-slate-500">{item.catalogKey}</div>
              </td>
              <td className="px-4 py-3">{item.vendor}</td>
              <td className="px-4 py-3">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-300">
                  {translateAnalyticsLabel(item.modality, t)}
                </span>
              </td>
              <td className="px-4 py-3 text-right font-mono text-slate-900 dark:text-white">{formatDecimal(item.points, locale)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatCompactNumber(item.totalTokens, locale)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatInteger(item.requestCount, locale)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatInteger(item.userCount, locale)}</td>
              <td className="px-4 py-3 text-right font-mono">{formatPercent(item.errorRate, locale)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DistributionPanel({
  title,
  subtitle,
  loadingTitle,
  emptyTitle,
  data,
  loading,
  t,
  locale,
  pie = false,
}: {
  title: string;
  subtitle: string;
  loadingTitle: string;
  emptyTitle: string;
  data: PieChartData[];
  loading: boolean;
  t: TFunction<'translation', undefined>;
  locale: string;
  pie?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      </div>
      <div className="h-80">
        {loading ? (
          <BusinessStatePanel kind="loading" title={loadingTitle} className="h-full min-h-0" />
        ) : data.length === 0 ? (
          <BusinessStatePanel kind="empty" title={emptyTitle} className="h-full min-h-0" />
        ) : pie ? (
          <DistributionPieChart data={data} t={t} locale={locale} />
        ) : (
          <DistributionBarChart data={data} t={t} locale={locale} />
        )}
      </div>
    </div>
  );
}

function DistributionBarChart({ data, t, locale }: { data: PieChartData[]; t: TFunction<'translation', undefined>; locale: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <XAxis type="number" hide />
        <YAxis
          dataKey="name"
          type="category"
          width={128}
          tickFormatter={(value) => translateAnalyticsLabel(String(value), t)}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: '#64748b' }}
        />
        <Tooltip content={<AnalyticsTooltip t={t} locale={locale} />} />
        <Bar dataKey="value" radius={[0, 5, 5, 0]} barSize={16}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function DistributionPieChart({ data, t, locale }: { data: PieChartData[]; t: TFunction<'translation', undefined>; locale: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={58} outerRadius={96} paddingAngle={2} dataKey="value" stroke="none">
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip content={<AnalyticsTooltip t={t} locale={locale} />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function InlineDistribution({ data, t }: { data: PieChartData[]; t: TFunction<'translation', undefined> }) {
  if (data.length === 0) {
    return <span className="text-xs text-slate-400">-</span>;
  }
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return (
    <div className="min-w-40">
      <div className="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
        {data.slice(0, 5).map((item) => (
          <div
            key={item.name}
            className="h-full"
            style={{
              width: `${total > 0 ? Math.max((item.value / total) * 100, 6) : 0}%`,
              backgroundColor: item.color,
            }}
          />
        ))}
      </div>
      <div className="mt-1 truncate text-[11px] text-slate-500">
        {data.slice(0, 2).map((item) => translateAnalyticsLabel(item.name, t)).join(' / ')}
      </div>
    </div>
  );
}

function InsightCard({ insight, t }: { insight: AdminAnalyticsInsight; t: TFunction<'translation', undefined> }) {
  const tone = insight.severity === 'critical'
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/5 dark:text-red-300'
    : insight.severity === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/5 dark:text-amber-300'
      : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/5 dark:text-blue-300';
  const title = insight.title.startsWith('admin.analytics.') ? t(insight.title, insight.title) : insight.title;
  const detail = insight.detail.startsWith('admin.analytics.') ? t(insight.detail, insight.detail) : insight.detail;
  return (
    <div className={`rounded-lg border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div className="mt-2 text-2xl font-semibold tabular-nums">{insight.value}</div>
        </div>
        {insight.severity === 'info' ? <Activity className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
      </div>
      <p className="mt-2 text-xs leading-5 opacity-80">{detail}</p>
    </div>
  );
}

function AnalyticsTooltip({
  active,
  payload = [],
  label,
  t,
  locale,
}: TooltipProps & { t: TFunction<'translation', undefined>; locale: string }) {
  if (!active || payload.length === 0) {
    return null;
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-xl dark:border-white/10 dark:bg-[#111]">
      {label !== undefined ? (
        <div className="mb-2 font-semibold text-slate-900 dark:text-white">{translateAnalyticsLabel(String(label), t)}</div>
      ) : null}
      <div className="space-y-1.5">
        {payload.map((entry, index) => (
          <div key={`${entry.name ?? index}`} className="flex min-w-36 items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color ?? '#64748b' }} />
              {translateAnalyticsLabel(String(entry.name ?? ''), t)}
            </span>
            <span className="font-mono font-semibold text-slate-900 dark:text-white">{formatDecimal(Number(entry.value ?? 0), locale)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function translateAnalyticsLabel(value: string, t: TFunction<'translation', undefined>): string {
  if (value.startsWith('admin.analytics.')) {
    return t(value, value);
  }
  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return value;
  }
  if (normalized === 'unknown') {
    return t('admin.analytics.labels.unknown', 'Unknown');
  }
  if (normalized === 'others' || normalized === 'other') {
    return t('admin.analytics.labels.others', 'Others');
  }
  if (RANK_METRICS.includes(normalized as AdminAnalyticsRankMetric)) {
    return t(`admin.analytics.rankMetric.${normalized}`, value);
  }
  const modalityKey = `admin.analytics.modality.${normalized}`;
  const translatedModality = t(modalityKey, '');
  return translatedModality || value;
}

function buildMetricCards(
  overview: AdminAnalyticsOverview,
  t: TFunction<'translation', undefined>,
  locale: string,
): MetricCard[] {
  const summary = overview.summary;
  return [
    {
      key: 'requests',
      label: t('admin.analytics.metrics.requests', 'Requests'),
      value: formatInteger(summary.totalRequests, locale),
      detail: t('admin.analytics.metrics.requestsDetail', '{{success}} success / {{failed}} failed', {
        success: formatInteger(summary.successfulRequests, locale),
        failed: formatInteger(summary.failedRequests, locale),
      }),
      tone: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
      icon: Activity,
    },
    {
      key: 'tokens',
      label: t('admin.analytics.metrics.tokens', 'Tokens'),
      value: formatCompactNumber(summary.totalTokens, locale),
      detail: t('admin.analytics.metrics.averageTokens', '{{value}} average', { value: formatDecimal(summary.averageTokensPerRequest, locale) }),
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300',
      icon: Zap,
    },
    {
      key: 'points',
      label: t('admin.analytics.metrics.points', 'Points'),
      value: formatDecimal(summary.totalPoints, locale),
      detail: t('admin.analytics.metrics.averagePoints', '{{value}} per request', { value: formatDecimal(summary.averagePointsPerRequest, locale) }),
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300',
      icon: Coins,
    },
    {
      key: 'users',
      label: t('admin.analytics.metrics.users', 'Users'),
      value: formatInteger(summary.activeUsers, locale),
      detail: t('admin.analytics.metrics.totalUsers', '{{value}} total users', { value: formatInteger(summary.totalUsers, locale) }),
      tone: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300',
      icon: Users,
    },
    {
      key: 'models',
      label: t('admin.analytics.metrics.models', 'Models'),
      value: formatInteger(summary.activeModels, locale),
      detail: t('admin.analytics.metrics.modelRows', '{{value}} ranked rows', { value: formatInteger(overview.modelRankings.points.length, locale) }),
      tone: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-300',
      icon: Database,
    },
    {
      key: 'errorRate',
      label: t('admin.analytics.metrics.errorRate', 'Error rate'),
      value: formatPercent(summary.errorRate, locale),
      detail: t('admin.analytics.metrics.upstreamCost', '{{value}} upstream cost', { value: formatCurrency(summary.upstreamCost, locale) }),
      tone: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-300',
      icon: AlertTriangle,
    },
  ];
}

function sectionCount(section: AnalyticsSection, overview: AdminAnalyticsOverview, locale: string): string {
  switch (section) {
    case 'overview':
      return formatInteger(overview.summary.totalRequests, locale);
    case 'users':
      return formatInteger(overview.userRankings.points.length, locale);
    case 'models':
      return formatInteger(overview.modelRankings.points.length, locale);
    case 'distributions':
      return formatInteger(overview.modelDistribution.length + overview.modalityDistribution.length, locale);
    case 'insights':
      return formatInteger(overview.insights.length, locale);
  }
}

function formatInteger(value: number, locale: string): string {
  return Math.round(value).toLocaleString(locale);
}

function formatDecimal(value: number, locale: string): string {
  return value.toLocaleString(locale, { maximumFractionDigits: 2 });
}

function formatCurrency(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    currencyDisplay: 'narrowSymbol',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number, locale: string): string {
  return `${formatDecimal(value, locale)}%`;
}

function formatCompactNumber(value: number, locale: string): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${formatCompactUnit(value, 1_000_000_000, locale)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${formatCompactUnit(value, 1_000_000, locale)}M`;
  }
  if (absolute >= 1_000) {
    return `${formatCompactUnit(value, 1_000, locale)}K`;
  }
  return formatInteger(value, locale);
}

function formatCompactUnit(value: number, unit: number, locale: string): string {
  const normalized = value / unit;
  return normalized.toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: Number.isInteger(normalized) ? 0 : 1,
  });
}
