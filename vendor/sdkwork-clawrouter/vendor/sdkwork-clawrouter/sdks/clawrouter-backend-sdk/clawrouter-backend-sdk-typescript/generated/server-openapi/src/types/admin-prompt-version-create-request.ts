import type { JsonValue } from './json-value';

/** Admin prompt version create request schema exposed by Claw Router. */
export interface AdminPromptVersionCreateRequest {
  /** Content field on admin prompt version create request. */
  content: string;
  /** Examples json field on admin prompt version create request. */
  examplesJson?: Record<string, JsonValue>[] | Record<string, JsonValue>;
  /** Model constraints field on admin prompt version create request. */
  modelConstraints?: Record<string, JsonValue>;
  /** Output schema field on admin prompt version create request. */
  outputSchema?: Record<string, JsonValue>;
  /** Safety policy field on admin prompt version create request. */
  safetyPolicy?: Record<string, JsonValue>;
  /** Title field on admin prompt version create request. */
  title: string;
  /** Variable schema field on admin prompt version create request. */
  variableSchema?: Record<string, JsonValue>;
  /** Version no field on admin prompt version create request. */
  versionNo: string;
}
