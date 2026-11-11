import type { AnthropicCacheControl } from './anthropic-cache-control';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic server tool definition (bash, text editor, web search, or tool search). */
export interface AnthropicServerTool {
  /** Callers allowed to invoke the tool. */
  allowed_callers?: ('direct' | 'code_execution_20250825' | 'code_execution_20260120' | 'code_execution_20260521')[];
  /** Only include results from these domains; mutually exclusive with `blocked_domains`. */
  allowed_domains?: string[];
  /** Never include results from these domains; mutually exclusive with `allowed_domains`. */
  blocked_domains?: string[];
  /** Cache control field on the anthropic server tool, using the anthropic cache control module. */
  cache_control?: AnthropicCacheControl;
  /** Load the tool lazily via `tool_reference`. */
  defer_loading?: boolean;
  /** Display height in pixels (computer use). */
  display_height_px?: number;
  /** Display number (computer use). */
  display_number?: number;
  /** Display width in pixels (computer use). */
  display_width_px?: number;
  /** Maximum characters displayed when viewing a file (text editor). */
  max_characters?: number;
  /** Maximum number of times the tool can be used in the request. */
  max_uses?: number;
  /** Server tool name. */
  name: 'bash' | 'str_replace_editor' | 'str_replace_based_edit_tool' | 'web_search' | 'tool_search_tool_regex';
  /** Guarantee schema validation on tool names and inputs. */
  strict?: boolean;
  /** Server tool version id. */
  type: 'bash_20250124' | 'text_editor_20250124' | 'text_editor_20250429' | 'text_editor_20250728' | 'web_search_20250305' | 'tool_search_tool_regex';
  /** Approximate user location for search results. */
  user_location?: { city?: string; country?: string; region?: string; timezone?: string; type?: 'approximate'; } & Record<string, ProviderJsonValue>;
}
