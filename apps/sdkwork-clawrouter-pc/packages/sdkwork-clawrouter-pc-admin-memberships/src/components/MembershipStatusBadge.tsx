interface MembershipStatusBadgeProps {
  status: string;
}

const statusClasses: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  disabled: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
  suspended: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  expired: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
  exhausted: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
};

export function MembershipStatusBadge({ status }: MembershipStatusBadgeProps) {
  const normalized = status.trim().toLowerCase() || 'unknown';
  const className = statusClasses[normalized] ?? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {normalized}
    </span>
  );
}
