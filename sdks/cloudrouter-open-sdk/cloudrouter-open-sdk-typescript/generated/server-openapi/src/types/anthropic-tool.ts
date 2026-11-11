import type { AnthropicCacheControl } from './anthropic-cache-control';
import type { ProviderJsonSchema } from './provider-json-schema';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic custom client tool definition (the `Tool` member of `ToolUnion`). */
export interface AnthropicTool {
  /** Callers allowed to invoke the tool. */
  allowed_callers?: ('direct' | 'code_execution_20250825' | 'code_execution_20260120' | 'code_execution_20260521')[];
  /** Cache control field on the anthropic tool, using the anthropic cache control module. */
  cache_control?: AnthropicCacheControl;
  /** Load the tool lazily via `tool_reference` instead of the initial system prompt. */
  defer_loading?: boolean;
  /** Tool description. */
  description?: string;
  /** Stream tool input incrementally while it is generated. */
  eager_input_streaming?: boolean;
  /** Example inputs used for tool-use training hints. */
  input_examples?: Record<string, ProviderJsonValue>[];
  /** Input schema field on the anthropic tool, using the provider json schema module. */
  input_schema: ProviderJsonSchema;
  /** Tool name as it appears in `tool_use` blocks. */
  name: string;
  /** Guarantee schema validation on tool names and inputs. */
  strict?: boolean;
  /** Tool type; omit or set `custom` for client tools. */
  type?: 'custom';
}
