import type { GoogleFunctionCallingConfig } from './google-function-calling-config';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google tool config schema exposed by Claw Router vendor routing. */
export interface GoogleToolConfig {
  /** Function calling config field on the google tool config, using the google function calling config module. */
  functionCallingConfig?: GoogleFunctionCallingConfig;
}
