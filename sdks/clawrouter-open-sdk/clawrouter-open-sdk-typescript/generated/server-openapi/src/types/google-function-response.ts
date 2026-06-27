import type { ProviderJsonObject } from './provider-json-object';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google function response schema exposed by Claw Router vendor routing. */
export interface GoogleFunctionResponse {
  /** Function name being answered. */
  name?: string;
  /** Response field on the google function response, using the provider json object module. */
  response?: ProviderJsonObject;
}
