import type { AnthropicContentBlock } from './anthropic-content-block';
import type { AnthropicUsage } from './anthropic-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic message schema exposed by Claw Router vendor routing. */
export interface AnthropicMessage {
  /** Generated content blocks. */
  content: AnthropicContentBlock[];
  /** Anthropic message identifier. */
  id: string;
  /** Claude model used for generation. */
  model: string;
  /** Role of the generated message. */
  role: 'assistant';
  /** Reason generation stopped. */
  stop_reason: string | null;
  /** Stop sequence that ended generation. */
  stop_sequence?: string | null;
  /** Object type, always message. */
  type: 'message';
  /** Usage field on the anthropic message, using the anthropic usage module. */
  usage: AnthropicUsage;
}
