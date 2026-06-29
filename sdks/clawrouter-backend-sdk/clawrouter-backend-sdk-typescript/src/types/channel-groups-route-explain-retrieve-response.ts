import type { ChannelGroupsRouteExplainRetrieveResult } from './channel-groups-route-explain-retrieve-result';

export interface ChannelGroupsRouteExplainRetrieveResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
