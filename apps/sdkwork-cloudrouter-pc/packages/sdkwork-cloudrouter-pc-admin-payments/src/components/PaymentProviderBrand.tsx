import { FlaskConical } from 'lucide-react';
import {
  paymentProviderBrandInk,
  resolvePaymentProviderBrand,
} from '../payment-provider-brand';

/**
 * Brand identity for a payment provider row.
 *
 * Every provider is drawn as the same 36px "app tile": a white rounded square
 * holding the official brand mark in its own brand colour, so the column reads
 * as one visual system regardless of which providers an operator has enabled.
 * Marks come from the CC0 `simple-icons` set (see
 * `scripts/generate-payment-provider-brand-icons.mjs`): inert SVG paths, so no
 * per-row network request and no `<img>` failure mode, crisp on any DPI.
 *
 * Marks whose artwork fills the full 24x24 box are complete app-icon squares
 * (Alipay, PhonePe, Square…). Those are drawn edge to edge and clipped by the
 * tile; everything else is inset. Without that split, a full-bleed square would
 * render as a sticker *inside* a second white square.
 */
const TILE_SIZES = {
  sm: { tile: 'h-7 w-7 rounded-lg', glyph: 'h-[15px] w-[15px]', bleed: 'h-[31px] w-[31px]', monogram: 'text-[9px]' },
  md: { tile: 'h-9 w-9 rounded-[10px]', glyph: 'h-[21px] w-[21px]', bleed: 'h-[41px] w-[41px]', monogram: 'text-[11px]' },
} as const;

export type PaymentProviderBrandTileProps = {
  providerCode: string;
  size?: keyof typeof TILE_SIZES;
};

export function PaymentProviderBrandTile({ providerCode, size = 'md' }: PaymentProviderBrandTileProps) {
  const brand = resolvePaymentProviderBrand(providerCode);
  const dimensions = TILE_SIZES[size];
  const isBleed = brand.kind === 'brand' && brand.icon.bleed === true;

  return (
    <span
      aria-hidden="true"
      className={`relative inline-flex shrink-0 items-center justify-center bg-white ring-1 ring-slate-900/[0.08] shadow-[0_1px_2px_rgb(15_23_42_/_0.06)] dark:ring-white/15 dark:shadow-[0_1px_2px_rgb(0_0_0_/_0.45)] ${dimensions.tile} ${
        isBleed ? 'overflow-hidden' : ''
      }`}
      data-payment-provider-brand={brand.kind}
      data-payment-provider-code={providerCode}
    >
      {brand.kind === 'brand' ? (
        <svg
          className={isBleed ? dimensions.bleed : dimensions.glyph}
          fill="currentColor"
          role="presentation"
          style={{ color: paymentProviderBrandInk(brand.icon) }}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={brand.icon.path} />
        </svg>
      ) : brand.kind === 'sandbox' ? (
        <FlaskConical className={`${dimensions.glyph} text-amber-500`} strokeWidth={2} />
      ) : (
        <span className={`font-semibold tracking-tight text-slate-500 ${dimensions.monogram}`}>
          {brand.monogram}
        </span>
      )}
    </span>
  );
}
