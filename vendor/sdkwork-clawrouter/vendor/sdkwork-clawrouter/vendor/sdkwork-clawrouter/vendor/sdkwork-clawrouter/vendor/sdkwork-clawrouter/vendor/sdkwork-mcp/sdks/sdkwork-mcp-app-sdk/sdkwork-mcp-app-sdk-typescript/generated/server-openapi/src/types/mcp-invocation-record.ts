export interface McpInvocationRecord {
  id: string;
  uuid: string;
  server_id: string;
  invocation_kind: string;
  target_key: string;
  request_id?: string | null;
  trace_id?: string | null;
  idempotency_key?: string | null;
  status: string;
  invoked_at: string;
}
