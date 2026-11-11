import type { AnthropicCacheControl } from './anthropic-cache-control';
import type { AnthropicContentBlockParam } from './anthropic-content-block-param';
import type { AnthropicMessageParam } from './anthropic-message-param';
import type { AnthropicOutputConfig } from './anthropic-output-config';
import type { AnthropicServerTool } from './anthropic-server-tool';
import type { AnthropicThinkingConfig } from './anthropic-thinking-config';
import type { AnthropicTool } from './anthropic-tool';
import type { AnthropicToolChoice } from './anthropic-tool-choice';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic token-counting request (`POST /v1/messages/count_tokens`). The vendor accepts the conversation, system prompt, tools, and thinking configuration, but not the generation controls. */
export interface AnthropicCountMessageTokensRequest {
  /** Top-level cache control marker applied to the last cacheable block. */
  cache_control?: AnthropicCacheControl;
  /** Input conversation messages. */
  messages: AnthropicMessageParam[];
  /** Claude model identifier. */
  model: string;
  /** Output configuration such as effort and JSON output format. */
  output_config?: AnthropicOutputConfig;
  /** Inference speed mode; `fast` raises output tokens per second. */
  speed?: 'standard' | 'fast';
  /** System prompt content. */
  system?: string | AnthropicContentBlockParam[];
  /** Thinking field on the anthropic count message tokens request, using the anthropic thinking config module. */
  thinking?: AnthropicThinkingConfig;
  /** Tool choice field on the anthropic count message tokens request, using the anthropic tool choice module. */
  tool_choice?: AnthropicToolChoice;
  /** Tool definitions available to Claude: custom client tools or server tools. */
  tools?: (AnthropicTool | AnthropicServerTool)[];
}
