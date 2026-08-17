import { AdminTableShell } from '@sdkwork/cloudroutes-pc-commons';
import { useTranslation } from 'react-i18next';
import type { FormEvent, ReactNode } from 'react';
import { Search, X } from 'lucide-react';

export const inputClass = 'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white';
export const selectClass = inputClass;
/** Toolbar filter selects must not use `w-full` or they stretch across the row. */
export const toolbarSelectClass =
  'h-9 w-auto shrink-0 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white';
export const secondaryButtonClass = 'inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10';
export const primaryButtonClass = 'inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-lobster-600 px-3 text-sm font-semibold text-white transition hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-50';
export const dangerButtonClass = 'inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10';

export function Field({
  label,
  hint,
  children,
  className = '',
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
      {hint ? <span className="text-xs text-slate-400 dark:text-slate-500">{hint}</span> : null}
    </label>
  );
}

export function SearchBox({
  value,
  onChange,
  onSubmit,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const clearable = value.trim() !== '';
  return (
    <form
      className={`relative w-56 shrink-0 ${className}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value.trim());
      }}
    >
      <input
        className={`${inputClass} pr-20`}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
      {clearable ? (
        <button
          type="button"
          className="absolute right-11 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
          onClick={() => {
            onChange('');
            onSubmit('');
          }}
          title={t('common.actions.clear', 'Clear')}
          aria-label={t('common.actions.clear', 'Clear')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <button
        type="submit"
        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md bg-lobster-600 text-white transition hover:bg-lobster-700"
        title={t('common.actions.search')}
        aria-label={t('common.actions.search')}
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

export function AdminListToolbar({
  filters,
  actions,
}: {
  filters: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-3 overflow-x-auto px-5 py-3"
      data-admin-pricing-toolbar
    >
      <div className="flex flex-nowrap items-center gap-2">{filters}</div>
      {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** Table region that fills remaining viewport height; body scrolls inside AdminTableShell. */
export function AdminTableArea({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 pb-4">
      <AdminTableShell
        className="min-h-0 flex-1 shadow-none"
        footer={
          footer ? (
            <div className="border-t border-slate-200 px-3 py-2 dark:border-white/10">{footer}</div>
          ) : undefined
        }
      >
        {children}
      </AdminTableShell>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const active = status === 'active';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        active
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
      }`}
    >
      {t(active ? 'admin.pricing.common.status.active' : 'admin.pricing.common.status.inactive')}
    </span>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
      {message}
    </div>
  );
}

export function TableState({ loading, empty, colSpan }: { loading: boolean; empty: string; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
        {loading ? 'Loading…' : empty}
      </td>
    </tr>
  );
}

export function AdminPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col" data-admin-pricing>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function Modal({
  title,
  description,
  busy,
  submitLabel,
  children,
  onSubmit,
  onClose,
}: {
  title: string;
  description?: string;
  busy: boolean;
  submitLabel: string;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-xl rounded-xl bg-white shadow-xl dark:bg-slate-900 dark:ring-1 dark:ring-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
            onClick={onClose}
            aria-label={t('admin.pricing.common.aria.close', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="max-h-[60vh] overflow-y-auto px-5 py-4">{children}</div>
          <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-white/10">
            <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>
              {t('admin.pricing.common.form.cancel')}
            </button>
            <button type="submit" className={primaryButtonClass} disabled={busy}>
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function SidePanel({
  title,
  description,
  children,
  footer,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer: ReactNode;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30" onClick={onClose}>
      <div
        className="flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <button
            type="button"
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10"
            onClick={onClose}
            aria-label={t('admin.pricing.common.aria.close', 'Close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-4 dark:border-white/10">{footer}</div>
      </div>
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function errorMessageI18n(
  error: unknown,
  fallback: string,
  _t: ReturnType<typeof useTranslation>['t'],
): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}
