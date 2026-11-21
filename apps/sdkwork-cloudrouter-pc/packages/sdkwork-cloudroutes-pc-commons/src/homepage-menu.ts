/**
 * Public homepage header menu registry shared by the portal header and `/admin/site`.
 *
 * The header's links used to be a literal array inside `Navbar.tsx`, which meant the operator had
 * no way to hide a link the deployment does not sell, and the admin page would have needed a
 * second copy of every label and route to offer one. This module is the single table instead:
 *
 * - the header draws exactly the entries listed here, filtered by the published visibility
 *   document;
 * - `/admin/site` renders one switch per entry by walking the same table, so a link cannot be
 *   switchable in one surface and unreadable in the other;
 * - the ordering here is the header order, because a deliberate menu order is a product decision
 *   and not something an operator arranges at runtime.
 *
 * The document is stored as `menu` inside the operator-authored `homepage` document (the payload
 * the site-runtime endpoint already publishes), not as a new top-level site-settings field: the
 * header is part of the homepage, and keeping it there means the feature needs no service or API
 * contract release. `normalizeHomepageMenuSettings` is deliberately forgiving, so a payload
 * written by an older console — or by a console that knows a link this build does not — still
 * resolves to a complete menu.
 */

export const HOMEPAGE_MENU_SETTINGS_VERSION = 1;

/**
 * Every link the public homepage header can draw, in header order.
 *
 * `labelKey` points at the shared `nav.*` translation keys the header has always used, so the
 * admin switch shows exactly the label a visitor reads. `showFrom` mirrors the responsive rule the
 * header used before this table existed: a wide-only link moves into the "More" dropdown on
 * narrower screens instead of disappearing.
 */
export const HOMEPAGE_MENU_CATALOG = [
  {
    id: 'home',
    href: '/',
    labelKey: 'nav.home',
    descriptionKey: 'admin.siteSettings.homeMenu.items.home.description',
  },
  {
    id: 'models',
    href: '/models',
    labelKey: 'nav.models',
    descriptionKey: 'admin.siteSettings.homeMenu.items.models.description',
  },
  {
    id: 'hardwareMarket',
    href: '/hardware-market',
    labelKey: 'nav.hardwareMarket',
    descriptionKey: 'admin.siteSettings.homeMenu.items.hardwareMarket.description',
  },
  {
    id: 'community',
    href: '/community',
    labelKey: 'nav.community',
    descriptionKey: 'admin.siteSettings.homeMenu.items.community.description',
  },
  {
    id: 'pricing',
    href: '/pricing',
    labelKey: 'nav.pricing',
    descriptionKey: 'admin.siteSettings.homeMenu.items.pricing.description',
  },
  {
    id: 'rankings',
    href: '/rankings',
    labelKey: 'nav.rankings',
    descriptionKey: 'admin.siteSettings.homeMenu.items.rankings.description',
    showFrom: '2xl' as const,
  },
  {
    id: 'productDocs',
    href: '/dev-docs/product-docs',
    labelKey: 'nav.productDocs',
    descriptionKey: 'admin.siteSettings.homeMenu.items.productDocs.description',
    showFrom: '2xl' as const,
  },
  {
    id: 'docs',
    href: '/docs',
    labelKey: 'nav.docs',
    descriptionKey: 'admin.siteSettings.homeMenu.items.docs.description',
  },
  {
    id: 'api',
    href: '/dev-docs/api-reference',
    labelKey: 'nav.api',
    descriptionKey: 'admin.siteSettings.homeMenu.items.api.description',
    showFrom: '2xl' as const,
  },
  {
    id: 'sdk',
    href: '/dev-docs/sdk-reference',
    labelKey: 'nav.sdk',
    descriptionKey: 'admin.siteSettings.homeMenu.items.sdk.description',
    showFrom: '2xl' as const,
  },
  {
    id: 'playground',
    href: '/playground',
    labelKey: 'nav.playground',
    descriptionKey: 'admin.siteSettings.homeMenu.items.playground.description',
  },
  {
    id: 'tokenPlan',
    href: '/token-plan',
    labelKey: 'nav.tokenPlan',
    descriptionKey: 'admin.siteSettings.homeMenu.items.tokenPlan.description',
    showFrom: '2xl' as const,
  },
  {
    id: 'partnerJoin',
    href: '/partner-join',
    labelKey: 'nav.partnerJoin',
    descriptionKey: 'admin.siteSettings.homeMenu.items.partnerJoin.description',
    showFrom: '2xl' as const,
  },
] as const;

export type HomepageMenuCatalogEntry = (typeof HOMEPAGE_MENU_CATALOG)[number];
export type HomepageMenuId = HomepageMenuCatalogEntry['id'];

export const HOMEPAGE_MENU_IDS: readonly HomepageMenuId[] = HOMEPAGE_MENU_CATALOG.map((entry) => entry.id);

export interface HomepageMenuItemSetting {
  id: HomepageMenuId;
  /** Shown in the homepage header. A hidden link keeps its route, so deep links still work. */
  visible: boolean;
}

export interface HomepageMenuSettings {
  version: typeof HOMEPAGE_MENU_SETTINGS_VERSION;
  /** Header order, covering every catalog entry — including hidden ones. */
  items: HomepageMenuItemSetting[];
}

const HOMEPAGE_MENU_ID_SET = new Set<string>(HOMEPAGE_MENU_IDS);

function isHomepageMenuId(value: unknown): value is HomepageMenuId {
  return typeof value === 'string' && HOMEPAGE_MENU_ID_SET.has(value);
}

/**
 * The responsive rule for one entry.
 *
 * Wide-only links live in the header bar from `2xl` up and collapse into the "More" dropdown below
 * it. `showFrom` is absent on ordinary links, and the catalog is a literal tuple, so the property
 * is read through this helper rather than by indexing the union directly.
 */
export function homepageMenuEntryShowFrom(entry: HomepageMenuCatalogEntry): '2xl' | undefined {
  return 'showFrom' in entry ? entry.showFrom : undefined;
}

/** A fresh document with every link visible, in catalog order. */
export function createDefaultHomepageMenuSettings(): HomepageMenuSettings {
  return {
    version: HOMEPAGE_MENU_SETTINGS_VERSION,
    items: HOMEPAGE_MENU_IDS.map((id) => ({ id, visible: true })),
  };
}

/**
 * Coerces a stored or wire value into the current document shape.
 *
 * Missing fields upgrade to the safe default, duplicate ids keep their first position, unknown ids
 * are dropped (an older portal cannot draw a link it does not know), and entries the catalog gained
 * after the payload was written are appended visible — the same upgrade rule the admin module
 * document follows. The result always contains every catalog id, so callers never special-case a
 * gap.
 */
export function normalizeHomepageMenuSettings(value: unknown): HomepageMenuSettings {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    return createDefaultHomepageMenuSettings();
  }
  if (value.version !== undefined && value.version !== HOMEPAGE_MENU_SETTINGS_VERSION) {
    // A document from a future schema is not safe to reinterpret field-by-field.
    return createDefaultHomepageMenuSettings();
  }

  const items: HomepageMenuItemSetting[] = [];
  const seen = new Set<HomepageMenuId>();
  for (const candidate of value.items) {
    if (!isRecord(candidate) || !isHomepageMenuId(candidate.id) || seen.has(candidate.id)) {
      continue;
    }
    seen.add(candidate.id);
    items.push({
      id: candidate.id,
      visible: readBoolean(candidate.visible, true),
    });
  }

  if (items.length === 0) {
    return createDefaultHomepageMenuSettings();
  }

  // A link the payload does not mention is new to this build; showing it keeps an upgrade from
  // silently removing navigation the deployment has always had.
  for (const id of HOMEPAGE_MENU_IDS) {
    if (!seen.has(id)) {
      items.push({ id, visible: true });
    }
  }

  // Re-order to catalog order: the header order is authored here, not in the stored document, so
  // a payload can never draw the menu in an order the product did not choose.
  const byId = new Map(items.map((entry) => [entry.id, entry]));
  return {
    version: HOMEPAGE_MENU_SETTINGS_VERSION,
    items: HOMEPAGE_MENU_IDS.map((id) => byId.get(id) ?? { id, visible: true }),
  };
}

/** Replaces one link's visibility without mutating the document. */
export function updateHomepageMenuItem(
  settings: HomepageMenuSettings,
  id: HomepageMenuId,
  visible: boolean,
): HomepageMenuSettings {
  return {
    ...settings,
    items: normalizeHomepageMenuSettings(settings).items.map((entry) => (
      entry.id === id ? { ...entry, visible } : entry
    )),
  };
}

export function isHomepageMenuItemVisible(value: unknown, id: HomepageMenuId): boolean {
  return normalizeHomepageMenuSettings(value).items.some((entry) => entry.id === id && entry.visible);
}

/**
 * The ids the public header draws, in header order.
 *
 * `unknown` rather than `HomepageMenuSettings` on purpose: the caller holds whatever the
 * site-runtime payload carried, and a hand-edited or older document must degrade to the shipped
 * menu instead of throwing while the page renders.
 */
export function getVisibleHomepageMenuItemIds(value: unknown): HomepageMenuId[] {
  return normalizeHomepageMenuSettings(value).items
    .filter((entry) => entry.visible)
    .map((entry) => entry.id);
}

/** Counts what the operator will actually see in the header. */
export function countHomepageMenuItems(settings: HomepageMenuSettings): {
  total: number;
  visible: number;
  hidden: number;
} {
  const normalized = normalizeHomepageMenuSettings(settings);
  const visible = normalized.items.filter((entry) => entry.visible).length;
  return {
    total: normalized.items.length,
    visible,
    hidden: normalized.items.length - visible,
  };
}

/** Whether the document stores a deliberate hide, i.e. anything worth writing at all. */
export function hasHiddenHomepageMenuItems(settings: HomepageMenuSettings): boolean {
  return normalizeHomepageMenuSettings(settings).items.some((entry) => !entry.visible);
}

/**
 * The wire document.
 *
 * A fully visible menu is indistinguishable from "never configured", and writing it would pin
 * every link the moment an operator saves an unrelated tab. The admin service therefore only
 * nests this document when {@link hasHiddenHomepageMenuItems} says something was actually hidden.
 */
export function toHomepageMenuSettingsPayload(settings: HomepageMenuSettings): HomepageMenuSettings {
  return normalizeHomepageMenuSettings(settings);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}
