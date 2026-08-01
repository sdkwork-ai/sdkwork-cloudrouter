import {
  APP_API_PREFIX,
  OPEN_API_PREFIX,
  ensureSdkworkApiSuccess,
  isRecord,
  readClawRouterRuntimeEnv,
  readRequiredApiItem,
  readRequiredNonNegativeNumber,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { getClawRouterAccountAppService } from '@sdkwork/clawroutes-pc-commons/domain-service-providers';
import { getClawRouterAppSdkClient } from '@sdkwork/clawrouter-pc-console-core/sdk';
import type {
  DashboardConfigurationDomain as SdkDashboardConfigurationDomain,
  DashboardOverviewResponse as SdkDashboardOverviewResponse,
} from '@sdkwork/clawrouter-pc-console-core/sdk';

export type DashboardTimeRange = 'hourly' | 'daily' | 'monthly' | 'yearly';

interface DashboardSummary {
  tokenBankAvailable: number;
  usedCredits: number;
  requestCount: number;
  totalUsedCredits: number;
  totalRequestCount: number;
  errorCount: number;
  imageRequests: number;
  videoRequests: number;
  audioRequests: number;
  musicRequests: number;
  rpm: number;
  tpm: number;
}

export interface DashboardData {
  time: string;
  'llm (Text)': number;
  'image (Midjourney/DALL-E)': number;
  'video (Runway/Sora)': number;
  'audio (Whisper)': number;
  'music (Suno)': number;
}

export interface ModelUsage {
  rank: number;
  name: SdkDashboardOverviewResponse['topModels'][number]['name'];
  supplier: SdkDashboardOverviewResponse['topModels'][number]['supplier'];
  modality: SdkDashboardOverviewResponse['topModels'][number]['modality'];
  requests: number;
  cost: number;
  trend: SdkDashboardOverviewResponse['topModels'][number]['trend'];
  isUp: SdkDashboardOverviewResponse['topModels'][number]['isUp'];
}

type DashboardAnnouncementContract = SdkDashboardOverviewResponse['announcements'][number];
type DashboardAnnouncementTypeContract = {
  type: 'success' | 'info' | 'warning' | 'error' | 'unknown';
};
type DashboardAnnouncementType = DashboardAnnouncementContract['type'] & DashboardAnnouncementTypeContract['type'];

export interface Announcement {
  id: string;
  text: DashboardAnnouncementContract['text'];
  textI18nKey?: string;
  time: DashboardAnnouncementContract['time'];
  timeI18nKey?: string;
  type: DashboardAnnouncementType;
}

export interface ConfigurationDomain {
  id: SdkDashboardConfigurationDomain['id'];
  name: SdkDashboardConfigurationDomain['name'];
  domain: SdkDashboardConfigurationDomain['domain'];
  ip: SdkDashboardConfigurationDomain['ip'];
  status: SdkDashboardConfigurationDomain['status'];
  remark: SdkDashboardConfigurationDomain['remark'];
}

interface DashboardSnapshot {
  summary: DashboardSummary;
  requestSparkline: Array<{ value: number }>;
  multimodalSparkline: Array<{ value: number }>;
  performanceSparkline: Array<{ value: number }>;
  chartData: DashboardData[];
  topModels: ModelUsage[];
  announcements: Announcement[];
  configurationDomains: ConfigurationDomain[];
  warnings: SdkDashboardOverviewResponse['warnings'];
}

const MODALITY_KEYS = {
  text: 'llm (Text)',
  image: 'image (Midjourney/DALL-E)',
  video: 'video (Runway/Sora)',
  audio: 'audio (Whisper)',
  music: 'music (Suno)',
} as const;

const CONFIGURATION_DOMAIN_KEYS = [
  'configurationNodes',
  'serviceNodes',
  'gatewayNodes',
  'nodes',
  'configurationDomains',
  'domainConfigs',
  'supportedDomains',
  'gatewayDomains',
  'domains',
] as const;

/** Stable i18n keys referenced by dashboard runtime standard tests and empty-state copy. */
export const DASHBOARD_RUNTIME_I18N_KEYS = {
  initialAnnouncement: 'console.dashboard.dashboardview.text.initialAnnouncement',
  measurementUnavailable: 'console.dashboard.dashboardview.text.measurementUnavailable',
  speedTimeout: 'console.dashboard.dashboardview.text.speedTimeout',
  domainProtocolError: 'console.dashboard.dashboardview.text.domainProtocolError',
} as const;

const EMPTY_SUMMARY: DashboardSummary = {
  tokenBankAvailable: 0,
  usedCredits: 0,
  requestCount: 0,
  totalUsedCredits: 0,
  totalRequestCount: 0,
  errorCount: 0,
  imageRequests: 0,
  videoRequests: 0,
  audioRequests: 0,
  musicRequests: 0,
  rpm: 0,
  tpm: 0,
};

export class DashboardService {
  static emptyDashboardSnapshot(timeRange: DashboardTimeRange = 'daily'): DashboardSnapshot {
    return createInitialDashboardSnapshot(timeRange);
  }

  static async fetchDashboardOverview(timeRange: DashboardTimeRange): Promise<DashboardSnapshot> {
    const params = buildTimeRangeParams(timeRange);
    const [overviewResult, tokenBankResult] = await Promise.allSettled([
      loadDashboardOverview(params),
      loadTokenBankAccount(),
    ]);
    let snapshot = createInitialDashboardSnapshot(timeRange);

    if (overviewResult.status === 'fulfilled') {
      try {
        const result = overviewResult.value;
        ensureSdkworkApiSuccess(result, 'Failed to fetch dashboard overview');
        snapshot = normalizeDashboardSnapshot(
          readRequiredApiItem(result, 'Dashboard overview response is missing data'),
          timeRange,
        );
      } catch {
        // Keep the complete default snapshot when the response cannot be normalized.
      }
    }

    let tokenBankAvailable = snapshot.summary.tokenBankAvailable;
    if (tokenBankResult.status === 'fulfilled') {
      try {
        tokenBankAvailable = readTokenBankAvailableAmount(tokenBankResult.value);
      } catch {
        // Keep the default zero balance when the Token Bank response is unavailable.
      }
    }

    return {
      ...snapshot,
      summary: {
        ...snapshot.summary,
        tokenBankAvailable,
      },
    };
  }
}

async function loadDashboardOverview(params: Record<string, string>): Promise<unknown> {
  return retrieveDashboardOverview(getClawRouterAppSdkClient(), params);
}

async function loadTokenBankAccount(): Promise<unknown> {
  return getClawRouterAccountAppService().tokenBank.account.retrieve();
}

async function retrieveDashboardOverview(
  client: ReturnType<typeof getClawRouterAppSdkClient>,
  params: Record<string, string>,
): Promise<unknown> {
  const result: unknown = await client.ai.dashboard.overview.retrieve(params);
  return result;
}

function buildTimeRangeParams(timeRange: DashboardTimeRange): Record<string, string> {
  const end = new Date();
  const start = new Date(end);
  if (timeRange === 'hourly') {
    // Align to UTC hour boundary so the query window matches the expected
    // period buckets generated in UTC by buildExpectedChartPeriods.
    start.setUTCHours(end.getUTCHours() - 24, 0, 0, 0);
  } else if (timeRange === 'daily') {
    start.setUTCDate(end.getUTCDate() - 30);
    start.setUTCHours(0, 0, 0, 0);
  } else if (timeRange === 'monthly') {
    start.setUTCMonth(end.getUTCMonth() - 12, 1);
    start.setUTCHours(0, 0, 0, 0);
  } else {
    start.setUTCFullYear(end.getUTCFullYear() - 10);
    start.setUTCHours(0, 0, 0, 0);
  }
  return {
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    timeRange,
  };
}

function createInitialDashboardSnapshot(timeRange: DashboardTimeRange): DashboardSnapshot {
  const chartData = createInitialChartData(timeRange);
  const sparkline = createZeroSparkline(chartData.length);

  return {
    summary: { ...EMPTY_SUMMARY },
    requestSparkline: sparkline,
    multimodalSparkline: sparkline,
    performanceSparkline: sparkline,
    chartData,
    topModels: [],
    announcements: [],
    configurationDomains: createInitialConfigurationDomains(),
    warnings: [],
  };
}

function normalizeDashboardSnapshot(record: ApiRecord, timeRange: DashboardTimeRange): DashboardSnapshot {
  const initialSnapshot = createInitialDashboardSnapshot(timeRange);
  const normalizedChartData = normalizeChartData(record, timeRange);
  const chartData = normalizedChartData.length > 0 ? normalizedChartData : initialSnapshot.chartData;
  const normalizedTopModels = normalizeTopModels(record);
  const normalizedAnnouncements = normalizeAnnouncements(record);
  const normalizedConfigurationDomains = normalizeConfigurationDomains(record);
  const requestSparkline = normalizeSparkline(record, ['requestSparkline', 'request_sparkline'], 'request', chartData, (item) => totalModalityValue(item));
  const multimodalSparkline = normalizeSparkline(record, ['multimodalSparkline', 'multimodal_sparkline'], 'multimodal', chartData, (item) => {
    return item[MODALITY_KEYS.image] + item[MODALITY_KEYS.video] + item[MODALITY_KEYS.audio] + item[MODALITY_KEYS.music];
  });
  const performanceSparkline = normalizeSparkline(record, ['performanceSparkline', 'performance_sparkline'], 'performance', [], () => 0);

  return {
    summary: normalizeSummary(record.summary, initialSnapshot.summary),
    requestSparkline: requestSparkline.length > 0 ? requestSparkline : initialSnapshot.requestSparkline,
    multimodalSparkline: multimodalSparkline.length > 0 ? multimodalSparkline : initialSnapshot.multimodalSparkline,
    performanceSparkline: performanceSparkline.length > 0 ? performanceSparkline : initialSnapshot.performanceSparkline,
    chartData,
    topModels: normalizedTopModels,
    announcements: normalizedAnnouncements,
    configurationDomains: normalizedConfigurationDomains.length > 0
      ? normalizedConfigurationDomains
      : initialSnapshot.configurationDomains,
    warnings: normalizeWarnings(record),
  };
}

function createInitialChartData(timeRange: DashboardTimeRange): DashboardData[] {
  return buildExpectedChartPeriods(timeRange).map(({ label }) => ({
    time: label,
    [MODALITY_KEYS.text]: 0,
    [MODALITY_KEYS.image]: 0,
    [MODALITY_KEYS.video]: 0,
    [MODALITY_KEYS.audio]: 0,
    [MODALITY_KEYS.music]: 0,
  }));
}

/**
 * Builds the full expected time-series for a range, expressed in UTC so the
 * `period` key matches the backend bucketing (backend truncates the UTC
 * `occurred_at` to a fixed-length prefix: hourly→13 "YYYY-MM-DD HH",
 * daily→10 "YYYY-MM-DD", monthly→7 "YYYY-MM", yearly→4 "YYYY"). The `label` is
 * the display string rendered on the chart axis. Every bucket in the window is
 * emitted so the chart always shows the complete series (zero-filled where
 * there is no usage), satisfying "每个月/每年都要展示".
 */
function buildExpectedChartPeriods(timeRange: DashboardTimeRange): Array<{ period: string; label: string }> {
  const now = new Date();
  const points: Array<{ period: string; label: string }> = [];

  if (timeRange === 'hourly') {
    // Past 24 hours, one point per hour.
    for (let offset = 23; offset >= 0; offset--) {
      const date = new Date(now);
      date.setUTCHours(date.getUTCHours() - offset, 0, 0, 0);
      const period = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())} ${pad2(date.getUTCHours())}`;
      points.push({ period, label: `${pad2(date.getUTCHours())}:00` });
    }
    return points;
  }

  if (timeRange === 'daily') {
    // Past 30 days, one point per day.
    for (let offset = 29; offset >= 0; offset--) {
      const date = new Date(now);
      date.setUTCDate(date.getUTCDate() - offset);
      date.setUTCHours(0, 0, 0, 0);
      const period = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
      points.push({ period, label: `${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}` });
    }
    return points;
  }

  if (timeRange === 'monthly') {
    // Past 12 months, one point per month.
    for (let offset = 11; offset >= 0; offset--) {
      const date = new Date(now);
      date.setUTCMonth(date.getUTCMonth() - offset, 1);
      date.setUTCHours(0, 0, 0, 0);
      const period = `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}`;
      points.push({ period, label: period });
    }
    return points;
  }

  // Past 10 years, one point per year.
  for (let offset = 9; offset >= 0; offset--) {
    const date = new Date(now);
    date.setUTCFullYear(date.getUTCFullYear() - offset);
    date.setUTCHours(0, 0, 0, 0);
    const period = String(date.getUTCFullYear());
    points.push({ period, label: period });
  }
  return points;
}

function createZeroSparkline(length: number): Array<{ value: number }> {
  return Array.from({ length: Math.max(1, length) }, () => ({ value: 0 }));
}

function createInitialConfigurationDomains(): ConfigurationDomain[] {
  return dedupeConfigurationDomains([
    {
      id: 'gateway-openai-compatible',
      name: 'OpenAI-compatible Gateway',
      domain: normalizeConfigurationDomainUrl(
        readClawRouterRuntimeEnv('VITE_CLAWROUTER_OPEN_API_BASE_URL')
          ?? readClawRouterRuntimeEnv('VITE_API_BASE_URL')
          ?? OPEN_API_PREFIX,
      ),
      ip: '',
      status: 'unknown',
      remark: 'Primary OpenAI-compatible API base for model requests.',
    },
    {
      id: 'app-product-api',
      name: 'App Product API',
      domain: normalizeConfigurationDomainUrl(readClawRouterRuntimeEnv('VITE_CLAWROUTER_APP_API_BASE_URL') ?? APP_API_PREFIX),
      ip: '',
      status: 'unknown',
      remark: 'Product console API base for user-facing operations.',
    },
  ]);
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function normalizeChartData(record: ApiRecord, timeRange: DashboardTimeRange): DashboardData[] {
  const backendRows = readOptionalFirstRecordArray(record, ['chartData', 'chart_data'], 'Dashboard overview chart record is required')
    .map((value) => {
      const item = readRequiredRecord(value, 'Dashboard overview chart record is required');
      return {
        period: readRequiredFirstString(item, ['time', 'day', 'date', 'period'], 'Dashboard overview chart time is required'),
        text: readRequiredFirstNumber(item, ['llm (Text)', 'text', 'textRequests', 'request_count'], 'Dashboard overview text requests are required'),
        image: readRequiredFirstNumber(item, ['image (Midjourney/DALL-E)', 'image', 'imageRequests'], 'Dashboard overview image requests are required'),
        video: readRequiredFirstNumber(item, ['video (Runway/Sora)', 'video', 'videoRequests'], 'Dashboard overview video requests are required'),
        audio: readRequiredFirstNumber(item, ['audio (Whisper)', 'audio', 'audioRequests'], 'Dashboard overview audio requests are required'),
        music: readRequiredFirstNumber(item, ['music (Suno)', 'music', 'musicRequests'], 'Dashboard overview music requests are required'),
      };
    });

  const expected = buildExpectedChartPeriods(timeRange);
  const backendByPeriod = new Map<string, { text: number; image: number; video: number; audio: number; music: number }>();
  for (const row of backendRows) {
    backendByPeriod.set(row.period, row);
  }

  // Merge backend buckets into the complete expected series: every bucket in
  // the window is rendered, zero-filled where the backend returned no data.
  return expected.map(({ period, label }) => {
    const row = backendByPeriod.get(period);
    return {
      time: label,
      [MODALITY_KEYS.text]: row?.text ?? 0,
      [MODALITY_KEYS.image]: row?.image ?? 0,
      [MODALITY_KEYS.video]: row?.video ?? 0,
      [MODALITY_KEYS.audio]: row?.audio ?? 0,
      [MODALITY_KEYS.music]: row?.music ?? 0,
    };
  });
}

function normalizeTopModels(record: ApiRecord): ModelUsage[] {
  return readOptionalFirstRecordArray(record, ['topModels', 'top_models'], 'Dashboard top model record is required')
    .map((item) => {
      const trend = readRequiredFirstString(item, ['trend', 'change'], 'Dashboard top model trend is required');
      return {
        rank: readRequiredPositiveRank(item, ['rank', 'rankNo'], 'Dashboard top model rank is required'),
        name: readRequiredFirstString(item, ['name', 'model'], 'Dashboard top model name is required'),
        supplier: readRequiredFirstString(item, ['supplier', 'vendor', 'vendorCode'], 'Dashboard top model supplier is required'),
        modality: normalizeModality(readRequiredFirstString(item, ['modality', 'type'], 'Dashboard top model modality is required')),
        requests: readRequiredFirstNumber(item, ['requests', 'requestCount', 'request_count'], 'Dashboard top model request count is required'),
        cost: readRequiredFirstNumber(item, ['cost', 'costAmount', 'cost_amount'], 'Dashboard top model cost is required'),
        trend,
        isUp: readRequiredBoolean(item, 'isUp', 'Dashboard top model direction flag is required'),
      };
    })
    .sort((left, right) => left.rank - right.rank);
}

function normalizeAnnouncements(record: ApiRecord): Announcement[] {
  return readOptionalFirstRecordArray(record, ['announcements'], 'Dashboard announcement record is required')
    .map((item) => ({
      id: readRequiredFirstString(item, ['id', 'messageId', 'message_id'], 'Dashboard announcement id is required'),
      text: readRequiredFirstString(item, ['text', 'title', 'summary', 'content'], 'Dashboard announcement text is required'),
      textI18nKey: readOptionalFirstString(item, ['textI18nKey', 'text_i18n_key']),
      time: readRequiredFirstString(item, ['time', 'publishedAt', 'published_at', 'createdAt', 'created_at'], 'Dashboard announcement time is required'),
      timeI18nKey: readOptionalFirstString(item, ['timeI18nKey', 'time_i18n_key']),
      type: normalizeAnnouncementType(readRequiredFirstString(item, ['type', 'announcementType', 'messageType', 'message_type'], 'Dashboard announcement type is required')),
    }));
}

function normalizeConfigurationDomains(record: ApiRecord): ConfigurationDomain[] {
  return readOptionalFirstRecordArray(record, CONFIGURATION_DOMAIN_KEYS, 'Dashboard configuration domain record is required')
    .map((item, index) => {
      const name = readRequiredFirstString(item, ['name', 'title', 'label', 'displayName', 'display_name'], 'Dashboard configuration domain name is required');
      const domain = normalizeConfigurationDomainUrl(
        readRequiredFirstString(
          item,
          ['domain', 'url', 'baseUrl', 'base_url', 'endpoint', 'origin', 'hostName', 'host_name', 'hostname', 'instanceCode', 'instance_code'],
          'Dashboard configuration domain URL is required',
        ),
      );
      const ip = readOptionalFirstString(item, ['ip', 'ipAddress', 'ip_address', 'address']) ?? '';
      const status = normalizeConfigurationDomainStatus(
        readOptionalFirstString(item, ['status', 'healthStatus', 'health_status', 'state']) ?? 'unknown',
      );
      const remark = readOptionalFirstString(item, ['remark', 'remarks', 'description', 'note', 'notes', 'memo']) ?? '';
      const explicitId = readOptionalFirstString(item, ['id', 'key', 'code']);
      return {
        id: explicitId ?? createConfigurationDomainId(name, domain, index),
        name,
        domain,
        ip,
        status,
        remark,
      };
    });
}

function normalizeSummary(value: unknown, fallback: DashboardSummary): DashboardSummary {
  if (value === undefined || value === null) {
    return { ...fallback };
  }
  if (!isRecord(value)) {
    throw new Error('Dashboard overview summary must be an object');
  }

  return {
    tokenBankAvailable: fallback.tokenBankAvailable,
    usedCredits: readOptionalFirstNumber(value, ['usedCredits', 'cost', 'costAmount'], fallback.usedCredits),
    requestCount: readOptionalFirstNumber(value, ['requestCount', 'requests', 'totalRequests'], fallback.requestCount),
    totalUsedCredits: readOptionalFirstNumber(value, ['totalUsedCredits', 'totalCostAmount', 'totalCost', 'historyUsedCredits'], fallback.totalUsedCredits),
    totalRequestCount: readOptionalFirstNumber(value, ['totalRequestCount', 'historyRequestCount', 'lifetimeRequestCount'], fallback.totalRequestCount),
    errorCount: readOptionalFirstNumber(value, ['errorCount', 'errors', 'failedRequests'], fallback.errorCount),
    imageRequests: readOptionalFirstNumber(value, ['imageRequests'], fallback.imageRequests),
    videoRequests: readOptionalFirstNumber(value, ['videoRequests'], fallback.videoRequests),
    audioRequests: readOptionalFirstNumber(value, ['audioRequests'], fallback.audioRequests),
    musicRequests: readOptionalFirstNumber(value, ['musicRequests'], fallback.musicRequests),
    rpm: readOptionalFirstNumber(value, ['rpm', 'requestsPerMinute'], fallback.rpm),
    tpm: readOptionalFirstNumber(value, ['tpm', 'tokensPerMinute', 'totalTokens'], fallback.tpm),
  };
}

function readTokenBankAvailableAmount(value: unknown): number {
  if (!isRecord(value)) {
    throw new Error('Token Bank account must be an object');
  }
  return readRequiredNonNegativeNumber(
    value,
    'availableAmount',
    'Token Bank available amount must be a non-negative number',
  );
}

function normalizeSparkline(
  record: ApiRecord,
  keys: readonly string[],
  label: string,
  fallbackItems: DashboardData[],
  fallbackSelector: (item: DashboardData) => number,
): Array<{ value: number }> {
  const explicit = readOptionalFirstRecordArray(
    record,
    keys,
    `Dashboard ${label} sparkline record is required`,
  )
    .map((item) => ({ value: readRequiredNonNegativeNumber(item, 'value', `Dashboard ${label} sparkline value is required`) }));
  if (explicit.length > 0) {
    return explicit;
  }

  return fallbackItems
    .slice(-10)
    .map((item) => ({ value: fallbackSelector(item) }))
    .filter((item) => Number.isFinite(item.value));
}

function normalizeWarnings(record: ApiRecord): string[] {
  const value = record.warnings;
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error('Dashboard overview warnings must be an array');
  }
  return value
    .map((item) => (typeof item === 'string' ? item : null))
    .filter((item): item is string => item !== null && item.trim() !== '');
}

function readOptionalFirstRecordArray(record: ApiRecord, keys: readonly string[], itemMessage: string): ApiRecord[] {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(record, key)) {
      continue;
    }
    const value = record[key];
    if (value === undefined) {
      continue;
    }
    if (!Array.isArray(value)) {
      throw new Error(`${key} must be an array`);
    }
    return value.map((item) => readRequiredRecord(item, itemMessage));
  }
  return [];
}

function readOptionalFirstNumber(record: ApiRecord, keys: string[], fallback: number): number {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
      return readRequiredNonNegativeNumber(record, key, `${key} must be a non-negative number`);
    }
  }
  return fallback;
}

function readOptionalFirstString(record: ApiRecord, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }
  return undefined;
}

function readRequiredFirstString(record: ApiRecord, keys: string[], message: string): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }
  throw new Error(message);
}

function readRequiredFirstNumber(record: ApiRecord, keys: string[], message: string): number {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== '') {
      return readRequiredNonNegativeNumber(record, key, message);
    }
  }
  throw new Error(message);
}

function readRequiredPositiveRank(record: ApiRecord, keys: string[], message: string): number {
  const rank = readRequiredFirstNumber(record, keys, message);
  if (!Number.isSafeInteger(rank) || rank < 1) {
    throw new Error(message);
  }
  return rank;
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

function totalModalityValue(item: DashboardData): number {
  return (
    item[MODALITY_KEYS.text] +
    item[MODALITY_KEYS.image] +
    item[MODALITY_KEYS.video] +
    item[MODALITY_KEYS.audio] +
    item[MODALITY_KEYS.music]
  );
}

function normalizeModality(value: string): ModelUsage['modality'] {
  const normalized = value.toLowerCase();
  if (normalized === 'unknown') {
    return 'unknown';
  }
  if (normalized === 'image' || normalized.includes('image')) {
    return 'image';
  }
  if (normalized === 'video' || normalized.includes('video')) {
    return 'video';
  }
  if (normalized === 'audio' || normalized.includes('audio') || normalized.includes('speech') || normalized.includes('whisper')) {
    return 'audio';
  }
  if (normalized === 'music' || normalized.includes('music') || normalized.includes('suno')) {
    return 'music';
  }
  if (normalized === 'text' || normalized.includes('text') || normalized.includes('llm')) {
    return 'text';
  }
  return 'unknown';
}

function normalizeAnnouncementType(value: string): Announcement['type'] {
  const normalized = value.toLowerCase();
  if (normalized === 'unknown') {
    return 'unknown';
  }
  if (normalized === 'error' || normalized.includes('error') || normalized.includes('danger')) {
    return 'error';
  }
  if (normalized === 'warning' || normalized.includes('warn')) {
    return 'warning';
  }
  if (normalized === 'success' || normalized.includes('success')) {
    return 'success';
  }
  if (normalized === 'info' || normalized.includes('info')) {
    return 'info';
  }
  return 'unknown';
}

function normalizeConfigurationDomainUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/g, '');
  if (!trimmed) {
    throw new Error('Dashboard configuration domain URL is required');
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('/')) {
    return trimmed;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    throw new Error('Dashboard configuration domain URL must use http, https, or a relative path');
  }
  return `https://${trimmed}`;
}

function normalizeConfigurationDomainStatus(value: string): ConfigurationDomain['status'] {
  const normalized = value.trim().toLowerCase();
  if (['online', 'healthy', 'active', 'enabled', 'up', 'running'].includes(normalized)) {
    return 'online';
  }
  if (['warning', 'warn', 'degraded', 'degrading'].includes(normalized)) {
    return 'warning';
  }
  if (['offline', 'disabled', 'inactive', 'down', 'stopped'].includes(normalized)) {
    return 'offline';
  }
  return 'unknown';
}

function createConfigurationDomainId(name: string, domain: string, index: number): string {
  const base = `${name}-${domain}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || `configuration-domain-${index + 1}`;
}

function dedupeConfigurationDomains(items: ConfigurationDomain[]): ConfigurationDomain[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.domain.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
