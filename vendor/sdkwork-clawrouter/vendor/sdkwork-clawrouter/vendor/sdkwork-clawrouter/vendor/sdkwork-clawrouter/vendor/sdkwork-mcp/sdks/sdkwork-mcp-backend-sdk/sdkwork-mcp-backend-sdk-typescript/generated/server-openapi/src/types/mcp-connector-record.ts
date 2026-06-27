export interface McpConnectorRecord {
  id: string;
  uuid: string;
  server_id: string;
  connector_key: string;
  transport: string;
  publish_status: string;
  lifecycle_status: string;
  endpoint_url?: string | null;
}
