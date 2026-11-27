import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, RefreshCw, Server, Trash2 } from 'lucide-react';

import { BusinessStateTableRow } from '@sdkwork/cloudroutes-pc-commons';
import { ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons/components/ConfirmDialog';
import { getCloudRouterSandboxAppClient } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import type {
  SandboxInstance,
  SandboxInstancesClient,
  SandboxInstanceState,
  SandboxRuntimeCapability,
} from '@sdkwork/cloudroutes-pc-commons/sandbox-instances-client';
import { SANDBOX_INSTANCE_STATES } from '@sdkwork/cloudroutes-pc-commons/sandbox-instances-client';

import { VmInstanceForm, type VmInstanceFormSubmit } from './VmInstanceForm.tsx';
import {
  VM_INSTANCE_PAGE_SIZES,
  isVmInstanceDeletable,
  vmInstanceTotalItems,
} from './vmInstancesModel.ts';

export interface VmInstancesConsoleViewProps {
  /** Test seam: inject a client bound to a stub transport. */
  client?: SandboxInstancesClient;
}

/** Cap on badges drawn in the capabilities cell before the overflow pill. */
const VM_INSTANCE_CAPABILITY_BADGE_LIMIT = 3;

/** Status pill tone per lifecycle state; `suspended`/`terminated` stay neutral. */
const STATE_TONE: Readonly<Record<SandboxInstanceState, string>> = {
  active:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  failed:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300',
  requested:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
  suspended:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
  terminated:
    'border-slate-200 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400',
};

const BADGE_CLASS =
  'inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';
const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg bg-lobster-600 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-60';
const SECONDARY_BUTTON_CLASS =
  'inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10';
const SELECT_CLASS =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-700 outline-none transition-colors focus:border-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-200';

function messageOf(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Expiry as a local timestamp.
 *
 * Rendered in the browser's locale and zone because that is the clock the
 * operator booked the expiry against; the wire value stays UTC. An unparsable
 * value shows the raw string rather than "Invalid Date", so a server-side format
 * change is visible instead of disguised.
 */
function formatExpiresAt(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

function CapabilityBadges({
  capabilities,
}: {
  capabilities: readonly SandboxRuntimeCapability[];
}) {
  const { t } = useTranslation();
  if (capabilities.length === 0) {
    return <span className={BADGE_CLASS}>{t('console.vmInstances.capability.none')}</span>;
  }
  const shown = capabilities.slice(0, VM_INSTANCE_CAPABILITY_BADGE_LIMIT);
  const overflow = capabilities.length - shown.length;
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((capability) => (
        <span className={BADGE_CLASS} key={capability}>
          {t(`console.vmInstances.capability.${capability}`)}
        </span>
      ))}
      {overflow > 0 ? (
        <span className={BADGE_CLASS}>
          {t('console.vmInstances.capability.overflow', { count: overflow })}
        </span>
      ) : null}
    </span>
  );
}

/**
 * A failed read and a failed command are different facts, and they belong to
 * different surfaces: the read owns the table body — a listing that could not be
 * read is not an empty listing — while a command owns the banner above it.
 */
type ConsoleError = { kind: 'action' | 'read'; message: string };

/**
 * Cloud Router user-console page for the caller's VM instances.
 *
 * `sandbox_instance` is the per-user half of sdkwork-sandbox: the virtual machine
 * (VM) runtimes one account provisioned. The collection is served by that
 * module's own app-api face (`/app/v3/api/sandbox/sandbox_instances`), and the
 * tenant and owner are taken from the verified principal — nothing here sends
 * either, so this page cannot ask for another account's rows even by accident.
 */
export function VmInstancesConsoleView({ client }: VmInstancesConsoleViewProps = {}) {
  const { t } = useTranslation();
  const resolvedClient = useMemo(() => client ?? getCloudRouterSandboxAppClient(), [client]);
  const [rows, setRows] = useState<readonly SandboxInstance[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(VM_INSTANCE_PAGE_SIZES[0]);
  const [stateFilter, setStateFilter] = useState<SandboxInstanceState | ''>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ConsoleError | null>(null);
  const [drawer, setDrawer] = useState<
    { kind: 'create' } | { kind: 'edit'; instance: SandboxInstance } | null
  >(null);
  const [deleteTarget, setDeleteTarget] = useState<SandboxInstance | null>(null);
  // Bumped after every mutation. Reloading through a token instead of calling a
  // loader directly means a mutation that also changes `page` (provisioning jumps
  // back to page 1) still results in exactly one request, and there is no second
  // code path that can forget the active filter.
  const [refreshToken, setRefreshToken] = useState(0);

  // Guards a slow response from an abandoned page/filter pair overwriting a newer
  // one: the request that is no longer current resolves after the one that is.
  const requestSeq = useRef(0);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);

  useEffect(() => {
    const seq = requestSeq.current + 1;
    requestSeq.current = seq;
    let cancelled = false;
    setLoading(true);
    resolvedClient
      .list({
        page,
        pageSize,
        ...(stateFilter ? { sandboxInstanceState: stateFilter } : {}),
      })
      .then((result) => {
        if (cancelled || requestSeq.current !== seq) return;
        setRows([...result.items]);
        setTotalItems(vmInstanceTotalItems(result.pageInfo));
        setError(null);
      })
      .catch((cause: unknown) => {
        if (cancelled || requestSeq.current !== seq) return;
        setRows([]);
        setTotalItems(0);
        setError({ kind: 'read', message: messageOf(cause) });
      })
      .finally(() => {
        if (cancelled || requestSeq.current !== seq) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [resolvedClient, page, pageSize, refreshToken, stateFilter]);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const filterActive = stateFilter !== '';
  const readCause = error?.kind === 'read' ? error.message : null;
  const actionError = error?.kind === 'action' ? error.message : null;

  async function submitDraft(submit: VmInstanceFormSubmit) {
    const editingInstance = drawer?.kind === 'edit' ? drawer.instance : null;
    setBusy(true);
    setError(null);
    try {
      if (submit.kind === 'create') {
        await resolvedClient.create(submit.input);
        // A new row lands on page 1 of the server's ordering; staying on page 3
        // would look like the provisioning did nothing.
        setPage(1);
      } else if (editingInstance) {
        await resolvedClient.update(editingInstance.sandboxInstanceId, submit.input);
      }
      setDrawer(null);
      refresh();
    } catch (cause) {
      setError({
        kind: 'action',
        message: `${submit.kind === 'create' ? t('console.vmInstances.error.create') : t('console.vmInstances.error.update')} ${messageOf(cause)}`,
      });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    setBusy(true);
    setError(null);
    try {
      await resolvedClient.remove(target.sandboxInstanceId);
      setDeleteTarget(null);
      // Deleting the last row of a page would otherwise leave the table showing an
      // empty page that the server no longer has.
      if (rows.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        refresh();
      }
    } catch (cause) {
      setDeleteTarget(null);
      setError({
        kind: 'action',
        message: `${t('console.vmInstances.error.delete')} ${messageOf(cause)}`,
      });
    } finally {
      setBusy(false);
    }
  }

  const emptyState = readCause !== null ? (
    // An unreadable listing is not an empty listing: a refused read must never be
    // painted as the reassuring "you have none yet" frame.
    <BusinessStateTableRow
      colSpan={7}
      description={`${t('console.vmInstances.error.unavailable')} ${readCause}`}
      kind="error"
      onRetry={refresh}
      retryLabel={t('console.vmInstances.actions.retry')}
      title={t('console.vmInstances.error.load')}
    />
  ) : loading ? (
    <BusinessStateTableRow
      colSpan={7}
      kind="loading"
      title={t('console.vmInstances.loading')}
    />
  ) : filterActive ? (
    <BusinessStateTableRow
      action={{ label: t('console.vmInstances.filter.clear'), onClick: () => setStateFilter('') }}
      colSpan={7}
      description={t('console.vmInstances.filter.emptyDescription')}
      kind="empty"
      title={t('console.vmInstances.filter.emptyTitle')}
    />
  ) : (
    <BusinessStateTableRow
      action={{ label: t('console.vmInstances.empty.action'), onClick: () => setDrawer({ kind: 'create' }) }}
      colSpan={7}
      description={t('console.vmInstances.empty.description')}
      kind="empty"
      title={t('console.vmInstances.empty.title')}
    />
  );

  return (
    <section
      className="flex h-full min-h-0 w-full min-w-0 flex-col gap-4"
      data-cloudrouter-vm-instances
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {t('console.vmInstances.title')}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t('console.vmInstances.description')}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label={t('console.vmInstances.filter.label')}
            className={SELECT_CLASS}
            disabled={loading || busy}
            onChange={(event) => {
              setStateFilter(event.target.value as SandboxInstanceState | '');
              setPage(1);
            }}
            value={stateFilter}
          >
            <option value="">{t('console.vmInstances.filter.all')}</option>
            {SANDBOX_INSTANCE_STATES.map((state) => (
              <option key={state} value={state}>
                {t(`console.vmInstances.state.${state}`)}
              </option>
            ))}
          </select>
          <button
            className={SECONDARY_BUTTON_CLASS}
            disabled={loading || busy}
            onClick={refresh}
            type="button"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('console.vmInstances.actions.refresh')}
          </button>
          <button
            className={PRIMARY_BUTTON_CLASS}
            disabled={busy}
            onClick={() => setDrawer({ kind: 'create' })}
            type="button"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('console.vmInstances.actions.create')}
          </button>
        </div>
      </header>

      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        {t('console.vmInstances.ownerScope')}
      </p>

      {actionError ? (
        <p
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
          role="alert"
        >
          {actionError}
        </p>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1a1a1a]">
        <table className="w-full min-w-[900px] border-collapse text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3" scope="col">{t('console.vmInstances.column.name')}</th>
              <th className="px-4 py-3" scope="col">{t('console.vmInstances.column.state')}</th>
              <th className="px-4 py-3" scope="col">{t('console.vmInstances.column.runtimeKind')}</th>
              <th className="px-4 py-3" scope="col">{t('console.vmInstances.column.profile')}</th>
              <th className="px-4 py-3" scope="col">{t('console.vmInstances.column.resources')}</th>
              <th className="px-4 py-3" scope="col">{t('console.vmInstances.column.capabilities')}</th>
              <th className="px-4 py-3" scope="col">{t('console.vmInstances.column.expiresAt')}</th>
              <th className="px-4 py-3 text-right" scope="col">{t('console.vmInstances.column.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {rows.length === 0 ? (
              emptyState
            ) : (
              rows.map((instance) => {
                const deletable = isVmInstanceDeletable(instance.sandboxInstanceState);
                return (
                  <tr
                    className="align-top transition-colors hover:bg-slate-50/70 dark:hover:bg-white/5"
                    data-vm-instance-id={instance.sandboxInstanceId}
                    key={instance.sandboxInstanceId}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <Server className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900 dark:text-white">
                            {instance.sandboxInstanceName}
                          </div>
                          <div
                            className="mt-0.5 truncate font-mono text-[11px] text-slate-400 dark:text-slate-500"
                            title={instance.sandboxInstanceId}
                          >
                            {instance.sandboxInstanceId}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATE_TONE[instance.sandboxInstanceState]}`}
                      >
                        {t(`console.vmInstances.state.${instance.sandboxInstanceState}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700 dark:text-slate-200">
                        {t(`console.vmInstances.runtimeKind.${instance.sandboxInstanceRuntimeKind}`)}
                      </div>
                      <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500">
                        {t(`console.vmInstances.assurance.${instance.sandboxInstanceMinimumAssurance}`)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {t(`console.vmInstances.profile.${instance.sandboxInstanceProfile}`)}
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {t('console.vmInstances.resources.summary', {
                        vcpu: instance.sandboxInstanceVcpuCount,
                        memory: instance.sandboxInstanceMemoryMb,
                        disk: instance.sandboxInstanceDiskMb,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <CapabilityBadges capabilities={instance.sandboxInstanceRequiredCapabilities} />
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">
                      {instance.sandboxInstanceExpiresAt
                        ? formatExpiresAt(instance.sandboxInstanceExpiresAt)
                        : t('console.vmInstances.expiresAt.never')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          className={SECONDARY_BUTTON_CLASS}
                          disabled={busy}
                          onClick={() => setDrawer({ kind: 'edit', instance })}
                          type="button"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          {t('console.vmInstances.actions.edit')}
                        </button>
                        <button
                          className={SECONDARY_BUTTON_CLASS}
                          disabled={busy || !deletable}
                          onClick={() => setDeleteTarget(instance)}
                          title={
                            deletable
                              ? undefined
                              : t('console.vmInstances.dialog.deleteBlocked')
                          }
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          {t('console.vmInstances.actions.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {t('console.vmInstances.pagination.pageSize')}
          <select
            aria-label={t('console.vmInstances.pagination.pageSize')}
            className={SELECT_CLASS}
            disabled={loading || busy}
            onChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(1);
            }}
            value={pageSize}
          >
            {VM_INSTANCE_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {t('console.vmInstances.pagination.pageInfo', {
              page,
              pages: totalPages,
              total: totalItems,
            })}
          </span>
          <button
            className={SECONDARY_BUTTON_CLASS}
            disabled={loading || busy || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            {t('console.vmInstances.pagination.previous')}
          </button>
          <button
            className={SECONDARY_BUTTON_CLASS}
            disabled={loading || busy || page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            type="button"
          >
            {t('console.vmInstances.pagination.next')}
          </button>
        </div>
      </footer>

      {drawer ? (
        <div
          className="fixed inset-0 z-[70] flex justify-end bg-slate-950/40 backdrop-blur-sm"
          onPointerDown={(event) => {
            if (!busy && event.target === event.currentTarget) setDrawer(null);
          }}
        >
          <div
            aria-labelledby="vm-instance-drawer-title"
            aria-modal="true"
            className="flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]"
            role="dialog"
          >
            <header className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div className="min-w-0">
                <h2
                  className="text-base font-bold text-slate-900 dark:text-white"
                  id="vm-instance-drawer-title"
                >
                  {drawer.kind === 'edit'
                    ? t('console.vmInstances.drawer.editTitle')
                    : t('console.vmInstances.drawer.createTitle')}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                  {drawer.kind === 'edit'
                    ? t('console.vmInstances.drawer.editDescription', {
                        name: drawer.instance.sandboxInstanceName,
                      })
                    : t('console.vmInstances.drawer.createDescription')}
                </p>
              </div>
              <button
                aria-label={t('console.vmInstances.actions.close')}
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed dark:hover:bg-white/10 dark:hover:text-white"
                disabled={busy}
                onClick={() => setDrawer(null)}
                type="button"
              >
                <span aria-hidden="true">✕</span>
              </button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col">
              <VmInstanceForm
                busy={busy}
                instance={drawer.kind === 'edit' ? drawer.instance : null}
                onCancel={() => {
                  if (!busy) setDrawer(null);
                }}
                onSubmit={(submit) => {
                  void submitDraft(submit);
                }}
              />
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          cancelLabel={t('console.vmInstances.actions.cancel')}
          confirmLabel={t('console.vmInstances.actions.delete')}
          description={t('console.vmInstances.dialog.deleteDescription', {
            name: deleteTarget.sandboxInstanceName,
          })}
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={busy}
          onCancel={() => {
            if (!busy) setDeleteTarget(null);
          }}
          onConfirm={() => {
            void confirmDelete();
          }}
          title={t('console.vmInstances.dialog.deleteTitle')}
          tone="danger"
        />
      ) : null}
    </section>
  );
}
