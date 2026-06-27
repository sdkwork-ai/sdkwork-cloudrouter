import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  DataPanel,
  EmptyState,
  ErrorAlert,
  formatMcpHealth,
  formatMcpLifecycle,
  formatMcpTransport,
  formatMcpVisibility,
  healthTone,
  LoadingState,
  PageHeader,
} from '@sdkwork/mcp-pc-commons';
import { fetchServerDetail, useAsyncResource, useMCPClients } from '@sdkwork/mcp-pc-core';

type DetailTab = 'tools' | 'resources' | 'prompts';

export function MCPServerDetailPage() {
  const clients = useMCPClients();
  const { serverKey = '' } = useParams();
  const [tab, setTab] = useState<DetailTab>('tools');
  const { data, error, loading } = useAsyncResource(
    () => fetchServerDetail(clients, serverKey),
    [clients, serverKey],
  );

  if (!serverKey) {
    return <ErrorAlert message="Missing server key." />;
  }

  if (loading) {
    return <LoadingState label="Loading MCP server…" />;
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  if (!data) {
    return null;
  }

  const { server, tools, resources, prompts } = data;
  const tabItems =
    tab === 'tools' ? tools : tab === 'resources' ? resources : prompts;

  return (
    <div>
      <div className="mb-4">
        <Link to="/mcp-hub" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to marketplace
        </Link>
      </div>
      <PageHeader
        title={server.name}
        description={server.description ?? 'MCP server capability catalog.'}
        actions={
          <Badge tone={healthTone(server.health_status)}>{formatMcpHealth(server.health_status)}</Badge>
        }
      />
      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DataPanel>
          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Server key</p>
            <p className="mt-1 font-mono text-sm text-slate-900">{server.server_key}</p>
          </div>
        </DataPanel>
        <DataPanel>
          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Transport</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{formatMcpTransport(server.transport)}</p>
          </div>
        </DataPanel>
        <DataPanel>
          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Visibility</p>
            <p className="mt-1 text-sm font-medium text-slate-900">{formatMcpVisibility(server.visibility)}</p>
          </div>
        </DataPanel>
        <DataPanel>
          <div className="p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">Lifecycle</p>
            <p className="mt-1 text-sm font-medium text-slate-900">
              {formatMcpLifecycle(server.lifecycle_status)}
            </p>
          </div>
        </DataPanel>
      </div>
      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {([
          ['tools', `Tools (${tools.length})`],
          ['resources', `Resources (${resources.length})`],
          ['prompts', `Prompts (${prompts.length})`],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${tab === value ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
            onClick={() => setTab(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {tabItems.length === 0 ? (
        <EmptyState title={`No ${tab} published`} description="Capabilities appear after connector discovery or admin upsert." />
      ) : (
        <div className="grid gap-3">
          {tabItems.map((item) => (
            <DataPanel key={item.id}>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-medium text-slate-900">{item.name}</h3>
                  {'enabled' in item ? (
                    <Badge tone={item.enabled ? 'success' : 'neutral'}>
                      {item.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  ) : null}
                </div>
                {'tool_key' in item ? (
                  <p className="mt-1 font-mono text-xs text-slate-500">{item.tool_key}</p>
                ) : null}
                {'resource_key' in item ? (
                  <p className="mt-1 font-mono text-xs text-slate-500">{item.resource_key}</p>
                ) : null}
                {'prompt_key' in item ? (
                  <p className="mt-1 font-mono text-xs text-slate-500">{item.prompt_key}</p>
                ) : null}
                {'description' in item && item.description ? (
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                ) : null}
                {'uri' in item ? <p className="mt-2 text-sm text-slate-600">{item.uri}</p> : null}
                {'risk_level' in item ? (
                  <div className="mt-3">
                    <Badge tone={item.risk_level === 'high' ? 'danger' : 'neutral'}>
                      Risk: {item.risk_level}
                    </Badge>
                  </div>
                ) : null}
              </div>
            </DataPanel>
          ))}
        </div>
      )}
    </div>
  );
}
