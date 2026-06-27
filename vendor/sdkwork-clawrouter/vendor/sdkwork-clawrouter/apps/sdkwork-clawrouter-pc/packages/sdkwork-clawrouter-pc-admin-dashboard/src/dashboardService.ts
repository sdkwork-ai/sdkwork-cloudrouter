import {
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  isRecord,
  readApiRecord,
  readDecimalString,
  readRequiredNonNegativeNumber,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type { InstallationStatusResponse } from '@sdkwork/clawrouter-backend-sdk';

export type AdminDashboardTranslator = (key: string, fallback: string, options?: Record<string, unknown>) => string;
export type DashboardTrafficTimeRange = 'hourly' | 'daily' | 'weekly' | 'monthly';

const DEFAULT_DASHBOARD_TRANSLATOR: AdminDashboardTranslator = (_key, fallback, options) => interpolateFallback(fallback, options);

export interface DashboardDataQuery {
  timeRange?: DashboardTrafficTimeRange;
}

export interface PieChartData {
  name: string;
  value: number;
  chartValue: number;
  color: string;
}

export interface TrafficData {
  time: string;
  tokens: number;
  requests: number;
  cost: number;
  chartTokens: number;
  chartRequests: number;
  chartCost: number;
}

export interface RecentUsageTrace {
  id: string;
  user: string;
  isApiUser: boolean;
  model: string;
  type: string;
  billingMode: string;
  usageIn?: number;
  usageOut?: number;
  usageCount?: number;
  time: string;
  status: string;
  cost: string;
}

export interface DashboardSummaryCard {
  label: string;
  value: string;
  detail: string;
}

export interface DashboardDataSnapshot {
  activeUsers: number;
  summaryCards: DashboardSummaryCard[];
  userConsumption: PieChartData[];
  multimodal: PieChartData[];
  traffic: TrafficData[];
  modelDistribution: PieChartData[];
  recentUsage: RecentUsageTrace[];
}

interface DashboardAnalyticsSummary {
  totalUsers: number;
  activeUsers: number;
  activeModels: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  totalPoints: number;
  upstreamCost: number;
  averageTokensPerRequest: number;
  averagePointsPerRequest: number;
  errorRate: number;
}

interface DashboardAnalyticsSnapshot {
  summary: DashboardAnalyticsSummary;
  traffic: TrafficData[];
}

const INITIAL_DAILY_TRAFFIC_DATA: TrafficData[] = [
  { time: 'D-6', tokens: 0, requests: 0, cost: 0, chartTokens: 0, chartRequests: 0, chartCost: 0 },
  { time: 'D-5', tokens: 0, requests: 0, cost: 0, chartTokens: 0, chartRequests: 0, chartCost: 0 },
  { time: 'D-4', tokens: 0, requests: 0, cost: 0, chartTokens: 0, chartRequests: 0, chartCost: 0 },
  { time: 'D-3', tokens: 0, requests: 0, cost: 0, chartTokens: 0, chartRequests: 0, chartCost: 0 },
  { time: 'D-2', tokens: 0, requests: 0, cost: 0, chartTokens: 0, chartRequests: 0, chartCost: 0 },
  { time: 'D-1', tokens: 0, requests: 0, cost: 0, chartTokens: 0, chartRequests: 0, chartCost: 0 },
  { time: 'Today', tokens: 0, requests: 0, cost: 0, chartTokens: 0, chartRequests: 0, chartCost: 0 },
];

const DEFAULT_TRAFFIC_TIME_RANGE: DashboardTrafficTimeRange = 'daily';
const TRAFFIC_TIME_RANGES = new Set<DashboardTrafficTimeRange>(['hourly', 'daily', 'weekly', 'monthly']);
const TRAFFIC_POINT_LIMITS: Record<DashboardTrafficTimeRange, number> = {
  hourly: 24,
  daily: 30,
  weekly: 26,
  monthly: 12,
};

const INITIAL_TRAFFIC_DATA_BY_RANGE: Record<DashboardTrafficTimeRange, TrafficData[]> = {
  hourly: Array.from({ length: 24 }, (_item, index) => zeroTrafficData(index === 23 ? 'Now' : `H-${23 - index}`)),
  daily: INITIAL_DAILY_TRAFFIC_DATA,
  weekly: [
    zeroTrafficData('W-5'),
    zeroTrafficData('W-4'),
    zeroTrafficData('W-3'),
    zeroTrafficData('W-2'),
    zeroTrafficData('W-1'),
    zeroTrafficData('This week'),
  ],
  monthly: [
    zeroTrafficData('M-5'),
    zeroTrafficData('M-4'),
    zeroTrafficData('M-3'),
    zeroTrafficData('M-2'),
    zeroTrafficData('M-1'),
    zeroTrafficData('This month'),
  ],
};

const INITIAL_MODEL_DISTRIBUTION: PieChartData[] = [
  { name: 'No model usage', value: 0, chartValue: 1, color: '#94a3b8' },
];

const INITIAL_USER_CONSUMPTION: PieChartData[] = [
  { name: 'No user spend', value: 0, chartValue: 1, color: '#94a3b8' },
];

const INITIAL_MULTIMODAL_DATA: PieChartData[] = [
  { name: 'Text', value: 0, chartValue: 1, color: '#2563eb' },
  { name: 'Vision', value: 0, chartValue: 1, color: '#7c3aed' },
  { name: 'Audio', value: 0, chartValue: 1, color: '#0891b2' },
];

export class AdminDashboardService {
  static async fetchDashboardData(
    t: AdminDashboardTranslator = DEFAULT_DASHBOARD_TRANSLATOR,
    query: DashboardDataQuery = {},
  ): Promise<DashboardDataSnapshot> {
    const trafficTimeRange = normalizeDashboardTrafficTimeRange(query.timeRange);
    const result = await getClawRouterBackendSdkClient().system.dashboard.admin.overview.retrieve();
    ensureSdkworkApiSuccess(result, 'Failed to fetch admin dashboard');
    const data = readApiRecord(result);
    const activeUsers = readRequiredNonNegativeNumber(data, 'activeUsers', 'Dashboard active users are required');
    const backendUserConsumption = readRequiredRecordArray(data, 'userConsumption', 'Dashboard userConsumption is required', 'Dashboard pie chart record is required')
      .map(normalizePieChartData);
    const backendMultimodal = readRequiredRecordArray(data, 'multimodal', 'Dashboard multimodal is required', 'Dashboard pie chart record is required')
      .map(normalizePieChartData);
    readRequiredRecordArray(data, 'traffic', 'Dashboard traffic is required', 'Dashboard traffic record is required')
      .map(normalizeTrafficData);
    const backendModelDistribution = readRequiredRecordArray(data, 'modelDistribution', 'Dashboard modelDistribution is required', 'Dashboard pie chart record is required')
      .map(normalizePieChartData);
    const recentUsage = readRequiredRecordArray(data, 'recentUsage', 'Dashboard recentUsage is required', 'Recent usage trace record is required')
      .map(normalizeRecentUsageTrace);
    const analytics = await fetchDashboardAnalyticsForTimeRange(trafficTimeRange);
    const userConsumption = withInitialPieChartData(backendUserConsumption, INITIAL_USER_CONSUMPTION);
    const multimodal = withInitialPieChartData(backendMultimodal, INITIAL_MULTIMODAL_DATA);
    const traffic = withInitialTrafficData(analytics.traffic, trafficTimeRange);
    const modelDistribution = withInitialPieChartData(backendModelDistribution, INITIAL_MODEL_DISTRIBUTION);
    return {
      activeUsers,
      summaryCards: createSummaryCards({
        activeUsers,
        summary: analytics.summary,
        multimodal: backendMultimodal,
      }, t),
      userConsumption,
      multimodal,
      traffic,
      modelDistribution,
      recentUsage,
    };
  }

  static async fetchInstallationStatus(): Promise<InstallationStatusResponse> {
    const result = await getClawRouterBackendSdkClient().system.installation.status.retrieve();
    ensureSdkworkApiSuccess(result, 'Failed to fetch installation status');
    return normalizeInstallationStatus(readApiRecord(result));
  }
}

async function fetchDashboardAnalyticsForTimeRange(
  timeRange: DashboardTrafficTimeRange,
): Promise<DashboardAnalyticsSnapshot> {
  const result = await getClawRouterBackendSdkClient().system.analytics.admin.overview.retrieve({
    timeRange,
    limit: String(TRAFFIC_POINT_LIMITS[timeRange]),
  });
  ensureSdkworkApiSuccess(result, 'Failed to fetch admin dashboard traffic analytics');
  const data = readApiRecord(result);
  return {
    summary: normalizeAnalyticsSummary(readRequiredRecord(data.summary, 'Dashboard traffic analytics summary is required')),
    traffic: readRequiredRecordArray(
      data,
      'trend',
      'Dashboard traffic analytics trend is required',
      'Dashboard traffic analytics trend point is required',
    ).map(normalizeAnalyticsTrafficData),
  };
}

function normalizeDashboardTrafficTimeRange(value: unknown): DashboardTrafficTimeRange {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_TRAFFIC_TIME_RANGE;
  }
  if (typeof value !== 'string') {
    throw new Error('Dashboard traffic timeRange must be a valid time range');
  }
  const normalized = value.trim().toLowerCase();
  if (TRAFFIC_TIME_RANGES.has(normalized as DashboardTrafficTimeRange)) {
    return normalized as DashboardTrafficTimeRange;
  }
  throw new Error('Dashboard traffic timeRange must be a valid time range');
}

function zeroTrafficData(time: string): TrafficData {
  return {
    time,
    tokens: 0,
    requests: 0,
    cost: 0,
    chartTokens: 0,
    chartRequests: 0,
    chartCost: 0,
  };
}

function normalizePieChartData(value: unknown): PieChartData {
  const item = readRequiredRecord(value, 'Dashboard pie chart record is required');
  return {
    name: readRequiredString(item, 'name', 'Dashboard pie chart name is required'),
    value: readRequiredNonNegativeNumber(item, 'value', 'Dashboard pie chart value is required'),
    chartValue: readRequiredNonNegativeNumber(item, 'value', 'Dashboard pie chart value is required'),
    color: readRequiredString(item, 'color', 'Dashboard pie chart color is required'),
  };
}

function normalizeTrafficData(value: unknown): TrafficData {
  const item = readRequiredRecord(value, 'Dashboard traffic record is required');
  const tokens = readRequiredNonNegativeNumber(item, 'tokens', 'Dashboard traffic tokens are required');
  const requests = readRequiredNonNegativeNumber(item, 'requests', 'Dashboard traffic requests are required');
  const cost = readRequiredNonNegativeNumber(item, 'cost', 'Dashboard traffic cost is required');
  return {
    time: readRequiredString(item, 'time', 'Dashboard traffic time is required'),
    tokens,
    requests,
    cost,
    chartTokens: tokens,
    chartRequests: requests,
    chartCost: cost,
  };
}

function normalizeAnalyticsTrafficData(value: unknown): TrafficData {
  const item = readRequiredRecord(value, 'Dashboard traffic analytics trend point is required');
  const tokens = readRequiredNonNegativeNumber(item, 'tokens', 'Dashboard traffic analytics tokens are required');
  const requests = readRequiredNonNegativeNumber(item, 'requests', 'Dashboard traffic analytics requests are required');
  const cost = readRequiredNonNegativeNumber(item, 'points', 'Dashboard traffic analytics points are required');
  return {
    time: readRequiredString(item, 'time', 'Dashboard traffic analytics time is required'),
    tokens,
    requests,
    cost,
    chartTokens: tokens,
    chartRequests: requests,
    chartCost: cost,
  };
}

function normalizeAnalyticsSummary(record: ApiRecord): DashboardAnalyticsSummary {
  return {
    totalUsers: readRequiredNonNegativeNumber(record, 'totalUsers', 'Dashboard traffic analytics total users are required'),
    activeUsers: readRequiredNonNegativeNumber(record, 'activeUsers', 'Dashboard traffic analytics active users are required'),
    activeModels: readRequiredNonNegativeNumber(record, 'activeModels', 'Dashboard traffic analytics active models are required'),
    totalRequests: readRequiredNonNegativeNumber(record, 'totalRequests', 'Dashboard traffic analytics total requests are required'),
    successfulRequests: readRequiredNonNegativeNumber(record, 'successfulRequests', 'Dashboard traffic analytics successful requests are required'),
    failedRequests: readRequiredNonNegativeNumber(record, 'failedRequests', 'Dashboard traffic analytics failed requests are required'),
    totalTokens: readRequiredNonNegativeNumber(record, 'totalTokens', 'Dashboard traffic analytics total tokens are required'),
    totalPoints: readRequiredNonNegativeNumber(record, 'totalPoints', 'Dashboard traffic analytics total points are required'),
    upstreamCost: readRequiredNonNegativeNumber(record, 'upstreamCost', 'Dashboard traffic analytics upstream cost is required'),
    averageTokensPerRequest: readRequiredNonNegativeNumber(record, 'averageTokensPerRequest', 'Dashboard traffic analytics average tokens are required'),
    averagePointsPerRequest: readRequiredNonNegativeNumber(record, 'averagePointsPerRequest', 'Dashboard traffic analytics average points are required'),
    errorRate: readRequiredNonNegativeNumber(record, 'errorRate', 'Dashboard traffic analytics error rate is required'),
  };
}

function normalizeRecentUsageTrace(value: unknown): RecentUsageTrace {
  const item = readRequiredRecord(value, 'Recent usage trace record is required');
  return {
    id: readRequiredString(item, 'id', 'Recent usage trace id is required'),
    user: readRequiredString(item, 'user', 'Recent usage trace user is required'),
    isApiUser: readRequiredBoolean(item, 'isApiUser', 'Recent usage trace API user flag is required'),
    model: readRequiredString(item, 'model', 'Recent usage trace model is required'),
    type: readRequiredString(item, 'type', 'Recent usage trace type is required'),
    billingMode: readRequiredString(item, 'billingMode', 'Recent usage trace billing mode is required'),
    usageIn: optionalNumber(item, 'usageIn', 'Recent usage trace input usage is invalid'),
    usageOut: optionalNumber(item, 'usageOut', 'Recent usage trace output usage is invalid'),
    usageCount: optionalNumber(item, 'usageCount', 'Recent usage trace usage count is invalid'),
    time: readRequiredString(item, 'time', 'Recent usage trace time is required'),
    status: readRequiredString(item, 'status', 'Recent usage trace status is required'),
    cost: readRequiredDecimalString(
      item,
      'cost',
      'Recent usage trace cost is required',
      'Recent usage trace cost must be a decimal string',
    ),
  };
}

function optionalNumber(item: ApiRecord, key: string, message: string): number | undefined {
  const value = item[key];
  return value === undefined || value === null || value === ''
    ? undefined
    : readRequiredNonNegativeNumber(item, key, message);
}

function withInitialPieChartData(items: PieChartData[], initialItems: PieChartData[]): PieChartData[] {
  const chartItems = items.length > 0 ? items : initialItems;
  const hasRenderableValue = chartItems.some((item) => item.value > 0);
  return chartItems.map((item) => ({
    ...item,
    chartValue: hasRenderableValue ? item.value : 1,
  }));
}

function withInitialTrafficData(
  items: TrafficData[],
  timeRange: DashboardTrafficTimeRange = DEFAULT_TRAFFIC_TIME_RANGE,
): TrafficData[] {
  const trafficItems = items.length > 0 ? items : INITIAL_TRAFFIC_DATA_BY_RANGE[timeRange];
  return trafficItems.map((item) => ({
    ...item,
    chartTokens: item.tokens,
    chartRequests: item.requests,
    chartCost: item.cost,
  }));
}

function readRequiredRecordArray(record: ApiRecord, key: string, missingMessage: string, itemMessage: string): ApiRecord[] {
  const value = record[key];
  if (value === undefined || value === null) {
    throw new Error(missingMessage);
  }
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array`);
  }
  return value.map((item) => readRequiredRecord(item, itemMessage));
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readRequiredBoolean(record: ApiRecord, key: string, message: string): boolean {
  const value = record[key];
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    if (value.toLowerCase() === 'true') {
      return true;
    }
    if (value.toLowerCase() === 'false') {
      return false;
    }
  }
  throw new Error(message);
}

function normalizeInstallationStatus(record: ApiRecord): InstallationStatusResponse {
  const status = readRequiredString(record, 'status', 'Installation status is required');
  if (!['not_installed', 'installed', 'upgrade_required', 'incomplete', 'corrupt'].includes(status)) {
    throw new Error('Installation status is invalid');
  }
  return {
    status: status as InstallationStatusResponse['status'],
    schemaVersion: readRequiredString(record, 'schemaVersion', 'Installation schema version is required'),
    catalogVersion: readRequiredString(record, 'catalogVersion', 'Installation catalog version is required'),
    catalogSource: readRequiredString(record, 'catalogSource', 'Installation catalog source is required'),
    externalCatalog: readRequiredBoolean(record, 'externalCatalog', 'Installation external catalog flag is required'),
    lastCatalogRefreshStatus: readInstallationRefreshStatus(record),
    environment: readRequiredString(record, 'environment', 'Installation environment is required'),
    seedProfile: readRequiredString(record, 'seedProfile', 'Installation seed profile is required'),
    changed: readRequiredBoolean(record, 'changed', 'Installation changed flag is required'),
  };
}

function readInstallationRefreshStatus(record: ApiRecord): InstallationStatusResponse['lastCatalogRefreshStatus'] {
  const status = readRequiredString(record, 'lastCatalogRefreshStatus', 'Installation catalog refresh status is required');
  if (!['not_run', 'success', 'dry_run', 'failed'].includes(status)) {
    throw new Error('Installation catalog refresh status is invalid');
  }
  return status as InstallationStatusResponse['lastCatalogRefreshStatus'];
}

function readRequiredDecimalString(
  record: ApiRecord,
  key: string,
  missingMessage: string,
  invalidMessage: string,
): string {
  const value = record[key];
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(missingMessage);
  }
  const normalized = String(value).trim();
  if (!normalized) {
    throw new Error(missingMessage);
  }
  if (!/^-?\d+(?:\.\d{1,6})?$/.test(normalized)) {
    throw new Error(invalidMessage);
  }
  return readDecimalString(record, key);
}

function createSummaryCards(snapshot: {
  activeUsers: number;
  summary: DashboardAnalyticsSummary;
  multimodal: PieChartData[];
}, t: AdminDashboardTranslator): DashboardSummaryCard[] {
  const summary = snapshot.summary;
  const multimodalTotal = sumBy(snapshot.multimodal, (item) => item.value);

  return [
    {
      label: t('admin.dashboard.summary.activeUsers.label', '活跃用户'),
      value: formatInteger(snapshot.activeUsers),
      detail: t('admin.dashboard.summary.activeUsers.detail', '{{amount}} 用户消费', { amount: formatMoney(summary.totalPoints) }),
    },
    {
      label: t('admin.dashboard.summary.modelCoverage.label', '模型覆盖'),
      value: formatInteger(summary.activeModels),
      detail: t('admin.dashboard.summary.modelCoverage.detail', '{{count}} 次模型调用', { count: formatInteger(summary.totalRequests) }),
    },
    {
      label: t('admin.dashboard.summary.totalRequests.label', '总请求'),
      value: formatInteger(summary.totalRequests),
      detail: t('admin.dashboard.summary.totalRequests.detail', '{{success}} 成功 / {{failed}} 失败', {
        success: formatInteger(summary.successfulRequests),
        failed: formatInteger(summary.failedRequests),
      }),
    },
    {
      label: t('admin.dashboard.summary.totalTokens.label', '总 Tokens'),
      value: formatCompactNumber(summary.totalTokens),
      detail: t('admin.dashboard.summary.totalTokens.detail', '累计计费 {{amount}}', { amount: formatMoney(summary.totalPoints) }),
    },
    {
      label: t('admin.dashboard.summary.modalityCalls.label', '模态调用'),
      value: formatInteger(multimodalTotal),
      detail: t('admin.dashboard.summary.modalityCalls.detail', '{{count}} 个模态', { count: formatInteger(snapshot.multimodal.length) }),
    },
    {
      label: t('admin.dashboard.summary.liveTraces.label', '实时流水'),
      value: formatInteger(summary.failedRequests),
      detail: t('admin.dashboard.summary.liveTraces.detail', '{{rate}} 失败率', { rate: formatPercent(summary.errorRate) }),
    },
    {
      label: t('admin.dashboard.summary.recentApiCalls.label', '最近 API 调用'),
      value: formatInteger(summary.totalUsers),
      detail: t('admin.dashboard.summary.recentApiCalls.detail', '总用户 {{count}}', { count: formatInteger(summary.totalUsers) }),
    },
    {
      label: t('admin.dashboard.summary.averageRequestCost.label', '平均单次成本'),
      value: formatMoney(summary.averagePointsPerRequest),
      detail: t('admin.dashboard.summary.averageRequestCost.detail', '按 analytics summary 计算'),
    },
  ];
}

function sumBy<T>(items: T[], project: (item: T) => number): number {
  return items.reduce((total, item) => total + project(item), 0);
}

function formatInteger(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`;
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatCompactNumber(value: number): string {
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000_000) {
    return `${formatCompactUnit(value, 1_000_000_000)}B`;
  }
  if (absolute >= 1_000_000) {
    return `${formatCompactUnit(value, 1_000_000)}M`;
  }
  if (absolute >= 1_000) {
    return `${formatCompactUnit(value, 1_000)}K`;
  }
  return formatInteger(value);
}

function formatCompactUnit(value: number, unit: number): string {
  const normalized = value / unit;
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(1);
}

function interpolateFallback(fallback: string, options?: Record<string, unknown>): string {
  if (!options) {
    return fallback;
  }
  return fallback.replace(/\{\{(\w+)}}/g, (match, key: string) => {
    const value = options[key];
    return value === undefined || value === null ? match : String(value);
  });
}
