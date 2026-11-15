import type { TFunction } from 'i18next';
import { HardDrive, ShieldCheck, ShieldQuestion } from 'lucide-react';
import type { AdminResourceColumn, AdminResourceRecord } from '@sdkwork/cloudroutes-pc-commons';
import { StorageProviderBrandTile } from './StorageProviderBrandTile';

/**
 * Cells for the storage provider inventory.
 *
 * Mirrors the payment console's provider list on purpose: the vendor is shown as
 * a brand tile plus its name and kind, every status is a toned pill instead of
 * loose text, and the credential column states the one thing an operator is
 * scanning for — whether this configuration can actually connect.
 */

const STATUS_TONES: Readonly<Record<string, string>> = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/25',
  disabled: 'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-500/25',
  archived: 'bg-slate-100 text-slate-600 ring-slate-500/20 dark:bg-white/[0.06] dark:text-slate-300 dark:ring-white/10',
};

const STATUS_DOTS: Readonly<Record<string, string>> = {
  active: 'bg-emerald-500 dark:bg-emerald-400',
  disabled: 'bg-rose-500 dark:bg-rose-400',
  archived: 'bg-slate-400 dark:bg-slate-500',
};

function readText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function translateValue(t: TFunction, group: string, value: unknown): string {
  const raw = readText(value);
  return raw ? t(`admin.storage.value.${group}.${raw}`, raw) : '-';
}

/** Vendor identity: brand tile, name, and the wire kind as a monospace sub-line. */
function StorageProviderIdentityCell({ record }: { record: AdminResourceRecord }) {
  const providerKind = readText(record.providerType ?? record.providerKind);
  const name = readText(record.name ?? record.displayName);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <StorageProviderBrandTile providerKind={providerKind} />
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{name || '-'}</div>
        <div className="mt-0.5 truncate font-mono text-[11px] leading-4 text-slate-500 dark:text-slate-400">
          {providerKind || '-'}
        </div>
      </div>
    </div>
  );
}

/** Kind badge: the localized vendor kind, e.g. 阿里云 OSS. */
function StorageProviderKindBadge({ value, t }: { value: unknown; t: TFunction }) {
  const raw = readText(value).trim();
  if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
  /**
   * `custom:<slug>` is a parameterized kind in the wire enum (DDL constraint
   * `^custom:[a-z0-9_-]{2,32}$`), and i18n can only describe the `custom` tier.
   * Folding the suffix into the label keeps the column readable instead of
   * printing a bare `custom:minio` token for what is often a self-hosted MinIO
   * or private S3 endpoint.
   */
  const separator = raw.indexOf(':');
  const base = separator > 0 ? raw.slice(0, separator) : raw;
  const suffix = separator > 0 ? raw.slice(separator + 1) : '';
  const label = translateValue(t, 'providerType', base);
  // No mark inside the badge: the identity cell already shows the vendor tile,
  // and a second copy of the same logo in the same row is noise, not signal.
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200/80 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
      {suffix ? `${label} (${suffix})` : label}
    </span>
  );
}

function StorageStatusPill({ value, t }: { value: unknown; t: TFunction }) {
  const raw = readText(value);
  if (!raw) return <span className="text-slate-400 dark:text-slate-600">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STATUS_TONES[raw] ?? STATUS_TONES.archived
      }`}
    >
      <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[raw] ?? STATUS_DOTS.archived}`} />
      {translateValue(t, 'status', raw)}
    </span>
  );
}

/**
 * Credential readiness. A missing credential is the reason a provider silently
 * fails at runtime, so it reads as an actionable warning rather than the same
 * grey text as a bucket name.
 */
function StorageCredentialPill({ value, t }: { value: unknown; t: TFunction }) {
  const configured = value === true;
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
        configured
          ? STATUS_TONES.active
          : 'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/25'
      }`}
    >
      {configured ? (
        <ShieldCheck aria-hidden="true" className="h-3 w-3" />
      ) : (
        <ShieldQuestion aria-hidden="true" className="h-3 w-3" />
      )}
      {translateValue(t, 'credentialConfigured', configured)}
    </span>
  );
}

function MonoCell({ value }: { value: unknown }) {
  const text = readText(value);
  if (!text) return <span className="text-slate-400 dark:text-slate-600">—</span>;
  return (
    <span className="truncate font-mono text-[11px] font-medium tracking-wide text-slate-600 dark:text-slate-300" title={text}>
      {text}
    </span>
  );
}

function TextCell({ value }: { value: unknown }) {
  const text = readText(value);
  if (!text) return <span className="text-slate-400 dark:text-slate-600">—</span>;
  return <span className="truncate text-xs text-slate-600 dark:text-slate-300">{text}</span>;
}

/** Columns for the storage provider inventory section. */
export function createStorageProviderColumns(t: TFunction): AdminResourceColumn[] {
  return [
    {
      key: 'name',
      label: t('admin.storage.col.provider', 'Provider'),
      render: (_value, record) => <StorageProviderIdentityCell record={record} />,
    },
    {
      key: 'providerType',
      label: t('admin.storage.col.type', 'Type'),
      render: (value) => <StorageProviderKindBadge t={t} value={value} />,
    },
    {
      key: 'bucket',
      label: t('admin.storage.col.bucket', 'Bucket'),
      render: (value) => <MonoCell value={value} />,
    },
    {
      key: 'region',
      label: t('admin.storage.col.region', 'Region'),
      render: (value) => <TextCell value={value} />,
    },
    {
      key: 'credentialConfigured',
      label: t('admin.storage.col.credentialRef', 'Credential Ref'),
      render: (value) => <StorageCredentialPill t={t} value={value} />,
    },
    {
      key: 'status',
      label: t('admin.storage.col.status', 'Status'),
      render: (value) => <StorageStatusPill t={t} value={value} />,
    },
  ] satisfies AdminResourceColumn[];
}
