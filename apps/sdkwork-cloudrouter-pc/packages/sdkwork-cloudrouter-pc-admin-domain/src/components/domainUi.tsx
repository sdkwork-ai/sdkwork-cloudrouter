/**
 * Small, dependency-light primitives shared by every Domain Center page.
 *
 * The module deliberately composes the admin shell's existing chrome
 * (`AdminTableShell`, `BusinessStateTableRow`, `ConfirmDialog`) and only adds
 * the controls this surface needs. Keeping them local means the Domain Center
 * can grow without forking the shared component library.
 */

import type { ReactNode } from 'react';
import { useId } from 'react';

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
      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-lobster-500 px-3 text-sm font-semibold text-white shadow-sm transition hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-60"
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
      className="inline-flex h-9 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
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
  ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string; disabled?: boolean }[];
  disabled?: boolean;
  ariaLabel?: string;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
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
  onCloseBlocked,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  busy?: boolean;
  onClose: () => void;
  wide?: boolean;
  /** Called instead of `onClose` when `busy` blocks dismissal. */
  onCloseBlocked?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          if (busy) {
            onCloseBlocked?.();
          } else {
            onClose();
          }
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

/**
 * Two-pixel indeterminate bar shown above a table while the next server page
 * loads.
 *
 * The rows stay on screen during that request, so without this the table looks
 * frozen between two pages; the bar states "a request is in flight" without
 * pushing the table down or replacing rows the operator is still reading.
 */
export function DomainTableRefreshingBar({ label }: { label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      className="h-[2px] w-full overflow-hidden bg-slate-100 dark:bg-white/10"
    >
      <div className="h-full w-1/3 animate-pulse rounded-full bg-lobster-500" />
    </div>
  );
}

/**
 * States that a filter applied to the rows of the current page only.
 *
 * The deployments list endpoints for hostnames and certificates accept no filter
 * parameters yet, so the only honest thing a global search box can do with one
 * page of data is filter that page — but it has to say so, and offer one click to
 * undo it. Rendering the count ("3 of 20 on this page") keeps the server total in
 * the footer and the matches in the body from looking contradictory.
 */
export function DomainPageFilterNotice({
  label,
  clearLabel,
  onClear,
}: {
  /** Localized "{{matched}} of {{pageRowCount}} on this page". */
  label: string;
  clearLabel: string;
  onClear: () => void;
}) {
  return (
    <span
      aria-live="polite"
      aria-atomic="true"
      className="inline-flex items-center gap-2 text-[11px] font-medium text-amber-700 dark:text-amber-300"
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onClear}
        className="rounded underline decoration-amber-400/70 underline-offset-2 transition hover:text-amber-900 dark:hover:text-amber-200"
      >
        {clearLabel}
      </button>
    </span>
  );
}

/**
 * Moves focus to the first element a caller marked with `data-domain-field`.
 *
 * Validation lives in plain functions here, not in a form library, so "focus
 * the first invalid field on submit" has to be expressed explicitly. Marking
 * the wrappers (rather than passing refs through every primitive) keeps the
 * primitive signatures unchanged and works for composite controls such as the
 * hostname chip input or the radio group, where the focus target is not the
 * first DOM node of the block.
 *
 * `container` may be the dialog element itself; the search is scoped to it so
 * a second dialog cannot capture focus.
 */
export function focusDomainField(container: HTMLElement | null, field: string): boolean {
  if (!container) {
    return false;
  }
  const escaped = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(field)
    : field.replace(/["\\]/g, '\\$&');
  const target = container.querySelector<HTMLElement>(`[data-domain-field="${escaped}"]`);
  if (!target) {
    return false;
  }
  target.focus();
  return true;
}

export interface DomainChip {
  value: string;
  label?: string;
  invalid?: boolean;
  title?: string;
}

/**
 * Removable value chips (the certificate hostname list).
 *
 * The list is a real `list` so a screen reader announces "N items"; every chip
 * carries its own named remove button, and an invalid chip additionally carries
 * `aria-invalid` plus a visible warning glyph so the state never depends on the
 * red tint alone.
 */
export function DomainChipList({
  chips,
  onRemove,
  removeLabel,
  emptyLabel,
  disabled = false,
}: {
  chips: readonly DomainChip[];
  onRemove: (value: string) => void;
  /** Produces the accessible name of one chip's remove button. */
  removeLabel: (chip: DomainChip) => string;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  if (chips.length === 0) {
    return emptyLabel ? (
      <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500">{emptyLabel}</span>
    ) : null;
  }
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label={emptyLabel ?? undefined}>
      {chips.map((chip) => (
        <li key={chip.value}>
          <span
            title={chip.title}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] ${
              chip.invalid
                ? 'border-red-300 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300'
                : 'border-slate-200 bg-slate-50 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
            }`}
          >
            <span className="break-all">{chip.label ?? chip.value}</span>
            <button
              type="button"
              disabled={disabled}
              aria-label={removeLabel(chip)}
              title={removeLabel(chip)}
              onClick={() => onRemove(chip.value)}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10 dark:hover:text-white"
            >
              {/* Rendered as text so the primitive needs no icon dependency. */}
              <span aria-hidden="true">×</span>
            </button>
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface DomainRadioOption<T extends string> {
  value: T;
  label: string;
  /** Always rendered when present, in every state, so a disabled reason stays readable. */
  description?: string;
  disabled?: boolean;
  /** Reason rendered (and linked through `aria-describedby`) when `disabled` is set. */
  disabledReason?: string;
}

/**
 * Themed radio group.
 *
 * Composed locally like the rest of this file: a native `<input type="radio">`
 * per option inside a real `radiogroup`, with a roving tab stop so arrow keys
 * follow the ARIA radio pattern. The accent is the console's lobster red, and
 * the selected row carries a ring and a bold label as well, so selection is
 * never signalled by colour alone.
 *
 * A disabled option keeps its label visible and states its reason — a silently
 * greyed-out choice is the most common source of "why can I not pick this".
 */
export function DomainRadioGroup<T extends string>({
  name,
  legend,
  options,
  value,
  onChange,
  disabled = false,
  describedById,
  error,
  fieldName,
}: {
  name: string;
  legend: string;
  options: readonly DomainRadioOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  describedById?: string;
  error?: string;
  /** Marks the group so `focusDomainField` can land on the selected radio. */
  fieldName?: string;
}) {
  const generatedId = useId();
  const groupId = `domain-radio-${name}-${generatedId}`;
  // DOM order is the roving order: enabled options as rendered.
  const focusableValues = options.filter((option) => !option.disabled).map((option) => option.value);

  const moveSelection = (direction: 1 | -1) => {
    if (focusableValues.length === 0) {
      return;
    }
    const currentIndex = focusableValues.indexOf(value);
    const nextIndex =
      currentIndex < 0
        ? 0
        : (currentIndex + direction + focusableValues.length) % focusableValues.length;
    const next = focusableValues[nextIndex];
    if (next === undefined) {
      return;
    }
    onChange(next);
    const group = document.getElementById(`${groupId}-group`);
    const target = group?.querySelector<HTMLInputElement>(
      `input[name="${name}"][value="${next}"]`,
    );
    target?.focus();
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{legend}</span>
      <div
        id={`${groupId}-group`}
        role="radiogroup"
        aria-label={legend}
        aria-describedby={describedById}
        aria-invalid={error ? true : undefined}
        className="flex flex-col gap-1.5"
      >
        {options.map((option) => {
          const optionId = `${groupId}-${option.value}`;
          const reasonId = `${optionId}-reason`;
          const checked = option.value === value;
          const optionDisabled = disabled || option.disabled === true;
          return (
            <div
              key={option.value}
              data-domain-field={fieldName && checked ? fieldName : undefined}
              className={`rounded-lg border px-3 py-2 transition ${
                checked
                  ? 'border-lobster-500 bg-lobster-50/60 ring-1 ring-lobster-500/40 dark:border-lobster-500/60 dark:bg-lobster-500/10'
                  : 'border-slate-200 bg-white dark:border-white/10 dark:bg-[#1a1a1a]'
              } ${optionDisabled ? 'opacity-70' : ''}`}
            >
              <label
                htmlFor={optionId}
                className={`flex items-start gap-2 text-xs ${
                  optionDisabled
                    ? 'cursor-not-allowed text-slate-400 dark:text-slate-500'
                    : 'cursor-pointer text-slate-700 dark:text-slate-200'
                }`}
              >
                <input
                  id={optionId}
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={checked}
                  disabled={optionDisabled}
                  onChange={() => onChange(option.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
                      event.preventDefault();
                      moveSelection(1);
                    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
                      event.preventDefault();
                      moveSelection(-1);
                    }
                  }}
                  className="mt-0.5 h-4 w-4 shrink-0 cursor-inherit accent-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 dark:accent-red-500"
                  aria-describedby={
                    [
                      option.description ? `${optionId}-description` : undefined,
                      optionDisabled && option.disabledReason ? reasonId : undefined,
                    ]
                      .filter(Boolean)
                      .join(' ') || undefined
                  }
                />
                <span className="min-w-0">
                  <span className="block font-medium leading-5">{option.label}</span>
                  {option.description ? (
                    <span
                      id={`${optionId}-description`}
                      className="block text-[11px] font-normal leading-4 text-slate-500 dark:text-slate-400"
                    >
                      {option.description}
                    </span>
                  ) : null}
                  {optionDisabled && option.disabledReason ? (
                    <span
                      id={reasonId}
                      className="block text-[11px] font-normal leading-4 text-amber-700 dark:text-amber-300"
                    >
                      {option.disabledReason}
                    </span>
                  ) : null}
                </span>
              </label>
            </div>
          );
        })}
      </div>
      {error ? (
        <span role="alert" className="text-[11px] font-normal text-red-600 dark:text-red-400">
          {error}
        </span>
      ) : null}
    </div>
  );
}
