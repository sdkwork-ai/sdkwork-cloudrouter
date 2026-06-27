import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic tool choice schema exposed by Claw Router vendor routing. */
export interface AnthropicToolChoice {
  /** Tool name when forcing a specific tool. */
  name?: string;
  /** Tool choice type such as auto, any, tool, or none. */
  type: string;
}
