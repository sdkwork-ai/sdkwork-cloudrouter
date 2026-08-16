import { getCloudRouterAppSdkClient } from './sdk-clients.ts';
import type {
  AiRoutingRequestTracesListParams,
  AppRoutingApiKeyListResponse,
  AppRoutingRequestTraceListResponse,
  AppRoutingUsageSnapshot,
} from '@sdkwork/cloudrouter-app-sdk';
import { normalizeOffsetListQuery } from '@sdkwork/utils/pagination';

const MAX_ROUTING_TRACES_CURSOR_LENGTH = 1024;

interface RoutingListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

function routingListParams(params: RoutingListParams = {}) {
  const pagination = normalizeOffsetListQuery({
    ...(params.page === undefined ? {} : { page: params.page }),
    ...(params.pageSize === undefined ? {} : { page_size: params.pageSize }),
  });
  const q = params.q?.trim();

  return {
    page: pagination.page,
    pageSize: pagination.page_size,
    ...(q ? { q } : {}),
  };
}

export async function fetchRoutingApiKeys(params: RoutingListParams = {}): Promise<AppRoutingApiKeyListResponse> {
  return getCloudRouterAppSdkClient().ai.routing.apiKeys.list(routingListParams(params));
}

export async function fetchRoutingRequestTraces(
  options: AiRoutingRequestTracesListParams = {},
): Promise<AppRoutingRequestTraceListResponse> {
  const page = await getCloudRouterAppSdkClient().ai.routing.requestTraces.list(options);
  validateRoutingTracePage(page, options.cursor);
  return page;
}

export async function fetchRoutingUsage(): Promise<AppRoutingUsageSnapshot> {
  return getCloudRouterAppSdkClient().ai.routing.usage.retrieve();
}

function validateRoutingTracePage(
  page: AppRoutingRequestTraceListResponse,
  requestedCursor: string | undefined,
): void {
  const pageInfo = page.pageInfo;
  if (pageInfo.mode !== 'cursor') {
    throw new Error('Routing request traces must use cursor pagination');
  }
  const pageSize = pageInfo.pageSize;
  if (pageSize === undefined || !Number.isInteger(pageSize)) {
    throw new Error('Routing request traces page size is required');
  }
  if (pageSize < 1 || pageSize > 200) {
    throw new Error('Routing request traces page size must be between 1 and 200');
  }
  if (typeof pageInfo.hasMore !== 'boolean') {
    throw new Error('Routing request traces hasMore is required');
  }
  const nextCursor = pageInfo.nextCursor ?? null;
  if (
    nextCursor !== null
    && (
      typeof nextCursor !== 'string'
      || nextCursor.length === 0
      || nextCursor.length > MAX_ROUTING_TRACES_CURSOR_LENGTH
      || nextCursor.trim() !== nextCursor
    )
  ) {
    throw new Error('Routing request traces next cursor must be a non-empty opaque string');
  }
  if (pageInfo.hasMore && nextCursor === null) {
    throw new Error('Routing request traces next cursor is required when more rows are available');
  }
  if (!pageInfo.hasMore && nextCursor !== null) {
    throw new Error('Routing request traces next cursor must be empty on the final page');
  }
  if (pageInfo.hasMore && requestedCursor !== undefined && nextCursor === requestedCursor) {
    throw new Error('Routing request traces next cursor must advance');
  }
}
