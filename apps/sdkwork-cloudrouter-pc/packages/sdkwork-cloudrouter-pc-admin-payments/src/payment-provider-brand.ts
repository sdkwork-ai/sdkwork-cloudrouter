import {
  PAYMENT_PROVIDER_BRAND_ICONS,
  type PaymentProviderBrandIcon,
} from './components/payment-provider-brand-icons.generated';

/**
 * Brand identity for a payment provider, resolved from its wire
 * `providerCode`.
 *
 * Three outcomes exist and they must stay distinguishable:
 *
 * - `brand`    an upstream mark exists (Stripe, Alipay, WeChat Pay, …); the tile
 *              draws it in the provider's own colour.
 * - `sandbox`  a test endpoint is not a brand and must never borrow a real
 *              provider's mark.
 * - `monogram` no mark exists (the long tail of regional processors); the tile
 *              shows a deterministic two-letter monogram so operators can still
 *              tell rows apart at a glance.
 *
 * Pure data + logic, no React: the tile component renders the result, and the
 * resolution rules are unit-tested without a DOM.
 */
const BRAND_ICONS: Readonly<Record<string, PaymentProviderBrandIcon>> = PAYMENT_PROVIDER_BRAND_ICONS;

/** Providers that are not brands and must never borrow a brand mark. */
const NON_BRAND_PROVIDER_CODES = new Set(['sandbox', 'sandbox_test', 'test', 'mock']);

export type ResolvedPaymentProviderBrand =
  | { kind: 'brand'; icon: PaymentProviderBrandIcon }
  | { kind: 'sandbox' }
  | { kind: 'monogram'; monogram: string };

/** Resolves what to draw for a provider code. */
export function resolvePaymentProviderBrand(providerCode: string): ResolvedPaymentProviderBrand {
  const code = providerCode.trim().toLowerCase();
  if (NON_BRAND_PROVIDER_CODES.has(code)) {
    return { kind: 'sandbox' };
  }
  const icon = BRAND_ICONS[code];
  if (icon) {
    return { kind: 'brand', icon };
  }
  return { kind: 'monogram', monogram: providerMonogram(code) };
}

/**
 * Monogram for a provider code: `jd_pay` -> `JP`, `unionpay` -> `UN`. Stable and
 * language-neutral on purpose — the localized display name sits next to it and
 * changes with the operator's locale.
 */
export function providerMonogram(providerCode: string): string {
  const segments = providerCode
    .split(/[^a-z0-9]+/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length === 0) {
    return '?';
  }
  if (segments.length === 1) {
    return segments[0].slice(0, 2).toUpperCase();
  }
  return segments.slice(0, 2).map((segment) => segment[0]).join('').toUpperCase();
}

/** The colour the mark is drawn in: brand colour, or the legible-on-white ink. */
export function paymentProviderBrandInk(icon: PaymentProviderBrandIcon): string {
  return `#${icon.ink ?? icon.hex}`;
}

/** Provider codes that ship an embedded mark. */
export function paymentProviderBrandCodes(): string[] {
  return Object.keys(BRAND_ICONS);
}
