import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google function calling config schema exposed by Claw Router vendor routing. */
export interface GoogleFunctionCallingConfig {
  /** Function names the model may call. */
  allowedFunctionNames?: string[];
  /** Function calling mode. */
  mode?: string;
}
