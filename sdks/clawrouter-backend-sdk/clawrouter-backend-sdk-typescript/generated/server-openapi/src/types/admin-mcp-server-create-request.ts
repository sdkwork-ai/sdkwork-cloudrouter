/** Admin mcp server create request schema exposed by Claw Router. */
export interface AdminMcpServerCreateRequest {
  /** Category id field on admin mcp server create request. */
  categoryId?: string;
  /** Description field on admin mcp server create request. */
  description?: string;
  /** Name field on admin mcp server create request. */
  name: string;
  /** Server key field on admin mcp server create request. */
  serverKey: string;
  /** Tags field on admin mcp server create request. */
  tags?: string[];
  /** Transport field on admin mcp server create request. */
  transport?: string;
  /** Visibility field on admin mcp server create request. */
  visibility?: string;
}
