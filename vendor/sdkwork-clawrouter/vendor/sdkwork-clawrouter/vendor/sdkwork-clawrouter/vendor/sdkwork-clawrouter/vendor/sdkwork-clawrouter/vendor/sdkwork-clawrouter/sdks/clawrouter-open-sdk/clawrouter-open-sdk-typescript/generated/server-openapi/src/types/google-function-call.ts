import type { ProviderJsonObject } from './provider-json-object';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google function call schema exposed by Claw Router vendor routing. */
export interface GoogleFunctionCall {
  /** Args field on the google function call, using the provider json object module. */
  args?: ProviderJsonObject;
  /** Function name selected by the model. */
  name?: string;
}
