import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai embeddings request schema exposed by Claw Router. */
export interface OpenAiEmbeddingsRequest {
  /** Requested embedding dimensionality when supported by the model. */
  dimensions?: number;
  /** Format for returned embeddings. */
  encoding_format?: 'float' | 'base64';
  /** Input text, text array, token array, or token array batch to embed. */
  input: string | string[] | number[] | number[][];
  /** Embedding model id or Claw Router catalog key routed to a provider account. */
  model: string;
  /** End-user identifier forwarded to compatible upstreams. */
  user?: string;
}
