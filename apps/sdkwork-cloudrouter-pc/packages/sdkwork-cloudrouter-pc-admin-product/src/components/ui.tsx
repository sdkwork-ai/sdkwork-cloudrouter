import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, RefreshCw, X } from 'lucide-react';

/**
 * Product Center UI primitives.
 *
 * The package owns its presentation so the module can be embedded in any admin
 * host: every component here renders Tailwind classes only and receives copy as
 * props (the pages translate with `react-i18next`). No component reads the
 * host's router, session, or store.
 */

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white md:text-2xl">{title}</h1>
        {description ? (
          <p className="mt-1 max-w-3xl text-sm text-slate-500 dark:text-slate-400">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export interface PanelProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, actions, children, className = '', bodyClassName = '' }: PanelProps) {
  return (
    <section
      className={`flex min-h-0 flex-col rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717] ${className}`}
    >
      {title || actions ? (
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      ) : null}
      <div className={`min-h-0 flex-1 p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

export interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  disabled?: boolean;
  title?: string;
  className?: string;
}

const BUTTON_VARIANTS: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-lobster-500 text-white hover:bg-lobster-600 disabled:bg-lobster-500/50',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10',
  ghost: 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-600/50',
};

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'secondary',
  size = 'sm',
  disabled = false,
  title,
  className = '',
}: ButtonProps) {
  const sizing = size === 'sm' ? 'h-8 px-3 text-xs' : 'h-9 px-4 text-sm';
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:cursor-not-allowed ${sizing} ${BUTTON_VARIANTS[variant]} ${className}`}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type={type}
    >
      {children}
    </button>
  );
}

export interface NoticeProps {
  tone?: 'error' | 'success' | 'info';
  children: ReactNode;
  onDismiss?: () => void;
}

export function Notice({ tone = 'info', children, onDismiss }: NoticeProps) {
  const tones: Record<NonNullable<NoticeProps['tone']>, string> = {
    error: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200',
    success:
      'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200',
    info: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200',
  };
  return (
    <div
      className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 text-sm ${tones[tone]}`}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span className="min-w-0 break-words">{children}</span>
      {onDismiss ? (
        <button
          aria-label="Dismiss"
          className="shrink-0 rounded p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
          onClick={onDismiss}
          type="button"
        >
          <X aria-hidden="true" className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}

export interface LoadingStateProps {
  label: string;
}

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500 dark:text-slate-400">
      <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export interface EmptyStateProps {
  label: string;
  hint?: string;
}

export function EmptyState({ label, hint }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-12 text-center text-sm text-slate-500 dark:text-slate-400">
      <span className="font-medium">{label}</span>
      {hint ? <span className="text-xs">{hint}</span> : null}
    </div>
  );
}

export interface ErrorStateProps {
  title: string;
  message: string;
  codeLabel: string;
  code?: number;
  traceLabel: string;
  traceId?: string;
  retryLabel: string;
  onRetry: () => void;
}

export function ErrorState({
  title,
  message,
  codeLabel,
  code,
  traceLabel,
  traceId,
  retryLabel,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center" role="alert">
      <AlertTriangle aria-hidden="true" className="h-6 w-6 text-rose-500" />
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">{title}</p>
        <p className="max-w-lg text-sm text-slate-500 dark:text-slate-400">{message}</p>
        {code !== undefined ? (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {codeLabel}: {code}
          </p>
        ) : null}
        {traceId ? (
          <p className="break-all text-xs text-slate-400 dark:text-slate-500">
            {traceLabel}: {traceId}
          </p>
        ) : null}
      </div>
      <Button onClick={onRetry} variant="secondary">
        <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
        {retryLabel}
      </Button>
    </div>
  );
}

const STATUS_TONES: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  available: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  delivered: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  reserved: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  shipped: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  confirmed: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  inactive: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  released: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  archived: 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
};

export interface StatusBadgeProps {
  value: string | undefined | null;
  label?: string;
  fallback?: string;
}

export function StatusBadge({ value, label, fallback = '—' }: StatusBadgeProps) {
  if (!value) {
    return <span className="text-slate-400 dark:text-slate-500">{fallback}</span>;
  }
  const tone = STATUS_TONES[value.toLowerCase()] ?? 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${tone}`}>
      {label ?? value}
    </span>
  );
}

export interface DataColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface SelectLikeProps {
  value: string;
  options: readonly FilterOption[];
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/**
 * Native select with a leading empty option.
 *
 * Used where a form needs "no value" as a real choice (an optional attribute,
 * an unassigned carrier) without rendering a raw enum token.
 */
export function SelectLike({ value, options, placeholder, disabled = false, onChange }: SelectLikeProps) {
  return (
    <select
      className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      value={value}
    >
      <option value="">{placeholder ?? '—'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export interface DataTableProps<T> {
  columns: readonly DataColumn<T>[];
  rows: readonly T[];
  rowKey: (row: T, index: number) => string;
  emptyLabel: string;
  emptyHint?: string;
}

export function DataTable<T>({ columns, rows, rowKey, emptyLabel, emptyHint }: DataTableProps<T>) {
  if (rows.length === 0) {
    return <EmptyState hint={emptyHint} label={emptyLabel} />;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left dark:border-white/10">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`whitespace-nowrap px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 ${column.headerClassName ?? ''}`}
                scope="col"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/70 dark:border-white/5 dark:hover:bg-white/5"
              key={rowKey(row, index)}
            >
              {columns.map((column) => (
                <td
                  className={`px-3 py-2 align-middle text-slate-700 dark:text-slate-200 ${column.className ?? ''}`}
                  key={column.key}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface PaginationProps {
  page: number;
  pageSize: number;
  itemCount: number;
  hasNextPage: boolean;
  totalItems?: number;
  disabled?: boolean;
  labels: {
    showing: string;
    page: string;
    pageSize: string;
    total: string;
    previous: string;
    next: string;
  };
  onPreviousPage: () => void;
  onNextPage: () => void;
  onPageSizeChange: (pageSize: number) => void;
}

export function Pagination({
  page,
  pageSize,
  itemCount,
  hasNextPage,
  totalItems,
  disabled = false,
  labels,
  onPreviousPage,
  onNextPage,
  onPageSizeChange,
}: PaginationProps) {
  const firstRow = itemCount === 0 ? 0 : (page - 1) * pageSize + 1;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
      <span>
        {labels.showing} {firstRow}–{firstRow + Math.max(itemCount - 1, 0)}
        {totalItems !== undefined ? ` / ${labels.total} ${totalItems}` : ''}
      </span>
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-1">
          <span>{labels.pageSize}</span>
          <select
            className="h-7 rounded border border-slate-300 bg-white px-1 text-xs text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
            disabled={disabled}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            value={pageSize}
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span>
          {labels.page} {page}
        </span>
        <button
          aria-label={labels.previous}
          className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-600 disabled:opacity-40 dark:border-white/15 dark:text-slate-300"
          disabled={disabled || page <= 1}
          onClick={onPreviousPage}
          type="button"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </button>
        <button
          aria-label={labels.next}
          className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 text-slate-600 disabled:opacity-40 dark:border-white/15 dark:text-slate-300"
          disabled={disabled || !hasNextPage}
          onClick={onNextPage}
          type="button"
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterControl {
  name: string;
  label: string;
  kind: 'text' | 'select';
  options?: readonly FilterOption[];
  placeholder?: string;
}

export interface FilterBarProps {
  filters: readonly FilterControl[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onSubmit: () => void;
  onReset: () => void;
  searchLabel: string;
  resetLabel: string;
  children?: ReactNode;
}

export function FilterBar({
  filters,
  values,
  onChange,
  onSubmit,
  onReset,
  searchLabel,
  resetLabel,
  children,
}: FilterBarProps) {
  return (
    <form
      className="flex flex-wrap items-end gap-2 border-b border-slate-200 px-3 py-2 dark:border-white/10"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      {filters.map((filter) => (
        <label className="flex min-w-40 flex-col gap-1 text-xs" key={filter.name}>
          <span className="font-medium text-slate-500 dark:text-slate-400">{filter.label}</span>
          {filter.kind === 'select' ? (
            <select
              className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
              onChange={(event) => onChange(filter.name, event.target.value)}
              value={values[filter.name] ?? ''}
            >
              {(filter.options ?? []).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 placeholder:text-slate-400 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
              onChange={(event) => onChange(filter.name, event.target.value)}
              placeholder={filter.placeholder}
              value={values[filter.name] ?? ''}
            />
          )}
        </label>
      ))}
      <div className="flex items-center gap-2">
        <Button type="submit" variant="primary">
          {searchLabel}
        </Button>
        <Button onClick={onReset} variant="ghost">
          {resetLabel}
        </Button>
      </div>
      {children ? <div className="ml-auto flex items-center gap-2">{children}</div> : null}
    </form>
  );
}

export interface DialogProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

export function Dialog({ open, title, onClose, children, footer, wide = false }: DialogProps) {
  const titleId = useId();
  useEffect(() => {
    if (!open) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16" role="presentation">
      <div
        aria-labelledby={titleId}
        aria-modal="true"
        className={`w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171717]`}
        role="dialog"
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white" id={titleId}>
            {title}
          </h2>
          <button
            aria-label="Close"
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">{children}</div>
        {footer ? (
          <footer className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3 dark:border-white/10">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );
}

export type FormValue = string | boolean;

export type FormValues = Record<string, FormValue>;

export interface FormFieldSpec {
  name: string;
  label: string;
  kind: 'text' | 'textarea' | 'number' | 'select' | 'checkbox';
  options?: readonly FilterOption[];
  required?: boolean;
  placeholder?: string;
  help?: string;
  readOnly?: boolean;
}

export interface EntityFormProps {
  fields: readonly FormFieldSpec[];
  values: FormValues;
  onChange: (name: string, value: FormValue) => void;
}

export function EntityForm({ fields, values, onChange }: EntityFormProps) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {fields.map((field) => {
        const value = values[field.name];
        const isWide = field.kind === 'textarea' || field.kind === 'checkbox';
        return (
          <label
            className={`flex flex-col gap-1 text-xs ${isWide ? 'md:col-span-2' : ''}`}
            key={field.name}
          >
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {field.label}
              {field.required ? <span className="ml-0.5 text-rose-500">*</span> : null}
            </span>
            {field.kind === 'textarea' ? (
              <textarea
                className="min-h-20 rounded border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
                onChange={(event) => onChange(field.name, event.target.value)}
                placeholder={field.placeholder}
                readOnly={field.readOnly}
                value={typeof value === 'string' ? value : ''}
              />
            ) : field.kind === 'select' ? (
              <select
                className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
                onChange={(event) => onChange(field.name, event.target.value)}
                value={typeof value === 'string' ? value : ''}
              >
                {(field.options ?? []).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : field.kind === 'checkbox' ? (
              <span className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  checked={value === true}
                  onChange={(event) => onChange(field.name, event.target.checked)}
                  type="checkbox"
                />
                {field.placeholder ?? ''}
              </span>
            ) : (
              <input
                className="h-8 rounded border border-slate-300 bg-white px-2 text-sm text-slate-700 dark:border-white/15 dark:bg-white/5 dark:text-slate-200"
                onChange={(event) => onChange(field.name, event.target.value)}
                placeholder={field.placeholder}
                readOnly={field.readOnly}
                type={field.kind === 'number' ? 'number' : 'text'}
                value={typeof value === 'string' ? value : ''}
              />
            )}
            {field.help ? <span className="text-[11px] text-slate-400 dark:text-slate-500">{field.help}</span> : null}
          </label>
        );
      })}
    </div>
  );
}

/**
 * Read-only helper: formats a minor-unit amount (`"129900"`) as a display
 * string. The backend stores prices as integer minor units; the UI must never
 * turn that into a floating-point number that could round.
 */
export function formatMinorAmount(
  minorUnits: string | null | undefined,
  currencyCode?: string | null,
  minorUnitExponent?: string | null,
): string {
  if (minorUnits === undefined || minorUnits === null || minorUnits === '') {
    return '—';
  }
  if (!/^-?\d+$/.test(minorUnits)) {
    return `${currencyCode ?? ''} ${minorUnits}`.trim();
  }
  const exponent = minorUnitExponent && /^\d+$/.test(minorUnitExponent) ? Number(minorUnitExponent) : 2;
  const negative = minorUnits.startsWith('-');
  const digits = negative ? minorUnits.slice(1) : minorUnits;
  const padded = digits.padStart(exponent + 1, '0');
  const whole = exponent === 0 ? padded : padded.slice(0, -exponent);
  const fraction = exponent === 0 ? '' : padded.slice(-exponent);
  const formatted = fraction ? `${whole}.${fraction}` : whole;
  return `${currencyCode ?? ''} ${negative ? '-' : ''}${formatted}`.trim();
}

/** Read-only helper: renders an ISO timestamp as a compact local date-time. */
export function formatTimestamp(value: string | null | undefined): string {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}
