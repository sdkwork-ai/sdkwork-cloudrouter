import type { AnthropicFile } from './anthropic-file';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic file list response schema exposed by Claw Router vendor routing. */
export interface AnthropicFileListResponse {
  /** Anthropic file objects. */
  data: AnthropicFile[];
  /** First object identifier in the page. */
  first_id?: string | null;
  /** Whether more results are available. */
  has_more?: boolean;
  /** Last object identifier in the page. */
  last_id?: string | null;
}
