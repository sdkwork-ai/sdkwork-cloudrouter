/** Admin channel credential input schema exposed by Claw Router. */
export interface AdminChannelCredentialInput {
  /** Api key field on admin channel credential input. */
  apiKey?: string;
  /** Base url field on admin channel credential input. */
  baseUrl: string;
  /** Name field on admin channel credential input. */
  name?: string;
  /** Priority field on admin channel credential input. */
  priority?: string;
  /** Secret ref field on admin channel credential input. */
  secretRef?: string;
  /** Status field on admin channel credential input. */
  status?: 'active' | 'disabled' | 'error';
  /** Weight field on admin channel credential input. */
  weight?: string;
}
