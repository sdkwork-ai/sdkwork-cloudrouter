export interface UpsertMcpServerCategoryCommand {
  category_code: string;
  name: string;
  description?: string;
  parent_id?: string;
  sort_order?: number;
  icon_ref?: string;
}
