import {
  ensureSdkworkApiSuccess,
  getModelsAppSdkClient,
  isRecord,
  readApiRecord,
  readBoolean,
  readNumber,
  readRecordArray,
  readRequiredApiItems,
  readRequiredNonNegativeNumber,
  readRequiredString,
  readString,
  readStringArray,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  DEFAULT_RANKING_SNAPSHOT_SOURCE,
  rankingHistoryKey,
  type RankingHistoryWeek,
  type RankingLicense,
  type RankingModel,
  type RankingModality,
  type RankingSnapshotSource,
  type RankingVendorOption,
} from './rankingCatalog.ts';

export interface RuntimeRankingSnapshot {
  catalog: RankingModel[];
  history: RankingHistoryWeek[];
  source: RankingSnapshotSource;
}

export interface RankingServiceFilters {
  rankScope?: string;
  vendorCode?: string;
  modality?: string;
  searchQuery?: string;
  limit?: number;
}

export class RankingService {
  static async fetchModelRankings(filters: RankingServiceFilters = {}): Promise<RuntimeRankingSnapshot> {
    const result = await getModelsAppSdkClient().ai.modelRankings.list({
      rankScope: normalizeQueryString(filters.rankScope),
      vendorCode: normalizeQueryString(filters.vendorCode),
      modality: normalizeQueryString(filters.modality),
      q: normalizeQueryString(filters.searchQuery),
      limit: String(filters.limit ?? 200),
    });
    ensureSdkworkApiSuccess(result, 'Failed to fetch model rankings');
    const data = readApiRecord(result);
    const items = readRequiredApiItems(data, 'Failed to fetch model rankings', ['items'])
      .map(normalizeRankingModel)
      .filter((model): model is RankingModel => model !== null);
    const source = normalizeRankingSource(data);
    return {
      catalog: items,
      history: normalizeRankingHistory(data, source, items),
      source,
    };
  }

  static async fetchModelVendors(): Promise<RankingVendorOption[]> {
    const result = await getModelsAppSdkClient().ai.modelVendors.list();
    ensureSdkworkApiSuccess(result, 'Failed to fetch ranking model vendors');

    return readRequiredApiItems(result, 'Failed to fetch ranking model vendors')
      .map(normalizeRankingVendorOption)
      .filter((vendor): vendor is RankingVendorOption => vendor !== null)
      .sort((first, second) => first.label.localeCompare(second.label, undefined, { sensitivity: 'base' }));
  }
}

function normalizeRankingVendorOption(value: unknown): RankingVendorOption | null {
  if (!isRecord(value)) {
    return null;
  }
  const label = (readString(value, 'label') || readString(value, 'vendor') || readString(value, 'vendorCode') || readString(value, 'code')).trim();
  if (!label) {
    return null;
  }
  const code = (readString(value, 'code') || readString(value, 'vendorCode') || normalizeVendorCode(label)).trim();
  return {
    label,
    code,
    modelCount: readRequiredNonNegativeInteger(value, 'modelCount', 'Ranking vendor model count'),
  };
}

function normalizeRankingModel(value: unknown): RankingModel | null {
  if (!isRecord(value)) {
    return null;
  }
  const modality = normalizeRankingModality(readString(value, 'modality'));
  if (!modality) {
    return null;
  }
  const id = normalizeRankingModelId(readRequiredString(value, 'id', 'Ranking model id is required'));
  return {
    id,
    rank: readRequiredPositiveInteger(value, 'rank', 'Ranking model rank'),
    prevRank: readRequiredNonNegativeInteger(value, 'prevRank', 'Ranking model previous rank'),
    name: readRequiredString(value, 'name', 'Ranking model name is required'),
    vendor: readString(value, 'vendor') || readString(value, 'vendorCode') || 'Unknown',
    vendorCode: readString(value, 'vendorCode') || normalizeVendorCode(readString(value, 'vendor')),
    modality,
    baseVolume: readRequiredNonNegativeInteger(value, 'baseVolume', 'Ranking model base volume'),
    requests: readRequiredNonNegativeInteger(value, 'requests', 'Ranking model requests'),
    tokens: readRequiredNonNegativeInteger(value, 'tokens', 'Ranking model tokens'),
    cost: readRequiredNonNegativeNumber(value, 'cost', 'Ranking model cost is required'),
    currency: readRequiredString(value, 'currency', 'Ranking model currency is required'),
    costIndicator: readRequiredBoundedInteger(value, 'costIndicator', 1, 5, 'Ranking model cost indicator'),
    latency: readRequiredNonNegativeInteger(value, 'latency', 'Ranking model latency'),
    contextSize: readNullableText(value, 'contextSize'),
    isNew: readBoolean(value, 'isNew', false),
    color: readString(value, 'color') || '#64748b',
    winRate: optionalFiniteNumber(value, 'winRate'),
    pricing: readNullableText(value, 'pricing'),
    license: normalizeRankingLicense(readString(value, 'license')),
    strengths: readStringArray(value, 'strengths').slice(0, 16),
    trendScore: optionalFiniteNumber(value, 'trendScore'),
  };
}

function normalizeRankingSource(data: ApiRecord): RankingSnapshotSource {
  const source = isRecord(data.source) ? data.source : {};
  const observedAt = readString(source, 'observedAt') || DEFAULT_RANKING_SNAPSHOT_SOURCE.observedAt;
  const snapshotDate = readString(source, 'snapshotDate') || dateOnly(observedAt) || DEFAULT_RANKING_SNAPSHOT_SOURCE.snapshotDate;
  const generatedAt = readString(source, 'generatedAt') || observedAt || DEFAULT_RANKING_SNAPSHOT_SOURCE.generatedAt;
  const historyAnchorDate =
    dateOnly(snapshotDate)
    || dateOnly(generatedAt)
    || dateOnly(observedAt)
    || DEFAULT_RANKING_SNAPSHOT_SOURCE.historyAnchorDate;
  return {
    sourceLabel: readString(source, 'sourceLabel') || DEFAULT_RANKING_SNAPSHOT_SOURCE.sourceLabel,
    sourceDescription: readString(source, 'sourceDescription') || DEFAULT_RANKING_SNAPSHOT_SOURCE.sourceDescription,
    observedAt,
    snapshotDate,
    snapshotPeriod: readString(source, 'snapshotPeriod') || DEFAULT_RANKING_SNAPSHOT_SOURCE.snapshotPeriod,
    windowStart: readString(source, 'windowStart') || DEFAULT_RANKING_SNAPSHOT_SOURCE.windowStart,
    windowEnd: readString(source, 'windowEnd') || DEFAULT_RANKING_SNAPSHOT_SOURCE.windowEnd,
    generatedAt,
    refreshIntervalSeconds: readRequiredPositiveInteger(source, 'refreshIntervalSeconds', 'Ranking source refresh interval seconds'),
    nextRefreshAt: readString(source, 'nextRefreshAt') || DEFAULT_RANKING_SNAPSHOT_SOURCE.nextRefreshAt,
    cacheMaxAgeSeconds: readRequiredPositiveInteger(source, 'cacheMaxAgeSeconds', 'Ranking source cache max age seconds'),
    historyAnchorDate,
    sourceTables: readStringArray(source, 'sourceTables', [...DEFAULT_RANKING_SNAPSHOT_SOURCE.sourceTables]),
    rankScope: readString(source, 'rankScope') || DEFAULT_RANKING_SNAPSHOT_SOURCE.rankScope,
  };
}

function normalizeRankingHistory(
  data: ApiRecord,
  source: RankingSnapshotSource,
  items: readonly RankingModel[],
): RankingHistoryWeek[] {
  const historyKeyByIdentity = createRankingHistoryIdentityMap(items);
  const history = readRecordArray(data, 'history')
    .map((point) => normalizeRankingHistoryPoint(point, historyKeyByIdentity))
    .filter((point): point is RankingHistoryWeek => point !== null)
    .sort((first, second) => first.rawDate - second.rawDate || first.index - second.index);
  if (history.length > 0) {
    return history.map((point, index) => ({
      ...point,
      index,
    }));
  }
  if (items.length === 0) {
    return [];
  }
  return [];
}

function normalizeRankingHistoryPoint(
  value: ApiRecord,
  historyKeyByIdentity: ReadonlyMap<string, string>,
): RankingHistoryWeek | null {
  const date = dateOnly(readString(value, 'date'));
  if (!date) {
    return null;
  }
  const week: RankingHistoryWeek = {
    name: date,
    rawDate: Date.parse(`${date}T00:00:00.000Z`),
    index: readRequiredNonNegativeInteger(value, 'index', 'Ranking history point index'),
    Others: 0,
  };
  if (!Number.isFinite(week.rawDate)) {
    return null;
  }
  for (const entry of readRecordArray(value, 'entries')) {
    const historyKey = resolveRankingHistoryKey(entry, historyKeyByIdentity);
    if (!historyKey) {
      continue;
    }
    readRequiredNonNegativeInteger(entry, 'rank', 'Ranking history entry rank');
    const volume = readRequiredNonNegativeInteger(entry, 'volume', 'Ranking history entry volume');
    week[historyKey] = volume;
  }
  return week;
}

function createRankingHistoryIdentityMap(items: readonly RankingModel[]): Map<string, string> {
  const identityCounts = new Map<string, number>();
  const candidatesByModel = new Map<RankingModel, string[]>();

  for (const model of items) {
    const candidates = collectRankingIdentityCandidates(model);
    candidatesByModel.set(model, candidates);
    for (const candidate of candidates) {
      identityCounts.set(candidate, (identityCounts.get(candidate) ?? 0) + 1);
    }
  }

  const identities = new Map<string, string>();
  for (const model of items) {
    const key = rankingHistoryKey(model);
    for (const candidate of candidatesByModel.get(model) ?? []) {
      if (identityCounts.get(candidate) === 1) {
        identities.set(candidate, key);
      }
    }
  }
  return identities;
}

function collectRankingIdentityCandidates(model: RankingModel): string[] {
  const values = [
    model.id,
    model.name,
    model.id.split('/').at(-1) ?? '',
  ];
  return [...new Set(values.map(normalizeRankingIdentity).filter(Boolean))];
}

function resolveRankingHistoryKey(
  entry: ApiRecord,
  historyKeyByIdentity: ReadonlyMap<string, string>,
): string | null {
  const catalogKey = normalizeRankingIdentity(readString(entry, 'catalogKey'));
  const model = normalizeRankingIdentity(readString(entry, 'model'));
  if (catalogKey === 'others' || model === 'others') {
    return null;
  }

  return historyKeyByIdentity.get(catalogKey) ?? historyKeyByIdentity.get(model) ?? null;
}

function normalizeRankingIdentity(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeRankingModelId(value: string): string {
  const id = value.trim();
  if (!id) {
    throw new Error('Ranking model id is required');
  }
  if (/^\d{4}-\d{2}-\d{2}:/u.test(id)) {
    throw new Error('Ranking model id must use stable catalog identity');
  }
  return id;
}

function normalizeRankingModality(value: string): Exclude<RankingModality, 'All'> | null {
  switch (value.trim().toLowerCase()) {
    case 'llm':
    case 'text':
    case 'chat':
      return 'LLM';
    case 'image':
      return 'Image';
    case 'audio':
      return 'Audio';
    case 'video':
      return 'Video';
    case 'music':
      return 'Music';
    case 'embedding':
      return 'Embedding';
    case 'rerank':
    case 'reranker':
      return 'Rerank';
    default:
      return null;
  }
}

function normalizeRankingLicense(value: string): Exclude<RankingLicense, 'All'> | undefined {
  if (value === 'Open Source' || value === 'Proprietary') {
    return value;
  }
  return undefined;
}

function readRequiredNonNegativeInteger(record: ApiRecord, key: string, label: string): number {
  const value = readNumber(record, key, Number.NaN);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}

function readRequiredPositiveInteger(record: ApiRecord, key: string, label: string): number {
  const value = readNumber(record, key, Number.NaN);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function readRequiredBoundedInteger(record: ApiRecord, key: string, min: number, max: number, label: string): number {
  const value = readNumber(record, key, Number.NaN);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${label} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function optionalFiniteNumber(record: ApiRecord, key: string): number | undefined {
  const value = readNumber(record, key, Number.NaN);
  return Number.isFinite(value) ? value : undefined;
}

function readNullableText(record: ApiRecord, key: string): string | undefined {
  const value = readString(record, key).trim();
  return value || undefined;
}

function dateOnly(value: string): string {
  const match = value.match(/^\d{4}-\d{2}-\d{2}/u);
  return match?.[0] ?? '';
}

function normalizeQueryString(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

function normalizeVendorCode(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/gu, '_').replace(/^_+|_+$/gu, '') || 'unknown';
}
