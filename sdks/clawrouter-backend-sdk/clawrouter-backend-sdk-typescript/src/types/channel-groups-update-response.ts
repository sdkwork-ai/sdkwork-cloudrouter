import type { ChannelGroupsUpdateResult } from './channel-groups-update-result';

export interface ChannelGroupsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
