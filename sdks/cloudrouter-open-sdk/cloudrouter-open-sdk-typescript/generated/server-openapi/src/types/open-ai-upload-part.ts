import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible upload part object. */
export interface OpenAiUploadPart {
  /** Unix timestamp in seconds when the part was uploaded. */
  created_at: string;
  /** Upload part identifier. */
  id: string;
  /** Object type, normally upload.part. */
  object: 'upload.part';
  /** Upload identifier associated with the part. */
  upload_id: string;
}
