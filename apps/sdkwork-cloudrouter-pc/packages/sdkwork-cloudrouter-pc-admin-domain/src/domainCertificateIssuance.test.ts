import { describe, expect, it } from 'vitest';

import {
  addCertificateIdentifiers,
  buildManualTxtRows,
  certificateArchiveState,
  certificateArchiveTone,
  certificatePollStop,
  challengeNeedsOperatorAction,
  driveSpaceHref,
  formatCountdown,
  isCertificateServing,
  isCertificateIssuanceFailure,
  isValidCertificateIdentifier,
  isWildcardCertificateIdentifier,
  manualChallengeActionState,
  manualTxtCopyAllPayload,
  normalizeCertificateIdentifier,
  normalizePresentationMode,
  parseArchiveStatus,
  parsePresentationMode,
  presentationSecondsRemaining,
  reconcileCertificateMode,
  relativeRecordName,
  shouldAwaitManualChallenge,
} from './domainCertificateIssuance';
import type { DomainCertificateChallengePresentation } from './domainTypes';

function presentation(
  overrides: Partial<DomainCertificateChallengePresentation> = {},
): DomainCertificateChallengePresentation {
  return {
    presentationMode: 'MANUAL',
    presentationReleased: false,
    items: [],
    ...overrides,
  };
}

describe('certificate identifier chips', () => {
  it('canonicalizes case, surrounding space, and a trailing dot', () => {
    expect(normalizeCertificateIdentifier('  API.Example.COM. ')).toBe('api.example.com');
  });

  it('accepts a single leading-label wildcard and ordinary FQDNs', () => {
    expect(isValidCertificateIdentifier('*.example.com')).toBe(true);
    expect(isValidCertificateIdentifier('api.example.com')).toBe(true);
    expect(isValidCertificateIdentifier('xn--fiqs8s.example.com')).toBe(true);
  });

  it('rejects multi-level or mid-label wildcards instead of repairing them', () => {
    expect(isValidCertificateIdentifier('*.*.example.com')).toBe(false);
    expect(isValidCertificateIdentifier('a.*.example.com')).toBe(false);
  });

  it('rejects schemes, paths, ports, IP literals, and single-label names', () => {
    for (const invalid of [
      'https://example.com',
      'example.com/api',
      'example.com:443',
      'mailto:ops@example.com',
      'localhost',
      '192.0.2.10',
      '',
    ]) {
      expect(isValidCertificateIdentifier(invalid), invalid).toBe(false);
    }
  });

  it('detects a wildcard request', () => {
    expect(isWildcardCertificateIdentifier('*.Example.com')).toBe(true);
    expect(isWildcardCertificateIdentifier('example.com')).toBe(false);
  });

  it('splits a pasted list, dedupes case-insensitively, and reports the first rejection', () => {
    const result = addCertificateIdentifiers(['api.example.com'], 'API.example.com, *.example.com');
    expect(result.identifiers).toEqual(['api.example.com', '*.example.com']);
    expect(result.rejection).toBe('duplicate');

    const mixed = addCertificateIdentifiers([], 'not-a-fqdn, www.example.com');
    expect(mixed.identifiers).toEqual(['www.example.com']);
    expect(mixed.rejection).toBe('invalid');
  });

  it('reports empty input rather than silently succeeding', () => {
    const result = addCertificateIdentifiers(['api.example.com'], '   ');
    expect(result.identifiers).toEqual(['api.example.com']);
    expect(result.rejection).toBe('empty');
  });
});

describe('presentation mode and validation consistency', () => {
  it('defaults an absent mode to MANAGED, matching the contract default', () => {
    expect(normalizePresentationMode(undefined)).toBe('MANAGED');
    expect(normalizePresentationMode('MANUAL')).toBe('MANUAL');
  });

  it('narrows only the closed wire set', () => {
    expect(parsePresentationMode('MANUAL')).toBe('MANUAL');
    expect(parsePresentationMode('manual')).toBeUndefined();
    expect(parsePresentationMode(undefined)).toBeUndefined();
  });

  it('forces DNS-01 for a manual presentation', () => {
    expect(
      reconcileCertificateMode({
        presentationMode: 'MANUAL',
        validationMethod: 'HTTP_01',
        certificateScope: 'SINGLE_DOMAIN',
      }).validationMethod,
    ).toBe('DNS_01');
  });

  it('forces DNS-01 for a wildcard scope in either mode', () => {
    expect(
      reconcileCertificateMode({
        presentationMode: 'MANAGED',
        validationMethod: 'HTTP_01',
        certificateScope: 'WILDCARD',
      }).validationMethod,
    ).toBe('DNS_01');
  });

  it('keeps an operator choice that the rules allow', () => {
    expect(
      reconcileCertificateMode({
        presentationMode: 'MANAGED',
        validationMethod: 'HTTP_01',
        certificateScope: 'SINGLE_DOMAIN',
      }).validationMethod,
    ).toBe('HTTP_01');
  });
});

describe('issuance polling', () => {
  const base = {
    attempt: 1,
    maxAttempts: 10,
    status: 'ISSUING' as const,
    awaitingOperator: false,
    documentHidden: false,
    aborted: false,
  };

  it('keeps polling while the certificate is still being issued', () => {
    expect(certificatePollStop(base).stop).toBe(false);
  });

  it('stops on every terminal status', () => {
    for (const status of ['ACTIVE', 'EXPIRED', 'FAILED', 'REVOKED'] as const) {
      expect(certificatePollStop({ ...base, status }).reason).toBe('terminal');
    }
  });

  it('stops while waiting for the operator instead of burning the CA budget', () => {
    expect(certificatePollStop({ ...base, awaitingOperator: true }).reason).toBe('awaitingOperator');
  });

  it('pauses on a hidden tab, honours abort, and is bounded by maxAttempts', () => {
    expect(certificatePollStop({ ...base, documentHidden: true }).reason).toBe('hidden');
    expect(certificatePollStop({ ...base, aborted: true }).reason).toBe('aborted');
    expect(certificatePollStop({ ...base, attempt: 10 }).reason).toBe('exhausted');
  });

  it('treats only ACTIVE as serving and FAILED/REVOKED as failures', () => {
    expect(isCertificateServing('ACTIVE')).toBe(true);
    expect(isCertificateServing('ISSUING')).toBe(false);
    expect(isCertificateIssuanceFailure('FAILED')).toBe(true);
    expect(isCertificateIssuanceFailure('REVOKED')).toBe(true);
    expect(isCertificateIssuanceFailure('ACTIVE')).toBe(false);
  });
});

describe('manual DNS-01 presentation', () => {
  const manual = presentation({
    items: [
      {
        identifier: '*.example.com',
        recordName: '_acme-challenge.example.com',
        recordType: 'TXT',
        recordValue: 'value-one',
        status: 'PENDING',
      },
      {
        identifier: 'example.com',
        recordName: '_acme-challenge.example.com',
        recordType: 'TXT',
        recordValue: 'value-two',
        status: 'PROCESSING',
      },
    ],
  });

  it('waits for the operator only before release and before a terminal status', () => {
    expect(shouldAwaitManualChallenge(manual, 'ISSUING')).toBe(true);
    expect(shouldAwaitManualChallenge(manual, 'ACTIVE')).toBe(false);
    expect(
      shouldAwaitManualChallenge(presentation({ ...manual, presentationReleased: true }), 'ISSUING'),
    ).toBe(false);
    expect(
      shouldAwaitManualChallenge(presentation({ ...manual, presentationMode: 'MANAGED' }), 'ISSUING'),
    ).toBe(false);
    expect(shouldAwaitManualChallenge(undefined, 'ISSUING')).toBe(false);
  });

  it('derives the apex-relative owner only inside the zone', () => {
    expect(relativeRecordName('_acme-challenge.example.com', 'example.com')).toBe('_acme-challenge');
    expect(relativeRecordName('_acme-challenge.example.com', '*.example.com')).toBe('_acme-challenge');
    expect(relativeRecordName('example.com', 'example.com')).toBe('@');
    expect(relativeRecordName('_acme-challenge.other.test', 'example.com')).toBeUndefined();
    expect(relativeRecordName(undefined, 'example.com')).toBeUndefined();
  });

  it('builds one paste-able row per record, preserving the value verbatim', () => {
    const rows = buildManualTxtRows(manual, { apexHostname: 'example.com' });
    expect(rows).toHaveLength(2);
    expect(rows[0]?.recordType).toBe('TXT');
    expect(rows[0]?.recordValue).toBe('value-one');
    expect(rows[0]?.relativeRecordName).toBe('_acme-challenge');
    expect(rows[0]?.copyPayload).toBe('TXT _acme-challenge "value-one"');
    expect(manualTxtCopyAllPayload(rows)).toBe(
      'TXT _acme-challenge "value-one"\nTXT _acme-challenge "value-two"',
    );
  });

  it('drops a challenge with no value rather than rendering an empty box', () => {
    const rows = buildManualTxtRows(
      presentation({ items: [{ identifier: 'a.example.com', status: 'PENDING' }] }),
    );
    expect(rows).toHaveLength(0);
  });

  it('falls back to the fully qualified owner when the apex is unknown', () => {
    const [row] = buildManualTxtRows(manual);
    expect(row?.relativeRecordName).toBeUndefined();
    expect(row?.copyPayload).toBe('TXT _acme-challenge.example.com "value-one"');
  });

  it('knows which challenge states still need the operator', () => {
    expect(challengeNeedsOperatorAction('PENDING')).toBe(true);
    expect(challengeNeedsOperatorAction('PROCESSING')).toBe(true);
    expect(challengeNeedsOperatorAction(undefined)).toBe(true);
    expect(challengeNeedsOperatorAction('VALID')).toBe(false);
  });

  it('aggregates wildcard and apex challenge states without hiding a failure', () => {
    const rows = buildManualTxtRows(manual);
    expect(manualChallengeActionState(rows)).toBe('pending');
    expect(manualChallengeActionState(rows.map((row) => ({ ...row, status: 'VALID' })))).toBe('valid');
    expect(
      manualChallengeActionState(rows.map((row, index) => ({
        ...row,
        status: index === 0 ? 'VALID' : 'INVALID',
      }))),
    ).toBe('invalid');
    expect(manualChallengeActionState([])).toBe('pending');
  });

  it('counts down to the presentation deadline and formats it', () => {
    const now = Date.parse('2026-11-26T00:00:00Z');
    expect(presentationSecondsRemaining('2026-11-26T00:01:30Z', now)).toBe(90);
    expect(presentationSecondsRemaining('2026-11-25T00:00:00Z', now)).toBe(0);
    expect(presentationSecondsRemaining('not-a-date', now)).toBeUndefined();
    expect(presentationSecondsRemaining(undefined, now)).toBeUndefined();
    expect(formatCountdown(90)).toBe('01:30');
    expect(formatCountdown(3671)).toBe('1:01:11');
    expect(formatCountdown(-5)).toBe('00:00');
  });
});

describe('archive state projection', () => {
  it('never reports archived unless the server said ARCHIVED', () => {
    expect(certificateArchiveState({ archiveStatus: 'PENDING', archiveSpaceId: 'space-1' })).toEqual({
      kind: 'pending',
    });
    expect(
      certificateArchiveState({ archiveStatus: 'ARCHIVED', archiveSpaceId: 'space-1' }),
    ).toEqual({ kind: 'archived', spaceId: 'space-1' });
  });

  it('reports an unknown state for an absent or unmodelled value', () => {
    expect(certificateArchiveState({})).toEqual({ kind: 'unknown' });
    expect(certificateArchiveState({ archiveStatus: 'BRAND_NEW' })).toEqual({ kind: 'unknown' });
    expect(parseArchiveStatus('FAILED')).toBe('FAILED');
    expect(parseArchiveStatus('failed')).toBeUndefined();
  });

  it('marks a failure retryable and a skip neutral', () => {
    expect(certificateArchiveState({ archiveStatus: 'FAILED' })).toEqual({
      kind: 'failed',
      retryable: true,
    });
    expect(certificateArchiveTone(certificateArchiveState({ archiveStatus: 'ARCHIVED' }))).toBe(
      'success',
    );
    expect(certificateArchiveTone(certificateArchiveState({ archiveStatus: 'FAILED' }))).toBe(
      'danger',
    );
    expect(certificateArchiveTone(certificateArchiveState({}))).toBe('neutral');
  });

  it('deep-links the drive space by encoded id', () => {
    expect(driveSpaceHref('space-1')).toBe('/admin/drive/spaces/space-1');
    expect(driveSpaceHref('a/b')).toBe('/admin/drive/spaces/a%2Fb');
  });
});
