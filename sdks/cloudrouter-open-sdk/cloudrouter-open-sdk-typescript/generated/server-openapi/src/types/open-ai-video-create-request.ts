import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible request to create a video (`POST /v1/videos`). */
export interface OpenAiVideoCreateRequest {
  /** Optional input image reference. */
  input_reference?: { file_id?: string; image_url?: string; } & Record<string, ProviderJsonValue>;
  /** Video model id such as sora-2 or sora-2-pro. */
  model?: 'sora-2' | 'sora-2-pro' | 'sora-2-2025-10-06' | 'sora-2-pro-2025-10-06' | 'sora-2-2025-12-08';
  /** Text prompt describing the video to generate. */
  prompt: string;
  /** Requested video duration. */
  seconds?: '4' | '8' | '12';
  /** Requested video size. */
  size?: '720x1280' | '1280x720' | '1024x1792' | '1792x1024';
}
