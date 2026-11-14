#!/usr/bin/env node
/**
 * Generates `payment-provider-brand-icons.generated.ts` for the admin payments
 * package from the CC0 `simple-icons` icon set.
 *
 * Why generate instead of shipping a runtime dependency: brand marks are inert
 * path strings, so the portal keeps no extra package at runtime, no network
 * request per row, and no CDN/`<img>` failure mode in an admin table. The
 * generated module is the only artifact that changes when an upstream glyph is
 * refreshed.
 *
 * Optional overrides (never edited by hand in the generated file):
 *   - `icon`  simple-icons slug whose path is embedded.
 *   - `hex`   official primary brand colour, stored hex-without-# to match the
 *             upstream convention used by `social-icons.generated.ts`.
 *   - `ink`   legible-on-white variant of a very light brand colour (Klarna
 *             pink, Afterpay mint, Meituan yellow); omitted when `hex` already
 *             reads on a white tile.
 *
 * Usage:
 *   node apps/sdkwork-cloudrouter-pc/scripts/generate-payment-provider-brand-icons.mjs
 *   SIMPLE_ICONS_JSON=/path/to/icons.json node .../generate-payment-provider-brand-icons.mjs
 *
 * Brand names and marks remain the trademarks of their owners and are rendered
 * only to identify the payment provider an operator has configured.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PC_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(PC_ROOT, '..', '..');
const DEFAULT_OUTPUT = join(
  PC_ROOT,
  'packages',
  'sdkwork-cloudrouter-pc-admin-payments',
  'src',
  'components',
  'payment-provider-brand-icons.generated.ts',
);

/**
 * `--out <path>` writes the same artifact into another workspace that renders
 * payment provider identity. Both copies are generated from this one script and
 * one brand table, so the marks can never drift apart in shape or colour.
 *
 *   node apps/sdkwork-cloudrouter-pc/scripts/generate-payment-provider-brand-icons.mjs \
 *     --out ../sdkwork-payment/apps/sdkwork-payment-pc/packages/sdkwork-payment-pc-admin-core/src/components/payment-provider-brand-icons.generated.ts
 */
function readOutputPath(argv) {
  const index = argv.indexOf('--out');
  if (index === -1) return DEFAULT_OUTPUT;
  const value = argv[index + 1];
  if (!value) throw new Error('--out requires a target file path');
  return resolve(process.cwd(), value);
}

const OUTPUT = readOutputPath(process.argv.slice(2));

/**
 * Provider code -> upstream glyph + brand colour. Codes are the
 * `PaymentProviderInventoryItem.providerCode` enum members, so the generated
 * module is keyed by the wire contract rather than by a display label.
 *
 * `bleed: true` marks artwork that fills its whole 24x24 box (measured path
 * bounding box >= 23.5 in both axes) and is therefore a complete app-icon
 * square rather than a floating mark: the tile draws it edge to edge instead of
 * insetting it, which triples the drawn size of the mark inside its own square.
 */
const PROVIDER_BRANDS = {
  // Global gateways and wallets.
  stripe: { icon: 'stripe', hex: '635BFF' },
  alipay: { icon: 'alipay', hex: '1677FF', bleed: true },
  wechat_pay: { icon: 'wechat', hex: '07C160' },
  paypal: { icon: 'paypal', hex: '002991' },
  apple_pay: { icon: 'applepay', hex: '000000' },
  google_pay: { icon: 'googlepay', hex: '4285F4' },
  adyen: { icon: 'adyen', hex: '0ABF53' },
  amazon_pay: { icon: 'amazonpay', hex: 'FF9900' },
  braintree: { icon: 'braintree', hex: '000000' },
  square: { icon: 'square', hex: '3E4348', bleed: true },
  payoneer: { icon: 'payoneer', hex: 'FF4800' },
  razorpay: { icon: 'razorpay', hex: '0C2451' },
  paytm: { icon: 'paytm', hex: '20336B' },
  phonepe: { icon: 'phonepe', hex: '5F259F', bleed: true },
  // Buy-now-pay-later.
  klarna: { icon: 'klarna', hex: 'FFB3C7', ink: '17120F' },
  afterpay: { icon: 'afterpay', hex: 'B2FCE4', ink: '05604A', bleed: true },
  // Asia-Pacific wallets and acquirers. The consumer brand owns the wallet
  // mark: GrabPay is the Grab wallet, Mi Pay the Xiaomi wallet, and so on.
  grabpay: { icon: 'grab', hex: '00B14F' },
  meituan_pay: { icon: 'meituan', hex: 'FFD100', ink: '111111', bleed: true },
  huawei_pay: { icon: 'huawei', hex: 'FF0000' },
  baidu_pay: { icon: 'baidu', hex: '2932E1' },
  mi_pay: { icon: 'xiaomi', hex: 'FF6900', bleed: true },
  kakaopay: { icon: 'kakao', hex: 'FFCD00', ink: '191600' },
  naver_pay: { icon: 'naver', hex: '03C75A' },
  line_pay: { icon: 'line', hex: '00C300' },
  rakuten_pay: { icon: 'rakuten', hex: 'BF0000' },
  zalo_pay: { icon: 'zalo', hex: '0068FF' },
  shopee_pay: { icon: 'shopee', hex: 'EE4D2D' },
  // Latin America.
  mercadopago: { icon: 'mercadopago', hex: '00B1EA' },
  pagseguro: { icon: 'pagseguro', hex: 'FFC801', ink: '1A1A1A' },
  conekta: { icon: 'conekta', hex: '0A1837' },
};

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function resolveIconSet() {
  const candidates = [
    process.env.SIMPLE_ICONS_JSON,
    join(REPO_ROOT, 'node_modules', '@iconify-json', 'simple-icons', 'icons.json'),
    join(REPO_ROOT, 'node_modules', '.pnpm', 'node_modules', '@iconify-json', 'simple-icons', 'icons.json'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const iconSet = readJson(candidate);
      return { ...iconSet, version: readIconSetVersion(candidate) };
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  throw new Error(
    `simple-icons icons.json was not found. Tried:\n  ${candidates.join('\n  ')}\n`
    + 'Install @iconify-json/simple-icons or set SIMPLE_ICONS_JSON to its icons.json path.',
  );
}

/** The icon set does not version-stamp `icons.json`; the sibling manifest does. */
function readIconSetVersion(iconsJsonPath) {
  try {
    return readJson(join(dirname(iconsJsonPath), 'package.json')).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

/** Upstream bodies are a single `<path d="..."/>` for this icon set. */
function readPathData(iconSet, slug) {
  const icon = iconSet.icons?.[slug];
  if (!icon) throw new Error(`simple-icons has no "${slug}" glyph`);
  const matches = [...String(icon.body).matchAll(/<path[^>]*\sd="([^"]+)"/g)];
  if (matches.length !== 1) {
    throw new Error(`"${slug}" is not a single-path glyph (${matches.length} paths); extend the generator`);
  }
  return matches[0][1];
}

function renderModule(iconSet) {
  const entries = Object.entries(PROVIDER_BRANDS)
    .map(([code, brand]) => {
      const path = readPathData(iconSet, brand.icon);
      const ink = brand.ink ? `\n    ink: '${brand.ink}',` : '';
      const bleed = brand.bleed ? `\n    bleed: true,` : '';
      const key = /^[A-Za-z_$][\w$]*$/.test(code) ? code : `'${code}'`;
      return `  // ${code} — simple-icons ${brand.icon}\n  ${key}: {\n    hex: '${brand.hex}',${ink}${bleed}\n    path:\n      '${path}',\n  },`;
    })
    .join('\n');

  const upstreamVersion = iconSet.version;

  return `/**
 * Brand marks for the admin payment provider inventory.
 *
 * GENERATED by \`apps/sdkwork-cloudrouter-pc/scripts/generate-payment-provider-brand-icons.mjs\`
 * from **simple-icons ${upstreamVersion}** (CC0-1.0 upstream path data).
 *
 * Do not hand-edit: rerun the script instead. The upstream icon set is CC0-1.0,
 * so the path data below carries no copyleft obligation and the portal takes on
 * no runtime dependency — these are plain strings.
 *
 * Brand names and marks remain the trademarks of their owners and are rendered
 * only to identify the payment provider an operator has configured.
 *
 * Paths are 24x24 viewBox, single-command \`d\` data drawn with
 * \`fill="currentColor"\`; \`hex\` is the official primary brand colour without
 * \`#\` (verified against the published \`simple-icons\` brand colour at
 * https://cdn.simpleicons.org/<slug>, 2026-11-14), and \`ink\` overrides it where
 * the official colour is too light to read on a white tile.
 */

export interface PaymentProviderBrandIcon {
  /** Official brand colour, hex without \`#\`. */
  readonly hex: string;
  /** Legible-on-white override for very light brand colours. */
  readonly ink?: string;
  /** Artwork fills its 24x24 box: draw it edge to edge as a complete app icon. */
  readonly bleed?: boolean;
  /** 24x24 viewBox path data for a single \`<path d>\`. */
  readonly path: string;
}

export const PAYMENT_PROVIDER_BRAND_ICONS = {
${entries}
} as const satisfies Record<string, PaymentProviderBrandIcon>;

/** Provider codes with an embedded brand mark. */
export type PaymentProviderBrandCode = keyof typeof PAYMENT_PROVIDER_BRAND_ICONS;
`;
}

const iconSet = resolveIconSet();
writeFileSync(OUTPUT, renderModule(iconSet), 'utf8');
const codes = Object.keys(PROVIDER_BRANDS);
console.log(`wrote ${OUTPUT} (${codes.length} provider marks)`);
