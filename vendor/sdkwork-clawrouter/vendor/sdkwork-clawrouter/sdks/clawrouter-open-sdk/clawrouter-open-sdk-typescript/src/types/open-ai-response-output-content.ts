import type { OpenAiAnnotation } from './open-ai-annotation';
import type { ProviderJsonValue } from './provider-json-value';

/** OpenAI-compatible open ai response output content schema exposed by Claw Router. */
export interface OpenAiResponseOutputContent {
  /** Annotations attached to the output text. */
  annotations?: OpenAiAnnotation[];
  /** Refusal text emitted by refusal content parts. */
  refusal?: string;
  /** Text emitted by output_text content parts. */
  text?: string;
  /** Output content type. */
  type: 'output_text' | 'refusal';
}
