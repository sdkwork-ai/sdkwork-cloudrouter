import type { GoogleContent } from './google-content';
import type { GoogleGenerationConfig } from './google-generation-config';
import type { GoogleSafetySetting } from './google-safety-setting';
import type { GoogleTool } from './google-tool';
import type { GoogleToolConfig } from './google-tool-config';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google generate content request schema exposed by Claw Router vendor routing. */
export interface GoogleGenerateContentRequest {
  /** Cached content resource name to reuse for the request. */
  cachedContent?: string;
  /** Conversation contents sent to the Gemini model. */
  contents: GoogleContent[];
  /** Generation config field on the google generate content request, using the google generation config module. */
  generationConfig?: GoogleGenerationConfig;
  /** Safety settings overriding model defaults. */
  safetySettings?: GoogleSafetySetting[];
  /** System instruction field on the google generate content request, using the google content module. */
  systemInstruction?: GoogleContent;
  /** Tool config field on the google generate content request, using the google tool config module. */
  toolConfig?: GoogleToolConfig;
  /** Tool definitions available to the Gemini model. */
  tools?: GoogleTool[];
}
