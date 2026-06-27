import type { SdkworkDownloadCard } from '@sdkwork/clawrouter-pc-downloads';
import defaultDownloadCatalog from './claw-router-downloads.json' with { type: 'json' };

type Translate = (
  key: string,
  fallback: string | {
    defaultValue?: string;
    [key: string]: unknown;
  },
) => string;

export interface CreateClawRouterDownloadCardsOptions {
  baseUrl?: string;
  catalog?: unknown;
  runtimeEnv?: Record<string, string | undefined>;
}

const DOWNLOAD_BASE_URL_ENV = 'VITE_CLAWROUTER_DOWNLOAD_BASE_URL';
const DOWNLOAD_CATALOG_SCHEMA_VERSION = '2026-05-18.sdkwork-download-catalog.v1';

export const clawRouterDownloadCatalog = defaultDownloadCatalog;

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

function localizeCatalogCard(card: SdkworkDownloadCard, t: Translate): SdkworkDownloadCard {
  const unavailableLabel = translated(t, 'home.download.unavailable', 'Coming soon');
  const titleById: Record<string, [string, string]> = {
    'claw-router-desktop': ['home.desktop.title', 'Claw Router Desktop'],
    'claw-router-server': ['home.server.title', 'Claw Router Server'],
    'claw-router-mobile': ['home.mobile.title', 'Claw Router Mobile'],
  };
  const descriptionById: Record<string, [string, string]> = {
    'claw-router-desktop': [
      'home.desktop.desc',
      'For developers and local environments. Includes a full graphical interface, visual API building, integrated Playground, and one-click app testing.',
    ],
    'claw-router-server': [
      'home.server.desc',
      'For production deployments. Optimized for headless execution, extreme throughput, containerization (Docker), and large-scale enterprise routing.',
    ],
    'claw-router-mobile': [
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
        ? translated(t, labelTranslation[0], labelTranslation[1])
        : action.label;
      return {
        ...action,
        ...(action.id === 'server-linux-x64'
          ? { ctaLabel: translated(t, 'home.server.get', action.ctaLabel ?? 'Get Server Edition') }
          : {}),
        label,
        unavailableLabel: action.unavailableLabel ?? `${label} ${unavailableLabel}`,
      };
    }),
    description: descriptionTranslation
      ? translated(t, descriptionTranslation[0], descriptionTranslation[1])
      : card.description,
    title: titleTranslation ? translated(t, titleTranslation[0], titleTranslation[1]) : card.title,
  };
}

export function createClawRouterDownloadCatalog(rawCatalog: unknown = defaultDownloadCatalog): {
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
    throw new Error('Claw Router download catalog must be a JSON object');
  }
  if (rawCatalog.schemaVersion !== DOWNLOAD_CATALOG_SCHEMA_VERSION) {
    throw new Error(`Claw Router download catalog schemaVersion must be ${DOWNLOAD_CATALOG_SCHEMA_VERSION}`);
  }
  if (!isRecord(rawCatalog.product)) {
    throw new Error('Claw Router download catalog product is required');
  }

  const productId = stringValue(rawCatalog.product.id)?.trim();
  const productName = stringValue(rawCatalog.product.name)?.trim();
  const productVersion = stringValue(rawCatalog.product.version)?.trim();
  if (!productId || !productName || !productVersion) {
    throw new Error('Claw Router download catalog product id, name, and version are required');
  }
  if (!Array.isArray(rawCatalog.cards)) {
    throw new Error('Claw Router download catalog cards must be an array');
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
    throw new Error('Claw Router download catalog must contain at least one valid card');
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

export function resolveClawRouterDownloadBaseUrl(
  runtimeEnv: Record<string, string | undefined> = {},
): string | undefined {
  return normalizeBaseUrl(runtimeEnv[DOWNLOAD_BASE_URL_ENV]);
}

export function createClawRouterDownloadCards(
  t: Translate,
  options: CreateClawRouterDownloadCardsOptions = {},
): SdkworkDownloadCard[] {
  const baseUrl = normalizeBaseUrl(options.baseUrl) ?? resolveClawRouterDownloadBaseUrl(options.runtimeEnv);
  const rawCatalog = options.catalog ?? (baseUrl ? undefined : defaultDownloadCatalog);
  if (rawCatalog !== undefined) {
    const catalog = createClawRouterDownloadCatalog(rawCatalog);
    return catalog.cards.map((card) => localizeCatalogCard(card, t));
  }
  const createHref = (...segments: string[]) => joinDownloadUrl(baseUrl, ...segments);
  const actionAvailable = (href: string) => href.length > 0;
  const unavailableLabel = translated(t, 'home.download.unavailable', 'Coming soon');

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
      id: 'claw-router-desktop',
      kind: 'desktop',
      primaryActionStrategy: 'detected-platform',
      title: translated(t, 'home.desktop.title', 'Claw Router Desktop'),
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
      id: 'claw-router-server',
      kind: 'server',
      primaryActionId: 'server-linux',
      title: translated(t, 'home.server.title', 'Claw Router Server'),
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
      ],
      description: translated(
        t,
        'home.mobile.desc',
        'Track routing health, account activity, and model usage from a mobile companion built for operators and builders.',
      ),
      icon: 'mobile',
      id: 'claw-router-mobile',
      kind: 'mobile',
      primaryActionStrategy: 'detected-platform',
      title: translated(t, 'home.mobile.title', 'Claw Router Mobile'),
      tone: 'mobile',
    },
  ];
}
