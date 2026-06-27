import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Badge,
  Button,
  DataPanel,
  EmptyState,
  ErrorAlert,
  Field,
  formatMcpPublishStatus,
  formatMcpTransport,
  LoadingState,
  PageHeader,
  TextInput,
} from '@sdkwork/mcp-pc-commons';
import {
  deleteAdminConnector,
  fetchServerDetail,
  listAdminConnectors,
  upsertAdminConnector,
  useAsyncResource,
  useMCPClients,
  type UpsertMcpConnectorCommand,
} from '@sdkwork/mcp-pc-core';

import { AdminCapabilityPanel } from '../components/AdminCapabilityPanel';
import { AdminServerSettingsPanel } from '../components/AdminServerSettingsPanel';

const defaultConnector: UpsertMcpConnectorCommand = {
  connector_key: 'default',
  transport: 'stdio',
  command_ref: 'npx',
  args_json: '[]',
  env_schema_json: '{}',
  auth_type: 'none',
  publish_status: 'draft',
  lifecycle_status: 'draft',
};

type AdminTab = 'connectors' | 'capabilities' | 'settings';

export function AdminServerDetailPage() {
  const clients = useMCPClients();
  const { serverKey = '' } = useParams();
  const [tab, setTab] = useState<AdminTab>('connectors');
  const [error, setError] = useState<string | null>(null);
  const [connectorForm, setConnectorForm] = useState<UpsertMcpConnectorCommand>(defaultConnector);
  const { data, error: detailError, loading, reload } = useAsyncResource(async () => {
    const detail = await fetchServerDetail(clients, serverKey);
    const connectors = await listAdminConnectors(clients, detail.server.id);
    return { ...detail, connectors };
  }, [clients, serverKey]);

  async function onCreateConnector(event: FormEvent) {
    event.preventDefault();
    if (!data) {
      return;
    }
    setError(null);
    try {
      await upsertAdminConnector(clients, data.server.id, connectorForm);
      setConnectorForm(defaultConnector);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function onDeleteConnector(connectorKey: string) {
    if (!data) {
      return;
    }
    setError(null);
    try {
      await deleteAdminConnector(clients, data.server.id, connectorKey);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  if (loading) {
    return <LoadingState label="Loading server admin view…" />;
  }

  if (detailError) {
    return <ErrorAlert message={detailError} />;
  }

  if (!data) {
    return null;
  }

  const { server, tools, resources, prompts, connectors } = data;

  return (
    <div>
      <div className="mb-4">
        <Link to="/admin/servers" className="text-sm font-medium text-blue-600 hover:text-blue-700">
          ← Back to servers
        </Link>
      </div>
      <PageHeader
        title={server.name}
        description={`Manage connectors, capabilities, and lifecycle settings for ${server.server_key}.`}
      />
      {error ? (
        <div className="mb-4">
          <ErrorAlert message={error} />
        </div>
      ) : null}
      <div className="mb-6 flex gap-2 border-b border-slate-200">
        {([
          ['connectors', `Connectors (${connectors.length})`],
          ['capabilities', `Capabilities (${tools.length + resources.length + prompts.length})`],
          ['settings', 'Settings'],
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
      {tab === 'connectors' ? (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <DataPanel>
            <form onSubmit={onCreateConnector} className="grid gap-4 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Upsert connector</h3>
              <Field label="Connector key">
                <TextInput
                  value={connectorForm.connector_key}
                  onChange={(event) =>
                    setConnectorForm({ ...connectorForm, connector_key: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Transport">
                <TextInput
                  value={connectorForm.transport}
                  onChange={(event) =>
                    setConnectorForm({ ...connectorForm, transport: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Command ref">
                <TextInput
                  value={connectorForm.command_ref ?? ''}
                  onChange={(event) =>
                    setConnectorForm({ ...connectorForm, command_ref: event.target.value })
                  }
                />
              </Field>
              <Field label="Endpoint URL">
                <TextInput
                  value={connectorForm.endpoint_url ?? ''}
                  onChange={(event) =>
                    setConnectorForm({ ...connectorForm, endpoint_url: event.target.value })
                  }
                />
              </Field>
              <Field label="Secret ref" hint="Never store plaintext secrets in MCP tables.">
                <TextInput
                  value={connectorForm.secret_ref ?? ''}
                  onChange={(event) =>
                    setConnectorForm({ ...connectorForm, secret_ref: event.target.value })
                  }
                />
              </Field>
              <Button type="submit">Save connector</Button>
            </form>
          </DataPanel>
          <section>
            {connectors.length === 0 ? (
              <EmptyState
                title="No connectors"
                description="Add a connector to publish runtime configuration."
              />
            ) : (
              <div className="grid gap-3">
                {connectors.map((connector) => (
                  <DataPanel key={connector.id}>
                    <div className="flex items-start justify-between gap-4 p-4">
                      <div>
                        <h3 className="font-medium text-slate-900">{connector.connector_key}</h3>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatMcpTransport(connector.transport)}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge tone="brand">
                            {formatMcpPublishStatus(connector.publish_status)}
                          </Badge>
                          <Badge>{connector.lifecycle_status}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        onClick={() => onDeleteConnector(connector.connector_key)}
                      >
                        Delete
                      </Button>
                    </div>
                  </DataPanel>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : tab === 'capabilities' ? (
        <AdminCapabilityPanel
          serverId={server.id}
          connectors={connectors}
          tools={tools}
          resources={resources}
          prompts={prompts}
          onSaved={reload}
        />
      ) : (
        <AdminServerSettingsPanel server={server} serverKey={serverKey} onSaved={reload} />
      )}
    </div>
  );
}
