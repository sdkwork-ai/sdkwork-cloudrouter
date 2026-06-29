import type { ChannelGroupsChannelBindingsUpdateResult } from './channel-groups-channel-bindings-update-result';

export interface ChannelGroupsBindingsUpdateResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
