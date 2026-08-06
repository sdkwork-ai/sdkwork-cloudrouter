import { PartnerAdmin } from '@sdkwork/partner-pc-admin-partner';
import { CommissionAdmin } from '@sdkwork/partner-pc-admin-commission';
import { WithdrawalAdmin } from '@sdkwork/partner-pc-admin-withdrawal';
import { StatsAdmin } from '@sdkwork/partner-pc-admin-stats';

type PartnerAdminTab =
  | 'partners'
  | 'tree'
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
  partnerId?: string;
};

export function CloudRouterPartnerAdmin({ sectionId }: PartnerAdminProps = {}) {
  switch (resolveSectionId(sectionId)) {
    case 'tree':
    case 'partners':
      return <PartnerAdmin sectionId={sectionId === 'tree' ? 'tree' : undefined} />;
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
      return <PartnerAdmin />;
  }
}
