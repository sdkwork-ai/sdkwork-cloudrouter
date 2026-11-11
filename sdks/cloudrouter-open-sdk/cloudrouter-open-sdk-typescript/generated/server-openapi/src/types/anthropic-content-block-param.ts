import type { AnthropicCacheControl } from './anthropic-cache-control';
import type { AnthropicContentSource } from './anthropic-content-source';
import type { AnthropicToolInput } from './anthropic-tool-input';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic content block (union member of `ContentBlockParam`). */
export interface AnthropicContentBlockParam {
  /** Cache control field on the anthropic content block param, using the anthropic cache control module. */
  cache_control?: AnthropicCacheControl;
  /** Tool invocation caller (`direct` or a server tool caller). */
  caller?: Record<string, ProviderJsonValue>;
  /** Citations attached to a text or document block. */
  citations?: Record<string, ProviderJsonValue>[];
  /** Nested tool result content. */
  content?: string | unknown[];
  /** Document context. */
  context?: string;
  /** Opaque encrypted payload for redacted thinking blocks. */
  data?: string;
  /** Tool use identifier. */
  id?: string;
  /** Input field on the anthropic content block param, using the anthropic tool input module. */
  input?: AnthropicToolInput;
  /** Whether a tool result represents an error. */
  is_error?: boolean;
  /** Tool name. */
  name?: string;
  /** Opaque signature for a thinking block. */
  signature?: string;
  /** Source field on the anthropic content block param, using the anthropic content source module. */
  source?: AnthropicContentSource;
  /** Text content for text blocks. */
  text?: string;
  /** Thinking text for thinking blocks. */
  thinking?: string;
  /** Document title. */
  title?: string;
  /** Tool use identifier answered by a tool result. */
  tool_use_id?: string;
  /** Toolset family a tool-use member belongs to. */
  toolset_name?: string;
  /** Content block type. */
  type: 'text' | 'image' | 'document' | 'tool_use' | 'tool_result' | 'thinking' | 'redacted_thinking' | 'server_tool_use' | 'web_search_tool_result' | 'web_fetch_tool_result' | 'code_execution_tool_result' | 'bash_code_execution_tool_result' | 'text_editor_code_execution_tool_result' | 'tool_search_tool_result' | 'search_result' | 'container_upload';
}
