import { Boxes, HardDrive } from 'lucide-react';
import { resolveStorageProviderBrand, storageProviderBrandInk } from './storage-provider-brand';

/**
 * Brand identity for a storage provider row.
 *
 * Same visual language as the payment console's provider tile — a 36px white
 * rounded square holding the vendor's mark in its own brand colour — so an
 * operator moving between payment and storage configuration reads the same
 * column the same way. Marks are generated SVG paths from the CC0
 * `simple-icons` set (see `scripts/generate-provider-brand-icons.mjs --set
 * storage`): no per-row network request, no `<img>` failure mode.
 *
 * Kinds without a published mark fall back to a deterministic monogram, the
 * local filesystem shows a drive glyph, and a custom S3 endpoint shows a
 * generic box — never another vendor's logo.
 */
const TILE_SIZES = {
  sm: { tile: 'h-7 w-7 rounded-lg', glyph: 'h-[15px] w-[15px]', bleed: 'h-[31px] w-[31px]', monogram: 'text-[9px]' },
  md: { tile: 'h-9 w-9 rounded-[10px]', glyph: 'h-[21px] w-[21px]', bleed: 'h-[41px] w-[41px]', monogram: 'text-[11px]' },
} as const;

export type StorageProviderBrandTileProps = {
  providerKind: string;
  size?: keyof typeof TILE_SIZES;
};

export function StorageProviderBrandTile({ providerKind, size = 'md' }: StorageProviderBrandTileProps) {
  const brand = resolveStorageProviderBrand(providerKind);
  const dimensions = TILE_SIZES[size];
  const isBleed = brand.kind === 'brand' && brand.icon.bleed === true;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center bg-white ring-1 ring-slate-900/[0.08] shadow-[0_1px_2px_rgb(15_23_42_/_0.06)] dark:ring-white/15 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.45)] ${dimensions.tile} ${
        isBleed ? 'overflow-hidden' : ''
      }`}
      data-storage-provider-brand={brand.kind}
      data-storage-provider-kind={providerKind}
    >
      {brand.kind === 'brand' ? (
        <svg
          className={isBleed ? dimensions.bleed : dimensions.glyph}
          fill="currentColor"
          role="presentation"
          style={{ color: storageProviderBrandInk(brand.icon) }}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={brand.icon.path} />
        </svg>
      ) : brand.kind === 'local' ? (
        <HardDrive className={`${dimensions.glyph} text-slate-500 dark:text-slate-400`} strokeWidth={1.8} />
      ) : brand.kind === 'generic' ? (
        <Boxes className={`${dimensions.glyph} text-slate-500 dark:text-slate-400`} strokeWidth={1.8} />
      ) : (
        <span className={`font-semibold tracking-tight text-slate-500 ${dimensions.monogram}`}>
          {brand.monogram}
        </span>
      )}
    </span>
  );
}
