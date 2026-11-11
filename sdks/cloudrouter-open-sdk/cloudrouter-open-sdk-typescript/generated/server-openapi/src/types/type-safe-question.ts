import type { ProviderJsonValue } from './provider-json-value';

/** Type safe question schema exposed by Cloud Router. */
export interface TypeSafeQuestion {
  /** Answer space the question is scored against: a map of option to description for a choice question of up to 255 options, or an ordered array of level descriptions for a score question, written as situations rather than degrees. A noul question needs no criteria. */
  criteria?: ProviderJsonValue;
  /** The single judgment this question asks for. Questions are evaluated independently against the same state, so each instruction should carry exactly one atomic judgment. */
  instructions: string;
  /** Question primitive: choice picks one of the declared options, score rates the state against ordered levels, and noul answers a true-or-false judgment as a probability. */
  type: 'choice' | 'score' | 'noul';
}
