import type { ProviderJsonValue } from './provider-json-value';

/** Counts of files in each vector store processing state. */
export interface OpenAiVectorStoreFileCounts {
  /** Number of cancelled files. */
  cancelled?: number;
  /** Number of processed files. */
  completed?: number;
  /** Number of failed files. */
  failed?: number;
  /** Number of files currently being processed. */
  in_progress?: number;
  /** Total number of files. */
  total?: number;
}
