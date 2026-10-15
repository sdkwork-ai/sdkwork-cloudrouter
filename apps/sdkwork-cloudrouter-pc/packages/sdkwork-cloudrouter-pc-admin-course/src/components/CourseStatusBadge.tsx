import { useTranslation } from 'react-i18next';

type CourseTranslate = (key: string, fallback: string) => string;

export function courseStatusLabel(status: string, t: CourseTranslate): string {
  const normalized = status.trim().toLowerCase() || 'unknown';
  return t(`admin.course.status.${normalized}`, normalized);
}

export function courseKindLabel(kind: string, t: CourseTranslate): string {
  const normalized = kind.trim().toLowerCase() || 'vod_video';
  return t(`admin.course.kind.${normalized}`, normalized);
}

export function courseModerationLabel(state: string, t: CourseTranslate): string {
  const normalized = state.trim().toLowerCase() || 'visible';
  return t(`admin.course.moderation.${normalized}`, normalized);
}

const statusClasses: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  approved: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  visible: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  completed: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  succeeded: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  scheduled: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  in_progress: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  live: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  pending: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  paused: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  hidden: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  draft: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
  closed: 'bg-zinc-100 text-zinc-600 dark:bg-white/10 dark:text-zinc-300',
  revoked: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  rejected: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  failed: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
};

interface CourseStatusBadgeProps {
  /** Raw backend status value; drives both the colour token and the default label. */
  status: string;
  /** Optional already-localized label when the status vocabulary is domain-specific. */
  label?: string;
}

export function CourseStatusBadge({ status, label }: CourseStatusBadgeProps) {
  const { t } = useTranslation();
  const normalized = status.trim().toLowerCase() || 'unknown';
  const className = statusClasses[normalized]
    ?? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label ?? courseStatusLabel(status, t)}
    </span>
  );
}
