/** Admin prompt create request schema exposed by Claw Router. */
export interface AdminPromptCreateRequest {
  /** Category id field on admin prompt create request. */
  categoryId?: string;
  /** Description field on admin prompt create request. */
  description?: string;
  /** Name field on admin prompt create request. */
  name: string;
  /** Prompt key field on admin prompt create request. */
  promptKey: string;
  /** Prompt type field on admin prompt create request. */
  promptType?: string;
  /** Tags field on admin prompt create request. */
  tags?: string[];
  /** Visibility field on admin prompt create request. */
  visibility?: string;
}
