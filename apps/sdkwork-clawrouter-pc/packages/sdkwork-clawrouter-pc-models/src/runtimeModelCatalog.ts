import type {
  AppModelCatalogItem,
  AppModelCatalogPriceAvailability,
} from './runtimeModelCatalogTypes.ts';
import { parseModelCatalogIdentity } from '@sdkwork/clawroutes-pc-commons/model-catalog-identity';
import { type Model, type ModelCategoryKey, type ModelGroupKey, type ModelPricingStatus } from './data/models.ts';

type ModelModality = Model['modality'];
type RuntimeReferencePrice = NonNullable<Model['pricing']['referencePrices']>[number];

interface RuntimeModelCatalogReferencePrice {
  regionCode: string;
  billingMeter: string;
  unitPrice: string;
  currency: string;
}

export interface RuntimeModelCatalogItem {
  catalogKey: string;
  model: string;
  displayName: string;
  vendorCode: string;
  vendor: string;
  capabilities: string[];
  groups: ModelGroupKey[];
  categories: ModelCategoryKey[];
  description?: string | null;
  modalities?: string[];
  inputModalities?: string[];
  outputModalities?: string[];
  apiFormat?: string | null;
  capabilityIntro?: string | null;
  limitations?: string[];
  supportedLanguages?: string[];
  useCases?: string[];
  trainingDataCutoff?: string | null;
  contextTokens?: number | null;
  maxOutputTokens?: number | null;
  supportsStreaming?: boolean;
  supportsTools?: boolean;
  supportsJsonSchema?: boolean;
  releaseStage?: number | null;
  shelfState?: number | null;
  routingState?: number | null;
  replacementModel?: string | null;
  providerCodes: string[];
  officialReferencePrices: RuntimeModelCatalogReferencePrice[];
  priceAvailability: AppModelCatalogItem['priceAvailability'];
}

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const WHITESPACE_PATTERN = /\s/;
const MAX_PUBLIC_MODEL_NAME_LENGTH = 80;
const MAX_PUBLIC_REASON_LENGTH = 160;
const MAX_PUBLIC_CAPABILITY_LENGTH = 64;
const MAX_PUBLIC_DESCRIPTION_LENGTH = 2048;
const MAX_PUBLIC_LONG_TEXT_LENGTH = 4096;
const MAX_PUBLIC_LIST_TEXT_LENGTH = 512;
const KNOWN_VENDOR_NAMES: Record<string, string> = {
  '01ai': '01.AI',
  alibaba: 'Alibaba',
  baidu: 'Baidu',
  cohere: 'Cohere',
  deepseek: 'DeepSeek',
  elevenlabs: 'ElevenLabs',
  google: 'Google',
  kuaishou: 'Kuaishou',
  meta: 'Meta',
  midjourney: 'Midjourney',
  minimax: 'MiniMax',
  mistral: 'Mistral',
  moonshot: 'Moonshot',
  openai: 'OpenAI',
  runway: 'Runway',
  suno: 'Suno',
  volcengine: 'Volcengine',
  zhipu: 'Zhipu AI',
  bytedance: 'ByteDance',
  xai: 'xAI',
};

export function mergeRuntimeModelCatalog(items: RuntimeModelCatalogItem[]): Model[] {
  return items
    .map((item) => toModel(item))
    .filter((model): model is Model => model !== null);
}

export function resolveRuntimeModelCatalog(items: unknown): Model[] {
  return Array.isArray(items)
    ? mergeRuntimeModelCatalog(items.map(toRuntimeCatalogItem).filter((item): item is RuntimeModelCatalogItem => item !== null))
    : [];
}

export function findModelByCatalogRouteId(models: Model[], routeId: string): Model | null {
  const decodedId = decodeModelRouteId(routeId);
  const normalizedId = normalizeKey(decodedId);
  return models.find((model) => normalizeKey(model.id) === normalizedId) ?? null;
}

function toModel(item: RuntimeModelCatalogItem): Model | null {
  const modelName = item.model.trim();
  if (!modelName) {
    return null;
  }

  const id = runtimeModelId(item);
  const capabilities = runtimeCapabilities(item.capabilities);
  const modality = runtimeModalityFromItem(item) ?? runtimeModality(item.capabilities);
  const provider = vendorDisplayName(item);
  const context = formatTokenWindow(item.contextTokens) ?? '-';
  const maxOutput = formatWholeNumber(item.maxOutputTokens);
  const description = item.description?.trim() || `${provider} runtime model ${modelName}.`;
  const capabilityIntro = item.capabilityIntro?.trim();
  const apiFormat = displayApiFormat(item.apiFormat) ?? 'OpenAI Compatible API';
  const limitations = item.limitations;
  const supportedLanguages = item.supportedLanguages;
  const useCases = item.useCases;
  const trainingData = item.trainingDataCutoff?.trim();

  return {
    ...createRuntimeModel(id, modelName, provider, modality, item),
    id,
    modelId: modelName,
    vendorCode: item.vendorCode,
    name: item.displayName.trim() || modelName,
    provider,
    modality,
    context,
    description,
    capabilities,
    ...(capabilityIntro === undefined ? {} : { capabilityIntro }),
    ...(limitations === undefined ? {} : { limitations }),
    ...(supportedLanguages === undefined ? {} : { supportedLanguages }),
    ...(useCases === undefined ? {} : { useCases }),
    ...(trainingData === undefined ? {} : { trainingData }),
    apiFormat,
    ...(maxOutput === undefined ? {} : { maxOutput }),
    pricing: runtimePricing(item),
  };
}

function toRuntimeCatalogItem(item: unknown): RuntimeModelCatalogItem | null {
  if (!isRecord(item)) {
    return null;
  }
  if (
    typeof item.model !== 'string' ||
    typeof item.catalogKey !== 'string' ||
    typeof item.displayName !== 'string' ||
    typeof item.vendorCode !== 'string' ||
    typeof item.vendor !== 'string' ||
    !isStringArray(item.capabilities) ||
    !isStringArray(item.groups) ||
    !isStringArray(item.categories) ||
    !isStringArray(item.providerCodes)
  ) {
    return null;
  }

  const model = normalizeRuntimeIdentifier(item.model);
  const catalogKey = normalizeCatalogKey(item.catalogKey);
  const vendorCode = normalizeRuntimeIdentifier(item.vendorCode);
  if (model === null || catalogKey === null || vendorCode === null) {
    return null;
  }
  if (!matchesRuntimeCatalogIdentity(catalogKey, vendorCode, model)) {
    return null;
  }

  const officialReferencePrices = normalizeReferencePrices(item.officialReferencePrices);
  return {
    catalogKey,
    model,
    displayName: sanitizePublicCatalogText(item.displayName, MAX_PUBLIC_MODEL_NAME_LENGTH),
    vendorCode,
    vendor: sanitizePublicCatalogText(item.vendor, MAX_PUBLIC_MODEL_NAME_LENGTH),
    capabilities: item.capabilities
      .map((capability) => sanitizePublicCatalogText(capability, MAX_PUBLIC_CAPABILITY_LENGTH))
      .filter(Boolean),
    groups: normalizeRuntimeModelGroups(item.groups),
    categories: normalizeRuntimeModelCategories(item.categories),
    description: normalizeNullableCatalogText(item.description, MAX_PUBLIC_DESCRIPTION_LENGTH),
    modalities: normalizeRuntimeTextArray(item.modalities, MAX_PUBLIC_CAPABILITY_LENGTH),
    inputModalities: normalizeRuntimeTextArray(item.inputModalities, MAX_PUBLIC_CAPABILITY_LENGTH),
    outputModalities: normalizeRuntimeTextArray(item.outputModalities, MAX_PUBLIC_CAPABILITY_LENGTH),
    apiFormat: normalizeNullableCatalogText(item.apiFormat, MAX_PUBLIC_CAPABILITY_LENGTH),
    capabilityIntro: normalizeNullableCatalogText(item.capabilityIntro, MAX_PUBLIC_LONG_TEXT_LENGTH),
    limitations: normalizeRuntimeTextArray(item.limitations, MAX_PUBLIC_LIST_TEXT_LENGTH),
    supportedLanguages: normalizeRuntimeTextArray(item.supportedLanguages, MAX_PUBLIC_CAPABILITY_LENGTH),
    useCases: normalizeRuntimeTextArray(item.useCases, MAX_PUBLIC_LIST_TEXT_LENGTH),
    trainingDataCutoff: normalizeNullableCatalogText(item.trainingDataCutoff, MAX_PUBLIC_CAPABILITY_LENGTH),
    contextTokens: normalizeNullablePositiveInteger(item.contextTokens),
    maxOutputTokens: normalizeNullablePositiveInteger(item.maxOutputTokens),
    supportsStreaming: typeof item.supportsStreaming === 'boolean' ? item.supportsStreaming : undefined,
    supportsTools: typeof item.supportsTools === 'boolean' ? item.supportsTools : undefined,
    supportsJsonSchema: typeof item.supportsJsonSchema === 'boolean' ? item.supportsJsonSchema : undefined,
    releaseStage: normalizeNullablePositiveInteger(item.releaseStage),
    shelfState: normalizeNullablePositiveInteger(item.shelfState),
    routingState: normalizeNullablePositiveInteger(item.routingState),
    replacementModel: normalizeRuntimeIdentifierOrNullable(item.replacementModel),
    providerCodes: item.providerCodes
      .map(normalizeRuntimeIdentifier)
      .filter((providerCode): providerCode is string => providerCode !== null),
    officialReferencePrices,
    priceAvailability: normalizePriceAvailability(item.priceAvailability, officialReferencePrices),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function normalizeRuntimeModelGroups(values: string[]): ModelGroupKey[] {
  const groups = values
    .map(normalizeRuntimeModelGroup)
    .filter((value): value is ModelGroupKey => value !== null);
  return Array.from(new Set(groups));
}

function normalizeRuntimeModelCategories(values: string[]): ModelCategoryKey[] {
  const categories = values
    .map(normalizeRuntimeModelCategory)
    .filter((value): value is ModelCategoryKey => value !== null);
  return Array.from(new Set(categories));
}

function normalizeRuntimeModelGroup(value: string): ModelGroupKey | null {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9_.:-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : null;
}

function normalizeRuntimeModelCategory(value: string): ModelCategoryKey | null {
  switch (value.trim().toLowerCase().replace(/[_-]+/g, ' ')) {
    case 'recommended':
      return 'Recommended';
    case 'open source':
      return 'Open Source';
    case 'proprietary':
      return 'Proprietary';
    case 'free':
      return 'Free';
    case 'new':
      return 'New';
    default:
      return null;
  }
}

function normalizeNullableCurrency(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : null;
}

function normalizeNullableCatalogText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const normalized = sanitizePublicCatalogText(value, maxLength);
  return normalized === '' ? null : normalized;
}

function normalizeRuntimeTextArray(value: unknown, maxTextLength: number): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => sanitizePublicCatalogText(item, maxTextLength))
    .filter(Boolean);
}

function normalizeNullablePositiveInteger(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.trunc(value);
}

function normalizePriceAvailability(
  value: unknown,
  officialReferencePrices: readonly RuntimeModelCatalogReferencePrice[],
): AppModelCatalogPriceAvailability {
  const hasReferencePrice = officialReferencePrices.length > 0;
  const fallbackStatus = hasReferencePrice
    ? 'reference'
    : 'unavailable';
  if (!isRecord(value)) {
    return { status: fallbackStatus };
  }
  const status = value.status === 'reference' || value.status === 'unavailable' ? value.status : fallbackStatus;
  const reason = typeof value.reason === 'string'
    ? sanitizePublicCatalogText(value.reason, MAX_PUBLIC_REASON_LENGTH)
    : undefined;
  return reason === undefined || reason === '' ? { status } : { status, reason };
}

function normalizeReferencePrices(value: unknown): RuntimeModelCatalogReferencePrice[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const byRegionAndMeter = new Map<string, RuntimeModelCatalogReferencePrice>();
  for (const item of value) {
    if (
      !isRecord(item) ||
      typeof item.regionCode !== 'string' ||
      typeof item.billingMeter !== 'string' ||
      typeof item.unitPrice !== 'string'
    ) {
      continue;
    }
    const regionCode = normalizeRuntimeIdentifier(item.regionCode);
    const billingMeter = normalizeRuntimeIdentifier(item.billingMeter);
    const currency = normalizeNullableCurrency(item.currency) ?? null;
    if (regionCode === null || billingMeter === null || currency === null || readPositiveDecimal(item.unitPrice) === null) {
      continue;
    }
    const priceKey = `${normalizeKey(regionCode)}/${normalizeKey(billingMeter)}`;
    if (!byRegionAndMeter.has(priceKey)) {
      byRegionAndMeter.set(priceKey, {
        regionCode,
        billingMeter,
        unitPrice: item.unitPrice.trim(),
        currency,
      });
    }
  }
  return Array.from(byRegionAndMeter.values()).sort((left, right) => (
    modelRegionSortKey(left.regionCode) - modelRegionSortKey(right.regionCode)
    || left.regionCode.localeCompare(right.regionCode)
    || billingMeterSortKey(left.billingMeter) - billingMeterSortKey(right.billingMeter)
    || left.billingMeter.localeCompare(right.billingMeter)
  ));
}

function runtimeModelId(item: RuntimeModelCatalogItem): string {
  return item.catalogKey;
}

function runtimeCapabilities(values: string[]): string[] {
  const normalized = values
    .map(displayCapability)
    .map((capability) => sanitizePublicCatalogText(capability, MAX_PUBLIC_CAPABILITY_LENGTH))
    .filter(Boolean);
  return Array.from(new Set(normalized));
}

function runtimeModalityFromItem(item: RuntimeModelCatalogItem): ModelModality | null {
  return (
    explicitRuntimeModality(item.outputModalities) ??
    explicitRuntimeModality(item.modalities) ??
    explicitRuntimeModality(item.inputModalities) ??
    runtimeModality(item.capabilities)
  );
}

function displayCapability(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[_-]+/g, ' ');
  switch (normalized) {
    case '':
    case 'chat':
    case 'llm':
    case 'text':
      return '';
    case 'function calling':
    case 'function call':
    case 'tool calling':
    case 'tools':
      return 'Function Calling';
    case 'json':
    case 'json mode':
    case 'json schema':
      return 'JSON Mode';
    case 'image':
    case 'vision':
      return 'Vision';
    case 'image generation':
      return 'Image Generation';
    case 'video':
      return 'Video';
    case 'video generation':
      return 'Video Generation';
    case 'audio':
      return 'Audio';
    case 'music':
      return 'Music Generation';
    case 'speech':
    case 'tts':
    case 'text to speech':
      return 'Text-to-Speech';
    case 'transcription':
    case 'speech to text':
      return 'Speech-to-Text';
    case 'voice cloning':
      return 'Voice Cloning';
    case 'web search':
    case 'search':
      return 'Web Search';
    case 'rag':
      return 'RAG';
    case 'long context':
      return 'Long Context';
    default:
      return titleCase(normalized);
  }
}

function runtimeModality(capabilities: string[]): ModelModality {
  const normalized = capabilities.map((capability) => capability.trim().toLowerCase());
  if (normalized.some((capability) => capability.includes('video'))) {
    return 'Video';
  }
  if (normalized.some((capability) => capability.includes('music'))) {
    return 'Music';
  }
  if (normalized.some((capability) => capability.includes('audio') || capability.includes('speech') || capability.includes('transcription'))) {
    return 'Audio';
  }
  if (normalized.some((capability) => capability.includes('image'))) {
    return 'Image';
  }
  return 'Text';
}

function explicitRuntimeModality(values: string[] | undefined): ModelModality | null {
  const normalized = (values ?? []).map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (normalized.length === 0) {
    return null;
  }
  if (normalized.some((value) => value === 'text' || value === 'chat' || value === 'llm')) {
    return 'Text';
  }
  if (normalized.some((value) => value === 'video')) {
    return 'Video';
  }
  if (normalized.some((value) => value === 'music')) {
    return 'Music';
  }
  if (normalized.some((value) => value === 'audio' || value === 'speech' || value === 'voice')) {
    return 'Audio';
  }
  if (normalized.some((value) => value === 'image')) {
    return 'Image';
  }
  return null;
}

function displayApiFormat(value: string | null | undefined): string | undefined {
  const normalized = value?.trim();
  if (!normalized) {
    return undefined;
  }
  switch (normalized.toLowerCase().replace(/[_\s]+/g, '-')) {
    case 'openai-responses':
      return 'OpenAI Responses API';
    case 'openai-compatible':
      return 'OpenAI Compatible API';
    case 'openai-chat-completions':
      return 'OpenAI Chat Completions API';
    default:
      return titleCase(normalized.replace(/[_-]+/g, ' '));
  }
}

function formatTokenWindow(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined || value <= 0) {
    return undefined;
  }
  if (value >= 1_000_000) {
    return `${trimDecimal(value / 1_000_000)}M`;
  }
  if (value >= 1_000) {
    return `${trimDecimal(value / 1_000)}k`;
  }
  return formatWholeNumber(value);
}

function formatWholeNumber(value: number | null | undefined): string | undefined {
  if (value === null || value === undefined || value <= 0) {
    return undefined;
  }
  return Math.trunc(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function trimDecimal(value: number): string {
  return value.toFixed(2).replace(/\.?0+$/, '');
}

function vendorDisplayName(item: RuntimeModelCatalogItem): string {
  const vendorCode = item.vendorCode.trim();
  const knownVendorName = KNOWN_VENDOR_NAMES[normalizeKey(vendorCode)];
  if (knownVendorName !== undefined) {
    return knownVendorName;
  }
  const vendor = sanitizePublicCatalogText(item.vendor, MAX_PUBLIC_MODEL_NAME_LENGTH);
  return titleCase(vendor || vendorCode || 'Provider');
}

function runtimePricing(item: RuntimeModelCatalogItem): Model['pricing'] {
  const priceAvailability = item.priceAvailability;
  const referencePrices = item.officialReferencePrices
    .map((price) => ({
      regionCode: price.regionCode,
      billingMeter: price.billingMeter,
      unitPrice: readPositiveDecimal(price.unitPrice),
      currency: price.currency,
    }))
    .filter((price): price is RuntimeReferencePrice => price.unitPrice !== null)
    .sort((left, right) => (
      modelRegionSortKey(left.regionCode) - modelRegionSortKey(right.regionCode)
      || left.regionCode.localeCompare(right.regionCode)
      || billingMeterSortKey(left.billingMeter) - billingMeterSortKey(right.billingMeter)
      || left.billingMeter.localeCompare(right.billingMeter)
    ));
  const regionalReferencePrices = pricesForDefaultReferenceRegion(referencePrices);
  const selectedReferencePrice = regionalReferencePrices.find((price) => price.billingMeter === 'llm_input_token')
    ?? regionalReferencePrices[0]
    ?? referencePrices[0];
  const selectedReferenceUnitPrice = selectedReferencePrice?.unitPrice ?? null;
  const referenceCurrency = selectedReferencePrice?.currency ?? 'USD';
  const pricing: Model['pricing'] = {
    input: referencePriceForModel(item, regionalReferencePrices, 'input') ?? 0,
    output: referencePriceForModel(item, regionalReferencePrices, 'output') ?? 0,
    cachedInput: referencePriceForModel(item, regionalReferencePrices, 'cachedInput') ?? undefined,
    referencePrices,
    unavailableFields: unavailablePricingFields(item, regionalReferencePrices, selectedReferenceUnitPrice),
    unit: runtimePricingUnit(item, regionalReferencePrices),
    currency: referenceCurrency,
  };
  pricing.status = pricingStatus(selectedReferenceUnitPrice);
  pricing.reason = pricingReason(priceAvailability, selectedReferenceUnitPrice);
  return pricing;
}

function unavailablePricingFields(
  item: RuntimeModelCatalogItem,
  prices: RuntimeReferencePrice[],
  selectedReferenceUnitPrice: number | null,
): Array<'input' | 'output' | 'cachedInput'> {
  if (selectedReferenceUnitPrice === null) {
    return ['input', 'output', 'cachedInput'];
  }
  const fields: Array<'input' | 'output' | 'cachedInput'> = [];
  for (const field of ['input', 'output', 'cachedInput'] as const) {
    if (referencePriceForModel(item, prices, field) === undefined) {
      fields.push(field);
    }
  }
  return fields;
}

function pricingStatus(selectedReferenceUnitPrice: number | null): ModelPricingStatus {
  if (selectedReferenceUnitPrice !== null) {
    return 'reference';
  }
  return 'unavailable';
}

function pricingReason(
  priceAvailability: AppModelCatalogPriceAvailability | undefined,
  selectedReferenceUnitPrice: number | null,
): string | undefined {
  if (typeof priceAvailability?.reason === 'string' && priceAvailability.reason.trim() !== '') {
    return priceAvailability.reason;
  }
  if (selectedReferenceUnitPrice !== null) {
    return 'Public reference price only. Customer-specific pricing requires an API key context.';
  }
  return 'Public reference price is not configured for this model.';
}

function readPositiveDecimal(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) {
    return null;
  }
  return amount;
}

function referencePriceForModel(
  item: RuntimeModelCatalogItem,
  prices: RuntimeReferencePrice[],
  field: 'input' | 'output' | 'cachedInput',
): number | undefined {
  const modality = runtimeModalityFromItem(item) ?? runtimeModality(item.capabilities);
  const meters = metersForPricingField(modality, field);
  for (const meter of meters) {
    const price = prices.find((candidate) => candidate.billingMeter === meter);
    if (price !== undefined) {
      return price.unitPrice;
    }
  }
  return undefined;
}

function metersForPricingField(
  modality: ModelModality,
  field: 'input' | 'output' | 'cachedInput',
): string[] {
  if (field === 'cachedInput') {
    return ['llm_cache_read_token'];
  }
  switch (modality) {
    case 'Image':
      return field === 'input'
        ? ['image_input_token', 'image_result', 'image_megapixel', 'image_pixel']
        : ['image_output_token'];
    case 'Audio':
      return field === 'input'
        ? ['audio_input_second', 'audio_input_minute', 'stt_audio_minute', 'audio_input_token', 'tts_input_character', 'speech_character']
        : ['audio_output_second', 'audio_output_minute', 'audio_output_token'];
    case 'Music':
      return field === 'input' ? ['sfx_result'] : ['music_output_second'];
    case 'Video':
      return field === 'input'
        ? ['video_input_second', 'video_result', 'video_input_token']
        : ['video_output_second', 'video_output_token'];
    case 'Text':
    default:
      return field === 'input'
        ? ['llm_input_token', 'embedding_input_token', 'rerank_search']
        : ['llm_output_token', 'llm_reasoning_token', 'rerank_document'];
  }
}

function runtimePricingUnit(
  item: RuntimeModelCatalogItem,
  prices: RuntimeReferencePrice[],
): string {
  const firstMeter = prices[0]?.billingMeter;
  const explicitUnit = firstMeter === undefined ? undefined : unitForBillingMeter(firstMeter);
  if (explicitUnit !== undefined) {
    return explicitUnit;
  }
  const modality = runtimeModalityFromItem(item) ?? runtimeModality(item.capabilities);
  switch (modality) {
    case 'Image':
      return 'image';
    case 'Audio':
      return 'second';
    case 'Music':
      return 'second';
    case 'Video':
      return 'second';
    case 'Text':
    default:
      return '1M tokens';
  }
}

function unitForBillingMeter(billingMeter: string): string | undefined {
  if (billingMeter.endsWith('_token')) {
    return '1M tokens';
  }
  if (billingMeter.endsWith('_character')) {
    return '1M characters';
  }
  if (billingMeter.endsWith('_second')) {
    return 'second';
  }
  if (billingMeter.endsWith('_minute')) {
    return 'minute';
  }
  if (billingMeter === 'image_result') {
    return 'image';
  }
  if (billingMeter === 'video_result') {
    return 'video';
  }
  if (billingMeter === 'sfx_result') {
    return 'sound effect';
  }
  if (billingMeter === 'image_pixel') {
    return 'pixel';
  }
  if (billingMeter === 'image_megapixel') {
    return 'megapixel';
  }
  if (billingMeter === 'api_request') {
    return 'request';
  }
  if (billingMeter === 'api_result') {
    return 'result';
  }
  if (billingMeter === 'api_item') {
    return 'item';
  }
  return undefined;
}

function billingMeterSortKey(billingMeter: string): number {
  switch (billingMeter) {
    case 'llm_input_token':
      return 10;
    case 'llm_output_token':
      return 20;
    case 'llm_reasoning_token':
      return 30;
    case 'llm_cache_write_token':
      return 40;
    case 'llm_cache_read_token':
      return 50;
    case 'embedding_input_token':
      return 100;
    case 'image_input_token':
      return 200;
    case 'image_output_token':
      return 210;
    case 'image_result':
      return 220;
    case 'audio_input_token':
      return 300;
    case 'audio_output_token':
      return 310;
    case 'audio_input_second':
      return 320;
    case 'audio_output_second':
      return 330;
    case 'stt_audio_minute':
      return 340;
    case 'tts_input_character':
      return 350;
    case 'video_input_token':
      return 400;
    case 'video_output_token':
      return 410;
    case 'video_input_second':
      return 420;
    case 'video_output_second':
      return 430;
    case 'video_result':
      return 440;
    case 'music_output_second':
      return 500;
    case 'sfx_result':
      return 510;
    default:
      return Number.MAX_SAFE_INTEGER;
  }
}

function pricesForDefaultReferenceRegion(prices: RuntimeReferencePrice[]): RuntimeReferencePrice[] {
  const firstRegion = prices[0]?.regionCode;
  if (firstRegion === undefined) {
    return [];
  }
  const regionalPrices = prices.filter((price) => normalizeKey(price.regionCode) === normalizeKey(firstRegion));
  return regionalPrices.length > 0 ? regionalPrices : prices;
}

function modelRegionSortKey(regionCode: string): number {
  switch (normalizeKey(regionCode)) {
    case 'global':
      return 0;
    case 'cn':
    case 'china':
    case 'mainland':
      return 10;
    default:
      return 20;
  }
}

function createRuntimeModel(
  id: string,
  modelName: string,
  provider: string,
  modality: ModelModality,
  item: RuntimeModelCatalogItem,
): Model {
  return {
    id,
    modelId: modelName,
    vendorCode: item.vendorCode,
    name: modelName,
    provider,
    modality,
    context: '-',
    groups: [...item.groups],
    categories: [...item.categories],
    pricing: { input: 0, output: 0, unit: 'unit', currency: 'USD' },
    description: `${provider} runtime model ${modelName}.`,
    capabilities: [],
    latency: 'N/A',
    throughput: 'N/A',
    apiFormat: 'OpenAI Compatible API',
  };
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeRuntimeIdentifier(value: string): string | null {
  const normalized = value.trim();
  if (!normalized || CONTROL_CHARACTER_PATTERN.test(normalized) || WHITESPACE_PATTERN.test(normalized)) {
    return null;
  }
  return normalized;
}

function normalizeCatalogKey(value: string): string | null {
  const normalized = normalizeRuntimeIdentifier(value);
  if (normalized === null) {
    return null;
  }
  if (parseModelCatalogIdentity(normalized) === null) {
    return null;
  }
  return normalized;
}

function matchesRuntimeCatalogIdentity(
  catalogKey: string,
  vendorCode: string,
  model: string,
): boolean {
  return catalogKey === `${vendorCode}/${model}`;
}

function normalizeRuntimeIdentifierOrNullable(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  return normalizeRuntimeIdentifier(value);
}

function sanitizePublicCatalogText(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function decodeModelRouteId(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
