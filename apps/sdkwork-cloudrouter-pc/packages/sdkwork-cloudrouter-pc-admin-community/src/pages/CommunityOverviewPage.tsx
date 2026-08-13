import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Compass,
  FileText,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import { CommunityAdminPageShell } from '../components/CommunityAdminPageShell';
import {
  fetchCommunityAdminCategories,
  fetchCommunityAdminModerationQueue,
  type CommunityAdminCategoryItem,
} from '../communityService';
import { formatCommunityCount } from '../communityFormat';

interface CommunityOverviewStats {
  circleCount: number;
  memberTotal: string;
  postTotal: string;
  paidCircleCount: number;
  recommendedCircleCount: number;
  pendingReviewCount: number;
}

interface OverviewCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
}

function OverviewCard({ icon, label, value }: OverviewCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs text-slate-400 dark:text-slate-500">{label}</p>
        <p className="truncate text-lg font-semibold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

export function CommunityOverviewPage() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<CommunityOverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadOverview = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const [categories, moderationQueue] = await Promise.all([
        fetchCommunityAdminCategories(),
        fetchCommunityAdminModerationQueue(),
      ]);
      if (requestId !== requestIdRef.current) {
        return;
      }
      const sumCount = (items: CommunityAdminCategoryItem[], pick: (item: CommunityAdminCategoryItem) => string): string => {
        return String(
          items.reduce((total, item) => total + Number.parseInt(pick(item) || '0', 10), 0),
        );
      };
      setStats({
        circleCount: categories.length,
        memberTotal: sumCount(categories, (item) => item.memberCount),
        postTotal: sumCount(categories, (item) => item.postCount),
        paidCircleCount: categories.filter((item) => item.isPaid).length,
        recommendedCircleCount: categories.filter((item) => item.isRecommended).length,
        pendingReviewCount: moderationQueue.length,
      });
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(
          resolveProblemMessage(
            loadError,
            t,
            t('admin.community.overview.error', 'Community overview could not be loaded'),
          ),
        );
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    void loadOverview();
    return () => {
      requestIdRef.current += 1;
    };
  }, [loadOverview]);

  return (
    <CommunityAdminPageShell
      isLoading={isLoading}
      error={error}
      onRefresh={() => void loadOverview()}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto">
        {stats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <OverviewCard
              icon={<Compass className="h-5 w-5" />}
              label={t('admin.community.overview.circles', 'Circles')}
              value={formatCommunityCount(stats.circleCount)}
            />
            <OverviewCard
              icon={<Users className="h-5 w-5" />}
              label={t('admin.community.overview.members', 'Total members')}
              value={formatCommunityCount(stats.memberTotal)}
            />
            <OverviewCard
              icon={<FileText className="h-5 w-5" />}
              label={t('admin.community.overview.posts', 'Total posts')}
              value={formatCommunityCount(stats.postTotal)}
            />
            <OverviewCard
              icon={<Wallet className="h-5 w-5" />}
              label={t('admin.community.overview.paidCircles', 'Paid circles')}
              value={formatCommunityCount(stats.paidCircleCount)}
            />
            <OverviewCard
              icon={<ShieldCheck className="h-5 w-5" />}
              label={t('admin.community.overview.pendingReview', 'Pending review')}
              value={formatCommunityCount(stats.pendingReviewCount)}
            />
            <OverviewCard
              icon={<Compass className="h-5 w-5" />}
              label={t('admin.community.overview.recommended', 'Recommended circles')}
              value={formatCommunityCount(stats.recommendedCircleCount)}
            />
          </div>
        ) : null}
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            {t('admin.community.overview.guideTitle', 'Getting started')}
          </h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-500 dark:text-slate-400">
            <li>{t('admin.community.overview.guideCircles', 'Manage circles and their operation fields under Circles.')}</li>
            <li>{t('admin.community.overview.guideModeration', 'Review pending posts in the Moderation Queue.')}</li>
            <li>{t('admin.community.overview.guideMonetize', 'Configure paid tiers under Membership Tiers to monetize your community.')}</li>
          </ul>
        </div>
      </div>
    </CommunityAdminPageShell>
  );
}
