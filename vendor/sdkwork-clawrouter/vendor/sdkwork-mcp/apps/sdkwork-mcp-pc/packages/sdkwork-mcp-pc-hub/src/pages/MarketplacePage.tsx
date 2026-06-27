import { useMemo, useState } from 'react';
import {
  EmptyState,
  ErrorAlert,
  filterMarketplaceServers,
  LoadingState,
  PageHeader,
  TextInput,
  uniqueTransports,
} from '@sdkwork/mcp-pc-commons';
import {
  fetchMarketplaceCatalog,
  useAsyncResource,
  useMCPClients,
} from '@sdkwork/mcp-pc-core';

import { ServerCard } from '../components/ServerCard';

export function MCPMarketplacePage() {
  const clients = useMCPClients();
  const { data, error, loading } = useAsyncResource(
    () => fetchMarketplaceCatalog(clients),
    [clients],
  );
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
    return <LoadingState label="Loading MCP marketplace…" />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!data) {
    return null;
  }

  const transports = uniqueTransports(data.servers);

  return (
    <div>
      <PageHeader
        title="MCP Marketplace"
        description="Discover governed MCP servers, connectors, and capabilities curated for your tenant."
      />
      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Search</p>
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search servers, tags, keys…"
              aria-label="Search MCP servers"
            />
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Categories</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium ${categoryCode === null ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                onClick={() => setCategoryCode(null)}
              >
                All
              </button>
              {data.categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-medium ${categoryCode === category.category_code ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                  onClick={() => setCategoryCode(category.category_code)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Transport</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium ${transport === null ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                onClick={() => setTransport(null)}
              >
                Any
              </button>
              {transports.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`rounded-full px-3 py-1 text-xs font-medium ${transport === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                  onClick={() => setTransport(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </aside>
        <section>
          <p className="mb-4 text-sm text-slate-600">
            Showing {filteredServers.length} of {data.servers.length} servers
          </p>
          {filteredServers.length === 0 ? (
            <EmptyState
              title="No MCP servers match your filters"
              description="Try clearing filters or ask an operator to publish servers in Admin."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredServers.map((server) => (
                <ServerCard key={server.id} server={server} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
