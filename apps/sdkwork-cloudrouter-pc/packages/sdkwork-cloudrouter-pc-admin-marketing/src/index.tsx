import { BatchCodesPage } from './pages/BatchCodesPage';
import { CodeBatchesPage } from './pages/CodeBatchesPage';
import { CodesPage } from './pages/CodesPage';
import { CouponLedgerPage } from './pages/CouponLedgerPage';
import { DistributionTasksPage } from './pages/DistributionTasksPage';
import { CouponStocksPage } from './pages/CouponStocksPage';
import { DiscountApplicationsPage } from './pages/DiscountApplicationsPage';
import { OffersPage } from './pages/OffersPage';
import { ReferralsPage } from './pages/ReferralsPage';
import { UserCouponsPage } from './pages/UserCouponsPage';

type MarketingAdminTab =
  | 'promotionOffers'
  | 'promotionCouponStocks'
  | 'codeBatches'
  | 'promotionCodes'
  | 'userCoupons'
  | 'discountApplications'
  | 'distributionTasks'
  | 'promotionCouponLedger'
  | 'referrals';

const DEFAULT_MARKETING_SECTION_ID: MarketingAdminTab = 'promotionOffers';

function resolveMarketingSectionId(sectionId: string | undefined): MarketingAdminTab {
  if (
    sectionId === 'promotionOffers'
    || sectionId === 'promotionCouponStocks'
    || sectionId === 'codeBatches'
    || sectionId === 'promotionCodes'
    || sectionId === 'userCoupons'
    || sectionId === 'discountApplications'
    || sectionId === 'distributionTasks'
    || sectionId === 'promotionCouponLedger'
    || sectionId === 'referrals'
  ) {
    return sectionId;
  }
  return DEFAULT_MARKETING_SECTION_ID;
}

type MarketingAdminProps = {
  sectionId?: string;
  batchId?: string;
};

export function MarketingAdmin({ sectionId, batchId }: MarketingAdminProps = {}) {
  // 批次券码详情页：/admin/marketing/codeBatches/:batchId
  if (sectionId === 'codeBatches' && batchId) {
    return <BatchCodesPage batchId={batchId} />;
  }

  switch (resolveMarketingSectionId(sectionId)) {
    case 'promotionCouponStocks':
      return <CouponStocksPage />;
    case 'codeBatches':
      return <CodeBatchesPage />;
    case 'promotionCodes':
      return <CodesPage />;
    case 'userCoupons':
      return <UserCouponsPage />;
    case 'discountApplications':
      return <DiscountApplicationsPage />;
    case 'distributionTasks':
      return <DistributionTasksPage />;
    case 'promotionCouponLedger':
      return <CouponLedgerPage />;
    case 'referrals':
      return <ReferralsPage />;
    case 'promotionOffers':
    default:
      return <OffersPage />;
  }
}
