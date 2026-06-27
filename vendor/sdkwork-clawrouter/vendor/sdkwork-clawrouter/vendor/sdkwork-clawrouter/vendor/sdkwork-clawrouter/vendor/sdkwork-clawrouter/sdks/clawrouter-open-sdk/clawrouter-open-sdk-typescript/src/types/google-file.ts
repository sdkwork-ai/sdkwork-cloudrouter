import type { ProviderJsonValue } from './provider-json-value';
import type { ProviderTaskError } from './provider-task-error';

/** Google Gemini google file schema exposed by Claw Router vendor routing. */
export interface GoogleFile {
  /** Creation timestamp. */
  createTime?: string;
  /** Human-readable file display name. */
  displayName?: string;
  /** Error field on the google file, using the provider task error module. */
  error?: ProviderTaskError;
  /** Expiration timestamp. */
  expirationTime?: string;
  /** File MIME type. */
  mimeType?: string;
  /** Gemini file resource name. */
  name?: string;
  /** SHA-256 hash for the file. */
  sha256Hash?: string;
  /** File size in bytes, encoded as a string by the Google API. */
  sizeBytes?: string;
  /** Processing state of the file. */
  state?: string;
  /** Update timestamp. */
  updateTime?: string;
  /** Gemini file URI. */
  uri?: string;
}
