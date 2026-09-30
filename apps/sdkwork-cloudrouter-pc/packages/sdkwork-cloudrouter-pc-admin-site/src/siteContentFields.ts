/**
 * The two operator-authored payloads on `/admin/site` that are documents rather than scalars.
 *
 * They are different kinds of thing, so they are modelled differently:
 *
 * - `homepage` is copy an operator writes by hand, so it gets a form model (`HomeContentForm`)
 *   whose shape mirrors the runtime reader in
 *   `sdkwork-cloudrouter-pc-home/src/content/home-content.ts`. `toHomeContentPayload` turns the
 *   form back into the nested document, and `site-content-authoring.test.ts` feeds that document
 *   through the *real* runtime reader and asserts every authored value survives — which is what
 *   stops the two shapes drifting apart.
 * - `downloads` stays a JSON document. The catalog carries per-action file names, release tags and
 *   platform names that a release job already computed; re-typing them into a console form would
 *   invite transcription errors, so the console validates and publishes the document instead.
 *
 * The authoring rules the two sides share:
 *
 * 1. **Blank means "publish the bundled copy".** An empty form serialises to `{}`, so a deployment
 *    whose operator never opened the page keeps rendering exactly what it shipped with.
 * 2. **A half-filled row is kept, not dropped.** The runtime skips an incomplete link or row at
 *    render time, so saving one is harmless; silently discarding it would be worse, because the
 *    operator would watch their typing disappear on save. The console warns instead, which is the
 *    same convention the follow-us rows already use.
 * 3. **Everything the console can author is something the runtime can draw.** The bounds below are
 *    the runtime's own, applied on read *and* on write, so a value in the form always renders.
 *
 * Dependency-free on purpose: the i18n and parity gates read this module directly, and importing
 * the form's service module would drag the SDK client graph into a source check.
 */

/** Longest accepted single-line override. Mirrors the runtime reader's own bound. */
export const HOME_TEXT_MAX_LENGTH = 4096;
/** Longest accepted label — a button caption, a stat caption, a list item. */
export const HOME_LABEL_MAX_LENGTH = 255;
/** Bound on operator-authored rows, so the console cannot author more than the runtime draws. */
export const HOME_MAX_COLLECTION_ROWS = 24;
/** Bound on one modality's provider list. */
export const HOME_MAX_LIST_ITEMS = 60;

/** Control characters that would corrupt layout if stored; the runtime strips them on render. */
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/gu;

/**
 * The homepage regions an operator can switch off.
 *
 * Read from a table rather than restated per surface: the console renders one row per entry and
 * walks the same list to build `sections`, so a region added here cannot end up switchable in one
 * place and unreadable in the other.
 */
export const HOME_SECTIONS = [
  {
    code: 'hero',
    labelKey: 'admin.siteSettings.homeSections.hero.label',
    descriptionKey: 'admin.siteSettings.homeSections.hero.description',
  },
  {
    code: 'modalities',
    labelKey: 'admin.siteSettings.homeSections.modalities.label',
    descriptionKey: 'admin.siteSettings.homeSections.modalities.description',
  },
  {
    code: 'features',
    labelKey: 'admin.siteSettings.homeSections.features.label',
    descriptionKey: 'admin.siteSettings.homeSections.features.description',
  },
  {
    code: 'models',
    labelKey: 'admin.siteSettings.homeSections.models.label',
    descriptionKey: 'admin.siteSettings.homeSections.models.description',
  },
  {
    code: 'download',
    labelKey: 'admin.siteSettings.homeSections.download.label',
    descriptionKey: 'admin.siteSettings.homeSections.download.description',
  },
  {
    code: 'cta',
    labelKey: 'admin.siteSettings.homeSections.cta.label',
    descriptionKey: 'admin.siteSettings.homeSections.cta.description',
  },
] as const satisfies ReadonlyArray<{
  code: HomeSectionCode;
  labelKey: string;
  descriptionKey: string;
}>;

export type HomeSectionCode = 'hero' | 'modalities' | 'features' | 'models' | 'download' | 'cta';

export type HomeSectionVisibility = Record<HomeSectionCode, boolean>;

/** A button: both halves or nothing. The runtime drops a half-link at render. */
export interface HomeLinkFields {
  href: string;
  label: string;
}

export interface HomeStatFields {
  label: string;
  value: string;
}

export interface HomeFeatureFields {
  description: string;
  icon: string;
  title: string;
}

export interface HomeModalityFields {
  icon: string;
  /** One provider or feature name per line, which is how the shipped catalog reads. */
  items: string;
  title: string;
}

/**
 * The homepage editor's state.
 *
 * Flat and string-typed rather than a mirror of the nested document: a control edits one value,
 * and the "unsaved changes" counter compares whole fields. `toHomeContentPayload` is the only
 * place that knows how the flat form nests back into the document, so there is one mapping to
 * keep honest instead of one per control.
 */
export interface HomeContentForm {
  ctaBadge: string;
  ctaPrimaryCta: HomeLinkFields;
  ctaSecondaryCta: HomeLinkFields;
  ctaSubtitle: string;
  ctaTitle: string;
  downloadSubtitle: string;
  downloadTitle: string;
  featureBadge: string;
  featureItems: HomeFeatureFields[];
  featureSubtitle: string;
  featureTitle: string;
  heroBadge: string;
  heroPrimaryCta: HomeLinkFields;
  heroSecondaryCta: HomeLinkFields;
  heroStats: HomeStatFields[];
  heroSubtitle: string;
  heroTitleHighlight: string;
  heroTitleLead: string;
  modalityBadge: string;
  modalityItems: HomeModalityFields[];
  modalitySubtitle: string;
  modalityTitleHighlight: string;
  modalityTitleLead: string;
  /** The software name this deployment publishes under; defaults to the site name. */
  productName: string;
  sections: HomeSectionVisibility;
  tagline: string;
  version: string;
}

/** Every region renders unless an operator hides it — hiding is the opt-in direction. */
const DEFAULT_HOME_SECTIONS: HomeSectionVisibility = {
  cta: true,
  download: true,
  features: true,
  hero: true,
  models: true,
  modalities: true,
};

function emptyLink(): HomeLinkFields {
  return { href: '', label: '' };
}

/**
 * A fresh, empty editor state.
 *
 * A factory rather than a shared constant: the page hands these objects to React state, and one
 * mutable default shared by every mount is exactly how an edit leaks into the next load.
 */
export function createDefaultHomeContentForm(): HomeContentForm {
  return {
    ctaBadge: '',
    ctaPrimaryCta: emptyLink(),
    ctaSecondaryCta: emptyLink(),
    ctaSubtitle: '',
    ctaTitle: '',
    downloadSubtitle: '',
    downloadTitle: '',
    featureBadge: '',
    featureItems: [],
    featureSubtitle: '',
    featureTitle: '',
    heroBadge: '',
    heroPrimaryCta: emptyLink(),
    heroSecondaryCta: emptyLink(),
    heroStats: [],
    heroSubtitle: '',
    heroTitleHighlight: '',
    heroTitleLead: '',
    modalityBadge: '',
    modalityItems: [],
    modalitySubtitle: '',
    modalityTitleHighlight: '',
    modalityTitleLead: '',
    productName: '',
    sections: { ...DEFAULT_HOME_SECTIONS },
    tagline: '',
    version: '',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readText(value: unknown, maxLength = HOME_TEXT_MAX_LENGTH): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.replace(CONTROL_CHARACTERS, '').trim().slice(0, maxLength);
}

/** Writes a value the runtime will render verbatim, bounded by the runtime's own limits. */
function writeText(value: string, maxLength = HOME_TEXT_MAX_LENGTH): string | undefined {
  const trimmed = value.replace(CONTROL_CHARACTERS, '').trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : undefined;
}

function readRows<T>(
  value: unknown,
  limit: number,
  readRow: (row: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.slice(0, limit).filter(isRecord).map(readRow);
}

function readLink(value: unknown): HomeLinkFields {
  if (!isRecord(value)) {
    return emptyLink();
  }
  return {
    href: readText(value.href, HOME_TEXT_MAX_LENGTH),
    label: readText(value.label, HOME_LABEL_MAX_LENGTH),
  };
}

/**
 * Reads the `homepage` document published by `/admin/site` into editor state.
 *
 * Reads defensively and drops nothing it cannot understand: this runs against whatever an older
 * or newer console build stored, and a malformed payload must leave the editor empty — falling
 * back to the bundled copy — rather than throw while the page is loading.
 */
export function readHomeContentForm(value: unknown): HomeContentForm {
  const form = createDefaultHomeContentForm();
  if (!isRecord(value)) {
    return form;
  }

  const headline = (source: unknown): Record<string, string> => ({
    badge: isRecord(source) ? readText(source.badge, HOME_LABEL_MAX_LENGTH) : '',
    subtitle: isRecord(source) ? readText(source.subtitle) : '',
    title: isRecord(source) ? readText(source.title, HOME_LABEL_MAX_LENGTH) : '',
    titleHighlight: isRecord(source) ? readText(source.titleHighlight, HOME_LABEL_MAX_LENGTH) : '',
    titleLead: isRecord(source) ? readText(source.titleLead, HOME_LABEL_MAX_LENGTH) : '',
  });

  const hero = headline(value.hero);
  const modalities = headline(value.modalities);
  const features = headline(value.features);
  const cta = headline(value.cta);
  const download = headline(value.download);

  form.productName = readText(value.productName, HOME_LABEL_MAX_LENGTH);
  form.tagline = readText(value.tagline);
  form.version = readText(value.version, HOME_LABEL_MAX_LENGTH);

  form.heroBadge = hero.badge;
  form.heroSubtitle = hero.subtitle;
  form.heroTitleHighlight = hero.titleHighlight;
  form.heroTitleLead = hero.titleLead;
  form.heroPrimaryCta = isRecord(value.hero) ? readLink(value.hero.primaryCta) : emptyLink();
  form.heroSecondaryCta = isRecord(value.hero) ? readLink(value.hero.secondaryCta) : emptyLink();
  form.heroStats = isRecord(value.hero)
    ? readRows(value.hero.stats, HOME_MAX_COLLECTION_ROWS, (row) => ({
        label: readText(row.label, HOME_LABEL_MAX_LENGTH),
        value: readText(row.value, HOME_LABEL_MAX_LENGTH),
      }))
    : [];

  form.modalityBadge = modalities.badge;
  form.modalitySubtitle = modalities.subtitle;
  form.modalityTitleHighlight = modalities.titleHighlight;
  form.modalityTitleLead = modalities.titleLead;
  form.modalityItems = isRecord(value.modalities)
    ? readRows(value.modalities.items, HOME_MAX_COLLECTION_ROWS, (row) => ({
        icon: readText(row.icon, HOME_LABEL_MAX_LENGTH),
        items: readStringLines(row.items),
        title: readText(row.title, HOME_LABEL_MAX_LENGTH),
      }))
    : [];

  form.featureBadge = features.badge;
  form.featureSubtitle = features.subtitle;
  form.featureTitle = features.title;
  form.featureItems = isRecord(value.features)
    ? readRows(value.features.items, HOME_MAX_COLLECTION_ROWS, (row) => ({
        description: readText(row.description),
        icon: readText(row.icon, HOME_LABEL_MAX_LENGTH),
        title: readText(row.title, HOME_LABEL_MAX_LENGTH),
      }))
    : [];

  form.downloadSubtitle = download.subtitle;
  form.downloadTitle = download.title;

  form.ctaBadge = cta.badge;
  form.ctaSubtitle = cta.subtitle;
  form.ctaTitle = cta.title;
  form.ctaPrimaryCta = isRecord(value.cta) ? readLink(value.cta.primaryCta) : emptyLink();
  form.ctaSecondaryCta = isRecord(value.cta) ? readLink(value.cta.secondaryCta) : emptyLink();

  if (isRecord(value.sections)) {
    for (const section of HOME_SECTIONS) {
      const flag = value.sections[section.code];
      // An absent flag keeps the region, matching the runtime's own default.
      form.sections[section.code] = typeof flag === 'boolean' ? flag : true;
    }
  }

  return form;
}

/** Reads a provider list back into the one-name-per-line field the console edits. */
function readStringLines(value: unknown): string {
  if (!Array.isArray(value)) {
    return '';
  }
  return value
    .slice(0, HOME_MAX_LIST_ITEMS)
    .map((entry) => {
      if (typeof entry === 'string') {
        return readText(entry, HOME_LABEL_MAX_LENGTH);
      }
      return isRecord(entry) ? readText(entry.label, HOME_LABEL_MAX_LENGTH) : '';
    })
    .filter((entry) => entry.length > 0)
    .join('\n');
}

/** The same list written back as the string array the runtime renders. */
function writeStringLines(value: string): string[] | undefined {
  const items = value
    .split('\n')
    .map((line) => writeText(line, HOME_LABEL_MAX_LENGTH))
    .filter((line): line is string => line !== undefined)
    .slice(0, HOME_MAX_LIST_ITEMS);
  return items.length > 0 ? items : undefined;
}

function writeLink(value: HomeLinkFields): Record<string, string> | undefined {
  const href = writeText(value.href);
  const label = writeText(value.label, HOME_LABEL_MAX_LENGTH);
  // A half-written link is kept so the operator can finish it; the runtime's own reader drops a
  // link that is missing either half, so nothing unusable reaches the landing page.
  return href === undefined && label === undefined
    ? undefined
    : { ...(href === undefined ? {} : { href }), ...(label === undefined ? {} : { label }) };
}

/** Builds a section object from the entries that carry something, or nothing at all. */
function writeSection(entries: Record<string, unknown>): Record<string, unknown> | undefined {
  const section: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value !== undefined) {
      section[key] = value;
    }
  }
  return Object.keys(section).length > 0 ? section : undefined;
}

/**
 * Turns editor state back into the `homepage` document.
 *
 * An untouched form serialises to `{}`: the backend stores what it is given and the runtime treats
 * an empty document as "publish the bundled copy", so an operator who opened the page and saved
 * without typing anything must not silently pin every headline to the console's own wording.
 */
export function toHomeContentPayload(form: HomeContentForm): Record<string, unknown> {
  const payload: Record<string, unknown> = {};

  const productName = writeText(form.productName, HOME_LABEL_MAX_LENGTH);
  const tagline = writeText(form.tagline);
  const version = writeText(form.version, HOME_LABEL_MAX_LENGTH);
  if (productName !== undefined) payload.productName = productName;
  if (tagline !== undefined) payload.tagline = tagline;
  if (version !== undefined) payload.version = version;

  const heroEntries: Record<string, unknown> = {
    badge: writeText(form.heroBadge, HOME_LABEL_MAX_LENGTH),
    primaryCta: writeLink(form.heroPrimaryCta),
    secondaryCta: writeLink(form.heroSecondaryCta),
    stats: writeRows(form.heroStats, (row) => {
      const value = writeText(row.value, HOME_LABEL_MAX_LENGTH);
      const label = writeText(row.label, HOME_LABEL_MAX_LENGTH);
      return value === undefined && label === undefined
        ? undefined
        : { ...(label === undefined ? {} : { label }), ...(value === undefined ? {} : { value }) };
    }),
    subtitle: writeText(form.heroSubtitle),
    titleHighlight: writeText(form.heroTitleHighlight, HOME_LABEL_MAX_LENGTH),
    titleLead: writeText(form.heroTitleLead, HOME_LABEL_MAX_LENGTH),
  };
  const hero = writeSection(heroEntries);
  if (hero) payload.hero = hero;

  const modalityEntries: Record<string, unknown> = {
    badge: writeText(form.modalityBadge, HOME_LABEL_MAX_LENGTH),
    items: writeRows(form.modalityItems, (row) => {
      const title = writeText(row.title, HOME_LABEL_MAX_LENGTH);
      const items = writeStringLines(row.items);
      const icon = writeText(row.icon, HOME_LABEL_MAX_LENGTH);
      return title === undefined && items === undefined
        ? undefined
        : {
            ...(icon === undefined ? {} : { icon }),
            ...(items === undefined ? {} : { items }),
            ...(title === undefined ? {} : { title }),
          };
    }),
    subtitle: writeText(form.modalitySubtitle),
    titleHighlight: writeText(form.modalityTitleHighlight, HOME_LABEL_MAX_LENGTH),
    titleLead: writeText(form.modalityTitleLead, HOME_LABEL_MAX_LENGTH),
  };
  const modalities = writeSection(modalityEntries);
  if (modalities) payload.modalities = modalities;

  const featureEntries: Record<string, unknown> = {
    badge: writeText(form.featureBadge, HOME_LABEL_MAX_LENGTH),
    items: writeRows(form.featureItems, (row) => {
      const title = writeText(row.title, HOME_LABEL_MAX_LENGTH);
      const description = writeText(row.description);
      const icon = writeText(row.icon, HOME_LABEL_MAX_LENGTH);
      return title === undefined && description === undefined
        ? undefined
        : {
            ...(description === undefined ? {} : { description }),
            ...(icon === undefined ? {} : { icon }),
            ...(title === undefined ? {} : { title }),
          };
    }),
    subtitle: writeText(form.featureSubtitle),
    title: writeText(form.featureTitle, HOME_LABEL_MAX_LENGTH),
  };
  const features = writeSection(featureEntries);
  if (features) payload.features = features;

  const download = writeSection({
    subtitle: writeText(form.downloadSubtitle),
    title: writeText(form.downloadTitle, HOME_LABEL_MAX_LENGTH),
  });
  if (download) payload.download = download;

  const cta = writeSection({
    badge: writeText(form.ctaBadge, HOME_LABEL_MAX_LENGTH),
    primaryCta: writeLink(form.ctaPrimaryCta),
    secondaryCta: writeLink(form.ctaSecondaryCta),
    subtitle: writeText(form.ctaSubtitle),
    title: writeText(form.ctaTitle, HOME_LABEL_MAX_LENGTH),
  });
  if (cta) payload.cta = cta;

  // Only a deviation from "everything renders" is worth storing: writing all six flags as `true`
  // would make an untouched deployment's payload look authored.
  const hidden = HOME_SECTIONS.filter((section) => !form.sections[section.code]);
  if (hidden.length > 0) {
    payload.sections = { ...form.sections };
  }

  return payload;
}

/** Flattens rows, dropping the ones the operator left entirely blank. */
function writeRows<T>(
  rows: readonly T[],
  writeRow: (row: T) => Record<string, unknown> | undefined,
): Record<string, unknown>[] | undefined {
  const written = rows
    .slice(0, HOME_MAX_COLLECTION_ROWS)
    .map(writeRow)
    .filter((row): row is Record<string, unknown> => row !== undefined);
  return written.length > 0 ? written : undefined;
}

/**
 * Stable codes for the rows the runtime will skip.
 *
 * Codes rather than sentences so the console can translate them, and so a test can assert which
 * ones a half-filled form produces without matching prose.
 */
export type HomeContentWarningCode =
  | 'cta.primaryCta'
  | 'cta.secondaryCta'
  | 'features.items'
  | 'hero.primaryCta'
  | 'hero.secondaryCta'
  | 'hero.stats'
  | 'modalities.items';

/** Names every entry the runtime would drop, so the console can say so before it is saved. */
export function findIncompleteHomeContent(form: HomeContentForm): HomeContentWarningCode[] {
  const warnings: HomeContentWarningCode[] = [];

  const partialLink = (link: HomeLinkFields): boolean =>
    (link.label.trim().length === 0) !== (link.href.trim().length === 0);

  if (partialLink(form.heroPrimaryCta)) warnings.push('hero.primaryCta');
  if (partialLink(form.heroSecondaryCta)) warnings.push('hero.secondaryCta');
  if (partialLink(form.ctaPrimaryCta)) warnings.push('cta.primaryCta');
  if (partialLink(form.ctaSecondaryCta)) warnings.push('cta.secondaryCta');

  for (const row of form.heroStats) {
    const filled = row.value.trim().length > 0 || row.label.trim().length > 0;
    const complete = row.value.trim().length > 0 && row.label.trim().length > 0;
    if (filled && !complete) {
      warnings.push('hero.stats');
      break;
    }
  }
  for (const row of form.featureItems) {
    const filled = row.title.trim().length > 0 || row.description.trim().length > 0;
    const complete = row.title.trim().length > 0 && row.description.trim().length > 0;
    if (filled && !complete) {
      warnings.push('features.items');
      break;
    }
  }
  for (const row of form.modalityItems) {
    const filled = row.title.trim().length > 0 || row.items.trim().length > 0;
    const complete = row.title.trim().length > 0 && row.items.trim().length > 0;
    if (filled && !complete) {
      warnings.push('modalities.items');
      break;
    }
  }

  return warnings;
}

/**
 * The catalog generation the homepage runtime renders.
 *
 * A mirror of the runtime's own constant rather than an import: `cloudrouter-pc-home` is a landing
 * surface and this console package has no business depending on it. `site-content-authoring.test.ts`
 * asserts the two are the same string, so the mirror cannot rot unnoticed.
 */
export const DOWNLOAD_CATALOG_SCHEMA_VERSION = '2026-05-18.sdkwork-download-catalog.v1';

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/** What the homepage would draw from a published catalog. */
export interface DownloadCatalogSummary {
  actions: number;
  cards: number;
  productName: string;
  version: string;
}

export interface DownloadCatalogCheck {
  /** Whether the document can be published. An empty document is valid: it means "not published". */
  ok: boolean;
  /** Why it cannot be published, in the order the checks ran. Empty when `ok`. */
  problems: string[];
  /** Filled only when `ok` and the document is non-empty. */
  summary?: DownloadCatalogSummary;
}

/**
 * Reads the stored catalog back into the text the console edits.
 *
 * Serialised the same way every time — including after a save, where the value comes back from the
 * server — so "unsaved changes" compares canonical text against canonical text rather than
 * flagging a reformatted payload as an edit.
 */
export function readDownloadCatalogText(value: unknown): string {
  if (!isRecord(value) || Object.keys(value).length === 0) {
    return '';
  }
  return `${JSON.stringify(value, null, 2)}\n`;
}

/**
 * Checks a catalog the way the homepage will read it.
 *
 * The rules are the runtime envelope's, deliberately not a second opinion: a document this accepts
 * is one `readRuntimeDownloadCatalog` accepts, so the console cannot publish a catalog the landing
 * page silently ignores. The deeper per-card normalisation stays with the runtime — the console
 * reports what the envelope proves and nothing more, rather than claiming a validation it did not
 * perform.
 */
export function checkDownloadCatalog(text: string): DownloadCatalogCheck {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: true, problems: [] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    return { ok: false, problems: [`not valid JSON: ${(error as Error).message}`] };
  }

  if (!isRecord(parsed)) {
    return { ok: false, problems: ['the catalog must be a JSON object'] };
  }

  const problems: string[] = [];
  const declaredVersion = stringValue(parsed.schemaVersion)?.trim();
  if (declaredVersion && declaredVersion !== DOWNLOAD_CATALOG_SCHEMA_VERSION) {
    problems.push(
      `schemaVersion must be ${DOWNLOAD_CATALOG_SCHEMA_VERSION}, found ${declaredVersion}`,
    );
  }

  const product = isRecord(parsed.product) ? parsed.product : undefined;
  const productId = product ? stringValue(product.id)?.trim() : undefined;
  const productName = product ? stringValue(product.name)?.trim() : undefined;
  const productVersion = product ? stringValue(product.version)?.trim() : undefined;
  if (!productId) problems.push('product.id is required');
  if (!productName) problems.push('product.name is required');
  if (!productVersion) problems.push('product.version is required');

  const cards = Array.isArray(parsed.cards) ? parsed.cards : [];
  if (cards.length === 0) {
    problems.push('cards must contain at least one entry');
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  return {
    ok: true,
    problems: [],
    summary: {
      actions: cards.reduce(
        (total, card) => total + (isRecord(card) && Array.isArray(card.actions) ? card.actions.length : 0),
        0,
      ),
      cards: cards.length,
      productName: productName ?? '',
      version: productVersion ?? '',
    },
  };
}

/**
 * Builds the `downloads` half of the update payload.
 *
 * Throws rather than sending a mutilated document: the console disables saving while the text is
 * unparseable, so reaching this with bad input means a caller bypassed the page, and quietly
 * clearing the catalog would be the worst available outcome.
 */
export function toDownloadCatalogPayload(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return {};
  }
  const parsed: unknown = JSON.parse(trimmed);
  if (!isRecord(parsed)) {
    throw new Error('The download catalog must be a JSON object.');
  }
  return parsed;
}
