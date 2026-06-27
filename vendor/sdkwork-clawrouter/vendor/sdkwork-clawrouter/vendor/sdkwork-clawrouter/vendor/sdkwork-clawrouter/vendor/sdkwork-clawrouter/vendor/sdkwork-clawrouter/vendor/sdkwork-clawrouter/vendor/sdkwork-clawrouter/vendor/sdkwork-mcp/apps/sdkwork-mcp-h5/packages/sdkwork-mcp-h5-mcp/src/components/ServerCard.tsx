import { Link } from 'react-router-dom';
import { MCP_SERVER_ROUTE_PREFIX } from '@sdkwork/mcp-h5-shell';
import {
  formatMcpHealth,
  formatMcpTransport,
  formatMcpVisibility,
  healthTone,
  healthToneBadgeClass,
} from '@sdkwork/mcp-h5-commons';
import type { McpServerRecord } from 'sdkwork-mcp-app-sdk-generated-typescript/src/types/mcp-server-record';

export function ServerCard({ server }: { server: McpServerRecord }) {
  const tone = healthTone(server.health_status);
  return (
    <Link
      to={`/${MCP_SERVER_ROUTE_PREFIX}/${encodeURIComponent(server.server_key)}`}
      className="block rounded-2xl border border-white/10 bg-[#1f1f1f] p-4 transition hover:border-blue-400/40 hover:bg-[#242424]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-white">{server.name}</h3>
          <p className="mt-1 truncate font-mono text-xs text-gray-400">{server.server_key}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${healthToneBadgeClass(tone)}`}>
          {formatMcpHealth(server.health_status)}
        </span>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-gray-400">
        {server.description?.trim() || 'No description provided.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full bg-blue-500/20 px-2 py-1 text-xs text-blue-200">
          {formatMcpTransport(server.transport)}
        </span>
        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-gray-300">
          {formatMcpVisibility(server.visibility)}
        </span>
        {server.category_code ? (
          <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-gray-300">{server.category_code}</span>
        ) : null}
      </div>
    </Link>
  );
}
