import {
  ensureSdkworkApiSuccess,
  getClawRouterAppSdkClient,
  isRecord,
  optionalBoundedPositiveInteger,
  optionalPositiveInteger,
  optionalText,
  pruneUndefinedQueryParams,
  readApiRecord,
  readDecimalString,
  readRequiredApiItems,
  readRequiredNonNegativeNumber,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import type { UsageLogsResponse as SdkUsageLogsResponse } from '@sdkwork/clawrouter-app-sdk';

const MAX_USAGE_LOG_PAGE_SIZE = 100;
const MAX_USAGE_LOG_QUERY_TEXT_LENGTH = 128;
const MAX_USAGE_LOG_TIMESTAMP_LENGTH = 64;
const SPEND_DECIMAL_DIGITS = 9;
const DEFAULT_DECIMAL_DIGITS = 6;

type UsageLogStatus = 'all' | 'success' | 'error';
type UsageLogResultStatus = 'success' | 'error';

export interface UsageLog {
  id: SdkUsageLogsResponse['logs'][number]['id'];
  requestId: SdkUsageLogsResponse['logs'][number]['requestId'];
  time: SdkUsageLogsResponse['logs'][number]['time'];
  tokenName: SdkUsageLogsResponse['logs'][number]['tokenName'];
  group: SdkUsageLogsResponse['logs'][number]['group'];
  type: SdkUsageLogsResponse['logs'][number]['type'];
  model: SdkUsageLogsResponse['logs'][number]['model'];
  providerNativeModel: SdkUsageLogsResponse['logs'][number]['providerNativeModel'];
  requestedModelCatalogKey: SdkUsageLogsResponse['logs'][number]['requestedModelCatalogKey'];
  regionCode: SdkUsageLogsResponse['logs'][number]['regionCode'];
  status: UsageLogResultStatus;
  httpStatus: number;
  errorCode: string;
  errorType: string;
  errorMessage: string;
  totalTime: SdkUsageLogsResponse['logs'][number]['totalTime'];
  ttft: SdkUsageLogsResponse['logs'][number]['ttft'];
  isStream: SdkUsageLogsResponse['logs'][number]['isStream'];
  inputTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  cost: string & SdkUsageLogsResponse['logs'][number]['cost'];
  multiplier: string & SdkUsageLogsResponse['logs'][number]['multiplier'];
  baseInputPrice: string & SdkUsageLogsResponse['logs'][number]['baseInputPrice'];
  baseOutputPrice: string & SdkUsageLogsResponse['logs'][number]['baseOutputPrice'];
  cacheReadPrice: string & SdkUsageLogsResponse['logs'][number]['cacheReadPrice'];
  path: SdkUsageLogsResponse['logs'][number]['path'];
  reasoningEffort: SdkUsageLogsResponse['logs'][number]['reasoningEffort'];
  ip: SdkUsageLogsResponse['logs'][number]['ip'];
  userAgent: SdkUsageLogsResponse['logs'][number]['userAgent'];
}

type UsageLogPage = {
  logs: UsageLog[];
  total: number;
};

export class UsageService {
  static async fetchLogs(params?: Record<string, unknown>): Promise<UsageLogPage> {
    const query = toUsageLogQueryParams(params);
    const result = await getClawRouterAppSdkClient().ai.usage.logs.list(query);
    ensureSdkworkApiSuccess(result, 'console.usage.errors.fetchFallback');

    const data = readApiRecord(result);
    const logs = readRequiredApiItems(data, 'console.usage.errors.fetchFallback', ['logs', 'items', 'records', 'list'])
      .map(normalizeUsageLog);

    return {
      logs,
      total: readUsageLogPageTotal(data),
    };
  }
}

function readUsageLogPageTotal(data: ApiRecord): number {
  if (data.total !== undefined && data.total !== null && data.total !== '') {
    return readRequiredNonNegativeNumber(data, 'total', 'Usage log total is required');
  }

  const pageInfo = data.pageInfo;
  if (isRecord(pageInfo)) {
    for (const key of ['totalItems', 'total_items'] as const) {
      const value = pageInfo[key];
      if (value === undefined || value === null || value === '') {
        continue;
      }
      const parsed = typeof value === 'number' ? value : Number(String(value).trim());
      if (Number.isFinite(parsed) && parsed >= 0) {
        return parsed;
      }
      throw new Error('Usage log total must be a non-negative number');
    }
  }

  throw new Error('Usage log total is required');
}

function toUsageLogQueryParams(params: Record<string, unknown> = {}): {
  page?: string;
  pageSize?: string;
  q?: string;
  status?: string;
  startTime?: string;
  endTime?: string;
} {
  const page = optionalPositiveInteger(params.page, 'page');
  const pageSize = optionalBoundedPositiveInteger(params.pageSize, 'pageSize', MAX_USAGE_LOG_PAGE_SIZE);

  const searchQuery = optionalText(params.searchQuery, 'searchQuery', MAX_USAGE_LOG_QUERY_TEXT_LENGTH);
  const status = optionalUsageLogStatus(params.status);
  const startTime = optionalText(params.startTime, 'startTime', MAX_USAGE_LOG_TIMESTAMP_LENGTH);
  const endTime = optionalText(params.endTime, 'endTime', MAX_USAGE_LOG_TIMESTAMP_LENGTH);

  return pruneUndefinedQueryParams({
    page,
    pageSize,
    q: searchQuery,
    status: status === 'all' ? undefined : status,
    startTime,
    endTime,
  });
}

function optionalUsageLogStatus(value: unknown): UsageLogStatus | undefined {
  const normalized = optionalText(value, 'status', MAX_USAGE_LOG_QUERY_TEXT_LENGTH);
  if (normalized === undefined) {
    return undefined;
  }
  const status = normalized.toLowerCase();
  if (status === 'all' || status === 'success' || status === 'error') {
    return status;
  }
  throw new Error('status must be one of all, success, error');
}

function normalizeUsageLog(value: unknown): UsageLog {
  const item = readRequiredRecord(value, 'Usage log record is required');
  const httpStatus = readOptionalNonNegativeNumber(item, 'httpStatus');
  const errorCode = readOptionalString(item, 'errorCode');
  const errorType = readOptionalString(item, 'errorType');
  const errorMessage = readOptionalString(item, 'errorMessage');
  const status = readOptionalUsageLogResultStatus(item, 'status')
    ?? ((httpStatus >= 400 || errorCode || errorType || errorMessage) ? 'error' : 'success');
  const model = readRequiredString(item, 'model', 'Usage log model is required');
  const providerNativeModel = readOptionalString(item, 'providerNativeModel') || model;
  return {
    id: readRequiredString(item, 'id', 'Usage log id is required'),
    requestId: readRequiredString(item, 'requestId', 'Usage log request id is required'),
    time: readRequiredString(item, 'time', 'Usage log time is required'),
    tokenName: readRequiredString(item, 'tokenName', 'Usage log token name is required'),
    group: readRequiredString(item, 'group', 'Usage log group is required'),
    type: readRequiredString(item, 'type', 'Usage log type is required'),
    model,
    providerNativeModel,
    requestedModelCatalogKey: readOptionalString(item, 'requestedModelCatalogKey'),
    regionCode: readOptionalString(item, 'regionCode'),
    status,
    httpStatus,
    errorCode,
    errorType,
    errorMessage,
    totalTime: readRequiredString(item, 'totalTime', 'Usage log total time is required'),
    ttft: readRequiredString(item, 'ttft', 'Usage log TTFT is required'),
    isStream: readRequiredBoolean(item, 'isStream', 'Usage log stream flag is required'),
    inputTokens: readRequiredNonNegativeNumber(item, 'inputTokens', 'Usage log input tokens are required'),
    cacheReadTokens: readRequiredNonNegativeNumber(item, 'cacheReadTokens', 'Usage log cache read tokens are required'),
    outputTokens: readRequiredNonNegativeNumber(item, 'outputTokens', 'Usage log output tokens are required'),
    cost: readRequiredDecimalString(
      item,
      'cost',
      'Usage log cost is required',
      'Usage log cost must be a decimal string',
      SPEND_DECIMAL_DIGITS,
    ),
    multiplier: readRequiredDecimalString(
      item,
      'multiplier',
      'Usage log multiplier is required',
      'Usage log multiplier must be a decimal string',
    ),
    baseInputPrice: readRequiredDecimalString(
      item,
      'baseInputPrice',
      'Usage log base input price is required',
      'Usage log base input price must be a decimal string',
    ),
    baseOutputPrice: readRequiredDecimalString(
      item,
      'baseOutputPrice',
      'Usage log base output price is required',
      'Usage log base output price must be a decimal string',
    ),
    cacheReadPrice: readRequiredDecimalString(
      item,
      'cacheReadPrice',
      'Usage log cache read price is required',
      'Usage log cache read price must be a decimal string',
    ),
    path: readRequiredString(item, 'path', 'Usage log path is required'),
    reasoningEffort: readRequiredString(item, 'reasoningEffort', 'Usage log reasoning effort is required'),
    ip: readRequiredString(item, 'ip', 'Usage log ip is required'),
    userAgent: readOptionalString(item, 'userAgent'),
  };
}

function readOptionalString(record: ApiRecord, key: string): string {
  const value = record[key];
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function readOptionalNonNegativeNumber(record: ApiRecord, key: string): number {
  const value = record[key];
  if (value === undefined || value === null || value === '') {
    return 0;
  }
  const parsed = typeof value === 'number' ? value : Number(String(value).trim());
  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }
  throw new Error(`Usage log ${key} must be a non-negative number`);
}

function readOptionalUsageLogResultStatus(record: ApiRecord, key: string): UsageLogResultStatus | undefined {
  const value = readOptionalString(record, key).toLowerCase();
  if (!value) {
    return undefined;
  }
  if (value === 'success' || value === 'error') {
    return value;
  }
  throw new Error('Usage log status must be success or error');
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

function readRequiredDecimalString(
  record: ApiRecord,
  key: string,
  missingMessage: string,
  invalidMessage: string,
  digits = DEFAULT_DECIMAL_DIGITS,
): string {
  const value = record[key];
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(missingMessage);
  }
  const normalized = String(value).trim();
  if (!normalized) {
    throw new Error(missingMessage);
  }
  if (!new RegExp(`^-?\\d+(?:\\.\\d{1,${digits}})?$`).test(normalized)) {
    throw new Error(invalidMessage);
  }
  return readDecimalString(record, key, digits);
}
