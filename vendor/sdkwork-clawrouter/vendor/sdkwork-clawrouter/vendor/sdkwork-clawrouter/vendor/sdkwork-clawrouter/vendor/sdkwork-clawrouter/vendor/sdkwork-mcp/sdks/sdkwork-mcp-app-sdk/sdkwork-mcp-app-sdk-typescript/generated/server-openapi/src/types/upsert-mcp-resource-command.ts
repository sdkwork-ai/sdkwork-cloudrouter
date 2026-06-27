export interface UpsertMcpResourceCommand {
  connector_id: string;
  resource_key: string;
  uri: string;
  name: string;
  description?: string;
  mime_type?: string;
  enabled?: boolean;
}
