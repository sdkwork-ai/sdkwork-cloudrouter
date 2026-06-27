import type { OpenAiJsonSchema } from './open-ai-json-schema';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai json schema format schema exposed by Claw Router. */
export interface OpenAiJsonSchemaFormat {
  /** Description of the JSON schema response format. */
  description?: string;
  /** JSON schema response format name. */
  name: string;
  /** Schema field on the open ai json schema format, using the open ai json schema module. */
  schema?: OpenAiJsonSchema;
  /** Whether strict JSON schema adherence is requested. */
  strict?: boolean;
}
