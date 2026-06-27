import {
  Badge,
  DataPanel,
  EmptyState,
  ErrorAlert,
  LoadingState,
  PageHeader,
} from '@sdkwork/mcp-pc-commons';
import { listAdminInvocations, useAsyncResource, useMCPClients } from '@sdkwork/mcp-pc-core';

export function AdminInvocationsPage() {
  const clients = useMCPClients();
  const { data: invocations, error, loading } = useAsyncResource(
    () => listAdminInvocations(clients),
    [clients],
  );

  if (loading) {
    return <LoadingState label="Loading invocation audit log…" />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div>
      <PageHeader
        title="Invocation Audit"
        description="Append-only audit trail with trace correlation and idempotency keys."
      />
      {!invocations || invocations.length === 0 ? (
        <EmptyState title="No invocations recorded" description="Runtime workers append audit rows via admin API." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">Kind</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Trace</th>
                <th className="px-4 py-3">Invoked</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invocations.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.target_key}</p>
                    <p className="font-mono text-xs text-slate-500">server {item.server_id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone="brand">{item.invocation_kind}</Badge>
                  </td>
                  <td className="px-4 py-3">{item.status}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">
                    {item.trace_id ?? item.request_id ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.invoked_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Showing {invocations?.length ?? 0} recent rows. Sensitive payload fields remain governed by redaction policy.
      </p>
    </div>
  );
}
