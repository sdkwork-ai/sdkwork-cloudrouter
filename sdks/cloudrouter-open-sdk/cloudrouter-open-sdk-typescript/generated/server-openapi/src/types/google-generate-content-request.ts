import type { GoogleContent } from './google-content';
import type { GoogleGenerationConfig } from './google-generation-config';
import type { GoogleSafetySetting } from './google-safety-setting';
import type { GoogleTool } from './google-tool';
import type { GoogleToolConfig } from './google-tool-config';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google generate content request schema exposed by Cloud Router vendor routing. */
export interface GoogleGenerateContentRequest {
  /** Cached content resource name to reuse for the request. */
  cachedContent?: string;
  /** Conversation contents sent to the Gemini model. */
  contents: GoogleContent[];
  /** Opaque continuation token used to resume generation from a previous request. */
  continuationToken?: string;
  /** Generation config field on the google generate content request, using the google generation config module. */
  generationConfig?: GoogleGenerationConfig;
  /** User-defined labels attached to the request. */
  labels?: Record<string, string>;
  /** Model resource name, `models/{model}`; the path parameter is authoritative when both are present. */
  model?: string;
  /** Safety settings overriding model defaults. */
  safetySettings?: GoogleSafetySetting[];
  /** Service tier of the request. */
  serviceTier?: 'unspecified' | 'standard' | 'flex' | 'priority';
  /** Logging behavior for this request; takes precedence over the project default. */
  store?: boolean;
  /** System instruction field on the google generate content request, using the google content module. */
  systemInstruction?: GoogleContent;
  /** Tool config field on the google generate content request, using the google tool config module. */
  toolConfig?: GoogleToolConfig;
  /** Tool definitions available to the Gemini model. */
  tools?: GoogleTool[];
}
