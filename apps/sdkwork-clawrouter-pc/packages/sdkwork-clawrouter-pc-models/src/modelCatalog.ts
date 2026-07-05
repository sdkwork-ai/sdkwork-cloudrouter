import type { Model, ModelGroupKey } from './data/models';
import {
  formatModelPrice,
  isModelPricingFieldUnavailable,
  modelPricingBadgeLabel,
  modelPricingFieldUnitLabel,
} from './pricing.ts';
import { createClawRouterAppSdkModelExample } from '@sdkwork/clawroutes-pc-commons/runtime';

export const MODEL_CATEGORIES = ['Recommended', 'Open Source', 'Proprietary', 'Free', 'New'] as const;

export type ModelCategory = (typeof MODEL_CATEGORIES)[number];

/** UI-only fold for long provider filter lists; not server pagination. */
export const MODEL_PROVIDER_DEFAULT_DISPLAY_LIMIT = 5;

export const MODEL_CATALOG_FILTER_FIELDS = [
  'searchQuery',
  'providerSearchQuery',
  'selectedProviders',
  'selectedModalities',
  'selectedCapabilities',
  'selectedCategories',
  'selectedGroups',
  'sortBy',
] as const;

export type ModelCatalogFilterField = (typeof MODEL_CATALOG_FILTER_FIELDS)[number];

type ModelCatalogFilterValueByField = {
  searchQuery: string;
  providerSearchQuery: string;
  selectedProviders: string[];
  selectedModalities: string[];
  selectedCapabilities: string[];
  selectedCategories: string[];
  selectedGroups: ModelGroupKey[];
  sortBy: string;
};

export type ModelCatalogFilters = {
  [Field in ModelCatalogFilterField]: ModelCatalogFilterValueByField[Field];
};

const KNOWN_MODEL_GROUP_LABELS: Record<string, string> = {
  default: 'Default group',
  vip: 'VIP group',
  enterprise: 'Enterprise exclusive',
  beta: 'Beta access',
};

export type ProviderShowMoreState =
  | {
      visible: true;
      expanded: boolean;
      hiddenCount: number;
      labelKey: 'models.showMore' | 'models.showLess';
      fallbackLabel: string;
    }
  | {
      visible: false;
      expanded: false;
      hiddenCount: 0;
      labelKey: null;
      fallbackLabel: null;
    };

export type ModelCatalogFilterOptions = {
  providers: string[];
  modalities: string[];
  capabilities: string[];
  groups: ModelCatalogGroupOption[];
};

export type ModelCatalogGroupOption = {
  key: ModelGroupKey;
  label: string;
  modelCount?: number;
};

export type ModelCatalogCardView = {
  id: string;
  detailPath: string;
  provider: string;
  name: string;
  modality: string;
  description: string;
  descriptionLabelKey: string;
  context: string;
  latency: string;
  throughput: string;
  capabilities: Array<{
    label: string;
    labelKey: string;
  }>;
};

export type ModelCatalogPricingCellTone = 'default' | 'cached' | 'muted' | 'flat';

export type ModelCatalogPricingCell = {
  key: 'input' | 'output' | 'cachedInput' | 'flatPrice';
  labelKey: string;
  value: string;
  tone: ModelCatalogPricingCellTone;
  unavailable: boolean;
};

export type ModelCatalogPricingView = {
  badgeLabel: string;
  layout: 'token' | 'flat';
  cells: ModelCatalogPricingCell[];
};

export type ModelCatalogModalityTone = 'text' | 'image' | 'video' | 'audio' | 'music' | 'default';

export type ModelCatalogTranslatedListItem = {
  label: string;
  labelKey: string;
};

export type ModelCatalogDetailPricingRow = {
  key: 'input' | 'output' | 'cachedInput';
  labelKey: string;
  fallbackLabel: string;
  value: string;
  unitLabel: string;
};

export type ModelCatalogDetailSpecRow = {
  key: 'context' | 'maxOutput' | 'trainingData' | 'latency' | 'throughput';
  labelKey: string;
  fallbackLabel: string;
  value: string;
};

export type ModelCatalogPerformanceSummaryRow = {
  key: 'latency' | 'throughput' | 'ttft';
  labelKey: string;
  fallbackLabel: string;
  value: string;
};

export type ModelCatalogPerformanceSummary = {
  providerDocsLabelKey: string;
  fallbackProviderDocsLabel: string;
  specificationsLabelKey: string;
  fallbackSpecificationsLabel: string;
  titleLabelKey: string;
  fallbackTitle: string;
  sourceLabelKey: string;
  fallbackSource: string;
  rows: ModelCatalogPerformanceSummaryRow[];
};

export type ModelCatalogDetailView = {
  hero: {
    id: string;
    provider: string;
    providerDocsUrl: string;
    name: string;
    modality: string;
    modalityTone: ModelCatalogModalityTone;
    description: string;
    descriptionLabelKey: string;
    intro: string;
    introLabelKey: string;
  };
  apiExample: string;
  useCases: ModelCatalogTranslatedListItem[];
  limitations: ModelCatalogTranslatedListItem[];
  supportedLanguages: string[];
  parameters: Array<{
    key: string;
    value: string;
  }>;
  pricingRows: ModelCatalogDetailPricingRow[];
  specificationRows: ModelCatalogDetailSpecRow[];
  performanceSummary: ModelCatalogPerformanceSummary;
};

export function createDefaultModelCatalogFilters(): ModelCatalogFilters {
  const filters = {
    searchQuery: '',
    providerSearchQuery: '',
    selectedProviders: [],
    selectedModalities: [],
    selectedCapabilities: [],
    selectedCategories: [],
    selectedGroups: [],
    sortBy: 'Popularity',
  } satisfies ModelCatalogFilters;

  return filters;
}

export function resetModelCatalogFilters(_filters?: ModelCatalogFilters): ModelCatalogFilters {
  return createDefaultModelCatalogFilters();
}

export function filterProvidersForCatalog(providers: string[], providerSearchQuery: string): string[] {
  const normalizedSearch = providerSearchQuery.trim().toLowerCase();
  if (normalizedSearch.length === 0) {
    return [...providers];
  }
  return providers.filter((provider) => provider.toLowerCase().includes(normalizedSearch));
}

export function deriveModelCatalogFilterOptions(
  models: Model[],
  configuredGroups: readonly ModelCatalogGroupOption[] = [],
): ModelCatalogFilterOptions {
  return {
    providers: uniqueSortedStrings(models.map((model) => model.provider)),
    modalities: uniqueSortedStrings(models.map((model) => model.modality)),
    capabilities: uniqueSortedStrings(models.flatMap((model) => model.capabilities)),
    groups: configuredGroups.length > 0
      ? normalizeConfiguredModelCatalogGroupOptions(configuredGroups)
      : deriveModelCatalogGroupOptions(models),
  };
}

export function deriveModelCatalogGroupOptions(models: Model[]): ModelCatalogGroupOption[] {
  return uniqueSortedStrings(models.flatMap((model) => model.groups))
    .map((group) => ({
      key: group,
      label: modelCatalogGroupFallbackLabel(group),
    }));
}

function normalizeConfiguredModelCatalogGroupOptions(
  groups: readonly ModelCatalogGroupOption[],
): ModelCatalogGroupOption[] {
  const normalizedGroups = new Map<string, ModelCatalogGroupOption>();
  for (const group of groups) {
    const key = group.key.trim();
    if (key.length === 0 || normalizedGroups.has(key)) {
      continue;
    }
    const label = group.label.trim() || modelCatalogGroupFallbackLabel(key);
    const option: ModelCatalogGroupOption = { key, label };
    if (group.modelCount !== undefined && Number.isFinite(group.modelCount)) {
      option.modelCount = Math.max(0, Math.trunc(group.modelCount));
    }
    normalizedGroups.set(key, option);
  }
  return Array.from(normalizedGroups.values());
}

export function deriveModelCatalogCardView(model: Model): ModelCatalogCardView {
  return {
    id: model.id,
    detailPath: `/models/${encodeURIComponent(model.id)}`,
    provider: model.provider,
    name: model.name,
    modality: model.modality,
    description: model.description,
    descriptionLabelKey: `models.data.${model.id}.desc`,
    context: model.context,
    latency: model.latency,
    throughput: model.throughput,
    capabilities: model.capabilities.map((capability) => ({
      label: capability,
      labelKey: modelCatalogCapabilityLabelKey(capability),
    })),
  };
}

export function deriveModelCatalogPricingView(model: Model): ModelCatalogPricingView {
  const badgeLabel = modelPricingBadgeLabel(model);
  if (model.modality !== 'Text') {
    return {
      badgeLabel,
      layout: 'flat',
      cells: [
        {
          key: 'flatPrice',
          labelKey: 'models.flatPrice',
          value: formatModelPrice(model.pricing, 'input'),
          tone: 'flat',
          unavailable: isModelPricingFieldUnavailable(model.pricing, 'input'),
        },
      ],
    };
  }

  return {
    badgeLabel,
    layout: 'token',
    cells: [
      {
        key: 'input',
        labelKey: 'models.input',
        value: formatModelPrice(model.pricing, 'input'),
        tone: isModelPricingFieldUnavailable(model.pricing, 'input') ? 'muted' : 'default',
        unavailable: isModelPricingFieldUnavailable(model.pricing, 'input'),
      },
      {
        key: 'output',
        labelKey: 'models.output',
        value: formatModelPrice(model.pricing, 'output'),
        tone: isModelPricingFieldUnavailable(model.pricing, 'output') ? 'muted' : 'default',
        unavailable: isModelPricingFieldUnavailable(model.pricing, 'output'),
      },
      {
        key: 'cachedInput',
        labelKey: 'models.cachedIn',
        value: formatModelPrice(model.pricing, 'cachedInput'),
        tone: isModelPricingFieldUnavailable(model.pricing, 'cachedInput') ? 'muted' : 'cached',
        unavailable: isModelPricingFieldUnavailable(model.pricing, 'cachedInput'),
      },
    ],
  };
}

export function deriveModelCatalogDetailView(model: Model): ModelCatalogDetailView {
  return {
    hero: {
      id: model.id,
      provider: model.provider,
      providerDocsUrl: providerDocsUrlForCatalog(model.provider),
      name: model.name,
      modality: model.modality,
      modalityTone: modelCatalogModalityTone(model.modality),
      description: model.description,
      descriptionLabelKey: `models.data.${model.id}.desc`,
      intro: model.capabilityIntro || model.description,
      introLabelKey: `models.data.${model.id}.intro`,
    },
    apiExample: modelCatalogApiExample(model.id),
    useCases: translatedIndexedItems(model.id, 'useCases', model.useCases),
    limitations: translatedIndexedItems(model.id, 'limitations', model.limitations),
    supportedLanguages: [...(model.supportedLanguages ?? [])],
    parameters: Object.entries(model.parameters ?? {}).map(([key, value]) => ({ key, value })),
    pricingRows: modelCatalogDetailPricingRows(model),
    specificationRows: [
      { key: 'context', labelKey: 'models.details.contextTokens', fallbackLabel: 'Context Window', value: model.context },
      { key: 'maxOutput', labelKey: 'models.details.maxOutput', fallbackLabel: 'Max Output', value: model.maxOutput || '-' },
      { key: 'trainingData', labelKey: 'models.details.trainingData', fallbackLabel: 'Training Data', value: model.trainingData || 'Unknown' },
      { key: 'latency', labelKey: 'models.details.avgLatency', fallbackLabel: 'Avg. Latency', value: modelCatalogMetricValue(model.latency) },
      { key: 'throughput', labelKey: 'models.details.throughput', fallbackLabel: 'Throughput', value: modelCatalogMetricValue(model.throughput) },
    ],
    performanceSummary: modelCatalogPerformanceSummary(model),
  };
}

export function modelCatalogCategoryLabelKey(category: string): string {
  return `models.category.${modelCatalogLabelKeySuffix(category)}`;
}

export function modelCatalogCapabilityLabelKey(capability: string): string {
  return `models.capability.${modelCatalogLabelKeySuffix(capability)}`;
}

export function modelCatalogGroupLabelKey(group: string): string {
  return `models.group.${modelCatalogLabelKeySuffix(group)}`;
}

export function modelCatalogGroupFallbackLabel(group: string): string {
  const normalized = group.trim().toLowerCase();
  return KNOWN_MODEL_GROUP_LABELS[normalized] ?? titleCase(group.replace(/[_-]+/g, ' '));
}

export function resolveDisplayedProvidersForCatalog(
  filteredProviders: string[],
  options: {
    providerSearchQuery: string;
    showAllProviders: boolean;
  },
): string[] {
  if (options.showAllProviders || options.providerSearchQuery.trim().length > 0) {
    return [...filteredProviders];
  }
  return filteredProviders.slice(0, MODEL_PROVIDER_DEFAULT_DISPLAY_LIMIT);
}

export function resolveProviderShowMoreStateForCatalog(
  filteredProviders: string[],
  options: {
    providerSearchQuery: string;
    showAllProviders: boolean;
  },
): ProviderShowMoreState {
  const hiddenCount = Math.max(0, filteredProviders.length - MODEL_PROVIDER_DEFAULT_DISPLAY_LIMIT);
  if (options.providerSearchQuery.trim().length > 0 || hiddenCount === 0) {
    return {
      visible: false,
      expanded: false,
      hiddenCount: 0,
      labelKey: null,
      fallbackLabel: null,
    };
  }
  if (options.showAllProviders) {
    return {
      visible: true,
      expanded: true,
      hiddenCount,
      labelKey: 'models.showLess',
      fallbackLabel: 'Show Less',
    };
  }
  return {
    visible: true,
    expanded: false,
    hiddenCount,
    labelKey: 'models.showMore',
    fallbackLabel: `Show ${hiddenCount} More`,
  };
}

export function filterModelsForCatalog(models: Model[], filters: ModelCatalogFilters): Model[] {
  const normalizedSearch = filters.searchQuery.trim().toLowerCase();
  const result = models.filter((model) => {
    const matchesSearch =
      normalizedSearch.length === 0 ||
      model.name.toLowerCase().includes(normalizedSearch) ||
      model.provider.toLowerCase().includes(normalizedSearch) ||
      model.description.toLowerCase().includes(normalizedSearch) ||
      model.capabilities.some((capability) => capability.toLowerCase().includes(normalizedSearch));
    const matchesProvider =
      filters.selectedProviders.length === 0 || filters.selectedProviders.includes(model.provider);
    const matchesModality =
      filters.selectedModalities.length === 0 || filters.selectedModalities.includes(model.modality);
    const matchesCapability =
      filters.selectedCapabilities.length === 0 ||
      filters.selectedCapabilities.every((capability) => model.capabilities.includes(capability));
    const matchesCategory =
      filters.selectedCategories.length === 0 ||
      filters.selectedCategories.every((category) => matchesModelCategory(model, category));
    const matchesGroup =
      filters.selectedGroups.length === 0 ||
      filters.selectedGroups.some((group) => model.groups.includes(group));

    return matchesSearch && matchesProvider && matchesModality && matchesCapability && matchesCategory && matchesGroup;
  });

  return sortModelsForCatalog(result, filters.sortBy);
}

function matchesModelCategory(model: Model, category: string): boolean {
  return model.categories.includes(category as Model['categories'][number]);
}

function uniqueSortedStrings(values: string[]): string[] {
  return Array.from(new Set(values)).sort();
}

function modelCatalogLabelKeySuffix(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '');
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function providerDocsUrlForCatalog(provider: string): string {
  return `https://platform.${modelCatalogLabelKeySuffix(provider)}.com/docs`;
}

function modelCatalogModalityTone(modality: Model['modality']): ModelCatalogModalityTone {
  switch (modality) {
    case 'Text':
      return 'text';
    case 'Image':
      return 'image';
    case 'Video':
      return 'video';
    case 'Audio':
      return 'audio';
    case 'Music':
      return 'music';
    default:
      return 'default';
  }
}

function translatedIndexedItems(
  modelId: string,
  field: 'useCases' | 'limitations',
  items: string[] | undefined,
): ModelCatalogTranslatedListItem[] {
  return (items ?? []).map((label, index) => ({
    label,
    labelKey: `models.data.${modelId}.${field}.${index}`,
  }));
}

function modelCatalogDetailPricingRows(model: Model): ModelCatalogDetailPricingRow[] {
  const rows: ModelCatalogDetailPricingRow[] = [
    {
      key: 'input',
      labelKey: 'models.input',
      fallbackLabel: 'Input',
      value: formatModelPrice(model.pricing, 'input'),
      unitLabel: modelPricingFieldUnitLabel(model, 'input'),
    },
    {
      key: 'output',
      labelKey: 'models.output',
      fallbackLabel: 'Output',
      value: formatModelPrice(model.pricing, 'output'),
      unitLabel: modelPricingFieldUnitLabel(model, 'output'),
    },
  ];
  if (model.pricing.cachedInput !== undefined || model.pricing.unavailableFields?.includes('cachedInput')) {
    rows.push({
      key: 'cachedInput',
      labelKey: 'models.cachedIn',
      fallbackLabel: 'Cached Input',
      value: formatModelPrice(model.pricing, 'cachedInput'),
      unitLabel: modelPricingFieldUnitLabel(model, 'cachedInput'),
    });
  }
  return rows;
}

function modelCatalogPerformanceSummary(model: Model): ModelCatalogPerformanceSummary {
  return {
    providerDocsLabelKey: 'models.details.providerDocs',
    fallbackProviderDocsLabel: 'Provider Docs',
    specificationsLabelKey: 'models.details.specifications',
    fallbackSpecificationsLabel: 'Specifications',
    titleLabelKey: 'models.details.performanceMetrics',
    fallbackTitle: 'Performance Metrics',
    sourceLabelKey: 'models.details.performanceSource',
    fallbackSource: 'Catalog reference values',
    rows: [
      { key: 'latency', labelKey: 'models.details.avgLatency', fallbackLabel: 'Avg. Latency', value: modelCatalogMetricValue(model.latency) },
      { key: 'throughput', labelKey: 'models.details.throughput', fallbackLabel: 'Throughput', value: modelCatalogMetricValue(model.throughput) },
      { key: 'ttft', labelKey: 'models.details.timeToFirstToken', fallbackLabel: 'Time to First Token', value: modelCatalogMetricValue(model.ttft) },
    ],
  };
}

function modelCatalogMetricValue(value: string | undefined): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : 'Unavailable';
}

const NODE_ENV_REFERENCE = 'process' + '.env';

function modelCatalogApiExample(modelId: string): string {
  return createClawRouterAppSdkModelExample(modelId, NODE_ENV_REFERENCE);
}

export function isModelExplicitlyFree(model: Model): boolean {
  return model.pricing.status !== 'unavailable' && model.pricing.input === 0 && model.pricing.output === 0;
}

function sortModelsForCatalog(models: Model[], sortBy: string): Model[] {
  const result = [...models];
  switch (sortBy) {
    case 'Price: Low to High':
      result.sort((a, b) => modelPricingSortValue(a, 'low-to-high') - modelPricingSortValue(b, 'low-to-high'));
      break;
    case 'Price: High to Low':
      result.sort((a, b) => modelPricingSortValue(b, 'high-to-low') - modelPricingSortValue(a, 'high-to-low'));
      break;
    case 'Context Length':
      result.sort((a, b) => parseContextLength(b.context) - parseContextLength(a.context));
      break;
    case 'Popularity':
    default:
      break;
  }
  return result;
}

function modelPricingSortValue(model: Model, direction: 'low-to-high' | 'high-to-low'): number {
  if (model.pricing.status === 'unavailable') {
    return direction === 'low-to-high' ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  return model.pricing.input + model.pricing.output;
}

function parseContextLength(context: string): number {
  if (context === '-') {
    return 0;
  }
  if (context.endsWith('M')) {
    return Number.parseFloat(context) * 1000000;
  }
  if (context.endsWith('k')) {
    return Number.parseFloat(context) * 1000;
  }
  return Number.parseFloat(context);
}
