import { useTranslation } from 'react-i18next';
import { MarketingListView, type MarketingColumn } from '../components/MarketingListView';
import {
  MarketingValueBadge,
  type MarketingBadgeTone,
} from '../components/MarketingValueBadge';
import { MARKETING_EMPTY_VALUE, MarketingService, type ReferralRelation } from '../marketingService';

/**
 * 邀请奖励状态（域：referral reward）→ 色调。
 *
 * 设计规范 §2.6 要求按「域 + 值」决定颜色：granted 成功、pending 待处理、
 * rejected/failed/cancelled 失败族、expired 失效族；未列出的值不得被猜成
 * Pending，必须回退 slate 并原样展示原始值。
 */
const REFERRAL_REWARD_TONES: Record<string, MarketingBadgeTone> = {
  granted: 'success',
  pending: 'info',
  rejected: 'danger',
  failed: 'danger',
  cancelled: 'danger',
  expired: 'default',
};

const REFERRAL_REWARD_FALLBACKS: Record<string, string> = {
  granted: 'Granted',
  pending: 'Pending',
  rejected: 'Rejected',
  failed: 'Failed',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export function referralRewardTone(value: unknown): MarketingBadgeTone {
  const normalized = String(value ?? '').trim().toLowerCase();
  return REFERRAL_REWARD_TONES[normalized] ?? 'default';
}

function ReferralRewardBadge({ value }: { value: unknown }) {
  const { t } = useTranslation();
  const raw = String(value ?? '').trim();
  if (!raw) {
    return <MarketingValueBadge label={MARKETING_EMPTY_VALUE} />;
  }
  const normalized = raw.toLowerCase();
  const fallback = REFERRAL_REWARD_FALLBACKS[normalized];
  const label = fallback
    ? t(`admin.marketing.referralRelations.reward.${normalized}`, fallback)
    : raw;
  return <MarketingValueBadge label={label} tone={referralRewardTone(normalized)} title={raw} />;
}

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
      render: (value) => <ReferralRewardBadge value={value} />,
    },
    { key: 'claimedAt', label: t('admin.marketing.referralRelations.col.claimedAt', 'Claimed At') },
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
