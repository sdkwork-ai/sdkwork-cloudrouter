import type { CatalogCategory, CatalogProduct, CatalogSku } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

/**
 * Presentation rules for the Smart Hardware Market.
 *
 * Everything here is pure: it turns the Product Center read model into the
 * decisions a storefront must make (which price a card shows, how a category
 * tree is ordered, which specification glyph a product gets, whether a shipping
 * address is complete). The service module owns transport; the pages own layout.
 */

export const HARDWARE_MARKET_PAGE_SIZE = 12;
export const HARDWARE_MARKET_MAX_PAGE_SIZE = 60;
/** Category pages are consumed whole: the rail needs the full tree, not one page. */
export const HARDWARE_MARKET_CATEGORY_PAGE_SIZE = 200;
export const HARDWARE_MARKET_MAX_CATEGORY_PAGES = 10;
/** Bounded fan-out for the per-product SKU lookup that feeds the card price. */
export const HARDWARE_MARKET_SKU_FETCH_CONCURRENCY = 4;
export const HARDWARE_MARKET_SKU_PAGE_SIZE = 200;
export const HARDWARE_MARKET_MAX_QUANTITY = 99;
export const HARDWARE_MARKET_MIN_QUANTITY = 1;

export type MarketSort = 'newest' | 'price-asc' | 'price-desc';

export const MARKET_SORT_OPTIONS = [
  { value: 'newest', labelKey: 'hardwareMarket.sort.newest' },
  { value: 'price-asc', labelKey: 'hardwareMarket.sort.priceAsc' },
  { value: 'price-desc', labelKey: 'hardwareMarket.sort.priceDesc' },
] as const satisfies readonly { value: MarketSort; labelKey: string }[];

export function isMarketSort(value: string | null | undefined): value is MarketSort {
  return value === 'newest' || value === 'price-asc' || value === 'price-desc';
}

/**
 * Server-side sort key. The Product Center list route defaults to `created_at
 * DESC`, so `newest` sends no parameter at all rather than a guessed token.
 */
export function marketSortParam(sort: MarketSort): string | undefined {
  return sort === 'newest' ? undefined : sort;
}

const INTEGER_PATTERN = /^-?\d+$/u;

function toBigIntAmount(value: string | null | undefined): bigint | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return INTEGER_PATTERN.test(trimmed) ? BigInt(trimmed) : null;
}

/** A SKU is on sale when both the lifecycle and the sales gate are active. */
export function isSellableSku(sku: CatalogSku): boolean {
  return sku.status === 'active' && sku.salesStatus === 'active';
}

export interface MarketPrice {
  /** Minor-unit amount as the wire delivers it; never converted to `number`. */
  amountMinor: string;
  currencyCode: string;
  exponent: string;
  listAmountMinor: string | null;
}

/**
 * The price a card shows for a product: the cheapest sellable SKU in the first
 * currency the product declares. Mixed-currency products cannot be compared, so
 * the storefront never blends them into one "from" figure.
 */
export function resolveMarketPrice(skus: readonly CatalogSku[]): MarketPrice | null {
  const sellable = skus.filter((sku) => isSellableSku(sku) && toBigIntAmount(sku.salePriceMinor) !== null);
  const first = sellable[0];
  if (!first) {
    return null;
  }

  const currencyCode = first.currencyCode.trim().toUpperCase();
  const sameCurrency = sellable.filter((sku) => sku.currencyCode.trim().toUpperCase() === currencyCode);
  const candidate = sameCurrency.length > 0 ? sameCurrency[0] : first;
  let best = candidate;
  let bestAmount = toBigIntAmount(candidate.salePriceMinor) ?? 0n;

  for (const sku of sameCurrency) {
    const amount = toBigIntAmount(sku.salePriceMinor);
    if (amount !== null && amount < bestAmount) {
      best = sku;
      bestAmount = amount;
    }
  }

  const listAmount = toBigIntAmount(best.listPriceMinor);
  return {
    amountMinor: best.salePriceMinor,
    currencyCode,
    exponent: best.minorUnitExponent,
    listAmountMinor: listAmount !== null && listAmount > bestAmount ? best.listPriceMinor ?? null : null,
  };
}

export function resolveSkuPrice(sku: CatalogSku): MarketPrice | null {
  return resolveMarketPrice([sku]);
}

export function resolveDiscountPercent(price: MarketPrice): number | null {
  const sale = toBigIntAmount(price.amountMinor);
  const list = toBigIntAmount(price.listAmountMinor);
  if (sale === null || list === null || list <= sale || list === 0n) {
    return null;
  }
  const percent = Number(((list - sale) * 100n) / list);
  return percent > 0 && percent < 100 ? percent : null;
}

/**
 * Formats a minor-unit amount without ever losing precision on the way in.
 * `Intl` receives a `number` only when the minor amount is inside the safe
 * integer range; larger amounts fall back to a plain decimal string so a
 * display formatter can never silently round a catalog price.
 */
export function formatMarketAmount(
  amountMinor: string,
  currencyCode: string,
  exponent: string,
  locale: string,
): string {
  const amount = amountMinor.trim();
  const parsedExponent = Number.parseInt(exponent, 10);
  const currency = currencyCode.trim().toUpperCase() || 'CNY';
  if (!INTEGER_PATTERN.test(amount) || !Number.isInteger(parsedExponent) || parsedExponent < 0 || parsedExponent > 8) {
    return `${currency} ${amount}`;
  }

  const negative = amount.startsWith('-');
  const digits = negative ? amount.slice(1) : amount;
  const padded = digits.padStart(parsedExponent + 1, '0');
  const whole = padded.slice(0, padded.length - parsedExponent) || '0';
  const fraction = parsedExponent > 0 ? padded.slice(padded.length - parsedExponent) : '';
  const decimal = `${negative ? '-' : ''}${whole}${fraction ? `.${fraction}` : ''}`;

  const numeric = Number(amount);
  if (!Number.isSafeInteger(numeric)) {
    return `${currency} ${decimal}`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: parsedExponent,
      maximumFractionDigits: parsedExponent,
    }).format(numeric / 10 ** parsedExponent);
  } catch {
    return `${currency} ${decimal}`;
  }
}

export function formatMarketDate(value: string | null | undefined, locale: string): string | null {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(timestamp));
  } catch {
    return new Date(timestamp).toISOString().slice(0, 10);
  }
}

// --------------------------------------------------------------- categories

export interface MarketCategoryNode {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  isLeaf: boolean;
  sortOrder: string;
  children: MarketCategoryNode[];
}

function compareNumericStrings(left: string, right: string): number {
  const leftAmount = toBigIntAmount(left);
  const rightAmount = toBigIntAmount(right);
  if (leftAmount !== null && rightAmount !== null) {
    if (leftAmount < rightAmount) return -1;
    if (leftAmount > rightAmount) return 1;
    return 0;
  }
  return left.localeCompare(right);
}

export function buildCategoryTree(categories: readonly CatalogCategory[]): MarketCategoryNode[] {
  const nodes = new Map<string, MarketCategoryNode>();
  for (const category of categories) {
    const depth = Number.parseInt(category.depth, 10);
    nodes.set(category.id, {
      id: category.id,
      name: category.name.trim() || category.categoryNo,
      parentId: category.parentId ?? null,
      depth: Number.isFinite(depth) && depth >= 0 ? depth : 0,
      isLeaf: category.isLeaf,
      sortOrder: category.sortOrder,
      children: [],
    });
  }

  const roots: MarketCategoryNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortLevel = (level: MarketCategoryNode[]): void => {
    level.sort((left, right) => compareNumericStrings(left.sortOrder, right.sortOrder) || left.name.localeCompare(right.name));
    for (const node of level) {
      sortLevel(node.children);
    }
  };
  sortLevel(roots);
  return roots;
}

export function flattenCategoryNodes(nodes: readonly MarketCategoryNode[]): MarketCategoryNode[] {
  const flattened: MarketCategoryNode[] = [];
  const visit = (level: readonly MarketCategoryNode[]) => {
    for (const node of level) {
      flattened.push(node);
      visit(node.children);
    }
  };
  visit(nodes);
  return flattened;
}

/** Path from the root to one category, used for breadcrumbs and the rail. */
export function resolveCategoryTrail(
  nodes: readonly MarketCategoryNode[],
  categoryId: string | null,
): MarketCategoryNode[] {
  if (!categoryId) {
    return [];
  }
  for (const node of nodes) {
    if (node.id === categoryId) {
      return [node];
    }
    const childTrail = resolveCategoryTrail(node.children, categoryId);
    if (childTrail.length > 0) {
      return [node, ...childTrail];
    }
  }
  return [];
}

export function findCategory(nodes: readonly MarketCategoryNode[], categoryId: string): MarketCategoryNode | null {
  for (const node of nodes) {
    if (node.id === categoryId) {
      return node;
    }
    const child = findCategory(node.children, categoryId);
    if (child) {
      return child;
    }
  }
  return null;
}

// ------------------------------------------------------------------ glyphs

export type HardwareGlyphKind =
  | 'ar'
  | 'camera'
  | 'chip'
  | 'console'
  | 'display'
  | 'drone'
  | 'headphones'
  | 'hub'
  | 'keyboard'
  | 'lamp'
  | 'lock'
  | 'power'
  | 'printer'
  | 'robot'
  | 'router'
  | 'sensor'
  | 'speaker'
  | 'watch';

const GLYPH_RULES: readonly { kind: HardwareGlyphKind; keywords: readonly string[] }[] = [
  { kind: 'camera', keywords: ['摄像', '相机', '监控', '镜头', 'camera', 'webcam', 'cam'] },
  { kind: 'headphones', keywords: ['耳机', '耳麦', 'headphone', 'headset', 'earbud'] },
  { kind: 'speaker', keywords: ['音箱', '音响', '喇叭', 'speaker', 'soundbar'] },
  { kind: 'watch', keywords: ['手表', '手环', '穿戴', 'watch', 'band', 'wearable'] },
  { kind: 'router', keywords: ['路由', '网关', '交换机', 'router', 'gateway', 'switch'] },
  { kind: 'sensor', keywords: ['传感', '温湿度', '探测', 'sensor', 'detector'] },
  { kind: 'hub', keywords: ['中枢', '扩展坞', '底座', 'hub', 'dock', 'repeater'] },
  { kind: 'display', keywords: ['屏', '显示', '电视', 'display', 'monitor', 'screen', 'tv'] },
  { kind: 'keyboard', keywords: ['键盘', '鼠标', '输入', 'keyboard', 'mouse'] },
  { kind: 'drone', keywords: ['无人机', '航拍', 'drone'] },
  { kind: 'robot', keywords: ['机器人', '机械臂', 'robot'] },
  { kind: 'lamp', keywords: ['灯', '照明', 'lamp', 'light', 'bulb'] },
  { kind: 'power', keywords: ['电源', '充电', '电池', 'power', 'charger', 'battery'] },
  { kind: 'lock', keywords: ['门锁', '门禁', 'lock', 'access control'] },
  { kind: 'printer', keywords: ['打印', 'printer'] },
  { kind: 'ar', keywords: ['眼镜', '头显', 'vr', 'ar ', 'glasses', 'headset xr'] },
  { kind: 'console', keywords: ['游戏', '手柄', 'game', 'console', 'controller'] },
  { kind: 'chip', keywords: ['芯片', '模组', '主板', '开发板', 'chip', 'module', 'board'] },
];

/** Deterministic glyph selection from the product and category copy. */
export function resolveHardwareGlyphKind(name: string, categoryName?: string | null): HardwareGlyphKind {
  const haystack = `${name} ${categoryName ?? ''}`.toLowerCase();
  for (const rule of GLYPH_RULES) {
    if (rule.keywords.some((keyword) => haystack.includes(keyword))) {
      return rule.kind;
    }
  }
  return 'chip';
}

// -------------------------------------------------------------------- copy

export function productDisplayName(product: CatalogProduct): string {
  const title = product.title?.trim();
  if (title) {
    return title;
  }
  const name = product.name.trim();
  return name || product.productNo;
}

export function productTagline(product: CatalogProduct): string | null {
  const subtitle = product.subtitle?.trim();
  if (subtitle) {
    return subtitle;
  }
  const description = product.description?.trim();
  if (!description) {
    return null;
  }
  const firstLine = description.split(/\r?\n/u)[0]?.trim() ?? '';
  if (!firstLine) {
    return null;
  }
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine;
}

export function describeSkuLabel(sku: CatalogSku): string {
  const values = sku.attributeValues.map((value) => value.displayValue.trim()).filter((value) => value.length > 0);
  if (values.length > 0) {
    return values.join(' / ');
  }
  const title = sku.title?.trim();
  if (title) {
    return title;
  }
  const name = sku.name?.trim();
  if (name) {
    return name;
  }
  return sku.skuNo;
}

export function sortSkusForDisplay(skus: readonly CatalogSku[]): CatalogSku[] {
  return [...skus].sort((left, right) => {
    const leftSellable = isSellableSku(left) ? 0 : 1;
    const rightSellable = isSellableSku(right) ? 0 : 1;
    if (leftSellable !== rightSellable) {
      return leftSellable - rightSellable;
    }
    const leftPrice = toBigIntAmount(left.salePriceMinor);
    const rightPrice = toBigIntAmount(right.salePriceMinor);
    if (leftPrice !== null && rightPrice !== null && leftPrice !== rightPrice) {
      return leftPrice < rightPrice ? -1 : 1;
    }
    return describeSkuLabel(left).localeCompare(describeSkuLabel(right));
  });
}

// ---------------------------------------------------------------- purchase

export interface HardwareMarketShippingAddressInput {
  receiverName: string;
  receiverPhone: string;
  countryCode: string;
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  postalCode: string;
}

export interface HardwareMarketShippingAddress {
  receiverName: string;
  receiverPhone: string;
  countryCode: string;
  province: string;
  city: string;
  detailAddress: string;
  district?: string;
  postalCode?: string;
}

export const EMPTY_SHIPPING_ADDRESS: HardwareMarketShippingAddressInput = {
  receiverName: '',
  receiverPhone: '',
  countryCode: 'CN',
  province: '',
  city: '',
  district: '',
  detailAddress: '',
  postalCode: '',
};

export const SHIPPING_ADDRESS_REQUIRED_FIELDS = [
  'receiverName',
  'receiverPhone',
  'countryCode',
  'province',
  'city',
  'detailAddress',
] as const;

export type HardwareMarketShippingAddressField = keyof HardwareMarketShippingAddressInput;

export function resolveShippingAddressErrors(
  input: HardwareMarketShippingAddressInput,
): HardwareMarketShippingAddressField[] {
  return SHIPPING_ADDRESS_REQUIRED_FIELDS.filter((field) => input[field].trim().length === 0);
}

export function toPhysicalShippingAddress(
  input: HardwareMarketShippingAddressInput,
): HardwareMarketShippingAddress {
  const district = input.district.trim();
  const postalCode = input.postalCode.trim();
  return {
    receiverName: input.receiverName.trim(),
    receiverPhone: input.receiverPhone.trim(),
    countryCode: input.countryCode.trim().toUpperCase(),
    province: input.province.trim(),
    city: input.city.trim(),
    detailAddress: input.detailAddress.trim(),
    ...(district ? { district } : {}),
    ...(postalCode ? { postalCode } : {}),
  };
}

export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) {
    return HARDWARE_MARKET_MIN_QUANTITY;
  }
  const rounded = Math.trunc(value);
  return Math.min(HARDWARE_MARKET_MAX_QUANTITY, Math.max(HARDWARE_MARKET_MIN_QUANTITY, rounded));
}

/** Stable idempotency key for one checkout attempt (crypto when available). */
export function createCheckoutAttemptKey(): string {
  const cryptoApi = typeof globalThis === 'object' ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID();
  }
  return `hardware-market-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
