import { describe, expect, it } from 'vitest';

import {
  DOMAIN_CENTER_SECTIONS,
  domainCenterSectionPath,
  normalizeDomainCenterSection,
} from './domainSections';

describe('domain center sections', () => {
  it('lists the six operator surfaces in navigation order', () => {
    expect([...DOMAIN_CENTER_SECTIONS]).toEqual([
      'overview',
      'zones',
      'hostnames',
      'dns',
      'certificates',
      'accounts',
    ]);
  });

  it('normalizes route segments case-insensitively and trims whitespace', () => {
    expect(normalizeDomainCenterSection(' ZONES ')).toBe('zones');
    expect(normalizeDomainCenterSection('certificates')).toBe('certificates');
  });

  it('falls back to the overview for a missing or unknown section', () => {
    expect(normalizeDomainCenterSection(undefined)).toBe('overview');
    expect(normalizeDomainCenterSection('')).toBe('overview');
    expect(normalizeDomainCenterSection('unknown')).toBe('overview');
  });

  it('maps the overview to the module root and every other section under it', () => {
    expect(domainCenterSectionPath('overview')).toBe('/admin/domains');
    expect(domainCenterSectionPath('dns')).toBe('/admin/domains/dns');
    expect(domainCenterSectionPath('accounts')).toBe('/admin/domains/accounts');
  });
});
