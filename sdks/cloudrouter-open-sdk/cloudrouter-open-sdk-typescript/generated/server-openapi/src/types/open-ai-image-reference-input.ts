import type { OpenAiFileReferenceInput } from './open-ai-file-reference-input';
import type { OpenAiImageReferenceObject } from './open-ai-image-reference-object';

/** Reusable OpenAI-compatible image input reference accepted by JSON request bodies. */
export type OpenAiImageReferenceInput = string | OpenAiImageReferenceObject | OpenAiFileReferenceInput;
