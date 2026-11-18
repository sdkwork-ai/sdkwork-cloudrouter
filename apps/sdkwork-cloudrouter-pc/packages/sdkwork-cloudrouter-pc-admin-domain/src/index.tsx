import { useEffect, useState } from 'react';

import { DomainOverviewPage } from './pages/DomainOverviewPage';
import { DomainZonesPage } from './pages/DomainZonesPage';
import { DomainHostnamesPage } from './pages/DomainHostnamesPage';
import { DomainDnsRecordsPage } from './pages/DomainDnsRecordsPage';
import { DomainCertificatesPage } from './pages/DomainCertificatesPage';
import { DomainAccountsPage } from './pages/DomainAccountsPage';
import { normalizeDomainCenterSection } from './domainSections';
import type { DomainCenterSectionId } from './domainTypes';

export interface DomainCenterAdminProps {
  /** Section resolved from the host route. Defaults to the overview. */
  sectionId?: string;
  /** Zone preselected by a deep link or by a cross-section action. */
  initialZoneId?: string;
  /**
   * Section navigation. The host turns this into a real route change so the
   * browser back button, deep links, and the sidebar stay in agreement. When it
   * is omitted (isolated rendering, tests) the module still switches locally.
   */
  onSectionChange?: (section: DomainCenterSectionId, zoneId?: string) => void;
}

/**
 * Domain Center shell.
 *
 * Navigation lives in the admin sidebar (`adminModuleRegistry.ts`) and nowhere
 * else: a second tab strip inside the module would show the same six entries
 * twice and make the active section ambiguous. Cross-section handoffs (for
 * example "Manage hostnames" on a root-domain row) still call
 * `onSectionChange`, which the host turns into a real route change.
 */
export function DomainCenterAdmin({ sectionId, initialZoneId, onSectionChange }: DomainCenterAdminProps) {
  const [section, setSection] = useState<DomainCenterSectionId>(() =>
    normalizeDomainCenterSection(sectionId),
  );
  const [zoneId, setZoneId] = useState(initialZoneId ?? '');

  useEffect(() => {
    setSection(normalizeDomainCenterSection(sectionId));
  }, [sectionId]);

  useEffect(() => {
    if (initialZoneId !== undefined) {
      setZoneId(initialZoneId);
    }
  }, [initialZoneId]);

  const navigate = (next: DomainCenterSectionId, nextZoneId?: string) => {
    setSection(next);
    if (nextZoneId !== undefined) {
      setZoneId(nextZoneId);
    }
    onSectionChange?.(next, nextZoneId);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col" data-admin-domain-center>
      <div className="min-h-0 flex-1">
        {section === 'overview' ? <DomainOverviewPage onNavigate={navigate} /> : null}
        {section === 'zones' ? <DomainZonesPage initialZoneId={zoneId} onNavigate={navigate} /> : null}
        {section === 'hostnames' ? (
          <DomainHostnamesPage key={`hostnames:${zoneId}`} initialZoneId={zoneId} onNavigate={navigate} />
        ) : null}
        {section === 'dns' ? (
          <DomainDnsRecordsPage key={`dns:${zoneId}`} initialZoneId={zoneId} onNavigate={navigate} />
        ) : null}
        {section === 'certificates' ? <DomainCertificatesPage onNavigate={navigate} /> : null}
        {section === 'accounts' ? <DomainAccountsPage /> : null}
      </div>
    </div>
  );
}

export { domainCenterService } from './domainService';
export {
  DOMAIN_CENTER_SECTIONS,
  domainCenterSectionPath,
  normalizeDomainCenterSection,
} from './domainSections';
export type {
  DomainAttentionItem,
  DomainAttentionKind,
  DomainCenterSectionId,
  DomainCertificate,
  DomainCertificateRenewal,
  DomainCloudAccount,
  DomainDnsRecord,
  DomainHostname,
  DomainOverviewSummary,
  DomainVerificationFile,
  DomainVerifyResult,
  DomainZone,
} from './domainTypes';
