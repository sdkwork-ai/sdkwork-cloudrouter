import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic Claude anthropic file upload multipart request schema exposed by Claw Router vendor routing. */
export interface AnthropicFileUploadMultipartRequest {
  /** File bytes uploaded to Anthropic. */
  file: Blob;
}
