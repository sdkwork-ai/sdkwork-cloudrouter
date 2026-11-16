import type { DomainCenterSectionId } from './domainTypes';

/** The six operator surfaces of the Domain Center, in navigation order. */
export const DOMAIN_CENTER_SECTIONS: readonly DomainCenterSectionId[] = [
  'overview',
  'zones',
  'hostnames',
  'dns',
  'certificates',
  'accounts',
];

/**
 * Coerces a route segment (or a stored value) into a known section. An unknown
 * or missing value renders the overview rather than a blank screen, matching
 * the shell's behavior for a stale deep link.
 */
export function normalizeDomainCenterSection(value: string | undefined): DomainCenterSectionId {
  const candidate = value?.trim().toLowerCase();
  return (DOMAIN_CENTER_SECTIONS as readonly string[]).includes(candidate ?? '')
    ? (candidate as DomainCenterSectionId)
    : 'overview';
}

/** Route path for a section; the overview is the module root. */
export function domainCenterSectionPath(section: DomainCenterSectionId): string {
  return section === 'overview' ? '/admin/domains' : `/admin/domains/${section}`;
}
