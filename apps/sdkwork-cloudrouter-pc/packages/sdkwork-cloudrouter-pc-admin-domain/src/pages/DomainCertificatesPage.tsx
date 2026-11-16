import { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  History,
  Plus,
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
  DomainCheckbox,
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
import {
  certificateDaysUntilExpiry,
  certificateIdentifierSummary,
  certificateIsExpiringSoon,
  formatDomainDate,
  formatDomainDateTime,
} from '../domainFormat';
import {
  caProfileLabel,
  certificateScopeLabel,
  certificateSourceLabel,
  certificateStatusLabel,
  certificateStatusTone,
  renewalStatusLabel,
  renewalStatusTone,
  translateDomainLabel,
  validityPhaseLabel,
  validityPhaseTone,
  validationMethodLabel,
  type DomainLabel,
} from '../domainLabels';
import type {
  DomainCertificate,
  DomainCertificateRenewal,
  DomainCertificateStatus,
  DomainCenterSectionId,
  DomainCloudAccount,
  DomainHostname,
  DomainZone,
} from '../domainTypes';
import { useDomainCloudAccounts, useDomainZones, usableDnsAccounts } from '../hooks/useDomainResources';
import {
  toCreateCertificateInput,
  validateCertificateForm,
  type DomainCertificateForm,
  type DomainFieldErrors,
} from '../domainValidation';

const EMPTY_CERTIFICATE_FORM: DomainCertificateForm = {
  certName: '',
  domainIds: [],
  certificateScope: 'SINGLE_DOMAIN',
  validationMethod: 'AUTO',
  caProfile: 'LETS_ENCRYPT_PRODUCTION',
  preferredKeyAlgorithm: 'RSA',
  autoRenew: true,
  renewBeforeDays: '30',
  providerAccountId: '',
};

type StatusFilter = DomainCertificateStatus | 'ALL';

export function DomainCertificatesPage({
  onNavigate,
}: {
  onNavigate: (section: DomainCenterSectionId, zoneId?: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const zones = useDomainZones();
  const accounts = useDomainCloudAccounts();
  const [certificates, setCertificates] = useState<DomainCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [issueOpen, setIssueOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState<DomainCertificate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DomainCertificate | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const locale = i18n.resolvedLanguage ?? 'en-US';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    domainCenterService
      .listAllCertificates()
      .then((items) => {
        if (active) {
          setCertificates(items);
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
  }, [reloadToken]);

  const rows = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return certificates.filter((certificate) => {
      if (statusFilter !== 'ALL' && certificate.status !== statusFilter) {
        return false;
      }
      if (keyword.length === 0) {
        return true;
      }
      return (
        certificate.certName.toLowerCase().includes(keyword)
        || certificate.identifiers.some((identifier) => identifier.toLowerCase().includes(keyword))
        || (certificate.issuer ?? '').toLowerCase().includes(keyword)
      );
    });
  }, [certificates, search, statusFilter]);

  const renew = async (certificate: DomainCertificate) => {
    setBusyId(certificate.id);
    setActionError(null);
    setNotice(null);
    try {
      await domainCenterService.renewCertificate(certificate.id);
      setNotice(
        t('admin.domainCenter.certificates.renewRequested', 'Renewal planned for {{name}}.', {
          name: certificate.certName,
        }),
      );
      setReloadToken((token) => token + 1);
    } catch (cause) {
      setActionError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.certificates.errors.renew', 'Renewal could not be planned')),
      );
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!deleteTarget) {
      return;
    }
    setBusyId(deleteTarget.id);
    setActionError(null);
    try {
      await domainCenterService.deleteCertificate(deleteTarget.id);
      setCertificates((current) => current.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (cause) {
      setActionError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.certificates.errors.delete', 'Certificate could not be removed')),
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <DomainSectionIntro
        title={t('admin.domainCenter.certificates.title', 'Certificates')}
        description={t(
          'admin.domainCenter.certificates.description',
          'Managed certificates are issued and renewed automatically over ACME. A wildcard scope always validates through DNS-01; single-domain certificates may use HTTP-01. Imported certificates are read-only here because their private material lives in the secret manager.',
        )}
        actions={
          <>
            <DomainSecondaryButton onClick={() => setReloadToken((token) => token + 1)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('admin.domainCenter.actions.refresh', 'Refresh')}
            </DomainSecondaryButton>
            <DomainPrimaryButton onClick={() => setIssueOpen(true)} disabled={zones.data.length === 0}>
              <Plus className="h-4 w-4" />
              {t('admin.domainCenter.certificates.actions.issue', 'Issue certificate')}
            </DomainPrimaryButton>
          </>
        }
      />

      {actionError ? <DomainInlineNotice tone="danger" title={actionError} /> : null}
      {notice ? <DomainInlineNotice tone="success" title={notice} /> : null}

      <AdminTableShell
        className="min-h-0 flex-1 rounded-xl dark:bg-[#1a1a1a]"
        header={
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:items-center">
              <div className="relative min-w-0 flex-1 md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('admin.domainCenter.certificates.search', 'Search certificate, identifier, or issuer')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                />
              </div>
              <DomainSelect
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { value: 'ALL', label: t('admin.domainCenter.filters.allStatuses', 'All statuses') },
                  { value: 'ACTIVE', label: t('admin.domainCenter.status.active', 'Active') },
                  { value: 'ISSUING', label: t('admin.domainCenter.status.issuing', 'Issuing') },
                  { value: 'PENDING', label: t('admin.domainCenter.status.pending', 'Pending') },
                  { value: 'EXPIRED', label: t('admin.domainCenter.status.expired', 'Expired') },
                  { value: 'FAILED', label: t('admin.domainCenter.status.failed', 'Failed') },
                  { value: 'REVOKED', label: t('admin.domainCenter.status.revoked', 'Revoked') },
                ]}
              />
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('admin.domainCenter.certificates.count', '{{count}} certificates', { count: rows.length })}
            </div>
          </div>
        }
      >
        <table className="w-full min-w-[1320px] whitespace-nowrap text-left text-sm">
          <DomainTableHead
            columns={[
              t('admin.domainCenter.columns.certificateName', 'Certificate'),
              t('admin.domainCenter.columns.identifiers', 'Identifiers'),
              t('admin.domainCenter.columns.source', 'Source'),
              t('admin.domainCenter.columns.scope', 'Scope / method'),
              t('admin.domainCenter.columns.status', 'Status'),
              t('admin.domainCenter.columns.validity', 'Validity'),
              t('admin.domainCenter.columns.expiry', 'Expiry'),
              t('admin.domainCenter.columns.renewal', 'Renewal'),
              t('admin.domainCenter.columns.actions', 'Actions'),
            ]}
          />
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
            {loading ? (
              <DomainStateRows
                colSpan={9}
                kind="loading"
                title={t('admin.domainCenter.certificates.loading', 'Loading certificates...')}
              />
            ) : error ? (
              <DomainStateRows
                colSpan={9}
                kind="error"
                title={t('admin.domainCenter.certificates.loadError', 'Certificates could not be loaded')}
                description={resolveProblemMessage(error, t, t('admin.domainCenter.errors.load', 'Request failed'))}
                onRetry={() => setReloadToken((token) => token + 1)}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : rows.length === 0 ? (
              <DomainStateRows
                colSpan={9}
                kind="empty"
                title={t('admin.domainCenter.certificates.empty', 'No certificate issued yet')}
                description={t(
                  'admin.domainCenter.certificates.emptyDesc',
                  'Issue a certificate for verified hostnames, or import one from your CA.',
                )}
                action={
                  zones.data.length === 0
                    ? {
                        label: t('admin.domainCenter.actions.addZone', 'Register root domain'),
                        onClick: () => onNavigate('zones'),
                      }
                    : {
                        label: t('admin.domainCenter.certificates.actions.issue', 'Issue certificate'),
                        onClick: () => setIssueOpen(true),
                      }
                }
              />
            ) : (
              rows.map((certificate) => {
                const days = certificateDaysUntilExpiry(certificate);
                const expiring = certificateIsExpiringSoon(certificate);
                return (
                  <tr key={certificate.id} className="transition hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" />
                        <div className="min-w-0">
                          <div className="text-[12px] font-semibold text-slate-900 dark:text-white">
                            {certificate.certName}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                            {certificate.issuer ?? '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="max-w-[260px] truncate font-mono text-[12px]" title={certificateIdentifierSummary(certificate)}>
                        {certificateIdentifierSummary(certificate)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{translateDomainLabel(t, certificateSourceLabel(certificate.certificateSource))}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {translateDomainLabel(t, caProfileLabel(certificate.caProfile))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{translateDomainLabel(t, certificateScopeLabel(certificate.certificateScope))}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {translateDomainLabel(t, validationMethodLabel(certificate.validationMethod))} · {certificate.preferredKeyAlgorithm}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <DomainStatusPill
                          label={translateDomainLabel(t, certificateStatusLabel(certificate.status))}
                          tone={certificateStatusTone(certificate.status)}
                        />
                        {certificate.validityPhase ? (
                          <DomainStatusPill
                            label={translateDomainLabel(t, validityPhaseLabel(certificate.validityPhase))}
                            tone={validityPhaseTone(certificate.validityPhase)}
                          />
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{formatDomainDate(certificate.notBefore, locale)}</div>
                      <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                        {formatDomainDate(certificate.notAfter, locale)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={expiring ? 'font-semibold text-amber-600 dark:text-amber-300' : ''}>
                        {days === null
                          ? '—'
                          : t('admin.domainCenter.certificates.daysLeft', '{{days}}d', { days })}
                      </span>
                      {certificate.renewBeforeDays ? (
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                          {t('admin.domainCenter.certificates.renewBefore', 'renew {{days}}d before', {
                            days: certificate.renewBeforeDays,
                          })}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <DomainStatusPill
                          label={translateDomainLabel(t, renewalStatusLabel(certificate.renewalStatus))}
                          tone={renewalStatusTone(certificate.renewalStatus)}
                        />
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {certificate.autoRenew
                            ? t('admin.domainCenter.certificates.autoRenew', 'Auto renew')
                            : t('admin.domainCenter.certificates.manualRenew', 'Manual renew')}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <DomainIconButton
                          label={t('admin.domainCenter.certificates.actions.history', 'Renewal history')}
                          onClick={() => setHistoryTarget(certificate)}
                        >
                          <History className="h-4 w-4" />
                        </DomainIconButton>
                        <DomainIconButton
                          label={t('admin.domainCenter.certificates.actions.renew', 'Renew now')}
                          disabled={busyId === certificate.id || certificate.certificateSource === 'CUSTOM'}
                          onClick={() => void renew(certificate)}
                        >
                          <CalendarClock className="h-4 w-4" />
                        </DomainIconButton>
                        <DomainIconButton
                          label={t('common.actions.delete', 'Delete')}
                          tone="danger"
                          disabled={busyId === certificate.id}
                          onClick={() => setDeleteTarget(certificate)}
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

      {issueOpen ? (
        <IssueCertificateDialog
          zones={zones.data}
          accounts={usableDnsAccounts(accounts.data)}
          onClose={() => setIssueOpen(false)}
          onIssued={() => {
            setIssueOpen(false);
            setReloadToken((token) => token + 1);
          }}
        />
      ) : null}

      {historyTarget ? (
        <RenewalHistoryDialog certificate={historyTarget} onClose={() => setHistoryTarget(null)} />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          tone="danger"
          title={t('admin.domainCenter.certificates.delete.title', 'Delete certificate')}
          description={t(
            'admin.domainCenter.certificates.delete.description',
            'Remove {{name}} and every stored version? Remove it from listeners and certificates first; an active TLS listener referencing it will stop being served.',
            { name: deleteTarget.certName },
          )}
          confirmLabel={t('common.actions.delete', 'Delete')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          isBusy={busyId === deleteTarget.id}
          icon={<Trash2 className="h-4 w-4" />}
          onConfirm={() => void remove()}
          onCancel={() => setDeleteTarget(null)}
        />
      ) : null}
    </div>
  );
}

function IssueCertificateDialog({
  zones,
  accounts,
  onClose,
  onIssued,
}: {
  zones: readonly DomainZone[];
  accounts: readonly DomainCloudAccount[];
  onClose: () => void;
  onIssued: () => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DomainCertificateForm>(EMPTY_CERTIFICATE_FORM);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [hostnames, setHostnames] = useState<DomainHostname[]>([]);
  const [hostnamesLoading, setHostnamesLoading] = useState(false);
  const [hostnamesError, setHostnamesError] = useState<unknown>(null);
  const [errors, setErrors] = useState<DomainFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!zoneId) {
      setHostnames([]);
      return;
    }
    let active = true;
    setHostnamesLoading(true);
    setHostnamesError(null);
    domainCenterService
      .listAllHostnames(zoneId)
      .then((items) => {
        if (active) {
          setHostnames(items);
        }
      })
      .catch((cause: unknown) => {
        if (active) {
          setHostnamesError(cause);
        }
      })
      .finally(() => {
        if (active) {
          setHostnamesLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [zoneId]);

  const toggleIdentifier = (hostnameId: string) => {
    setForm((current) => ({
      ...current,
      domainIds: current.domainIds.includes(hostnameId)
        ? current.domainIds.filter((id) => id !== hostnameId)
        : [...current.domainIds, hostnameId],
    }));
  };

  const submit = async () => {
    const nextErrors = validateCertificateForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      await domainCenterService.createCertificate(toCreateCertificateInput(form));
      onIssued();
    } catch (cause) {
      setSubmitError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.certificates.errors.issue', 'Certificate could not be requested')),
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
      title={t('admin.domainCenter.certificates.dialog.issueTitle', 'Issue certificate')}
      description={t(
        'admin.domainCenter.certificates.dialog.issueDesc',
        'Select verified hostnames as identifiers. A wildcard scope also plans the apex of each wildcard and always validates through DNS-01.',
      )}
      footer={
        <>
          <DomainSecondaryButton onClick={onClose} disabled={busy}>
            {t('common.actions.cancel', 'Cancel')}
          </DomainSecondaryButton>
          <DomainPrimaryButton onClick={() => void submit()} disabled={busy}>
            {busy
              ? t('admin.domainCenter.certificates.submitting', 'Requesting...')
              : t('admin.domainCenter.certificates.actions.issue', 'Issue certificate')}
          </DomainPrimaryButton>
        </>
      }
    >
      {submitError ? <DomainInlineNotice tone="danger" title={submitError} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <DomainField
          required
          label={t('admin.domainCenter.certificates.fields.certName', 'Certificate name')}
          error={errors.certName ? t(errors.certName, 'Invalid certificate name') : undefined}
        >
          <DomainTextInput
            autoFocus
            disabled={busy}
            value={form.certName}
            onChange={(value) => setForm((current) => ({ ...current, certName: value }))}
            placeholder="example.com SAN"
          />
        </DomainField>
        <DomainField label={t('admin.domainCenter.certificates.fields.caProfile', 'Certificate authority')}>
          <DomainSelect
            value={form.caProfile}
            onChange={(value) => setForm((current) => ({ ...current, caProfile: value }))}
            options={[
              { value: 'LETS_ENCRYPT_PRODUCTION', label: t('admin.domainCenter.status.caProduction', "Let's Encrypt") },
              { value: 'LETS_ENCRYPT_STAGING', label: t('admin.domainCenter.status.caStaging', "Let's Encrypt staging") },
            ]}
          />
        </DomainField>
        <DomainField label={t('admin.domainCenter.certificates.fields.scope', 'Certificate scope')}>
          <DomainSelect
            value={form.certificateScope}
            onChange={(value) => setForm((current) => ({ ...current, certificateScope: value }))}
            options={[
              { value: 'SINGLE_DOMAIN', label: t('admin.domainCenter.status.singleDomainScope', 'Single domain') },
              { value: 'WILDCARD', label: t('admin.domainCenter.status.wildcardScope', 'Wildcard') },
            ]}
          />
        </DomainField>
        <DomainField
          label={t('admin.domainCenter.certificates.fields.validationMethod', 'Validation method')}
          error={errors.validationMethod ? t(errors.validationMethod, 'HTTP-01 cannot validate a wildcard') : undefined}
        >
          <DomainSelect
            value={form.validationMethod}
            onChange={(value) => setForm((current) => ({ ...current, validationMethod: value }))}
            options={[
              { value: 'AUTO', label: t('admin.domainCenter.status.auto', 'Automatic') },
              { value: 'HTTP_01', label: t('admin.domainCenter.status.http01', 'HTTP-01') },
              { value: 'DNS_01', label: t('admin.domainCenter.status.dns01', 'DNS-01') },
            ]}
          />
        </DomainField>
        <DomainField label={t('admin.domainCenter.certificates.fields.keyAlgorithm', 'Key algorithm')}>
          <DomainSelect
            value={form.preferredKeyAlgorithm}
            onChange={(value) => setForm((current) => ({ ...current, preferredKeyAlgorithm: value }))}
            options={[
              { value: 'RSA', label: 'RSA 2048' },
              { value: 'ECDSA', label: 'ECDSA P-256' },
            ]}
          />
        </DomainField>
        <DomainField
          label={t('admin.domainCenter.certificates.fields.renewBeforeDays', 'Renew before expiry (days)')}
          hint={t('admin.domainCenter.certificates.fields.renewBeforeHint', '7–90; floored at one third of the lifetime')}
          error={errors.renewBeforeDays ? t(errors.renewBeforeDays, 'Invalid renewal window') : undefined}
        >
          <DomainTextInput
            mono
            inputMode="numeric"
            disabled={busy}
            value={form.renewBeforeDays}
            onChange={(value) => setForm((current) => ({ ...current, renewBeforeDays: value }))}
            placeholder="30"
          />
        </DomainField>
        <DomainField
          label={t('admin.domainCenter.zones.fields.providerAccount', 'DNS cloud account')}
          hint={t('admin.domainCenter.certificates.fields.providerAccountHint', 'Optional override for DNS-01 presentation')}
        >
          <DomainSelect
            value={form.providerAccountId}
            onChange={(value) => setForm((current) => ({ ...current, providerAccountId: value }))}
            options={[
              { value: '', label: t('admin.domainCenter.zones.autoAccount', 'Resolved per issuance') },
              ...accounts.map((account) => ({
                value: account.id,
                label: `${account.displayName}${account.dnsProvider ? ` · ${account.dnsProvider}` : ''}`,
              })),
            ]}
          />
        </DomainField>
      </div>

      <DomainCheckbox
        checked={form.autoRenew}
        onChange={(checked) => setForm((current) => ({ ...current, autoRenew: checked }))}
        label={t(
          'admin.domainCenter.certificates.fields.autoRenew',
          'Keep this certificate renewed automatically (recommended)',
        )}
      />

      <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
              {t('admin.domainCenter.certificates.fields.identifiers', 'Hostname identifiers')}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('admin.domainCenter.certificates.fields.identifiersHint', 'Only verified hostnames can be selected')}
            </div>
          </div>
          <div className="md:w-64">
            <DomainSelect
              value={zoneId}
              onChange={(value) => {
                setZoneId(value);
                setForm((current) => ({ ...current, domainIds: [] }));
              }}
              options={zones.map((zone) => ({ value: zone.id, label: zone.apexHostname }))}
            />
          </div>
        </div>
        {errors.domainIds ? (
          <div role="alert" className="mt-2 text-[11px] text-red-600 dark:text-red-400">
            {t(errors.domainIds, 'Select at least one identifier')}
          </div>
        ) : null}
        {hostnamesLoading ? (
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t('admin.domainCenter.certificates.loadingHostnames', 'Loading hostnames...')}
          </div>
        ) : hostnamesError ? (
          <div role="alert" className="mt-3 text-[11px] text-red-600 dark:text-red-400">
            {resolveProblemMessage(hostnamesError, t, t('admin.domainCenter.certificates.hostnamesError', 'Hostnames could not be loaded'))}
          </div>
        ) : hostnames.length === 0 ? (
          <div className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            {t('admin.domainCenter.certificates.noHostnames', 'This zone has no hostname yet.')}
          </div>
        ) : (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {hostnames.map((hostname) => (
              <li key={hostname.id}>
                <label className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs dark:border-white/5">
                  <input
                    type="checkbox"
                    checked={form.domainIds.includes(hostname.id)}
                    disabled={hostname.verificationStatus !== 'VERIFIED' || busy}
                    onChange={() => toggleIdentifier(hostname.id)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-lobster-500 focus:ring-lobster-500"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[12px] text-slate-800 dark:text-slate-100">
                      {hostname.hostname}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {translateDomainLabel(t, hostnameVerificationLabel(hostname))}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DomainFormDialog>
  );
}

function hostnameVerificationLabel(hostname: DomainHostname): DomainLabel {
  return hostname.verificationStatus === 'VERIFIED'
    ? { key: 'admin.domainCenter.status.verified', fallback: 'Verified' }
    : { key: 'admin.domainCenter.status.pending', fallback: 'Pending' };
}

function renewalAttemptStatusLabel(
  t: (key: string, fallback: string) => string,
  status: DomainCertificateRenewal['status'],
): string {
  switch (status) {
    case 'SUCCEEDED':
      return t('admin.domainCenter.certificates.history.attemptSucceeded', 'Succeeded');
    case 'FAILED':
      return t('admin.domainCenter.certificates.history.attemptFailed', 'Failed');
    case 'CANCELLED':
      return t('admin.domainCenter.certificates.history.attemptCancelled', 'Cancelled');
    case 'SKIPPED':
      return t('admin.domainCenter.certificates.history.attemptSkipped', 'Skipped');
    case 'ORDERED':
      return t('admin.domainCenter.certificates.history.attemptOrdered', 'Ordered');
    default:
      return t('admin.domainCenter.certificates.history.attemptPlanned', 'Planned');
  }
}

function RenewalHistoryDialog({
  certificate,
  onClose,
}: {
  certificate: DomainCertificate;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const [renewals, setRenewals] = useState<DomainCertificateRenewal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const locale = i18n.resolvedLanguage ?? 'en-US';

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    domainCenterService
      .listCertificateRenewals(certificate.id)
      .then((items) => {
        if (active) {
          setRenewals(items);
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
  }, [certificate.id]);

  return (
    <DomainFormDialog
      wide
      onClose={onClose}
      title={t('admin.domainCenter.certificates.history.title', 'Renewal history')}
      description={t(
        'admin.domainCenter.certificates.history.description',
        'Every attempt to replace {{name}}, with the validity window handed over so continuous coverage stays auditable.',
        { name: certificate.certName },
      )}
      footer={
        <DomainSecondaryButton onClick={onClose}>
          {t('common.actions.close', 'Close')}
        </DomainSecondaryButton>
      }
    >
      {error ? (
        <DomainInlineNotice
          tone="danger"
          title={resolveProblemMessage(error, t, t('admin.domainCenter.certificates.history.loadError', 'Renewal history could not be loaded'))}
        />
      ) : null}
      <div className="rounded-lg border border-slate-200 dark:border-white/10">
        <table className="w-full text-left text-xs">
          <DomainTableHead
            columns={[
              t('admin.domainCenter.certificates.history.attempt', 'Attempt'),
              t('admin.domainCenter.certificates.history.trigger', 'Trigger'),
              t('admin.domainCenter.certificates.history.status', 'Status'),
              t('admin.domainCenter.certificates.history.previousWindow', 'Previous window'),
              t('admin.domainCenter.certificates.history.newWindow', 'New window'),
              t('admin.domainCenter.certificates.history.finishedAt', 'Finished'),
            ]}
          />
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading ? (
              <DomainStateRows colSpan={6} kind="loading" title={t('admin.domainCenter.certificates.history.loading', 'Loading history...')} />
            ) : renewals.length === 0 ? (
              <DomainStateRows
                colSpan={6}
                kind="empty"
                title={t('admin.domainCenter.certificates.history.empty', 'No renewal attempted yet')}
                description={t('admin.domainCenter.certificates.history.emptyDesc', 'The first renewal creates an audited entry here.')}
              />
            ) : (
              renewals.map((renewal) => (
                <tr key={renewal.id}>
                  <td className="px-3 py-2 tabular-nums">#{renewal.attemptNo}</td>
                  <td className="px-3 py-2">
                    {renewal.triggerKind === 'MANUAL'
                      ? t('admin.domainCenter.certificates.history.manual', 'Manual')
                      : t('admin.domainCenter.certificates.history.scheduled', 'Scheduled')}
                  </td>
                  <td className="px-3 py-2">
                    <DomainStatusPill
                      label={renewalAttemptStatusLabel(t, renewal.status)}
                      tone={
                        renewal.status === 'SUCCEEDED'
                          ? 'success'
                          : renewal.status === 'FAILED'
                            ? 'danger'
                            : renewal.status === 'CANCELLED' || renewal.status === 'SKIPPED'
                              ? 'neutral'
                              : 'info'
                      }
                    />
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                    {formatDomainDate(renewal.previousNotBefore, locale)} → {formatDomainDate(renewal.previousNotAfter, locale)}
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                    {formatDomainDate(renewal.newNotBefore, locale)} → {formatDomainDate(renewal.newNotAfter, locale)}
                  </td>
                  <td className="px-3 py-2 text-slate-500 dark:text-slate-400">
                    {formatDomainDateTime(renewal.finishedAt ?? renewal.scheduledAt, locale)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </DomainFormDialog>
  );
}
