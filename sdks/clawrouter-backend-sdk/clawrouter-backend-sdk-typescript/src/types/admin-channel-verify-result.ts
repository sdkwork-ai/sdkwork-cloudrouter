/** AdminChannelVerifyResult contract. */
export interface AdminChannelVerifyResult {
  /** channelId field on AdminChannelVerifyResult. */
  channelId: string;
  /** item field on AdminChannelVerifyResult. */
  item: Record<string, unknown>;
  /** latency field on AdminChannelVerifyResult. */
  latency: string;
  /** status field on AdminChannelVerifyResult. */
  status: 'active' | 'error' | 'disabled';
  /** success field on AdminChannelVerifyResult. */
  success: boolean;
}
