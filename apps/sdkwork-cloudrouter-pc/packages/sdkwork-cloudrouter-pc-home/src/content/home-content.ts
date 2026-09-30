import { interpolateBrandTokens, resolveBrandText, type BrandTokenVariables } from './brand-tokens.ts';
import {
  readRuntimeDownloadCatalog,
  readBundledCloudRouterVersion,
} from '../downloads/cloudRouterDownloads.ts';

/**
 * The homepage is operator content, not shipped copy.
 *
 * Everything rendered on `/` resolves through this module in one of two modes:
 *
 * - **override** — `/admin/site` published a value, and it is authoritative. Rendered verbatim
 *   (after brand-token substitution), *not* passed through i18n: an operator who typed a headline
 *   expects to see that headline, not the shipped translation of it.
 * - **default** — nothing was published, so the bundled i18n copy renders. This is what keeps a
 *   deployment that never opened the console rendering exactly what it shipped with.
 *
 * The model is intentionally shaped like the console form: optional scalars, and arrays that
 * *replace* the default list when present. Nothing here is required, so a partially configured
 * homepage degrades field by field rather than wholesale.
 */

/** Longest accepted single-line override. Mirrors the console's field validation. */
const MAX_TEXT_LENGTH = 4096;
/** Longest accepted label (button, stat caption, list item). */
const MAX_LABEL_LENGTH = 255;
/** Bound on operator-authored collections, so a bad payload cannot stall the render. */
const MAX_COLLECTION_ITEMS = 24;
/** Bound on a single modality's provider list. */
const MAX_LIST_ITEMS = 60;

/** Control characters that would corrupt layout if echoed into the DOM. */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu;

export interface HomeLinkOverride {
  label: string;
  href: string;
}

export interface HomeStatOverride {
  id: string;
  value: string;
  label: string;
}

export interface HomeFeatureOverride {
  id: string;
  icon?: string;
  title: string;
  description: string;
}

export interface HomeModalityOverride {
  id: string;
  icon?: string;
  title: string;
  items: string[];
}

export type HomeSectionCode =
  | 'hero'
  | 'modalities'
  | 'features'
  | 'models'
  | 'download'
  | 'cta';

export type HomeSectionVisibility = Record<HomeSectionCode, boolean>;

export interface HomeContentOverride {
  /** The software name the product is published under — the thing a re-brand changes first. */
  productName?: string;
  tagline?: string;
  /** Release version shown in the hero badge. Falls back to the download catalog's version. */
  version?: string;
  hero?: {
    badge?: string;
    titleLead?: string;
    titleHighlight?: string;
    subtitle?: string;
    primaryCta?: HomeLinkOverride;
    secondaryCta?: HomeLinkOverride;
    stats?: HomeStatOverride[];
  };
  modalities?: {
    badge?: string;
    titleLead?: string;
    titleHighlight?: string;
    subtitle?: string;
    items?: HomeModalityOverride[];
  };
  features?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    items?: HomeFeatureOverride[];
  };
  download?: {
    title?: string;
    subtitle?: string;
  };
  cta?: {
    badge?: string;
    title?: string;
    subtitle?: string;
    primaryCta?: HomeLinkOverride;
    secondaryCta?: HomeLinkOverride;
  };
  sections?: Partial<HomeSectionVisibility>;
}

/** Every section renders unless an operator hides it — hiding is the opt-in direction. */
export const DEFAULT_HOME_SECTIONS: Readonly<HomeSectionVisibility> = {
  cta: true,
  download: true,
  features: true,
  hero: true,
  modalities: true,
  models: true,
};

const HOME_SECTION_CODES: readonly HomeSectionCode[] = [
  'hero',
  'modalities',
  'features',
  'models',
  'download',
  'cta',
];

/** Nothing published: every surface falls back to its bundled default. */
export const EMPTY_HOME_CONTENT: Readonly<HomeContentOverride> = {};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readText(value: unknown, maxLength = MAX_TEXT_LENGTH): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.replace(CONTROL_CHARACTERS, '').trim();
  return trimmed.length > 0 ? trimmed.slice(0, maxLength) : undefined;
}

function readLabel(value: unknown): string | undefined {
  return readText(value, MAX_LABEL_LENGTH);
}

/**
 * Accepts only navigable targets.
 *
 * The homepage renders these as router links or anchors, so a `javascript:` payload here would be a
 * stored-XSS sink reachable purely from the console. Relative paths are restricted to a single
 * leading slash, and absolute URLs to http(s); everything else is dropped, which falls the caller
 * back to the bundled default rather than to a dead or hostile link.
 */
function readHref(value: unknown): string | undefined {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (raw.length === 0) {
    return undefined;
  }
  if (raw.startsWith('/')) {
    return raw.startsWith('//') || raw.includes('\\') ? undefined : raw.slice(0, MAX_TEXT_LENGTH);
  }
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? raw.slice(0, MAX_TEXT_LENGTH)
      : undefined;
  } catch {
    return undefined;
  }
}

function readLink(value: unknown): HomeLinkOverride | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const label = readLabel(value.label);
  const href = readHref(value.href);
  // Half a link is worse than none: a button with a label and no target reads as broken, and a
  // target with no label renders an empty control.
  return label && href ? { href, label } : undefined;
}

function readCollection<T>(
  value: unknown,
  limit: number,
  readItem: (item: Record<string, unknown>, index: number) => T | undefined,
): T[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value
    .slice(0, limit)
    .map((item, index) => (isRecord(item) ? readItem(item, index) : undefined))
    .filter((item): item is T => item !== undefined);
  return items.length > 0 ? items : undefined;
}

function readId(value: unknown, index: number, prefix: string): string {
  return readLabel(value) ?? `${prefix}-${index + 1}`;
}

function readStats(value: unknown): HomeStatOverride[] | undefined {
  return readCollection(value, MAX_COLLECTION_ITEMS, (item, index) => {
    const value_ = readLabel(item.value);
    const label = readLabel(item.label);
    // A stat without both halves renders a number with no caption, or vice versa.
    return value_ && label ? { id: readId(item.id, index, 'stat'), label, value: value_ } : undefined;
  });
}

function readFeatures(value: unknown): HomeFeatureOverride[] | undefined {
  return readCollection(value, MAX_COLLECTION_ITEMS, (item, index) => {
    const title = readLabel(item.title);
    const description = readText(item.description);
    if (!title || !description) {
      return undefined;
    }
    const icon = readLabel(item.icon);
    return { description, id: readId(item.id, index, 'feature'), ...(icon ? { icon } : {}), title };
  });
}

/**
 * Reads a provider/feature name list.
 *
 * Accepts both shapes an operator might author — plain strings (`["OpenAI GPT-4o", …]`, what the
 * shipped catalog uses) and `{ label }` records (easier to extend later without a migration). Both
 * collapse to the same string list, so the renderer only ever sees one shape.
 */
function readStringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value
    .slice(0, MAX_LIST_ITEMS)
    .map((entry) => readLabel(typeof entry === 'string' ? entry : isRecord(entry) ? entry.label : undefined))
    .filter((entry): entry is string => entry !== undefined);
  return items.length > 0 ? items : undefined;
}

function readModalities(value: unknown): HomeModalityOverride[] | undefined {
  return readCollection(value, MAX_COLLECTION_ITEMS, (item, index) => {
    const title = readLabel(item.title);
    const items = readStringList(item.items);
    if (!title || !items) {
      return undefined;
    }
    const icon = readLabel(item.icon);
    return { id: readId(item.id, index, 'modality'), items, ...(icon ? { icon } : {}), title };
  });
}

/** The headline fields every section shares, read once and assigned per section below. */
interface HomeHeadline {
  badge?: string;
  subtitle?: string;
  title?: string;
  titleHighlight?: string;
  titleLead?: string;
}

function readHeadline(value: unknown): HomeHeadline | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const result: HomeHeadline = {};
  const badge = readText(value.badge);
  const title = readText(value.title);
  const titleLead = readText(value.titleLead);
  const titleHighlight = readText(value.titleHighlight);
  const subtitle = readText(value.subtitle);
  if (badge) result.badge = badge;
  if (title) result.title = title;
  if (titleLead) result.titleLead = titleLead;
  if (titleHighlight) result.titleHighlight = titleHighlight;
  if (subtitle) result.subtitle = subtitle;
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Builds one section object from only the headline fields that section actually renders.
 *
 * Copying the whole headline would leak `titleLead` onto a section whose type has no such field —
 * harmless at runtime, but it makes the published shape depend on what the operator happened to
 * type, which is exactly the kind of drift the contract check exists to catch.
 */
function pickHeadline<T extends HomeHeadline>(headline: HomeHeadline | undefined, keys: readonly (keyof T)[]): T | undefined {
  if (!headline) {
    return undefined;
  }
  const picked: Record<string, string> = {};
  for (const key of keys) {
    const value = headline[key as keyof HomeHeadline];
    if (typeof value === 'string') {
      picked[key as string] = value;
    }
  }
  return Object.keys(picked).length > 0 ? (picked as unknown as T) : undefined;
}

function readHero(value: unknown): HomeContentOverride['hero'] {
  if (!isRecord(value)) {
    return undefined;
  }
  const headline = pickHeadline<NonNullable<HomeContentOverride['hero']>>(readHeadline(value), [
    'badge',
    'subtitle',
    'titleHighlight',
    'titleLead',
  ]);
  const primaryCta = readLink(value.primaryCta);
  const secondaryCta = readLink(value.secondaryCta);
  const stats = readStats(value.stats);
  const hero: NonNullable<HomeContentOverride['hero']> = {
    ...(headline ?? {}),
    ...(primaryCta ? { primaryCta } : {}),
    ...(secondaryCta ? { secondaryCta } : {}),
    ...(stats ? { stats } : {}),
  };
  return Object.keys(hero).length > 0 ? hero : undefined;
}

function readCta(value: unknown): HomeContentOverride['cta'] {
  if (!isRecord(value)) {
    return undefined;
  }
  const headline = pickHeadline<NonNullable<HomeContentOverride['cta']>>(readHeadline(value), [
    'badge',
    'subtitle',
    'title',
  ]);
  const primaryCta = readLink(value.primaryCta);
  const secondaryCta = readLink(value.secondaryCta);
  const cta: NonNullable<HomeContentOverride['cta']> = {
    ...(headline ?? {}),
    ...(primaryCta ? { primaryCta } : {}),
    ...(secondaryCta ? { secondaryCta } : {}),
  };
  return Object.keys(cta).length > 0 ? cta : undefined;
}

function readSections(value: unknown): Partial<HomeSectionVisibility> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const sections: Partial<HomeSectionVisibility> = {};
  for (const code of HOME_SECTION_CODES) {
    const flag = value[code];
    if (typeof flag === 'boolean') {
      sections[code] = flag;
    }
  }
  return Object.keys(sections).length > 0 ? sections : undefined;
}

/**
 * Normalises the `homepage` payload published by `/admin/site`.
 *
 * Reads defensively and drops anything malformed rather than throwing: this runs on the critical
 * path of the landing page, and a payload from an older or newer console build must degrade to the
 * shipped copy instead of blanking the page.
 */
export function readHomeContent(value: unknown): HomeContentOverride {
  if (!isRecord(value)) {
    return {};
  }
  const content: HomeContentOverride = {};
  const productName = readLabel(value.productName);
  const tagline = readText(value.tagline);
  const version = readLabel(value.version);
  const hero = readHero(value.hero);
  const cta = readCta(value.cta);
  const sections = readSections(value.sections);

  const featureItems = isRecord(value.features) ? readFeatures(value.features.items) : undefined;
  const features = pickHeadline<NonNullable<HomeContentOverride['features']>>(
    readHeadline(value.features),
    ['badge', 'subtitle', 'title'],
  );
  const modalityHeadline = pickHeadline<NonNullable<HomeContentOverride['modalities']>>(
    readHeadline(value.modalities),
    ['badge', 'subtitle', 'titleHighlight', 'titleLead'],
  );
  const modalityItems = isRecord(value.modalities) ? readModalities(value.modalities.items) : undefined;
  const downloadHeadline = pickHeadline<NonNullable<HomeContentOverride['download']>>(
    readHeadline(value.download),
    ['subtitle', 'title'],
  );

  if (productName) content.productName = productName;
  if (tagline) content.tagline = tagline;
  if (version) content.version = version;
  if (hero) content.hero = hero;
  if (features || featureItems) {
    content.features = { ...(features ?? {}), ...(featureItems ? { items: featureItems } : {}) };
  }
  if (modalityHeadline || modalityItems) {
    content.modalities = {
      ...(modalityHeadline ?? {}),
      ...(modalityItems ? { items: modalityItems } : {}),
    };
  }
  if (downloadHeadline) content.download = downloadHeadline;
  if (cta) content.cta = cta;
  if (sections) content.sections = sections;
  return content;
}

/** Effective section visibility: an absent or malformed flag keeps the section. */
export function resolveHomeSections(
  override: Partial<HomeSectionVisibility> | undefined,
): HomeSectionVisibility {
  const sections = { ...DEFAULT_HOME_SECTIONS };
  if (override) {
    for (const code of HOME_SECTION_CODES) {
      const flag = override[code];
      if (typeof flag === 'boolean') {
        sections[code] = flag;
      }
    }
  }
  return sections;
}

/** What every homepage surface resolves its copy and data through. */
export interface HomeContentRuntime {
  content: HomeContentOverride;
  sections: HomeSectionVisibility;
  /** Brand tokens for `{{...}}` substitution, and for forwarding into i18next. */
  variables: BrandTokenVariables;
  /** The software name in force: operator override, else the site name. */
  productName: string;
  /** Release version in force: operator override, else the download catalog's version. */
  version: string;
  /**
   * The operator-authored download catalog, or `undefined` when none was published.
   *
   * `undefined` is meaningful — it is the signal to keep using the catalog checked into the
   * repository, so an unconfigured deployment keeps the downloads it shipped with.
   */
  downloadCatalog: unknown;
  /** Resolves one copy field: override wins, else the bundled default, then brand tokens. */
  text(override: string | undefined, fallback: string): string;
}

export interface HomeContentSource {
  siteName: string;
  homepage?: unknown;
  downloads?: unknown;
}

/**
 * Builds the resolution context from the site-settings runtime payload.
 *
 * Deliberately free of React and i18n so the fallback rules can be exercised directly, and so the
 * same function can drive a server-rendered or test harness rendering.
 */
export function createHomeContentRuntime(source: HomeContentSource): HomeContentRuntime {
  const content = readHomeContent(source.homepage);
  const siteName = source.siteName.trim();
  const productName = content.productName ?? (siteName.length > 0 ? siteName : 'Cloud Router');
  const downloadCatalog = readRuntimeDownloadCatalog(source.downloads);
  const version = content.version
    ?? readDownloadCatalogVersion(downloadCatalog)
    ?? readBundledCloudRouterVersion();
  const variables: BrandTokenVariables = {
    productName,
    siteName: siteName.length > 0 ? siteName : productName,
    version,
  };

  return {
    content,
    downloadCatalog,
    productName,
    sections: resolveHomeSections(content.sections),
    text: (override, fallback) => resolveBrandText(override, fallback, variables),
    variables,
    version,
  };
}

function readDownloadCatalogVersion(catalog: unknown): string | undefined {
  if (!isRecord(catalog) || !isRecord(catalog.product)) {
    return undefined;
  }
  const version = catalog.product.version;
  return typeof version === 'string' && version.trim().length > 0 ? version.trim() : undefined;
}

/** Exposed for the console's preview path: substitute tokens into arbitrary authored copy. */
export function renderHomeText(template: string, variables: BrandTokenVariables): string {
  return interpolateBrandTokens(template, variables);
}
