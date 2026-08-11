import {
  configurePartnerBackendClientFactory,
  configurePartnerSearchPort,
  configurePartnerUserSearchPort,
} from '@sdkwork/partner-pc-admin-core';
import { getSdkworkPartnerBackendSdkClient } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';
import { getSdkworkAppbaseBackendSdkClient } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { PartnerAdmin } from '@sdkwork/partner-pc-admin-partner';
import { CommissionAdmin } from '@sdkwork/partner-pc-admin-commission';
import { WithdrawalAdmin } from '@sdkwork/partner-pc-admin-withdrawal';
import { StatsAdmin } from '@sdkwork/partner-pc-admin-stats';

// Bind the partner admin pages to the Cloud Router session-auth SDK client
// (token manager, base URL, locale propagation, 401 redirect handling).
// Standalone partner shells keep the built-in factory defaults.
configurePartnerBackendClientFactory(() => getSdkworkPartnerBackendSdkClient());

// Bind the IAM user directory search so the partner form offers a searchable
// user picker instead of a raw id input (same session-auth appbase client
// used by the IAM admin surfaces).
configurePartnerUserSearchPort(async (keyword) => {
  const page = await getSdkworkAppbaseBackendSdkClient().iam.users.list({
    page: 1,
    pageSize: 20,
    q: keyword,
  });
  const items = (page?.items ?? []) as Array<Record<string, unknown>>;
  return items.map((item) => ({
    id: String(item.id),
    label: [item.username, item.displayName, item.name]
      .filter((value): value is string => typeof value === 'string' && value.trim() !== '')
      .join(' · ') || String(item.id),
  }));
});

// Bind the partner directory search so customer-binding and transfer forms
// offer a searchable partner picker instead of a raw id input (same
// session-auth partner SDK client used by the partner admin surfaces).
configurePartnerSearchPort(async (keyword) => {
  const page = await getSdkworkPartnerBackendSdkClient().partners.list({
    page: 1,
    pageSize: 20,
    q: keyword,
  });
  return (page?.items ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    levelNo: item.levelNo,
  }));
});

type PartnerAdminTab =
  | 'partners'
  | 'tree'
  | 'customers'
  | 'join-fees'
  | 'audit-logs'
  | 'levels'
  | 'config'
  | 'events'
  | 'ledger'
  | 'withdrawals'
  | 'stats';

const DEFAULT_SECTION: PartnerAdminTab = 'partners';

function resolveSectionId(sectionId: string | undefined): PartnerAdminTab {
  switch (sectionId) {
    case 'tree':
    case 'customers':
    case 'join-fees':
    case 'audit-logs':
    case 'levels':
    case 'config':
    case 'events':
    case 'ledger':
    case 'withdrawals':
    case 'stats':
      return sectionId;
    default:
      return DEFAULT_SECTION;
  }
}

type PartnerAdminProps = {
  sectionId?: string;
};

export function CloudRouterPartnerAdmin({ sectionId }: PartnerAdminProps = {}) {
  switch (resolveSectionId(sectionId)) {
    case 'partners':
      return <PartnerAdmin sectionId="partners" />;
    case 'tree':
      return <PartnerAdmin sectionId="tree" />;
    case 'customers':
      return <PartnerAdmin sectionId="customers" />;
    case 'join-fees':
      return <PartnerAdmin sectionId="join-fees" />;
    case 'audit-logs':
      return <PartnerAdmin sectionId="audit-logs" />;
    case 'levels':
    case 'config':
    case 'events':
    case 'ledger':
      return <CommissionAdmin sectionId={sectionId} />;
    case 'withdrawals':
      return <WithdrawalAdmin />;
    case 'stats':
      return <StatsAdmin />;
    default:
      return <PartnerAdmin sectionId="home" />;
  }
}
