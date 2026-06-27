import type { ProviderJsonValue } from './provider-json-value';

/** Google Gemini google schema schema exposed by Claw Router vendor routing. */
export interface GoogleSchema {
  /** Schema description. */
  description?: string;
  /** Allowed string values. */
  enum?: string[];
  /** JSON schema format. */
  format?: string;
  /** Items field on the google schema, using the google schema module. */
  items?: unknown;
  /** Whether null is accepted. */
  nullable?: boolean;
  /** Object property schemas. */
  properties?: Record<string, unknown>;
  /** Required property names. */
  required?: string[];
  /** JSON schema type. */
  type?: string;
}
