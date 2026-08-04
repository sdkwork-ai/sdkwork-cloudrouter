import type { OpenAiNamedToolChoice } from './open-ai-named-tool-choice';

/** Controls which tool is called by the model. */
export type OpenAiToolChoice = 'none' | 'auto' | 'required' | OpenAiNamedToolChoice;
