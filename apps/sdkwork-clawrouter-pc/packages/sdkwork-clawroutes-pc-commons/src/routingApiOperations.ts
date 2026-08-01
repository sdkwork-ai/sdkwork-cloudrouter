import { getClawRouterAppSdkClient } from './sdk-clients.ts';
import type {
  AppRoutingApiKeyListResponse,
  AppRoutingRequestTraceListResponse,
  AppRoutingUsageSnapshot,
} from '@sdkwork/clawrouter-app-sdk';
import { normalizeOffsetListQuery } from '@sdkwork/utils/pagination';

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
  return getClawRouterAppSdkClient().ai.routing.apiKeys.list(routingListParams(params));
}

export async function fetchRoutingRequestTraces(params: RoutingListParams = {}): Promise<AppRoutingRequestTraceListResponse> {
  return getClawRouterAppSdkClient().ai.routing.requestTraces.list(routingListParams(params));
}

export async function fetchRoutingUsage(): Promise<AppRoutingUsageSnapshot> {
  return getClawRouterAppSdkClient().ai.routing.usage.retrieve();
}
