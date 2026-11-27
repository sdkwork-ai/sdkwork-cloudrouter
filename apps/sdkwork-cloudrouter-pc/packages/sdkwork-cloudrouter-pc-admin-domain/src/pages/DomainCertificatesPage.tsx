import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  CalendarClock,
  ExternalLink,
  FileCheck2,
  History,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  AdminTableShell,
  ConfirmDialog,
  resolveProblemMessage,
} from '@sdkwork/cloudroutes-pc-commons';

import {
  DomainCheckbox,
  DomainChipList,
  DomainField,
  DomainFormDialog,
  DomainIconButton,
  DomainInlineNotice,
  DomainPrimaryButton,
  DomainRadioGroup,
  DomainSecondaryButton,
  DomainSectionIntro,
  DomainSelect,
  DomainStateRows,
  DomainStatusPill,
  DomainTableHead,
  DomainTextInput,
  focusDomainField,
} from '../components/domainUi';
import { DomainCopyButton } from '../components/DomainCopyButton';
import { domainCenterService, DomainSdkCapabilityError } from '../domainService';
import {
  addCertificateIdentifiers,
  buildManualTxtRows,
  certificateArchiveState,
  certificateArchiveTone,
  certificateHostnameSuggestions,
  certificatePollStop,
  certificateValidationMethodOptions,
  challengeNeedsOperatorAction,
  challengeStatusByIdentifier,
  formatCountdown,
  isCertificateIssuanceFailure,
  isCertificateServing,
  isValidCertificateIdentifier,
  manualTxtCopyAllPayload,
  manualTxtValuePayload,
  normalizeCertificateIdentifier,
  driveSpaceHref,
  parsePresentationMode,
  presentationSecondsRemaining,
  reconcileCertificateMode,
  removeCertificateIdentifier,
  shouldAwaitManualChallenge,
  type CertificateHostnameSuggestion,
  type CertificatePollStopDecision,
  type CertificatePollStopInput,
  type ManualTxtRecordRow,
} from '../domainCertificateIssuance';
import {
  CERTIFICATE_EXPIRING_SOON_DAYS,
  certificateDaysUntilExpiry,
  certificateIdentifierSummary,
  certificateIsExpiringSoon,
  formatDomainDate,
  formatDomainDateTime,
} from '../domainFormat';
import {
  archiveStatusLabel,
  caProfileLabel,
  certificateScopeLabel,
  certificateSourceLabel,
  certificateStatusLabel,
  certificateStatusTone,
  presentationModeLabel,
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
  DomainCertificateArchiveStatus,
  DomainCertificateChallengePresentation,
  DomainCertificatePresentationMode,
  DomainCertificateRenewal,
  DomainCertificateStatus,
  DomainCenterSectionId,
  DomainCloudAccount,
  DomainHostname,
  DomainZone,
} from '../domainTypes';
import { useDomainCloudAccounts, useDomainZones, usableDnsAccounts } from '../hooks/useDomainResources';
import {
  CERTIFICATE_FORM_FIELD_ORDER,
  firstDomainFieldError,
  toCreateCertificateInput,
  validateCertificateForm,
  type CreateDomainCertificatePayload,
  type DomainCertificateForm,
  type DomainFieldErrors,
} from '../domainValidation';

const EMPTY_CERTIFICATE_FORM: DomainCertificateForm = {
  certName: '',
  domainIds: [],
  requestedIdentifiers: [],
  certificateScope: 'SINGLE_DOMAIN',
  validationMethod: 'AUTO',
  presentationMode: 'MANAGED',
  caProfile: 'LETS_ENCRYPT_PRODUCTION',
  preferredKeyAlgorithm: 'RSA',
  autoRenew: true,
  renewBeforeDays: '30',
  providerAccountId: '',
};

/** Bounded poll budget: ~5 minutes at the slowest interval below. */
const CERTIFICATE_POLL_MAX_ATTEMPTS = 40;
const CERTIFICATE_POLL_BASE_DELAY_MS = 2_000;
const CERTIFICATE_POLL_MAX_DELAY_MS = 15_000;
const COUNTDOWN_TICK_MS = 1_000;

/** Bounded backoff for the issuance poll; capped so a slow order still reports. */
function certificatePollDelay(attempt: number): number {
  return Math.min(CERTIFICATE_POLL_MAX_DELAY_MS, CERTIFICATE_POLL_BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1));
}

function isAbortError(cause: unknown): boolean {
  return cause instanceof Error && cause.name === 'AbortError';
}

/**
 * Resolves after `delayMs`, rejecting with an `AbortError` on abort.
 *
 * Owned here rather than in a `setTimeout` inside the effect so the cancellation
 * path is identical to the fetch path: one signal stops both, and unmount cannot
 * leave a live timer that resolves into a gone component.
 */
function abortableDelay(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delayMs);
    function onAbort(): void {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

type StatusFilter = DomainCertificateStatus | 'ALL';

type IssuePhase = 'form' | 'submitting' | 'progress';

interface IssuanceState {
  phase: IssuePhase;
  /** What the operator asked for, fixed at submit time. */
  mode: DomainCertificatePresentationMode;
  certName: string;
  /** Ids of the zone apexes the typed hostnames belong to, for the relative host label. */
  apexHostnames: readonly string[];
  certificateId?: string;
  certificateStatus?: DomainCertificateStatus;
  presentation?: DomainCertificateChallengePresentation;
  baseCertificate?: DomainCertificate;
  polling: 'idle' | 'running' | 'paused' | 'stopped' | 'failed';
  pollAttempt: number;
  pollStopReason?: CertificatePollStopDecision['reason'];
}

/** Archive status as the list sees it, including "the read is still in flight". */
interface ArchiveRead {
  status?: DomainCertificateArchiveStatus;
  spaceId?: string;
  loading: boolean;
  error: unknown;
}

/** Failure of the `retrieve` call, which carries no `problem` payload. */
function isProblemDetailCarrying(cause: unknown): boolean {
  return typeof cause === 'object' && cause !== null && 'problem' in cause;
}

/** Upper bound on the archive-state hydration of one list refresh. */
const ARCHIVE_READ_CONCURRENCY = 4;

interface ArchiveTarget {
  id: string;
  status: DomainCertificateStatus;
}

/**
 * Reads the archive state of every certificate that could have one.
 *
 * The list endpoint on an unregenerated control plane does not answer with
 * `archiveStatus`, so a summary row is hydrated from `retrieve` — which is also
 * what makes the new column honest instead of permanently "unknown". Bounded
 * concurrency keeps a 200-row page from opening 200 requests at once, and a
 * per-row failure only marks that row unknown; it never fails the list.
 */
function useCertificateArchiveReads(targets: readonly ArchiveTarget[]) {
  const [reads, setReads] = useState<Record<string, ArchiveRead>>({});
  const [refreshToken, setRefreshToken] = useState(0);
  const key = targets.map((target) => target.id).join('|');

  useEffect(() => {
    if (targets.length === 0) {
      return;
    }
    let cancelled = false;
    setReads((current) => {
      const next: Record<string, ArchiveRead> = {};
      for (const target of targets) {
        next[target.id] = current[target.id] ?? { loading: true, error: null };
      }
      return next;
    });
    const queue = [...targets];
    const run = async (): Promise<void> => {
      while (!cancelled && queue.length > 0) {
        const target = queue.shift();
        if (!target) {
          return;
        }
        try {
          const certificate = await domainCenterService.retrieveCertificate(target.id);
          if (cancelled) {
            return;
          }
          setReads((current) => ({
            ...current,
            [target.id]: {
              status: certificate.archiveStatus,
              spaceId: certificate.archiveSpaceId,
              loading: false,
              error: null,
            },
          }));
        } catch (cause: unknown) {
          if (cancelled) {
            return;
          }
          setReads((current) => ({
            ...current,
            [target.id]: { loading: false, error: isProblemDetailCarrying(cause) ? cause : null },
          }));
        }
      }
    };
    const workers = Array.from(
      { length: Math.min(ARCHIVE_READ_CONCURRENCY, targets.length) },
      () => run(),
    );
    void Promise.allSettled(workers);
    return () => {
      cancelled = true;
    };
    // `key` stands in for the target list: it changes exactly when the id set does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, refreshToken]);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);
  return { reads, refresh };
}

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
  const [progressTarget, setProgressTarget] = useState<DomainCertificate | null>(null);
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

  const archiveTargets = useMemo<ArchiveTarget[]>(() => {
    const ids = new Set<string>();
    const targets: ArchiveTarget[] = [];
    for (const certificate of certificates) {
      if (
        certificate.certificateSource === 'MANAGED'
        && (certificate.status === 'ACTIVE' || certificate.status === 'EXPIRED')
        && !ids.has(certificate.id)
      ) {
        ids.add(certificate.id);
        targets.push({ id: certificate.id, status: certificate.status });
      }
    }
    return targets;
  }, [certificates]);

  const archiveReads = useCertificateArchiveReads(archiveTargets);

  const retryArchive = async (certificateId: string) => {
    setBusyId(certificateId);
    setActionError(null);
    setNotice(null);
    try {
      await domainCenterService.retryCertificateArchive(certificateId);
      setNotice(t('admin.domainCenter.certificates.archive.retryQueued', 'Archive retry queued.'));
      archiveReads.refresh();
    } catch (cause) {
      setActionError(
        resolveProblemMessage(
          cause,
          t,
          cause instanceof DomainSdkCapabilityError
            ? t(
                'admin.domainCenter.certificates.archive.unknown',
                'Archive state is not reported by this API version.',
              )
            : t('admin.domainCenter.certificates.archive.errors.retry', 'Archive retry could not be queued'),
        ),
      );
    } finally {
      setBusyId(null);
    }
  };

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
            <div className="flex min-w-0 flex-1 flex-col gap-2 md:flex-row md:flex-wrap md:items-center">
              <div className="relative min-w-0 flex-1 md:min-w-[200px] md:max-w-md">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('admin.domainCenter.certificates.search', 'Search certificate, identifier, or issuer')}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-[#121212] dark:text-white"
                />
              </div>
              <div className="w-full shrink-0 md:w-44">
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
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('admin.domainCenter.certificates.count', '{{count}} certificates', { count: rows.length })}
            </div>
          </div>
        }
      >
        <table className="w-full min-w-[1520px] whitespace-nowrap text-left text-sm">
          <DomainTableHead
            columns={[
              t('admin.domainCenter.columns.certificateName', 'Certificate'),
              t('admin.domainCenter.columns.identifiers', 'Identifiers'),
              t('admin.domainCenter.columns.source', 'Source'),
              t('admin.domainCenter.columns.scope', 'Scope / method'),
              t('admin.domainCenter.columns.presentationMode', 'Verification mode'),
              t('admin.domainCenter.columns.archive', 'Archive'),
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
                colSpan={11}
                kind="loading"
                title={t('admin.domainCenter.certificates.loading', 'Loading certificates...')}
              />
            ) : error ? (
              <DomainStateRows
                colSpan={11}
                kind="error"
                title={t('admin.domainCenter.certificates.loadError', 'Certificates could not be loaded')}
                description={resolveProblemMessage(error, t, t('admin.domainCenter.errors.load', 'Request failed'))}
                onRetry={() => setReloadToken((token) => token + 1)}
                retryLabel={t('common.actions.retry', 'Retry')}
              />
            ) : rows.length === 0 ? (
              <DomainStateRows
                colSpan={11}
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
                const archiveRead = archiveReads.reads[certificate.id];
                const archiveSource: Parameters<typeof certificateArchiveState>[0] =
                  certificate.archiveStatus !== undefined
                    ? certificate
                    : archiveRead && archiveRead.status !== undefined
                      ? { archiveStatus: archiveRead.status, archiveSpaceId: archiveRead.spaceId }
                      : {};
                const archive = certificateArchiveState(archiveSource);
                const presentationMode = parsePresentationMode(certificate.presentationMode);
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
                      <DomainStatusPill
                        label={translateDomainLabel(t, presentationModeLabel(presentationMode))}
                        tone={presentationMode === 'MANUAL' ? 'warning' : 'neutral'}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        {archive.kind === 'unknown' ? (
                          <span className="text-[11px] text-slate-400 dark:text-slate-500">
                            {archiveRead?.loading
                              ? t('admin.domainCenter.certificates.archive.loading', 'Checking archive state...')
                              : t(
                                  'admin.domainCenter.certificates.archive.unknown',
                                  'Archive state is not reported by this API version.',
                                )}
                          </span>
                        ) : (
                          <DomainStatusPill
                            label={translateDomainLabel(
                              t,
                              archiveStatusLabel(archiveRead?.status ?? certificate.archiveStatus),
                            )}
                            tone={certificateArchiveTone(archive)}
                          />
                        )}
                        {archive.kind === 'archived' && archive.spaceId ? (
                          <a
                            href={driveSpaceHref(archive.spaceId)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-lobster-600 underline-offset-2 hover:underline dark:text-lobster-300"
                          >
                            <ExternalLink className="h-3 w-3" />
                            {t('admin.domainCenter.certificates.archive.open', 'Open drive space')}
                          </a>
                        ) : null}
                        {archive.kind === 'failed' ? (
                          <button
                            type="button"
                            disabled={busyId === certificate.id}
                            onClick={() => void retryArchive(certificate.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-0.5 text-[11px] text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                          >
                            <RotateCw className="h-3 w-3" />
                            {t('admin.domainCenter.certificates.archive.retry', 'Retry archiving')}
                          </button>
                        ) : null}
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
          onIssued={(certificate) => {
            setIssueOpen(false);
            setReloadToken((token) => token + 1);
            setProgressTarget(certificate);
          }}
        />
      ) : null}

      {progressTarget ? (
        <CertificateProgressDialog
          certificate={progressTarget}
          onClose={() => setProgressTarget(null)}
          onSettled={() => setReloadToken((token) => token + 1)}
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
  onIssued: (certificate: DomainCertificate) => void;
}) {
  const { t } = useTranslation();
  const [form, setForm] = useState<DomainCertificateForm>(EMPTY_CERTIFICATE_FORM);
  const [zoneId, setZoneId] = useState(zones[0]?.id ?? '');
  const [hostnames, setHostnames] = useState<DomainHostname[]>([]);
  const [hostnamesLoading, setHostnamesLoading] = useState(false);
  const [hostnamesError, setHostnamesError] = useState<unknown>(null);
  const [identifierDraft, setIdentifierDraft] = useState('');
  const [identifierRejection, setIdentifierRejection] = useState<string | null>(null);
  const [errors, setErrors] = useState<DomainFieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

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

  const suggestions = useMemo(
    () => certificateHostnameSuggestions([{ zoneId, hostnames }]),
    [zoneId, hostnames],
  );
  const selectedSuggestions = useMemo(
    () => suggestions.filter((suggestion) => form.requestedIdentifiers.includes(suggestion.hostname)),
    [suggestions, form.requestedIdentifiers],
  );

  const reconcile = (next: DomainCertificateForm): DomainCertificateForm => {
    const mode = reconcileCertificateMode({
      presentationMode: next.presentationMode,
      validationMethod: next.validationMethod,
      certificateScope: next.certificateScope,
    });
    return { ...next, validationMethod: mode.validationMethod };
  };

  const commitDraftIdentifiers = () => {
    if (identifierDraft.trim().length === 0) {
      return;
    }
    const result = addCertificateIdentifiers(form.requestedIdentifiers, identifierDraft);
    setForm((current) => ({ ...current, requestedIdentifiers: result.identifiers, domainIds: [] }));
    if (result.rejection === 'invalid') {
      setIdentifierRejection(t('admin.domainCenter.certificates.fields.hostnameInvalid', 'That is not a usable certificate hostname.'));
    } else if (result.rejection === 'duplicate') {
      setIdentifierRejection(t('admin.domainCenter.certificates.fields.hostnameDuplicate', 'That hostname is already in the list.'));
    } else {
      setIdentifierRejection(null);
    }
    setIdentifierDraft('');
  };

  const toggleSuggestion = (hostname: string) => {
    setForm((current) => ({
      ...current,
      domainIds: [],
      requestedIdentifiers: current.requestedIdentifiers.includes(hostname)
        ? removeCertificateIdentifier(current.requestedIdentifiers, hostname)
        : addCertificateIdentifiers(current.requestedIdentifiers, hostname).identifiers,
    }));
  };

  const submit = async () => {
    const nextErrors = validateCertificateForm(form);
    setErrors(nextErrors);
    const firstError = firstDomainFieldError(nextErrors, CERTIFICATE_FORM_FIELD_ORDER);
    if (firstError !== undefined) {
      focusDomainField(dialogRef.current, firstError);
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const created = await domainCenterService.createCertificate(toCreateCertificateInput(form));
      // Hand the created certificate back so the page can follow it to ACTIVE
      // (and, for a manual order, surface the TXT records) instead of closing the
      // dialog on a request the operator cannot observe.
      onIssued(created);
    } catch (cause) {
      setSubmitError(
        resolveProblemMessage(cause, t, t('admin.domainCenter.certificates.errors.issue', 'Certificate could not be requested')),
      );
    } finally {
      setBusy(false);
    }
  };

  const manual = form.presentationMode === 'MANUAL';
  const wildcard = form.certificateScope === 'WILDCARD';

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
            onChange={(value) =>
              setForm((current) => reconcile({ ...current, certificateScope: value }))
            }
            options={[
              { value: 'SINGLE_DOMAIN', label: t('admin.domainCenter.status.singleDomainScope', 'Single domain') },
              { value: 'WILDCARD', label: t('admin.domainCenter.status.wildcardScope', 'Wildcard') },
            ]}
          />
        </DomainField>
      </div>

      <DomainRadioGroup
        name="certificate-presentation-mode"
        fieldName="presentationMode"
        legend={t('admin.domainCenter.certificates.fields.presentationMode', 'Verification mode')}
        value={form.presentationMode}
        disabled={busy}
        onChange={(value) =>
          setForm((current) => reconcile({ ...current, presentationMode: value }))
        }
        options={[
          {
            value: 'MANAGED',
            label: t('admin.domainCenter.certificates.fields.presentationManaged', 'Automatic (cloud account)'),
            description: t(
              'admin.domainCenter.certificates.fields.presentationManagedDesc',
              'The platform writes and removes the _acme-challenge TXT record through the DNS cloud account.',
            ),
          },
          {
            value: 'MANUAL',
            label: t('admin.domainCenter.certificates.fields.presentationManual', 'Manual (I add the TXT record)'),
            description: t(
              'admin.domainCenter.certificates.fields.presentationManualDesc',
              'You get the exact TXT records to paste into your DNS provider, then verify here. Works without any DNS cloud account.',
            ),
          },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <DomainField
          label={t('admin.domainCenter.certificates.fields.validationMethod', 'Validation method')}
          hint={
            manual || wildcard
              ? t(
                  'admin.domainCenter.certificates.fields.validationModeForced',
                  'Fixed at DNS-01 for this mode.',
                )
              : undefined
          }
          error={errors.validationMethod ? t(errors.validationMethod, 'HTTP-01 cannot validate a wildcard') : undefined}
        >
          <DomainSelect
            value={form.validationMethod}
            disabled={manual || wildcard || busy}
            onChange={(value) => setForm((current) => ({ ...current, validationMethod: value }))}
            options={[
              { value: 'AUTO', label: t('admin.domainCenter.status.auto', 'Automatic') },
              {
                value: 'HTTP_01',
                label: t('admin.domainCenter.status.http01', 'HTTP-01'),
                disabled: manual || wildcard,
              },
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
              {t(
                'admin.domainCenter.certificates.fields.identifiersHint',
                'Type the certificate hostnames. Each one must already be a verified hostname of this tenant.',
              )}
            </div>
          </div>
          <div className="w-full shrink-0 md:w-64">
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

        <div className="mt-3 flex flex-col gap-1.5">
          <label
            htmlFor="domain-certificate-identifier-input"
            className="text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            {t('admin.domainCenter.certificates.fields.hostnameInputLabel', 'Certificate hostname')}
          </label>
          <div className="flex gap-2">
            <input
              id="domain-certificate-identifier-input"
              type="text"
              disabled={busy}
              value={identifierDraft}
              placeholder={t(
                'admin.domainCenter.certificates.fields.hostnameInputPlaceholder',
                'api.example.com or *.example.com',
              )}
              onChange={(event) => {
                setIdentifierDraft(event.target.value);
                setIdentifierRejection(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ',' || event.key === ';') {
                  event.preventDefault();
                  commitDraftIdentifiers();
                } else if (event.key === 'Backspace' && identifierDraft.length === 0) {
                  setForm((current) => ({
                    ...current,
                    requestedIdentifiers: current.requestedIdentifiers.slice(0, -1),
                  }));
                }
              }}
              onBlur={commitDraftIdentifiers}
              className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 font-mono text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#121212] dark:text-white"
            />
            <DomainSecondaryButton onClick={commitDraftIdentifiers} disabled={busy || identifierDraft.trim().length === 0}>
              {t('admin.domainCenter.certificates.fields.hostnameAdd', 'Add')}
            </DomainSecondaryButton>
          </div>
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {t(
              'admin.domainCenter.certificates.fields.hostnameInputHint',
              'Press Enter to add. Paste a comma-separated list to add several at once.',
            )}
          </span>
        </div>

        <div className="mt-3">
          <DomainChipList
            chips={form.requestedIdentifiers.map((identifier) => ({
              value: identifier,
              label: identifier,
              invalid: !isValidCertificateIdentifier(identifier),
            }))}
            disabled={busy}
            removeLabel={(chip) =>
              t('admin.domainCenter.certificates.fields.hostnameRemove', 'Remove {{hostname}}', {
                hostname: chip.value,
              })
            }
            onRemove={(value) =>
              setForm((current) => ({
                ...current,
                requestedIdentifiers: removeCertificateIdentifier(current.requestedIdentifiers, value),
              }))
            }
            emptyLabel={t(
              'admin.domainCenter.certificates.fields.identifiersEmpty',
              'No hostname added yet',
            )}
          />
        </div>

        {identifierRejection ? (
          <div role="alert" className="mt-2 text-[11px] text-red-600 dark:text-red-400">
            {identifierRejection}
          </div>
        ) : null}
        {errors.requestedIdentifiers || errors.domainIds ? (
          <div role="alert" className="mt-2 text-[11px] text-red-600 dark:text-red-400">
            {t(
              errors.requestedIdentifiers ?? errors.domainIds ?? '',
              'Add at least one certificate hostname',
            )}
          </div>
        ) : null}

        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-white/5">
          <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
            {t('admin.domainCenter.certificates.fields.suggestions', 'Verified hostnames in this zone')}
          </div>
          {hostnamesLoading ? (
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('admin.domainCenter.certificates.loadingHostnames', 'Loading hostnames...')}
            </div>
          ) : hostnamesError ? (
            <div role="alert" className="mt-2 text-[11px] text-red-600 dark:text-red-400">
              {resolveProblemMessage(hostnamesError, t, t('admin.domainCenter.certificates.hostnamesError', 'Hostnames could not be loaded'))}
            </div>
          ) : suggestions.length === 0 ? (
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('admin.domainCenter.certificates.noHostnames', 'This zone has no hostname yet.')}
            </div>
          ) : (
            <ul className="mt-2 grid gap-2 md:grid-cols-2">
              {suggestions.map((suggestion) => {
                const selected = form.requestedIdentifiers.includes(suggestion.hostname);
                return (
                  <li key={suggestion.hostname}>
                    <label className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2 text-xs dark:border-white/5">
                      <input
                        type="checkbox"
                        checked={selected}
                        disabled={busy}
                        onChange={() => toggleSuggestion(suggestion.hostname)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-lobster-500 focus:ring-lobster-500"
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[12px] text-slate-800 dark:text-slate-100">
                          {suggestion.hostname}
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          {suggestion.verified
                            ? t('admin.domainCenter.status.verified', 'Verified')
                            : t(
                                'admin.domainCenter.certificates.fields.suggestionUnverified',
                                'Not verified yet — the request will be refused',
                              )}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
          {selectedSuggestions.length > 0 ? (
            <div className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
              {t('admin.domainCenter.certificates.fields.suggestionsHint', 'Selected hostnames are part of the list above.')}
            </div>
          ) : null}
        </div>
      </div>
    </DomainFormDialog>
  );
}

function hostnameVerificationLabel(hostname: DomainHostname): DomainLabel {
  return hostname.verificationStatus === 'VERIFIED'
    ? { key: 'admin.domainCenter.status.verified', fallback: 'Verified' }
    : { key: 'admin.domainCenter.status.pending', fallback: 'Pending' };
}

/**
 * What happens after the request is accepted.
 *
 * The operator just asked for a certificate; the request itself is only the
 * beginning. This dialog is the difference between "the button did something"
 * and "you can see whether your certificate was issued": it follows the
 * certificate to a terminal state, and on a manual order it is where the TXT
 * records actually appear, get copied, and get released for CA validation.
 *
 * Polling is bounded, pauses while the tab is hidden, stops on every terminal
 * status (including "waiting for the operator", which nobody can advance by
 * polling), and is cancelled on close.
 */
function CertificateProgressDialog({
  certificate,
  onClose,
  onSettled,
}: {
  certificate: DomainCertificate;
  onClose: () => void;
  onSettled: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? 'en-US';
  const [current, setCurrent] = useState<DomainCertificate>(certificate);
  const [attempt, setAttempt] = useState(0);
  const [haltReason, setHaltReason] = useState<CertificatePollStopDecision['reason']>(undefined);
  const [presentation, setPresentation] = useState<DomainCertificateChallengePresentation | null>(null);
  const [presentationError, setPresentationError] = useState<unknown>(null);
  const [verifying, setVerifying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const abortRef = useRef<AbortController | null>(null);

  const manual = parsePresentationMode(current.presentationMode ?? certificate.presentationMode) === 'MANUAL';
  const awaitingOperator =
    manual && shouldAwaitManualChallenge(presentation ?? undefined, current.status);

  // Poll until the certificate cannot change on its own any more.
  useEffect(() => {
    if (isCertificateServing(current.status) || isCertificateIssuanceFailure(current.status)) {
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    let cancelled = false;
    const tick = async (): Promise<void> => {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, certificatePollDelay(attempt));
      });
      if (cancelled || controller.signal.aborted) {
        return;
      }
      try {
        const next = await domainCenterService.retrieveCertificate(current.id);
        if (cancelled) {
          return;
        }
        setCurrent(next);
      } catch {
        // A transient read failure is not an issuance failure; the next attempt
        // re-reads. Only the bounded attempt budget ends the loop.
      }
      setAttempt((value) => value + 1);
    };
    void tick();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [attempt, current.id, current.status]);

  // Read the TXT instructions while the order is manual; they appear once the
  // worker has prepared the order, so they are re-read as the order advances.
  useEffect(() => {
    if (!manual || !domainCenterService.supportsCertificateChallenges()) {
      return;
    }
    const controller = new AbortController();
    let cancelled = false;
    domainCenterService
      .retrieveCertificateChallenges(current.id, { signal: controller.signal })
      .then((next) => {
        if (!cancelled) {
          setPresentation(next);
          setPresentationError(null);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled && !isAbortError(cause)) {
          setPresentationError(cause);
        }
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [current.id, current.status, manual]);

  // One clock for every countdown on the panel.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), COUNTDOWN_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setHaltReason(
      certificatePollStop({
        attempt,
        maxAttempts: CERTIFICATE_POLL_MAX_ATTEMPTS,
        status: current.status,
        awaitingOperator,
        documentHidden: typeof document !== 'undefined' && document.hidden,
        aborted: false,
      }).reason,
    );
  }, [attempt, awaitingOperator, current.status]);

  useEffect(() => {
    if (isCertificateServing(current.status)) {
      onSettled();
    }
    // The parent only needs to know that the list should be re-read.
  }, [current.status, onSettled]);

  const rows = useMemo(() => buildManualTxtRows(presentation ?? undefined), [presentation]);

  const verify = async () => {
    setVerifying(true);
    setActionError(null);
    setNotice(null);
    try {
      const result = await domainCenterService.verifyCertificateChallenges(current.id);
      setNotice(
        result.accepted
          ? t(
              'admin.domainCenter.certificates.manual.accepted',
              'Records accepted. The certificate authority is being asked to validate them now.',
            )
          : t(
              'admin.domainCenter.certificates.manual.nothingToDo',
              'This order has already been released for validation.',
            ),
      );
      setAttempt(0);
      const next = await domainCenterService.retrieveCertificate(current.id);
      setCurrent(next);
    } catch (cause) {
      setActionError(
        resolveProblemMessage(
          cause,
          t,
          t('admin.domainCenter.certificates.manual.notVisible', 'The TXT record is not visible yet.'),
        ),
      );
    } finally {
      setVerifying(false);
    }
  };

  const copyAll = async () => {
    const payload = manualTxtCopyAllPayload(rows);
    try {
      await navigator.clipboard.writeText(payload);
      setNotice(t('admin.domainCenter.certificates.manual.copied', 'Copied to the clipboard.'));
    } catch {
      setActionError(t('admin.domainCenter.certificates.manual.copyFailed', 'The clipboard is not available.'));
    }
  };

  const serving = isCertificateServing(current.status);
  const failed = isCertificateIssuanceFailure(current.status);
  const phaseLabel = serving
    ? t('admin.domainCenter.certificates.progress.phaseActive', 'Issued')
    : failed
      ? t('admin.domainCenter.certificates.progress.phaseFailed', 'Failed')
      : awaitingOperator
        ? t('admin.domainCenter.certificates.progress.phaseAwaitingRecords', 'Waiting for your TXT records')
        : current.status === 'ISSUING'
          ? t('admin.domainCenter.certificates.progress.phaseWaiting', 'Issuing')
          : t('admin.domainCenter.certificates.progress.phaseRequested', 'Requested');

  return (
    <DomainFormDialog
      wide
      onClose={onClose}
      title={t('admin.domainCenter.certificates.progress.title', 'Issuing certificate')}
      description={t(
        'admin.domainCenter.certificates.progress.description',
        'Follow the order of {{name}} until the certificate is served.',
        { name: current.certName },
      )}
      footer={
        <DomainSecondaryButton onClick={onClose}>
          {serving ? t('admin.domainCenter.certificates.dialog.actions.done', 'Done') : t('common.actions.close', 'Close')}
        </DomainSecondaryButton>
      }
    >
      <div
        role="status"
        aria-live="polite"
        className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-white/10"
      >
        <DomainStatusPill
          label={phaseLabel}
          tone={serving ? 'success' : failed ? 'danger' : 'info'}
        />
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {t('admin.domainCenter.certificates.progress.phase', 'Current state: {{status}}', {
            status: current.status,
          })}
        </span>
        {!serving && !failed && !awaitingOperator ? (
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {t('admin.domainCenter.certificates.progress.attempt', 'Checking again… ({{attempt}})', {
              attempt,
            })}
          </span>
        ) : null}
        {haltReason === 'hidden' ? (
          <span className="text-[11px] text-amber-600 dark:text-amber-300">
            {t('admin.domainCenter.certificates.progress.paused', 'Paused while this tab is in the background.')}
          </span>
        ) : null}
        {haltReason === 'exhausted' ? (
          <span className="text-[11px] text-amber-600 dark:text-amber-300">
            {t(
              'admin.domainCenter.certificates.progress.exhausted',
              'Still running. Close this and refresh the list later.',
            )}
          </span>
        ) : null}
      </div>

      {actionError ? <DomainInlineNotice tone="danger" title={actionError} /> : null}
      {notice ? <DomainInlineNotice tone="success" title={notice} /> : null}
      {presentationError ? (
        <DomainInlineNotice
          tone="danger"
          title={resolveProblemMessage(
            presentationError,
            t,
            t('admin.domainCenter.certificates.manual.notVisible', 'The TXT records could not be read.'),
          )}
        />
      ) : null}

      {manual ? (
        <div className="rounded-lg border border-slate-200 p-3 dark:border-white/10">
          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                {t('admin.domainCenter.certificates.manual.title', 'Publish these DNS records')}
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                {t(
                  'admin.domainCenter.certificates.manual.description',
                  'Add the records at your DNS provider, then verify. Validation is released only after the records are visible.',
                )}
              </div>
            </div>
            {rows.length > 0 ? (
              <DomainSecondaryButton onClick={() => void copyAll()}>
                {t('admin.domainCenter.certificates.manual.copyAll', 'Copy all')}
              </DomainSecondaryButton>
            ) : null}
          </div>

          {!domainCenterService.supportsCertificateChallenges() ? (
            <div className="mt-2 text-[11px] text-amber-600 dark:text-amber-300">
              {t(
                'admin.domainCenter.certificates.progress.manualUnsupported',
                'This console build predates the manual DNS-01 surface; update the deployments SDK to see the records.',
              )}
            </div>
          ) : rows.length === 0 ? (
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t(
                'admin.domainCenter.certificates.manual.waiting',
                'The challenge records appear as soon as the order is prepared.',
              )}
            </div>
          ) : (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
              <table className="w-full text-left text-xs">
                <DomainTableHead
                  columns={[
                    t('admin.domainCenter.certificates.manual.identifier', 'Hostname'),
                    t('admin.domainCenter.certificates.manual.recordName', 'Record name'),
                    t('admin.domainCenter.certificates.manual.recordType', 'Type'),
                    t('admin.domainCenter.certificates.manual.recordValue', 'Value'),
                    '',
                  ]}
                />
                <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                  {rows.map((row) => {
                    const remaining = presentationSecondsRemaining(row.expiresAt, now);
                    return (
                      <tr key={row.key}>
                        <td className="px-3 py-2 font-mono text-[11px]">{row.identifier}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{row.recordName}</td>
                        <td className="px-3 py-2 font-mono text-[11px]">{row.recordType}</td>
                        <td className="px-3 py-2">
                          <div className="break-all font-mono text-[11px]">{row.recordValue}</div>
                          {remaining === undefined ? null : (
                            <div className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                              {remaining === 0
                                ? t('admin.domainCenter.certificates.manual.expired', 'Expired')
                                : t('admin.domainCenter.certificates.manual.expiresIn', 'Expires in {{time}}', {
                                    time: formatCountdown(remaining),
                                  })}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <DomainCopyButton
                            value={manualTxtValuePayload(row)}
                            label={t('admin.domainCenter.certificates.manual.copyValue', 'Copy the record value')}
                            copiedLabel={t('admin.domainCenter.certificates.manual.copied', 'Copied')}
                            failedLabel={t('admin.domainCenter.certificates.manual.copyFailed', 'Copy failed')}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <DomainPrimaryButton
              onClick={() => void verify()}
              disabled={verifying || rows.length === 0 || serving || failed}
            >
              {verifying
                ? t('admin.domainCenter.certificates.manual.verifying', 'Verifying…')
                : t('admin.domainCenter.certificates.manual.verify', 'I published the records — verify')}
            </DomainPrimaryButton>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {challengeNeedsOperatorAction(rows[0]?.status)
                ? t(
                    'admin.domainCenter.certificates.manual.statusPending',
                    'The platform checks the TXT records before asking the CA, so a missing record does not spend a validation attempt.',
                  )
                : t(
                    'admin.domainCenter.certificates.manual.statusValid',
                    'The challenge is validated.',
                  )}
            </span>
          </div>
        </div>
      ) : null}

      {serving ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/40 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/5">
          <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            {t('admin.domainCenter.certificates.result.title', 'Certificate requested')}
          </div>
          <dl className="mt-2 grid gap-x-4 gap-y-1 text-[11px] md:grid-cols-[8rem_1fr]">
            <dt className="text-slate-500 dark:text-slate-400">
              {t('admin.domainCenter.certificates.result.issuer', 'Issued by')}
            </dt>
            <dd className="text-slate-800 dark:text-slate-100">{current.issuer ?? '—'}</dd>
            <dt className="text-slate-500 dark:text-slate-400">
              {t('admin.domainCenter.certificates.result.validity', 'Valid until')}
            </dt>
            <dd className="text-slate-800 dark:text-slate-100">{formatDomainDate(current.notAfter, locale)}</dd>
            <dt className="text-slate-500 dark:text-slate-400">
              {t('admin.domainCenter.certificates.result.san', 'Covers')}
            </dt>
            <dd className="break-all font-mono text-slate-800 dark:text-slate-100">
              {current.identifiers.join(', ')}
            </dd>
          </dl>
        </div>
      ) : null}
    </DomainFormDialog>
  );
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
