import type { ProviderJsonValue } from './provider-json-value';

/** Jimeng video generation request. */
export interface JimengVideoGenerationRequest {
  /** Optional callback URL for task completion. */
  callback_url?: string;
  /** Requested duration in seconds. */
  duration?: number;
  /** Requested frame rate. */
  fps?: number;
  /** Optional first-frame image URL or reference image reference. */
  image?: string;
  /** Jimeng video model id. */
  model: string;
  /** Text prompt describing the requested video. */
  prompt: string;
  /** Requested aspect ratio such as 16:9. */
  ratio?: string;
  /** Optional deterministic seed. */
  seed?: number;
}
