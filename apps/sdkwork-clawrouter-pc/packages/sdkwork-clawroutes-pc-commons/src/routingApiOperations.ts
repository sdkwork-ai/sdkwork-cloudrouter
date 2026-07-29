import { getClawRouterAppSdkClient } from './sdk-clients.ts';
import type {
  AppRoutingApiKeyListResponse,
  AppRoutingRequestTraceListResponse,
  AppRoutingUsageSnapshot,
} from '@sdkwork/clawrouter-app-sdk';

const DEFAULT_ROUTING_PAGE_SIZE = 20;

interface RoutingListParams {
  page?: number;
  pageSize?: number;
  q?: string;
}

function routingListParams(params: RoutingListParams = {}) {
  return {
    page: params.page === undefined ? undefined : String(params.page),
    pageSize: params.pageSize === undefined ? String(DEFAULT_ROUTING_PAGE_SIZE) : String(params.pageSize),
    q: params.q,
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
