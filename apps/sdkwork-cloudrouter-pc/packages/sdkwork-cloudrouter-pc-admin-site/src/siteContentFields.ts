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

/**
 * The download catalog as a form model.
 *
 * The catalog stays a JSON document at rest — the release pipeline writes one, and the JSON
 * editor keeps accepting it — but an operator maintaining a package by hand should not have to
 * edit a 260-line document to swap one installer URL. This model mirrors the runtime reader in
 * `sdkwork-cloudrouter-pc-home/src/downloads/cloudRouterDownloads.ts` the same way
 * `HomeContentForm` mirrors `readHomeContent`: the shapes are written down twice and
 * `site-content-authoring.test.ts` feeds the console's output through the *real* runtime reader
 * to keep the two copies honest.
 *
 * Fields the editor does not model (per-action `ariaLabel`, `ctaLabel`, `external`, `sources`,
 * `kind`, and anything a newer console build adds) are carried in `extra` verbatim, so opening a
 * pipeline-produced catalog in the structured editor and saving it must not silently rewrite it.
 */
export const DOWNLOAD_MAX_CARDS = 12;
/** Bound on one card's platform rows, matching the largest shipped card. */
export const DOWNLOAD_MAX_ACTIONS_PER_CARD = 24;

export type DownloadCatalogPlatform =
  | 'android'
  | 'docker'
  | 'generic'
  | 'harmonyos'
  | 'helm'
  | 'ios'
  | 'linux'
  | 'macos'
  | 'windows';

export type DownloadCatalogTargetKind =
  | 'container'
  | 'desktop'
  | 'documentation'
  | 'mobile'
  | 'package'
  | 'server';

export type DownloadCatalogCardIcon = 'desktop' | 'download' | 'mobile' | 'server' | 'terminal';

export type DownloadCatalogCardTone = 'brand' | 'mobile' | 'neutral' | 'server';

export type DownloadCatalogPrimaryStrategy = 'detected-platform' | 'first-available';

export const DOWNLOAD_CATALOG_PLATFORMS: readonly DownloadCatalogPlatform[] = [
  'windows',
  'macos',
  'linux',
  'ios',
  'android',
  'harmonyos',
  'docker',
  'helm',
  'generic',
];

export const DOWNLOAD_CATALOG_KINDS: readonly DownloadCatalogTargetKind[] = [
  'desktop',
  'server',
  'mobile',
  'package',
  'container',
  'documentation',
];

export const DOWNLOAD_CATALOG_ICONS: readonly DownloadCatalogCardIcon[] = [
  'desktop',
  'server',
  'mobile',
  'terminal',
  'download',
];

export const DOWNLOAD_CATALOG_TONES: readonly DownloadCatalogCardTone[] = [
  'brand',
  'server',
  'mobile',
  'neutral',
];

export const DOWNLOAD_CATALOG_PRIMARY_STRATEGIES: readonly DownloadCatalogPrimaryStrategy[] = [
  'detected-platform',
  'first-available',
];

/**
 * An uploaded installer, stored on the action as a Drive reference.
 *
 * Drive download URLs are short-lived presigned links, so the catalog stores the stable node
 * reference plus the read-only share token minted at upload time; the landing page exchanges the
 * token for a fresh download URL at render time (the same chain the public footer uses for
 * Drive-hosted QR artwork). `href` mirrors the reference as a `drive://` URI, which the runtime's
 * own href normalizer keeps inert — a visitor never navigates into it directly.
 */
export interface DownloadCatalogDriveRefFields {
  nodeId: string;
  shareToken: string;
  spaceId: string;
}

export interface DownloadCatalogActionFields {
  architecture: string;
  disabled: boolean;
  drive: DownloadCatalogDriveRefFields;
  fileName: string;
  href: string;
  id: string;
  label: string;
  platform: DownloadCatalogPlatform | '';
  releaseTag: string;
  sha256: string;
  /** Operator-typed decimal byte count; serialised back as a JSON number. */
  sizeBytes: string;
  unavailableLabel: string;
  version: string;
  /** Runtime fields the editor does not model, carried verbatim. */
  extra: Record<string, unknown>;
}

export interface DownloadCatalogCardFields {
  badge: string;
  description: string;
  /**
   * Deliberate per-card visibility: `true` keeps the edition out of the landing page's download
   * section entirely — how an operator parks an edition that is not ready to ship. Written only
   * when set (absent means visible), the same "deviations only" rule the action flag follows.
   */
  hidden: boolean;
  icon: DownloadCatalogCardIcon | '';
  id: string;
  kind: DownloadCatalogTargetKind | '';
  primaryActionId: string;
  primaryActionStrategy: DownloadCatalogPrimaryStrategy | '';
  title: string;
  tone: DownloadCatalogCardTone | '';
  actions: DownloadCatalogActionFields[];
  extra: Record<string, unknown>;
}

export interface DownloadCatalogForm {
  generatedAt: string;
  productChannel: string;
  productId: string;
  productName: string;
  productReleaseTag: string;
  productReleaseUrl: string;
  productVersion: string;
  cards: DownloadCatalogCardFields[];
}

/** Stable codes for the entries the homepage would skip, so the console can translate them. */
export type DownloadCatalogWarningCode =
  | 'cards.missing'
  | 'card.identity'
  | 'card.actions.missing'
  | 'action.identity'
  | 'action.target';

function randomIdFragment(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function createDownloadCatalogCardId(): string {
  return `card-${randomIdFragment()}`;
}

export function createDownloadCatalogActionId(): string {
  return `action-${randomIdFragment()}`;
}

export function createEmptyDownloadCatalogAction(): DownloadCatalogActionFields {
  return {
    architecture: '',
    disabled: false,
    drive: { nodeId: '', shareToken: '', spaceId: '' },
    fileName: '',
    href: '',
    id: createDownloadCatalogActionId(),
    label: '',
    platform: '',
    releaseTag: '',
    sha256: '',
    sizeBytes: '',
    unavailableLabel: '',
    version: '',
    extra: {},
  };
}

export function createEmptyDownloadCatalogCard(): DownloadCatalogCardFields {
  return {
    badge: '',
    description: '',
    hidden: false,
    icon: '',
    id: createDownloadCatalogCardId(),
    kind: '',
    primaryActionId: '',
    primaryActionStrategy: '',
    title: '',
    tone: '',
    actions: [createEmptyDownloadCatalogAction()],
    extra: {},
  };
}

/** A fresh, empty editor state — a factory, for the same reason `createDefaultHomeContentForm` is. */
export function createEmptyDownloadCatalogForm(): DownloadCatalogForm {
  return {
    generatedAt: '',
    productChannel: '',
    productId: '',
    productName: '',
    productReleaseTag: '',
    productReleaseUrl: '',
    productVersion: '',
    cards: [],
  };
}

/**
 * A minimal publishable skeleton for "the operator wants to maintain packages by hand".
 *
 * Seeded with the product identity this repository ships under and one card holding one empty
 * row; the warnings list then walks the operator through the two fields the homepage requires.
 */
export function createStarterDownloadCatalogForm(): DownloadCatalogForm {
  return {
    ...createEmptyDownloadCatalogForm(),
    productId: 'sdkwork-cloudrouter',
    cards: [createEmptyDownloadCatalogCard()],
  };
}

function readDriveRef(value: unknown): DownloadCatalogDriveRefFields {
  if (!isRecord(value)) {
    return { nodeId: '', shareToken: '', spaceId: '' };
  }
  return {
    nodeId: readText(value.nodeId, HOME_LABEL_MAX_LENGTH),
    shareToken: readText(value.shareToken, 512),
    spaceId: readText(value.spaceId, HOME_LABEL_MAX_LENGTH),
  };
}

function readCatalogPlatform(value: unknown): DownloadCatalogPlatform | '' {
  const platform = stringValue(value);
  return platform && (DOWNLOAD_CATALOG_PLATFORMS as readonly string[]).includes(platform)
    ? (platform as DownloadCatalogPlatform)
    : '';
}

function readCatalogKind(value: unknown): DownloadCatalogTargetKind | '' {
  const kind = stringValue(value);
  return kind && (DOWNLOAD_CATALOG_KINDS as readonly string[]).includes(kind)
    ? (kind as DownloadCatalogTargetKind)
    : '';
}

function readCatalogIcon(value: unknown): DownloadCatalogCardIcon | '' {
  const icon = stringValue(value);
  return icon && (DOWNLOAD_CATALOG_ICONS as readonly string[]).includes(icon)
    ? (icon as DownloadCatalogCardIcon)
    : '';
}

function readCatalogTone(value: unknown): DownloadCatalogCardTone | '' {
  const tone = stringValue(value);
  return tone && (DOWNLOAD_CATALOG_TONES as readonly string[]).includes(tone)
    ? (tone as DownloadCatalogCardTone)
    : '';
}

function readCatalogStrategy(value: unknown): DownloadCatalogPrimaryStrategy | '' {
  const strategy = stringValue(value);
  return strategy && (DOWNLOAD_CATALOG_PRIMARY_STRATEGIES as readonly string[]).includes(strategy)
    ? (strategy as DownloadCatalogPrimaryStrategy)
    : '';
}

/** Per-action keys the editor models; everything else on the raw record rides along in `extra`. */
const MODELED_ACTION_KEYS = new Set([
  'architecture',
  'disabled',
  'drive',
  'fileName',
  'href',
  'id',
  'label',
  'platform',
  'releaseTag',
  'sha256',
  'sizeBytes',
  'unavailableLabel',
  'version',
]);

const MODELED_CARD_KEYS = new Set([
  'actions',
  'badge',
  'description',
  'hidden',
  'icon',
  'id',
  'kind',
  'primaryActionId',
  'primaryActionStrategy',
  'title',
  'tone',
]);

function readExtraFields(
  value: Record<string, unknown>,
  modeledKeys: Set<string>,
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (!modeledKeys.has(key)) {
      extra[key] = entry;
    }
  }
  return extra;
}

function readCatalogAction(value: Record<string, unknown>): DownloadCatalogActionFields {
  return {
    architecture: readText(value.architecture, HOME_LABEL_MAX_LENGTH),
    disabled: value.disabled === true,
    drive: readDriveRef(value.drive),
    fileName: readText(value.fileName, HOME_LABEL_MAX_LENGTH),
    href: readText(value.href, HOME_TEXT_MAX_LENGTH),
    id: readText(value.id, HOME_LABEL_MAX_LENGTH),
    label: readText(value.label, HOME_LABEL_MAX_LENGTH),
    platform: readCatalogPlatform(value.platform),
    releaseTag: readText(value.releaseTag, HOME_LABEL_MAX_LENGTH),
    sha256: readText(value.sha256, 128),
    sizeBytes: typeof value.sizeBytes === 'number' && Number.isFinite(value.sizeBytes)
      ? String(value.sizeBytes)
      : readText(value.sizeBytes, 24),
    unavailableLabel: readText(value.unavailableLabel, HOME_LABEL_MAX_LENGTH),
    version: readText(value.version, HOME_LABEL_MAX_LENGTH),
    extra: readExtraFields(value, MODELED_ACTION_KEYS),
  };
}

function readCatalogCard(value: Record<string, unknown>): DownloadCatalogCardFields {
  return {
    badge: readText(value.badge, HOME_LABEL_MAX_LENGTH),
    description: readText(value.description, HOME_TEXT_MAX_LENGTH),
    hidden: value.hidden === true,
    icon: readCatalogIcon(value.icon),
    id: readText(value.id, HOME_LABEL_MAX_LENGTH),
    kind: readCatalogKind(value.kind),
    primaryActionId: readText(value.primaryActionId, HOME_LABEL_MAX_LENGTH),
    primaryActionStrategy: readCatalogStrategy(value.primaryActionStrategy),
    title: readText(value.title, HOME_LABEL_MAX_LENGTH),
    tone: readCatalogTone(value.tone),
    actions: readRows(value.actions, DOWNLOAD_MAX_ACTIONS_PER_CARD, readCatalogAction),
    extra: readExtraFields(value, MODELED_CARD_KEYS),
  };
}

/**
 * Reads the published catalog into editor state.
 *
 * Defensive like `readHomeContentForm`: this runs against whatever an older or newer console
 * build stored, and a payload it cannot understand must degrade to empty form fields rather than
 * throw while the page loads.
 */
export function readDownloadCatalogForm(value: unknown): DownloadCatalogForm {
  const form = createEmptyDownloadCatalogForm();
  if (!isRecord(value)) {
    return form;
  }

  const product = isRecord(value.product) ? value.product : undefined;
  form.generatedAt = readText(value.generatedAt, HOME_LABEL_MAX_LENGTH);
  form.productId = product ? readText(product.id, HOME_LABEL_MAX_LENGTH) : '';
  form.productName = product ? readText(product.name, HOME_LABEL_MAX_LENGTH) : '';
  form.productVersion = product ? readText(product.version, HOME_LABEL_MAX_LENGTH) : '';
  form.productChannel = product ? readText(product.channel, HOME_LABEL_MAX_LENGTH) : '';
  form.productReleaseTag = product ? readText(product.releaseTag, HOME_LABEL_MAX_LENGTH) : '';
  form.productReleaseUrl = product ? readText(product.releaseUrl, HOME_TEXT_MAX_LENGTH) : '';
  form.cards = readRows(value.cards, DOWNLOAD_MAX_CARDS, readCatalogCard);
  return form;
}

/** Writes one catalog text value the runtime will render verbatim, bounded by its own limits. */
function writeCatalogText(value: string, maxLength: number): string | undefined {
  const trimmed = value.replace(CONTROL_CHARACTERS, '').trim().slice(0, maxLength);
  return trimmed.length > 0 ? trimmed : undefined;
}

function writeDriveHref(drive: DownloadCatalogDriveRefFields): string | undefined {
  if (!drive.spaceId || !drive.nodeId) {
    return undefined;
  }
  return `drive://spaces/${drive.spaceId}/nodes/${drive.nodeId}`;
}

function writeCatalogDriveRef(
  drive: DownloadCatalogDriveRefFields,
): Record<string, string> | undefined {
  const ref: Record<string, string> = {};
  if (drive.spaceId) ref.spaceId = drive.spaceId;
  if (drive.nodeId) ref.nodeId = drive.nodeId;
  if (drive.shareToken) ref.shareToken = drive.shareToken;
  return Object.keys(ref).length > 0 ? ref : undefined;
}

function writeCatalogAction(action: DownloadCatalogActionFields): Record<string, unknown> | undefined {
  const doc: Record<string, unknown> = {};
  // Preserved extras first, so a read → write cycle keeps both the key set and the key order of
  // fields the editor does not model — the canonical text the "unsaved changes" counter compares
  // stays stable for a catalog that was only opened and re-saved.
  for (const [key, value] of Object.entries(action.extra)) {
    doc[key] = value;
  }

  const id = writeCatalogText(action.id, HOME_LABEL_MAX_LENGTH);
  // No id means the runtime drops the row; keeping the operator's typing in the document still
  // beats discarding it, so an id-less row is written with the fields it has.
  if (id !== undefined) doc.id = id;

  const label = writeCatalogText(action.label, HOME_LABEL_MAX_LENGTH);
  if (label !== undefined) doc.label = label;

  const href = action.href.trim().length > 0
    ? writeCatalogText(action.href, HOME_TEXT_MAX_LENGTH)
    : writeDriveHref(action.drive);
  if (href !== undefined) doc.href = href;

  const drive = writeCatalogDriveRef(action.drive);
  if (drive !== undefined) doc.drive = drive;

  const architecture = writeCatalogText(action.architecture, HOME_LABEL_MAX_LENGTH);
  if (architecture !== undefined) doc.architecture = architecture;

  const fileName = writeCatalogText(action.fileName, HOME_LABEL_MAX_LENGTH);
  if (fileName !== undefined) doc.fileName = fileName;

  const platform = readCatalogPlatform(action.platform);
  if (platform) doc.platform = platform;

  const releaseTag = writeCatalogText(action.releaseTag, HOME_LABEL_MAX_LENGTH);
  if (releaseTag !== undefined) doc.releaseTag = releaseTag;

  const sha256 = writeCatalogText(action.sha256, 128);
  if (sha256 !== undefined) doc.sha256 = sha256;

  const sizeBytes = /^\d+$/u.exec(action.sizeBytes.trim());
  if (sizeBytes) doc.sizeBytes = Number(sizeBytes[0]);

  const unavailableLabel = writeCatalogText(action.unavailableLabel, HOME_LABEL_MAX_LENGTH);
  if (unavailableLabel !== undefined) doc.unavailableLabel = unavailableLabel;

  const version = writeCatalogText(action.version, HOME_LABEL_MAX_LENGTH);
  if (version !== undefined) doc.version = version;

  // An explicit `disabled` is only ever a deviation from the runtime's own rule (no href means
  // disabled), so `false` writes nothing and `true` opts a row out even with a filled href.
  if (action.disabled) doc.disabled = true;

  return Object.keys(doc).length > 0 ? doc : undefined;
}

function writeCatalogCard(card: DownloadCatalogCardFields): Record<string, unknown> | undefined {
  const doc: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(card.extra)) {
    doc[key] = value;
  }

  const id = writeCatalogText(card.id, HOME_LABEL_MAX_LENGTH);
  if (id !== undefined) doc.id = id;

  const title = writeCatalogText(card.title, HOME_LABEL_MAX_LENGTH);
  if (title !== undefined) doc.title = title;

  const description = writeCatalogText(card.description, HOME_TEXT_MAX_LENGTH);
  if (description !== undefined) doc.description = description;

  const kind = readCatalogKind(card.kind);
  if (kind) doc.kind = kind;

  // Visible is the runtime's own default, so only the deliberate hide is stored.
  if (card.hidden) doc.hidden = true;

  const icon = readCatalogIcon(card.icon);
  if (icon) doc.icon = icon;

  const tone = readCatalogTone(card.tone);
  if (tone) doc.tone = tone;

  const badge = writeCatalogText(card.badge, HOME_LABEL_MAX_LENGTH);
  if (badge !== undefined) doc.badge = badge;

  const primaryActionId = writeCatalogText(card.primaryActionId, HOME_LABEL_MAX_LENGTH);
  if (primaryActionId !== undefined) doc.primaryActionId = primaryActionId;

  const strategy = readCatalogStrategy(card.primaryActionStrategy);
  if (strategy) doc.primaryActionStrategy = strategy;

  const actions = card.actions
    .slice(0, DOWNLOAD_MAX_ACTIONS_PER_CARD)
    .map(writeCatalogAction)
    .filter((entry): entry is Record<string, unknown> => entry !== undefined);
  // A card with no rows is kept as the operator authored it; the runtime drops the card, and the
  // console warns, which is the same half-written-row convention the homepage editor uses.
  if (actions.length > 0) doc.actions = actions;

  return Object.keys(doc).length > 0 ? doc : undefined;
}

/**
 * Turns editor state back into the canonical catalog text.
 *
 * A completely untouched form serialises to `''` — the same "nothing published" contract
 * `toDownloadCatalogPayload` hands the backend — and a partially filled one serialises to the
 * document, so the save guard (not the editor) decides what is publishable.
 */
export function toDownloadCatalogText(form: DownloadCatalogForm): string {
  const product: Record<string, unknown> = {};
  const productId = writeCatalogText(form.productId, HOME_LABEL_MAX_LENGTH);
  const productName = writeCatalogText(form.productName, HOME_LABEL_MAX_LENGTH);
  const productVersion = writeCatalogText(form.productVersion, HOME_LABEL_MAX_LENGTH);
  const productChannel = writeCatalogText(form.productChannel, HOME_LABEL_MAX_LENGTH);
  const productReleaseTag = writeCatalogText(form.productReleaseTag, HOME_LABEL_MAX_LENGTH);
  const productReleaseUrl = writeCatalogText(form.productReleaseUrl, HOME_TEXT_MAX_LENGTH);
  if (productId !== undefined) product.id = productId;
  if (productName !== undefined) product.name = productName;
  if (productVersion !== undefined) product.version = productVersion;
  if (productChannel !== undefined) product.channel = productChannel;
  if (productReleaseTag !== undefined) product.releaseTag = productReleaseTag;
  if (productReleaseUrl !== undefined) product.releaseUrl = productReleaseUrl;

  const doc: Record<string, unknown> = {};
  const generatedAt = writeCatalogText(form.generatedAt, HOME_LABEL_MAX_LENGTH);
  if (generatedAt !== undefined) doc.generatedAt = generatedAt;
  if (Object.keys(product).length > 0) doc.product = product;
  const cards = form.cards
    .slice(0, DOWNLOAD_MAX_CARDS)
    .map(writeCatalogCard)
    .filter((entry): entry is Record<string, unknown> => entry !== undefined);
  if (cards.length > 0) doc.cards = cards;

  if (Object.keys(doc).length === 0) {
    return '';
  }
  return `${JSON.stringify(doc, null, 2)}\n`;
}

/** Names every entry the homepage would skip, so the console can say so before it is saved. */
export function findIncompleteDownloadCatalog(form: DownloadCatalogForm): DownloadCatalogWarningCode[] {
  const warnings = new Set<DownloadCatalogWarningCode>();
  if (form.cards.length === 0) {
    warnings.add('cards.missing');
  }
  for (const card of form.cards) {
    for (const code of findDownloadCatalogCardWarningCodes(card)) {
      warnings.add(code);
    }
  }
  return [...warnings];
}

/**
 * One card's share of the catalog warnings, in a form the tab strip can render per tab.
 *
 * The aggregate list answers "is anything wrong?"; the tabs also have to answer "where?" — a
 * warning dot on the tab whose card is incomplete — and a second walk of the same rules is how
 * the two answers stop agreeing.
 */
export function findDownloadCatalogCardWarningCodes(
  card: DownloadCatalogCardFields,
): DownloadCatalogWarningCode[] {
  const codes: DownloadCatalogWarningCode[] = [];
  if (!card.id.trim() || !card.title.trim() || !card.description.trim() || !card.kind) {
    codes.push('card.identity');
  }
  // A deliberately hidden card is parked, not broken: the "not ready to ship" signals are
  // excused exactly the way a disabled installer excuses a missing target, so an operator can
  // park a half-built edition without its tab permanently carrying a warning dot. Identity
  // still warns — malformed data stays malformed while hidden.
  const parked = card.hidden;
  if (!parked && card.actions.length === 0) {
    codes.push('card.actions.missing');
  }
  for (const action of card.actions) {
    for (const code of findDownloadCatalogActionWarningCodes(action)) {
      if (parked && code === 'action.target') {
        continue;
      }
      codes.push(code);
    }
  }
  return codes;
}

/**
 * One installer row's warnings, for the sidebar entry that represents it.
 *
 * Same split as the card level: the aggregate answers "is anything wrong", the sidebar dot
 * answers "which installer", so both read the same rules instead of a second copy.
 */
export function findDownloadCatalogActionWarningCodes(
  action: DownloadCatalogActionFields,
): DownloadCatalogWarningCode[] {
  const codes: DownloadCatalogWarningCode[] = [];
  if (!action.id.trim() || !action.label.trim()) {
    codes.push('action.identity');
  }
  const hasTarget = action.href.trim().length > 0
    || (Boolean(action.drive.nodeId) && Boolean(action.drive.spaceId));
  // A deliberately disabled row needs no target; an enabled row without one would render as
  // "coming soon", which is a legitimate intermediate state and therefore only a warning.
  if (!hasTarget && !action.disabled) {
    codes.push('action.target');
  }
  return codes;
}

/**
 * The form state the structured editor starts from.
 *
 * An operator maintaining packages by hand should edit the catalog that is already live, not
 * re-type it: a published document wins, and when nothing is published the application's bundled
 * catalog — which is what the homepage is rendering right now — seeds the editor instead. The
 * result stays editor state until the operator actually changes something, so opening the page
 * and saving publishes nothing (the "blank means bundled" contract is untouched).
 *
 * `null` means the stored text is not parseable JSON: the structured editor is blocked until the
 * JSON mode repairs it.
 */
export function readInitialDownloadCatalogForm(
  value: string,
  fallbackCatalog?: unknown,
): DownloadCatalogForm | null {
  const trimmed = value.trim();
  if (trimmed.length > 0) {
    try {
      return readDownloadCatalogForm(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  if (fallbackCatalog !== undefined && fallbackCatalog !== null) {
    return readDownloadCatalogForm(fallbackCatalog);
  }
  return createStarterDownloadCatalogForm();
}

/**
 * The structured editor's verdict on whether an action downloads from Drive.
 *
 * Mirrors the reference the write side produces (`drive://spaces/<spaceId>/nodes/<nodeId>`), so
 * the editor's URL/upload source switch and the runtime's href handling agree.
 */
export function isDownloadCatalogDriveHref(href: string): boolean {
  return /^drive:\/\/spaces\/[^/]+\/nodes\/[^/]+$/u.test(href.trim());
}
