/** Admin mcp server update request schema exposed by Claw Router. */
export interface AdminMcpServerUpdateRequest {
  /** Category id field on admin mcp server update request. */
  categoryId?: string | null;
  /** Description field on admin mcp server update request. */
  description?: string | null;
  /** Name field on admin mcp server update request. */
  name?: string;
  /** Server key field on admin mcp server update request. */
  serverKey?: string;
  /** Status field on admin mcp server update request. */
  status?: string;
  /** Tags field on admin mcp server update request. */
  tags?: string[];
  /** Transport field on admin mcp server update request. */
  transport?: string;
  /** Visibility field on admin mcp server update request. */
  visibility?: string;
}
