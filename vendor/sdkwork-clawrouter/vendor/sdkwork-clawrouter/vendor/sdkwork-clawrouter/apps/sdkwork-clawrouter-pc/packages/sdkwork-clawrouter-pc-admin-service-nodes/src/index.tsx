import React, { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Power, RefreshCw, Search, Server, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AdminTableShell,
  BusinessStateTableRow,
  ConfirmDialog,
} from '@sdkwork/clawroutes-pc-commons';
import {
  ServiceNodeService,
  type ServiceNode,
  type ServiceNodeInput,
  type ServiceNodeStatus,
} from './serviceNodeService';

type StatusFilter = ServiceNodeStatus | 'all';
type DialogState =
  | { mode: 'create'; node?: undefined }
  | { mode: 'edit'; node: ServiceNode };

const EMPTY_FORM: Required<ServiceNodeInput> = {
  name: '',
  domain: '',
  ip: '',
  remark: '',
  status: 'enabled',
};

export function ServiceNodesAdmin() {
  const { t } = useTranslation();
  const [nodes, setNodes] = useState<ServiceNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ServiceNode | null>(null);
  const [busyNodeId, setBusyNodeId] = useState<string | null>(null);

  const loadNodes = async (nextSearch = search, nextStatus = statusFilter) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await ServiceNodeService.fetchNodes({ search: nextSearch, status: nextStatus });
      setNodes(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load service nodes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNodes('', 'all');
  }, []);

  const stats = useMemo(() => {
    const enabled = nodes.filter((node) => node.status === 'enabled').length;
    const disabled = nodes.filter((node) => node.status === 'disabled').length;
    const online = nodes.filter((node) => node.healthStatus === 'online').length;
    return { enabled, disabled, online, total: nodes.length };
  }, [nodes]);

  const submitDialog = async (input: ServiceNodeInput) => {
    if (!dialog) {
      return;
    }
    if (dialog.mode === 'create') {
      const created = await ServiceNodeService.createNode(input);
      setNodes((current) => [created, ...current.filter((node) => node.id !== created.id)]);
      setDialog(null);
      return;
    }
    let saved = dialog.node;
    const detailUpdates = serviceNodeDetailUpdates(dialog.node, input);
    if (Object.keys(detailUpdates).length > 0) {
      saved = await ServiceNodeService.updateNode(dialog.node.id, detailUpdates);
    }
    if (input.status && input.status !== saved.status) {
      saved = await ServiceNodeService.updateNodeStatus(dialog.node.id, input.status);
    }
    setNodes((current) => current.map((node) => (node.id === saved.id ? saved : node)));
    setDialog(null);
  };

  const updateStatus = async (node: ServiceNode) => {
    const nextStatus: ServiceNodeStatus = node.status === 'enabled' ? 'disabled' : 'enabled';
    setBusyNodeId(node.id);
    try {
      const updated = await ServiceNodeService.updateNodeStatus(node.id, nextStatus);
      setNodes((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to update service node status');
    } finally {
      setBusyNodeId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setBusyNodeId(deleteTarget.id);
    try {
      await ServiceNodeService.deleteNode(deleteTarget.id);
      setNodes((current) => current.filter((node) => node.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to delete service node');
    } finally {
      setBusyNodeId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label={t('admin.serviceNodes.metrics.total', 'Total nodes')} value={stats.total} tone="text-slate-700 dark:text-slate-100" />
        <MetricCard label={t('admin.serviceNodes.metrics.enabled', 'Enabled')} value={stats.enabled} tone="text-emerald-600 dark:text-emerald-300" />
        <MetricCard label={t('admin.serviceNodes.metrics.online', 'Online')} value={stats.online} tone="text-blue-600 dark:text-blue-300" />
        <MetricCard label={t('admin.serviceNodes.metrics.disabled', 'Disabled')} value={stats.disabled} tone="text-slate-500 dark:text-slate-400" />
      </div>

      <AdminTableShell
        data-admin-service-nodes-table-card
        className="flex-1 min-h-0 rounded-xl dark:bg-[#1a1a1a]"
        header={(
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1 md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      void loadNodes();
                    }
                  }}
                  placeholder={t('admin.serviceNodes.search.placeholder', 'Search name, domain or IP')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => {
                  const nextStatus = event.target.value as StatusFilter;
                  setStatusFilter(nextStatus);
                  void loadNodes(search, nextStatus);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-slate-200"
              >
                <option value="all">{t('admin.serviceNodes.filters.all', 'All statuses')}</option>
                <option value="enabled">{t('admin.serviceNodes.status.enabled', 'Enabled')}</option>
                <option value="disabled">{t('admin.serviceNodes.status.disabled', 'Disabled')}</option>
              </select>
              <button
                type="button"
                onClick={() => { void loadNodes(); }}
                disabled={loading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <Search className="h-4 w-4" />
                {t('admin.serviceNodes.actions.search', 'Search')}
              </button>
              <button
                type="button"
                onClick={() => { void loadNodes(); }}
                disabled={loading}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {t('admin.serviceNodes.actions.refresh', 'Refresh')}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setDialog({ mode: 'create' })}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-cyan-600 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700"
            >
              <Plus className="h-4 w-4" />
              {t('admin.serviceNodes.actions.create', 'New node')}
            </button>
          </div>
        )}
        viewportClassName="min-h-0 flex-1 relative"
        viewportProps={{ 'data-admin-service-nodes-table-viewport': true }}
      >
        <table className="min-w-[980px] w-full whitespace-nowrap text-left text-sm">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">{t('admin.serviceNodes.columns.node', 'Node')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.serviceNodes.columns.domain', 'Domain')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.serviceNodes.columns.ip', 'IP')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.serviceNodes.columns.status', 'Status')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.serviceNodes.columns.health', 'Health')}</th>
              <th className="px-5 py-3 font-medium">{t('admin.serviceNodes.columns.updatedAt', 'Updated')}</th>
              <th className="px-5 py-3 text-right font-medium">{t('admin.serviceNodes.columns.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
            {loading ? (
              <BusinessStateTableRow colSpan={7} kind="loading" title={t('admin.serviceNodes.states.loading', 'Loading service nodes...')} />
            ) : loadError ? (
              <BusinessStateTableRow
                colSpan={7}
                kind="error"
                title={t('admin.serviceNodes.states.error', 'Service nodes could not be loaded')}
                description={loadError}
                onRetry={() => { void loadNodes(); }}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : nodes.length === 0 ? (
              <BusinessStateTableRow
                colSpan={7}
                kind="empty"
                title={t('admin.serviceNodes.states.empty', 'No service nodes found')}
                description={t('admin.serviceNodes.states.emptyDesc', 'Create a node or adjust the filters.')}
                action={{ label: t('admin.serviceNodes.actions.create', 'New node'), onClick: () => setDialog({ mode: 'create' }) }}
              />
            ) : nodes.map((node) => (
              <tr key={node.id} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                <td className="px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300">
                      <Server className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-slate-900 dark:text-white">{node.name}</div>
                      <div className="mt-0.5 max-w-[260px] truncate text-slate-500 dark:text-slate-400">{node.remark || '-'}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3 font-mono text-[12px] text-slate-600 dark:text-slate-300">{node.domain}</td>
                <td className="px-5 py-3 font-mono text-[12px] text-slate-600 dark:text-slate-300">{node.ip}</td>
                <td className="px-5 py-3"><StatusBadge status={node.status} t={t} /></td>
                <td className="px-5 py-3"><HealthBadge status={node.healthStatus} t={t} /></td>
                <td className="px-5 py-3 text-slate-500 dark:text-slate-400">{formatUpdatedAt(node.updatedAt)}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <IconButton
                      label={t('admin.serviceNodes.actions.edit', 'Edit')}
                      onClick={() => setDialog({ mode: 'edit', node })}
                    >
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={node.status === 'enabled'
                        ? t('admin.serviceNodes.actions.disable', 'Disable')
                        : t('admin.serviceNodes.actions.enable', 'Enable')}
                      disabled={busyNodeId === node.id}
                      onClick={() => { void updateStatus(node); }}
                    >
                      <Power className="h-4 w-4" />
                    </IconButton>
                    <IconButton
                      label={t('admin.serviceNodes.actions.delete', 'Delete')}
                      tone="danger"
                      disabled={busyNodeId === node.id}
                      onClick={() => setDeleteTarget(node)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </AdminTableShell>

      {dialog ? (
        <ServiceNodeDialog
          state={dialog}
          onCancel={() => setDialog(null)}
          onSubmit={submitDialog}
          t={t}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          tone="danger"
          title={t('admin.serviceNodes.delete.title', 'Delete service node')}
          description={t('admin.serviceNodes.delete.description', 'This node will be removed from service configuration.')}
          confirmLabel={t('admin.serviceNodes.actions.delete', 'Delete')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          isBusy={busyNodeId === deleteTarget.id}
          icon={<Trash2 className="h-4 w-4" />}
          onConfirm={() => { void confirmDelete(); }}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}

function serviceNodeDetailUpdates(node: ServiceNode, input: ServiceNodeInput): ServiceNodeInput {
  const updates: ServiceNodeInput = {};
  if (input.name !== undefined && input.name !== node.name) {
    updates.name = input.name;
  }
  if (input.domain !== undefined && input.domain !== node.domain) {
    updates.domain = input.domain;
  }
  if (input.ip !== undefined && input.ip !== node.ip) {
    updates.ip = input.ip;
  }
  if (input.remark !== undefined && input.remark !== node.remark) {
    updates.remark = input.remark;
  }
  return updates;
}

function MetricCard({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#171717]">
      <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status, t }: { status: ServiceNodeStatus; t: (key: string, fallback: string) => string }) {
  const enabled = status === 'enabled';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      enabled
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
    }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {enabled ? t('admin.serviceNodes.status.enabled', 'Enabled') : t('admin.serviceNodes.status.disabled', 'Disabled')}
    </span>
  );
}

function HealthBadge({ status, t }: { status: ServiceNode['healthStatus']; t: (key: string, fallback: string) => string }) {
  const styles: Record<ServiceNode['healthStatus'], string> = {
    online: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
    offline: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
    unknown: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      {t(`admin.serviceNodes.health.${status}`, status)}
    </span>
  );
}

function IconButton({
  children,
  disabled = false,
  label,
  onClick,
  tone = 'default',
}: {
  children: React.ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
}) {
  const toneClass = tone === 'danger'
    ? 'text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10'
    : 'text-slate-600 hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-700 dark:text-slate-300 dark:hover:border-cyan-500/30 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-200';
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 ${toneClass}`}
    >
      {children}
    </button>
  );
}

function ServiceNodeDialog({
  state,
  onCancel,
  onSubmit,
  t,
}: {
  state: DialogState;
  onCancel: () => void;
  onSubmit: (input: ServiceNodeInput) => Promise<void>;
  t: (key: string, fallback: string) => string;
}) {
  const [form, setForm] = useState<Required<ServiceNodeInput>>(() => state.mode === 'edit'
    ? {
      name: state.node.name,
      domain: state.node.domain,
      ip: state.node.ip,
      remark: state.node.remark,
      status: state.node.status,
    }
    : EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(form);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to save service node');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-950/50 px-4 py-4 backdrop-blur-sm sm:items-center">
      <form
        onSubmit={save}
        className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]"
      >
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-500/10 dark:text-cyan-300">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold text-slate-900 dark:text-white">
              {state.mode === 'create'
                ? t('admin.serviceNodes.dialog.createTitle', 'New service node')
                : t('admin.serviceNodes.dialog.editTitle', 'Edit service node')}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label={t('admin.serviceNodes.fields.name', 'Name')}
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            autoFocus
          />
          <TextField
            label={t('admin.serviceNodes.fields.domain', 'Domain')}
            value={form.domain}
            onChange={(value) => setForm((current) => ({ ...current, domain: value }))}
          />
          <TextField
            label={t('admin.serviceNodes.fields.ip', 'IP')}
            value={form.ip}
            onChange={(value) => setForm((current) => ({ ...current, ip: value }))}
          />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
              {t('admin.serviceNodes.fields.status', 'Status')}
            </span>
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as ServiceNodeStatus }))}
              className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
            >
              <option value="enabled">{t('admin.serviceNodes.status.enabled', 'Enabled')}</option>
              <option value="disabled">{t('admin.serviceNodes.status.disabled', 'Disabled')}</option>
            </select>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">
              {t('admin.serviceNodes.fields.remark', 'Remark')}
            </span>
            <textarea
              value={form.remark}
              onChange={(event) => setForm((current) => ({ ...current, remark: event.target.value }))}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
            />
          </label>
        </div>

        {error ? (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
          >
            {t('common.actions.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? t('common.actions.saving', 'Saving...') : t('common.actions.save', 'Save')}
          </button>
        </div>
      </form>
    </div>
  );
}

function TextField({
  autoFocus = false,
  label,
  onChange,
  value,
}: {
  autoFocus?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
      />
    </label>
  );
}

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
