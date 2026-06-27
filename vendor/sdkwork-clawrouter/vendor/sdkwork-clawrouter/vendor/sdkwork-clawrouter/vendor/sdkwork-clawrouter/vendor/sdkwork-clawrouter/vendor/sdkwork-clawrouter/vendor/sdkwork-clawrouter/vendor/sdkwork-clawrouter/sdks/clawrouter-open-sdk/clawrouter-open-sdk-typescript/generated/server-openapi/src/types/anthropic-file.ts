import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic file schema exposed by Claw Router vendor routing. */
export interface AnthropicFile {
  /** Creation timestamp. */
  created_at: string;
  /** Whether file content can be downloaded. */
  downloadable?: boolean;
  /** Uploaded filename. */
  filename: string;
  /** Anthropic file identifier. */
  id: string;
  /** File MIME type. */
  mime_type: string;
  /** File size in bytes. */
  size_bytes: string;
  /** Object type, always file. */
  type: 'file';
}
