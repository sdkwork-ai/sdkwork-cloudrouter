import { useMemo, useState } from 'react';
import {
  filterMarketplaceServers,
  formatMcpTransport,
  uniqueTransports,
} from '@sdkwork/mcp-h5-commons';
import { fetchMarketplaceCatalog, useAsyncResource } from '@sdkwork/mcp-h5-core/services';

import { ServerCard } from '../components/ServerCard';
import { toast } from '../components/Toast';

export function MarketplacePage() {
  const { data, error, loading } = useAsyncResource(() => fetchMarketplaceCatalog(), []);
  const [query, setQuery] = useState('');
  const [categoryCode, setCategoryCode] = useState<string | null>(null);
  const [transport, setTransport] = useState<string | null>(null);

  const filteredServers = useMemo(() => {
    if (!data) {
      return [];
    }
    return filterMarketplaceServers(data.servers, { query, categoryCode, transport });
  }, [data, query, categoryCode, transport]);

  if (loading) {
    return <p className="p-4 text-sm text-gray-400">Loading MCP marketplace…</p>;
  }

  if (error) {
    toast(error, 'error');
    return <p className="p-4 text-sm text-red-400">{error}</p>;
  }

  if (!data) {
    return null;
  }

  const transports = uniqueTransports(data.servers);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-semibold text-white">MCP Marketplace</h2>
        <p className="mt-1 text-sm text-gray-400">Browse governed MCP servers for your tenant.</p>
      </div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search servers, tags, keys…"
        aria-label="Search MCP servers"
        className="w-full rounded-xl border border-white/10 bg-[#1f1f1f] px-3 py-2 text-sm text-white outline-none focus:border-blue-400/60"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={`rounded-full px-3 py-1 text-xs ${categoryCode === null ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300'}`}
          onClick={() => setCategoryCode(null)}
        >
          All categories
        </button>
        {data.categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${categoryCode === category.code ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300'}`}
            onClick={() => setCategoryCode(category.code)}
          >
            {category.name}
          </button>
        ))}
      </div>
      {transports.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-xs ${transport === null ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300'}`}
            onClick={() => setTransport(null)}
          >
            All transports
          </button>
          {transports.map((value) => (
            <button
              key={value}
              type="button"
              className={`rounded-full px-3 py-1 text-xs ${transport === value ? 'bg-blue-600 text-white' : 'bg-white/10 text-gray-300'}`}
              onClick={() => setTransport(value)}
            >
              {formatMcpTransport(value)}
            </button>
          ))}
        </div>
      ) : null}
      {filteredServers.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-gray-400">
          No MCP servers match the current filters.
        </p>
      ) : (
        <div className="grid gap-3">
          {filteredServers.map((server) => (
            <ServerCard key={server.server_key} server={server} />
          ))}
        </div>
      )}
    </div>
  );
}
