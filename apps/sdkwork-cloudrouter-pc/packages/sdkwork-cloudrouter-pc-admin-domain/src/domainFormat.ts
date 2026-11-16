/**
 * Pure projections for the Domain Center.
 *
 * Everything here is a deterministic projection of the deployments domain
 * contract: no SDK call, no React state, no locale lookup. The pages consume
 * these helpers so a metric and the list it summarizes can never disagree.
 */

import type {
  DomainAttentionItem,
  DomainCertificate,
  DomainCloudAccount,
  DomainDnsRecord,
  DomainHostname,
  DomainOverviewSummary,
  DomainZone,
} from './domainTypes';

/** Days before expiry at which the certificate inventory starts asking attention. */
export const CERTIFICATE_EXPIRING_SOON_DAYS = 30;

const DATE_TIME_FORMATTER_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
};

export function formatDomainDateTime(value: string | undefined | null, locale = 'en-US'): string {
  if (!value) {
    return '—';
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return '—';
  }
  return new Intl.DateTimeFormat(locale, DATE_TIME_FORMATTER_OPTIONS).format(new Date(timestamp));
}

export function formatDomainDate(value: string | undefined | null, locale = 'en-US'): string {
  if (!value) {
    return '—';
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return '—';
  }
  return new Intl.DateTimeFormat(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(timestamp),
  );
}

/** int64 counters arrive as decimal strings on the wire. */
export function formatDomainCount(value: string | number | undefined | null): string {
  if (value === undefined || value === null || value === '') {
    return '0';
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? String(parsed) : '0';
}

function countOf(value: string | number | undefined | null): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function certificateDaysUntilExpiry(certificate: DomainCertificate): number | null {
  if (typeof certificate.daysUntilExpiry === 'number' && Number.isFinite(certificate.daysUntilExpiry)) {
    return certificate.daysUntilExpiry;
  }
  if (!certificate.notAfter) {
    return null;
  }
  const timestamp = Date.parse(certificate.notAfter);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return Math.floor((timestamp - Date.now()) / 86_400_000);
}

export function certificateIsExpiringSoon(certificate: DomainCertificate): boolean {
  if (certificate.status === 'EXPIRED' || certificate.status === 'REVOKED') {
    return false;
  }
  if (certificate.validityPhase === 'EXPIRING_SOON') {
    return true;
  }
  const days = certificateDaysUntilExpiry(certificate);
  return days !== null && days >= 0 && days <= CERTIFICATE_EXPIRING_SOON_DAYS;
}

export function certificateNeedsAttention(certificate: DomainCertificate): boolean {
  return (
    certificate.status === 'EXPIRED'
    || certificate.status === 'FAILED'
    || certificate.renewalStatus === 'FAILED'
    || certificateIsExpiringSoon(certificate)
  );
}

/** Verified share of a zone's hostnames, 0 when a zone has no pending work. */
export function zoneVerificationRate(zone: DomainZone): number {
  const total = Number(zone.hostnameCount);
  if (!Number.isFinite(total) || total <= 0) {
    return 1;
  }
  const verified = Number(zone.verifiedHostnameCount);
  if (!Number.isFinite(verified)) {
    return 0;
  }
  return Math.max(0, Math.min(1, verified / total));
}

export function zoneIsFullyVerified(zone: DomainZone): boolean {
  return Number(zone.hostnameCount) > 0 && Number(zone.verifiedHostnameCount) >= Number(zone.hostnameCount);
}

export function summarizeDomainOverview(
  zones: readonly DomainZone[],
  certificates: readonly DomainCertificate[],
  accounts: readonly DomainCloudAccount[],
  hostnames: readonly DomainHostname[] = [],
): DomainOverviewSummary {
  const zoneActive = zones.filter((zone) => zone.status === 'ACTIVE').length;
  // When the caller already loaded every hostname row, count rows; otherwise
  // trust the zone counters, which the control plane derives from the same
  // table. Never show 0 because a surface did not fetch the child list.
  const hostnameTotal = hostnames.length > 0
    ? hostnames.length
    : zones.reduce((total, zone) => total + countOf(zone.hostnameCount), 0);
  const hostnameVerified = hostnames.length > 0
    ? hostnames.filter((hostname) => hostname.verificationStatus === 'VERIFIED').length
    : zones.reduce((total, zone) => total + countOf(zone.verifiedHostnameCount), 0);
  const certificateActive = certificates.filter((certificate) => certificate.status === 'ACTIVE').length;
  const certificateExpiringSoon = certificates.filter(certificateIsExpiringSoon).length;
  const certificateExpired = certificates.filter((certificate) => certificate.status === 'EXPIRED').length;
  const certificateRenewalFailed = certificates.filter(
    (certificate) => certificate.renewalStatus === 'FAILED',
  ).length;
  const dnsAccountUsable = accounts.filter(
    (account) => account.status === 'active' && account.credentialConfigured && Boolean(account.dnsProvider),
  ).length;

  return {
    zoneTotal: zones.length,
    zoneActive,
    zonePaused: zones.length - zoneActive,
    platformZones: zones.filter((zone) => zone.scope === 'PLATFORM').length,
    hostnameTotal,
    hostnameVerified,
    hostnamePending: Math.max(0, hostnameTotal - hostnameVerified),
    dnsAccountUsable,
    dnsAccountTotal: accounts.length,
    certificateTotal: certificates.length,
    certificateActive,
    certificateExpiringSoon,
    certificateExpired,
    certificateRenewalFailed,
    attentionCount:
      (zones.length - zoneActive)
      + Math.max(0, hostnameTotal - hostnameVerified)
      + certificateExpiringSoon
      + certificateExpired
      + certificateRenewalFailed,
  };
}

/**
 * What an operator should do next, in the order the risk materializes:
 * an expired certificate breaks TLS now, an expiring one soon, a failed
 * renewal means automation is already broken, then unverified names, then
 * paused zones (intentional, lowest urgency).
 */
export function buildDomainAttentionItems(
  zones: readonly DomainZone[],
  certificates: readonly DomainCertificate[],
  hostnames: readonly DomainHostname[] = [],
): DomainAttentionItem[] {
  const items: DomainAttentionItem[] = [];

  for (const certificate of certificates) {
    if (certificate.status === 'EXPIRED') {
      items.push({
        kind: 'certificateExpired',
        id: `cert-expired:${certificate.id}`,
        subject: certificate.certName,
        detail: certificate.notAfter,
        section: 'certificates',
      });
      continue;
    }
    if (certificate.status === 'FAILED' || certificate.renewalStatus === 'FAILED') {
      items.push({
        kind: 'certificateRenewalFailed',
        id: `cert-renewal-failed:${certificate.id}`,
        subject: certificate.certName,
        detail: certificate.issuer,
        section: 'certificates',
      });
      continue;
    }
    if (certificateIsExpiringSoon(certificate)) {
      const days = certificateDaysUntilExpiry(certificate);
      items.push({
        kind: 'certificateExpiring',
        id: `cert-expiring:${certificate.id}`,
        subject: certificate.certName,
        detail: days === null ? undefined : String(days),
        section: 'certificates',
      });
    }
  }

  const hostnamesByZone = new Map<string, DomainHostname[]>();
  for (const hostname of hostnames) {
    const bucket = hostnamesByZone.get(hostname.zoneId) ?? [];
    bucket.push(hostname);
    hostnamesByZone.set(hostname.zoneId, bucket);
  }

  for (const hostname of hostnames) {
    if (hostname.verificationStatus === 'PENDING' || hostname.verificationStatus === 'FAILED') {
      items.push({
        kind: 'pendingHostnames',
        id: `hostname-pending:${hostname.id}`,
        subject: hostname.hostname,
        section: 'hostnames',
      });
    }
  }

  for (const zone of zones) {
    const zoneHostnames = hostnamesByZone.get(zone.id) ?? [];
    const hasPending = zoneHostnames.some(
      (hostname) => hostname.verificationStatus !== 'VERIFIED',
    );
    if (zone.status === 'PAUSED') {
      items.push({
        kind: 'pausedZone',
        id: `zone-paused:${zone.id}`,
        subject: zone.apexHostname,
        section: 'zones',
      });
      continue;
    }
    if (!hasPending && zoneHostnames.length === 0 && !zoneIsFullyVerified(zone)) {
      items.push({
        kind: 'unverifiedZone',
        id: `zone-unverified:${zone.id}`,
        subject: zone.apexHostname,
        detail: `${formatDomainCount(zone.verifiedHostnameCount)}/${formatDomainCount(zone.hostnameCount)}`,
        section: 'zones',
      });
    }
  }

  return items.sort(
    (left, right) => ATTENTION_SEVERITY[left.kind] - ATTENTION_SEVERITY[right.kind],
  );
}

const ATTENTION_SEVERITY: Record<DomainAttentionItem['kind'], number> = {
  certificateExpired: 0,
  certificateRenewalFailed: 1,
  certificateExpiring: 2,
  pendingHostnames: 3,
  unverifiedZone: 4,
  pausedZone: 5,
};

/** Provider label vocabulary shared by the zone, record, and account surfaces. */
export function dnsProviderLabel(provider: string | undefined): string {
  switch (provider) {
    case 'ALIYUN_DNS':
      return 'Aliyun DNS';
    case 'DNSPOD':
      return 'DNSPod';
    case 'CLOUDFLARE':
      return 'Cloudflare';
    default:
      return provider && provider.trim().length > 0 ? provider : 'Deployment default';
  }
}

/** A record's absolute owner, falling back to the zone-relative host for legacy rows. */
export function dnsRecordOwner(record: DomainDnsRecord, apexHostname: string): string {
  if (record.recordName) {
    return record.recordName;
  }
  const host = record.host === '@' ? apexHostname : `${record.host}.${apexHostname}`;
  return host;
}

export function certificateIdentifierSummary(certificate: DomainCertificate): string {
  if (certificate.identifiers.length === 0) {
    return '—';
  }
  return certificate.identifiers.join(', ');
}
