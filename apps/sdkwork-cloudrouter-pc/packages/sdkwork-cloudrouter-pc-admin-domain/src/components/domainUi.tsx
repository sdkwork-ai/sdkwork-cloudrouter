/**
 * Small, dependency-light primitives shared by every Domain Center page.
 *
 * The module deliberately composes the admin shell's existing chrome
 * (`AdminTableShell`, `BusinessStateTableRow`, `ConfirmDialog`) and only adds
 * the controls this surface needs. Keeping them local means the Domain Center
 * can grow without forking the shared component library.
 */

import type { ReactNode } from 'react';

import { BusinessStateTableRow } from '@sdkwork/cloudroutes-pc-commons';

export type DomainTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

const TONE_CLASS: Record<DomainTone, string> = {
  neutral:
    'border-slate-200 bg-slate-50 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
  warning:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
  danger:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
  info: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300',
};

export function DomainStatusPill({
  label,
  tone = 'neutral',
  title,
}: {
  label: string;
  tone?: DomainTone;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TONE_CLASS[tone]}`}
    >
      {label}
    </span>
  );
}

export function DomainMetricCard({
  label,
  value,
  hint,
  tone = 'text-slate-800 dark:text-slate-100',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
      {hint ? <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</div> : null}
    </div>
  );
}

export function DomainSectionIntro({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function DomainIconButton({
  label,
  onClick,
  children,
  disabled = false,
  tone = 'default',
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  tone?: 'default' | 'danger';
}) {
  const toneClass =
    tone === 'danger'
      ? 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-500/10'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white';
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${toneClass}`}
    >
      {children}
    </button>
  );
}

export function DomainPrimaryButton({
  children,
  onClick,
  disabled = false,
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-lobster-500 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {children}
    </button>
  );
}

export function DomainSecondaryButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}

export function DomainField({
  label,
  hint,
  error,
  required = false,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
      <span>
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </span>
      {children}
      {error ? (
        <span role="alert" className="text-[11px] font-normal text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">{hint}</span>
      ) : null}
    </label>
  );
}

const INPUT_CLASS =
  'h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#121212] dark:text-white';

export function DomainTextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  disabled = false,
  mono = false,
  autoFocus = false,
  inputMode,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'password';
  disabled?: boolean;
  mono?: boolean;
  autoFocus?: boolean;
  inputMode?: 'text' | 'numeric' | 'decimal';
}) {
  return (
    <input
      type={type}
      value={value}
      disabled={disabled}
      autoFocus={autoFocus}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`${INPUT_CLASS} ${mono ? 'font-mono' : ''}`.trim()}
    />
  );
}

export function DomainSelect<T extends string>({
  value,
  onChange,
  options,
  disabled = false,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as T)}
      className={INPUT_CLASS}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function DomainTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled = false,
  mono = true,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  mono?: boolean;
}) {
  return (
    <textarea
      value={value}
      rows={rows}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#121212] dark:text-white ${
        mono ? 'font-mono' : ''
      }`.trim()}
    />
  );
}

export function DomainCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-lobster-500 focus:ring-lobster-500"
      />
      <span className="leading-5">{label}</span>
    </label>
  );
}

export function DomainFormDialog({
  title,
  description,
  children,
  footer,
  busy = false,
  onClose,
  wide = false,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  busy?: boolean;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (!busy && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="domain-form-dialog-title"
        aria-describedby="domain-form-dialog-description"
        className={`flex max-h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a] ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        <div className="shrink-0 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <h2 id="domain-form-dialog-title" className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <p id="domain-form-dialog-description" className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-5 py-4">
          <div className="flex flex-col gap-4">{children}</div>
        </div>
        <div className="flex shrink-0 justify-end gap-3 border-t border-slate-200 px-5 py-3 dark:border-white/10">
          {footer}
        </div>
      </div>
    </div>
  );
}

export function DomainInlineNotice({
  tone = 'info',
  title,
  description,
}: {
  tone?: DomainTone;
  title: string;
  description?: string;
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`rounded-lg border px-3 py-2 text-xs ${TONE_CLASS[tone]}`}
    >
      <div className="font-semibold">{title}</div>
      {description ? <div className="mt-0.5 break-all font-normal">{description}</div> : null}
    </div>
  );
}

/** One table row covering loading, error, and empty states with a retry action. */
export function DomainStateRows({
  colSpan,
  kind,
  title,
  description,
  onRetry,
  retryLabel,
  action,
}: {
  colSpan: number;
  kind: 'loading' | 'error' | 'empty';
  title: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <BusinessStateTableRow
      colSpan={colSpan}
      kind={kind}
      title={title}
      {...(description ? { description } : {})}
      {...(onRetry ? { onRetry } : {})}
      {...(retryLabel ? { retryLabel } : {})}
      {...(action ? { action } : {})}
    />
  );
}

export function DomainTableHead({ columns }: { columns: readonly string[] }) {
  return (
    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
      <tr>
        {columns.map((column) => (
          <th key={column} scope="col" className="px-4 py-3 text-left font-medium">
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}
