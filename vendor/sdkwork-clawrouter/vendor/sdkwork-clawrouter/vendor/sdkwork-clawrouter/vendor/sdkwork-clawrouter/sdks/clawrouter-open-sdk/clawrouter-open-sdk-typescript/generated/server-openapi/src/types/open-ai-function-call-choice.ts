import type { OpenAiNamedFunctionChoice } from './open-ai-named-function-choice';

/** Legacy function calling control. */
export type OpenAiFunctionCallChoice = 'none' | 'auto' | OpenAiNamedFunctionChoice;
