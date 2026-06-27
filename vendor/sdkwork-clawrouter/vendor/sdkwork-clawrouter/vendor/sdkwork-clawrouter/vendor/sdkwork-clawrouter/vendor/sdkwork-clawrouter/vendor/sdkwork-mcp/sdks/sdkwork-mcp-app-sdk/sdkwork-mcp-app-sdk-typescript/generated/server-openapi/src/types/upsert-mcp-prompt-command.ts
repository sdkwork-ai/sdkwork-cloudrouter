export interface UpsertMcpPromptCommand {
  connector_id: string;
  prompt_key: string;
  name: string;
  description?: string;
  arguments_schema_json?: string;
  enabled?: boolean;
}
