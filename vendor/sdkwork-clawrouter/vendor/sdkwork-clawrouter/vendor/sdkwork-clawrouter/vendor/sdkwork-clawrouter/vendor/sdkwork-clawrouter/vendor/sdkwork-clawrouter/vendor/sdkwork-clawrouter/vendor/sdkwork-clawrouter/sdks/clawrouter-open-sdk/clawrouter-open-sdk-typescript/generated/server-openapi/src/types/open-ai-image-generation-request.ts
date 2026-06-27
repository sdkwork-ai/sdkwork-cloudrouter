import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai image generation request schema exposed by Claw Router. */
export interface OpenAiImageGenerationRequest {
  /** Image model id or Claw Router catalog key. */
  model: string;
  /** Number of images to generate when supported. */
  n?: number;
  /** Text prompt describing the image to generate. */
  prompt: string;
  /** Requested image quality when supported. */
  quality?: string;
  /** Desired response format, such as url or b64_json. */
  response_format?: string;
  /** Requested image size. */
  size?: string;
}
