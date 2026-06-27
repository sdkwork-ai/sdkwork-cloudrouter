import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to complete an upload. */
export interface OpenAiUploadCompleteRequest {
  /** Optional MD5 checksum for completed upload bytes. */
  md5?: string;
  /** Ordered upload part identifiers used to complete the upload. */
  part_ids: string[];
}
