import type { AppChannelGroup } from './app-channel-group';

/** App channel group list response schema exposed by Claw Router. */
export interface AppChannelGroupListResponse {
  /** Items field on app channel group list response. */
  items: AppChannelGroup[];
}
