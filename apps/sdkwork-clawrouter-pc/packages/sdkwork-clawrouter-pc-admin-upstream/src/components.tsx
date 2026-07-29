import type { FormEvent, ReactNode } from 'react';
import { AlertCircle, Loader2, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const inputClass = 'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-[#111] dark:text-white';
export const selectClass = inputClass;
export const textAreaClass = 'min-h-20 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-white/10 dark:bg-[#111] dark:text-white';
export const secondaryButtonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-[#171717] dark:text-slate-200 dark:hover:bg-white/5';
export const primaryButtonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50';
export const dangerButtonClass = 'inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10';

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
      <span>{label}{required ? <span className="ml-1 text-red-500">*</span> : null}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function SearchBox({
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="relative w-full sm:w-72"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <input
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        className={`${inputClass} pl-9`}
      />
    </form>
  );
}

export function StatusBadge({ status, healthy }: { status: number; healthy?: number }) {
  const { t } = useTranslation();
  const enabled = status === 1;
  const tone = healthy === 1
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
    : healthy !== undefined && healthy !== 0
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
      : enabled
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
  return (
    <span className={`inline-flex min-w-16 justify-center rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
      {healthy === 1 ? t('admin.upstream.common.status.healthy') : enabled ? t('common.status.active') : t('common.status.disabled')}
    </span>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">{message}</span>
    </div>
  );
}

export function TableState({ loading, empty, colSpan }: { loading: boolean; empty: string; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-48 text-center text-sm text-slate-500 dark:text-slate-400">
        {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : empty}
      </td>
    </tr>
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <form
        onSubmit={onSubmit}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171717]"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <button type="button" aria-label={t('admin.upstream.common.aria.close')} onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-white/10">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>{t('common.actions.cancel')}</button>
          <button type="submit" className={primaryButtonClass} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function SidePanel({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-[60] flex justify-end bg-slate-950/30 backdrop-blur-[1px]">
      <button type="button" aria-label={t('admin.upstream.common.aria.close')} className="min-w-0 flex-1" onClick={onClose} />
      <aside className="flex h-full w-full max-w-3xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171717]">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            {subtitle ? <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          <button type="button" aria-label={t('admin.upstream.common.aria.close')} onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
      </aside>
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 pb-6 last:border-0 last:pb-0 dark:border-white/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}
