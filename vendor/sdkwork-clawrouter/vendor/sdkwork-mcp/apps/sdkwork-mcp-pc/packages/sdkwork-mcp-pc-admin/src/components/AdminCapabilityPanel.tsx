import { FormEvent, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  DataPanel,
  EmptyState,
  Field,
  SelectInput,
  TextArea,
  TextInput,
} from '@sdkwork/mcp-pc-commons';
import {
  upsertAdminPrompt,
  upsertAdminResource,
  upsertAdminTool,
  useMCPClients,
  type McpConnectorRecord,
  type McpPromptRecord,
  type McpResourceRecord,
  type McpToolRecord,
  type UpsertMcpPromptCommand,
  type UpsertMcpResourceCommand,
  type UpsertMcpToolCommand,
} from '@sdkwork/mcp-pc-core';

type CapabilityKind = 'tool' | 'resource' | 'prompt';

const defaultTool = (connectorId: string): UpsertMcpToolCommand => ({
  connector_id: connectorId,
  tool_key: 'sample_tool',
  name: 'Sample Tool',
  description: 'Example MCP tool capability',
  input_schema_json: '{}',
  output_schema_json: '{}',
  risk_level: 'low',
  requires_approval: false,
  enabled: true,
  sort_weight: 0,
});

const defaultResource = (connectorId: string): UpsertMcpResourceCommand => ({
  connector_id: connectorId,
  resource_key: 'sample_resource',
  uri: 'file:///workspace/sample',
  name: 'Sample Resource',
  description: 'Example MCP resource capability',
  enabled: true,
});

const defaultPrompt = (connectorId: string): UpsertMcpPromptCommand => ({
  connector_id: connectorId,
  prompt_key: 'sample_prompt',
  name: 'Sample Prompt',
  description: 'Example MCP prompt capability',
  arguments_schema_json: '[]',
  enabled: true,
});

export function AdminCapabilityPanel({
  serverId,
  connectors,
  tools,
  resources,
  prompts,
  onSaved,
}: {
  serverId: string;
  connectors: McpConnectorRecord[];
  tools: McpToolRecord[];
  resources: McpResourceRecord[];
  prompts: McpPromptRecord[];
  onSaved: () => Promise<void>;
}) {
  const clients = useMCPClients();
  const [kind, setKind] = useState<CapabilityKind>('tool');
  const [error, setError] = useState<string | null>(null);
  const defaultConnectorId = connectors[0]?.id ?? '';
  const [toolForm, setToolForm] = useState<UpsertMcpToolCommand>(() => defaultTool(defaultConnectorId));
  const [resourceForm, setResourceForm] = useState<UpsertMcpResourceCommand>(() =>
    defaultResource(defaultConnectorId),
  );
  const [promptForm, setPromptForm] = useState<UpsertMcpPromptCommand>(() =>
    defaultPrompt(defaultConnectorId),
  );

  const catalog = useMemo(() => {
    if (kind === 'tool') {
      return tools;
    }
    if (kind === 'resource') {
      return resources;
    }
    return prompts;
  }, [kind, tools, resources, prompts]);

  if (connectors.length === 0) {
    return (
      <EmptyState
        title="Add a connector first"
        description="Tools, resources, and prompts are scoped to a connector."
      />
    );
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      if (kind === 'tool') {
        await upsertAdminTool(clients, serverId, toolForm);
      } else if (kind === 'resource') {
        await upsertAdminResource(clients, serverId, resourceForm);
      } else {
        await upsertAdminPrompt(clients, serverId, promptForm);
      }
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <DataPanel>
        <form onSubmit={onSubmit} className="grid gap-4 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Upsert capability</h3>
          <div className="flex flex-wrap gap-2">
            {(['tool', 'resource', 'prompt'] as const).map((value) => (
              <button
                key={value}
                type="button"
                className={`rounded-full px-3 py-1 text-xs font-medium ${kind === value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
                onClick={() => setKind(value)}
              >
                {value}
              </button>
            ))}
          </div>
          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <Field label="Connector">
            <SelectInput
              value={
                kind === 'tool'
                  ? toolForm.connector_id
                  : kind === 'resource'
                    ? resourceForm.connector_id
                    : promptForm.connector_id
              }
              onChange={(event) => {
                const connectorId = event.target.value;
                if (kind === 'tool') {
                  setToolForm({ ...toolForm, connector_id: connectorId });
                } else if (kind === 'resource') {
                  setResourceForm({ ...resourceForm, connector_id: connectorId });
                } else {
                  setPromptForm({ ...promptForm, connector_id: connectorId });
                }
              }}
              required
            >
              {connectors.map((connector) => (
                <option key={connector.id} value={connector.id}>
                  {connector.connector_key}
                </option>
              ))}
            </SelectInput>
          </Field>
          {kind === 'tool' ? (
            <>
              <Field label="Tool key">
                <TextInput
                  value={toolForm.tool_key}
                  onChange={(event) => setToolForm({ ...toolForm, tool_key: event.target.value })}
                  required
                />
              </Field>
              <Field label="Name">
                <TextInput
                  value={toolForm.name}
                  onChange={(event) => setToolForm({ ...toolForm, name: event.target.value })}
                  required
                />
              </Field>
              <Field label="Risk level">
                <SelectInput
                  value={toolForm.risk_level ?? 'low'}
                  onChange={(event) => setToolForm({ ...toolForm, risk_level: event.target.value })}
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </SelectInput>
              </Field>
              <Field label="Input schema JSON">
                <TextArea
                  value={toolForm.input_schema_json ?? '{}'}
                  onChange={(event) =>
                    setToolForm({ ...toolForm, input_schema_json: event.target.value })
                  }
                />
              </Field>
            </>
          ) : null}
          {kind === 'resource' ? (
            <>
              <Field label="Resource key">
                <TextInput
                  value={resourceForm.resource_key}
                  onChange={(event) =>
                    setResourceForm({ ...resourceForm, resource_key: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="URI">
                <TextInput
                  value={resourceForm.uri}
                  onChange={(event) => setResourceForm({ ...resourceForm, uri: event.target.value })}
                  required
                />
              </Field>
              <Field label="Name">
                <TextInput
                  value={resourceForm.name}
                  onChange={(event) => setResourceForm({ ...resourceForm, name: event.target.value })}
                  required
                />
              </Field>
            </>
          ) : null}
          {kind === 'prompt' ? (
            <>
              <Field label="Prompt key">
                <TextInput
                  value={promptForm.prompt_key}
                  onChange={(event) =>
                    setPromptForm({ ...promptForm, prompt_key: event.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Name">
                <TextInput
                  value={promptForm.name}
                  onChange={(event) => setPromptForm({ ...promptForm, name: event.target.value })}
                  required
                />
              </Field>
              <Field label="Arguments schema JSON">
                <TextArea
                  value={promptForm.arguments_schema_json ?? '[]'}
                  onChange={(event) =>
                    setPromptForm({ ...promptForm, arguments_schema_json: event.target.value })
                  }
                />
              </Field>
            </>
          ) : null}
          <Button type="submit">Save {kind}</Button>
        </form>
      </DataPanel>
      <section>
        {catalog.length === 0 ? (
          <EmptyState title={`No ${kind}s yet`} description="Upsert a capability using the form." />
        ) : (
          <div className="grid gap-3">
            {catalog.map((item) => (
              <DataPanel key={item.id}>
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="font-medium text-slate-900">{item.name}</h4>
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
                </div>
              </DataPanel>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
