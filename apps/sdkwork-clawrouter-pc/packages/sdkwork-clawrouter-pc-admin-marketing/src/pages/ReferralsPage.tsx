import { useTranslation } from 'react-i18next';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { MarketingService, type ReferralStat } from '../marketingService';

export function ReferralsPage() {
  const { t } = useTranslation();

  const columns: MarketingColumn<ReferralStat>[] = [
    { key: 'inviter', label: t('admin.commerce.marketing.referralStats.col.inviter', 'Inviter') },
    { key: 'link', label: t('admin.commerce.marketing.referralStats.col.link', 'Referral Link') },
    { key: 'totalInvited', label: t('admin.commerce.marketing.referralStats.col.invited', 'Invited'), align: 'right' },
    { key: 'totalRevenue', label: t('admin.commerce.marketing.referralStats.col.revenue', 'Revenue'), align: 'right' },
    { key: 'bonusAwarded', label: t('admin.commerce.marketing.referralStats.col.bonus', 'Bonus'), align: 'right' },
  ];

  return (
    <MarketingListView
      title={t('admin.commerce.marketing.referralStats.title', 'Referral Stats')}
      description={t('admin.commerce.marketing.referralStats.desc', 'Invite links, successful invitations, revenue contribution, and awarded bonuses.')}
      load={(params) => MarketingService.fetchReferralStats({
        page: params.page,
        pageSize: params.pageSize,
      })}
      columns={columns}
      searchPlaceholder={t('admin.commerce.marketing.referralStats.search', 'Search by inviter')}
    />
  );
}
