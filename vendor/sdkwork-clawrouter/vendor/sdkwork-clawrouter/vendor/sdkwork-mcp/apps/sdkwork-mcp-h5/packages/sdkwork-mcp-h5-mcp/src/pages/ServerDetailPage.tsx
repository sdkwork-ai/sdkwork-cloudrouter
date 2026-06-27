import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  formatMcpHealth,
  formatMcpTransport,
  formatMcpVisibility,
  healthTone,
  healthToneBadgeClass,
} from '@sdkwork/mcp-h5-commons';
import { fetchServerDetail, useAsyncResource } from '@sdkwork/mcp-h5-core/services';

import { toast } from '../components/Toast';

type DetailTab = 'tools' | 'resources' | 'prompts';

export function ServerDetailPage() {
  const { serverKey = '' } = useParams();
  const [tab, setTab] = useState<DetailTab>('tools');
  const { data, error, loading } = useAsyncResource(
    () => fetchServerDetail(serverKey),
    [serverKey],
  );

  if (!serverKey) {
    return <p className="p-4 text-sm text-red-400">Missing server key.</p>;
  }

  if (loading) {
    return <p className="p-4 text-sm text-gray-400">Loading MCP server…</p>;
  }

  if (error) {
    toast(error, 'error');
    return <p className="p-4 text-sm text-red-400">{error}</p>;
  }

  if (!data) {
    return null;
  }

  const { server, tools, resources, prompts } = data;
  const tabItems = tab === 'tools' ? tools : tab === 'resources' ? resources : prompts;
  const tone = healthTone(server.health_status);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <Link to="/" className="text-sm text-blue-400 hover:text-blue-300">
        ← Back to marketplace
      </Link>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-white">{server.name}</h2>
          <p className="mt-1 text-sm text-gray-400">{server.description ?? 'MCP server capability catalog.'}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${healthToneBadgeClass(tone)}`}>
          {formatMcpHealth(server.health_status)}
        </span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-[#1f1f1f] p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Server key</p>
          <p className="mt-1 font-mono text-sm text-white">{server.server_key}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1f1f1f] p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Transport</p>
          <p className="mt-1 text-sm text-white">{formatMcpTransport(server.transport)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-[#1f1f1f] p-3">
          <p className="text-xs uppercase tracking-wide text-gray-500">Visibility</p>
          <p className="mt-1 text-sm text-white">{formatMcpVisibility(server.visibility)}</p>
        </div>
      </div>
      <div className="flex gap-2 border-b border-white/10">
        {([
          ['tools', `Tools (${tools.length})`],
          ['resources', `Resources (${resources.length})`],
          ['prompts', `Prompts (${prompts.length})`],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${tab === value ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-400'}`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tabItems.length === 0 ? (
        <p className="text-sm text-gray-400">No {tab} registered for this server.</p>
      ) : (
        <div className="space-y-2">
          {tabItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-white/10 bg-[#1f1f1f] p-3">
              <p className="font-medium text-white">{item.name}</p>
              {item.description ? <p className="mt-1 text-sm text-gray-400">{item.description}</p> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
