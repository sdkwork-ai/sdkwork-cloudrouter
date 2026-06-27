/** Admin channel credential item schema exposed by Claw Router. */
export interface AdminChannelCredentialItem {
  /** Plaintext provider API key returned only to authenticated admin management responses when available for channel credential relay operations. */
  apiKey?: string;
  /** Base url field on admin channel credential item. */
  baseUrl: string;
  /** Credential id field on admin channel credential item. */
  credentialId: string;
  /** Errors field on admin channel credential item. */
  errors: string;
  /** Id field on admin channel credential item. */
  id: string;
  /** Masked label field on admin channel credential item. */
  maskedLabel: string;
  /** Name field on admin channel credential item. */
  name: string;
  /** Priority field on admin channel credential item. */
  priority: string;
  /** Secret ref field on admin channel credential item. */
  secretRef: string;
  /** Status field on admin channel credential item. */
  status: 'active' | 'disabled' | 'error';
  /** Weight field on admin channel credential item. */
  weight: string;
}
