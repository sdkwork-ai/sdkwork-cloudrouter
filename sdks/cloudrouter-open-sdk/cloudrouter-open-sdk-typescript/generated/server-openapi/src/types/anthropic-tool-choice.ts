import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic tool choice schema exposed by Cloud Router vendor routing. */
export interface AnthropicToolChoice {
  /** Emit at most one tool use (or exactly one for `any`/`tool`). */
  disable_parallel_tool_use?: boolean;
  /** Tool name when forcing a specific tool. */
  name?: string;
  /** How the model should use the provided tools. */
  type: 'auto' | 'any' | 'tool' | 'none';
}
