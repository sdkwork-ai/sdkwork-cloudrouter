import type { AdminChannelGroupRouteExplainResponse } from './admin-channel-group-route-explain-response';

/** Channel groups route explain retrieve result schema exposed by Claw Router. */
export interface ChannelGroupsRouteExplainRetrieveResult {
  /** Business response code. */
  code: string;
  /** Data field on channel groups route explain retrieve result. */
  data?: AdminChannelGroupRouteExplainResponse;
  /** Human-readable response message. */
  msg?: string;
}
