#!/usr/bin/env node
/**
 * Generates brand-mark modules for SDKWork admin consoles from the CC0
 * `simple-icons` icon set.
 *
 * Two brand sets are owned here, each keyed by the **wire code** of the entity
 * that renders it, so a backend enum member is always the lookup key:
 *
 *   --set payment   payment provider codes  (`stripe`, `alipay`, `wechat_pay`…)
 *   --set storage   storage provider kinds  (`aliyun_oss`, `cloudflare_r2`…)
 *
 * Why generate instead of shipping a runtime dependency: brand marks are inert
 * path strings, so a console keeps no extra package at runtime, no network
 * request per row, and no CDN/`<img>` failure mode in an admin table. The
 * generated module is the only artifact that changes when a glyph is refreshed.
 *
 * Optional per-brand overrides (never edited by hand in the generated file):
 *   - `icon`  simple-icons slug whose path is embedded.
 *   - `hex`   published primary brand colour, hex-without-# (verified against
 *             https://cdn.simpleicons.org/<slug>).
 *   - `ink`   legible-on-white variant of a very light brand colour.
 *   - `bleed` artwork fills its whole 24x24 box (an entire app-icon square), so
 *             the tile draws it edge to edge instead of insetting it.
 *
 * Usage:
 *   node apps/sdkwork-cloudrouter-pc/scripts/generate-provider-brand-icons.mjs --set payment
 *   node apps/sdkwork-cloudrouter-pc/scripts/generate-provider-brand-icons.mjs --set storage
 *   node apps/sdkwork-cloudrouter-pc/scripts/generate-provider-brand-icons.mjs --set payment \
 *     --out ../sdkwork-payment/apps/sdkwork-payment-pc/packages/sdkwork-payment-pc-admin-core/src/components/payment-provider-brand-icons.generated.ts
 *   SIMPLE_ICONS_JSON=/path/to/icons.json node ...  (offline override)
 *
 * Brand names and marks remain the trademarks of their owners and are rendered
 * only to identify the provider an operator has configured.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const PC_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(PC_ROOT, '..', '..');

/**
 * Payment provider codes -> upstream glyph + brand colour.
 *
 * `bleed: true` marks artwork that fills its whole 24x24 box (measured path
 * bounding box >= 23.5 in both axes) and is therefore a complete app-icon
 * square rather than a floating mark: the tile draws it edge to edge instead of
 * insetting it, which triples the drawn size of the mark inside its own square.
 */
const PAYMENT_BRANDS = {
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

/**
 * Storage provider kinds (object storage) -> upstream glyph + brand colour.
 *
 * Kinds whose vendor publishes no vector mark in the CC0 set (Tencent COS,
 * Qiniu Kodo, Kingsoft KS3, Volcengine TOS, the three Chinese carrier clouds,
 * Akamai/Linode) are intentionally absent: the tile resolves them to a
 * deterministic monogram instead of borrowing an unrelated logo.
 */
const STORAGE_BRANDS = {
  // The kind's own label is "Amazon S3 / S3 Compatible", so the AWS mark is the
  // honest one: there is no neutral "S3" logo.
  s3_compatible: { icon: 'amazonwebservices', hex: 'FF9900' },
  aliyun_oss: { icon: 'alibabacloud', hex: 'FF6A00' },
  alibaba_cloud_international: { icon: 'alibabacloud', hex: 'FF6A00' },
  huawei_obs: { icon: 'huawei', hex: 'FF0000' },
  baidu_bos: { icon: 'baidu', hex: '2932E1' },
  cloudflare_r2: { icon: 'cloudflare', hex: 'F38020' },
  google_cloud_storage: { icon: 'googlecloudstorage', hex: 'AECBFA', ink: '4285F4' },
  ibm_cos: { icon: 'ibmcloud', hex: '0F62FE' },
  minio: { icon: 'minio', hex: 'C72E49' },
  oracle_cloud_storage: { icon: 'oracle', hex: 'F80000' },
  scaleway_object_storage: { icon: 'scaleway', hex: '4F0599' },
  vultr_object_storage: { icon: 'vultr', hex: '007BFC' },
  wasabi: { icon: 'wasabi', hex: '01CD3E' },
  backblaze_b2: { icon: 'backblaze', hex: 'E21E29' },
  digitalocean_spaces: { icon: 'digitalocean', hex: '0080FF' },
};

const SETS = {
  payment: {
    brands: PAYMENT_BRANDS,
    defaultOutput: join(
      PC_ROOT,
      'packages',
      'sdkwork-cloudrouter-pc-admin-payments',
      'src',
      'components',
      'payment-provider-brand-icons.generated.ts',
    ),
    moduleName: 'PAYMENT_PROVIDER_BRAND_ICONS',
    interfaceName: 'PaymentProviderBrandIcon',
    title: 'Brand marks for the admin payment provider inventory',
    codeNoun: 'provider code',
  },
  storage: {
    brands: STORAGE_BRANDS,
    defaultOutput: join(
      PC_ROOT,
      'packages',
      'sdkwork-cloudrouter-pc-admin-storage',
      'src',
      'components',
      'storage-provider-brand-icons.generated.ts',
    ),
    moduleName: 'STORAGE_PROVIDER_BRAND_ICONS',
    interfaceName: 'StorageProviderBrandIcon',
    title: 'Brand marks for the admin storage provider inventory',
    codeNoun: 'provider kind',
  },
};

const argv = process.argv.slice(2);

function readArg(name, fallback) {
  const index = argv.indexOf(name);
  if (index === -1) return fallback;
  const value = argv[index + 1];
  if (!value) throw new Error(`${name} requires a value`);
  return value;
}

const setName = readArg('--set', 'payment');
const set = SETS[setName];
if (!set) {
  throw new Error(`Unknown --set "${setName}". Supported: ${Object.keys(SETS).join(', ')}`);
}
const OUTPUT = resolve(process.cwd(), readArg('--out', set.defaultOutput));

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/** The icon set does not version-stamp `icons.json`; the sibling manifest does. */
function readIconSetVersion(iconsJsonPath) {
  try {
    return readJson(join(dirname(iconsJsonPath), 'package.json')).version ?? 'unknown';
  } catch {
    return 'unknown';
  }
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
  const entries = Object.entries(set.brands)
    .map(([code, brand]) => {
      const path = readPathData(iconSet, brand.icon);
      const ink = brand.ink ? `\n    ink: '${brand.ink}',` : '';
      const bleed = brand.bleed ? `\n    bleed: true,` : '';
      const key = /^[A-Za-z_$][\w$]*$/.test(code) ? code : `'${code}'`;
      return `  // ${code} — simple-icons ${brand.icon}\n  ${key}: {\n    hex: '${brand.hex}',${ink}${bleed}\n    path:\n      '${path}',\n  },`;
    })
    .join('\n');

  return `/**
 * ${set.title}.
 *
 * GENERATED by \`apps/sdkwork-cloudrouter-pc/scripts/generate-provider-brand-icons.mjs\`
 * (\`--set ${setName}\`) from **simple-icons ${iconSet.version}** (CC0-1.0 upstream path data).
 *
 * Do not hand-edit: rerun the script instead. The upstream icon set is CC0-1.0,
 * so the path data below carries no copyleft obligation and the console takes on
 * no runtime dependency — these are plain strings.
 *
 * Keys are ${set.codeNoun}s from the wire contract, not display labels. Brand
 * names and marks remain the trademarks of their owners and are rendered only
 * to identify the provider an operator has configured.
 *
 * Paths are 24x24 viewBox, single-command \`d\` data drawn with
 * \`fill="currentColor"\`; \`hex\` is the published primary brand colour without
 * \`#\` (verified against the \`simple-icons\` brand colour at
 * https://cdn.simpleicons.org/<slug>, 2026-11-14/15), and \`ink\` overrides it
 * where the official colour is too light to read on a white tile.
 */

export interface ${set.interfaceName} {
  /** Published brand colour, hex without \`#\`. */
  readonly hex: string;
  /** Legible-on-white override for very light brand colours. */
  readonly ink?: string;
  /** Artwork fills its 24x24 box: draw it edge to edge as a complete app icon. */
  readonly bleed?: boolean;
  /** 24x24 viewBox path data for a single \`<path d>\`. */
  readonly path: string;
}

export const ${set.moduleName} = {
${entries}
} as const satisfies Record<string, ${set.interfaceName}>;

/** ${set.codeNoun[0].toUpperCase()}${set.codeNoun.slice(1)}s with an embedded brand mark. */
export type ${set.interfaceName.replace('Icon', 'Code')} = keyof typeof ${set.moduleName};
`;
}

const iconSet = resolveIconSet();
writeFileSync(OUTPUT, renderModule(iconSet), 'utf8');
console.log(`[${setName}] wrote ${OUTPUT} (${Object.keys(set.brands).length} marks)`);
