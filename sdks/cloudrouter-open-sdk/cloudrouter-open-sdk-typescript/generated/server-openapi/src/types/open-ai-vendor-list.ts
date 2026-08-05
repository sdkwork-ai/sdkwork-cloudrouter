import type { OpenAiVendor } from './open-ai-vendor';

/** Cloud Router /v1/vendors response: vendors reachable for the authenticated gateway key. */
export interface OpenAiVendorList {
  /** Vendor entries available to the caller. */
  data: OpenAiVendor[];
  /** Object type, always list. */
  object: 'list';
}
