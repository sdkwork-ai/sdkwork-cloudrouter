import type { ProviderJsonSchema } from './provider-json-schema';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic tool schema exposed by Claw Router vendor routing. */
export interface AnthropicTool {
  /** Tool description. */
  description?: string;
  /** Input schema field on the anthropic tool, using the provider json schema module. */
  input_schema: ProviderJsonSchema;
  /** Tool name. */
  name: string;
}
