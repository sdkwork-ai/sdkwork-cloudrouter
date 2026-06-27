import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google code execution result schema exposed by Claw Router vendor routing. */
export interface GoogleCodeExecutionResult {
  /** Code execution outcome. */
  outcome?: string;
  /** Code execution output. */
  output?: string;
}
