import { formatMoney } from '@sdkwork/clawroutes-pc-commons/sdkwork-utils';
import {
  getClawRouterBackendSdkClient,
  isRecord,
  decimalNumber,
  formatLocalizedCompactDecimalAmount,
  formatLocalizedDecimalAmount,
  formatLocalizedInteger,
  readDecimalString,
  readRequiredNonNegativeInt64String,
  readRequiredNonNegativeNumber,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

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
  tokens: string | number;
  requests: string | number;
  points: string | number;
  chartTokens: number;
  chartRequests: number;
  chartPoints: number;
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

export interface InstallationStatusResponse {
  status: 'not_installed' | 'installed' | 'upgrade_required' | 'incomplete' | 'corrupt';
  schemaVersion: string;
  catalogVersion: string;
  catalogSource: string;
  externalCatalog: boolean;
  lastCatalogRefreshStatus: 'not_run' | 'success' | 'dry_run' | 'failed';
  environment: string;
  seedProfile: string;
  changed: boolean;
}

interface DashboardAnalyticsSummary {
  totalUsers: string;
  activeUsers: string;
  activeModels: string;
  totalRequests: string;
  successfulRequests: string;
  failedRequests: string;
  totalTokens: string;
  totalPoints: string;
  upstreamCost: string;
  averageTokensPerRequest: string;
  averagePointsPerRequest: string;
  errorRate: string;
}

interface DashboardAnalyticsSnapshot {
  summary: DashboardAnalyticsSummary;
  traffic: TrafficData[];
}

const COMPACT_AXIS_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const INITIAL_DAILY_TRAFFIC_DATA: TrafficData[] = [
  { time: 'D-6', tokens: 0, requests: 0, points: 0, chartTokens: 0, chartRequests: 0, chartPoints: 0 },
  { time: 'D-5', tokens: 0, requests: 0, points: 0, chartTokens: 0, chartRequests: 0, chartPoints: 0 },
  { time: 'D-4', tokens: 0, requests: 0, points: 0, chartTokens: 0, chartRequests: 0, chartPoints: 0 },
  { time: 'D-3', tokens: 0, requests: 0, points: 0, chartTokens: 0, chartRequests: 0, chartPoints: 0 },
  { time: 'D-2', tokens: 0, requests: 0, points: 0, chartTokens: 0, chartRequests: 0, chartPoints: 0 },
  { time: 'D-1', tokens: 0, requests: 0, points: 0, chartTokens: 0, chartRequests: 0, chartPoints: 0 },
  { time: 'Today', tokens: 0, requests: 0, points: 0, chartTokens: 0, chartRequests: 0, chartPoints: 0 },
];

const DEFAULT_TRAFFIC_TIME_RANGE: DashboardTrafficTimeRange = 'daily';
const TRAFFIC_TIME_RANGES = new Set<DashboardTrafficTimeRange>(['hourly', 'daily', 'weekly', 'monthly']);

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
    normalizeDashboardTrafficTimeRange(query.timeRange);
    const result = await getClawRouterBackendSdkClient().system.dashboard.admin.overview.retrieve();
    const data = readRequiredRecord(result, 'Admin dashboard overview is required');
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
    const analytics = await fetchDailyDashboardAnalytics();
    const userConsumption = withInitialPieChartData(backendUserConsumption, INITIAL_USER_CONSUMPTION);
    const multimodal = withInitialPieChartData(backendMultimodal, INITIAL_MULTIMODAL_DATA);
    const traffic = withInitialTrafficData(analytics.traffic);
    const modelDistribution = withInitialPieChartData(backendModelDistribution, INITIAL_MODEL_DISTRIBUTION);
    return {
      activeUsers,
      summaryCards: createDashboardSummaryCards({
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
    return normalizeInstallationStatus(readRequiredRecord(result, 'Installation status is required'));
  }
}

async function fetchDailyDashboardAnalytics(): Promise<DashboardAnalyticsSnapshot> {
  const result = await getClawRouterBackendSdkClient().system.analytics.admin.overview.retrieve({
    timeRange: DEFAULT_TRAFFIC_TIME_RANGE,
  });
  const data = readRequiredRecord(result, 'Dashboard traffic analytics overview is required');
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

export function normalizeDashboardTrafficTimeRange(value: unknown): DashboardTrafficTimeRange {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_TRAFFIC_TIME_RANGE;
  }
  if (typeof value !== 'string') {
    throw new Error('Dashboard traffic timeRange must be a valid time range');
  }
  const normalized = value.trim().toLowerCase();
  if (normalized === DEFAULT_TRAFFIC_TIME_RANGE) {
    return DEFAULT_TRAFFIC_TIME_RANGE;
  }
  if (TRAFFIC_TIME_RANGES.has(normalized as DashboardTrafficTimeRange)) {
    throw new Error(`Dashboard analytics SDK does not support the requested ${normalized} time range`);
  }
  throw new Error('Dashboard traffic timeRange must be a valid time range');
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
  const points = readRequiredNonNegativeNumber(item, 'cost', 'Dashboard traffic billing Compute Credits are required');
  return {
    time: readRequiredString(item, 'time', 'Dashboard traffic time is required'),
    tokens,
    requests,
    points,
    chartTokens: tokens,
    chartRequests: requests,
    chartPoints: points,
  };
}

export function normalizeAnalyticsTrafficData(value: unknown): TrafficData {
  const item = readRequiredRecord(value, 'Dashboard traffic analytics trend point is required');
  const tokens = readRequiredAnalyticsDecimalString(item, 'tokens', 'Dashboard traffic analytics tokens are required');
  const requests = readRequiredAnalyticsDecimalString(item, 'requests', 'Dashboard traffic analytics requests are required');
  const points = readRequiredAnalyticsDecimalString(item, 'points', 'Dashboard traffic analytics Compute Credits are required');
  return {
    time: readRequiredString(item, 'time', 'Dashboard traffic analytics time is required'),
    tokens,
    requests,
    points,
    chartTokens: analyticsChartNumber(tokens),
    chartRequests: analyticsChartNumber(requests),
    chartPoints: analyticsChartNumber(points),
  };
}

function normalizeAnalyticsSummary(record: ApiRecord): DashboardAnalyticsSummary {
  return {
    totalUsers: readRequiredNonNegativeInt64String(record, 'totalUsers', 'Dashboard traffic analytics total users are required'),
    activeUsers: readRequiredNonNegativeInt64String(record, 'activeUsers', 'Dashboard traffic analytics active users are required'),
    activeModels: readRequiredNonNegativeInt64String(record, 'activeModels', 'Dashboard traffic analytics active models are required'),
    totalRequests: readRequiredNonNegativeInt64String(record, 'totalRequests', 'Dashboard traffic analytics total requests are required'),
    successfulRequests: readRequiredNonNegativeInt64String(record, 'successfulRequests', 'Dashboard traffic analytics successful requests are required'),
    failedRequests: readRequiredNonNegativeInt64String(record, 'failedRequests', 'Dashboard traffic analytics failed requests are required'),
    totalTokens: readRequiredAnalyticsDecimalString(record, 'totalTokens', 'Dashboard traffic analytics total tokens are required'),
    totalPoints: readRequiredAnalyticsDecimalString(record, 'totalPoints', 'Dashboard traffic analytics total Compute Credits are required'),
    upstreamCost: readRequiredAnalyticsDecimalString(record, 'upstreamCost', 'Dashboard traffic analytics upstream cost is required'),
    averageTokensPerRequest: readRequiredAnalyticsDecimalString(record, 'averageTokensPerRequest', 'Dashboard traffic analytics average tokens are required'),
    averagePointsPerRequest: readRequiredAnalyticsDecimalString(record, 'averagePointsPerRequest', 'Dashboard traffic analytics average Compute Credits are required'),
    errorRate: readRequiredAnalyticsDecimalString(record, 'errorRate', 'Dashboard traffic analytics error rate is required'),
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
): TrafficData[] {
  const trafficItems = items.length > 0 ? items : INITIAL_DAILY_TRAFFIC_DATA;
  return trafficItems.map((item) => ({
    ...item,
    chartTokens: analyticsChartNumber(item.tokens),
    chartRequests: analyticsChartNumber(item.requests),
    chartPoints: analyticsChartNumber(item.points),
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

function readRequiredAnalyticsDecimalString(record: ApiRecord, key: string, message: string): string {
  const value = record[key];
  if (typeof value !== 'string') {
    throw new Error(message);
  }
  const normalized = value.trim();
  if (normalized.length > 64 || !/^[0-9]+(?:\.[0-9]{1,12})?$/u.test(normalized)) {
    throw new Error(message);
  }
  return normalized;
}

function analyticsChartNumber(value: string | number): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.min(Math.max(value, 0), Number.MAX_SAFE_INTEGER) : 0;
  }
  const projected = decimalNumber(value, 12);
  return Number.isFinite(projected)
    ? Math.min(Math.max(projected, 0), Number.MAX_SAFE_INTEGER)
    : Number.MAX_SAFE_INTEGER;
}

export function createDashboardSummaryCards(snapshot: {
  activeUsers: number;
  summary: DashboardAnalyticsSummary;
  multimodal: PieChartData[];
}, t: AdminDashboardTranslator = DEFAULT_DASHBOARD_TRANSLATOR): DashboardSummaryCard[] {
  const summary = snapshot.summary;
  const multimodalTotal = sumBy(snapshot.multimodal, (item) => item.value);

  return [
    {
      label: t('admin.dashboard.summary.activeUsers.label', '活跃用户'),
      value: formatInteger(snapshot.activeUsers),
      detail: t('admin.dashboard.summary.activeUsers.detail', '{{active}} / {{total}} 位用户活跃', {
        active: formatInteger(summary.activeUsers),
        total: formatInteger(summary.totalUsers),
      }),
    },
    {
      label: t('admin.dashboard.summary.activeModels.label', '活跃模型'),
      value: formatInteger(summary.activeModels),
      detail: t('admin.dashboard.summary.activeModels.detail', '已产生调用流量'),
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
      detail: t('admin.dashboard.summary.totalTokens.detail', '平均每次 {{average}} Tokens', {
        average: formatDecimal(summary.averageTokensPerRequest),
      }),
    },
    {
      label: t('admin.dashboard.summary.modalityCalls.label', '模态调用'),
      value: formatInteger(multimodalTotal),
      detail: t('admin.dashboard.summary.modalityCalls.detail', '{{count}} 个模态', { count: formatInteger(snapshot.multimodal.length) }),
    },
    {
      label: t('admin.dashboard.summary.errorRate.label', '错误率'),
      value: formatPercent(summary.errorRate),
      detail: t('admin.dashboard.summary.errorRate.detail', '{{count}} 次失败请求', {
        count: formatInteger(summary.failedRequests),
      }),
    },
    {
      label: t('admin.dashboard.summary.pointsConsumed.label', 'Compute Credits consumed'),
      value: formatDecimal(summary.totalPoints),
      detail: t('admin.dashboard.summary.pointsConsumed.detail', '{{average}} Compute Credits per request', {
        average: formatDecimal(summary.averagePointsPerRequest),
      }),
    },
    {
      label: t('admin.dashboard.summary.upstreamCost.label', '上游成本'),
      value: formatDecimal(summary.upstreamCost),
      detail: t('admin.dashboard.summary.upstreamCost.detail', '币种不可用'),
    },
  ];
}

function sumBy<T>(items: T[], project: (item: T) => number): number {
  return items.reduce((total, item) => total + project(item), 0);
}

function formatInteger(value: string | number): string {
  return formatLocalizedInteger(value, 'en-US');
}

export function formatChargeAmount(value: string): string {
  return (
    formatMoney(value, {
      currency: 'USD',
      locale: 'en-US',
      mode: 'decimal',
      minFractionDigits: 0,
      maxFractionDigits: 6,
    }) ?? value
  );
}

export function formatCompactAxisValue(value: number): string {
  return COMPACT_AXIS_NUMBER_FORMATTER.format(value).replace(/K$/u, 'k');
}

function formatDecimal(value: string): string {
  return (
    formatMoney(value, {
      currency: 'USD',
      locale: 'en-US',
      mode: 'decimal',
      minFractionDigits: 0,
      maxFractionDigits: 2,
    }) ?? formatLocalizedDecimalAmount(value, 'en-US', 2, 0)
  );
}

function formatPercent(value: string): string {
  return `${formatLocalizedDecimalAmount(value, 'en-US', 1, 1)}%`;
}

function formatCompactNumber(value: string): string {
  return formatLocalizedCompactDecimalAmount(value, 'en-US');
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
