import type { ProviderJsonValue } from './provider-json-value';

/** Type safe answer schema exposed by Cloud Router. */
export interface TypeSafeAnswer {
  /** Option selected for a choice question. */
  choice?: string;
  /** Probability mass concentrated on the reported answer. Reported for choice and score answers; a noul answer carries none. */
  confidence?: number;
  /** Maps each score level index to the level description declared by the question. */
  legend?: Record<string, string>;
  /** Probability that a noul question is true: near 1 is a strong yes, near 0 a strong no, and near 0.5 means the state does not decide it. */
  noul?: number;
  /** Probability assigned to each candidate answer of a choice question, keyed by option. */
  probabilities?: Record<string, number>;
  /** Position on the score question's ordered levels. The value can fall between two levels. */
  score?: number;
  /** Question primitive that produced this answer. */
  type: 'choice' | 'score' | 'noul';
}
