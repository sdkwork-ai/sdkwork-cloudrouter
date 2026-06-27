import type { AnthropicContentBlockParam } from './anthropic-content-block-param';
import type { AnthropicMessageParam } from './anthropic-message-param';
import type { AnthropicThinkingConfig } from './anthropic-thinking-config';
import type { AnthropicTool } from './anthropic-tool';
import type { AnthropicToolChoice } from './anthropic-tool-choice';
import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderMetadata } from './provider-metadata';

/** Anthropic Claude anthropic message create request schema exposed by Claw Router vendor routing. */
export interface AnthropicMessageCreateRequest {
  /** Maximum number of tokens to generate. */
  max_tokens: number;
  /** Input conversation messages. */
  messages: AnthropicMessageParam[];
  /** Metadata field on the anthropic message create request, using the provider metadata module. */
  metadata?: ProviderMetadata;
  /** Claude model identifier. */
  model: string;
  /** Custom stop sequences. */
  stop_sequences?: string[];
  /** Whether to stream server-sent events. */
  stream?: boolean;
  /** System prompt content. */
  system?: string | AnthropicContentBlockParam[];
  /** Sampling temperature. */
  temperature?: number;
  /** Thinking field on the anthropic message create request, using the anthropic thinking config module. */
  thinking?: AnthropicThinkingConfig;
  /** Tool choice field on the anthropic message create request, using the anthropic tool choice module. */
  tool_choice?: AnthropicToolChoice;
  /** Tool definitions available to Claude. */
  tools?: AnthropicTool[];
  /** Top-k sampling value. */
  top_k?: number;
  /** Nucleus sampling value. */
  top_p?: number;
}
