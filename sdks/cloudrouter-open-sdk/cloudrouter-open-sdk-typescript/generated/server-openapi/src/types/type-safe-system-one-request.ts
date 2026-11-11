import type { ProviderJsonValue } from './provider-json-value';
import type { TypeSafeQuestion } from './type-safe-question';

/** Type safe system one request schema exposed by Cloud Router. */
export interface TypeSafeSystemOneRequest {
  /** Model name to evaluate with. Cloud Router selects the routed catalog model for the request; sending a name here overrides it. Versioned ids such as jev-1.13.0 are accepted alongside the published aliases. */
  model?: string;
  /** Typed questions keyed by a caller-chosen question id. Every question is evaluated against the same state in parallel and in isolation. */
  questions: Record<string, TypeSafeQuestion>;
  /** Context the questions are evaluated against: a text string, an array of text values, or a JSON object whose fields the instructions can reference by dot path. */
  state: ProviderJsonValue;
}
