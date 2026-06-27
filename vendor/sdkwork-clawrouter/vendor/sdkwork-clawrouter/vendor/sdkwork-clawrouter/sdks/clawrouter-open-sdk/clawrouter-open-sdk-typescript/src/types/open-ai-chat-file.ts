import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai chat file schema exposed by Claw Router. */
export interface OpenAiChatFile {
  /** Inline file data accepted by compatible upstreams. */
  file_data?: string;
  /** Uploaded file identifier. */
  file_id?: string;
  /** Input filename when sending inline file data. */
  filename?: string;
}
