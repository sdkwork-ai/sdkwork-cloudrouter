import type { OpenAiVendorModel } from './open-ai-vendor-model';

/** Model provider (vendor) the authenticated gateway key can reach, with its models (used by /v1/vendors). */
export interface OpenAiVendor {
  /** Stable vendor code (e.g. openai, anthropic, deepseek). */
  code: string;
  /** Display name of the vendor. */
  name: string;
  /** Models available through this vendor for the key. */
  models: OpenAiVendorModel[];
}
