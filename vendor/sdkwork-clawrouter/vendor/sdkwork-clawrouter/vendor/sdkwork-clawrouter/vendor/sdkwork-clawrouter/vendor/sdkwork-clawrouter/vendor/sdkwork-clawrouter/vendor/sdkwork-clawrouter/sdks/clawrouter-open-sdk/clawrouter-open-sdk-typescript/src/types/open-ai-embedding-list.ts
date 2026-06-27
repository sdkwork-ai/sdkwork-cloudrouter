import type { OpenAiEmbedding } from './open-ai-embedding';
import type { OpenAiEmbeddingUsage } from './open-ai-embedding-usage';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai embedding list schema exposed by Claw Router. */
export interface OpenAiEmbeddingList {
  /** Embedding vectors in input order. */
  data: OpenAiEmbedding[];
  /** Embedding model used by the upstream response. */
  model?: string;
  /** Object type, always list. */
  object: 'list';
  /** Usage field on the open ai embedding list, using the open ai embedding usage module. */
  usage: OpenAiEmbeddingUsage;
}
