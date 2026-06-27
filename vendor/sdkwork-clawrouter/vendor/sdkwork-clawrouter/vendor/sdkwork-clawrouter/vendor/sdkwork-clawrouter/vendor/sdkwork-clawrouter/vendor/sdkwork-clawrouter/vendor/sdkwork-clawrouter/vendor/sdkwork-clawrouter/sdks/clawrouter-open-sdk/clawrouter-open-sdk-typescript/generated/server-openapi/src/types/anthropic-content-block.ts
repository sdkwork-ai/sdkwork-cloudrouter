import type { AnthropicToolInput } from './anthropic-tool-input';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic content block schema exposed by Claw Router vendor routing. */
export interface AnthropicContentBlock {
  /** Tool use identifier. */
  id?: string;
  /** Input field on the anthropic content block, using the anthropic tool input module. */
  input?: AnthropicToolInput;
  /** Tool name. */
  name?: string;
  /** Text output. */
  text?: string;
  /** Output content block type. */
  type: string;
}
