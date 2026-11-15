import {
  STORAGE_PROVIDER_BRAND_ICONS,
  type StorageProviderBrandIcon,
} from './storage-provider-brand-icons.generated';

/**
 * Brand identity for a storage provider, resolved from its wire `providerKind`.
 *
 * Three outcomes exist and must stay distinguishable:
 *
 * - `brand`    the vendor publishes a vector mark (AWS S3, Alibaba Cloud OSS,
 *              Cloudflare R2, MinIO, …); the tile draws it in the brand colour.
 * - `local`    the filesystem of the host is not a vendor and must not borrow a
 *              cloud logo.
 * - `monogram` the vendor has no mark in the CC0 icon set (Tencent COS, Qiniu
 *              Kodo, Kingsoft KS3, the Chinese carrier clouds, Akamai/Linode,
 *              a custom S3 endpoint). Borrowing an unrelated logo would be a
 *              false claim, so these get an operator-recognised monogram.
 *
 * Pure data + logic, no React: the tile component renders the result and the
 * rules are unit-tested without a DOM.
 */
const BRAND_ICONS: Readonly<Record<string, StorageProviderBrandIcon>> = STORAGE_PROVIDER_BRAND_ICONS;

/** Kinds that are not vendors. */
const LOCAL_KINDS = new Set(['local_filesystem']);
const GENERIC_KINDS = new Set(['custom']);

/**
 * Initials for vendors without a mark. Curated rather than derived, because a
 * derived monogram reads poorly here: `kingsoft_ks3` would become "KK" and
 * `qiniu_kodo` "QK", while operators know these as KS and QN.
 */
const KIND_MONOGRAMS: Readonly<Record<string, string>> = {
  tencent_cos: 'TC',
  tencent_cloud_international: 'TC',
  china_mobile_ecloud: 'CM',
  china_telecom_eos: 'CT',
  china_unicom_wo: 'CU',
  kingsoft_ks3: 'KS',
  qiniu_kodo: 'QN',
  volcengine_tos: 'VE',
  linode_object_storage: 'LN',
  custom: 'S3',
};

export type ResolvedStorageProviderBrand =
  | { kind: 'brand'; icon: StorageProviderBrandIcon }
  | { kind: 'local' }
  | { kind: 'generic' }
  | { kind: 'monogram'; monogram: string };

export function resolveStorageProviderBrand(providerKind: string): ResolvedStorageProviderBrand {
  const raw = providerKind.trim().toLowerCase();
  // `custom:<slug>` is a parameterized kind; the brand is the generic endpoint.
  const separator = raw.indexOf(':');
  const kind = separator > 0 ? raw.slice(0, separator) : raw;
  if (LOCAL_KINDS.has(kind)) {
    return { kind: 'local' };
  }
  if (GENERIC_KINDS.has(kind)) {
    return { kind: 'generic' };
  }
  const icon = BRAND_ICONS[kind];
  if (icon) {
    return { kind: 'brand', icon };
  }
  return { kind: 'monogram', monogram: kindMonogram(kind) };
}

/** Monogram for a kind: curated when known, derived from its segments otherwise. */
export function kindMonogram(providerKind: string): string {
  const curated = KIND_MONOGRAMS[providerKind];
  if (curated) {
    return curated;
  }
  const segments = providerKind
    .split(/[^a-z0-9]+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return '?';
  }
  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }
  return segments
    .slice(0, 2)
    .map((segment) => segment[0])
    .join('')
    .toUpperCase();
}

/** The colour the mark is drawn in: brand colour, or the legible-on-white ink. */
export function storageProviderBrandInk(icon: StorageProviderBrandIcon): string {
  return `#${icon.ink ?? icon.hex}`;
}

/** Kinds that ship an embedded mark. */
export function storageProviderBrandKinds(): string[] {
  return Object.keys(BRAND_ICONS);
}
