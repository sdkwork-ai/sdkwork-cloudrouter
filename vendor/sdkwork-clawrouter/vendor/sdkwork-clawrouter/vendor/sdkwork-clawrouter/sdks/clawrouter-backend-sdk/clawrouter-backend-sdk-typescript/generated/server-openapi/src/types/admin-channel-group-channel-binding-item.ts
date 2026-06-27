/** Admin channel group channel binding item schema exposed by Claw Router. */
export interface AdminChannelGroupChannelBindingItem {
  /** Api scope field on admin channel group channel binding item. */
  apiScope: string[];
  /** Capabilities field on admin channel group channel binding item. */
  capabilities: string[];
  /** Channel code field on admin channel group channel binding item. */
  channelCode: string;
  /** Channel group id field on admin channel group channel binding item. */
  channelGroupId: string;
  /** Channel id field on admin channel group channel binding item. */
  channelId: string;
  /** Channel name field on admin channel group channel binding item. */
  channelName: string;
  /** Health status field on admin channel group channel binding item. */
  healthStatus: 'active' | 'error';
  /** Id field on admin channel group channel binding item. */
  id: string;
  /** Priority field on admin channel group channel binding item. */
  priority: number;
  /** Provider code field on admin channel group channel binding item. */
  providerCode: string;
  /** Provider name field on admin channel group channel binding item. */
  providerName: string;
  /** Resource codes field on admin channel group channel binding item. */
  resourceCodes: string[];
  /** Status field on admin channel group channel binding item. */
  status: 'active' | 'disabled';
  /** Weight field on admin channel group channel binding item. */
  weight: number;
}
