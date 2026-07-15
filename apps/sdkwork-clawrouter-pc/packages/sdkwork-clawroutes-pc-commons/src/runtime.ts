import { appApiPath } from '@sdkwork/clawrouter-app-sdk';
import type { ClawRouterAppSdkClient } from './sdk-clients.ts';
import type { RuntimeStreamEvent } from './runtime-stream-event.ts';

export * from './user-agent.ts';
export { readRuntimeTextDelta } from './runtime-stream-event.ts';
export type { RuntimeStreamEvent } from './runtime-stream-event.ts';
export {
  emptyRuntimeUsageSnapshot,
  mergeRuntimeUsageSnapshots,
  readPreferredRuntimeUsageCount,
  readRuntimeUsageSnapshot,
} from './runtime-usage.ts';
export type { RuntimeUsageSnapshot } from './runtime-usage.ts';

export async function* streamRuntimeInvocationEvents(
  client: ClawRouterAppSdkClient,
  invocationId: string,
  afterEventNo = 0,
): AsyncIterable<RuntimeStreamEvent> {
  const eventCursor = Number.isFinite(afterEventNo) && afterEventNo > 0
    ? `?after_event_no=${Math.trunc(afterEventNo)}`
    : '';
  const streamPath = appApiPath(
    `/runtime/invocations/${encodeURIComponent(invocationId)}/events/stream${eventCursor}`,
  );
  yield* client.http.streamJson<RuntimeStreamEvent>(streamPath);
}

export * from './auth-projection.ts';
export * from './api-result.ts';
export * from './api-request-url.ts';
export * from './admin-category-types.ts';
export * from './admin-resource-options.ts';
export * from './app-session-token.ts';
export * from './decimal.ts';
export * from './iam-runtime.ts';
export * from './json-value.ts';
export * from './load-error.ts';
export * from './media-resource.ts';
export * from './notificationService.ts';
export * from './portal-auth.ts';
export * from './portal-session.ts';
export * from './portal-permission-scope.ts';
export * from './recharge-math.ts';
export * from './idempotency.ts';
export * from './sdk-request-boundary.ts';
export * from './sdk-clients.ts';
export * from './sessionService.ts';
export * from './siteBranding.ts';
export * from './utils/index.ts';
export * from './utils/env.ts';
