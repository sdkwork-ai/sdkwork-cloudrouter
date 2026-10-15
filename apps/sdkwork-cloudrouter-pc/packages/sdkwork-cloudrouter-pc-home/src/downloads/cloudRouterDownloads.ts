import type { SdkworkDownloadCard } from '@sdkwork/cloudrouter-pc-downloads';
import { interpolateBrandTokens, type BrandTokenVariables } from '../content/brand-tokens.ts';
import defaultDownloadCatalog from './cloud-router-downloads.json' with { type: 'json' };

type Translate = (
  key: string,
  fallback: string | {
    defaultValue?: string;
    [key: string]: unknown;
  },
) => string;

export interface CreateCloudRouterDownloadCardsOptions {
  baseUrl?: string;
  catalog?: unknown;
  runtimeEnv?: Record<string, string | undefined>;
  /** Brand tokens substituted into card copy, so a rename follows into the download section. */
  brandVariables?: BrandTokenVariables;
}

const DOWNLOAD_BASE_URL_ENV = 'VITE_CLOUDROUTER_DOWNLOAD_BASE_URL';
export const DOWNLOAD_CATALOG_SCHEMA_VERSION = '2026-05-18.sdkwork-download-catalog.v1';

export const cloudRouterDownloadCatalog = defaultDownloadCatalog;

function normalizeBaseUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('/')) {
    if (trimmed.startsWith('//') || trimmed.includes('?') || trimmed.includes('#')) {
      return undefined;
    }

    return trimmed.replace(/\/+$/u, '') || '/';
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }

    if (parsed.search || parsed.hash) {
      return undefined;
    }

    return trimmed.replace(/\/+$/u, '');
  } catch {
    return undefined;
  }
}

function joinDownloadUrl(baseUrl: string | undefined, ...segments: string[]): string {
  if (!baseUrl) {
    return '';
  }

  const suffix = segments
    .map((segment) => segment.trim().replace(/^\/+|\/+$/gu, ''))
    .filter(Boolean)
    .join('/');

  return `${baseUrl.replace(/\/+$/u, '')}/${suffix}`;
}

function translated(
  t: Translate,
  key: string,
  defaultValue: string,
  values: Record<string, unknown> = {},
): string {
  return t(key, { ...values, defaultValue });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeDownloadHref(value: unknown): string {
  const href = stringValue(value)?.trim();
  if (!href || href === '#') {
    return '';
  }

  if (href.startsWith('/')) {
    if (href.startsWith('//') || href.includes('?') || href.includes('#')) {
      return '';
    }
    return href;
  }

  try {
    const parsed = new URL(href);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';
    }
    if (parsed.search || parsed.hash) {
      return '';
    }
    return href;
  } catch {
    return '';
  }
}

function normalizePlatform(value: unknown): SdkworkDownloadCard['actions'][number]['platform'] | undefined {
  const platform = stringValue(value);
  if (
    platform === 'android'
    || platform === 'docker'
    || platform === 'generic'
    || platform === 'harmonyos'
    || platform === 'helm'
    || platform === 'ios'
    || platform === 'linux'
    || platform === 'macos'
    || platform === 'windows'
  ) {
    return platform;
  }
  return undefined;
}

function normalizeKind(value: unknown): SdkworkDownloadCard['kind'] | undefined {
  const kind = stringValue(value);
  if (
    kind === 'container'
    || kind === 'desktop'
    || kind === 'documentation'
    || kind === 'mobile'
    || kind === 'package'
    || kind === 'server'
  ) {
    return kind;
  }
  return undefined;
}

function normalizeIcon(value: unknown): SdkworkDownloadCard['icon'] | undefined {
  const icon = stringValue(value);
  if (
    icon === 'desktop'
    || icon === 'download'
    || icon === 'mobile'
    || icon === 'server'
    || icon === 'terminal'
  ) {
    return icon;
  }
  return undefined;
}

function normalizeTone(value: unknown): SdkworkDownloadCard['tone'] | undefined {
  const tone = stringValue(value);
  if (tone === 'brand' || tone === 'mobile' || tone === 'neutral' || tone === 'server') {
    return tone;
  }
  return undefined;
}

function normalizePrimaryActionStrategy(value: unknown): SdkworkDownloadCard['primaryActionStrategy'] | undefined {
  const strategy = stringValue(value);
  if (strategy === 'detected-platform' || strategy === 'first-available') {
    return strategy;
  }
  return undefined;
}

function normalizeDownloadSource(rawSource: unknown): NonNullable<SdkworkDownloadCard['actions'][number]['sources']>[number] | undefined {
  if (!isRecord(rawSource)) {
    return undefined;
  }

  const id = stringValue(rawSource.id)?.trim();
  const label = stringValue(rawSource.label)?.trim();
  if (!id || !label) {
    return undefined;
  }

  const href = normalizeDownloadHref(rawSource.href);
  if (href.length === 0 && booleanValue(rawSource.disabled) !== true) {
    return undefined;
  }

  const disabled = booleanValue(rawSource.disabled) ?? href.length === 0;

  return {
    ...(stringValue(rawSource.ariaLabel) ? { ariaLabel: stringValue(rawSource.ariaLabel) } : {}),
    disabled,
    ...(booleanValue(rawSource.external) !== undefined ? { external: booleanValue(rawSource.external) } : {}),
    href,
    id,
    label,
    ...(booleanValue(rawSource.primary) !== undefined ? { primary: booleanValue(rawSource.primary) } : {}),
    ...(stringValue(rawSource.unavailableLabel) ? { unavailableLabel: stringValue(rawSource.unavailableLabel) } : {}),
  };
}

function normalizeDownloadAction(rawAction: unknown): SdkworkDownloadCard['actions'][number] | undefined {
  if (!isRecord(rawAction)) {
    return undefined;
  }

  const id = stringValue(rawAction.id)?.trim();
  const label = stringValue(rawAction.label)?.trim();
  if (!id || !label) {
    return undefined;
  }

  const href = normalizeDownloadHref(rawAction.href);
  const disabled = booleanValue(rawAction.disabled) ?? href.length === 0;
  const rawSources = Array.isArray(rawAction.sources) ? rawAction.sources : [];
  const sources = rawSources
    .map(normalizeDownloadSource)
    .filter((source): source is NonNullable<SdkworkDownloadCard['actions'][number]['sources']>[number] =>
      Boolean(source)
    );

  return {
    ...(stringValue(rawAction.ariaLabel) ? { ariaLabel: stringValue(rawAction.ariaLabel) } : {}),
    ...(stringValue(rawAction.architecture) ? { architecture: stringValue(rawAction.architecture) } : {}),
    ...(stringValue(rawAction.ctaLabel) ? { ctaLabel: stringValue(rawAction.ctaLabel) } : {}),
    disabled,
    ...(booleanValue(rawAction.external) !== undefined ? { external: booleanValue(rawAction.external) } : {}),
    ...(stringValue(rawAction.fileName) ? { fileName: stringValue(rawAction.fileName) } : {}),
    href,
    id,
    ...(normalizeKind(rawAction.kind) ? { kind: normalizeKind(rawAction.kind) } : {}),
    label,
    ...(normalizePlatform(rawAction.platform) ? { platform: normalizePlatform(rawAction.platform) } : {}),
    ...(stringValue(rawAction.releaseTag) ? { releaseTag: stringValue(rawAction.releaseTag) } : {}),
    ...(stringValue(rawAction.sha256) ? { sha256: stringValue(rawAction.sha256) } : {}),
    ...(numberValue(rawAction.sizeBytes) !== undefined ? { sizeBytes: numberValue(rawAction.sizeBytes) } : {}),
    ...(sources.length > 0 ? { sources } : {}),
    ...(stringValue(rawAction.unavailableLabel) ? { unavailableLabel: stringValue(rawAction.unavailableLabel) } : {}),
    ...(stringValue(rawAction.version) ? { version: stringValue(rawAction.version) } : {}),
  };
}

interface LocalizeOptions {
  /** Card copy came from the console, so it is authoritative and must not be replaced by i18n. */
  operatorAuthored: boolean;
  variables: BrandTokenVariables | undefined;
}

function localizeCatalogCard(card: SdkworkDownloadCard, t: Translate, options: LocalizeOptions): SdkworkDownloadCard {
  const variables = options.variables ?? { productName: '', siteName: '', version: '' };
  const interpolate = (value: string) => interpolateBrandTokens(value, variables);
  const unavailableLabel = translated(t, 'home.download.unavailable', 'Coming soon', variables);

  if (options.operatorAuthored) {
    // The console is the authority on what the download section says. Applying the shipped
    // translation here would silently re-label an operator's "Sdkwork Gateway Appliance" back to
    // the bundled wording — the exact bug this branch exists to prevent.
    return {
      ...card,
      actions: card.actions.map((action) => ({
        ...action,
        ...(action.ctaLabel ? { ctaLabel: interpolate(action.ctaLabel) } : {}),
        label: interpolate(action.label),
        unavailableLabel: action.unavailableLabel ?? `${interpolate(action.label)} ${unavailableLabel}`,
      })),
      description: interpolate(card.description),
      title: interpolate(card.title),
    };
  }

  const titleById: Record<string, [string, string]> = {
    'cloud-router-desktop': ['home.desktop.title', '{{productName}} Desktop'],
    'cloud-router-server': ['home.server.title', '{{productName}} Server'],
    'cloud-router-mobile': ['home.mobile.title', '{{productName}} Mobile'],
  };
  const descriptionById: Record<string, [string, string]> = {
    'cloud-router-desktop': [
      'home.desktop.desc',
      'For developers and local environments. Includes a full graphical interface, visual API building, integrated Playground, and one-click app testing.',
    ],
    'cloud-router-server': [
      'home.server.desc',
      'For production deployments. Optimized for headless execution, extreme throughput, containerization (Docker), and large-scale enterprise routing.',
    ],
    'cloud-router-mobile': [
      'home.mobile.desc',
      'Track routing health, account activity, and model usage from a mobile companion built for operators and builders.',
    ],
  };
  const actionLabelById: Record<string, [string, string]> = {
    'server-docker': ['home.server.docker', 'Docker Image'],
    'server-helm': ['home.server.helm', 'Helm Chart'],
  };
  const titleTranslation = titleById[card.id];
  const descriptionTranslation = descriptionById[card.id];

  return {
    ...card,
    actions: card.actions.map((action) => {
      const labelTranslation = actionLabelById[action.id];
      const label = labelTranslation
        ? translated(t, labelTranslation[0], labelTranslation[1], variables)
        : action.label;
      return {
        ...action,
        ...(action.id === 'server-linux-x64'
          ? { ctaLabel: translated(t, 'home.server.get', action.ctaLabel ?? 'Get Server Edition', variables) }
          : {}),
        label: interpolate(label),
        unavailableLabel: action.unavailableLabel ?? `${label} ${unavailableLabel}`,
      };
    }),
    description: descriptionTranslation
      ? interpolate(translated(t, descriptionTranslation[0], descriptionTranslation[1], variables))
      : interpolate(card.description),
    title: titleTranslation
      ? interpolate(translated(t, titleTranslation[0], titleTranslation[1], variables))
      : interpolate(card.title),
  };
}

/**
 * Drops the cards an operator deliberately hid from `/admin/site`.
 *
 * `hidden: true` is portal-owned and the shared normalizer drops unknown fields, so the filter
 * runs on the raw published document — before normalization — the same place the Drive installer
 * references are read. An unfiltered or non-record input comes back unchanged, and a catalog
 * without any hidden card is returned as the same object (the common case pays nothing).
 */
export function dropHiddenDownloadCatalogCards(catalog: unknown): unknown {
  if (!isRecord(catalog) || !Array.isArray(catalog.cards)) {
    return catalog;
  }
  const visibleCards = catalog.cards.filter(
    (card) => !(isRecord(card) && card.hidden === true),
  );
  if (visibleCards.length === catalog.cards.length) {
    return catalog;
  }
  return { ...catalog, cards: visibleCards };
}

/** Whether a catalog still draws at least one card after hidden ones are dropped. */
export function hasVisibleDownloadCatalogCards(catalog: unknown): boolean {
  if (!isRecord(catalog) || !Array.isArray(catalog.cards)) {
    return false;
  }
  return catalog.cards.some((card) => !(isRecord(card) && card.hidden === true));
}

/**
 * Reads the download catalog published by `/admin/site`, or `undefined` to keep the bundled one.
 *
 * Three outcomes, and the distinction matters:
 * - **absent / blank** → `undefined`. Nothing was published, so the checked-in catalog keeps
 *   rendering. This is what makes the feature a no-op for a deployment nobody has edited.
 * - **usable** → returned as-is, with `schemaVersion` stamped when the console omitted it (the
 *   version token is ours, not the operator's, so it is not something the form should have to set).
 * - **malformed, or a different schemaVersion** → `undefined`. A catalog from an incompatible
 *   console build cannot be interpreted safely, and blanking the download section would be worse
 *   than showing the shipped release.
 */
export function readRuntimeDownloadCatalog(value: unknown): unknown | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const declaredVersion = stringValue(value.schemaVersion)?.trim();
  if (declaredVersion && declaredVersion !== DOWNLOAD_CATALOG_SCHEMA_VERSION) {
    return undefined;
  }
  if (!isRecord(value.product) || !stringValue(value.product.id)?.trim()) {
    return undefined;
  }
  if (!stringValue(value.product.name)?.trim() || !stringValue(value.product.version)?.trim()) {
    return undefined;
  }
  const cards = Array.isArray(value.cards) ? value.cards : [];
  if (cards.length === 0) {
    return undefined;
  }
  if (!declaredVersion) {
    return { ...value, schemaVersion: DOWNLOAD_CATALOG_SCHEMA_VERSION };
  }
  return value;
}

/**
 * The version of the release checked into the repository.
 *
 * Returns `''` rather than throwing when the bundled catalog is unreadable: this feeds the hero
 * badge, and an unreadable catalog must degrade to a badge without a version, not to a blank page.
 */
export function readBundledCloudRouterVersion(): string {
  try {
    return createCloudRouterDownloadCatalog(defaultDownloadCatalog).product.version;
  } catch {
    return '';
  }
}

/**
 * Keeps a published catalog only if it can actually render.
 *
 * `readRuntimeDownloadCatalog` proves the envelope is complete; this proves the contents produce at
 * least one renderable card. Both checks exist because the download section sits on the landing
 * page: a catalog that passes the envelope check but has every card malformed would otherwise throw
 * during render, and a blank homepage is a far worse outcome than showing the shipped release.
 */
export function resolveUsableDownloadCatalog(candidate: unknown): unknown | undefined {
  if (candidate === undefined) {
    return undefined;
  }
  try {
    createCloudRouterDownloadCatalog(candidate);
    return candidate;
  } catch {
    return undefined;
  }
}

export function createCloudRouterDownloadCatalog(rawCatalog: unknown = defaultDownloadCatalog): {
  cards: SdkworkDownloadCard[];
  generatedAt: string;
  product: {
    channel?: string;
    id: string;
    name: string;
    releaseTag?: string;
    releaseUrl?: string;
    version: string;
  };
  schemaVersion: string;
} {
  if (!isRecord(rawCatalog)) {
    throw new Error('Cloud Router download catalog must be a JSON object');
  }
  if (rawCatalog.schemaVersion !== DOWNLOAD_CATALOG_SCHEMA_VERSION) {
    throw new Error(`Cloud Router download catalog schemaVersion must be ${DOWNLOAD_CATALOG_SCHEMA_VERSION}`);
  }
  if (!isRecord(rawCatalog.product)) {
    throw new Error('Cloud Router download catalog product is required');
  }

  const productId = stringValue(rawCatalog.product.id)?.trim();
  const productName = stringValue(rawCatalog.product.name)?.trim();
  const productVersion = stringValue(rawCatalog.product.version)?.trim();
  if (!productId || !productName || !productVersion) {
    throw new Error('Cloud Router download catalog product id, name, and version are required');
  }
  if (!Array.isArray(rawCatalog.cards)) {
    throw new Error('Cloud Router download catalog cards must be an array');
  }

  const cards = rawCatalog.cards.map((rawCard): SdkworkDownloadCard | undefined => {
    if (!isRecord(rawCard)) {
      return undefined;
    }

    const id = stringValue(rawCard.id)?.trim();
    const title = stringValue(rawCard.title)?.trim();
    const description = stringValue(rawCard.description)?.trim();
    const kind = normalizeKind(rawCard.kind);
    const rawActions = Array.isArray(rawCard.actions) ? rawCard.actions : [];
    const actions = rawActions.map(normalizeDownloadAction).filter((action): action is SdkworkDownloadCard['actions'][number] =>
      Boolean(action)
    );
    if (!id || !title || !description || !kind || actions.length === 0) {
      return undefined;
    }

    const card: SdkworkDownloadCard = {
      actions,
      ...(stringValue(rawCard.badge) ? { badge: stringValue(rawCard.badge) } : {}),
      description,
      ...(normalizeIcon(rawCard.icon) ? { icon: normalizeIcon(rawCard.icon) } : {}),
      id,
      kind,
      ...(stringValue(rawCard.primaryActionId) ? { primaryActionId: stringValue(rawCard.primaryActionId) } : {}),
      ...(normalizePrimaryActionStrategy(rawCard.primaryActionStrategy)
        ? { primaryActionStrategy: normalizePrimaryActionStrategy(rawCard.primaryActionStrategy) }
        : {}),
      title,
      ...(normalizeTone(rawCard.tone) ? { tone: normalizeTone(rawCard.tone) } : {}),
    };
    return card;
  }).filter((card): card is SdkworkDownloadCard => Boolean(card));

  if (cards.length === 0) {
    throw new Error('Cloud Router download catalog must contain at least one valid card');
  }

  return {
    cards,
    generatedAt: stringValue(rawCatalog.generatedAt) ?? '',
    product: {
      ...(stringValue(rawCatalog.product.channel) ? { channel: stringValue(rawCatalog.product.channel) } : {}),
      id: productId,
      name: productName,
      ...(stringValue(rawCatalog.product.releaseTag) ? { releaseTag: stringValue(rawCatalog.product.releaseTag) } : {}),
      ...(stringValue(rawCatalog.product.releaseUrl) ? { releaseUrl: stringValue(rawCatalog.product.releaseUrl) } : {}),
      version: productVersion,
    },
    schemaVersion: DOWNLOAD_CATALOG_SCHEMA_VERSION,
  };
}

export function resolveCloudRouterDownloadBaseUrl(
  runtimeEnv: Record<string, string | undefined> = {},
): string | undefined {
  return normalizeBaseUrl(runtimeEnv[DOWNLOAD_BASE_URL_ENV]);
}

/**
 * A Drive-hosted installer reference an operator uploaded from `/admin/site`.
 *
 * Drive download URLs are short-lived presigned links, so the catalog stores the stable node
 * reference plus the read-only share token minted at upload time; the landing page exchanges the
 * token for a fresh download URL at render time (the same chain the public footer uses for
 * Drive-hosted artwork).
 */
export interface SdkworkDownloadDriveRef {
  nodeId: string;
  shareToken?: string;
  spaceId?: string;
  /**
   * The operator explicitly hid this installer on `/admin/site`. A hidden installer must never
   * be re-enabled by URL resolution: the disabled state an operator wrote wins over the
   * "resolve then enable" flow, which only exists to wake up actions that are disabled *because
   * their Drive href is not directly navigable.
   */
  disabled?: boolean;
  /**
   * The operator-authored unavailable label, if any. While a Drive URL has not resolved yet the
   * action renders disabled, and the shared localizer has already filled the gap with
   * "… Coming soon" — wrong for an installer that exists and is about to be downloadable. The
   * stitch step replaces that default with the bare package name, but never an authored label.
   */
  unavailableLabel?: string;
}

/**
 * Reads the Drive installer references out of a published catalog.
 *
 * Runs against the *raw* catalog — the action's `drive` field is portal-owned and the shared
 * normalizer drops it — and keys every reference by `${card.id}/${action.id}` so the resolved
 * URLs can be stitched back onto the normalized cards. An action without both ids, or a
 * reference without a node id, is skipped rather than guessed at.
 */
export function readDownloadActionDriveRefs(catalog: unknown): Map<string, SdkworkDownloadDriveRef> {
  const refs = new Map<string, SdkworkDownloadDriveRef>();
  if (!isRecord(catalog) || !Array.isArray(catalog.cards)) {
    return refs;
  }
  for (const rawCard of catalog.cards) {
    if (!isRecord(rawCard) || !Array.isArray(rawCard.actions)) {
      continue;
    }
    const cardId = stringValue(rawCard.id)?.trim();
    if (!cardId) {
      continue;
    }
    for (const rawAction of rawCard.actions) {
      if (!isRecord(rawAction) || !isRecord(rawAction.drive)) {
        continue;
      }
      const nodeId = stringValue(rawAction.drive.nodeId)?.trim();
      const actionId = stringValue(rawAction.id)?.trim();
      if (!nodeId || !actionId) {
        continue;
      }
      const spaceId = stringValue(rawAction.drive.spaceId)?.trim();
      const shareToken = stringValue(rawAction.drive.shareToken)?.trim();
      const unavailableLabel = stringValue(rawAction.unavailableLabel)?.trim();
      refs.set(`${cardId}/${actionId}`, {
        nodeId,
        ...(spaceId ? { spaceId } : {}),
        ...(shareToken ? { shareToken } : {}),
        ...(rawAction.disabled === true ? { disabled: true } : {}),
        ...(unavailableLabel ? { unavailableLabel } : {}),
      });
    }
  }
  return refs;
}

/**
 * Drops the references whose installers an operator explicitly hid, so the URL resolver neither
 * exchanges their tokens nor produces a URL the stitch step could apply. The normalized action
 * cannot carry this distinction — both an explicit hide and "no navigable href yet" normalize to
 * the same disabled state — which is why it is read here, on the raw document.
 */
export function resolvableDownloadDriveRefs(
  refs: ReadonlyMap<string, SdkworkDownloadDriveRef>,
): Map<string, SdkworkDownloadDriveRef> {
  const resolvable = new Map<string, SdkworkDownloadDriveRef>();
  for (const [key, ref] of refs) {
    if (!ref.disabled) {
      resolvable.set(key, ref);
    }
  }
  return resolvable;
}

/**
 * Stitches resolved download URLs back onto normalized cards.
 *
 * Runs after `createCloudRouterDownloadCards`: a Drive-referencing action normalizes with an
 * empty href (the runtime's href rules only accept http(s) URLs, so the `drive://` mirror is
 * inert), and stays disabled until its URL arrives here. An action without a resolution keeps
 * its disabled state — a catalog must never render a link that cannot be followed.
 *
 * Two operator decisions survive every path here:
 *
 * - **Hidden** — an installer the operator disabled is never woken, even by a URL that arrives
 *   for its key (the resolvable set is filtered upstream; this is the second line of defense).
 * - **Authored copy** — a pending installer shows its package name instead of the localizer's
 *   "… Coming soon" default, because the installer exists and is about to be downloadable; an
 *   operator-authored unavailable label (carried on the ref) always wins.
 */
export function applyResolvedDownloadUrls(
  cards: readonly SdkworkDownloadCard[],
  urls: ReadonlyMap<string, string>,
  refs?: ReadonlyMap<string, SdkworkDownloadDriveRef>,
): SdkworkDownloadCard[] {
  if (urls.size === 0 && !refs?.size) {
    return [...cards];
  }
  return cards.map((card) => {
    const relevant = card.actions.some((action) => {
      const key = `${card.id}/${action.id}`;
      return urls.has(key) || (refs?.has(key) === true && !refs.get(key)?.disabled);
    });
    if (!relevant) {
      return card;
    }
    return {
      ...card,
      actions: card.actions.map((action) => {
        const key = `${card.id}/${action.id}`;
        const ref = refs?.get(key);
        if (ref?.disabled) {
          return action;
        }
        const url = urls.get(key);
        if (url) {
          return { ...action, disabled: false, href: url };
        }
        if (!ref) {
          return action;
        }
        // Still resolving: keep the button visible under its own name rather than the
        // "coming soon" default an installer that exists never deserved. An operator-authored
        // unavailable label rides in the ref and is preserved verbatim.
        return { ...action, unavailableLabel: ref.unavailableLabel ?? action.label };
      }),
    };
  });
}

export function createCloudRouterDownloadCards(
  t: Translate,
  options: CreateCloudRouterDownloadCardsOptions = {},
): SdkworkDownloadCard[] {
  const baseUrl = normalizeBaseUrl(options.baseUrl) ?? resolveCloudRouterDownloadBaseUrl(options.runtimeEnv);
  const operatorCatalog = options.catalog;
  const rawCatalog = operatorCatalog ?? (baseUrl ? undefined : defaultDownloadCatalog);
  if (rawCatalog !== undefined) {
    const catalog = createCloudRouterDownloadCatalog(rawCatalog);
    const localizeOptions: LocalizeOptions = {
      operatorAuthored: operatorCatalog !== undefined,
      variables: options.brandVariables,
    };
    return catalog.cards.map((card) => localizeCatalogCard(card, t, localizeOptions));
  }
  const createHref = (...segments: string[]) => joinDownloadUrl(baseUrl, ...segments);
  const actionAvailable = (href: string) => href.length > 0;
  const unavailableLabel = translated(t, 'home.download.unavailable', 'Coming soon', options.brandVariables);

  return [
    {
      actions: [
        {
          disabled: !actionAvailable(createHref('desktop', 'macos', 'latest')),
          href: createHref('desktop', 'macos', 'latest'),
          id: 'desktop-macos',
          label: 'macOS',
          platform: 'macos',
          unavailableLabel: `macOS ${unavailableLabel}`,
        },
        {
          disabled: !actionAvailable(createHref('desktop', 'windows', 'latest')),
          href: createHref('desktop', 'windows', 'latest'),
          id: 'desktop-windows',
          label: 'Windows',
          platform: 'windows',
          unavailableLabel: `Windows ${unavailableLabel}`,
        },
        {
          disabled: !actionAvailable(createHref('desktop', 'linux', 'latest')),
          href: createHref('desktop', 'linux', 'latest'),
          id: 'desktop-linux',
          label: 'Linux',
          platform: 'linux',
          unavailableLabel: `Linux ${unavailableLabel}`,
        },
      ],
      description: translated(
        t,
        'home.desktop.desc',
        'For developers and local environments. Includes a full graphical interface, visual API building, integrated Playground, and one-click app testing.',
      ),
      icon: 'desktop',
      id: 'cloud-router-desktop',
      kind: 'desktop',
      primaryActionStrategy: 'detected-platform',
      title: translated(t, 'home.desktop.title', '{{productName}} Desktop', options.brandVariables),
      tone: 'brand',
    },
    {
      actions: [
        {
          ctaLabel: translated(t, 'home.server.get', 'Get Server Edition'),
          disabled: !actionAvailable(createHref('server', 'linux', 'latest')),
          href: createHref('server', 'linux', 'latest'),
          id: 'server-linux',
          label: translated(t, 'home.server.linux', 'Linux Tarball'),
          platform: 'linux',
          unavailableLabel: `${translated(t, 'home.server.linux', 'Linux Tarball')} ${unavailableLabel}`,
        },
        {
          disabled: !actionAvailable(createHref('server', 'docker', 'latest')),
          href: createHref('server', 'docker', 'latest'),
          id: 'server-docker',
          label: translated(t, 'home.server.docker', 'Docker Image'),
          platform: 'docker',
          unavailableLabel: `${translated(t, 'home.server.docker', 'Docker Image')} ${unavailableLabel}`,
        },
        {
          disabled: !actionAvailable(createHref('server', 'helm', 'latest')),
          href: createHref('server', 'helm', 'latest'),
          id: 'server-helm',
          label: translated(t, 'home.server.helm', 'Helm Chart'),
          platform: 'helm',
          unavailableLabel: `${translated(t, 'home.server.helm', 'Helm Chart')} ${unavailableLabel}`,
        },
      ],
      description: translated(
        t,
        'home.server.desc',
        'For production deployments. Optimized for headless execution, extreme throughput, containerization (Docker), and large-scale enterprise routing.',
      ),
      icon: 'server',
      id: 'cloud-router-server',
      kind: 'server',
      primaryActionId: 'server-linux',
      title: translated(t, 'home.server.title', '{{productName}} Server', options.brandVariables),
      tone: 'server',
    },
    {
      actions: [
        {
          disabled: !actionAvailable(createHref('mobile', 'ios', 'latest')),
          href: createHref('mobile', 'ios', 'latest'),
          id: 'mobile-ios',
          label: 'iOS',
          platform: 'ios',
          unavailableLabel: `iOS ${unavailableLabel}`,
        },
        {
          disabled: !actionAvailable(createHref('mobile', 'android', 'latest')),
          href: createHref('mobile', 'android', 'latest'),
          id: 'mobile-android',
          label: 'Android',
          platform: 'android',
          unavailableLabel: `Android ${unavailableLabel}`,
        },
        {
          disabled: !actionAvailable(createHref('mobile', 'harmonyos', 'latest')),
          href: createHref('mobile', 'harmonyos', 'latest'),
          id: 'mobile-harmonyos',
          label: 'HarmonyOS',
          platform: 'harmonyos',
          unavailableLabel: `HarmonyOS ${unavailableLabel}`,
        },
      ],
      description: translated(
        t,
        'home.mobile.desc',
        'Track routing health, account activity, and model usage from a mobile companion built for operators and builders.',
      ),
      icon: 'mobile',
      id: 'cloud-router-mobile',
      kind: 'mobile',
      primaryActionStrategy: 'detected-platform',
      title: translated(t, 'home.mobile.title', '{{productName}} Mobile', options.brandVariables),
      tone: 'mobile',
    },
  ];
}
