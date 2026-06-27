/** Admin channel group channel binding input schema exposed by Claw Router. */
export interface AdminChannelGroupChannelBindingInput {
  /** Api scope field on admin channel group channel binding input. */
  apiScope?: string[];
  /** Capabilities field on admin channel group channel binding input. */
  capabilities?: string[];
  /** Channel id field on admin channel group channel binding input. */
  channelId: string;
  /** Priority field on admin channel group channel binding input. */
  priority?: number;
  /** Resource codes field on admin channel group channel binding input. */
  resourceCodes?: string[];
  /** Status field on admin channel group channel binding input. */
  status?: 'active' | 'disabled';
  /** Weight field on admin channel group channel binding input. */
  weight?: number;
}
