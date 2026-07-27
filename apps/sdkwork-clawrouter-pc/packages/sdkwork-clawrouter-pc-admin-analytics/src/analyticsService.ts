import {
  isRecord,
  readNullableString,
  readNumber,
  readRequiredNonNegativeNumber,
  readRequiredString,
  readString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/api-result';
import { getClawRouterBackendSdkClient } from '@sdkwork/clawroutes-pc-commons/sdk-clients';
import { optionalText } from '@sdkwork/clawroutes-pc-commons/sdk-request-boundary';

export type AdminAnalyticsTimeRange = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type AdminAnalyticsRankMetric = 'points' | 'tokens' | 'requests';
export type AdminAnalyticsInsightSeverity = 'info' | 'warning' | 'critical';

export interface AdminAnalyticsQuery {
  timeRange?: AdminAnalyticsTimeRange;
  startTime?: string;
  endTime?: string;
  rankingSize?: number;
}

type AdminAnalyticsSdkQuery = {
  timeRange?: AdminAnalyticsTimeRange;
  startTime?: string;
  endTime?: string;
  rankingSize?: number;
};

export interface PieChartData {
  name: string;
  value: number;
  color: string;
}

export interface AdminAnalyticsSummary {
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

export interface AdminAnalyticsTrendPoint {
  time: string;
  requests: number;
  tokens: number;
  points: number;
  users: number;
}

export interface AdminAnalyticsUserRankItem {
  rank: number;
  userId: string;
  userName: string;
  email: string | null;
  requestCount: number;
  totalTokens: number;
  points: number;
  modelDistribution: PieChartData[];
}

export interface AdminAnalyticsModelRankItem {
  rank: number;
  model: string;
  catalogKey: string;
  vendor: string;
  modality: string;
  requestCount: number;
  totalTokens: number;
  points: number;
  upstreamCost: number;
  userCount: number;
  averageTokensPerRequest: number;
  errorRate: number;
}

export interface AdminAnalyticsRankings<T> {
  points: T[];
  tokens: T[];
  requests: T[];
}

export interface AdminAnalyticsInsight {
  key: string;
  title: string;
  value: string;
  severity: AdminAnalyticsInsightSeverity;
  detail: string;
}

export interface AdminAnalyticsOverview {
  timeRange: AdminAnalyticsTimeRange;
  startTime: string | null;
  endTime: string | null;
  rankingSize: number;
  summary: AdminAnalyticsSummary;
  trend: AdminAnalyticsTrendPoint[];
  userRankings: AdminAnalyticsRankings<AdminAnalyticsUserRankItem>;
  modelRankings: AdminAnalyticsRankings<AdminAnalyticsModelRankItem>;
  modelDistribution: PieChartData[];
  modalityDistribution: PieChartData[];
  insights: AdminAnalyticsInsight[];
}

const DEFAULT_TIME_RANGE: AdminAnalyticsTimeRange = 'daily';
const DEFAULT_RANKING_SIZE = 10;
const MIN_RANKING_SIZE = 3;
const MAX_RANKING_SIZE = 50;
const TIME_RANGES = new Set<AdminAnalyticsTimeRange>(['hourly', 'daily', 'weekly', 'monthly', 'yearly']);
const INSIGHT_SEVERITIES = new Set<AdminAnalyticsInsightSeverity>(['info', 'warning', 'critical']);

export class AdminAnalyticsService {
  static async fetchOverview(query: AdminAnalyticsQuery = {}): Promise<AdminAnalyticsOverview> {
    const params = normalizeAnalyticsQuery(query);
    const result = await getClawRouterBackendSdkClient().system.analytics.admin.overview.retrieve(params);
    const overview = normalizeOverview(readRequiredRecord(result, 'Admin analytics overview is required'));
    return overview;
  }
}

function normalizeAnalyticsQuery(query: AdminAnalyticsQuery): AdminAnalyticsSdkQuery {
  const params: AdminAnalyticsSdkQuery = {
    timeRange: normalizeTimeRange(query.timeRange, 'timeRange'),
    rankingSize: normalizeRankingSize(query.rankingSize),
  };
  const startTime = optionalText(query.startTime, 'startTime', 64);
  const endTime = optionalText(query.endTime, 'endTime', 64);
  if (startTime) {
    params.startTime = startTime;
  }
  if (endTime) {
    params.endTime = endTime;
  }
  return params;
}

function normalizeOverview(record: ApiRecord): AdminAnalyticsOverview {
  return {
    timeRange: readTimeRange(record, 'timeRange', 'Analytics time range is required'),
    startTime: readNullableString(record, 'startTime'),
    endTime: readNullableString(record, 'endTime'),
    rankingSize: readRankingSize(record),
    summary: normalizeSummary(readRequiredRecord(record.summary, 'Analytics summary is required')),
    trend: readOptionalRecordArray(record, 'trend', 'Analytics trend point is required')
      .map(normalizeTrendPoint),
    userRankings: normalizeRankings(
      readRequiredRecord(record.userRankings, 'Analytics user rankings are required'),
      normalizeUserRankItem,
      'Analytics user ranking row is required',
    ),
    modelRankings: normalizeRankings(
      readRequiredRecord(record.modelRankings, 'Analytics model rankings are required'),
      normalizeModelRankItem,
      'Analytics model ranking row is required',
    ),
    modelDistribution: readOptionalRecordArray(
      record,
      'modelDistribution',
      'Analytics model distribution row is required',
    ).map(normalizePieChartData),
    modalityDistribution: readOptionalRecordArray(
      record,
      'modalityDistribution',
      'Analytics modality distribution row is required',
    ).map(normalizePieChartData),
    insights: readOptionalRecordArray(record, 'insights', 'Analytics insight is required')
      .map(normalizeInsight),
  };
}

function normalizeSummary(record: ApiRecord): AdminAnalyticsSummary {
  return {
    totalUsers: readRequiredNonNegativeNumber(record, 'totalUsers', 'Analytics total users are required'),
    activeUsers: readRequiredNonNegativeNumber(record, 'activeUsers', 'Analytics active users are required'),
    activeModels: readRequiredNonNegativeNumber(record, 'activeModels', 'Analytics active models are required'),
    totalRequests: readRequiredNonNegativeNumber(record, 'totalRequests', 'Analytics total requests are required'),
    successfulRequests: readRequiredNonNegativeNumber(record, 'successfulRequests', 'Analytics successful requests are required'),
    failedRequests: readRequiredNonNegativeNumber(record, 'failedRequests', 'Analytics failed requests are required'),
    totalTokens: readRequiredNonNegativeNumber(record, 'totalTokens', 'Analytics total tokens are required'),
    totalPoints: readRequiredNonNegativeNumber(record, 'totalPoints', 'Analytics total Compute Credits are required'),
    upstreamCost: readRequiredNonNegativeNumber(record, 'upstreamCost', 'Analytics upstream cost is required'),
    averageTokensPerRequest: readRequiredNonNegativeNumber(record, 'averageTokensPerRequest', 'Analytics average tokens are required'),
    averagePointsPerRequest: readRequiredNonNegativeNumber(record, 'averagePointsPerRequest', 'Analytics average Compute Credits are required'),
    errorRate: readRequiredNonNegativeNumber(record, 'errorRate', 'Analytics error rate is required'),
  };
}

function normalizeTrendPoint(value: ApiRecord): AdminAnalyticsTrendPoint {
  return {
    time: readRequiredString(value, 'time', 'Analytics trend time is required'),
    requests: readRequiredNonNegativeNumber(value, 'requests', 'Analytics trend requests are required'),
    tokens: readRequiredNonNegativeNumber(value, 'tokens', 'Analytics trend tokens are required'),
    points: readRequiredNonNegativeNumber(value, 'points', 'Analytics trend Compute Credits are required'),
    users: readRequiredNonNegativeNumber(value, 'users', 'Analytics trend users are required'),
  };
}

function normalizeUserRankItem(value: ApiRecord): AdminAnalyticsUserRankItem {
  return {
    rank: readPositiveInteger(value, 'rank', 'Analytics user rank is required'),
    userId: readRequiredString(value, 'userId', 'Analytics user id is required'),
    userName: readRequiredString(value, 'userName', 'Analytics user name is required'),
    email: readNullableString(value, 'email'),
    requestCount: readRequiredNonNegativeNumber(value, 'requestCount', 'Analytics user request count is required'),
    totalTokens: readRequiredNonNegativeNumber(value, 'totalTokens', 'Analytics user tokens are required'),
    points: readRequiredNonNegativeNumber(value, 'points', 'Analytics user Compute Credits are required'),
    modelDistribution: readRequiredRecordArray(
      value,
      'modelDistribution',
      'Analytics user model distribution is required',
      'Analytics user model distribution row is required',
    ).map(normalizePieChartData),
  };
}

function normalizeModelRankItem(value: ApiRecord): AdminAnalyticsModelRankItem {
  return {
    rank: readPositiveInteger(value, 'rank', 'Analytics model rank is required'),
    model: readRequiredString(value, 'model', 'Analytics model name is required'),
    catalogKey: readRequiredString(value, 'catalogKey', 'Analytics model catalog key is required'),
    vendor: readRequiredString(value, 'vendor', 'Analytics model vendor is required'),
    modality: readRequiredString(value, 'modality', 'Analytics model modality is required'),
    requestCount: readRequiredNonNegativeNumber(value, 'requestCount', 'Analytics model request count is required'),
    totalTokens: readRequiredNonNegativeNumber(value, 'totalTokens', 'Analytics model tokens are required'),
    points: readRequiredNonNegativeNumber(value, 'points', 'Analytics model Compute Credits are required'),
    upstreamCost: readRequiredNonNegativeNumber(value, 'upstreamCost', 'Analytics model upstream cost is required'),
    userCount: readRequiredNonNegativeNumber(value, 'userCount', 'Analytics model user count is required'),
    averageTokensPerRequest: readRequiredNonNegativeNumber(
      value,
      'averageTokensPerRequest',
      'Analytics model average tokens are required',
    ),
    errorRate: readRequiredNonNegativeNumber(value, 'errorRate', 'Analytics model error rate is required'),
  };
}

function normalizePieChartData(value: ApiRecord): PieChartData {
  return {
    name: readRequiredString(value, 'name', 'Analytics chart name is required'),
    value: readRequiredNonNegativeNumber(value, 'value', 'Analytics chart value is required'),
    color: readRequiredString(value, 'color', 'Analytics chart color is required'),
  };
}

function normalizeInsight(value: ApiRecord): AdminAnalyticsInsight {
  const severity = readString(value, 'severity');
  if (!INSIGHT_SEVERITIES.has(severity as AdminAnalyticsInsightSeverity)) {
    throw new Error(severity ? `Unsupported analytics insight severity: ${severity}` : 'Analytics insight severity is required');
  }
  return {
    key: readRequiredString(value, 'key', 'Analytics insight key is required'),
    title: readRequiredString(value, 'title', 'Analytics insight title is required'),
    value: readRequiredString(value, 'value', 'Analytics insight value is required'),
    severity: severity as AdminAnalyticsInsightSeverity,
    detail: readRequiredString(value, 'detail', 'Analytics insight detail is required'),
  };
}

function normalizeRankings<T>(
  record: ApiRecord,
  normalizeItem: (value: ApiRecord) => T,
  itemMessage: string,
): AdminAnalyticsRankings<T> {
  return {
    points: readRequiredRecordArray(record, 'points', 'Analytics Compute Credits ranking is required', itemMessage).map(normalizeItem),
    tokens: readRequiredRecordArray(record, 'tokens', 'Analytics tokens ranking is required', itemMessage).map(normalizeItem),
    requests: readRequiredRecordArray(record, 'requests', 'Analytics requests ranking is required', itemMessage).map(normalizeItem),
  };
}

function normalizeRankingSize(value: unknown): number {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_RANKING_SIZE;
  }
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < MIN_RANKING_SIZE || value > MAX_RANKING_SIZE) {
    throw new Error(`rankingSize must be between ${MIN_RANKING_SIZE} and ${MAX_RANKING_SIZE}`);
  }
  return value;
}

function readRankingSize(record: ApiRecord): number {
  const rankingSize = readRequiredNonNegativeNumber(record, 'rankingSize', 'Analytics ranking size is required');
  if (!Number.isSafeInteger(rankingSize) || rankingSize < MIN_RANKING_SIZE || rankingSize > MAX_RANKING_SIZE) {
    throw new Error(`Analytics ranking size must be between ${MIN_RANKING_SIZE} and ${MAX_RANKING_SIZE}`);
  }
  return rankingSize;
}

function normalizeTimeRange(value: unknown, fieldName: string): AdminAnalyticsTimeRange {
  if (value === undefined || value === null || value === '') {
    return DEFAULT_TIME_RANGE;
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a valid time range`);
  }
  const normalized = value.trim().toLowerCase();
  if (TIME_RANGES.has(normalized as AdminAnalyticsTimeRange)) {
    return normalized as AdminAnalyticsTimeRange;
  }
  throw new Error(`${fieldName} must be a valid time range`);
}

function readTimeRange(record: ApiRecord, key: string, message: string): AdminAnalyticsTimeRange {
  const value = readString(record, key);
  if (!value) {
    throw new Error(message);
  }
  return normalizeTimeRange(value, key);
}

function readPositiveInteger(record: ApiRecord, key: string, message: string): number {
  const value = readNumber(record, key, Number.NaN);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(message);
  }
  return value;
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readOptionalRecordArray(record: ApiRecord, key: string, itemMessage: string): ApiRecord[] {
  const value = record[key];
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`${key} must be an array`);
  }
  return value.map((item) => readRequiredRecord(item, itemMessage));
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

export function createEmptyAnalyticsOverview(timeRange: AdminAnalyticsTimeRange = DEFAULT_TIME_RANGE): AdminAnalyticsOverview {
  return {
    timeRange,
    startTime: null,
    endTime: null,
    rankingSize: DEFAULT_RANKING_SIZE,
    summary: {
      totalUsers: 0,
      activeUsers: 0,
      activeModels: 0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalTokens: 0,
      totalPoints: 0,
      upstreamCost: 0,
      averageTokensPerRequest: 0,
      averagePointsPerRequest: 0,
      errorRate: 0,
    },
    trend: [],
    userRankings: { points: [], tokens: [], requests: [] },
    modelRankings: { points: [], tokens: [], requests: [] },
    modelDistribution: [],
    modalityDistribution: [],
    insights: [],
  };
}
