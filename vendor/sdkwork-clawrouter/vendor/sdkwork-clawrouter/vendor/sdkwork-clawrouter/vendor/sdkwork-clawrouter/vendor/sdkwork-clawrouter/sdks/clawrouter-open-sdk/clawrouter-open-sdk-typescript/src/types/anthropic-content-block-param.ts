import type { AnthropicContentSource } from './anthropic-content-source';
import type { AnthropicToolInput } from './anthropic-tool-input';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic content block param schema exposed by Claw Router vendor routing. */
export interface AnthropicContentBlockParam {
  /** Nested tool result content. */
  content?: string | unknown[];
  /** Tool use identifier. */
  id?: string;
  /** Input field on the anthropic content block param, using the anthropic tool input module. */
  input?: AnthropicToolInput;
  /** Tool name. */
  name?: string;
  /** Source field on the anthropic content block param, using the anthropic content source module. */
  source?: AnthropicContentSource;
  /** Text content for text blocks. */
  text?: string;
  /** Tool use identifier answered by a tool result. */
  tool_use_id?: string;
  /** Content block type, such as text, image, document, tool_use, or tool_result. */
  type: string;
}
