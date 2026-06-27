import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai upload part multipart request schema exposed by Claw Router. */
export interface OpenAiUploadPartMultipartRequest {
  /** Binary upload part data. */
  data: Blob;
}
