import {
  isRecord,
  readDecimalString,
  readRequiredNonNegativeNumber,
  readRequiredString,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  getClawRouterAppSdkClient,
  type AiUsageLogsListParams,
  type UsageLogItem as SdkUsageLogItem,
  type UsageLogsResponse as SdkUsageLogsResponse,
} from '@sdkwork/clawrouter-pc-console-core/sdk';

const SPEND_DECIMAL_DIGITS = 9;
const DEFAULT_DECIMAL_DIGITS = 6;

type UsageLogResultStatus = 'success' | 'error';

export type UsageLog = SdkUsageLogItem;
export type UsageLogListParams = AiUsageLogsListParams;

export interface UsageLogPage {
  items: UsageLog[];
  pageInfo: {
    mode: 'offset';
    page: number;
    pageSize: number;
    totalItems: string;
    totalPages: number;
    hasMore: boolean;
  };
}

export class UsageService {
  static async fetchLogs(params: AiUsageLogsListParams = {}): Promise<UsageLogPage> {
    const page = await getClawRouterAppSdkClient().ai.usage.logs.list(params);
    return normalizeUsageLogPage(page);
  }
}

function normalizeUsageLogPage(value: SdkUsageLogsResponse): UsageLogPage {
  const page = readRequiredRecord(value, 'Usage logs page is required');
  if (!Array.isArray(page.items)) {
    throw new Error('Usage log items are required');
  }
  const pageInfo = readRequiredRecord(page.pageInfo, 'Usage logs page info is required');
  if (pageInfo.mode !== 'offset') {
    throw new Error('Usage logs must use offset pagination');
  }
  if (pageInfo.nextCursor !== undefined && pageInfo.nextCursor !== null) {
    throw new Error('Usage logs offset pagination must not return nextCursor');
  }

  const pageNumber = readRequiredNonNegativeSafeInteger(pageInfo, 'page', 'Usage log page is required');
  const pageSize = readRequiredNonNegativeSafeInteger(pageInfo, 'pageSize', 'Usage log page size is required');
  const totalPages = readRequiredNonNegativeSafeInteger(pageInfo, 'totalPages', 'Usage log total pages are required');
  if (pageNumber < 1) {
    throw new Error('Usage log page must be greater than or equal to 1');
  }
  if (pageSize < 1 || pageSize > 200) {
    throw new Error('Usage log page size must be between 1 and 200');
  }

  return {
    items: page.items.map(normalizeUsageLog),
    pageInfo: {
      mode: 'offset',
      page: pageNumber,
      pageSize,
      totalItems: readRequiredUnsignedInt64String(pageInfo, 'totalItems', 'Usage log total items are required'),
      totalPages,
      hasMore: readRequiredBoolean(pageInfo, 'hasMore', 'Usage log hasMore flag is required'),
    },
  };
}

function normalizeUsageLog(value: unknown): UsageLog {
  const item = readRequiredRecord(value, 'Usage log record is required');
  const httpStatus = readRequiredNonNegativeSafeInteger(item, 'httpStatus', 'Usage log HTTP status is required');
  if (httpStatus > 599) {
    throw new Error('Usage log HTTP status must be between 0 and 599');
  }
  const errorCode = readOptionalString(item, 'errorCode');
  const errorType = readOptionalString(item, 'errorType');
  const errorMessage = readOptionalString(item, 'errorMessage');
  const status = readRequiredUsageLogResultStatus(item, 'status');
  const model = readRequiredString(item, 'model', 'Usage log model is required');
  const providerNativeModel = readOptionalString(item, 'providerNativeModel') || model;
  const inputTokens = readRequiredUnsignedInt64String(item, 'inputTokens', 'Usage log input tokens are required');
  const cacheReadTokens = readRequiredUnsignedInt64String(item, 'cacheReadTokens', 'Usage log cache read tokens are required');
  const outputTokens = readRequiredUnsignedInt64String(item, 'outputTokens', 'Usage log output tokens are required');
  if (BigInt(cacheReadTokens) > BigInt(inputTokens)) {
    throw new Error('Usage log cache read tokens must not exceed input tokens');
  }
  return {
    id: readRequiredString(item, 'id', 'Usage log id is required'),
    gatewayRequestId: readRequiredString(
      item,
      'gatewayRequestId',
      'Usage log gateway request id is required',
    ),
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
    inputTokens,
    cacheReadTokens,
    outputTokens,
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

function readRequiredUsageLogResultStatus(record: ApiRecord, key: string): UsageLogResultStatus {
  const value = readOptionalString(record, key).toLowerCase();
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

function readRequiredNonNegativeSafeInteger(record: ApiRecord, key: string, message: string): number {
  const value = readRequiredNonNegativeNumber(record, key, message);
  if (!Number.isSafeInteger(value)) {
    throw new Error(message);
  }
  return value;
}

function readRequiredUnsignedInt64String(record: ApiRecord, key: string, message: string): string {
  const value = record[key];
  if (typeof value !== 'string' || !/^[0-9]+$/.test(value)) {
    throw new Error(message);
  }
  return value;
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
