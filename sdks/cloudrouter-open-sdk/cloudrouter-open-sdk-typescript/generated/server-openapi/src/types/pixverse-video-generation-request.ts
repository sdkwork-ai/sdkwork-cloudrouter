import type { ProviderJsonValue } from './provider-json-value';

/** PixVerse text-to-video generation request (`POST /openapi/v2/video/text/generate`). */
export interface PixverseVideoGenerationRequest {
  /** Output aspect ratio. */
  aspect_ratio: '16:9' | '9:16' | '4:3' | '3:4' | '1:1' | '2:3' | '3:2' | '21:9';
  /** Requested duration in seconds. */
  duration: number;
  /** Generate synchronized audio. */
  generate_audio_switch?: boolean;
  /** Generate a multi-clip video. */
  generate_multi_clip_switch?: boolean;
  /** PixVerse model id. */
  model: 'v6-max' | 'c1' | 'v6' | 'v3.5' | 'v4' | 'v4.5' | 'v5' | 'v5-fast' | 'v5.5' | 'v5.6';
  /** Text prompt describing the requested video. */
  prompt: string;
  /** Output quality tier. */
  quality: '360p' | '540p' | '720p' | '1080p';
  /** Optional deterministic seed. */
  seed?: number;
  /** Webhook registration id notified when the task changes state. */
  webhook_id?: string;
}
