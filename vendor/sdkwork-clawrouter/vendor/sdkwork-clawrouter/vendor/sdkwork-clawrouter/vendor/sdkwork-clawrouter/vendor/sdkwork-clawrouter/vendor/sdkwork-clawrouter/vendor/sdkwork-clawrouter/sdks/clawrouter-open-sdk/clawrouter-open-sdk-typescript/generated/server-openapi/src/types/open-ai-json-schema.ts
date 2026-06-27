import type { OpenAiJsonSchemaAdditionalProperties } from './open-ai-json-schema-additional-properties';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai json schema schema exposed by Claw Router. */
export interface OpenAiJsonSchema {
  /** Additional map values using the open ai json schema additional properties module. */
  additionalProperties?: OpenAiJsonSchemaAdditionalProperties;
  /** JSON schema description. */
  description?: string;
  /** Allowed literal values. */
  enum?: ProviderJsonValue[];
  /** Items field on the open ai json schema, using the open ai json schema module. */
  items?: unknown;
  /** Object property schemas. */
  properties?: Record<string, unknown>;
  /** Required object property names. */
  required?: string[];
  /** JSON schema type. */
  type?: string;
}
