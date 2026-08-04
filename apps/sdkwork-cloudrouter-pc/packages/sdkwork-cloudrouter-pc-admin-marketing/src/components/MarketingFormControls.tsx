import type { ReactNode } from 'react';

export function MarketingField({
  label,
  required = false,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-slate-400 dark:text-slate-500">{hint}</span> : null}
    </label>
  );
}

export const marketingInputClassName = 'h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-lobster-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200';

export const marketingSelectClassName = 'h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-700 focus:border-lobster-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-slate-200';

export function MarketingFormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <h4 className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-900 dark:border-white/5 dark:text-white">
        {title}
      </h4>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export function MarketingFormActions({
  isSaving,
  submitLabel,
  onCancel,
}: {
  isSaving: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-white/5">
      <button
        type="button"
        onClick={onCancel}
        disabled={isSaving}
        className="inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={isSaving}
        className="inline-flex items-center rounded-md bg-lobster-600 px-4 py-2 text-sm font-medium text-white hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSaving ? 'Saving...' : submitLabel}
      </button>
    </div>
  );
}
