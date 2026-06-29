import type { ChannelGroupsCreateResult } from './channel-groups-create-result';

export interface ChannelGroupsCreateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
