import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import { BusinessStatePanel } from '@sdkwork/cloudroutes-pc-commons';

interface MembershipAdminPageShellProps {
  isLoading: boolean;
  error: string | null;
  onRefresh: () => void;
  children: ReactNode;
  actions?: ReactNode;
  /** Page title; renders a consistent page header above the action row. */
  title?: string;
  /** One-line explanation of what this page owns. */
  description?: string;
}

/**
 * Shared frame for every membership admin page.
 *
 * The header keeps the whole membership centre visually consistent: a title, a
 * one-line statement of what the page owns, and a right-aligned action row.
 * Pages that do not pass a title still get the action row, so refresh and the
 * primary action never move around between tabs.
 */
export function MembershipAdminPageShell({
  isLoading,
  error,
  onRefresh,
  children,
  actions,
  title,
  description,
}: MembershipAdminPageShellProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return <BusinessStatePanel kind="loading" title={t('admin.commerce.memberships.loading', 'Loading membership records...')} className="min-h-48" />;
  }

  if (error) {
    return (
      <BusinessStatePanel
        kind="error"
        title={t('admin.commerce.memberships.error', 'Membership data could not be loaded')}
        description={error}
        onRetry={onRefresh}
        className="min-h-48"
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        {title ? (
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
            {description ? (
              <p className="mt-1 max-w-3xl text-xs text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
        ) : <span aria-hidden="true" />}
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t('common.actions.reload', 'Reload')}
          </button>
          {actions}
        </div>
      </div>
      {children}
    </div>
  );
}
