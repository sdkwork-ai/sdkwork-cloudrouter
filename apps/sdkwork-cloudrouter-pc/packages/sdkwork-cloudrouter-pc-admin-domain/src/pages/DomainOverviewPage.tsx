import { useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, Globe2, RefreshCw, ShieldCheck, Waypoints } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { AdminTableShell, BusinessStateTableRow, resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';

import {
  DomainMetricCard,
  DomainSecondaryButton,
  DomainSectionIntro,
  DomainStatusPill,
  DomainTableHead,
} from '../components/domainUi';
import { domainCenterService } from '../domainService';
import {
  buildDomainAttentionItems,
  certificateDaysUntilExpiry,
  formatDomainCount,
  formatDomainDateTime,
  summarizeDomainOverview,
  zoneVerificationRate,
} from '../domainFormat';
import {
  certificateStatusTone,
  certificateStatusLabel,
  translateDomainLabel,
  zoneScopeLabel,
  zoneStatusLabel,
  zoneStatusTone,
} from '../domainLabels';
import type { DomainCertificate, DomainCloudAccount, DomainZone } from '../domainTypes';
import type { DomainCenterSectionId } from '../domainTypes';

interface OverviewData {
  zones: DomainZone[];
  certificates: DomainCertificate[];
  accounts: DomainCloudAccount[];
}

const EMPTY_DATA: OverviewData = { zones: [], certificates: [], accounts: [] };

export function DomainOverviewPage({
  onNavigate,
}: {
  onNavigate: (section: DomainCenterSectionId, zoneId?: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<OverviewData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      domainCenterService.listAllZones(),
      domainCenterService.listAllCertificates(),
      domainCenterService.listCloudAccounts(),
    ])
      .then(([zones, certificates, accountPage]) => {
        if (!active) {
          return;
        }
        setData({ zones, certificates, accounts: accountPage.items });
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

  const summary = summarizeDomainOverview(data.zones, data.certificates, data.accounts);
  const attention = buildDomainAttentionItems(data.zones, data.certificates);
  const locale = i18n.resolvedLanguage ?? 'en-US';

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-auto p-1">
      <DomainSectionIntro
        title={t('admin.domainCenter.overview.title', 'Domain Center')}
        description={t(
          'admin.domainCenter.overview.description',
          'One control plane for root domains, hostnames, DNS resolution, TLS certificates, and the cloud accounts that publish DNS-01 challenges. The inventory below is read from the authoritative deployment domain contract.',
        )}
        actions={
          <>
            <DomainSecondaryButton onClick={() => setReloadToken((token) => token + 1)} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('admin.domainCenter.actions.refresh', 'Refresh')}
            </DomainSecondaryButton>
            <DomainSecondaryButton onClick={() => onNavigate('zones')}>
              <Globe2 className="h-4 w-4" />
              {t('admin.domainCenter.overview.manageZones', 'Manage domains')}
            </DomainSecondaryButton>
          </>
        }
      />

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          <div className="font-semibold">
            {t('admin.domainCenter.overview.loadError', 'Domain inventory could not be loaded')}
          </div>
          <div className="mt-1">{resolveProblemMessage(error, t, t('admin.domainCenter.errors.load', 'Request failed'))}</div>
        </div>
      ) : null}

      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        <DomainMetricCard
          label={t('admin.domainCenter.overview.metrics.zones', 'Root domains')}
          value={summary.zoneTotal}
          hint={t('admin.domainCenter.overview.metrics.zonesHint', '{{active}} active · {{paused}} paused', {
            active: summary.zoneActive,
            paused: summary.zonePaused,
          })}
        />
        <DomainMetricCard
          label={t('admin.domainCenter.overview.metrics.hostnames', 'Hostnames')}
          value={`${summary.hostnameVerified}/${summary.hostnameTotal}`}
          hint={t('admin.domainCenter.overview.metrics.hostnamesHint', '{{pending}} awaiting ownership proof', {
            pending: summary.hostnamePending,
          })}
          tone={summary.hostnamePending > 0 ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'}
        />
        <DomainMetricCard
          label={t('admin.domainCenter.overview.metrics.certificates', 'Active certificates')}
          value={summary.certificateActive}
          hint={t('admin.domainCenter.overview.metrics.certificatesHint', '{{expiring}} expiring soon · {{expired}} expired', {
            expiring: summary.certificateExpiringSoon,
            expired: summary.certificateExpired,
          })}
          tone={
            summary.certificateExpired > 0 || summary.certificateRenewalFailed > 0
              ? 'text-red-600 dark:text-red-300'
              : summary.certificateExpiringSoon > 0
                ? 'text-amber-600 dark:text-amber-300'
                : 'text-emerald-600 dark:text-emerald-300'
          }
        />
        <DomainMetricCard
          label={t('admin.domainCenter.overview.metrics.dnsAccounts', 'DNS automation accounts')}
          value={`${summary.dnsAccountUsable}/${summary.dnsAccountTotal}`}
          hint={t('admin.domainCenter.overview.metrics.dnsAccountsHint', 'usable for DNS-01 and record sync')}
          tone={summary.dnsAccountUsable === 0 ? 'text-amber-600 dark:text-amber-300' : 'text-slate-800 dark:text-slate-100'}
        />
      </div>

      <div className="grid min-h-0 gap-4 xl:grid-cols-3">
        <section className="flex min-h-0 flex-col gap-2 xl:col-span-2" aria-labelledby="domain-overview-zones">
          <div className="flex items-center justify-between">
            <h2 id="domain-overview-zones" className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('admin.domainCenter.overview.zoneTitle', 'Root domains')}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('zones')}
              className="inline-flex items-center gap-1 text-xs font-medium text-lobster-600 hover:text-lobster-700 dark:text-lobster-300"
            >
              {t('admin.domainCenter.overview.viewAll', 'View all')}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <AdminTableShell className="min-h-[260px] rounded-xl dark:bg-[#1a1a1a]">
            <table className="w-full min-w-[720px] whitespace-nowrap text-left text-sm">
              <DomainTableHead
                columns={[
                  t('admin.domainCenter.columns.apexHostname', 'Root domain'),
                  t('admin.domainCenter.columns.dnsProvider', 'DNS provider'),
                  t('admin.domainCenter.columns.hostnames', 'Hostnames'),
                  t('admin.domainCenter.columns.certificates', 'Certificates'),
                  t('admin.domainCenter.columns.status', 'Status'),
                  t('admin.domainCenter.columns.updatedAt', 'Updated'),
                ]}
              />
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 dark:divide-white/5 dark:text-slate-300">
                {loading ? (
                  <BusinessStateTableRow
                    colSpan={6}
                    kind="loading"
                    title={t('admin.domainCenter.overview.loading', 'Loading domain inventory...')}
                  />
                ) : data.zones.length === 0 ? (
                  <BusinessStateTableRow
                    colSpan={6}
                    kind="empty"
                    title={t('admin.domainCenter.overview.emptyZones', 'No root domain registered yet')}
                    description={t(
                      'admin.domainCenter.overview.emptyZonesDesc',
                      'Register a root domain, then add hostnames and publish DNS records or certificates for it.',
                    )}
                    action={{
                      label: t('admin.domainCenter.actions.addZone', 'Register root domain'),
                      onClick: () => onNavigate('zones'),
                    }}
                  />
                ) : (
                  data.zones.slice(0, 8).map((zone) => {
                    const rate = Math.round(zoneVerificationRate(zone) * 100);
                    const status = translateDomainLabel(t, zoneStatusLabel(zone.status));
                    return (
                      <tr
                        key={zone.id}
                        className="cursor-pointer transition hover:bg-slate-50 dark:hover:bg-white/5"
                        onClick={() => onNavigate('zones', zone.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Globe2 className="h-4 w-4 text-lobster-500" />
                            <div>
                              <div className="font-mono text-[12px] font-semibold text-slate-900 dark:text-white">
                                {zone.apexHostname}
                              </div>
                              <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{zone.displayName || '—'}</span>
                                <DomainStatusPill
                                  label={translateDomainLabel(t, zoneScopeLabel(zone.scope))}
                                  tone={zone.scope === 'PLATFORM' ? 'info' : 'neutral'}
                                />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{zone.dnsProvider || '—'}</td>
                        <td className="px-4 py-3">
                          <div className="tabular-nums">
                            {formatDomainCount(zone.verifiedHostnameCount)}/{formatDomainCount(zone.hostnameCount)}
                          </div>
                          <div className="mt-1 h-1 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${rate}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 tabular-nums">{formatDomainCount(zone.certificateCount)}</td>
                        <td className="px-4 py-3">
                          <DomainStatusPill label={status} tone={zoneStatusTone(zone.status)} />
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {formatDomainDateTime(zone.updatedAt, locale)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </AdminTableShell>
        </section>

        <div className="flex flex-col gap-4">
          <section
            className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1a1a1a]"
            aria-labelledby="domain-overview-tls"
          >
            <h2 id="domain-overview-tls" className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
              {t('admin.domainCenter.overview.tlsTitle', 'TLS coverage')}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <OverviewStat
                label={t('admin.domainCenter.overview.tls.active', 'Active')}
                value={summary.certificateActive}
                tone="text-emerald-600 dark:text-emerald-300"
              />
              <OverviewStat
                label={t('admin.domainCenter.overview.tls.expiring', 'Expiring ≤30d')}
                value={summary.certificateExpiringSoon}
                tone="text-amber-600 dark:text-amber-300"
              />
              <OverviewStat
                label={t('admin.domainCenter.overview.tls.expired', 'Expired')}
                value={summary.certificateExpired}
                tone="text-red-600 dark:text-red-300"
              />
              <OverviewStat
                label={t('admin.domainCenter.overview.tls.renewalFailed', 'Renewal failed')}
                value={summary.certificateRenewalFailed}
                tone="text-red-600 dark:text-red-300"
              />
            </div>
            <button
              type="button"
              onClick={() => onNavigate('certificates')}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-lobster-600 hover:text-lobster-700 dark:text-lobster-300"
            >
              {t('admin.domainCenter.overview.manageCertificates', 'Manage certificates')}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </section>

          <section
            className="min-h-0 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1a1a1a]"
            aria-labelledby="domain-overview-attention"
          >
            <h2 id="domain-overview-attention" className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              {t('admin.domainCenter.overview.attentionTitle', 'Needs attention')}
            </h2>
            {attention.length === 0 ? (
              <p className="mt-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Waypoints className="h-4 w-4 text-emerald-500" />
                {t('admin.domainCenter.overview.attentionEmpty', 'Every domain, record, and certificate is healthy.')}
              </p>
            ) : (
              <ul className="mt-2 flex max-h-64 flex-col gap-2 overflow-auto">
                {attention.slice(0, 12).map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onNavigate(item.section)}
                      className="flex w-full items-start justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 text-left transition hover:border-lobster-200 hover:bg-lobster-50/40 dark:border-white/5 dark:hover:border-lobster-500/30 dark:hover:bg-white/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-[12px] text-slate-800 dark:text-slate-100">
                          {item.subject}
                        </span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                          {translateAttentionKind(t, item.kind)}
                          {item.detail ? ` · ${item.detail}` : ''}
                        </span>
                      </span>
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <section aria-labelledby="domain-overview-expiring" className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#1a1a1a]">
        <h2 id="domain-overview-expiring" className="text-sm font-semibold text-slate-900 dark:text-white">
          {t('admin.domainCenter.overview.expiringTitle', 'Certificates by expiry')}
        </h2>
        {data.certificates.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            {t('admin.domainCenter.overview.noCertificates', 'No certificate issued yet.')}
          </p>
        ) : (
          <ul className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {[...data.certificates]
              .sort((left, right) => (certificateDaysUntilExpiry(left) ?? 9999) - (certificateDaysUntilExpiry(right) ?? 9999))
              .slice(0, 6)
              .map((certificate) => {
                const days = certificateDaysUntilExpiry(certificate);
                const status = translateDomainLabel(t, certificateStatusLabel(certificate.status));
                return (
                  <li
                    key={certificate.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-white/5"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-slate-800 dark:text-slate-100">
                        {certificate.certName}
                      </div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {certificate.identifiers.join(', ') || '—'}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                        {days === null
                          ? '—'
                          : t('admin.domainCenter.certificates.daysLeft', '{{days}}d', { days })}
                      </span>
                      <DomainStatusPill label={status} tone={certificateStatusTone(certificate.status)} />
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </section>
    </div>
  );
}

function OverviewStat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
      <div className="text-[11px] text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`text-lg font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  );
}

function translateAttentionKind(
  t: (key: string, fallback: string) => string,
  kind: 'unverifiedZone' | 'pausedZone' | 'pendingHostnames' | 'certificateExpiring' | 'certificateExpired' | 'certificateRenewalFailed',
): string {
  switch (kind) {
    case 'unverifiedZone':
      return t('admin.domainCenter.attention.unverifiedZone', 'Ownership not verified');
    case 'pausedZone':
      return t('admin.domainCenter.attention.pausedZone', 'Zone paused');
    case 'pendingHostnames':
      return t('admin.domainCenter.attention.pendingHostname', 'Hostname awaiting verification');
    case 'certificateExpiring':
      return t('admin.domainCenter.attention.certificateExpiring', 'Certificate expiring soon');
    case 'certificateExpired':
      return t('admin.domainCenter.attention.certificateExpired', 'Certificate expired');
    default:
      return t('admin.domainCenter.attention.certificateRenewalFailed', 'Certificate renewal failed');
  }
}
