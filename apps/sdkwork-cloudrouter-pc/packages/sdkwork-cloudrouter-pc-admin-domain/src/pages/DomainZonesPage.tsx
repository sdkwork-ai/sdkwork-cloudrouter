import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  FileCheck2,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  AdminTableShell,
  ConfirmDialog,
  resolveProblemMessage,
} from '@sdkwork/cloudroutes-pc-commons';

import {
  DomainField,
  DomainFormDialog,
  DomainIconButton,
  DomainInlineNotice,
  DomainPrimaryButton,
  DomainSecondaryButton,
  DomainSectionIntro,
  DomainSelect,
  DomainStateRows,
  DomainStatusPill,
  DomainTableHead,
  DomainTextInput,
} from '../components/domainUi';
import { VerificationFilesDialog } from '../components/VerificationFilesDialog';
import { domainCenterService } from '../domainService';
import {
  formatDomainCount,
  formatDomainDateTime,
  zoneVerificationRate,
} from '../domainFormat';
import {
  translateDomainLabel,
  zoneScopeLabel,
  zoneStatusLabel,
  zoneStatusTone,
} from '../domainLabels';
import type { DomainCloudAccount, DomainZone, DomainZoneStatus } from '../domainTypes';
import type { DomainCenterSectionId } from '../domainTypes';
import { useDomainCloudAccounts, useDomainZones } from '../hooks/useDomainResources';
import {
  toCreateZoneInput,
  validateZoneForm,
  type DomainZoneForm,
} from '../domainValidation';

const EMPTY_ZONE_FORM: DomainZoneForm = {
  apexHostname: '',
  displayName: '',
  dnsProvider: '',
  providerAccountId: '',
};

type ZoneFormState =
  | { mode: 'create'; zone?: undefined }
  | { mode: 'edit'; zone: DomainZone };

export function DomainZonesPage({
  initialZoneId,
  onNavigate,
}: {
  initialZoneId?: string;
  onNavigate: (section: DomainCenterSectionId, zoneId?: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const zones = useDomainZones();
  const accounts = useDomainCloudAccounts();
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'USER' | 'ALL'>('USER');
  const [statusFilter, setStatusFilter] = useState<DomainZoneStatus | 'ALL'>('ALL');
  const [formState, setFormState] = useState<ZoneFormState | null>(null);
  const [verificationZone, setVerificationZone] = useState<DomainZone | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DomainZone | null>(null);
  const [busyZoneId, setBusyZoneId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const locale = i18n.resolvedLanguage ?? 'en-US';

  useEffect(() => {
    if (!initialZoneId) {
      return;
    }
    const match = zones.data.find((zone) => zone.id === initialZoneId);
    if (!match) {
      return;
    }
    // Seed the search from the deep-linked zone once; a later reload must not
    // overwrite what the operator has typed.
    setSearch((current) => (current.trim().length === 0 ? match.apexHostname : current));
  }, [initialZoneId, zones.data]);

  const filteredZones = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return zones.data.filter((zone) => {
      if (scopeFilter === 'USER' && zone.scope !== 'USER') {
        return false;
      }
      if (statusFilter !== 'ALL' && zone.status !== statusFilter) {
        return false;
      }
      if (keyword.length === 0) {
        return true;
      }
      return (
        zone.apexHostname.toLowerCase().includes(keyword)
        || (zone.displayName ?? '').toLowerCase().includes(keyword)
        || (zone.dnsProvider ?? '').toLowerCase().includes(keyword)
      );
    });
  }, [zones.data, search, scopeFilter, statusFilter]);

  const toggleZoneStatus = async (zone: DomainZone) => {
    setBusyZoneId(zone.id);
    setActionError(null);
    try {
      await domainCenterService.updateZone(zone.id, {
        status: zone.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE',
      });
      zones.reload();
    } catch (cause) {
      setActionError(
        resolveProblemMessage(
          cause,
          t,
          t('admin.domainCenter.zones.errors.updateStatus', 'Domain status could not be changed'),
        ),
      );
    } finally {
      setBusyZoneId(null);
    }
  };

  const deleteZone = async () => {
    if (!deleteTarget) {
      return;
    }
    setBusyZoneId(deleteTarget.id);
    setActionError(null);
    try {
      await domainCenterService.deleteZone(deleteTarget.id);
      setDeleteTarget(null);
      zones.reload();
    } catch (cause) {
      setActionError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.zones.errors.delete', 'Domain could not be deleted')),
      );
    } finally {
      setBusyZoneId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <DomainSectionIntro
        title={t('admin.domainCenter.zones.title', 'Root domains')}
        description={t(
          'admin.domainCenter.zones.description',
          'A root domain (zone) is the registrable apex the platform serves. Register it once, pin the DNS account that proves ownership, then manage its hostnames, resolution records, and certificates.',
        )}
        actions={
          <>
            <DomainSecondaryButton onClick={zones.reload} disabled={zones.status === 'loading'}>
              <RefreshCw className={`h-4 w-4 ${zones.status === 'loading' ? 'animate-spin' : ''}`} />
              {t('admin.domainCenter.actions.refresh', 'Refresh')}
            </DomainSecondaryButton>
            <DomainPrimaryButton onClick={() => setFormState({ mode: 'create' })}>
              <Plus className="h-4 w-4" />
              {t('admin.domainCenter.actions.addZone', 'Register root domain')}
            </DomainPrimaryButton>
          </>
        }
      />

      {actionError ? <DomainInlineNotice tone="danger" title={actionError} /> : null}

      <AdminTableShell
        className="min-h-0 flex-1 rounded-xl dark:bg-[#1a1a1a]"
        header={
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
              <div className="relative min-w-0 flex-1 md:min-w-[200px] md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('admin.domainCenter.zones.search', 'Search root domain, name, or provider')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                />
              </div>
              <div className="w-full shrink-0 md:w-40">
                <DomainSelect
                  value={scopeFilter}
                  onChange={setScopeFilter}
                  options={[
                    { value: 'USER', label: t('admin.domainCenter.zones.filter.operator', 'Operator domains') },
                    { value: 'ALL', label: t('admin.domainCenter.zones.filter.allScopes', 'All scopes') },
                  ]}
                />
              </div>
              <div className="w-full shrink-0 md:w-40">
                <DomainSelect
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'ALL', label: t('admin.domainCenter.filters.allStatuses', 'All statuses') },
                    { value: 'ACTIVE', label: t('admin.domainCenter.status.active', 'Active') },
                    { value: 'PAUSED', label: t('admin.domainCenter.status.paused', 'Paused') },
                  ]}
                />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('admin.domainCenter.zones.count', '{{count}} root domains', { count: filteredZones.length })}
            </div>
          </div>
        }
      >
        <table className="w-full min-w-[1180px] whitespace-nowrap text-left text-sm">
          <DomainTableHead
            columns={[
              t('admin.domainCenter.columns.apexHostname', 'Root domain'),
              t('admin.domainCenter.columns.dnsProvider', 'DNS provider'),
              t('admin.domainCenter.columns.hostnames', 'Hostnames'),
              t('admin.domainCenter.columns.certificates', 'Certificates'),
              t('admin.domainCenter.columns.bindings', 'Bindings'),
              t('admin.domainCenter.columns.status', 'Status'),
              t('admin.domainCenter.columns.updatedAt', 'Updated'),
              t('admin.domainCenter.columns.actions', 'Actions'),
            ]}
          />
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
            {zones.status === 'loading' || zones.status === 'idle' ? (
              <DomainStateRows
                colSpan={8}
                kind="loading"
                title={t('admin.domainCenter.zones.loading', 'Loading root domains...')}
              />
            ) : zones.status === 'error' ? (
              <DomainStateRows
                colSpan={8}
                kind="error"
                title={t('admin.domainCenter.zones.loadError', 'Root domains could not be loaded')}
                description={resolveProblemMessage(zones.error, t, t('admin.domainCenter.errors.load', 'Request failed'))}
                onRetry={zones.reload}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : filteredZones.length === 0 ? (
              <DomainStateRows
                colSpan={8}
                kind="empty"
                title={t('admin.domainCenter.zones.empty', 'No root domain found')}
                description={t('admin.domainCenter.zones.emptyDesc', 'Register a root domain or adjust the filters.')}
                action={{
                  label: t('admin.domainCenter.actions.addZone', 'Register root domain'),
                  onClick: () => setFormState({ mode: 'create' }),
                }}
              />
            ) : (
              filteredZones.map((zone) => {
                const rate = Math.round(zoneVerificationRate(zone) * 100);
                // The platform publishing zone is provisioned by the deployment and shared by
                // every tenant; pausing or deleting it from an operator surface would break
                // app publishing, so those two actions stay with the deployment itself.
                const platformManaged = zone.scope === 'PLATFORM';
                const pin = zone.providerAccountId
                  ? accounts.data.find((account) => account.id === zone.providerAccountId)?.displayName
                    ?? zone.providerAccountId
                  : t('admin.domainCenter.zones.autoAccount', 'Resolved per issuance');
                return (
                  <tr key={zone.id} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-start gap-2">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-lobster-500" />
                        <div className="min-w-0">
                          <div className="font-mono text-[12px] font-semibold text-slate-900 dark:text-white">
                            {zone.apexHostname}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>{zone.displayName || '—'}</span>
                            <DomainStatusPill
                              label={translateDomainLabel(t, zoneScopeLabel(zone.scope))}
                              tone={zone.scope === 'PLATFORM' ? 'info' : 'neutral'}
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-700 dark:text-slate-200">{zone.dnsProvider || '—'}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{pin}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="tabular-nums">
                        {formatDomainCount(zone.verifiedHostnameCount)}/{formatDomainCount(zone.hostnameCount)}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <div className="h-1 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{formatDomainCount(zone.certificateCount)}</td>
                    <td className="px-4 py-3 tabular-nums">{formatDomainCount(zone.bindingCount)}</td>
                    <td className="px-4 py-3">
                      <DomainStatusPill
                        label={translateDomainLabel(t, zoneStatusLabel(zone.status))}
                        tone={zoneStatusTone(zone.status)}
                      />
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {formatDomainDateTime(zone.updatedAt, locale)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <DomainIconButton
                          label={t('admin.domainCenter.zones.actions.hostnames', 'Manage hostnames')}
                          onClick={() => onNavigate('hostnames', zone.id)}
                        >
                          <BadgeCheck className="h-4 w-4" />
                        </DomainIconButton>
                        <DomainIconButton
                          label={t('admin.domainCenter.zones.actions.dns', 'Manage DNS records')}
                          onClick={() => onNavigate('dns', zone.id)}
                        >
                          <FileCheck2 className="h-4 w-4" />
                        </DomainIconButton>
                        <DomainIconButton
                          label={t('admin.domainCenter.zones.actions.verificationFiles', 'Verification files')}
                          onClick={() => setVerificationZone(zone)}
                        >
                          <ShieldCheck className="h-4 w-4" />
                        </DomainIconButton>
                        <DomainIconButton
                          label={t('admin.domainCenter.actions.edit', 'Edit')}
                          onClick={() => setFormState({ mode: 'edit', zone })}
                        >
                          <Pencil className="h-4 w-4" />
                        </DomainIconButton>
                        <DomainIconButton
                          label={platformManaged
                            ? t('admin.domainCenter.zones.platformManaged', 'Provisioned by the platform')
                            : zone.status === 'ACTIVE'
                              ? t('admin.domainCenter.actions.pause', 'Pause')
                              : t('admin.domainCenter.actions.resume', 'Resume')}
                          disabled={platformManaged || busyZoneId === zone.id}
                          onClick={() => void toggleZoneStatus(zone)}
                        >
                          <Power className="h-4 w-4" />
                        </DomainIconButton>
                        <DomainIconButton
                          label={platformManaged
                            ? t('admin.domainCenter.zones.platformManaged', 'Provisioned by the platform')
                            : t('common.actions.delete', 'Delete')}
                          tone="danger"
                          disabled={platformManaged || busyZoneId === zone.id}
                          onClick={() => setDeleteTarget(zone)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </DomainIconButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {formState ? (
        <ZoneFormDialog
          state={formState}
          accounts={accounts.data}
          onClose={() => setFormState(null)}
          onSaved={() => {
            setFormState(null);
            zones.reload();
          }}
        />
      ) : null}

      {verificationZone ? (
        <VerificationFilesDialog
          zone={verificationZone}
          onClose={() => setVerificationZone(null)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          tone="danger"
          title={t('admin.domainCenter.zones.delete.title', 'Delete root domain')}
          description={t(
            'admin.domainCenter.zones.delete.description',
            'Deleting {{hostname}} withdraws its ownership record and removes every hostname, resolution snapshot, and binding under it. Certificates must be removed first.',
            { hostname: deleteTarget.apexHostname },
          )}
          confirmLabel={t('common.actions.delete', 'Delete')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          isBusy={busyZoneId === deleteTarget.id}
          icon={<Trash2 className="h-4 w-4" />}
          onConfirm={() => void deleteZone()}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}

function ZoneFormDialog({
  state,
  accounts,
  onClose,
  onSaved,
}: {
  state: ZoneFormState;
  accounts: readonly DomainCloudAccount[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DomainZoneForm>(() =>
    state.mode === 'edit'
      ? {
          apexHostname: state.zone.apexHostname,
          displayName: state.zone.displayName ?? '',
          dnsProvider: state.zone.dnsProvider ?? '',
          providerAccountId: state.zone.providerAccountId ?? '',
        }
      : EMPTY_ZONE_FORM,
  );
  const [status, setStatus] = useState<DomainZoneStatus>(state.mode === 'edit' ? state.zone.status : 'ACTIVE');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const nextErrors = validateZoneForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      if (state.mode === 'create') {
        await domainCenterService.createZone(toCreateZoneInput(form));
      } else {
        await domainCenterService.updateZone(state.zone.id, {
          displayName: form.displayName.trim(),
          dnsProvider: form.dnsProvider.trim(),
          providerAccountId: form.providerAccountId.trim(),
          status,
        });
      }
      onSaved();
    } catch (cause) {
      setSubmitError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.zones.errors.save', 'Root domain could not be saved')),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DomainFormDialog
      wide
      busy={busy}
      onClose={onClose}
      title={state.mode === 'create'
        ? t('admin.domainCenter.zones.dialog.createTitle', 'Register root domain')
        : t('admin.domainCenter.zones.dialog.editTitle', 'Edit root domain')}
      description={t(
        'admin.domainCenter.zones.dialog.description',
        'The apex is stored as a lower-case ASCII (punycode) name. Pin the cloud account that presents DNS-01 challenges and ownership TXT records; leave it empty to resolve an account per issuance.',
      )}
      footer={
        <>
          <DomainSecondaryButton onClick={onClose} disabled={busy}>
            {t('common.actions.cancel', 'Cancel')}
          </DomainSecondaryButton>
          <DomainPrimaryButton onClick={() => void submit()} disabled={busy}>
            {busy ? t('common.actions.saving', 'Saving...') : t('common.actions.save', 'Save')}
          </DomainPrimaryButton>
        </>
      }
    >
      {submitError ? <DomainInlineNotice tone="danger" title={submitError} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <DomainField
          required
          label={t('admin.domainCenter.zones.fields.apexHostname', 'Root domain (apex)')}
          hint={t('admin.domainCenter.zones.fields.apexHostnameHint', 'example.com — wildcards and subdomains are rejected')}
          error={errors.apexHostname ? t(errors.apexHostname, 'Invalid root domain') : undefined}
        >
          <DomainTextInput
            mono
            autoFocus
            disabled={state.mode === 'edit' || busy}
            value={form.apexHostname}
            onChange={(value) => setForm((current) => ({ ...current, apexHostname: value }))}
            placeholder="example.com"
          />
        </DomainField>
        <DomainField
          label={t('admin.domainCenter.zones.fields.displayName', 'Display name')}
          error={errors.displayName ? t(errors.displayName, 'Invalid display name') : undefined}
        >
          <DomainTextInput
            disabled={busy}
            value={form.displayName}
            onChange={(value) => setForm((current) => ({ ...current, displayName: value }))}
            placeholder={t('admin.domainCenter.zones.fields.displayNamePlaceholder', 'Primary site')}
          />
        </DomainField>
        <DomainField
          label={t('admin.domainCenter.zones.fields.dnsProvider', 'DNS provider')}
          hint={t('admin.domainCenter.zones.fields.dnsProviderHint', 'Provider family used for record sync and DNS-01')}
        >
          <DomainSelect
            value={form.dnsProvider}
            onChange={(value) => setForm((current) => ({ ...current, dnsProvider: value }))}
            options={[
              { value: '', label: t('admin.domainCenter.zones.dnsProvider.deploymentDefault', 'Deployment default') },
              { value: 'ALIYUN_DNS', label: 'Aliyun DNS' },
              { value: 'DNSPOD', label: 'DNSPod' },
              { value: 'CLOUDFLARE', label: 'Cloudflare' },
            ]}
          />
        </DomainField>
        <DomainField
          label={t('admin.domainCenter.zones.fields.providerAccount', 'DNS cloud account')}
          hint={t('admin.domainCenter.zones.fields.providerAccountHint', 'Only accounts with an active credential can be pinned')}
        >
          <DomainSelect
            value={form.providerAccountId}
            onChange={(value) => setForm((current) => ({ ...current, providerAccountId: value }))}
            options={[
              { value: '', label: t('admin.domainCenter.zones.autoAccount', 'Resolved per issuance') },
              ...accounts.map((account) => {
                const usable =
                  account.status === 'active'
                  && account.credentialConfigured
                  && Boolean(account.dnsProvider);
                const pinned = account.id === form.providerAccountId;
                return {
                  value: account.id,
                  label: `${account.displayName}${account.dnsProvider ? ` · ${account.dnsProvider}` : ''}${
                    usable ? '' : ` · ${t('admin.domainCenter.zones.unusableAccount', 'unavailable')}`
                  }`,
                  disabled: !usable && !pinned,
                };
              }),
            ]}
          />
        </DomainField>
        {state.mode === 'edit' ? (
          <DomainField label={t('admin.domainCenter.columns.status', 'Status')}>
            <DomainSelect
              value={status}
              onChange={setStatus}
              options={[
                { value: 'ACTIVE', label: t('admin.domainCenter.status.active', 'Active') },
                { value: 'PAUSED', label: t('admin.domainCenter.status.paused', 'Paused') },
              ]}
            />
          </DomainField>
        ) : null}
      </div>
      {state.mode === 'edit' ? (
        <DomainInlineNotice
          tone="info"
          title={t('admin.domainCenter.zones.dialog.apexImmutable', 'The apex cannot be renamed')}
          description={t(
            'admin.domainCenter.zones.dialog.apexImmutableDesc',
            'Register the new apex as its own root domain and migrate hostnames; the old ownership proof would otherwise be invalidated silently.',
          )}
        />
      ) : null}
    </DomainFormDialog>
  );
}
