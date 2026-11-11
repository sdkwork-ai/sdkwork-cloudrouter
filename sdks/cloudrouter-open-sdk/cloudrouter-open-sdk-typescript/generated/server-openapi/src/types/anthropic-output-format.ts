import type { ProviderJsonSchema } from './provider-json-schema';
import type { ProviderJsonValue } from './provider-json-value';

/** Anthropic JSON output format. */
export interface AnthropicOutputFormat {
  /** Schema field on the anthropic output format, using the provider json schema module. */
  schema: ProviderJsonSchema;
  /** Output format type. */
  type: 'json_schema';
}
