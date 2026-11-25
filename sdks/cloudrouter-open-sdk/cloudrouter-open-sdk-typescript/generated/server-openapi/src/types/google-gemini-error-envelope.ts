import type { GoogleGeminiErrorDetail } from './google-gemini-error-detail';
import type { ProviderJsonValue } from './provider-json-value';

/** Error envelope returned by the Google Gemini API. */
export interface GoogleGeminiErrorEnvelope {
  /** Google Gemini error details. */
  error: { code: number; details?: GoogleGeminiErrorDetail[]; message: string; status: string; } & Record<string, ProviderJsonValue>;
}
