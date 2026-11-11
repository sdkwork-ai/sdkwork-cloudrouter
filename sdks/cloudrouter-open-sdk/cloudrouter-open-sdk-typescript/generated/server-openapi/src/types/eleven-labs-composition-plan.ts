import type { ProviderJsonValue } from './provider-json-value';

/** Composition plan for the music_v2 and music_v2_5 models. */
export interface ElevenLabsCompositionPlan {
  /** Chunks that make up the generation. */
  chunks: Record<string, ProviderJsonValue>[];
}
