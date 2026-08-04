import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible image output object. */
export interface OpenAiImage {
  /** Base64-encoded image bytes when requested. */
  b64_json?: string;
  /** Image MIME type when returned. */
  mime_type?: string;
  /** Prompt revised by the upstream image model. */
  revised_prompt?: string;
  /** Image URL when the upstream returns hosted output. */
  url?: string;
}
