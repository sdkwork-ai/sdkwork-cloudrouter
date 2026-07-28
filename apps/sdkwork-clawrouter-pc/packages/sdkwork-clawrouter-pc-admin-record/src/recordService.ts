import {
  ensureSdkworkApiSuccess,
  getClawRouterBackendSdkClient,
  isRecord,
  optionalBoundedPositiveInteger,
  optionalPositiveInteger,
  pruneUndefinedQueryParams,
  readApiRecord,
  readRequiredApiItems,
  readDecimalString,
  readRequiredNonNegativeInt64String,
  readRequiredString,
  readRequiredNonNegativeNumber,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';

const MAX_RECORD_LOG_PAGE_SIZE = 200;
const MAX_RECORD_LOG_FILTER_LENGTH = 128;

type RecordLogFilters = Record<string, unknown>;
type LogRecordStatus = 'success' | 'error';
type LogHttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface LogRecord {
  id: string;
  user: string;
  requestId: string;
  time: string;
  tokenName: string;
  group: string;
  type: string;
  model: string;
  providerNativeModel: string;
  requestedModelCatalogKey: string;
  regionCode: string;
  status: LogRecordStatus;
  httpStatus: number;
  httpMethod: LogHttpMethod;
  errorCode: string;
  errorType: string;
  errorMessage: string;
  totalTime: string;
  ttft: string;
  isStream: boolean;
  inputTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
  cost: string;
  multiplier: string;
  baseInputPrice: string;
  baseOutputPrice: string;
  cacheReadPrice: string;
  path: string;
  reasoningEffort: string;
  ip: string;
  userAgent: string;
}

export class RecordService {
  static async fetchLogs(filters: RecordLogFilters = {}): Promise<{ logs: LogRecord[]; total: number }> {
    const result = await getClawRouterBackendSdkClient().system.records.list(toRecordLogQueryParams(filters));
    ensureSdkworkApiSuccess(result, 'Failed to fetch backend logs');
    const data = readApiRecord(result);
    const logs = readRequiredApiItems(result, 'Failed to fetch backend logs', ['logs', 'items', 'records', 'list'])
      .map(normalizeLogRecord);
    return {
      logs,
      total: readRequiredPageTotal(data),
    };
  }
}

function readRequiredPageTotal(data: ApiRecord): number {
  const pageInfo = readRequiredRecord(data.pageInfo, 'Backend log pageInfo is required');
  const totalItems = readRequiredNonNegativeInt64String(
    pageInfo,
    'totalItems',
    'Backend log pageInfo.totalItems is required',
  );
  const normalized = Number(totalItems);
  if (!Number.isSafeInteger(normalized) || normalized < 0) {
    throw new Error('Backend log pageInfo.totalItems exceeds the supported range');
  }
  return normalized;
}

function toRecordLogQueryParams(filters: RecordLogFilters = {}): Record<string, string | number> {
  const page = optionalPositiveInteger(filters.page, 'page');
  const pageSize = optionalBoundedPositiveInteger(filters.pageSize, 'pageSize', MAX_RECORD_LOG_PAGE_SIZE);

  return pruneUndefinedQueryParams({
    page,
    pageSize,
    user: optionalVisibleAsciiText(filters.user, 'user'),
    token: optionalVisibleAsciiText(filters.token, 'token'),
    model: optionalVisibleAsciiText(filters.model, 'model'),
  });
}

function optionalVisibleAsciiText(value: unknown, fieldName: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }
  if (
    normalized.length > MAX_RECORD_LOG_FILTER_LENGTH ||
    !Array.from(normalized).every((character) => {
      const code = character.charCodeAt(0);
      return code >= 0x20 && code <= 0x7e;
    })
  ) {
    throw new Error(`${fieldName} must be visible ASCII and at most ${MAX_RECORD_LOG_FILTER_LENGTH} characters`);
  }
  return normalized;
}

function normalizeLogRecord(value: unknown): LogRecord {
  const item = readRequiredRecord(value, 'Log record is required');
  const model = readRequiredString(item, 'model', 'Log model is required');
  const httpStatus = readOptionalNonNegativeNumber(item, 'httpStatus');
  const errorCode = readOptionalString(item, 'errorCode');
  const errorType = readOptionalString(item, 'errorType');
  const errorMessage = readOptionalString(item, 'errorMessage');
  return {
    id: readRequiredString(item, 'id', 'Log record id is required'),
    user: readRequiredString(item, 'user', 'Log user is required'),
    requestId: readRequiredString(item, 'requestId', 'Log request id is required'),
    time: readRequiredString(item, 'time', 'Log time is required'),
    tokenName: readRequiredString(item, 'tokenName', 'Log token name is required'),
    group: readRequiredString(item, 'group', 'Log group is required'),
    type: readRequiredString(item, 'type', 'Log type is required'),
    model,
    providerNativeModel: readOptionalString(item, 'providerNativeModel') || model,
    requestedModelCatalogKey: readOptionalString(item, 'requestedModelCatalogKey'),
    regionCode: readOptionalString(item, 'regionCode'),
    status: readOptionalLogRecordStatus(item, 'status')
      ?? ((httpStatus >= 400 || errorCode || errorType || errorMessage) ? 'error' : 'success'),
    httpStatus,
    httpMethod: readHttpMethod(item, 'httpMethod'),
    errorCode,
    errorType,
    errorMessage,
    totalTime: readRequiredString(item, 'totalTime', 'Log total time is required'),
    ttft: readRequiredString(item, 'ttft', 'Log TTFT is required'),
    isStream: readRequiredBoolean(item, 'isStream', 'Log stream flag is required'),
    inputTokens: readRequiredNonNegativeNumber(item, 'inputTokens', 'Log input tokens are required'),
    cacheReadTokens: readRequiredNonNegativeNumber(item, 'cacheReadTokens', 'Log cache read tokens are required'),
    outputTokens: readRequiredNonNegativeNumber(item, 'outputTokens', 'Log output tokens are required'),
    cost: readRequiredDecimalString(item, 'cost', 'Log cost is required', 'Log cost must be a decimal string'),
    multiplier: readRequiredDecimalString(
      item,
      'multiplier',
      'Log multiplier is required',
      'Log multiplier must be a decimal string',
    ),
    baseInputPrice: readRequiredDecimalString(
      item,
      'baseInputPrice',
      'Log base input price is required',
      'Log base input price must be a decimal string',
    ),
    baseOutputPrice: readRequiredDecimalString(
      item,
      'baseOutputPrice',
      'Log base output price is required',
      'Log base output price must be a decimal string',
    ),
    cacheReadPrice: readRequiredDecimalString(
      item,
      'cacheReadPrice',
      'Log cache read price is required',
      'Log cache read price must be a decimal string',
    ),
    path: readRequiredString(item, 'path', 'Log path is required'),
    reasoningEffort: readRequiredString(item, 'reasoningEffort', 'Log reasoning effort is required'),
    ip: readRequiredString(item, 'ip', 'Log ip is required'),
    userAgent: readOptionalString(item, 'userAgent'),
  };
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
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
  throw new Error(`Log ${key} must be a non-negative number`);
}

function readOptionalLogRecordStatus(record: ApiRecord, key: string): LogRecordStatus | undefined {
  const value = readOptionalString(record, key).toLowerCase();
  if (!value) {
    return undefined;
  }
  if (value === 'success' || value === 'error') {
    return value;
  }
  throw new Error('Log status must be success or error');
}

function readHttpMethod(record: ApiRecord, key: string): LogHttpMethod {
  const value = readRequiredString(record, key, 'Log HTTP method is required').toUpperCase();
  if (
    value === 'GET'
    || value === 'POST'
    || value === 'PUT'
    || value === 'PATCH'
    || value === 'DELETE'
    || value === 'OPTIONS'
    || value === 'HEAD'
  ) {
    return value;
  }
  throw new Error('Log HTTP method is required');
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
