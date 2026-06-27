export interface McpServerRecord {
  id: string;
  uuid: string;
  server_key: string;
  name: string;
  description?: string | null;
  category_id?: string | null;
  category_code?: string | null;
  transport: string;
  visibility: string;
  data_scope: string;
  health_status: string;
  lifecycle_status: string;
  tags?: string[];
  /** Canonical sdkwork-drive node reference. */
  icon_ref?: string | null;
}
