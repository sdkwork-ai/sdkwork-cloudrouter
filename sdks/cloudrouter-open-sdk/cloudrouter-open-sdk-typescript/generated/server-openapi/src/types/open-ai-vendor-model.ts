/** Model available through a Cloud Router vendor (used by /v1/vendors). */
export interface OpenAiVendorModel {
  /** Model id the gateway accepts (equals the catalog model id). */
  id: string;
  /** Human readable model name for channel offerings. */
  displayName: string;
  /** Context window in tokens, when the catalog knows it. */
  contextTokens?: string;
  /** Maximum output tokens, when the catalog knows it. */
  maxOutputTokens?: string;
}
