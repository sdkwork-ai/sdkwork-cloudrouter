export interface McpServerCategoryRecord {
  id: string;
  uuid: string;
  category_code: string;
  name: string;
  description?: string | null;
  parent_id?: string;
  sort_order?: number;
  icon_ref?: string | null;
  lifecycle_status: string;
}
