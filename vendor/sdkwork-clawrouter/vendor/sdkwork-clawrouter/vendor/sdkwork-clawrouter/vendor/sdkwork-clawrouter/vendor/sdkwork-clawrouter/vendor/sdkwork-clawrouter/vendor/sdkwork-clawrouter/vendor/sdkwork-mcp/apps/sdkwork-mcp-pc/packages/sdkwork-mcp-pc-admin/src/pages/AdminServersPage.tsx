import { FormEvent, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { isBlank, trim } from '@sdkwork/utils';
import {
  Badge,
  Button,
  DataPanel,
  EmptyState,
  ErrorAlert,
  Field,
  formatMcpHealth,
  formatMcpLifecycle,
  formatMcpTransport,
  healthTone,
  PageHeader,
  TextInput,
} from '@sdkwork/mcp-pc-commons';
import { isDrivePackageRef } from '@sdkwork/mcp-pc-commons/driveUri';
import {
  createAdminServer,
  deleteAdminServer,
  listAdminServers,
  useAsyncResource,
  useMCPClients,
  type CreateMcpServerCommand,
} from '@sdkwork/mcp-pc-core';

import { uploadServerIcon } from '../services/driveAssetUploadService';

const defaultForm: CreateMcpServerCommand = {
  server_key: 'mcp.demo.sample',
  name: 'Demo MCP Server',
  description: 'Sample MCP server registered through admin console.',
  transport: 'stdio',
  visibility: 'tenant',
  category_code: 'general',
  tags: ['demo'],
  icon_ref: '',
};

export function AdminServersPage() {
  const clients = useMCPClients();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CreateMcpServerCommand>(defaultForm);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { data: servers, error: loadError, loading, reload } = useAsyncResource(
    () => listAdminServers(clients),
    [clients],
  );

  async function onUploadIcon() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError('Select an icon image to upload through sdkwork-drive.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const iconRef = await uploadServerIcon(clients.drive, file);
      setForm((current) => ({ ...current, icon_ref: iconRef }));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (form.icon_ref && !isDrivePackageRef(form.icon_ref)) {
        throw new Error('icon_ref must be a sdkwork-drive URI.');
      }
      await createAdminServer(clients, {
        ...form,
        tags: form.tags?.filter((tag) => !isBlank(trim(tag))),
      });
      setForm(defaultForm);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(serverKey: string) {
    setError(null);
    try {
      await deleteAdminServer(clients, serverKey);
      await reload();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-500">Loading servers…</p>;
  }

  return (
    <div>
      <PageHeader
        title="MCP Servers"
        description="Register MCP servers, transport metadata, visibility, and drive-backed icons."
      />
      {error || loadError ? <div className="mb-4"><ErrorAlert message={error ?? loadError ?? ''} /></div> : null}
      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <DataPanel>
          <form onSubmit={onSubmit} className="grid gap-4 p-5">
            <h3 className="text-sm font-semibold text-slate-900">Create server</h3>
            <Field label="Server key">
              <TextInput
                value={form.server_key}
                onChange={(event) => setForm({ ...form, server_key: event.target.value })}
                required
              />
            </Field>
            <Field label="Name">
              <TextInput
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </Field>
            <Field label="Transport">
              <TextInput
                value={form.transport}
                onChange={(event) => setForm({ ...form, transport: event.target.value })}
                required
              />
            </Field>
            <Field label="Category code">
              <TextInput
                value={form.category_code ?? ''}
                onChange={(event) => setForm({ ...form, category_code: event.target.value })}
              />
            </Field>
            <Field label="Tags" hint="Comma-separated">
              <TextInput
                value={(form.tags ?? []).join(', ')}
                onChange={(event) =>
                  setForm({
                    ...form,
                    tags: event.target.value.split(',').map((value) => trim(value)).filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="Icon">
              <input ref={fileInputRef} type="file" accept="image/*" className="text-sm" />
              <Button type="button" variant="secondary" onClick={onUploadIcon} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload icon via drive'}
              </Button>
              <TextInput value={form.icon_ref ?? ''} readOnly placeholder="drive://spaces/.../nodes/..." />
            </Field>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create server'}
            </Button>
          </form>
        </DataPanel>
        <section>
          {!servers || servers.length === 0 ? (
            <EmptyState title="No MCP servers yet" description="Create the first server using the form." />
          ) : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Server</th>
                    <th className="px-4 py-3">Transport</th>
                    <th className="px-4 py-3">Health</th>
                    <th className="px-4 py-3">Lifecycle</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {servers.map((server) => (
                    <tr key={server.id}>
                      <td className="px-4 py-3">
                        <Link
                          to={`/admin/servers/${encodeURIComponent(server.server_key)}`}
                          className="font-medium text-blue-600 hover:text-blue-700"
                        >
                          {server.name}
                        </Link>
                        <p className="font-mono text-xs text-slate-500">{server.server_key}</p>
                      </td>
                      <td className="px-4 py-3">{formatMcpTransport(server.transport)}</td>
                      <td className="px-4 py-3">
                        <Badge tone={healthTone(server.health_status)}>
                          {formatMcpHealth(server.health_status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{formatMcpLifecycle(server.lifecycle_status)}</td>
                      <td className="px-4 py-3">
                        <Button variant="danger" onClick={() => onDelete(server.server_key)}>
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
