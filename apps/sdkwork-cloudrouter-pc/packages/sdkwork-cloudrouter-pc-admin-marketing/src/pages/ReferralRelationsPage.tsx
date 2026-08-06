import { useTranslation } from 'react-i18next';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import { MarketingStatusBadge } from '../components/MarketingDrawer';
import { MarketingService, type ReferralRelation } from '../marketingService';

export function ReferralRelationsPage() {
  const { t } = useTranslation();

  const columns: MarketingColumn<ReferralRelation>[] = [
    { key: 'inviter', label: t('admin.marketing.referralRelations.col.inviter', 'Inviter') },
    { key: 'invitee', label: t('admin.marketing.referralRelations.col.invitee', 'Invitee') },
    { key: 'inviteCode', label: t('admin.marketing.referralRelations.col.inviteCode', 'Invite Code') },
    { key: 'source', label: t('admin.marketing.referralRelations.col.source', 'Source') },
    {
      key: 'rewardStatus',
      label: t('admin.marketing.referralRelations.col.rewardStatus', 'Reward Status'),
      render: (value) => (
        <MarketingStatusBadge
          status={value === 'granted' ? 'active' : 'disabled'}
          activeLabel={t('admin.marketing.referralRelations.reward.granted', 'Granted')}
          inactiveLabel={t('admin.marketing.referralRelations.reward.pending', 'Pending')}
        />
      ),
    },
    { key: 'claimedAt', label: t('admin.marketing.referralRelations.col.claimedAt', 'Bound At'), align: 'right' },
  ];

  return (
    <MarketingListView
      title={t('admin.marketing.referralRelations.title', 'Invitation Relations')}
      description={t('admin.marketing.referralRelations.desc', 'Invitees bound to their inviter after registering with an invite code.')}
      load={(params) => MarketingService.fetchReferralRelations({
        page: params.page,
        pageSize: params.pageSize,
        q: params.q,
      })}
      columns={columns}
      searchPlaceholder={t('admin.marketing.referralRelations.search', 'Search by invite code or user ID')}
    />
  );
}
