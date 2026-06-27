import { FormEvent, useRef, useState } from 'react';
import { isBlank, trim } from '@sdkwork/utils';
import {
  Button,
  DataPanel,
  Field,
  MCP_LIFECYCLE_VALUES,
  MCP_TRANSPORT_VALUES,
  MCP_VISIBILITY_VALUES,
  SelectInput,
  TextArea,
  TextInput,
} from '@sdkwork/mcp-pc-commons';
import { isDrivePackageRef } from '@sdkwork/mcp-pc-commons/driveUri';
import {
  updateAdminServer,
  useMCPClients,
  type McpServerRecord,
  type UpdateMcpServerCommand,
} from '@sdkwork/mcp-pc-core';

import { uploadServerIcon } from '../services/driveAssetUploadService';

function toFormState(server: McpServerRecord): UpdateMcpServerCommand {
  return {
    name: server.name,
    description: server.description ?? '',
    transport: server.transport,
    visibility: server.visibility,
    category_code: server.category_code ?? '',
    tags: server.tags ?? [],
    icon_ref: server.icon_ref ?? '',
    lifecycle_status: server.lifecycle_status,
  };
}

export function AdminServerSettingsPanel({
  server,
  serverKey,
  onSaved,
}: {
  server: McpServerRecord;
  serverKey: string;
  onSaved: () => Promise<void>;
}) {
  const clients = useMCPClients();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<UpdateMcpServerCommand>(() => toFormState(server));
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      await updateAdminServer(clients, serverKey, {
        ...form,
        tags: form.tags?.filter((tag) => !isBlank(trim(tag))),
      });
      await onSaved();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <DataPanel>
      <form onSubmit={onSubmit} className="grid max-w-2xl gap-4 p-5">
        <h3 className="text-sm font-semibold text-slate-900">Server settings</h3>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Field label="Name">
          <TextInput
            value={form.name ?? ''}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </Field>
        <Field label="Description">
          <TextArea
            value={form.description ?? ''}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
          />
        </Field>
        <Field label="Transport">
          <SelectInput
            value={form.transport ?? 'stdio'}
            onChange={(event) => setForm({ ...form, transport: event.target.value })}
          >
            {MCP_TRANSPORT_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Visibility">
          <SelectInput
            value={form.visibility ?? 'tenant'}
            onChange={(event) => setForm({ ...form, visibility: event.target.value })}
          >
            {MCP_VISIBILITY_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Lifecycle status">
          <SelectInput
            value={form.lifecycle_status ?? 'draft'}
            onChange={(event) => setForm({ ...form, lifecycle_status: event.target.value })}
          >
            {MCP_LIFECYCLE_VALUES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </SelectInput>
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
          {submitting ? 'Saving…' : 'Save settings'}
        </Button>
      </form>
    </DataPanel>
  );
}
