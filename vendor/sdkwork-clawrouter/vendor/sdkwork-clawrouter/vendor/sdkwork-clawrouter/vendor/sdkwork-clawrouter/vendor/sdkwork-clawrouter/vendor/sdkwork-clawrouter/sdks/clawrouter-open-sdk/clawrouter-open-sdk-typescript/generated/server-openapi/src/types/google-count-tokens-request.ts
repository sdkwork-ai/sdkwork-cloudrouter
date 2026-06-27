import type { GoogleContent } from './google-content';
import type { GoogleGenerateContentRequest } from './google-generate-content-request';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google count tokens request schema exposed by Claw Router vendor routing. */
export interface GoogleCountTokensRequest {
  /** Contents to count. */
  contents?: GoogleContent[];
  /** Generate content request field on the google count tokens request, using the google generate content request module. */
  generateContentRequest?: GoogleGenerateContentRequest;
}
