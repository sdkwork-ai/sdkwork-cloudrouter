import {
  isRecord,
  readRequiredString,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  getClawRouterAppSdkClient,
  type GatewayTrace as SdkGatewayTrace,
} from '@sdkwork/clawrouter-pc-console-core/sdk';

export interface GatewayTrace {
  id: SdkGatewayTrace['id'];
  time: SdkGatewayTrace['time'];
  ip: SdkGatewayTrace['ip'];
  endpoint: SdkGatewayTrace['endpoint'];
  method: SdkGatewayTrace['method'];
  status: number;
  duration: SdkGatewayTrace['duration'];
  channel: SdkGatewayTrace['channel'];
}

export interface GatewayTracePageInfo {
  mode: 'cursor';
  pageSize: number;
  hasMore: boolean;
  nextCursor: string | null;
}

export interface GatewayTracePage {
  items: GatewayTrace[];
  pageInfo: GatewayTracePageInfo;
}

export interface GatewayTraceListOptions {
  cursor?: string;
  pageSize?: number;
  q?: string;
}

export class GatewayService {
  static async fetchTraces(options: GatewayTraceListOptions = {}): Promise<GatewayTracePage> {
    const result = await getClawRouterAppSdkClient().ai.gateway.traces.list(options);
    return readGatewayTracePage(result, options.cursor);
  }
}

function readGatewayTracePage(value: unknown, requestedCursor: string | undefined): GatewayTracePage {
  const page = readRequiredRecord(value, 'Gateway traces page is required');
  if (!Array.isArray(page.items)) {
    throw new Error('Gateway trace items are required');
  }
  const pageInfo = readRequiredRecord(page.pageInfo, 'Gateway traces page info is required');
  if (pageInfo.mode !== 'cursor') {
    throw new Error('Gateway traces must use cursor pagination');
  }
  const pageSize = readRequiredInteger(pageInfo, 'pageSize', 'Gateway traces page size is required');
  if (pageSize < 1 || pageSize > 200) {
    throw new Error('Gateway traces page size must be between 1 and 200');
  }
  const hasMore = readRequiredBoolean(pageInfo, 'hasMore', 'Gateway traces hasMore is required');
  const nextCursor = readNullableCursor(pageInfo.nextCursor);
  if (hasMore && nextCursor === null) {
    throw new Error('Gateway traces next cursor is required when more rows are available');
  }
  if (!hasMore && nextCursor !== null) {
    throw new Error('Gateway traces next cursor must be empty on the final page');
  }
  if (hasMore && requestedCursor !== undefined && nextCursor === requestedCursor) {
    throw new Error('Gateway traces next cursor must advance');
  }
  const items = page.items.map(readGatewayTrace);
  assertUniqueTraceIds(items);
  return {
    items,
    pageInfo: {
      mode: 'cursor',
      pageSize,
      hasMore,
      nextCursor,
    },
  };
}

function readGatewayTrace(value: unknown): GatewayTrace {
  const item = readRequiredRecord(value, 'Gateway trace record is required');
  return {
    id: readRequiredString(item, 'id', 'Gateway trace id is required'),
    time: readRequiredString(item, 'time', 'Gateway trace time is required'),
    ip: readRequiredString(item, 'ip', 'Gateway trace IP is required'),
    endpoint: readRequiredString(item, 'endpoint', 'Gateway trace endpoint is required'),
    method: readHttpMethod(item.method),
    status: readHttpStatus(item.status),
    duration: readRequiredString(item, 'duration', 'Gateway trace duration is required'),
    channel: readRequiredString(item, 'channel', 'Gateway trace channel is required'),
  };
}

function readRequiredRecord(value: unknown, message: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function readRequiredInteger(
  record: Record<string, unknown>,
  key: string,
  message: string,
): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new Error(message);
  }
  return value;
}

function readRequiredBoolean(
  record: Record<string, unknown>,
  key: string,
  message: string,
): boolean {
  const value = record[key];
  if (typeof value !== 'boolean') {
    throw new Error(message);
  }
  return value;
}

function readNullableCursor(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (
    typeof value !== 'string'
    || value.length === 0
    || value.length > 2048
    || value.trim() !== value
  ) {
    throw new Error('Gateway traces next cursor must be a non-empty opaque string');
  }
  return value;
}

function readHttpStatus(value: unknown): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 100 || value > 599) {
    throw new Error('Gateway trace status is required');
  }
  return value;
}

function assertUniqueTraceIds(items: GatewayTrace[]): void {
  const ids = new Set<string>();
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error('Gateway trace page contains duplicate ids');
    }
    ids.add(item.id);
  }
}

function readHttpMethod(value: unknown): GatewayTrace['method'] {
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
  throw new Error('Gateway trace method is required');
}
