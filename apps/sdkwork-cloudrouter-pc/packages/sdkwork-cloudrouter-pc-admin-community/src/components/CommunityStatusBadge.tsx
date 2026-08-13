import { useTranslation } from 'react-i18next';

type CommunityTranslate = (key: string, fallback: string) => string;

/** Status label helper shared by member / tier / category badges. */
export function communityStatusLabel(status: string, t: CommunityTranslate): string {
  const normalized = status.trim().toLowerCase() || 'unknown';
  return t(`admin.community.status.${normalized}`, normalized);
}

export function communityRoleLabel(role: string, t: CommunityTranslate): string {
  const normalized = role.trim().toLowerCase() || 'member';
  return t(`admin.community.role.${normalized}`, normalized);
}

export function communityKindLabel(kind: string, t: CommunityTranslate): string {
  const normalized = kind.trim().toLowerCase() || 'discussion';
  return t(`admin.community.kind.${normalized}`, normalized);
}

export function communityReviewStateLabel(reviewState: string, t: CommunityTranslate): string {
  const normalized = reviewState.trim().toLowerCase() || 'draft';
  return t(`admin.community.reviewState.${normalized}`, normalized);
}

const statusClasses: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  disabled: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
  muted: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  'pending-review': 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  flagged: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  banned: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
};

interface CommunityStatusBadgeProps {
  status: string;
}

export function CommunityStatusBadge({ status }: CommunityStatusBadgeProps) {
  const { t } = useTranslation();
  const normalized = status.trim().toLowerCase() || 'unknown';
  const className = statusClasses[normalized]
    ?? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {communityStatusLabel(status, t)}
    </span>
  );
}

interface CommunityRoleBadgeProps {
  role: string;
}

const roleClasses: Record<string, string> = {
  owner: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  admin: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  member: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
};

export function CommunityRoleBadge({ role }: CommunityRoleBadgeProps) {
  const { t } = useTranslation();
  const normalized = role.trim().toLowerCase() || 'member';
  const className = roleClasses[normalized]
    ?? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {communityRoleLabel(role, t)}
    </span>
  );
}
