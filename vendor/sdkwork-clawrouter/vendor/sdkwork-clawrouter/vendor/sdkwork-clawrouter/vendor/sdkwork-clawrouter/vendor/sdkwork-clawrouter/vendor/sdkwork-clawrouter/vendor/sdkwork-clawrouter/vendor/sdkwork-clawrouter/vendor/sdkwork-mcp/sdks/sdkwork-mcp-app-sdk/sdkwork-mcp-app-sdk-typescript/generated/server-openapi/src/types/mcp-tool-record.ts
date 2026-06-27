export interface McpToolRecord {
  id: string;
  uuid: string;
  server_id: string;
  connector_id: string;
  tool_key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  lifecycle_status: string;
  risk_level?: string;
  requires_approval?: boolean;
}
