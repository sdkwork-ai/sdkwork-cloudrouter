import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible file object. */
export interface OpenAiFile {
  /** File size in bytes. */
  bytes: string;
  /** Unix timestamp in seconds when the file was created. */
  created_at: string;
  /** Uploaded file name. */
  filename: string;
  /** File identifier. */
  id: string;
  /** Object type, normally file. */
  object: 'file';
  /** OpenAI-compatible file purpose. */
  purpose: string;
  /** File processing status when returned by the upstream. */
  status?: string;
  /** Provider status details when returned. */
  status_details?: ProviderJsonValue;
}
