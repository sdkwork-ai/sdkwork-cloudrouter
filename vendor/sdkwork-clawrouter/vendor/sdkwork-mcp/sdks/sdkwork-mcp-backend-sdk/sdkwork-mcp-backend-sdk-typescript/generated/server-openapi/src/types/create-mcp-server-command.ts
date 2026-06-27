export interface CreateMcpServerCommand {
  server_key: string;
  name: string;
  description?: string;
  transport: string;
  visibility?: string;
  category_id?: string;
  category_code?: string;
  tags?: string[];
  icon_ref?: string;
}
