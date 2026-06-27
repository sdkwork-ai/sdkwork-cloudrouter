import type { OpenAiJsonSchemaFormat } from './open-ai-json-schema-format';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai response format schema exposed by Claw Router. */
export interface OpenAiResponseFormat {
  /** Json schema field on the open ai response format, using the open ai json schema format module. */
  json_schema?: OpenAiJsonSchemaFormat;
  /** Requested response format type. */
  type: 'text' | 'json_object' | 'json_schema';
}
