import type { AnthropicCacheControl } from './anthropic-cache-control';
import type { AnthropicContainer } from './anthropic-container';
import type { AnthropicContentBlockParam } from './anthropic-content-block-param';
import type { AnthropicDiagnostics } from './anthropic-diagnostics';
import type { AnthropicMessageParam } from './anthropic-message-param';
import type { AnthropicMetadata } from './anthropic-metadata';
import type { AnthropicOutputConfig } from './anthropic-output-config';
import type { AnthropicServerTool } from './anthropic-server-tool';
import type { AnthropicThinkingConfig } from './anthropic-thinking-config';
import type { AnthropicTool } from './anthropic-tool';
import type { AnthropicToolChoice } from './anthropic-tool-choice';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic message create request schema exposed by Cloud Router vendor routing. */
export interface AnthropicMessageCreateRequest {
  /** Top-level cache control marker applied to the last cacheable block. */
  cache_control?: AnthropicCacheControl;
  /** Container identifier and skills reused across requests. */
  container?: AnthropicContainer;
  /** Request-level diagnostics for prompt-cache divergence. */
  diagnostics?: AnthropicDiagnostics;
  /** Geographic region for inference; defaults to the workspace `default_inference_geo`. */
  inference_geo?: string;
  /** Maximum number of tokens to generate; `0` pre-warms the prompt cache without generating a response. */
  max_tokens: number;
  /** Input conversation messages. */
  messages: AnthropicMessageParam[];
  /** Request metadata. */
  metadata?: AnthropicMetadata;
  /** Claude model identifier. */
  model: string;
  /** Output configuration such as effort and JSON output format. */
  output_config?: AnthropicOutputConfig;
  /** Priority or standard capacity for this request. */
  service_tier?: 'auto' | 'standard_only';
  /** Inference speed mode; `fast` raises output tokens per second. */
  speed?: 'standard' | 'fast';
  /** Custom stop sequences. */
  stop_sequences?: string[];
  /** Whether to stream server-sent events. */
  stream?: boolean;
  /** System prompt content. */
  system?: string | AnthropicContentBlockParam[];
  /** Legacy sampling temperature; current Messages documentation moves output-shape controls to `output_config`. */
  temperature?: number;
  /** Thinking field on the anthropic message create request, using the anthropic thinking config module. */
  thinking?: AnthropicThinkingConfig;
  /** Tool choice field on the anthropic message create request, using the anthropic tool choice module. */
  tool_choice?: AnthropicToolChoice;
  /** Tool definitions available to Claude: custom client tools or server tools. */
  tools?: (AnthropicTool | AnthropicServerTool)[];
  /** Legacy top-k sampling value. */
  top_k?: number;
  /** Legacy nucleus sampling value. */
  top_p?: number;
}
