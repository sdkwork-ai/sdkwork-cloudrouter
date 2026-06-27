import type { AdminChannelItem } from './admin-channel-item';

/** Admin channel test response schema exposed by Claw Router. */
export interface AdminChannelTestResponse {
  /** Channel id field on admin channel test response. */
  channelId: string;
  /** Item field on admin channel test response. */
  item: AdminChannelItem;
  /** Latency field on admin channel test response. */
  latency: string;
  /** Status field on admin channel test response. */
  status: 'active' | 'disabled' | 'error';
  /** Success field on admin channel test response. */
  success: boolean;
}
