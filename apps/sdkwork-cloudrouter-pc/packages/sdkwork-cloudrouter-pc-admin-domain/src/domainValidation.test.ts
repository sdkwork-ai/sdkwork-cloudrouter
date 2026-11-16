import { describe, expect, it } from 'vitest';

import {
  hasDomainFieldErrors,
  isValidApexHostname,
  isValidDnsTarget,
  isValidIpv4,
  isValidIpv6,
  isValidRelativeName,
  normalizeApexHostname,
  normalizeRelativeName,
  parsePriority,
  parseTtlSeconds,
  toCreateCertificateInput,
  toCreateZoneInput,
  toDnsRecordInput,
  toVerificationFileInput,
  validateCertificateForm,
  validateCloudAccountForm,
  validateDnsRecordForm,
  validateVerificationFileForm,
  validateZoneForm,
  type DomainCertificateForm,
  type DomainCloudAccountForm,
  type DomainDnsRecordForm,
  type DomainVerificationFileForm,
  type DomainZoneForm,
} from './domainValidation';

const validZone: DomainZoneForm = {
  apexHostname: 'Example.COM',
  displayName: 'Primary site',
  dnsProvider: 'ALIYUN_DNS',
  providerAccountId: '',
};

const validRecord: DomainDnsRecordForm = {
  recordType: 'A',
  host: 'www',
  recordValue: '203.0.113.10',
  ttlSeconds: '600',
  priority: '',
  recordLine: '',
};

const validCertificate: DomainCertificateForm = {
  certName: 'example.com',
  domainIds: ['domain-1'],
  certificateScope: 'SINGLE_DOMAIN',
  validationMethod: 'AUTO',
  caProfile: 'LETS_ENCRYPT_PRODUCTION',
  preferredKeyAlgorithm: 'RSA',
  autoRenew: true,
  renewBeforeDays: '30',
  providerAccountId: '',
};

const validAccount: DomainCloudAccountForm = {
  displayName: 'Aliyun main',
  accountCode: 'aliyun-main',
  dnsProvider: 'ALIYUN_DNS',
  scopeType: 'tenant',
  environment: 'production',
  isDefault: true,
  accessKeyId: 'LTAI-example',
  secretAccessKey: 'secret-value',
  confirmsCredential: true,
};

const validVerificationFile: DomainVerificationFileForm = {
  platform: 'WECHAT_OFFICIAL_ACCOUNT',
  fileName: 'MP_verify_abc123.txt',
  content: 'abc123',
};

describe('hostname normalization and validation', () => {
  it('normalizes an apex to lower-case without a trailing dot', () => {
    expect(normalizeApexHostname(' Example.COM. ')).toBe('example.com');
    expect(normalizeRelativeName(' WWW ')).toBe('www');
  });

  it('accepts registrable root domains including multi-label public suffixes', () => {
    expect(isValidApexHostname('example.com')).toBe(true);
    expect(isValidApexHostname('example.co.uk')).toBe(true);
    expect(isValidApexHostname('示例.中国')).toBe(true);
  });

  it('rejects schemes, paths, ports, wildcards, and single-label names', () => {
    expect(isValidApexHostname('https://example.com')).toBe(false);
    expect(isValidApexHostname('example.com/path')).toBe(false);
    expect(isValidApexHostname('example.com:443')).toBe(false);
    expect(isValidApexHostname('*.example.com')).toBe(false);
    expect(isValidApexHostname('localhost')).toBe(false);
    expect(isValidApexHostname('-bad.example.com')).toBe(false);
    expect(isValidApexHostname('')).toBe(false);
  });

  it('accepts the apex marker, wildcards, and multi-level relative names', () => {
    expect(isValidRelativeName('@')).toBe(true);
    expect(isValidRelativeName('*')).toBe(true);
    expect(isValidRelativeName('*.api')).toBe(true);
    expect(isValidRelativeName('api.eu')).toBe(true);
    expect(isValidRelativeName('a*b')).toBe(false);
    expect(isValidRelativeName('bad-')).toBe(false);
    expect(isValidRelativeName('')).toBe(false);
  });
});

describe('record value validation', () => {
  it('validates IPv4 and IPv6 literals', () => {
    expect(isValidIpv4('203.0.113.10')).toBe(true);
    expect(isValidIpv4('203.0.113.999')).toBe(false);
    expect(isValidIpv4('203.0.113')).toBe(false);
    expect(isValidIpv6('2001:db8::1')).toBe(true);
    expect(isValidIpv6('2001:db8')).toBe(false);
    expect(isValidIpv6('not-an-ip')).toBe(false);
  });

  it('validates DNS targets with and without a trailing dot', () => {
    expect(isValidDnsTarget('target.example.com')).toBe(true);
    expect(isValidDnsTarget('target.example.com.')).toBe(true);
    expect(isValidDnsTarget('localhost')).toBe(false);
    expect(isValidDnsTarget('target example.com')).toBe(false);
  });

  it('treats TTL and priority as optional bounded integers', () => {
    expect(parseTtlSeconds('')).toBeUndefined();
    expect(parseTtlSeconds('600')).toBe(600);
    expect(parseTtlSeconds('59')).toBeNull();
    expect(parseTtlSeconds('86401')).toBeNull();
    expect(parseTtlSeconds('1.5')).toBeNull();
    expect(parsePriority('')).toBeUndefined();
    expect(parsePriority('10')).toBe(10);
    expect(parsePriority('65536')).toBeNull();
    expect(parsePriority('-1')).toBeNull();
  });
});

describe('form validation', () => {
  it('accepts a valid zone and normalizes its apex on submit', () => {
    expect(hasDomainFieldErrors(validateZoneForm(validZone))).toBe(false);
    expect(toCreateZoneInput(validZone)).toEqual({
      apexHostname: 'example.com',
      displayName: 'Primary site',
      dnsProvider: 'ALIYUN_DNS',
    });
  });

  it('reports an invalid apex and an over-long display name', () => {
    const errors = validateZoneForm({
      ...validZone,
      apexHostname: 'https://example.com',
      displayName: 'x'.repeat(129),
    });
    expect(errors.apexHostname).toBe('admin.domainCenter.validation.invalidApexHostname');
    expect(errors.displayName).toBe('admin.domainCenter.validation.tooLong');
  });

  it('accepts a valid A record and converts optional fields', () => {
    expect(hasDomainFieldErrors(validateDnsRecordForm(validRecord))).toBe(false);
    expect(toDnsRecordInput(validRecord)).toEqual({
      recordType: 'A',
      host: 'www',
      recordValue: '203.0.113.10',
      ttlSeconds: 600,
    });
  });

  it('requires an MX priority and rejects one on other record types', () => {
    const mxMissingPriority = validateDnsRecordForm({
      ...validRecord,
      recordType: 'MX',
      recordValue: 'mail.example.com',
    });
    expect(mxMissingPriority.priority).toBe('admin.domainCenter.validation.priorityRequired');

    const aWithPriority = validateDnsRecordForm({ ...validRecord, priority: '10' });
    expect(aWithPriority.priority).toBe('admin.domainCenter.validation.priorityNotAllowed');
  });

  it('validates CAA values against the RFC 8659 shape', () => {
    expect(
      hasDomainFieldErrors(
        validateDnsRecordForm({
          ...validRecord,
          recordType: 'CAA',
          recordValue: '0 issue "letsencrypt.org"',
        }),
      ),
    ).toBe(false);
    expect(
      validateDnsRecordForm({
        ...validRecord,
        recordType: 'CAA',
        recordValue: 'issue letsencrypt.org',
      }).recordValue,
    ).toBe('admin.domainCenter.validation.invalidCaa');
  });

  it('rejects HTTP-01 for a wildcard certificate and requires identifiers', () => {
    const errors = validateCertificateForm({
      ...validCertificate,
      certificateScope: 'WILDCARD',
      validationMethod: 'HTTP_01',
      domainIds: [],
    });
    expect(errors.validationMethod).toBe('admin.domainCenter.validation.wildcardRequiresDns01');
    expect(errors.domainIds).toBe('admin.domainCenter.validation.identifiersRequired');
  });

  it('carries the certificate defaults into the request', () => {
    expect(toCreateCertificateInput(validCertificate)).toEqual({
      certName: 'example.com',
      domainIds: ['domain-1'],
      certificateScope: 'SINGLE_DOMAIN',
      validationMethod: 'AUTO',
      caProfile: 'LETS_ENCRYPT_PRODUCTION',
      preferredKeyAlgorithm: 'RSA',
      autoRenew: true,
      renewBeforeDays: 30,
    });
  });

  it('requires the public key half only for key-pair DNS families', () => {
    expect(hasDomainFieldErrors(validateCloudAccountForm(validAccount))).toBe(false);

    const cloudflare = validateCloudAccountForm({
      ...validAccount,
      dnsProvider: 'CLOUDFLARE',
      accessKeyId: '',
    });
    expect(cloudflare.accessKeyId).toBeUndefined();

    const aliyunWithoutKeyId = validateCloudAccountForm({ ...validAccount, accessKeyId: '' });
    expect(aliyunWithoutKeyId.accessKeyId).toBe('admin.domainCenter.validation.required');

    const unattested = validateCloudAccountForm({ ...validAccount, confirmsCredential: false });
    expect(unattested.confirmsCredential).toBe(
      'admin.domainCenter.validation.credentialConfirmationRequired',
    );
  });

  it('accepts platform verification files and rejects traversal shapes', () => {
    expect(hasDomainFieldErrors(validateVerificationFileForm(validVerificationFile))).toBe(false);
    expect(toVerificationFileInput(validVerificationFile)).toEqual({
      platform: 'WECHAT_OFFICIAL_ACCOUNT',
      fileName: 'MP_verify_abc123.txt',
      content: 'abc123',
    });
    expect(
      validateVerificationFileForm({ ...validVerificationFile, fileName: '../secret.txt' }).fileName,
    ).toBe('admin.domainCenter.validation.invalidVerificationFileName');
  });
});
