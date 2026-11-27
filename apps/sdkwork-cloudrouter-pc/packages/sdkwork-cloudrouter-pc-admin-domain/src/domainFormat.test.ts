import { describe, expect, it } from 'vitest';

import {
  buildDomainAttentionItems,
  certificateDaysUntilExpiry,
  certificateIsExpiringSoon,
  certificateNeedsAttention,
  dnsProviderLabel,
  dnsRecordOwner,
  formatDomainCount,
  formatDomainDate,
  formatDomainDateTime,
  summarizeDomainOverview,
  zoneVerificationRate,
} from './domainFormat';
import type { DomainCertificate, DomainDnsRecord, DomainHostname, DomainZone } from './domainTypes';

function zone(overrides: Partial<DomainZone> = {}): DomainZone {
  return {
    id: 'zone-1',
    apexHostname: 'example.com',
    scope: 'USER',
    status: 'ACTIVE',
    hostnameCount: '2',
    verifiedHostnameCount: '2',
    certificateCount: '1',
    bindingCount: '0',
    updatedAt: '2026-11-01T00:00:00Z',
    version: '1',
    ...overrides,
  };
}

function hostname(overrides: Partial<DomainHostname> = {}): DomainHostname {
  return {
    id: 'hostname-1',
    zoneId: 'zone-1',
    hostname: 'www.example.com',
    relativeName: 'www',
    hostnameType: 'EXACT',
    verificationStatus: 'VERIFIED',
    status: 'ACTIVE',
    certificateCount: '0',
    bindingCount: '0',
    createdAt: '2026-11-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    version: '1',
    ...overrides,
  };
}

function certificate(overrides: Partial<DomainCertificate> = {}): DomainCertificate {
  return {
    id: 'cert-1',
    certName: 'example.com SAN',
    certificateSource: 'MANAGED',
    caProfile: 'LETS_ENCRYPT_PRODUCTION',
    certificateScope: 'SINGLE_DOMAIN',
    validationMethod: 'HTTP_01',
    presentationMode: 'MANAGED',
    archiveStatus: 'SKIPPED',
    preferredKeyAlgorithm: 'RSA',
    identifiers: ['example.com', 'www.example.com'],
    autoRenew: true,
    renewalStatus: 'NONE',
    status: 'ACTIVE',
    renewBeforeDays: 30,
    renewalFailureCount: 0,
    createdAt: '2026-09-01T00:00:00Z',
    updatedAt: '2026-11-01T00:00:00Z',
    version: '1',
    ...overrides,
  };
}

describe('domain formatting', () => {
  it('formats int64 counters that arrive as decimal strings', () => {
    expect(formatDomainCount('12')).toBe('12');
    expect(formatDomainCount(3)).toBe('3');
    expect(formatDomainCount(undefined)).toBe('0');
    expect(formatDomainCount('not-a-number')).toBe('0');
  });

  it('renders a dash for missing timestamps instead of "Invalid Date"', () => {
    expect(formatDomainDateTime(undefined)).toBe('—');
    expect(formatDomainDateTime('not-a-date')).toBe('—');
    expect(formatDomainDate(undefined)).toBe('—');
    expect(formatDomainDateTime('2026-11-17T04:00:00Z')).toContain('2026');
    expect(formatDomainDate('2026-11-17T04:00:00Z')).toContain('2026');
  });

  it('labels the supported DNS families and keeps unknown families visible', () => {
    expect(dnsProviderLabel('ALIYUN_DNS')).toBe('Aliyun DNS');
    expect(dnsProviderLabel('DNSPOD')).toBe('DNSPod');
    expect(dnsProviderLabel('CLOUDFLARE')).toBe('Cloudflare');
    expect(dnsProviderLabel(undefined)).toBe('Deployment default');
    expect(dnsProviderLabel('HUAWEI_DNS')).toBe('HUAWEI_DNS');
  });

  it('resolves the absolute owner of a record from the zone apex', () => {
    const record: DomainDnsRecord = {
      id: 'record-1',
      recordName: '',
      host: 'api',
      recordType: 'A',
      recordValue: '203.0.113.10',
      recordStatus: 'ENABLED',
      dnsProvider: 'ALIYUN_DNS',
      providerAccountId: 'account-1',
      syncedAt: '2026-11-01T00:00:00Z',
    };
    expect(dnsRecordOwner(record, 'example.com')).toBe('api.example.com');
    expect(dnsRecordOwner({ ...record, host: '@' }, 'example.com')).toBe('example.com');
    expect(dnsRecordOwner({ ...record, recordName: 'api.example.com' }, 'example.com')).toBe(
      'api.example.com',
    );
  });
});

describe('domain certificate projections', () => {
  it('prefers the server-derived days-until-expiry', () => {
    expect(certificateDaysUntilExpiry(certificate({ daysUntilExpiry: 12 }))).toBe(12);
    expect(certificateDaysUntilExpiry(certificate({ notAfter: undefined }))).toBeNull();
  });

  it('treats a certificate inside the renewal window as expiring soon', () => {
    expect(certificateIsExpiringSoon(certificate({ daysUntilExpiry: 12 }))).toBe(true);
    expect(certificateIsExpiringSoon(certificate({ daysUntilExpiry: 90 }))).toBe(false);
    expect(certificateIsExpiringSoon(certificate({ status: 'EXPIRED', daysUntilExpiry: -1 }))).toBe(
      false,
    );
  });

  it('raises attention for expiry, failure, and a broken renewal', () => {
    expect(certificateNeedsAttention(certificate({ status: 'EXPIRED' }))).toBe(true);
    expect(certificateNeedsAttention(certificate({ renewalStatus: 'FAILED' }))).toBe(true);
    expect(certificateNeedsAttention(certificate({ daysUntilExpiry: 10 }))).toBe(true);
    expect(certificateNeedsAttention(certificate({ daysUntilExpiry: 200 }))).toBe(false);
  });
});

describe('domain overview summary', () => {
  it('counts zones, hostnames, certificates, and usable DNS accounts', () => {
    const summary = summarizeDomainOverview(
      [zone(), zone({ id: 'zone-2', apexHostname: 'example.org', status: 'PAUSED', scope: 'PLATFORM' })],
      [
        certificate({ status: 'ACTIVE', daysUntilExpiry: 10 }),
        certificate({ id: 'cert-2', status: 'EXPIRED', renewalStatus: 'FAILED' }),
      ],
      [
        {
          id: 'account-1',
          accountCode: 'aliyun-main',
          displayName: 'Aliyun main',
          vendorCode: 'aliyun',
          dnsProvider: 'ALIYUN_DNS',
          scopeType: 'tenant',
          tenantGlobal: true,
          isDefault: true,
          status: 'active',
          credentialConfigured: true,
        },
        {
          id: 'account-2',
          accountCode: 'pending',
          displayName: 'Pending',
          vendorCode: 'cloudflare',
          scopeType: 'user',
          tenantGlobal: false,
          isDefault: false,
          status: 'active',
          credentialConfigured: false,
        },
      ],
      [hostname(), hostname({ id: 'hostname-2', verificationStatus: 'PENDING' })],
    );

    expect(summary.zoneTotal).toBe(2);
    expect(summary.zoneActive).toBe(1);
    expect(summary.zonePaused).toBe(1);
    expect(summary.platformZones).toBe(1);
    expect(summary.hostnameTotal).toBe(2);
    expect(summary.hostnameVerified).toBe(1);
    expect(summary.hostnamePending).toBe(1);
    expect(summary.dnsAccountUsable).toBe(1);
    expect(summary.dnsAccountTotal).toBe(2);
    expect(summary.certificateTotal).toBe(2);
    expect(summary.certificateExpiringSoon).toBe(1);
    expect(summary.certificateExpired).toBe(1);
    expect(summary.certificateRenewalFailed).toBe(1);
    expect(summary.attentionCount).toBe(1 + 1 + 1 + 1 + 1);
  });

  it('reports a fully verified zone at 100% and an empty zone at 100%', () => {
    expect(zoneVerificationRate(zone())).toBe(1);
    expect(zoneVerificationRate(zone({ hostnameCount: '0', verifiedHostnameCount: '0' }))).toBe(1);
    expect(
      zoneVerificationRate(zone({ hostnameCount: '4', verifiedHostnameCount: '1' })),
    ).toBe(0.25);
  });
});

describe('domain attention queue', () => {
  it('orders an expired certificate before an expiring one and skips healthy rows', () => {
    const items = buildDomainAttentionItems(
      [zone()],
      [
        certificate({ id: 'cert-expiring', certName: 'expiring', daysUntilExpiry: 9 }),
        certificate({ id: 'cert-expired', certName: 'expired', status: 'EXPIRED' }),
        certificate({ id: 'cert-healthy', certName: 'healthy', daysUntilExpiry: 200 }),
      ],
      [hostname()],
    );

    expect(items.map((item) => item.subject)).toEqual(['expired', 'expiring']);
    expect(items.every((item) => item.section === 'certificates')).toBe(true);
  });

  it('flags pending hostnames and paused zones', () => {
    const items = buildDomainAttentionItems(
      [zone({ id: 'zone-1' }), zone({ id: 'zone-2', apexHostname: 'example.org', status: 'PAUSED' })],
      [],
      [hostname({ verificationStatus: 'PENDING' })],
    );

    expect(items.some((item) => item.kind === 'pendingHostnames')).toBe(true);
    expect(items.some((item) => item.kind === 'pausedZone' && item.subject === 'example.org')).toBe(
      true,
    );
  });
});
