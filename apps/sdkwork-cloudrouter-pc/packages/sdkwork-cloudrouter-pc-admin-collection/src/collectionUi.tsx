import { useId, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  COLLECTION_CAPABILITY_TYPES,
  COLLECTION_KINDS,
  COLLECTION_PUBLISH_STATUSES,
  COLLECTION_RECORD_STATUSES,
  COLLECTION_VISIBILITIES,
  type CollectionCapabilityType,
  type CollectionKind,
  type CollectionPublishStatus,
  type CollectionRecordStatus,
  type CollectionReleaseStatus,
  type CollectionVisibility,
} from './collectionService';

/**
 * Shared presentational pieces for the collection admin surfaces.
 *
 * Everything here is copy-driven through `useTranslation()`: pages pass a
 * narrow `t(key, fallback)` translator into the small helpers so an untranslated
 * string can never leak into the admin console.
 */

export type Translate = (key: string, fallback: string) => string;

export const KIND_BADGE_STYLES: Record<CollectionKind, string> = {
  mixed: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300',
  skill: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  mcp: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  agent: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  plugin: 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300',
};

export function collectionKindLabel(t: Translate, kind: CollectionKind): string {
  return t(`admin.collections.kind.${kind}`, kind);
}

/**
 * Display name of one category.
 *
 * The built-in category rows are created with stable English names; the admin
 * console localizes them by code so a Chinese operator does not see "General"
 * next to Chinese custom categories. Custom categories keep their stored name.
 */
export function collectionCategoryLabel(
  t: Translate,
  category: { categoryCode: string; name: string; isSystem: boolean },
): string {
  return category.isSystem
    ? t(`admin.collections.systemCategory.${category.categoryCode}`, category.name)
    : category.name;
}

export function capabilityTypeLabel(t: Translate, type: CollectionCapabilityType): string {
  return t(`admin.collections.capability.${type}`, type);
}

export function publishStatusLabel(t: Translate, status: CollectionPublishStatus): string {
  return t(`admin.collections.publishStatus.${status}`, status);
}

export function recordStatusLabel(t: Translate, status: CollectionRecordStatus): string {
  return t(`admin.collections.status.${status}`, status);
}

export function visibilityLabel(t: Translate, visibility: CollectionVisibility): string {
  return t(`admin.collections.visibility.${visibility}`, visibility);
}

export function releaseStatusLabel(t: Translate, status: CollectionReleaseStatus): string {
  return t(`admin.collections.releaseStatus.${status}`, status);
}

export function CollectionKindBadge({ kind }: { kind: CollectionKind }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${KIND_BADGE_STYLES[kind]}`}>
      {collectionKindLabel(t, kind)}
    </span>
  );
}

export function PublishStatusBadge({ status }: { status: CollectionPublishStatus }) {
  const { t } = useTranslation();
  const styles: Record<CollectionPublishStatus, string> = {
    draft: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
    published: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
    archived: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${styles[status]}`}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${status === 'published' ? 'bg-emerald-500' : status === 'archived' ? 'bg-amber-500' : 'bg-slate-400'}`}
      />
      {publishStatusLabel(t, status)}
    </span>
  );
}

export function RecordStatusBadge({ status }: { status: CollectionRecordStatus }) {
  const { t } = useTranslation();
  const enabled = status === 'enabled';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
      enabled
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
    }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
      {recordStatusLabel(t, status)}
    </span>
  );
}

export function MetricCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: ReactNode;
  tone: string;
  hint?: string;
}) {
  return (
    <div
      title={hint}
      className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-white/10 dark:bg-[#171717]"
    >
      <div className="text-xs font-medium uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export function IconButton({
  children,
  disabled = false,
  label,
  onClick,
  tone = 'default',
  dataAttribute,
}: {
  children: ReactNode;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  tone?: 'default' | 'danger';
  dataAttribute?: Record<`data-${string}`, string | boolean>;
}) {
  const toneClass = tone === 'danger'
    ? 'text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:border-red-500/30 dark:hover:bg-red-500/10'
    : 'text-slate-600 hover:border-lobster-200 hover:bg-lobster-50 hover:text-lobster-700 dark:text-slate-300 dark:hover:border-lobster-500/30 dark:hover:bg-lobster-500/10 dark:hover:text-lobster-200';
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white transition disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 ${toneClass}`}
      {...dataAttribute}
    >
      {children}
    </button>
  );
}

export function TextField({
  autoFocus = false,
  label,
  onChange,
  value,
  placeholder,
  disabled = false,
  hint,
  required = false,
  maxLength,
  monospace = false,
  error,
  dataAttribute,
}: {
  autoFocus?: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
  required?: boolean;
  maxLength?: number;
  monospace?: boolean;
  error?: string | null;
  dataAttribute?: Record<`data-${string}`, string | boolean>;
}) {
  const fieldId = useId();
  const describedBy = hint || error ? `${fieldId}-description` : undefined;
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-baseline gap-1 font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required ? <span className="text-red-500" aria-hidden="true">*</span> : null}
      </span>
      <input
        autoFocus={autoFocus}
        type="text"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#121212] dark:text-white ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500/40'
            : 'border-slate-200 focus:border-lobster-500 focus:ring-lobster-500/15 dark:border-white/10'
        } ${monospace ? 'font-mono text-xs' : ''}`}
        {...dataAttribute}
      />
      {error ? (
        <span id={describedBy} className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span>
      ) : hint ? (
        <span id={describedBy} className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span>
      ) : null}
    </label>
  );
}

export function TextAreaField({
  label,
  onChange,
  value,
  rows = 3,
  placeholder,
  hint,
  disabled = false,
  maxLength,
  monospace = false,
  error,
  dataAttribute,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
  rows?: number;
  placeholder?: string;
  hint?: string;
  disabled?: boolean;
  maxLength?: number;
  monospace?: boolean;
  error?: string | null;
  dataAttribute?: Record<`data-${string}`, string | boolean>;
}) {
  const fieldId = useId();
  const describedBy = hint || error ? `${fieldId}-description` : undefined;
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700 dark:text-slate-200">{label}</span>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full resize-y rounded-lg border bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#121212] dark:text-white ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500/40'
            : 'border-slate-200 focus:border-lobster-500 focus:ring-lobster-500/15 dark:border-white/10'
        } ${monospace ? 'font-mono text-xs leading-5' : ''}`}
        {...dataAttribute}
      />
      {error ? (
        <span id={describedBy} className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span>
      ) : hint ? <span id={describedBy} className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function SelectField<T extends string>({
  label,
  onChange,
  options,
  value,
  disabled = false,
  hint,
  required = false,
  error,
  dataAttribute,
}: {
  label: string;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  disabled?: boolean;
  hint?: string;
  required?: boolean;
  error?: string | null;
  dataAttribute?: Record<`data-${string}`, string | boolean>;
}) {
  const fieldId = useId();
  const describedBy = hint || error ? `${fieldId}-description` : undefined;
  return (
    <label className="block text-sm">
      <span className="mb-1 flex items-baseline gap-1 font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required ? <span className="text-red-500" aria-hidden="true">*</span> : null}
      </span>
      <select
        value={value}
        disabled={disabled}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value as T)}
        className={`h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-800 outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#121212] dark:text-white ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/15 dark:border-red-500/40'
            : 'border-slate-200 focus:border-lobster-500 focus:ring-lobster-500/15 dark:border-white/10'
        }`}
        {...dataAttribute}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {error ? (
        <span id={describedBy} className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span>
      ) : hint ? <span id={describedBy} className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function CheckboxField({
  checked,
  label,
  onChange,
  hint,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-lobster-600 focus:ring-lobster-500 dark:border-white/20 dark:bg-[#121212]"
      />
      <span>
        <span className="block font-medium text-slate-700 dark:text-slate-200">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{hint}</span> : null}
      </span>
    </label>
  );
}

export function kindOptions(t: Translate): Array<{ value: CollectionKind; label: string }> {
  return COLLECTION_KINDS.map((kind) => ({ value: kind, label: collectionKindLabel(t, kind) }));
}

export function capabilityTypeOptions(t: Translate): Array<{ value: CollectionCapabilityType; label: string }> {
  return COLLECTION_CAPABILITY_TYPES.map((type) => ({ value: type, label: capabilityTypeLabel(t, type) }));
}

export function visibilityOptions(t: Translate): Array<{ value: CollectionVisibility; label: string }> {
  return COLLECTION_VISIBILITIES.map((visibility) => ({ value: visibility, label: visibilityLabel(t, visibility) }));
}

export function publishStatusOptions(t: Translate): Array<{ value: CollectionPublishStatus; label: string }> {
  return COLLECTION_PUBLISH_STATUSES.map((status) => ({ value: status, label: publishStatusLabel(t, status) }));
}

export function recordStatusOptions(t: Translate): Array<{ value: CollectionRecordStatus; label: string }> {
  return COLLECTION_RECORD_STATUSES.map((status) => ({ value: status, label: recordStatusLabel(t, status) }));
}

export function formatDateTime(value: string, locale?: string): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  if (!Number.isFinite(date.getTime())) {
    return value;
  }
  try {
    return new Intl.DateTimeFormat(locale || undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function parseTagText(value: string): string[] {
  const tags: string[] = [];
  for (const candidate of value.split(/[,，\n]/u)) {
    const tag = candidate.trim();
    if (tag && !tags.includes(tag)) {
      tags.push(tag);
    }
  }
  return tags;
}

export function formatTagText(tags: readonly string[]): string {
  return tags.join(', ');
}

