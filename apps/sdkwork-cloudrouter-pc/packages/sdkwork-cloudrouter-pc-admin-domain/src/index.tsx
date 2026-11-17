import { useEffect, useState } from 'react';
import {
  Globe2,
  KeyRound,
  LayoutDashboard,
  ShieldCheck,
  Waypoints,
  Server,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

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

export function DomainCenterAdmin({ sectionId, initialZoneId, onSectionChange }: DomainCenterAdminProps) {
  const { t } = useTranslation();
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

  const tabs: readonly { id: DomainCenterSectionId; label: string; icon: LucideIcon }[] = [
    { id: 'overview', label: t('admin.domainCenter.tabs.overview', 'Overview'), icon: LayoutDashboard },
    { id: 'zones', label: t('admin.domainCenter.tabs.zones', 'Root domains'), icon: Globe2 },
    { id: 'hostnames', label: t('admin.domainCenter.tabs.hostnames', 'Hostnames'), icon: Server },
    { id: 'dns', label: t('admin.domainCenter.tabs.dns', 'DNS resolution'), icon: Waypoints },
    { id: 'certificates', label: t('admin.domainCenter.tabs.certificates', 'Certificates'), icon: ShieldCheck },
    { id: 'accounts', label: t('admin.domainCenter.tabs.accounts', 'DNS accounts'), icon: KeyRound },
  ];

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-3" data-admin-domain-center>
      <nav
        aria-label={t('admin.domainCenter.tabs.label', 'Domain Center sections')}
        className="flex shrink-0 flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-[#1a1a1a]"
      >
        {tabs.map((tab) => {
          const active = tab.id === section;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              onClick={() => {
                if (active) {
                  return;
                }
                navigate(
                  tab.id,
                  tab.id === 'hostnames' || tab.id === 'dns' ? zoneId || undefined : undefined,
                );
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'bg-lobster-500 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </nav>

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
