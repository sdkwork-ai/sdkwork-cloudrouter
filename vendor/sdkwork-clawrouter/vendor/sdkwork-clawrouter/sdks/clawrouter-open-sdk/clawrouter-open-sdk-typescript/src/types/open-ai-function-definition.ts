import type { OpenAiJsonSchema } from './open-ai-json-schema';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai function definition schema exposed by Claw Router. */
export interface OpenAiFunctionDefinition {
  /** Function description visible to the model. */
  description?: string;
  /** Function name visible to the model. */
  name: string;
  /** Parameters field on the open ai function definition, using the open ai json schema module. */
  parameters?: OpenAiJsonSchema;
  /** Whether strict JSON Schema adherence is requested. */
  strict?: boolean;
}
