export interface UpsertMcpToolCommand {
  connector_id: string;
  tool_key: string;
  name: string;
  description?: string;
  input_schema_json?: string;
  output_schema_json?: string;
  risk_level?: string;
  requires_approval?: boolean;
  enabled?: boolean;
  sort_weight?: number;
}
