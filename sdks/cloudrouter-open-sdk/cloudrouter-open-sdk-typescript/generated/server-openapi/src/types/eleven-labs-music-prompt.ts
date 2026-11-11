import type { ProviderJsonValue } from './provider-json-value';

/** Structured music prompt (deprecated in favor of `composition_plan`). */
export interface ElevenLabsMusicPrompt {
  /** Styles that should not be present. */
  negative_global_styles: string[];
  /** Styles that should be present across the whole song. */
  positive_global_styles: string[];
  /** Song sections. */
  sections: Record<string, ProviderJsonValue>[];
}
