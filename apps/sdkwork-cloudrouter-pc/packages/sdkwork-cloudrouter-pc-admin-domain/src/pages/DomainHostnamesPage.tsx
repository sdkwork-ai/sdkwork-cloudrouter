import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Globe2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  AdminTableShell,
  ConfirmDialog,
  CopyButton,
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
import { domainCenterService } from '../domainService';
import { formatDomainCount, formatDomainDateTime } from '../domainFormat';
import {
  hostnameTypeLabel,
  translateDomainLabel,
  verificationStatusLabel,
  verificationStatusTone,
} from '../domainLabels';
import type {
  DomainCenterSectionId,
  DomainHostname,
  DomainVerifyResult,
} from '../domainTypes';
import { useDomainZones } from '../hooks/useDomainResources';
import {
  isValidRelativeName,
  normalizeRelativeName,
  type DomainFieldErrors,
} from '../domainValidation';

export function DomainHostnamesPage({
  initialZoneId,
  onNavigate,
}: {
  initialZoneId?: string;
  onNavigate: (section: DomainCenterSectionId, zoneId?: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const zones = useDomainZones();
  const [selectedZoneId, setSelectedZoneId] = useState(initialZoneId ?? '');
  const [hostnames, setHostnames] = useState<DomainHostname[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [search, setSearch] = useState('');
  const [verificationFilter, setVerificationFilter] = useState<'ALL' | 'PENDING' | 'VERIFIED'>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DomainHostname | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DomainHostname | null>(null);
  const [verifyResult, setVerifyResult] = useState<{ hostname: DomainHostname; result: DomainVerifyResult } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const locale = i18n.resolvedLanguage ?? 'en-US';

  useEffect(() => {
    if (selectedZoneId || zones.status !== 'ready') {
      return;
    }
    const first = zones.data.find((zone) => zone.scope === 'USER') ?? zones.data[0];
    if (first) {
      setSelectedZoneId(first.id);
    }
  }, [selectedZoneId, zones.data, zones.status]);

  useEffect(() => {
    if (!selectedZoneId) {
      setHostnames([]);
      return;
    }
    let active = true;
    setLoading(true);
    setError(null);
    domainCenterService
      .listAllHostnames(selectedZoneId)
      .then((items) => {
        if (active) {
          setHostnames(items);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setError(cause);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [selectedZoneId, reloadToken]);

  const selectedZone = zones.zoneById.get(selectedZoneId);
  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return hostnames.filter((hostname) => {
      if (verificationFilter !== 'ALL' && hostname.verificationStatus !== verificationFilter) {
        return false;
      }
      return keyword.length === 0 || hostname.hostname.toLowerCase().includes(keyword);
    });
  }, [hostnames, search, verificationFilter]);

  const verifyHostname = async (hostname: DomainHostname) => {
    setBusyId(hostname.id);
    setActionError(null);
    try {
      const result = await domainCenterService.verifyHostname(hostname.zoneId, hostname.id);
      setVerifyResult({ hostname, result });
      setReloadToken((token) => token + 1);
    } catch (cause) {
      setActionError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.hostnames.errors.verify', 'Ownership could not be verified')),
      );
    } finally {
      setBusyId(null);
    }
  };

  const deleteHostname = async () => {
    if (!deleteTarget) {
      return;
    }
    setBusyId(deleteTarget.id);
    setActionError(null);
    try {
      await domainCenterService.deleteHostname(deleteTarget.zoneId, deleteTarget.id);
      setHostnames((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setActionError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.hostnames.errors.delete', 'Hostname could not be deleted')),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <DomainSectionIntro
        title={t('admin.domainCenter.hostnames.title', 'Hostnames')}
        description={t(
          'admin.domainCenter.hostnames.description',
          'Hostnames are the exact or wildcard names inside a registered root domain. Each one proves ownership through a DNS TXT record before it can back a certificate or an application binding.',
        )}
        actions={
          <>
            <DomainSecondaryButton onClick={() => setReloadToken((token) => token + 1)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('admin.domainCenter.actions.refresh', 'Refresh')}
            </DomainSecondaryButton>
            <DomainPrimaryButton onClick={() => setCreateOpen(true)} disabled={!selectedZoneId}>
              <Plus className="h-4 w-4" />
              {t('admin.domainCenter.hostnames.actions.create', 'Add hostname')}
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
              <div className="w-full shrink-0 md:w-64">
                <DomainSelect
                  value={selectedZoneId}
                  onChange={setSelectedZoneId}
                  options={
                    zones.data.length === 0
                      ? [{ value: '', label: t('admin.domainCenter.hostnames.noZone', 'No root domain') }]
                      : zones.data.map((zone) => ({ value: zone.id, label: zone.apexHostname }))
                  }
                />
              </div>
              <div className="relative min-w-0 flex-1 md:min-w-[200px] md:max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('admin.domainCenter.hostnames.search', 'Search hostname')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                />
              </div>
              <div className="w-full shrink-0 md:w-48">
                <DomainSelect
                  value={verificationFilter}
                  onChange={setVerificationFilter}
                  options={[
                    { value: 'ALL', label: t('admin.domainCenter.filters.allVerification', 'All verification states') },
                    { value: 'PENDING', label: t('admin.domainCenter.status.pending', 'Pending') },
                    { value: 'VERIFIED', label: t('admin.domainCenter.status.verified', 'Verified') },
                  ]}
                />
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {selectedZone
                ? t('admin.domainCenter.hostnames.zoneHint', '{{count}} hostnames under {{apex}}', {
                    count: Number(formatDomainCount(selectedZone.hostnameCount)),
                    apex: selectedZone.apexHostname,
                  })
                : null}
            </div>
          </div>
        }
      >
        <table className="w-full min-w-[1120px] whitespace-nowrap text-left text-sm">
          <DomainTableHead
            columns={[
              t('admin.domainCenter.columns.hostname', 'Hostname'),
              t('admin.domainCenter.columns.relativeName', 'Relative name'),
              t('admin.domainCenter.columns.type', 'Type'),
              t('admin.domainCenter.columns.verification', 'Verification'),
              t('admin.domainCenter.columns.verifiedAt', 'Verified at'),
              t('admin.domainCenter.columns.certificates', 'Certificates'),
              t('admin.domainCenter.columns.bindings', 'Bindings'),
              t('admin.domainCenter.columns.updatedAt', 'Updated'),
              t('admin.domainCenter.columns.actions', 'Actions'),
            ]}
          />
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
            {zones.status === 'error' ? (
              <DomainStateRows
                colSpan={9}
                kind="error"
                title={t('admin.domainCenter.hostnames.zoneLoadError', 'Root domains could not be loaded')}
                description={resolveProblemMessage(zones.error, t, t('admin.domainCenter.errors.load', 'Request failed'))}
                onRetry={zones.reload}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : loading ? (
              <DomainStateRows
                colSpan={9}
                kind="loading"
                title={t('admin.domainCenter.hostnames.loading', 'Loading hostnames...')}
              />
            ) : error ? (
              <DomainStateRows
                colSpan={9}
                kind="error"
                title={t('admin.domainCenter.hostnames.loadError', 'Hostnames could not be loaded')}
                description={resolveProblemMessage(error, t, t('admin.domainCenter.errors.load', 'Request failed'))}
                onRetry={() => setReloadToken((token) => token + 1)}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : !selectedZoneId ? (
              <DomainStateRows
                colSpan={9}
                kind="empty"
                title={t('admin.domainCenter.hostnames.emptyNoZone', 'Register a root domain first')}
                description={t(
                  'admin.domainCenter.hostnames.emptyNoZoneDesc',
                  'A hostname always belongs to a registered root domain.',
                )}
                action={{
                  label: t('admin.domainCenter.actions.addZone', 'Register root domain'),
                  onClick: () => onNavigate('zones'),
                }}
              />
            ) : filtered.length === 0 ? (
              <DomainStateRows
                colSpan={9}
                kind="empty"
                title={t('admin.domainCenter.hostnames.empty', 'No hostname found')}
                description={t('admin.domainCenter.hostnames.emptyDesc', 'Add a hostname or adjust the filters.')}
                action={{
                  label: t('admin.domainCenter.hostnames.actions.create', 'Add hostname'),
                  onClick: () => setCreateOpen(true),
                }}
              />
            ) : (
              filtered.map((hostname) => (
                <tr key={hostname.id} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Globe2 className="h-4 w-4 shrink-0 text-lobster-500" />
                      <span className="font-mono text-[12px] font-semibold text-slate-900 dark:text-white">
                        {hostname.hostname}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[12px]">{hostname.relativeName}</td>
                  <td className="px-4 py-3">
                    <DomainStatusPill
                      label={translateDomainLabel(t, hostnameTypeLabel(hostname.hostnameType))}
                      tone={hostname.hostnameType === 'WILDCARD' ? 'info' : 'neutral'}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <DomainStatusPill
                      label={translateDomainLabel(t, verificationStatusLabel(hostname.verificationStatus))}
                      tone={verificationStatusTone(hostname.verificationStatus)}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {formatDomainDateTime(hostname.verifiedAt, locale)}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{formatDomainCount(hostname.certificateCount)}</td>
                  <td className="px-4 py-3 tabular-nums">{formatDomainCount(hostname.bindingCount)}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                    {formatDomainDateTime(hostname.updatedAt, locale)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <DomainIconButton
                        label={t('admin.domainCenter.hostnames.actions.verify', 'Verify ownership')}
                        disabled={busyId === hostname.id || hostname.verificationStatus === 'VERIFIED'}
                        onClick={() => void verifyHostname(hostname)}
                      >
                        <BadgeCheck className="h-4 w-4" />
                      </DomainIconButton>
                      <DomainIconButton
                        label={t('common.actions.edit', 'Edit')}
                        onClick={() => setRenameTarget(hostname)}
                      >
                        <Pencil className="h-4 w-4" />
                      </DomainIconButton>
                      <DomainIconButton
                        label={t('common.actions.delete', 'Delete')}
                        tone="danger"
                        disabled={busyId === hostname.id}
                        onClick={() => setDeleteTarget(hostname)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </DomainIconButton>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </AdminTableShell>

      {createOpen && selectedZoneId ? (
        <HostnameFormDialog
          zoneId={selectedZoneId}
          mode="create"
          onClose={() => setCreateOpen(false)}
          onSaved={() => {
            setCreateOpen(false);
            setReloadToken((token) => token + 1);
          }}
        />
      ) : null}

      {renameTarget ? (
        <HostnameFormDialog
          zoneId={renameTarget.zoneId}
          mode="rename"
          hostname={renameTarget}
          onClose={() => setRenameTarget(null)}
          onSaved={() => {
            setRenameTarget(null);
            setReloadToken((token) => token + 1);
          }}
        />
      ) : null}

      {verifyResult ? (
        <VerifyResultDialog value={verifyResult} onClose={() => setVerifyResult(null)} />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          tone="danger"
          title={t('admin.domainCenter.hostnames.delete.title', 'Delete hostname')}
          description={t(
            'admin.domainCenter.hostnames.delete.description',
            'Deleting {{hostname}} withdraws its ownership record. It must not be bound to an application or referenced by a certificate.',
            { hostname: deleteTarget.hostname },
          )}
          confirmLabel={t('common.actions.delete', 'Delete')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          isBusy={busyId === deleteTarget.id}
          icon={<Trash2 className="h-4 w-4" />}
          onConfirm={() => void deleteHostname()}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}

function HostnameFormDialog({
  zoneId,
  mode,
  hostname,
  onClose,
  onSaved,
}: {
  zoneId: string;
  mode: 'create' | 'rename';
  hostname?: DomainHostname;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [relativeName, setRelativeName] = useState(hostname?.relativeName ?? '');
  const [errors, setErrors] = useState<DomainFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const nextErrors: DomainFieldErrors = {};
    if (relativeName.trim().length === 0) {
      nextErrors.relativeName = 'admin.domainCenter.validation.required';
    } else if (!isValidRelativeName(relativeName)) {
      nextErrors.relativeName = 'admin.domainCenter.validation.invalidRelativeName';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const input = { relativeName: normalizeRelativeName(relativeName) };
      if (mode === 'create') {
        await domainCenterService.createHostname(zoneId, input);
      } else if (hostname) {
        await domainCenterService.renameHostname(zoneId, hostname.id, input);
      }
      onSaved();
    } catch (cause) {
      setSubmitError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.hostnames.errors.save', 'Hostname could not be saved')),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <DomainFormDialog
      busy={busy}
      onClose={onClose}
      title={mode === 'create'
        ? t('admin.domainCenter.hostnames.dialog.createTitle', 'Add hostname')
        : t('admin.domainCenter.hostnames.dialog.renameTitle', 'Rename hostname')}
      description={t(
        'admin.domainCenter.hostnames.dialog.description',
        'Use @ for the apex, a label such as www or api.eu for a subdomain, or * / *.a for a wildcard. Renaming resets ownership verification to pending.',
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
      <DomainField
        required
        label={t('admin.domainCenter.columns.relativeName', 'Relative name')}
        hint={t('admin.domainCenter.hostnames.dialog.relativeNameHint', 'www · api.eu · @ · * · *.a')}
        error={errors.relativeName ? t(errors.relativeName, 'Invalid relative name') : undefined}
      >
        <DomainTextInput
          mono
          autoFocus
          disabled={busy}
          value={relativeName}
          onChange={setRelativeName}
          placeholder="www"
        />
      </DomainField>
    </DomainFormDialog>
  );
}

function VerifyResultDialog({
  value,
  onClose,
}: {
  value: { hostname: DomainHostname; result: DomainVerifyResult };
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { result, hostname } = value;
  return (
    <DomainFormDialog
      onClose={onClose}
      title={result.verified
        ? t('admin.domainCenter.hostnames.verify.verifiedTitle', 'Ownership verified')
        : t('admin.domainCenter.hostnames.verify.pendingTitle', 'Publish the TXT record')}
      description={result.verified
        ? t(
            'admin.domainCenter.hostnames.verify.verifiedDesc',
            '{{hostname}} proved control of the name. It can now back a certificate or an application binding.',
            { hostname: hostname.hostname },
          )
        : t(
            'admin.domainCenter.hostnames.verify.pendingDesc',
            'Add the TXT record below at your DNS provider, wait for propagation, then verify again. The proof may be shown only once.',
          )}
      footer={
        <DomainSecondaryButton onClick={onClose}>
          {t('common.actions.close', 'Close')}
        </DomainSecondaryButton>
      }
    >
      {result.verified ? (
        <DomainInlineNotice
          tone="success"
          title={t('admin.domainCenter.hostnames.verify.method', 'Verified through {{method}}', { method: result.method })}
          description={result.verificationId
            ? t('admin.domainCenter.hostnames.verify.attempt', 'Attempt {{id}}', { id: result.verificationId })
            : undefined}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <RecordValue
            label={t('admin.domainCenter.hostnames.verify.recordName', 'TXT record name')}
            value={result.recordName ?? '—'}
          />
          <RecordValue
            label={t('admin.domainCenter.hostnames.verify.recordRelativeName', 'Host (relative to the zone)')}
            value={result.recordRelativeName ?? '—'}
          />
          <RecordValue
            label={t('admin.domainCenter.hostnames.verify.recordValue', 'TXT value')}
            value={result.token ?? '—'}
          />
          {result.expiresAt ? (
            <RecordValue
              label={t('admin.domainCenter.hostnames.verify.expiresAt', 'Proof expires at')}
              value={formatDomainDateTime(result.expiresAt, i18n.resolvedLanguage ?? 'en-US')}
            />
          ) : null}
          <DomainInlineNotice
            tone="warning"
            title={t('admin.domainCenter.hostnames.verify.propagation', 'DNS propagation delay')}
            description={t(
              'admin.domainCenter.hostnames.verify.propagationDesc',
              'Most providers publish TXT records within minutes; TTL and negative caching can delay the check.',
            )}
          />
        </div>
      )}
    </DomainFormDialog>
  );
}

function RecordValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-2">
        <code className="break-all font-mono text-[12px] text-slate-800 dark:text-slate-100">{value}</code>
        {value !== '—' ? <CopyButton text={value} variant="icon" /> : null}
      </div>
    </div>
  );
}
