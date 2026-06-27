import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google executable code schema exposed by Claw Router vendor routing. */
export interface GoogleExecutableCode {
  /** Code emitted by the model. */
  code?: string;
  /** Programming language of executable code. */
  language?: string;
}
