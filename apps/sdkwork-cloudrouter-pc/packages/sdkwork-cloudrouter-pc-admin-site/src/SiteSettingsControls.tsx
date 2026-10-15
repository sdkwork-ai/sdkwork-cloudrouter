import React, { useId } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * The form controls shared by every `/admin/site` tab body.
 *
 * Extracted from the page module so the download catalog editor can compose the same controls:
 * one look for one action means a switch or a text box cannot drift into two dialects across the
 * page. The controls take their labels as already-translated strings — translation stays with the
 * callers, next to the key they reference.
 */

export function TextField({ label, value, onChange, className = '', error = null, maxLength, placeholder, required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  error?: string | null;
  /**
   * The bound the *runtime* enforces, so the console cannot author a value that gets truncated
   * on render. Optional because most fields here are not rendered by a bounded reader.
   */
  maxLength?: number;
  placeholder?: string;
  required?: boolean;
}) {
  const errorId = useId();
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:ring-2 dark:bg-black/20 dark:text-white ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60'
            : 'border-slate-200 focus:border-lobster-500 focus:ring-lobster-500/20 dark:border-white/10'
        }`}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        value={value}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-400" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}

export function TextArea({ label, value, onChange, className = '', maxLength, rows = 4, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <textarea
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
        value={value}
      />
    </label>
  );
}

/**
 * The switch used by every toggleable row. Extracted so the social row, the QR slots, and the
 * footer regions cannot drift into three different-looking switches for the same action.
 */
export function ToggleSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  const labelId = useId();
  return (
    <button
      aria-checked={checked}
      aria-labelledby={labelId}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lobster-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1a1a1a] ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      data-admin-site-switch={checked ? 'on' : 'off'}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="sr-only" id={labelId}>{label}</span>
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

export function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</span>
      <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

/** The amber note a half-written entry carries. */
export function InlineWarning({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  );
}

/** A bounded single-choice field sharing the select styling the translations panel uses. */
export function SelectField({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: ReadonlyArray<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <select
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}
