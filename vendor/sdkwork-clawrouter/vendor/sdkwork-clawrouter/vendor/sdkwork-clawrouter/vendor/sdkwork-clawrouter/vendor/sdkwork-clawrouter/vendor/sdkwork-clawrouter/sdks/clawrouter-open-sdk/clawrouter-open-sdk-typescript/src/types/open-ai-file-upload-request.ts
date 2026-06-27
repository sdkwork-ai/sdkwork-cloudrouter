import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai file upload request schema exposed by Claw Router. */
export interface OpenAiFileUploadRequest {
  /** File bytes to upload. */
  file: Blob;
  /** OpenAI-compatible file purpose, such as assistants, batch, fine-tune, vision, or provider-specific values. */
  purpose: string;
}
