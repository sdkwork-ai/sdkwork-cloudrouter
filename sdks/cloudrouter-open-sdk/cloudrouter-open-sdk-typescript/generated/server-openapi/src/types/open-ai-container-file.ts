import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible container file object. */
export interface OpenAiContainerFile {
  /** File size in bytes. */
  bytes?: string;
  /** Container identifier that owns the file. */
  container_id?: string;
  /** Unix timestamp in seconds when the file was created. */
  created_at: string;
  /** Container file name. */
  filename?: string;
  /** Container file identifier. */
  id: string;
  /** Developer-defined container file metadata. */
  metadata?: Record<string, ProviderJsonValue>;
  /** Object type, normally container.file. */
  object: 'container.file';
  /** Path of the file inside the container. */
  path?: string;
  /** Container file purpose when returned. */
  purpose?: string;
}
