import type { ProviderJsonValue } from './provider-json-value';
import type { TypeSafeAnswer } from './type-safe-answer';
import type { TypeSafeUsage } from './type-safe-usage';

/** Type safe system one response schema exposed by Cloud Router. */
export interface TypeSafeSystemOneResponse {
  /** One typed answer per requested question, keyed by the same question id that was sent. */
  answers: Record<string, TypeSafeAnswer>;
  /** Versioned model id that answered the request, so callers can log which release produced each result. */
  model?: string;
  /** Usage field on the type safe system one response, using the type safe usage module. */
  usage?: TypeSafeUsage;
}
