#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_WORKSPACE_ROOT = path.resolve(__dirname, '..');
const CLAWHUB_LIST_API = 'https://clawhub.ai/api/v1/skills';
const CLAWHUB_DETAIL_API_PREFIX = 'https://clawhub.ai/api/v1/skills/';
const RAW_INDEX_RELATIVE_PATH = 'data/skills/clawhub/raw/index.json';
const RAW_DETAILS_RELATIVE_PATH = 'data/skills/clawhub/raw/details';
const NORMALIZED_MANIFEST_RELATIVE_PATH = 'data/skills/clawhub/manifest.json';
const GENERATED_AT = '2026-05-10T00:00:00Z';
const OFFICIAL_CATEGORY_ID = 1901;
const CLAWHUB_CATEGORY_ID = 1902;
const OFFICIAL_PACKAGE_ID = 7101;
const CLAWHUB_PACKAGE_ID = 7201;
const CLAWHUB_SKILL_ID_START = 8201;
const CLAWHUB_ASSET_WIDTH = 1200;
const CLAWHUB_ASSET_HEIGHT = 720;
const DEFAULT_PAGE_SIZE = 200;
const DEFAULT_SEED_LIMIT = null;
const DEFAULT_DETAIL_CONCURRENCY = 8;
const DEFAULT_HTTP_TIMEOUT_MS = 30_000;
const PREFERRED_CLAWHUB_SKILL_SLUGS = [
  'mcp',
  'browser-use',
  'browser',
  'playwright',
  'openai',
  'github',
  'figma',
  'notion',
  'postgres',
  'sqlite',
  'python',
  'typescript',
];

function printHelp() {
  console.log(`Usage: node scripts/mirror-clawhub-skills-seed.mjs [options]

Mirror ClawHub skills into local seed data. Runtime startup reads only local data/skills files.

Options:
  --fetch                 Fetch the ClawHub public full list API and detail API into local raw mirror files.
  --from-mirror           Rebuild SDKWork seed projection from existing local raw mirror files.
  --check                 Check local mirror and seed projection without network or writes.
  --workspace-root <path> Workspace root, default current sdkwork-clawrouter root.
  --page-size <number>    List page size for full-cursor-mirror crawling, default ${DEFAULT_PAGE_SIZE}.
  --max-items <number>    Development-only cap for bounded crawls. Omit for full-cursor-mirror.
  --seed-limit <number|all>
                         Number of ClawHub community skills projected into startup seed, default all mirrored details.
  --detail-concurrency <n>
                         Parallel detail fetches for full mirror, default ${DEFAULT_DETAIL_CONCURRENCY}.
  --http-timeout-ms <n>  Per-request timeout in milliseconds, default ${DEFAULT_HTTP_TIMEOUT_MS}.
  --sort <field>          ClawHub list sort field, default createdAt.
  --json                  Print machine-readable summary.
  -h, --help              Show this help.

Examples:
  pnpm skills:seed:mirror-clawhub
  pnpm skills:seed:mirror-clawhub -- --max-items 200
  pnpm skills:seed:check
`);
}

function nextValue(argv, index, name) {
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function positiveInteger(value, name) {
  const parsed = Number.parseInt(`${value}`, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function seedLimitValue(value, name) {
  if (`${value}`.trim().toLowerCase() === 'all') {
    return null;
  }
  return positiveInteger(value, name);
}

function mediaResource(value, kind = 'image') {
  const locator = normalizeText(value);
  if (!locator) {
    throw new Error(`MediaResource ${kind} locator must not be empty`);
  }
  const source = locator.startsWith('http://') || locator.startsWith('https://')
    ? 'external_url'
    : locator.startsWith('data:')
      ? 'data_url'
      : 'provider_asset';
  if (source === 'provider_asset') {
    return { kind, source, uri: locator };
  }
  return { kind, source, url: locator, publicUrl: locator };
}

export function parseClawHubMirrorArgs(argv) {
  const settings = {
    fetch: false,
    fromMirror: false,
    check: false,
    workspaceRoot: DEFAULT_WORKSPACE_ROOT,
    pageSize: DEFAULT_PAGE_SIZE,
    maxItems: null,
    seedLimit: DEFAULT_SEED_LIMIT,
    detailConcurrency: DEFAULT_DETAIL_CONCURRENCY,
    httpTimeoutMs: DEFAULT_HTTP_TIMEOUT_MS,
    sort: 'createdAt',
    json: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    switch (arg) {
      case '--fetch':
        settings.fetch = true;
        break;
      case '--from-mirror':
        settings.fromMirror = true;
        break;
      case '--check':
        settings.check = true;
        break;
      case '--workspace-root':
        settings.workspaceRoot = path.resolve(nextValue(argv, index, arg));
        index += 1;
        break;
      case '--page-size':
        settings.pageSize = positiveInteger(nextValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--max-items':
        settings.maxItems = positiveInteger(nextValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--seed-limit':
        settings.seedLimit = seedLimitValue(nextValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--detail-concurrency':
        settings.detailConcurrency = positiveInteger(nextValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--http-timeout-ms':
        settings.httpTimeoutMs = positiveInteger(nextValue(argv, index, arg), arg);
        index += 1;
        break;
      case '--sort':
        settings.sort = nextValue(argv, index, arg).trim();
        if (!/^[A-Za-z0-9_-]+$/u.test(settings.sort)) {
          throw new Error('--sort must be a simple field name');
        }
        index += 1;
        break;
      case '--json':
        settings.json = true;
        break;
      case '--help':
      case '-h':
        settings.help = true;
        break;
      case '--':
        break;
      default:
        throw new Error(`unknown ClawHub skill seed option: ${arg}`);
    }
  }

  if (settings.check && settings.fetch) {
    throw new Error('--check cannot be combined with --fetch');
  }
  if (!settings.fetch && !settings.check) {
    settings.fromMirror = true;
  }
  if (settings.fetch) {
    settings.fromMirror = true;
  }

  return settings;
}

export function buildClawHubMirrorCommandPlan(settings, { workspaceRoot = settings.workspaceRoot } = {}) {
  const mode = settings.check ? 'check' : settings.fetch ? 'fetch-and-project' : 'project-from-mirror';
  const steps = [];
  if (settings.fetch) {
    steps.push({
      name: 'mirror-clawhub-raw-skills',
      mode,
      api: CLAWHUB_LIST_API,
      pageSize: settings.pageSize,
      maxItems: settings.maxItems,
      detailConcurrency: settings.detailConcurrency,
    });
  }
  steps.push({
    name: settings.check ? 'check-clawhub-local-seed' : 'project-clawhub-local-seed',
    mode,
    rawIndex: path.join(workspaceRoot, RAW_INDEX_RELATIVE_PATH),
    rawDetails: path.join(workspaceRoot, RAW_DETAILS_RELATIVE_PATH),
    normalizedManifest: path.join(workspaceRoot, NORMALIZED_MANIFEST_RELATIVE_PATH),
  });
  return { mode, workspaceRoot, steps };
}

async function fetchJson(url, { timeoutMs = DEFAULT_HTTP_TIMEOUT_MS, attempts = 3 } = {}) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          accept: 'application/json',
          'user-agent': 'sdkwork-clawrouter-skill-mirror/1.0',
        },
      });
      if (!response.ok) {
        const body = await response.text();
        throw new Error(`ClawHub request failed ${response.status} ${response.statusText}: ${url}\n${body.slice(0, 500)}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(500 * attempt);
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  throw lastError;
}

async function fetchClawHubRawMirror(settings) {
  const rawRoot = path.join(settings.workspaceRoot, 'data', 'skills', 'clawhub', 'raw');
  const detailsRoot = path.join(settings.workspaceRoot, RAW_DETAILS_RELATIVE_PATH);
  const errorsRoot = path.join(rawRoot, 'errors');
  const pagesRoot = path.join(rawRoot, 'pages');
  await fs.mkdir(detailsRoot, { recursive: true });
  await fs.mkdir(errorsRoot, { recursive: true });
  await fs.mkdir(pagesRoot, { recursive: true });

  const checkpoint = await loadMirrorCheckpoint(settings.workspaceRoot);
  const items = checkpoint?.items ?? [];
  const pages = checkpoint?.pages ?? [];
  let cursor = checkpoint?.nextCursor ?? null;
  let pageNo = pages.length;
  let seenRequestCursors = new Set(pages.map((page) => `${page.requestCursor ?? ''}`));
  const fetchedAt = checkpoint?.fetchedAt ?? new Date().toISOString();
  const resumeAllowed = settings.maxItems === null
    || checkpoint?.maxItems === null
    || checkpoint?.maxItems === settings.maxItems;
  if (checkpoint && !resumeAllowed) {
    items.length = 0;
    pages.length = 0;
    cursor = null;
    pageNo = 0;
    seenRequestCursors = new Set();
  }

  while (!checkpoint || cursor !== null || pageNo === 0) {
    pageNo += 1;
    const requestCursor = cursor;
    if (seenRequestCursors.has(`${requestCursor ?? ''}`)) {
      throw new Error(`ClawHub pagination cursor repeated before page ${pageNo}; refusing infinite mirror loop`);
    }
    seenRequestCursors.add(`${requestCursor ?? ''}`);
    const url = new URL(CLAWHUB_LIST_API);
    url.searchParams.set('limit', `${settings.pageSize}`);
    url.searchParams.set('sort', settings.sort);
    if (requestCursor) {
      url.searchParams.set('cursor', cursor);
    }
    const payload = await fetchJson(url, { timeoutMs: settings.httpTimeoutMs });
    const pageItems = Array.isArray(payload.items) ? payload.items.filter((item) => typeof item?.slug === 'string') : [];
    const remaining = settings.maxItems === null ? pageItems.length : Math.max(0, settings.maxItems - items.length);
    const acceptedItems = settings.maxItems === null ? pageItems : pageItems.slice(0, remaining);
    items.push(...acceptedItems);
    const page = {
      pageNo,
      requestCursor,
      url: url.toString(),
      itemCount: acceptedItems.length,
      nextCursor: payload.nextCursor ?? null,
    };
    pages.push(page);
    await writeJson(path.join(pagesRoot, `${String(pageNo).padStart(5, '0')}.json`), {
      ...page,
      fetchedAt: new Date().toISOString(),
      items: acceptedItems,
    });
    await writeMirrorCheckpoint(settings.workspaceRoot, {
      schemaVersion: 'clawhub-skills-mirror-checkpoint.v1',
      source: {
        listApi: CLAWHUB_LIST_API,
        detailApiTemplate: `${CLAW_HUB_DETAIL_API_TEMPLATE()}`,
        sort: settings.sort,
        pageSize: settings.pageSize,
      },
      fetchedAt,
      maxItems: settings.maxItems,
      totalItems: dedupeBy(items, (item) => item.slug).length,
      nextCursor: payload.nextCursor ?? null,
      pages,
      items: dedupeBy(items, (item) => item.slug),
    });
    if (settings.maxItems !== null && items.length >= settings.maxItems) {
      cursor = payload.nextCursor ?? null;
      break;
    }
    if (!payload.nextCursor || pageItems.length === 0) {
      cursor = null;
      break;
    }
    if (!settings.json && pageNo % 25 === 0) {
      console.error(`[skills-seed] mirrored list pages=${pageNo} items=${items.length}`);
    }
    cursor = payload.nextCursor;
  }

  const uniqueItems = dedupeBy(items, (item) => item.slug);
  if (!settings.json) {
    console.error(`[skills-seed] fetching detail payloads for ${uniqueItems.length} mirrored ClawHub skills`);
  }
  let fetchedDetailCount = 0;
  let skippedDetailErrorCount = 0;
  await mapWithConcurrency(uniqueItems, settings.detailConcurrency, async (item) => {
    const slug = normalizeSlug(item.slug);
    if (!slug) {
      return;
    }
    const detailPath = path.join(detailsRoot, mirrorFileName(slug));
    const legacyDetailPath = legacyMirrorPath(detailsRoot, slug);
    const errorPath = path.join(errorsRoot, mirrorFileName(slug));
    const existing = await readJsonIfExists(detailPath);
    const legacyExisting = await readJsonIfExists(legacyDetailPath);
    if (existing?.skill?.slug === slug || legacyExisting?.skill?.slug === slug) {
      if (!existing && legacyExisting?.skill?.slug === slug) {
        await writeJson(detailPath, legacyExisting);
      }
      return;
    }
    const existingError = await readJsonIfExists(errorPath);
    if (existingError?.slug === slug) {
      skippedDetailErrorCount += 1;
      return;
    }
    try {
      const detail = await fetchJson(`${CLAWHUB_DETAIL_API_PREFIX}${encodeURIComponent(slug)}`, {
        timeoutMs: settings.httpTimeoutMs,
      });
      await writeJson(detailPath, detail);
    } catch (error) {
      await writeJson(errorPath, {
        schemaVersion: 'clawhub-skill-detail-error.v1',
        slug,
        url: `${CLAWHUB_DETAIL_API_PREFIX}${encodeURIComponent(slug)}`,
        fetchedAt: new Date().toISOString(),
        message: error instanceof Error ? error.message : `${error}`,
      });
      skippedDetailErrorCount += 1;
      return;
    }
    fetchedDetailCount += 1;
    if (!settings.json && fetchedDetailCount % 500 === 0) {
      console.error(`[skills-seed] mirrored new detail payloads=${fetchedDetailCount}/${uniqueItems.length}`);
    }
  });
  const detailStatus = await readDetailStatus(rawRoot, uniqueItems);

  const index = {
    schemaVersion: 'clawhub-skills-mirror.v1',
    mirrorMode: settings.maxItems === null ? 'full-cursor-mirror' : 'bounded-cursor-mirror',
    source: {
      listApi: CLAWHUB_LIST_API,
      detailApiTemplate: `${CLAW_HUB_DETAIL_API_TEMPLATE()}`,
      sort: settings.sort,
      pageSize: settings.pageSize,
    },
    fetchedAt,
    maxItems: settings.maxItems,
    totalItems: uniqueItems.length,
    detailStatus,
    nextCursor: settings.maxItems === null ? null : cursor,
    pages,
    items: uniqueItems.map((item) => {
      const slug = normalizeSlug(item.slug);
      return {
        ...item,
        rawDetailPath: slug ? `data/skills/clawhub/raw/details/${mirrorFileName(slug)}` : null,
        rawErrorPath: slug ? `data/skills/clawhub/raw/errors/${mirrorFileName(slug)}` : null,
      };
    }),
  };
  await fs.mkdir(rawRoot, { recursive: true });
  await writeJson(path.join(settings.workspaceRoot, RAW_INDEX_RELATIVE_PATH), index);
  return index;
}

async function readDetailStatus(rawRoot, items = []) {
  const detailsRoot = path.join(rawRoot, 'details');
  const errorsRoot = path.join(rawRoot, 'errors');
  if (!Array.isArray(items) || items.length === 0) {
    const detailCount = await countJsonFiles(detailsRoot);
    const errorCount = await countJsonFiles(errorsRoot);
    return {
      detailCount,
      errorCount,
      completeCount: detailCount + errorCount,
    };
  }
  let detailCount = 0;
  let errorCount = 0;
  for (const item of items) {
    const slug = normalizeSlug(item?.slug);
    if (!slug) {
      continue;
    }
    if (await readJsonIfExists(path.join(detailsRoot, mirrorFileName(slug)))) {
      detailCount += 1;
      continue;
    }
    if (await readJsonIfExists(path.join(errorsRoot, mirrorFileName(slug)))) {
      errorCount += 1;
    }
  }
  return {
    detailCount,
    errorCount,
    completeCount: detailCount + errorCount,
  };
}

async function countJsonFiles(directory) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json')).length;
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mirrorFileName(slug) {
  const normalized = normalizeSlug(slug);
  const prefix = normalized.slice(0, 80).replace(/-+$/u, '') || 'skill';
  const digest = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 16);
  return `${prefix}-${digest}.json`;
}

function legacyMirrorPath(root, slug) {
  const normalized = normalizeSlug(slug);
  if (normalized.length > 120) {
    return null;
  }
  return path.join(root, `${normalized}.json`);
}

async function loadMirrorCheckpoint(workspaceRoot) {
  const checkpoint = await readJsonIfExists(path.join(workspaceRoot, 'data', 'skills', 'clawhub', 'raw', 'checkpoint.json'));
  if (!checkpoint || checkpoint.schemaVersion !== 'clawhub-skills-mirror-checkpoint.v1') {
    return null;
  }
  return checkpoint;
}

async function writeMirrorCheckpoint(workspaceRoot, checkpoint) {
  await writeJson(path.join(workspaceRoot, 'data', 'skills', 'clawhub', 'raw', 'checkpoint.json'), checkpoint);
}

function CLAW_HUB_DETAIL_API_TEMPLATE() {
  return `${CLAW_HUB_DETAIL_API_BASE()}{slug}`;
}

function CLAW_HUB_DETAIL_API_BASE() {
  return CLAWHUB_DETAIL_API_PREFIX;
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function readJsonIfExists(filePath) {
  if (!filePath) {
    return null;
  }
  try {
    return await readJson(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, renderJson(value), 'utf8');
}

function renderJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function sha256Text(text) {
  return `sha256:${crypto.createHash('sha256').update(text).digest('hex')}`;
}

function artifactPayloadChecksum(payload) {
  const canonical = { ...payload };
  delete canonical.checksumHash;
  return sha256Text(stableJson(canonical));
}

function sourceHash(value) {
  return sha256Text(stableJson(value));
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(item);
  }
  return result;
}

async function mapWithConcurrency(items, concurrency, task) {
  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, async (_, workerIndex) => {
    for (let index = workerIndex; index < items.length; index += concurrency) {
      await task(items[index], index);
    }
  });
  await Promise.all(workers);
}

function normalizeSlug(value) {
  return `${value ?? ''}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .replace(/-{2,}/gu, '-');
}

function normalizeVersion(value) {
  const raw = `${value ?? ''}`.trim();
  if (/^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9._-]+)?$/u.test(raw)) {
    return raw;
  }
  if (/^\d+\.\d+$/u.test(raw)) {
    return `${raw}.0`;
  }
  if (/^\d+$/u.test(raw)) {
    return `${raw}.0.0`;
  }
  return '1.0.0';
}

function normalizeText(value, fallback = '') {
  const normalized = sanitizeText(`${value ?? ''}`).replace(/\s+/gu, ' ').trim();
  return normalized || fallback;
}

function sanitizeText(value) {
  return `${value ?? ''}`
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, ' ')
    .replace(/\uFFFD/gu, ' ')
    .replace(/[锛�€�]/gu, ' ')
    .replace(/鈥[^\s]*/gu, ' ')
    .trim();
}

function readableTextScore(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return 0;
  }
  const chars = Array.from(normalized);
  const readable = chars.filter((char) => /[A-Za-z0-9 .,;:!?()[\]{}'"@/#&+_-]/u.test(char)).length;
  return readable / chars.length;
}

function truncateText(value, maxLength) {
  const normalized = normalizeText(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 1)).trimEnd()}.`;
}

function dateFromMillis(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return GENERATED_AT;
  }
  return new Date(value).toISOString();
}

function ratingFromStats(stats) {
  const stars = Number(stats?.stars ?? 0);
  if (stars >= 20) {
    return '4.8';
  }
  if (stars >= 5) {
    return '4.6';
  }
  return '4.3';
}

function scoreDetail(detail) {
  const slug = normalizeSlug(detail?.skill?.slug);
  const preferredIndex = PREFERRED_CLAWHUB_SKILL_SLUGS.indexOf(slug);
  const preferredScore = preferredIndex >= 0 ? (PREFERRED_CLAWHUB_SKILL_SLUGS.length - preferredIndex) * 1_000_000 : 0;
  const readabilityScore = readableTextScore(`${detail?.skill?.displayName ?? ''} ${detail?.skill?.summary ?? ''}`) * 100_000;
  const stats = detail?.skill?.stats ?? {};
  const downloads = Number(stats.downloads ?? 0);
  const installs = Number(stats.installsAllTime ?? stats.installsCurrent ?? 0);
  const stars = Number(stats.stars ?? 0);
  const updatedAt = Number(detail?.skill?.updatedAt ?? 0);
  return preferredScore + readabilityScore + downloads + installs * 10 + stars * 100 + Math.floor(updatedAt / 1_000_000_000);
}

function detailSlug(detail) {
  return normalizeSlug(detail?.skill?.slug);
}

function shortClawHubSeedUuid(kind, slug, suffix = '') {
  const normalizedSlug = normalizeSlug(slug);
  const normalizedSuffix = normalizeSlug(suffix);
  const suffixPart = normalizedSuffix ? `-${normalizedSuffix}` : '';
  const digest = crypto.createHash('sha256').update(normalizedSlug).digest('hex').slice(0, 12);
  const base = `skill-${kind}-clawhub-`;
  const maxSlugLength = Math.max(1, 64 - base.length - digest.length - suffixPart.length - 1);
  const slugPrefix = normalizedSlug.slice(0, maxSlugLength).replace(/-+$/u, '') || 'skill';
  return `${base}${slugPrefix}-${digest}${suffixPart}`;
}

function deriveFeatureLines(detail) {
  const summary = normalizeText(detail?.skill?.summary);
  const changelog = normalizeText(detail?.latestVersion?.changelog);
  const source = summary || changelog || 'Community skill mirrored from ClawHub.';
  const candidates = source
    .split(/(?:\. |; |\n|- )/u)
    .map((item) => truncateText(item, 96))
    .filter((item) => item.length >= 8);
  return dedupeBy(candidates, (item) => item.toLowerCase()).slice(0, 4);
}

function deriveFrameworks(detail) {
  const text = `${detail?.skill?.summary ?? ''} ${detail?.latestVersion?.changelog ?? ''}`.toLowerCase();
  const frameworks = ['ClawHub', 'Agent Skill'];
  if (text.includes('mcp') || text.includes('model context protocol')) {
    frameworks.push('MCP');
  }
  if (text.includes('typescript') || text.includes('node')) {
    frameworks.push('TypeScript');
  }
  if (text.includes('python')) {
    frameworks.push('Python');
  }
  return frameworks;
}

function deriveCapabilities(detail) {
  const slug = detailSlug(detail);
  const text = `${slug} ${detail?.skill?.summary ?? ''}`.toLowerCase();
  const capabilities = ['clawhub.metadata'];
  if (text.includes('mcp')) {
    capabilities.push('mcp.discovery');
  }
  if (text.includes('browser')) {
    capabilities.push('browser.automation');
  }
  if (text.includes('api')) {
    capabilities.push('api.integration');
  }
  return dedupeBy(capabilities, (item) => item);
}

function buildOfficialCategories() {
  return [
    {
      id: OFFICIAL_CATEGORY_ID,
      uuid: 'skill-category-sdkwork-official',
      name: 'SDKWork Official',
      description: 'Official SDKWork skills with verified runtime contracts, commercial support, and first-class product placement.',
      shopId: 0,
      type: 19,
      groupName: 'official',
      code: 'sdkwork-official',
      tags: ['sdkwork', 'official', 'featured'],
      icon: mediaResource('badge-check'),
      sortWeight: 1,
      parentId: null,
      path: '/skills/sdkwork-official',
      visible: true,
      status: 1,
    },
    {
      id: CLAWHUB_CATEGORY_ID,
      uuid: 'skill-category-clawhub-community',
      name: 'ClawHub Community',
      description: 'Community skills mirrored from ClawHub into local SDKWork seed data for offline startup and review.',
      shopId: 0,
      type: 19,
      groupName: 'community',
      code: 'clawhub-community',
      tags: ['clawhub', 'community', 'mirror'],
      icon: mediaResource('store'),
      sortWeight: 20,
      parentId: null,
      path: '/skills/clawhub-community',
      visible: true,
      status: 1,
    },
  ];
}

function buildPackages() {
  return [
    {
      id: OFFICIAL_PACKAGE_ID,
      uuid: 'skill-package-sdkwork-official-skills',
      userId: 0,
      packageKey: 'sdkwork-official-skills',
      name: 'SDKWork Official Skills',
      summary: 'Verified SDKWork skill package for prompt, retrieval, and workflow execution.',
      description: 'A curated official package of production-ready SDKWork skills that are bundled, supported, and safe for first-run SkillsHub initialization.',
      icon: mediaResource('https://cdn.sdkwork.example/skills/packages/sdkwork-official-skills/icon.png'),
      cover: mediaResource('https://cdn.sdkwork.example/skills/packages/sdkwork-official-skills/cover.png'),
      categoryId: OFFICIAL_CATEGORY_ID,
      enabled: true,
      featured: true,
      sortWeight: 1,
      tags: ['sdkwork', 'official', 'starter'],
      latestPublishedAt: GENERATED_AT,
    },
    {
      id: CLAWHUB_PACKAGE_ID,
      uuid: 'skill-package-clawhub-community-mirror',
      userId: 0,
      packageKey: 'clawhub-community-mirror',
      name: 'ClawHub Community Mirror',
      summary: 'Local projection of community skills mirrored from the ClawHub public catalog.',
      description: 'ClawHub community skills are crawled into a local raw mirror and projected as metadata-only marketplace entries until their execution artifacts are reviewed.',
      icon: mediaResource('https://cdn.sdkwork.example/skills/packages/clawhub-community-mirror/icon.png'),
      cover: mediaResource('https://cdn.sdkwork.example/skills/packages/clawhub-community-mirror/cover.png'),
      categoryId: CLAWHUB_CATEGORY_ID,
      enabled: true,
      featured: false,
      sortWeight: 20,
      tags: ['clawhub', 'community', 'mirror'],
      latestPublishedAt: GENERATED_AT,
    },
  ];
}

async function loadRawMirror(workspaceRoot) {
  const rawIndex = await readJson(path.join(workspaceRoot, RAW_INDEX_RELATIVE_PATH));
  const detailsRoot = path.join(workspaceRoot, RAW_DETAILS_RELATIVE_PATH);
  const details = [];
  const missingDetails = [];
  for (const item of rawIndex.items ?? []) {
    const slug = normalizeSlug(item.slug);
    if (!slug) {
      continue;
    }
    const detailPath = path.join(detailsRoot, mirrorFileName(slug));
    const legacyDetailPath = legacyMirrorPath(detailsRoot, slug);
    const detail = await readJsonIfExists(detailPath) ?? await readJsonIfExists(legacyDetailPath);
    if (!detail) {
      missingDetails.push(slug);
      continue;
    }
    details.push(detail);
  }
  return { rawIndex, details, missingDetails };
}

async function buildSkillSeedBundle(settings) {
  const skillsRoot = path.join(settings.workspaceRoot, 'data', 'skills');
  const [baseSkills, baseAssets, baseArtifacts] = await Promise.all([
    readJson(path.join(skillsRoot, 'skills.json')),
    readJson(path.join(skillsRoot, 'assets.json')),
    readJson(path.join(skillsRoot, 'artifacts.json')),
  ]);
  const { rawIndex, details, missingDetails } = await loadRawMirror(settings.workspaceRoot);
  if (missingDetails.length > 0) {
    const errorRoot = path.join(settings.workspaceRoot, 'data', 'skills', 'clawhub', 'raw', 'errors');
    const unresolved = [];
    for (const slug of missingDetails) {
      const error = await readJsonIfExists(path.join(errorRoot, mirrorFileName(slug)));
      if (!error) {
        unresolved.push(slug);
      }
    }
    if (unresolved.length > 0) {
      throw new Error(`ClawHub raw mirror is incomplete; missing detail or error files for: ${unresolved.slice(0, 20).join(', ')}`);
    }
  }

  const officialSkills = baseSkills
    .filter((skill) => skill.sourceType === 'OFFICIAL' && skill.provider === 'SDKWork')
    .map((skill, index) => ({
      ...skill,
      categoryId: OFFICIAL_CATEGORY_ID,
      packageId: OFFICIAL_PACKAGE_ID,
      sourceType: 'OFFICIAL',
      provider: 'SDKWork',
      builtin: true,
      isBuiltin: true,
      enabled: true,
      featured: true,
      recommendWeight: Math.max(Number(skill.recommendWeight ?? 0), 100 - index * 10),
      marketStatus: 'PUBLISHED',
      visibility: 'PUBLIC',
      reviewStatus: 'APPROVED',
      tags: dedupeBy([...(skill.tags ?? []), 'sdkwork', 'official'], (item) => item),
    }));
  if (officialSkills.length < 3) {
    throw new Error('SDKWork Official seed requires at least three official skills');
  }

  const selectedDetails = selectClawHubSeedDetails(details, settings.seedLimit);
  const community = buildCommunityProjection(selectedDetails, rawIndex);
  const officialSkillIds = new Set(officialSkills.map((skill) => skill.id));
  const categories = buildOfficialCategories();
  const packages = buildPackages();
  const skills = [...officialSkills, ...community.skills];
  const assets = [
    ...baseAssets.filter((asset) => officialSkillIds.has(asset.targetId)),
    ...community.assets,
  ];
  const artifacts = [
    ...baseArtifacts.filter((artifact) => officialSkillIds.has(artifact.targetId)),
    ...community.artifacts,
  ];
  const normalizedManifest = {
    schemaVersion: 'sdkwork-clawhub-skills-projection.v1',
    mirrorMode: rawIndex.mirrorMode,
    source: rawIndex.source,
    generatedAt: GENERATED_AT,
    mirroredSkillCount: Number(rawIndex.totalItems ?? details.length),
    seededSkillCount: community.skills.length,
    sourceHash: sourceHash(rawIndex),
    seededSkills: community.skills.map((skill) => ({
      id: skill.id,
      skillKey: skill.skillKey,
      slug: skill.source.slug,
      name: skill.name,
      version: skill.version,
      url: skill.source.url,
    })),
  };
  return {
    rawIndex,
    categories,
    packages,
    skills,
    assets,
    artifacts,
    normalizedManifest,
    communityManifests: community.manifests,
    communityArtifactPayloads: community.artifactPayloads,
  };
}

async function refreshRawMirrorDetailStatus(workspaceRoot, rawIndex) {
  const rawRoot = path.join(workspaceRoot, 'data', 'skills', 'clawhub', 'raw');
  const detailStatus = await readDetailStatus(rawRoot, rawIndex.items ?? []);
  const items = (rawIndex.items ?? []).map((item) => {
    const slug = normalizeSlug(item?.slug);
    return {
      ...item,
      rawDetailPath: slug ? `data/skills/clawhub/raw/details/${mirrorFileName(slug)}` : item.rawDetailPath ?? null,
      rawErrorPath: slug ? `data/skills/clawhub/raw/errors/${mirrorFileName(slug)}` : item.rawErrorPath ?? null,
    };
  });
  return {
    ...rawIndex,
    detailStatus,
    items,
  };
}

function selectClawHubSeedDetails(details, seedLimit) {
  const usable = details
    .filter((detail) => detailSlug(detail))
    .filter((detail) => normalizeText(detail?.skill?.displayName || detail?.skill?.slug))
    .sort((left, right) => scoreDetail(right) - scoreDetail(left) || detailSlug(left).localeCompare(detailSlug(right)));
  const deduped = dedupeBy(usable, detailSlug);
  return seedLimit === null ? deduped : deduped.slice(0, seedLimit);
}

function buildCommunityProjection(details, rawIndex) {
  const skills = [];
  const assets = [];
  const artifacts = [];
  const manifests = [];
  const artifactPayloads = [];
  const fetchedAt = rawIndex.fetchedAt || GENERATED_AT;

  details.forEach((detail, index) => {
    const slug = detailSlug(detail);
    const id = CLAWHUB_SKILL_ID_START + index;
    const version = normalizeVersion(detail?.latestVersion?.version || detail?.skill?.tags?.latest);
    const skillKey = `clawhub-${slug}`;
    const name = truncateText(detail?.skill?.displayName || slug, 128);
    const summary = truncateText(detail?.skill?.summary || detail?.latestVersion?.changelog || `ClawHub community skill ${name}.`, 240);
    const description = truncateText(detail?.latestVersion?.changelog || detail?.skill?.summary || summary, 2000);
    const sourceUrl = `https://clawhub.ai/skills/${slug}`;
    const artifactRef = `clawhub://skills/${slug}@${version}`;
    const artifactPath = `data/skills/artifacts/clawhub-${slug}-${version}.json`;
    const manifestUrl = `data/skills/manifests/clawhub-${slug}.json`;
    const frameworks = deriveFrameworks(detail);
    const features = deriveFeatureLines(detail);
    const owner = detail?.owner ?? {};
    const ownerName = normalizeText(owner.displayName || owner.handle, 'ClawHub Community');
    const ownerImage = normalizeText(owner.image);
    const image = ownerImage.startsWith('https://')
      ? ownerImage
      : `https://cdn.sdkwork.example/skills/clawhub/${slug}/cover.png`;
    const capabilities = deriveCapabilities(detail);
    const publishedAt = dateFromMillis(detail?.latestVersion?.createdAt || detail?.skill?.createdAt);
    const updatedAt = dateFromMillis(detail?.skill?.updatedAt || detail?.skill?.createdAt);
    const installCount = Math.max(
      1,
      Number(detail?.skill?.stats?.downloads ?? 0),
      Number(detail?.skill?.stats?.installsAllTime ?? 0),
      Number(detail?.skill?.stats?.installsCurrent ?? 0),
    );
    const ratingCount = Math.max(1, Number(detail?.skill?.stats?.stars ?? 0), Math.floor(installCount / 50));
    const defaultConfig = {
      portal: {
        developer: ownerName,
        features,
        frameworks,
        sizeText: 'Metadata',
        clawhubImage: artifactRef,
        screenshots: [image],
      },
      source: {
        vendor: 'clawhub',
        slug,
        url: sourceUrl,
      },
    };
    const configSchema = {
      type: 'object',
      properties: {},
      additionalProperties: false,
    };
    const skill = {
      id,
      uuid: `skill-clawhub-${slug}`,
      userId: 0,
      skillKey,
      name,
      summary,
      description,
      icon: mediaResource(image),
      cover: mediaResource(image),
      categoryId: CLAWHUB_CATEGORY_ID,
      packageId: CLAWHUB_PACKAGE_ID,
      provider: 'ClawHub',
      version,
      versionName: version,
      runtime: 'metadata',
      entrypoint: `clawhub.skills.${slug.replaceAll('-', '_')}`,
      manifestUrl,
      repositoryUrl: sourceUrl,
      homepageUrl: sourceUrl,
      documentationUrl: sourceUrl,
      licenseName: normalizeText(detail?.latestVersion?.license, 'ClawHub Community'),
      sourceType: 'COMMUNITY',
      marketStatus: 'PUBLISHED',
      visibility: 'PUBLIC',
      reviewStatus: 'APPROVED',
      reviewComment: 'Community metadata mirrored from ClawHub raw local catalog.',
      reviewedBy: 0,
      reviewedAt: GENERATED_AT,
      builtin: false,
      isBuiltin: false,
      enabled: true,
      featured: index < 3,
      recommendWeight: Math.max(1, 80 - index),
      price: '0',
      currency: 'CNY',
      installCount,
      ratingAvg: ratingFromStats(detail?.skill?.stats),
      ratingCount,
      tags: dedupeBy(['clawhub', 'community', slug, ...frameworks.map((item) => item.toLowerCase())], (item) => item).slice(0, 16),
      capabilities,
      configSchema,
      defaultConfig,
      source: {
        vendor: 'clawhub',
        slug,
        url: sourceUrl,
        fetchedAt,
        rawDetailPath: `data/skills/clawhub/raw/details/${mirrorFileName(slug)}`,
      },
      latestPublishedAt: publishedAt,
    };
    const artifactPayload = {
      schemaVersion: 'agent-skill-artifact.v1',
      artifactRef,
      version,
      runtime: 'metadata',
      entrypoint: skill.entrypoint,
      skill: {
        id,
        skillKey,
        name,
      },
      source: skill.source,
      instructions: [
        'Display this bundled ClawHub metadata entry from the local SDKWork Skills seed.',
        'Do not execute remote code from this artifact until the community package has passed SDKWork review.',
        summary,
      ],
      inputSchema: {
        type: 'object',
        additionalProperties: false,
      },
      outputSchema: {
        type: 'object',
        properties: {
          sourceUrl: { type: 'string' },
          slug: { type: 'string' },
        },
        additionalProperties: true,
      },
      metadata: {
        owner,
        stats: detail?.skill?.stats ?? {},
        latestVersion: detail?.latestVersion ?? {},
      },
    };
    artifactPayload.checksumHash = artifactPayloadChecksum(artifactPayload);
    const renderedArtifact = renderJson(artifactPayload);
    const artifactSizeBytes = Buffer.byteLength(renderedArtifact, 'utf8');
    const artifact = {
      uuid: shortClawHubSeedUuid('artifact', slug),
      targetType: 35,
      targetId: id,
      artifactType: 1,
      version,
      platformType: 'agent',
      osName: 'metadata',
      artifactRef,
      artifact: mediaResource(artifactPath, 'document'),
      artifactSizeBytes,
      runtime: 'metadata',
      frameworks,
      licenseName: skill.licenseName,
      checksumHash: artifactPayload.checksumHash,
      releaseNotes: truncateText(detail?.latestVersion?.changelog || summary, 500),
      publishedAt,
      deprecatedAt: null,
    };
    const manifest = {
      schemaVersion: 'agent-skill-manifest.v1',
      id,
      uuid: skill.uuid,
      skillKey,
      name,
      summary,
      version,
      runtime: 'metadata',
      entrypoint: skill.entrypoint,
      provider: 'ClawHub',
      licenseName: skill.licenseName,
      capabilities,
      configSchema,
      defaultConfig,
      source: skill.source,
      artifacts: [
        {
          artifactRef,
          artifact: mediaResource(artifactPath, 'document'),
          version,
          runtime: 'metadata',
          checksumHash: artifact.checksumHash,
          artifactSizeBytes,
        },
      ],
      permissions: {
        network: false,
        filesystem: 'none',
        secrets: [],
      },
      publishedAt,
    };
    assets.push({
      uuid: shortClawHubSeedUuid('asset', slug, 'cover'),
      targetType: 35,
      targetId: id,
      artifactId: null,
      assetType: 1,
      asset: mediaResource(image),
      thumbnail: mediaResource(image),
      title: `${name} cover`,
      altText: `${name} ClawHub community skill preview`,
      mimeType: 'image/png',
      width: CLAWHUB_ASSET_WIDTH,
      height: CLAWHUB_ASSET_HEIGHT,
      durationSeconds: null,
      fileSize: 0,
      sortOrder: 1,
      publishedAt,
    });
    skills.push(skill);
    artifacts.push(artifact);
    manifests.push({
      path: `data/skills/manifests/clawhub-${slug}.json`,
      value: manifest,
    });
    artifactPayloads.push({
      path: artifactPath,
      value: artifactPayload,
    });
  });

  return { skills, assets, artifacts, manifests, artifactPayloads };
}

async function writeSkillSeedBundle(settings, bundle) {
  const root = settings.workspaceRoot;
  await writeJson(path.join(root, 'data/skills/categories.json'), bundle.categories);
  await writeJson(path.join(root, 'data/skills/packages.json'), bundle.packages);
  await writeJson(path.join(root, 'data/skills/skills.json'), bundle.skills);
  await writeJson(path.join(root, 'data/skills/assets.json'), bundle.assets);
  await writeJson(path.join(root, 'data/skills/artifacts.json'), bundle.artifacts);
  await writeJson(path.join(root, NORMALIZED_MANIFEST_RELATIVE_PATH), bundle.normalizedManifest);
  for (const item of bundle.communityManifests) {
    await writeJson(path.join(root, item.path), item.value);
  }
  for (const item of bundle.communityArtifactPayloads) {
    await writeJson(path.join(root, item.path), item.value);
  }
  await writeJson(path.join(root, RAW_INDEX_RELATIVE_PATH), await refreshRawMirrorDetailStatus(root, bundle.rawIndex));
}

async function firstJsonMismatch(expected, actual, location = '$') {
  if (JSON.stringify(expected) === JSON.stringify(actual)) {
    return null;
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      return `${location}.length expected ${expected.length} actual ${actual.length}`;
    }
    for (let index = 0; index < expected.length; index += 1) {
      const mismatch = await firstJsonMismatch(expected[index], actual[index], `${location}[${index}]`);
      if (mismatch) {
        return mismatch;
      }
    }
    return null;
  }
  if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    const keys = [...new Set([...Object.keys(expected), ...Object.keys(actual)])].sort();
    for (const key of keys) {
      if (!Object.hasOwn(expected, key)) {
        return `${location}.${key} unexpected in actual`;
      }
      if (!Object.hasOwn(actual, key)) {
        return `${location}.${key} missing from actual`;
      }
      const mismatch = await firstJsonMismatch(expected[key], actual[key], `${location}.${key}`);
      if (mismatch) {
        return mismatch;
      }
    }
    return null;
  }
  return `${location} expected ${JSON.stringify(expected)} actual ${JSON.stringify(actual)}`;
}

async function assertJsonFileMatches(filePath, expected) {
  const actual = await readJsonIfExists(filePath);
  if (actual === null) {
    throw new Error(`missing file: ${filePath}`);
  }
  const mismatch = await firstJsonMismatch(expected, actual);
  if (mismatch) {
    throw new Error(`${filePath} is stale: ${mismatch}`);
  }
}

async function checkSkillSeedBundle(settings, bundle) {
  const root = settings.workspaceRoot;
  if (bundle.rawIndex.mirrorMode !== 'full-cursor-mirror') {
    throw new Error(`${RAW_INDEX_RELATIVE_PATH} must be a full-cursor-mirror snapshot for bundled seed data`);
  }
  await assertJsonFileMatches(path.join(root, 'data/skills/categories.json'), bundle.categories);
  await assertJsonFileMatches(path.join(root, 'data/skills/packages.json'), bundle.packages);
  await assertJsonFileMatches(path.join(root, 'data/skills/skills.json'), bundle.skills);
  await assertJsonFileMatches(path.join(root, 'data/skills/assets.json'), bundle.assets);
  await assertJsonFileMatches(path.join(root, 'data/skills/artifacts.json'), bundle.artifacts);
  await assertJsonFileMatches(path.join(root, NORMALIZED_MANIFEST_RELATIVE_PATH), bundle.normalizedManifest);
  for (const item of bundle.communityManifests) {
    await assertJsonFileMatches(path.join(root, item.path), item.value);
  }
  for (const item of bundle.communityArtifactPayloads) {
    await assertJsonFileMatches(path.join(root, item.path), item.value);
  }
}

export async function runClawHubMirror(settings) {
  const plan = buildClawHubMirrorCommandPlan(settings);
  let rawIndex = null;
  if (settings.fetch) {
    rawIndex = await fetchClawHubRawMirror(settings);
  } else if (!settings.check) {
    const currentRawIndex = await readJson(path.join(settings.workspaceRoot, RAW_INDEX_RELATIVE_PATH));
    rawIndex = await refreshRawMirrorDetailStatus(settings.workspaceRoot, currentRawIndex);
    await writeJson(path.join(settings.workspaceRoot, RAW_INDEX_RELATIVE_PATH), rawIndex);
  }
  const bundle = await buildSkillSeedBundle(settings);
  if (settings.check) {
    await checkSkillSeedBundle(settings, bundle);
  } else {
    await writeSkillSeedBundle(settings, bundle);
  }
  return {
    ok: true,
    mode: plan.mode,
    mirrorMode: (rawIndex ?? bundle.rawIndex).mirrorMode,
    mirroredSkillCount: Number((rawIndex ?? bundle.rawIndex).totalItems ?? 0),
    seededSkillCount: bundle.normalizedManifest.seededSkillCount,
    rawIndexPath: path.join(settings.workspaceRoot, RAW_INDEX_RELATIVE_PATH),
    normalizedManifestPath: path.join(settings.workspaceRoot, NORMALIZED_MANIFEST_RELATIVE_PATH),
    plan,
  };
}

function printSummary(summary) {
  console.log(`[skills-seed] mode=${summary.mode}`);
  console.log(`[skills-seed] mirrorMode=${summary.mirrorMode}`);
  console.log(`[skills-seed] mirroredSkills=${summary.mirroredSkillCount} seededSkills=${summary.seededSkillCount}`);
  console.log(`[skills-seed] rawIndex=${summary.rawIndexPath}`);
  console.log(`[skills-seed] normalizedManifest=${summary.normalizedManifestPath}`);
}

async function main() {
  const settings = parseClawHubMirrorArgs(process.argv.slice(2));
  if (settings.help) {
    printHelp();
    return;
  }
  const summary = await runClawHubMirror(settings);
  if (settings.json) {
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  printSummary(summary);
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : `${error}`;
    console.error(`[skills-seed] ${message}`);
    process.exitCode = 1;
  });
}
