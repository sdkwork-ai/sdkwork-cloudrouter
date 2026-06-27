import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic delete response schema exposed by Claw Router vendor routing. */
export interface AnthropicDeleteResponse {
  /** Whether the object was deleted. */
  deleted?: boolean;
  /** Deleted object identifier. */
  id?: string;
  /** Deleted object type. */
  type?: string;
}
