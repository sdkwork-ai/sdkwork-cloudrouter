import { useTranslation } from 'react-i18next';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { formatMarketingInteger, MarketingService, type ReferralStat } from '../marketingService';

export function ReferralsPage() {
  const { t } = useTranslation();

  const columns: MarketingColumn<ReferralStat>[] = [
    { key: 'inviter', label: t('admin.commerce.marketing.referralStats.col.inviter', 'Inviter') },
    { key: 'link', label: t('admin.commerce.marketing.referralStats.col.link', 'Referral Link') },
    {
      key: 'totalInvited',
      label: t('admin.commerce.marketing.referralStats.col.invited', 'Invited'),
      numeric: true,
      render: (value) => formatMarketingInteger(
        typeof value === 'string' || typeof value === 'number' ? value : null,
      ),
    },
    { key: 'totalRevenue', label: t('admin.commerce.marketing.referralStats.col.revenue', 'Revenue'), numeric: true },
    { key: 'bonusAwarded', label: t('admin.commerce.marketing.referralStats.col.bonus', 'Bonus'), numeric: true },
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
      // `billing.referralStats.list` 生成 SDK 只接受 page/pageSize；没有 q 参数，
      // 因此这里不渲染搜索框（传 q 也不会被发送），避免留下失效控件。
      searchable={false}
    />
  );
}
