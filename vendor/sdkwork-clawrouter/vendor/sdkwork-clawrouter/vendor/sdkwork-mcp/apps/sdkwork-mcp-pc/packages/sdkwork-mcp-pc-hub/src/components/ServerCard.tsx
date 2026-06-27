import { Link } from 'react-router-dom';
import {
  Badge,
  formatMcpHealth,
  formatMcpTransport,
  formatMcpVisibility,
  healthTone,
} from '@sdkwork/mcp-pc-commons';
import type { McpServerRecord } from '@sdkwork/mcp-pc-core';

export function ServerCard({ server }: { server: McpServerRecord }) {
  return (
    <Link
      to={`/mcp-hub/${encodeURIComponent(server.server_key)}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{server.name}</h3>
          <p className="mt-1 font-mono text-xs text-slate-500">{server.server_key}</p>
        </div>
        <Badge tone={healthTone(server.health_status)}>{formatMcpHealth(server.health_status)}</Badge>
      </div>
      {server.description ? (
        <p className="mt-3 line-clamp-2 text-sm text-slate-600">{server.description}</p>
      ) : (
        <p className="mt-3 text-sm text-slate-400">No description provided.</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="brand">{formatMcpTransport(server.transport)}</Badge>
        <Badge>{formatMcpVisibility(server.visibility)}</Badge>
        {server.category_code ? <Badge>{server.category_code}</Badge> : null}
        {(server.tags ?? []).slice(0, 3).map((tag) => (
          <Badge key={tag}>{tag}</Badge>
        ))}
      </div>
    </Link>
  );
}
