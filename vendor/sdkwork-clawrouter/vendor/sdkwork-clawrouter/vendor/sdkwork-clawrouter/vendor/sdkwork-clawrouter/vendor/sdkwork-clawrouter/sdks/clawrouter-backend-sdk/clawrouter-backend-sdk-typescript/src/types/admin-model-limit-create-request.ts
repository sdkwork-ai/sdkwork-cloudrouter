/** Admin model limit create request schema exposed by Claw Router. */
export interface AdminModelLimitCreateRequest {
  /** AI channel group code or identifier. */
  channelGroup: string;
  /** AI model identifier. */
  model: string;
  /** Maximum requests per minute for the model and group. */
  rpm: number;
  /** Status field on admin model limit create request. */
  status?: 'active' | 'inactive';
  /** Maximum tokens per minute for the model and group. */
  tpm: number;
}
