import type { GoogleSchema } from './google-schema';
import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google function declaration schema exposed by Claw Router vendor routing. */
export interface GoogleFunctionDeclaration {
  /** Function description. */
  description?: string;
  /** Function name. */
  name: string;
  /** Parameters field on the google function declaration, using the google schema module. */
  parameters?: GoogleSchema;
  /** Response field on the google function declaration, using the google schema module. */
  response?: GoogleSchema;
}
