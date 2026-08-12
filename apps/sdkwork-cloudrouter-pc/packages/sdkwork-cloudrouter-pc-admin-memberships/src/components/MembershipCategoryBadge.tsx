import { useTranslation } from 'react-i18next';

interface MembershipCategoryBadgeProps {
  category: string;
}

type MembershipTranslate = (key: string, fallback: string) => string;

export function membershipCategoryLabel(category: string, t: MembershipTranslate): string {
  const normalized = category.trim().toLowerCase() || 'token';
  return t(
    `admin.commerce.memberships.category.${normalized}`,
    normalized === 'community' ? 'Community' : 'Token Plan',
  );
}

const categoryClasses: Record<string, string> = {
  token: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  community: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
};

export function MembershipCategoryBadge({ category }: MembershipCategoryBadgeProps) {
  const { t } = useTranslation();
  const normalized = category.trim().toLowerCase() || 'token';
  const className = categoryClasses[normalized]
    ?? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {membershipCategoryLabel(category, t)}
    </span>
  );
}
