import type { ProviderJsonValue } from './provider-json-value';

/** Reusable JSON Schema object used by provider tool definitions. */
export interface ProviderJsonSchema {
  /** JSON Schema additionalProperties value. */
  additionalProperties?: boolean | unknown;
  /** Human-readable schema description. */
  description?: string;
  /** Allowed literal values. */
  enum?: ProviderJsonValue[];
  /** Items field on the provider json schema, using the provider json schema module. */
  items?: unknown;
  /** Object property schemas keyed by field name. */
  properties?: Record<string, unknown>;
  /** Required object property names. */
  required?: string[];
  /** JSON Schema type name. */
  type?: string;
}
