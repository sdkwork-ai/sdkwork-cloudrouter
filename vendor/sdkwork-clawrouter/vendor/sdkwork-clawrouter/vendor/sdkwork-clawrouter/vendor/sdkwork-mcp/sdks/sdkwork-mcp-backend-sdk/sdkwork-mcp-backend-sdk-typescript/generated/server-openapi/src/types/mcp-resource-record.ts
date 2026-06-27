export interface McpResourceRecord {
  id: string;
  uuid: string;
  server_id: string;
  connector_id: string;
  resource_key: string;
  uri: string;
  name: string;
  enabled: boolean;
  lifecycle_status: string;
}
