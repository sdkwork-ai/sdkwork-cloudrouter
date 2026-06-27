export interface McpPromptRecord {
  id: string;
  uuid: string;
  server_id: string;
  connector_id: string;
  prompt_key: string;
  name: string;
  enabled: boolean;
  lifecycle_status: string;
}
