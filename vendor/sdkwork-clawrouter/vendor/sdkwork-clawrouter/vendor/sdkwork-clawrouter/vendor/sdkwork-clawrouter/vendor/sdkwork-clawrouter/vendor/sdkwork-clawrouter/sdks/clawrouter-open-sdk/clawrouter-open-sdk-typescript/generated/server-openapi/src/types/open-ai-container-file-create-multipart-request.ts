import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible multipart request to upload or create a container file. */
export interface OpenAiContainerFileCreateMultipartRequest {
  /** Binary file payload for the container. */
  file: Blob;
  /** JSON-serialized container file metadata. */
  metadata?: string;
  /** Container file purpose when required by the selected upstream. */
  purpose?: string;
}
