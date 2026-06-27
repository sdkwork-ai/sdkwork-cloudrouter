import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai embedding schema exposed by Claw Router. */
export interface OpenAiEmbedding {
  /** Embedding vector as floats, or base64-encoded vector when requested. */
  embedding: number[] | string;
  /** Index of the embedding in the input batch. */
  index: number;
  /** Object type, always embedding. */
  object: 'embedding';
}
