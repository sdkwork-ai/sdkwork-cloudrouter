import type { OpenAiFileReferenceObject } from './open-ai-file-reference-object';
import type { ProviderJsonValue } from './provider-json-value';

/** Reusable OpenAI-compatible file input reference accepted by JSON request bodies. */
export type OpenAiFileReferenceInput = string | OpenAiFileReferenceObject | ProviderJsonValue;
