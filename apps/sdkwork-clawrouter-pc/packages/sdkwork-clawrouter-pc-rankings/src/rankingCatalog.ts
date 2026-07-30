import { defaultIfBlank, snakeCase } from '@sdkwork/clawroutes-pc-commons/sdkwork-utils';

export type RankingModality = 'All' | 'LLM' | 'Image' | 'Audio' | 'Video' | 'Music' | 'Embedding' | 'Rerank';

export type RankingLicense = 'All' | 'Open Source' | 'Proprietary';

export interface RankingSnapshotSource {
  sourceLabel: string;
  sourceDescription: string;
  observedAt: string;
  snapshotDate: string;
  snapshotPeriod: string;
  windowStart: string;
  windowEnd: string;
  generatedAt: string;
  refreshIntervalSeconds: number;
  nextRefreshAt: string;
  cacheMaxAgeSeconds: number;
  historyAnchorDate: string;
  sourceTables: string[];
  rankScope?: string;
}

export interface RankingModel {
  id: string;
  rank: number;
  prevRank: number;
  name: string;
  vendor: string;
  vendorCode: string;
  modality: Exclude<RankingModality, 'All'>;
  baseVolume: number;
  requests: number;
  tokens: number;
  cost: number;
  currency: string;
  costIndicator: number;
  latency: number;
  contextSize?: string;
  isNew?: boolean;
  color: string;
  winRate?: number;
  pricing?: string;
  license?: Exclude<RankingLicense, 'All'>;
  strengths?: string[];
  trendScore?: number;
}

export interface RankingHistoryWeek {
  name: string;
  rawDate: number;
  index: number;
  Others: number;
  total?: number;
  [modelName: string]: string | number | undefined;
}

export interface RankingFilters {
  modality: RankingModality;
  vendor: string | null;
  vendorCode?: string | null;
  license: RankingLicense;
  searchQuery: string;
}

export interface RankingDisplayModel extends RankingModel {
  currentVolume: number;
  displayRank: number;
  calculatedPrevRank: number;
}

export interface RankingPanelModel {
  name: string;
  value: number;
  color: string;
  isOthers: boolean;
}

export interface RankingPanelStats {
  date: string;
  total: number;
  models: RankingPanelModel[];
}

export interface RankingDynamicStats {
  totalVol: number;
  ossShare: number;
  avgLatency: number;
  trendingName: string;
  trendingRankDisplay: string;
}

export interface RankingVendorOptions {
  vendors: string[];
  vendorCodesByLabel: Record<string, string>;
  vendorModelCounts: Record<string, number>;
}

export interface RankingVendorOption {
  label: string;
  code: string;
  modelCount: number;
}

export interface RankingViewModel {
  filteredRankings: RankingModel[];
  displayRankings: RankingDisplayModel[];
  chartData: RankingHistoryWeek[];
  panelStats: RankingPanelStats;
  chartKeys: string[];
  dynamicStats: RankingDynamicStats;
  vendorOptions: RankingVendorOptions;
  modalityCounts: Record<RankingModality, number>;
}

export const DEFAULT_RANKING_SNAPSHOT_SOURCE: RankingSnapshotSource = {
  sourceLabel: 'Published catalog benchmark',
  sourceDescription: 'Derived from published model capability, cost, latency, and routing readiness snapshots.',
  observedAt: '2026-05-07',
  snapshotDate: '2026-05-07',
  snapshotPeriod: 'daily',
  windowStart: '2026-05-01T00:00:00.000Z',
  windowEnd: '2026-05-07T23:59:59.999Z',
  generatedAt: '2026-05-07T00:00:00.000Z',
  refreshIntervalSeconds: 3600,
  nextRefreshAt: '2026-05-07T01:00:00.000Z',
  cacheMaxAgeSeconds: 60,
  historyAnchorDate: '2026-05-07',
  sourceTables: ['ai_model_rank_snapshot'],
  rankScope: 'global',
} as const;

export const EMPTY_RANKING_CATALOG: RankingModel[] = [];

export const EMPTY_RANKING_HISTORY: RankingHistoryWeek[] = [];

export function rankingHistoryKey(model: Pick<RankingModel, 'id'>): string {
  return `m_${Array.from(model.id).map((char) => {
    const codePoint = char.codePointAt(0) ?? 0;
    return codePoint.toString(16).padStart(4, '0');
  }).join('')}`;
}

export function createRankingHistory(
  catalog: readonly RankingModel[],
  options: { weeks?: number; anchorDate?: string; baseOthersVolume?: number } = {},
): RankingHistoryWeek[] {
  const weeks = Math.max(1, Math.floor(options.weeks ?? 40));
  const anchorDate = parseUtcDay(options.anchorDate ?? DEFAULT_RANKING_SNAPSHOT_SOURCE.historyAnchorDate);
  const baseOthersVolume = options.baseOthersVolume ?? 80000000000;
  const startTime = anchorDate.getTime() - (weeks - 1) * 7 * 24 * 60 * 60 * 1000;

  return Array.from({ length: weeks }, (_, index) => {
    const currentWeek = new Date(startTime + index * 7 * 24 * 60 * 60 * 1000);
    const weekData: RankingHistoryWeek = {
      name: formatUtcDate(currentWeek),
      rawDate: currentWeek.getTime(),
      index,
      Others: 0,
    };
    const timeProgress = weeks > 1 ? index / (weeks - 1) : 1;

    catalog.forEach((model, modelIndex) => {
      let volume = 0;
      if (model.isNew) {
        const launchWindow = Math.min(12, weeks);
        if (index < weeks - launchWindow) {
          volume = 0;
        } else {
          const weeksSinceLaunch = index - (weeks - launchWindow);
          const denominator = Math.max(1, launchWindow - 1);
          volume = resolveRankingBenchmarkIndex(model) * Math.pow(weeksSinceLaunch / denominator, 1.5);
        }
      } else {
        const trend = modelIndex % 2 === 0 ? 1 - timeProgress * 0.5 : 0.5 + timeProgress;
        const noise = Math.abs((Math.sin(index * 12.9898 + modelIndex * 78.233) * 43758.5453) % 1);
        volume = resolveRankingBenchmarkIndex(model) * trend * (0.8 + noise * 0.4);
      }
      weekData[rankingHistoryKey(model)] = Math.floor(volume);
    });

    const pseudoOthers = Math.abs((Math.sin(index * 4.123) * 43758.5453) % 1);
    weekData.Others = Math.floor(baseOthersVolume * (0.5 + timeProgress) * (0.9 + pseudoOthers * 0.2));
    return weekData;
  });
}

export function resolveRankingBenchmarkIndex(model: RankingModel): number {
  if (model.baseVolume > 0) {
    return model.baseVolume;
  }
  const rank = Math.max(1, Math.floor(model.rank || 1));
  return Math.round(140_000_000_000 / Math.pow(rank, 0.78));
}

export function filterRankingsForCatalog(
  catalog: readonly RankingModel[],
  filters: RankingFilters,
): RankingModel[] {
  const query = filters.searchQuery.trim().toLowerCase();
  const vendor = filters.vendor?.trim();
  const vendorCode = filters.vendorCode?.trim().toLowerCase();

  return catalog.filter((model) => {
    const matchesModality = filters.modality === 'All' || model.modality === filters.modality;
    const matchesVendor =
      !vendor && !vendorCode
        ? true
        : Boolean(vendorCode && model.vendorCode.toLowerCase() === vendorCode)
          || Boolean(vendor && model.vendor === vendor);
    const matchesLicense = filters.license === 'All' || model.license === filters.license;
    const matchesSearch =
      query.length === 0 ||
      model.name.toLowerCase().includes(query) ||
      model.vendor.toLowerCase().includes(query) ||
      model.vendorCode.toLowerCase().includes(query);
    return matchesModality && matchesVendor && matchesLicense && matchesSearch;
  });
}

export function deriveVendorOptionsForRankings(
  catalog: readonly RankingModel[],
  vendors: readonly RankingVendorOption[] = [],
): RankingVendorOptions {
  const vendorModelCounts: Record<string, number> = {};
  const vendorCodesByLabel: Record<string, string> = {};
  for (const model of catalog) {
    vendorModelCounts[model.vendor] = (vendorModelCounts[model.vendor] ?? 0) + 1;
    vendorCodesByLabel[model.vendor] = model.vendorCode;
  }

  if (vendors.length > 0) {
    const mergedVendorModelCounts: Record<string, number> = {};
    const mergedVendorCodesByLabel: Record<string, string> = {};

    for (const vendor of vendors) {
      const label = vendor.label.trim();
      if (!label) {
        continue;
      }
      mergedVendorModelCounts[label] = normalizeVendorModelCount(vendor.modelCount, vendorModelCounts[label] ?? 0);
      mergedVendorCodesByLabel[label] = vendor.code.trim() || vendorCodesByLabel[label] || normalizeRankingVendorCode(label);
    }

    for (const label of Object.keys(vendorModelCounts)) {
      if (mergedVendorCodesByLabel[label]) {
        continue;
      }
      mergedVendorModelCounts[label] = vendorModelCounts[label] ?? 0;
      mergedVendorCodesByLabel[label] = vendorCodesByLabel[label] || normalizeRankingVendorCode(label);
    }

    return {
      vendors: Object.keys(mergedVendorCodesByLabel).sort(compareVendorLabels),
      vendorCodesByLabel: mergedVendorCodesByLabel,
      vendorModelCounts: mergedVendorModelCounts,
    };
  }

  return {
    vendors: Object.keys(vendorModelCounts).sort(compareVendorLabels),
    vendorCodesByLabel,
    vendorModelCounts,
  };
}

export function deriveRankingModalityCounts(catalog: readonly RankingModel[]): Record<RankingModality, number> {
  const counts: Record<RankingModality, number> = {
    All: catalog.length,
    LLM: 0,
    Image: 0,
    Audio: 0,
    Video: 0,
    Music: 0,
    Embedding: 0,
    Rerank: 0,
  };

  for (const model of catalog) {
    counts[model.modality] += 1;
  }

  return counts;
}

export function resolveActiveRankingWeekIndex({
  hoveredWeekIndex,
  selectedWeekIndex,
  historyLength,
}: {
  hoveredWeekIndex: number | null;
  selectedWeekIndex: number | null;
  historyLength: number;
}): number {
  if (historyLength <= 0) {
    return 0;
  }
  const requestedIndex = hoveredWeekIndex ?? selectedWeekIndex ?? historyLength - 1;
  return Math.min(Math.max(0, requestedIndex), historyLength - 1);
}

export function deriveRankingDisplayRows(
  filteredRankings: readonly RankingModel[],
  history: readonly RankingHistoryWeek[],
  activeWeekIndex: number,
): RankingDisplayModel[] {
  const activeWeekData = history[activeWeekIndex] ?? history.at(-1);
  if (!activeWeekData) {
    return [];
  }
  const previousWeekData = activeWeekIndex > 0 ? history[activeWeekIndex - 1] : null;

  const currentRanking = filteredRankings
    .map((model) => ({
      ...model,
      currentVolume: numericCell(activeWeekData, rankingHistoryKey(model)),
    }))
    .sort((first, second) => second.currentVolume - first.currentVolume)
    .map((model, index) => ({
      ...model,
      displayRank: index + 1,
      calculatedPrevRank: index + 1,
    }));

  if (!previousWeekData) {
    return currentRanking;
  }

  const previousRanks = new Map(
    filteredRankings
      .map((model) => ({
        id: model.id,
        previousVolume: numericCell(previousWeekData, rankingHistoryKey(model)),
      }))
      .sort((first, second) => second.previousVolume - first.previousVolume)
      .map((model, index) => [model.id, index + 1] as const),
  );

  return currentRanking.map((model) => ({
    ...model,
    calculatedPrevRank: previousRanks.get(model.id) ?? model.displayRank,
  }));
}

export function deriveRankingChartData(
  history: readonly RankingHistoryWeek[],
  filteredRankings: readonly RankingModel[],
): RankingHistoryWeek[] {
  return history.map((rawWeek) => {
    const weekInfo: RankingHistoryWeek = {
      name: String(rawWeek.name),
      rawDate: numericCell(rawWeek, 'rawDate'),
      index: numericCell(rawWeek, 'index'),
      Others: numericCell(rawWeek, 'Others'),
    };
    let weekTotal = 0;

    for (const model of filteredRankings) {
      const key = rankingHistoryKey(model);
      const volume = numericCell(rawWeek, key);
      weekInfo[key] = volume;
      weekTotal += volume;
    }

    weekInfo.total = weekTotal + weekInfo.Others;
    return weekInfo;
  });
}

export function deriveRankingPanelStats(
  chartData: readonly RankingHistoryWeek[],
  filteredRankings: readonly RankingModel[],
  activeWeekIndex: number,
): RankingPanelStats {
  const data = chartData[activeWeekIndex] ?? chartData.at(-1);
  if (!data) {
    return { models: [], total: 0, date: '' };
  }

  const activeModels = filteredRankings
    .map((model) => ({
      name: model.name,
      value: numericCell(data, rankingHistoryKey(model)),
      color: model.color,
      isOthers: false,
    }))
    .filter((model) => model.value > 0)
    .sort((first, second) => second.value - first.value);

  if (data.Others > 0) {
    activeModels.push({
      name: 'Others',
      value: data.Others,
      color: '#334155',
      isOthers: true,
    });
  }

  return {
    date: data.name,
    total: numericCell(data, 'total'),
    models: activeModels,
  };
}

export function deriveRankingChartKeys(filteredRankings: readonly RankingModel[]): string[] {
  return ['Others', ...filteredRankings.map(rankingHistoryKey).reverse()];
}

export function findRankingColor(key: string, displayRankings: readonly RankingDisplayModel[]): string {
  if (key === 'Others') {
    return '#334155';
  }
  return displayRankings.find((model) => rankingHistoryKey(model) === key)?.color ?? '#94a3b8';
}

export function deriveRankingDynamicStats({
  filteredRankings,
  activeWeekData,
  activeWeekIndex,
  history,
  displayRankings,
}: {
  filteredRankings: readonly RankingModel[];
  activeWeekData: RankingHistoryWeek | undefined;
  activeWeekIndex: number;
  history: readonly RankingHistoryWeek[];
  displayRankings: readonly RankingDisplayModel[];
}): RankingDynamicStats {
  let ossVol = 0;
  let totalVol = 0;
  let latencySum = 0;

  for (const model of filteredRankings) {
    const volume = activeWeekData ? numericCell(activeWeekData, rankingHistoryKey(model)) : 0;
    if (model.license === 'Open Source') {
      ossVol += volume;
    }
    totalVol += volume;
    latencySum += model.latency * volume;
  }

  const ossShare = totalVol > 0 ? Math.round((ossVol / totalVol) * 100) : 0;
  const avgLatency = totalVol > 0 ? Math.round(latencySum / totalVol) : 0;

  let trendingName = 'N/A';
  let trendingRankDisplay = '-';

  if (filteredRankings.length > 0 && activeWeekData) {
    if (activeWeekIndex > 0) {
      const previousData = history[activeWeekIndex - 1];
      let maxGrowth = -Infinity;
      for (const model of filteredRankings) {
        const currentVolume = numericCell(activeWeekData, rankingHistoryKey(model));
        const previousVolume = previousData ? numericCell(previousData, rankingHistoryKey(model)) : 0;
        const growth = currentVolume - previousVolume;
        if (growth > maxGrowth) {
          maxGrowth = growth;
          trendingName = model.name;
          const modelRank = displayRankings.find((entry) => entry.name === model.name)?.displayRank;
          trendingRankDisplay = modelRank ? `#${modelRank} Overall` : 'Trending';
        }
      }
    } else if (displayRankings.length > 0) {
      const topRanking = displayRankings[0];
      if (topRanking) {
        trendingName = topRanking.name;
        trendingRankDisplay = '#1 Overall';
      }
    }
  }

  return {
    totalVol,
    ossShare,
    avgLatency,
    trendingName,
    trendingRankDisplay,
  };
}

export function deriveRankingViewModel({
  catalog,
  history,
  filters,
  activeWeekIndex,
  vendors,
  vendorOptions,
}: {
  catalog: readonly RankingModel[];
  history: readonly RankingHistoryWeek[];
  filters: RankingFilters;
  activeWeekIndex: number;
  vendors?: readonly RankingVendorOption[];
  vendorOptions?: RankingVendorOptions;
}): RankingViewModel {
  const boundedActiveWeekIndex = resolveActiveRankingWeekIndex({
    hoveredWeekIndex: activeWeekIndex,
    selectedWeekIndex: null,
    historyLength: history.length,
  });
  const resolvedVendorOptions = vendorOptions ?? deriveVendorOptionsForRankings(catalog, vendors);
  const filteredRankings = filterRankingsForCatalog(catalog, filters);
  const displayRankings = deriveRankingDisplayRows(filteredRankings, history, boundedActiveWeekIndex);
  const chartData = deriveRankingChartData(history, filteredRankings);
  const activeWeekData = history[boundedActiveWeekIndex] ?? history.at(-1);

  return {
    filteredRankings,
    displayRankings,
    chartData,
    panelStats: deriveRankingPanelStats(chartData, filteredRankings, boundedActiveWeekIndex),
    chartKeys: deriveRankingChartKeys(filteredRankings),
    dynamicStats: deriveRankingDynamicStats({
      filteredRankings,
      activeWeekData,
      activeWeekIndex: boundedActiveWeekIndex,
      history,
      displayRankings,
    }),
    vendorOptions: resolvedVendorOptions,
    modalityCounts: deriveRankingModalityCounts(catalog),
  };
}

export function formatRankingVolume(num: number): string {
  if (num >= 1e12) return `${(num / 1e12).toFixed(2)}T`;
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toString();
}

function parseUtcDay(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function numericCell(week: RankingHistoryWeek, key: string): number {
  const value = week[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeVendorModelCount(value: number, fallback: number): number {
  return Number.isInteger(value) && value >= 0 ? value : fallback;
}

function normalizeRankingVendorCode(value: string): string {
  return defaultIfBlank(snakeCase(value.trim().toLowerCase()), 'unknown');
}

function compareVendorLabels(first: string, second: string): number {
  return first.localeCompare(second, undefined, { sensitivity: 'base' });
}
