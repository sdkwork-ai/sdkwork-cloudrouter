export interface AppendMcpInvocationCommand {
  server_id: string;
  connector_id?: string | null;
  invocation_kind: 'tool' | 'resource' | 'prompt';
  target_key: string;
  request_id?: string;
  trace_id?: string;
  idempotency_key?: string;
  request_json?: string;
  response_json?: string;
  status?: string;
  error_message?: string;
  duration_ms?: number;
}
