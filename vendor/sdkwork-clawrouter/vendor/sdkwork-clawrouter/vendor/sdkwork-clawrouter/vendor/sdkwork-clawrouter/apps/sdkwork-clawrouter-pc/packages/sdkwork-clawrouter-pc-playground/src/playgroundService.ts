import {
  ensureSdkworkApiSuccess,
  getStoredAppSessionAuthToken,
  getClawRouterGlobalTokenManager,
  getSdkworkGenerationsAppSdkClient,
  hasStoredPortalSession,
  isRecord,
  readBoolean,
  readNullableString,
  readNumber,
  readRequiredApiItems,
  readRequiredString,
  readStringArray,
  type ApiRecord,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  createSdkworkGenerationService,
  type SdkworkGenerationWorkspaceData,
} from '@sdkwork/generations-pc-workspace/generation-service';
import {
  listModelCatalog,
} from './appRuntimeApiOperations.ts';
import { fetchPlaygroundGenerationHistoryFromService } from './playgroundGenerationsService.ts';
import { runPlaygroundGeneration } from './playgroundGenerationService.ts';
import { runPlaygroundAssetGeneration } from './playgroundGenerationsService.ts';
export type { PlaygroundHistoryItem, PlaygroundMedia, PlaygroundModelGroup, PlaygroundModelOption } from './playgroundTypes.ts';
import type {
  GenerationAgentRunCreateInput,
  GenerationAgentRunCreateResult,
  PlaygroundGenerationSubmitInput,
  PlaygroundHistoryItem,
  PlaygroundModelBucket,
  PlaygroundModelGroup,
  PlaygroundModelOption,
  PlaygroundModelPriceAvailability,
  PlaygroundModelReferencePrice,
} from './playgroundTypes.ts';
const MODEL_BUCKETS: PlaygroundModelBucket[] = ['llms', 'images', 'videos', 'audios', 'music', 'sfx'];

export class PlaygroundService {
  static async fetchGenerationHistory(): Promise<PlaygroundHistoryItem[]> {
    if (!hasStoredPortalSession()) {
      return [];
    }
    const service = createSdkworkGenerationService({
      getSessionTokens: readGenerationSessionTokens,
      includeSampleRuns: false,
      sdkClients: {
        generationsApp: getSdkworkGenerationsAppSdkClient(),
        tokenManager: getClawRouterGlobalTokenManager(),
      },
    });
    return fetchPlaygroundGenerationHistoryFromService(service);
  }

  static async runAgentGeneration(input: GenerationAgentRunCreateInput): Promise<GenerationAgentRunCreateResult> {
    return runPlaygroundGeneration(input);
  }

  static async runGeneration(input: PlaygroundGenerationSubmitInput): Promise<GenerationAgentRunCreateResult> {
    if (input.selectedModality === 'agent') {
      return runPlaygroundGeneration(input);
    }
    const service = createSdkworkGenerationService({
      getSessionTokens: readGenerationSessionTokens,
      includeSampleRuns: false,
      sdkClients: {
        generationsApp: getSdkworkGenerationsAppSdkClient(),
        tokenManager: getClawRouterGlobalTokenManager(),
      },
    });
    return runPlaygroundAssetGeneration(
      {
        prompt: input.prompt,
        targetType: input.targetType ?? input.selectedModality,
        selectedModel: input.selectedModel,
        generationConfig: input.generationConfig,
        referenceAssets: input.referenceAssets,
        referenceImages: input.referenceImages,
        referenceMode: input.referenceMode,
        onDelta: input.onDelta,
        onArtifact: input.onArtifact,
      },
      service,
    );
  }

  static fetchGenerationWorkspace(): Promise<SdkworkGenerationWorkspaceData> {
    return fetchGenerationWorkspaceData();
  }

  static async fetchModelGroups(): Promise<PlaygroundModelGroup[]> {
    const result = await listModelCatalog();
    ensureSdkworkApiSuccess(result, 'Failed to fetch Playground model groups');
    const items = readRequiredApiItems(result, 'Playground model catalog response missing items');
    return groupModelCatalogItems(items);
  }
}

async function fetchGenerationWorkspaceData(): Promise<SdkworkGenerationWorkspaceData> {
  const service = createSdkworkGenerationService({
    getSessionTokens: readGenerationSessionTokens,
    includeSampleRuns: false,
    sdkClients: {
      generationsApp: getSdkworkGenerationsAppSdkClient(),
      tokenManager: getClawRouterGlobalTokenManager(),
    },
  });
  return service.getWorkspace();
}

function readGenerationSessionTokens(): { authToken?: string } {
  return {
    authToken: getStoredAppSessionAuthToken(),
  };
}

function groupModelCatalogItems(items: unknown[]): PlaygroundModelGroup[] {
  const groupsByVendor = new Map<string, PlaygroundModelGroup>();

  for (const value of items) {
    const option = normalizeModelOption(value);
    const vendorCode = option.vendorCode;
    const group = groupsByVendor.get(vendorCode) ?? createModelGroup(option);
    groupsByVendor.set(vendorCode, group);

    for (const bucket of modelBucketsForOption(option)) {
      group[bucket].push(option);
    }
  }

  const groups = [...groupsByVendor.values()].filter(hasAnyModels);
  for (const group of groups) {
    for (const bucket of MODEL_BUCKETS) {
      group[bucket].sort(compareModelOptions);
    }
  }
  groups.sort((left, right) => (
    left.vendor.name.toLowerCase().localeCompare(right.vendor.name.toLowerCase())
    || left.vendor.code.localeCompare(right.vendor.code)
  ));
  return groups;
}

function createModelGroup(option: PlaygroundModelOption): PlaygroundModelGroup {
  return {
    id: option.vendorCode,
    vendor: {
      code: option.vendorCode,
      name: option.vendorName,
    },
    llms: [],
    images: [],
    videos: [],
    audios: [],
    music: [],
    sfx: [],
  };
}

function normalizeModelOption(value: unknown): PlaygroundModelOption {
  const item = readRequiredRecord(value, 'Playground model option record is required');
  const catalogKey = readRequiredString(item, 'catalogKey', 'Playground model catalog key is required');
  const model = readRequiredString(item, 'model', 'Playground model id is required');
  const displayName = readRequiredString(item, 'displayName', 'Playground model display name is required');
  const vendorCode = readRequiredString(item, 'vendorCode', 'Playground model vendor code is required');
  const vendorName = readCatalogVendorName(item, vendorCode);
  const description = readNullableString(item, 'description') ?? undefined;
  const contextTokens = readOptionalNumber(item, 'contextTokens');
  const maxOutputTokens = readOptionalNumber(item, 'maxOutputTokens');
  const apiFormat = readNullableString(item, 'apiFormat') ?? undefined;
  const officialReferencePrices = readReferencePrices(item, 'officialReferencePrices');
  const officialReferenceUnitPrice = readPositiveDecimal(readNullableString(item, 'officialReferenceUnitPrice'));
  const versionLabel = deriveVersionLabel(displayName, model, apiFormat, item);

  return {
    id: catalogKey,
    catalogKey,
    model,
    name: displayName,
    displayName,
    desc: description || `${vendorName} ${model}`,
    description,
    ver: versionLabel,
    versionLabel,
    vendorCode,
    vendorName,
    modalities: readStringArray(item, 'modalities'),
    inputModalities: readStringArray(item, 'inputModalities'),
    outputModalities: readStringArray(item, 'outputModalities'),
    capabilities: readStringArray(item, 'capabilities'),
    apiFormat,
    contextTokens,
    maxOutputTokens,
    officialReferencePrices,
    priceAvailability: readPriceAvailability(item, officialReferenceUnitPrice, officialReferencePrices),
    providerCodes: readProviderCodes(item),
    supportsStreaming: readBoolean(item, 'supportsStreaming', false),
    supportsTools: readBoolean(item, 'supportsTools', false),
    supportsJsonSchema: readBoolean(item, 'supportsJsonSchema', false),
  };
}

function readProviderCodes(item: ApiRecord): string[] {
  return readStringArray(item, 'providerCodes')
    .map((value) => value.trim())
    .filter((value, index, values) => value.length > 0 && values.indexOf(value) === index);
}

function readReferencePrices(record: ApiRecord, key: string): PlaygroundModelReferencePrice[] {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }
      const regionCode = readNullableString(item, 'regionCode');
      const billingMeter = readNullableString(item, 'billingMeter');
      const unitPrice = readNullableString(item, 'unitPrice');
      const currency = readNullableString(item, 'currency');
      if (!regionCode || !billingMeter || !unitPrice || !currency || readPositiveDecimal(unitPrice) === null) {
        return null;
      }
      return {
        regionCode,
        billingMeter,
        unitPrice,
        currency: currency.toUpperCase(),
      };
    })
    .filter((item): item is PlaygroundModelReferencePrice => item !== null);
}

function readPriceAvailability(
  record: ApiRecord,
  officialReferenceUnitPrice: string | null,
  officialReferencePrices: readonly PlaygroundModelReferencePrice[],
): PlaygroundModelPriceAvailability {
  const fallbackStatus = officialReferenceUnitPrice !== null || officialReferencePrices.length > 0
    ? 'reference'
    : 'unavailable';
  const value = record.priceAvailability;
  if (!isRecord(value)) {
    return { status: fallbackStatus };
  }
  const status = value.status === 'reference' || value.status === 'unavailable'
    ? value.status
    : fallbackStatus;
  const reason = readNullableString(value, 'reason');
  return reason ? { status, reason } : { status };
}

function readPositiveDecimal(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(normalized)) {
    return null;
  }
  return normalized;
}

function readCatalogVendorName(item: ApiRecord, vendorCode: string): string {
  const explicitName = readNullableString(item, 'vendorName');
  if (explicitName) {
    return explicitName;
  }
  return formatVendorName(readNullableString(item, 'vendor') || vendorCode);
}

function formatVendorName(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return 'Unknown vendor';
  }
  const known: Record<string, string> = {
    anthropic: 'Anthropic',
    elevenlabs: 'ElevenLabs',
    kuaishou: 'Kuaishou',
    openai: 'OpenAI',
  };
  return known[normalized.toLowerCase()] ?? normalized
    .split(/[_\-\s]+/u)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

function modelBucketsForOption(option: PlaygroundModelOption): PlaygroundModelBucket[] {
  const capabilities = normalizedTokens(option.capabilities);
  const outputs = normalizedTokens(option.outputModalities);
  const allModalities = normalizedTokens([
    ...option.modalities,
    ...option.inputModalities,
    ...option.outputModalities,
  ]);
  const signal = normalizedTokens([
    ...option.capabilities,
    ...option.outputModalities,
    ...option.modalities,
    option.apiFormat ?? '',
    option.model,
    option.displayName,
  ]);
  const buckets: PlaygroundModelBucket[] = [];

  if (
    hasAnyToken(capabilities, ['chat', 'responses', 'tools', 'json_schema', 'function_calling', 'reasoning'])
    || hasAnyToken(outputs, ['text', 'chat', 'llm'])
    || (outputs.length === 0
      && hasAnyToken(allModalities, ['text', 'chat', 'llm'])
      && !hasAnyToken(allModalities, ['image', 'video', 'audio', 'speech', 'voice', 'music', 'sfx', 'sound_effect', 'sound_effects']))
  ) {
    buckets.push('llms');
  }
  if (hasAnyToken(capabilities, ['image']) || hasAnyToken(outputs, ['image'])) {
    buckets.push('images');
  }
  if (hasAnyToken(capabilities, ['video']) || hasAnyToken(outputs, ['video'])) {
    buckets.push('videos');
  }
  if (hasAnyToken(capabilities, ['music']) || hasAnyToken(outputs, ['music'])) {
    buckets.push('music');
  }
  if (
    hasAnyToken(capabilities, ['sfx', 'sound_effect', 'sound_effects'])
    || hasAnyToken(outputs, ['sfx', 'sound_effect', 'sound_effects'])
    || signal.some((value) => value.includes('text_to_sound'))
  ) {
    buckets.push('sfx');
  } else if (
    hasAnyToken(capabilities, ['audio', 'speech', 'voice', 'tts', 'stt'])
    || hasAnyToken(outputs, ['audio', 'speech', 'voice'])
  ) {
    buckets.push('audios');
  }

  return MODEL_BUCKETS.filter((bucket) => buckets.includes(bucket));
}

function normalizedTokens(values: readonly string[]): string[] {
  const tokens = values
    .flatMap((value) => normalizeModelToken(value))
    .filter((value) => value.length > 0);
  tokens.sort();
  return [...new Set(tokens)];
}

function normalizeModelToken(value: string): string[] {
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/gu, '_');
  switch (normalized) {
    case 'text':
    case 'chat':
    case 'llm':
      return ['text', 'chat', 'llm'];
    case 'speech':
    case 'voice':
    case 'audio':
      return ['audio', 'speech', 'voice'];
    case 'json':
    case 'json_mode':
      return ['json_schema'];
    case 'function_call':
    case 'function_calling':
    case 'tool_calling':
      return ['tools'];
    default:
      return [normalized];
  }
}

function hasAnyToken(values: readonly string[], needles: readonly string[]): boolean {
  return values.some((value) => needles.includes(value));
}

function compareModelOptions(left: PlaygroundModelOption, right: PlaygroundModelOption): number {
  return left.displayName.toLowerCase().localeCompare(right.displayName.toLowerCase())
    || left.catalogKey.localeCompare(right.catalogKey);
}

function deriveVersionLabel(displayName: string, model: string, apiFormat: string | undefined, item: ApiRecord): string {
  const versionMatch = `${displayName} ${model}`.match(/\bv?\d+(?:\.\d+){0,2}\b/iu);
  if (versionMatch) {
    return versionMatch[0].replace(/^v/iu, '').toUpperCase();
  }
  const signal = [
    ...readStringArray(item, 'outputModalities'),
    ...readStringArray(item, 'modalities'),
    ...readStringArray(item, 'capabilities'),
    apiFormat || '',
    model,
    displayName,
  ].join(' ').toLowerCase();
  if (signal.includes('image')) {
    return 'GEN';
  }
  if (signal.includes('video')) {
    return 'VID';
  }
  if (signal.includes('music')) {
    return 'MUS';
  }
  if (signal.includes('sfx') || signal.includes('sound')) {
    return 'SFX';
  }
  if (signal.includes('audio') || signal.includes('voice') || signal.includes('speech')) {
    return 'AUD';
  }
  const tierMatch = `${displayName} ${model}`.match(/\b(?:pro|lite|mini|ultra|max|flash|turbo|preview)\b/iu);
  if (tierMatch) {
    return tierMatch[0].toUpperCase();
  }
  return 'AI';
}

function readOptionalNumber(record: ApiRecord, key: string): number | undefined {
  if (record[key] === null || record[key] === undefined || record[key] === '') {
    return undefined;
  }
  const value = readNumber(record, key, Number.NaN);
  return Number.isFinite(value) ? value : undefined;
}

function readRequiredRecord(value: unknown, message: string): ApiRecord {
  if (!isRecord(value)) {
    throw new Error(message);
  }
  return value;
}

function hasAnyModels(group: PlaygroundModelGroup): boolean {
  return MODEL_BUCKETS.some((bucket) => group[bucket].length > 0);
}
