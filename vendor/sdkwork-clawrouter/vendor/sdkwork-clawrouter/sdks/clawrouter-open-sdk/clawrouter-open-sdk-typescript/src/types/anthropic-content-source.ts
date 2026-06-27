import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic content source schema exposed by Claw Router vendor routing. */
export interface AnthropicContentSource {
  /** Base64 or text source payload. */
  data?: string;
  /** Anthropic file identifier. */
  file_id?: string;
  /** Media type of the source payload. */
  media_type?: string;
  /** Source type, such as base64, url, file, or text. */
  type: string;
  /** URL source. */
  url?: string;
}
