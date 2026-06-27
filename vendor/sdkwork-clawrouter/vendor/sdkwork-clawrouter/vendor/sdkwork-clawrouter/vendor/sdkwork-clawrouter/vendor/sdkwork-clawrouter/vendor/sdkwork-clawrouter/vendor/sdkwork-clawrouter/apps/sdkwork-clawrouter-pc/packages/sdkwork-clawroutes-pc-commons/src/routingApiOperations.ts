import { getClawRouterAppSdkClient } from './sdk-clients.ts';
import type {
  RoutingApiKeysListResult,
  RoutingChannelsListResult,
  RoutingRequestTracesListResult,
  RoutingUsageListResult,
} from '@sdkwork/clawrouter-app-sdk';

export async function fetchRoutingChannels(): Promise<RoutingChannelsListResult> {
  return getClawRouterAppSdkClient().ai.routing.channels.list();
}

export async function fetchRoutingApiKeys(): Promise<RoutingApiKeysListResult> {
  return getClawRouterAppSdkClient().ai.routing.apiKeys.list();
}

export async function fetchRoutingRequestTraces(): Promise<RoutingRequestTracesListResult> {
  return getClawRouterAppSdkClient().ai.routing.requestTraces.list();
}

export async function fetchRoutingUsage(): Promise<RoutingUsageListResult> {
  return getClawRouterAppSdkClient().ai.routing.usage.list();
}
