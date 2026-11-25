import {
  createClientOperationToken,
  readMediaResource,
  readMediaResourceUrl,
  type CloudRouterMediaResource,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import { trim } from '@sdkwork/cloudroutes-pc-commons/sdkwork-utils';
import {
  mapSdkworkGenerationArtifactsToHistoryMedia,
  mapSdkworkGenerationHistoryTypeToModality,
  mapSdkworkGenerationModalityToHistoryType,
} from '@sdkwork/generations-pc-workspace/generation-history';
import type {
  SdkworkGenerationAssetModality,
} from '@sdkwork/generations-pc-workspace/generation-asset-config';
import type {
  SdkworkGenerationCommandInput,
  SdkworkGenerationCommandModality,
  SdkworkGenerationOperationType,
  SdkworkGenerationRecord,
  SdkworkGenerationResult,
  SdkworkGenerationRun,
  SdkworkGenerationService,
} from '@sdkwork/generations-pc-workspace/generation-service';
import type {
  GenerationAgentRunCreateResult,
  GenerationAgentRunSnapshot,
  GenerationAgentRunStepSnapshot,
  GenerationAgentStepStatus,
  GenerationAgentUsageSummary,
  PlaygroundGenerationArtifact,
  PlaygroundGenerationRunStatus,
  PlaygroundGenerationTargetType,
  PlaygroundHistoryItem,
  PlaygroundReferenceAssetInput,
  PlaygroundReferenceAssetMode,
  PlaygroundReferenceImageInput,
} from './playgroundTypes.ts';
import type { GenerationAgentRunCreateInput } from './playgroundTypes.ts';

/** Terminal wire statuses of a generations record. */
const TERMINAL_GENERATION_STATUSES: ReadonlySet<string> = new Set(['succeeded', 'failed', 'canceled']);

/** Vendor media tasks (Seedance / Kling / Suno) run for minutes. */
const DEFAULT_POLL_INTERVAL_MS = 1_500;
const DEFAULT_POLL_ATTEMPTS = 400;
/** Restored history resolves results for at most this many recent completed runs. */
const MAX_RESTORED_RESULT_RUNS = 20;
const RESTORED_RESULT_CONCURRENCY = 4;

/** Polling knobs of an asset generation whose command returns non-terminal. */
export interface PlaygroundGenerationPollOptions {
  intervalMs?: number;
  maxAttempts?: number;
  sleep?: (milliseconds: number) => Promise<void>;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isTerminalGenerationStatus(status: string | undefined): boolean {
  return TERMINAL_GENERATION_STATUSES.has((status ?? '').trim());
}

/** A restored run keeps the raw wire status; only a succeeded one has results. */
function isSucceededGenerationStatus(status: string | undefined): boolean {
  return (status ?? '').trim() === 'succeeded';
}

/**
 * Restored history: completed asset runs resolve their results so the list
 * shows the media again and carries each result's asset-catalog state. Result
 * fetches run in bounded concurrency and a failed fetch degrades to a
 * media-less item instead of failing the whole history read.
 */
export async function fetchPlaygroundGenerationHistoryFromService(
  service: SdkworkGenerationService,
): Promise<PlaygroundHistoryItem[]> {
  const workspace = await service.getWorkspace();
  const items = workspace.runs.map(mapWorkspaceRunToHistoryItem);
  const restorable = items
    .filter((item) => isSucceededGenerationStatus(item.status) && item.type !== 'text')
    .slice(0, MAX_RESTORED_RESULT_RUNS);
  const resultsByRun = new Map<string, readonly SdkworkGenerationResult[]>();
  let cursor = 0;
  const workers = Array.from({ length: Math.min(RESTORED_RESULT_CONCURRENCY, restorable.length) }, async () => {
    while (cursor < restorable.length) {
      const item = restorable[cursor];
      cursor += 1;
      const results = await listRestoredResults(service, item.id);
      if (results) {
        resultsByRun.set(item.id, results);
      }
    }
  });
  await Promise.all(workers);
  return items.map((item) => attachRestoredResults(item, resultsByRun.get(item.id)));
}

async function listRestoredResults(
  service: SdkworkGenerationService,
  generationId: string,
): Promise<readonly SdkworkGenerationResult[] | undefined> {
  try {
    const page = await service.listGenerationResults({ generationId, pageSize: 20 });
    return page?.items ?? [];
  } catch {
    // A degraded result read (offline, legacy host without the operation)
    // leaves the item media-less instead of failing the whole history list.
    return undefined;
  }
}

function attachRestoredResults(
  item: PlaygroundHistoryItem,
  results: readonly SdkworkGenerationResult[] | undefined,
): PlaygroundHistoryItem {
  if (!results || results.length === 0 || item.type === 'text') {
    return item;
  }
  const targetType = mapSdkworkGenerationHistoryTypeToModality(item.type);
  if (!targetType) {
    return item;
  }
  const artifacts = mapGenerationResultsToArtifacts(results, targetType);
  const media = mapSdkworkGenerationArtifactsToHistoryMedia(artifacts, targetType);
  return {
    ...item,
    asset: media.asset,
    images: media.images,
    videos: media.videos,
    durationSeconds: media.durationSeconds ?? item.durationSeconds,
    results: results.map((result) => ({ resultId: result.id, assetId: result.assetId })),
  };
}

function mapWorkspaceRunToHistoryItem(run: SdkworkGenerationRun): PlaygroundHistoryItem {
  const timestamp = run.updatedAt;
  const modality = run.modality?.trim();
  return {
    id: run.id,
    date: timestamp.slice(0, 10),
    prompt: run.promptPreview || run.title,
    // A restored run carries its modality; the history list renders the right
    // preview kind (image grid / video / audio) instead of a text bubble.
    type: mapSdkworkGenerationModalityToHistoryType(
      modality as SdkworkGenerationAssetModality | undefined,
    ),
    modelInfo: run.model,
    status: run.status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function runPlaygroundAssetGeneration(
  input: GenerationAgentRunCreateInput,
  service: SdkworkGenerationService,
  poll: PlaygroundGenerationPollOptions = {},
): Promise<GenerationAgentRunCreateResult> {
  const prompt = trim(input.prompt ?? '');
  if (!prompt) {
    throw new Error('Generation prompt is required');
  }

  const targetType = requireAssetTargetType(input.targetType);
  const command = createGenerationCommandInput(input, prompt, targetType);
  const commandResult = await service.createGenerationCommand(command);
  // Async vendors (Kling / Vidu / Seedance / Suno) answer the command with a
  // queued or running record; poll it to a terminal state so the results — and
  // the server-side asset auto-save that runs on every refresh — land before
  // the turn is rendered. `maxAttempts: 0` keeps the previous fire-and-forget.
  const record = await waitForGenerationRecord(service, commandResult.record, poll);
  const resultsPage = await service.listGenerationResults({
    generationId: record.id,
    pageSize: 20,
  });
  const artifacts = mapGenerationResultsToArtifacts(resultsPage.items ?? [], targetType);
  for (const artifact of artifacts) {
    input.onArtifact?.(artifact);
  }

  const status = mapGenerationRecordStatus(record.status);
  const updatedAt = record.updatedAt || new Date().toISOString();
  return {
    agent: {
      id: 'sdkwork-generations',
      name: 'SDKWork Generations',
      versionId: 'app-sdk',
      model: input.selectedModel,
    },
    item: mapGenerationCommandToHistoryItem({
      artifacts,
      input,
      prompt,
      status,
      targetType,
      timestamp: updatedAt,
      generationId: record.id,
      results: resultsPage.items ?? [],
    }),
    meteringEvents: [],
    run: mapGenerationCommandToRunSnapshot(record.id, status),
    steps: mapGenerationCommandToSteps(record.id, status, artifacts),
    targetType,
    status,
    usage: mapGenerationCommandUsage(artifacts),
  };
}

async function waitForGenerationRecord(
  service: SdkworkGenerationService,
  initial: SdkworkGenerationRecord,
  poll: PlaygroundGenerationPollOptions,
): Promise<SdkworkGenerationRecord> {
  let record = initial;
  const maxAttempts = poll.maxAttempts ?? DEFAULT_POLL_ATTEMPTS;
  const sleep = poll.sleep ?? defaultSleep;
  for (let attempt = 0; attempt < maxAttempts && !isTerminalGenerationStatus(record.status); attempt += 1) {
    await sleep(poll.intervalMs ?? DEFAULT_POLL_INTERVAL_MS);
    // A failed poll keeps the last known record; the next attempt polls again.
    record = await service.getGeneration(record.id).catch(() => record);
  }
  return record;
}

function createGenerationCommandInput(
  input: GenerationAgentRunCreateInput,
  prompt: string,
  targetType: PlaygroundGenerationTargetType,
): SdkworkGenerationCommandInput {
  return {
    modality: mapGenerationTargetToCommandModality(targetType),
    operationType: resolveGenerationOperationType(input, targetType),
    prompt,
    ...(input.selectedModel ? { model: input.selectedModel } : {}),
    inputAssetIds: readInputAssetIds(input.referenceImages, input.referenceAssets),
    parameters: createGenerationCommandParameters(input, targetType),
    idempotencyKey: createClientOperationToken('playground-generations-command'),
  };
}

/**
 * Translate a Playground reference mode onto the `generationMode` vocabulary
 * the generations provider adapter dispatches.
 *
 * The Playground composer names its video modes by intent
 * (`first_frame` / `first_last_frame` / `multi_reference` / `omni_reference`),
 * while the adapter switches on vendor surfaces (`start_end_frame` /
 * `reference_to_video` / `image_to_video`). Without this translation every
 * reference-driven video submit fell through to the operation-type default and
 * silently lost its tail frame or its extra references.
 *
 * The resolved mode rides `parameters.generationMode`; the routed operation
 * stays inside the app-API `SdkworkGenerationOperationType` enum, which the
 * generations SDK maps one-to-one onto a command endpoint.
 */
function mapReferenceModeToGenerationMode(
  referenceMode: PlaygroundReferenceAssetMode | undefined,
): string | undefined {
  switch (referenceMode) {
    case 'first_last_frame':
      return 'start_end_frame';
    case 'first_frame':
      return 'image_to_video';
    case 'multi_reference':
    case 'omni_reference':
      return 'reference_to_video';
    default:
      return undefined;
  }
}

function createGenerationCommandParameters(
  input: GenerationAgentRunCreateInput,
  targetType: PlaygroundGenerationTargetType,
): Record<string, unknown> {
  const generationMode = mapReferenceModeToGenerationMode(input.referenceMode);
  return compactRecord({
    generationConfig: input.generationConfig,
    // The adapter resolves the vendor from `parameters.vendor` before the
    // `vendor/` model prefix; sending it explicitly keeps a catalog
    // `vendorCode` (`kuaishou`, `bytedance`, ...) routed to its own surface
    // instead of the modality default vendor.
    vendor: resolveCommandVendor(input),
    generationMode,
    referenceAssets: mapReferenceAssets(input.referenceAssets),
    referenceImages: mapReferenceImages(input.referenceImages),
    referenceMode: input.referenceMode,
    targetType,
  });
}

/**
 * Vendor code a Playground command routes to.
 *
 * The catalog option carries the authoritative `vendorCode`; a `vendor/model`
 * catalog key is the fallback for callers that only know the model id. Both
 * spellings reach the adapter as `parameters.vendor`, and `resolve_vendor`
 * strips a redundant matching prefix, so the wire model stays the
 * vendor-stripped id.
 */
function resolveCommandVendor(input: GenerationAgentRunCreateInput): string | undefined {
  const explicit = trim(input.selectedVendorCode ?? '');
  if (explicit) {
    return explicit;
  }
  const normalized = trim(input.selectedModel ?? '');
  if (!normalized) {
    return undefined;
  }
  const [prefix, rest] = normalized.split('/', 2);
  return prefix && rest ? prefix.trim() : undefined;
}

function resolveGenerationOperationType(
  input: GenerationAgentRunCreateInput,
  targetType: PlaygroundGenerationTargetType,
): SdkworkGenerationOperationType {
  if (targetType === 'image') {
    if (input.referenceMode === 'image_to_image' || input.referenceMode === 'multi_reference') {
      return 'image_edit';
    }
    return hasReferences(input.referenceImages, input.referenceAssets) ? 'image_edit' : 'text_to_image';
  }
  if (targetType === 'video') {
    // The precise reference mode rides `parameters.generationMode`; the routed
    // operation stays one the app API dispatches.
    if (input.referenceMode === 'first_frame' || input.referenceMode === 'first_last_frame' || input.referenceMode === 'multi_reference' || input.referenceMode === 'omni_reference') {
      return 'image_to_video';
    }
    return hasReferences(input.referenceImages, input.referenceAssets) ? 'image_to_video' : 'text_to_video';
  }
  if (targetType === 'music') {
    return 'text_to_music';
  }
  if (targetType === 'audio') {
    return 'speech';
  }
  if (targetType === 'sfx') {
    return 'sound_effect';
  }

  throw new Error(`Unsupported generation target: ${targetType satisfies never}`);
}

function mapGenerationTargetToCommandModality(
  targetType: PlaygroundGenerationTargetType,
): SdkworkGenerationCommandModality {
  return targetType;
}

function mapGenerationResultsToArtifacts(
  results: readonly {
    assetId?: string;
    id?: string;
    previewText?: string;
    resourceSnapshot?: unknown;
    resultType: string;
  }[],
  targetType: PlaygroundGenerationTargetType,
): PlaygroundGenerationArtifact[] {
  return results
    .map((result) => mapGenerationResultToArtifact(result, targetType))
    .filter((artifact): artifact is PlaygroundGenerationArtifact => artifact !== null);
}

function mapGenerationResultToArtifact(
  result: {
    assetId?: string;
    id?: string;
    previewText?: string;
    resourceSnapshot?: unknown;
    resultType: string;
  },
  targetType: PlaygroundGenerationTargetType,
): PlaygroundGenerationArtifact | null {
  const resource = readGenerationResultResource(result.resourceSnapshot, result.resultType, result.previewText);
  if (!resource || !readMediaResourceUrl(resource)) {
    return null;
  }

  return {
    asset: resource,
    modality: targetType,
    // Result identity + catalog state ride along for the asset actions.
    ...(result.id?.trim() ? { resultId: result.id.trim() } : {}),
    ...(result.assetId?.trim() ? { assetId: result.assetId.trim() } : {}),
  };
}

function readGenerationResultResource(
  value: unknown,
  resultType: string,
  previewText: string | undefined,
): CloudRouterMediaResource | undefined {
  const direct = readMediaResource(value);
  if (direct) {
    return normalizeGenerationResultMediaResource(direct, value, previewText);
  }
  if (!isRecord(value)) {
    return undefined;
  }
  const url = readFirstString(value, ['url', 'publicUrl', 'uri', 'driveUri']);
  if (!url) {
    return undefined;
  }
  const kind = readMediaKind(resultType, value);
  return {
    kind,
    source: 'generated',
    url,
    publicUrl: url,
    uri: url,
    title: previewText,
    mimeType: readFirstString(value, ['mimeType', 'contentType']) || undefined,
    durationSeconds: readDurationSeconds(value),
  };
}

function normalizeGenerationResultMediaResource(
  resource: CloudRouterMediaResource,
  rawValue: unknown,
  previewText: string | undefined,
): CloudRouterMediaResource {
  if (!isRecord(rawValue)) {
    return resource;
  }
  const mimeType = readFirstString(rawValue, ['mimeType', 'contentType']) || undefined;
  const durationSeconds = resource.durationSeconds ?? readDurationSeconds(rawValue);
  const url = readMediaResourceUrl(resource) ?? readFirstString(rawValue, ['url', 'publicUrl', 'uri', 'driveUri']);
  return {
    ...resource,
    ...(url && !resource.url ? { url } : {}),
    ...(url && !resource.publicUrl ? { publicUrl: url } : {}),
    ...(url && !resource.uri ? { uri: url } : {}),
    title: resource.title ?? previewText,
    ...(mimeType && !resource.mimeType ? { mimeType } : {}),
    ...(durationSeconds !== undefined ? { durationSeconds } : {}),
  };
}

function readMediaKind(
  resultType: string,
  value: Record<string, unknown>,
): CloudRouterMediaResource['kind'] {
  const signal = `${resultType} ${readFirstString(value, ['mediaType', 'kind', 'contentType'])}`.toLowerCase();
  if (signal.includes('image')) {
    return 'image';
  }
  if (signal.includes('video')) {
    return 'video';
  }
  if (signal.includes('audio') || signal.includes('music') || signal.includes('sfx') || signal.includes('sound')) {
    return 'audio';
  }
  return 'other';
}

function readDurationSeconds(value: Record<string, unknown>): number | undefined {
  const durationSeconds = readOptionalNumber(value.durationSeconds ?? value.duration_seconds ?? value.duration);
  if (durationSeconds !== undefined) {
    return durationSeconds;
  }
  const durationMs = readOptionalNumber(value.durationMs ?? value.duration_ms);
  return durationMs === undefined ? undefined : durationMs / 1000;
}

function mapGenerationCommandToHistoryItem({
  artifacts,
  generationId,
  input,
  prompt,
  results,
  status,
  targetType,
  timestamp,
}: {
  artifacts: readonly PlaygroundGenerationArtifact[];
  generationId: string;
  input: GenerationAgentRunCreateInput;
  prompt: string;
  results: readonly SdkworkGenerationResult[];
  status: PlaygroundGenerationRunStatus;
  targetType: PlaygroundGenerationTargetType;
  timestamp: string;
}): PlaygroundHistoryItem {
  const media = mapSdkworkGenerationArtifactsToHistoryMedia(artifacts, targetType);
  return {
    aspectRatio: input.generationConfig?.aspectRatio,
    createdAt: timestamp,
    date: timestamp.slice(0, 10),
    durationSeconds: media.durationSeconds ?? input.generationConfig?.durationSeconds,
    generationConfig: input.generationConfig,
    id: generationId,
    asset: media.asset,
    images: media.images,
    modelCatalogKey: input.selectedModel,
    modelInfo: input.selectedModel,
    outputText: artifacts.length === 0 ? 'Generation accepted.' : undefined,
    prompt,
    results: results.map((result) => ({ resultId: result.id, assetId: result.assetId })),
    status,
    type: mapSdkworkGenerationModalityToHistoryType(targetType),
    updatedAt: timestamp,
    videos: media.videos,
  };
}

function mapGenerationCommandToRunSnapshot(
  generationId: string,
  status: PlaygroundGenerationRunStatus,
): GenerationAgentRunSnapshot {
  return {
    id: generationId,
    requestId: generationId,
    source: 'generation-agent',
    status: status === 'completed'
      ? 'succeeded'
      : status === 'cancelled'
        ? 'cancelled'
        : status === 'failed'
          ? 'failed'
          : 'running',
  };
}

function mapGenerationCommandToSteps(
  generationId: string,
  status: PlaygroundGenerationRunStatus,
  artifacts: readonly PlaygroundGenerationArtifact[],
): GenerationAgentRunStepSnapshot[] {
  const stepStatus: GenerationAgentStepStatus = status === 'completed'
    ? 'succeeded'
    : status === 'failed'
      ? 'failed'
      : status === 'cancelled'
        ? 'skipped'
        : 'running';
  return [
    {
      id: `${generationId}-command`,
      index: 0,
      status: stepStatus,
      title: 'Generation command',
      type: 'model_call',
    },
    ...(artifacts.length > 0
      ? [{
        id: `${generationId}-media`,
        index: 1,
        status: stepStatus,
        title: 'Media generation',
        type: 'media_generation' as const,
      }]
      : []),
  ];
}

function mapGenerationCommandUsage(
  artifacts: readonly PlaygroundGenerationArtifact[],
): GenerationAgentUsageSummary {
  const videoSeconds = artifacts
    .filter((artifact) => artifact.modality === 'video')
    .reduce((total, artifact) => total + (artifact.asset.durationSeconds ?? 0), 0);
  return {
    cachedTokens: 0,
    completionTokens: 0,
    events: [],
    imageCount: artifacts.filter((artifact) => artifact.modality === 'image').length,
    promptTokens: 0,
    totalTokens: 0,
    videoSeconds: String(videoSeconds),
  };
}

function mapGenerationRecordStatus(status: string): PlaygroundGenerationRunStatus {
  switch (status) {
    case 'succeeded':
      return 'completed';
    case 'failed':
      return 'failed';
    case 'canceled':
      return 'cancelled';
    case 'queued':
      return 'pending';
    case 'running':
    case 'requires_action':
    default:
      return 'processing';
  }
}

function readInputAssetIds(
  referenceImages: readonly PlaygroundReferenceImageInput[] | undefined,
  referenceAssets: readonly PlaygroundReferenceAssetInput[] | undefined,
): string[] | undefined {
  const ids = [
    ...(referenceImages ?? []).map((referenceImage) => readReferenceResourceAssetId(referenceImage.resource)),
    ...(referenceAssets ?? []).map((referenceAsset) => readReferenceResourceAssetId(referenceAsset.resource)),
  ].filter((value): value is string => Boolean(value?.trim()));
  return ids.length > 0 ? ids : undefined;
}

function mapReferenceImages(
  referenceImages: readonly PlaygroundReferenceImageInput[] | undefined,
): Record<string, unknown>[] | undefined {
  const references = (referenceImages ?? []).map((referenceImage) => compactRecord({
    assetId: readReferenceResourceAssetId(referenceImage.resource),
    mimeType: referenceImage.mimeType,
    name: referenceImage.name,
    resource: referenceImage.resource,
    sizeBytes: referenceImage.sizeBytes,
    url: readMediaResourceUrl(referenceImage.resource),
  }));
  return references.length > 0 ? references : undefined;
}

function mapReferenceAssets(
  referenceAssets: readonly PlaygroundReferenceAssetInput[] | undefined,
): Record<string, unknown>[] | undefined {
  const references = (referenceAssets ?? []).map((referenceAsset) => compactRecord({
    assetId: readReferenceResourceAssetId(referenceAsset.resource),
    kind: referenceAsset.kind,
    mimeType: referenceAsset.mimeType,
    name: referenceAsset.name,
    // The adapter derives `imageTail` / `audioUrl` / driving videos from this
    // role; a role-less entry is a plain `reference_image`.
    role: referenceAsset.role,
    resource: referenceAsset.resource,
    sizeBytes: referenceAsset.sizeBytes,
    url: readMediaResourceUrl(referenceAsset.resource),
  }));
  return references.length > 0 ? references : undefined;
}

function readReferenceResourceAssetId(resource: CloudRouterMediaResource): string | undefined {
  const record = resource as unknown as Record<string, unknown>;
  for (const key of ['id', 'objectBlobId', 'objectKey', 'uri']) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function requireAssetTargetType(
  targetType: PlaygroundGenerationTargetType | undefined,
): PlaygroundGenerationTargetType {
  if (!targetType) {
    throw new Error('Generation target type is required');
  }
  return targetType;
}

function hasReferences(
  referenceImages: readonly PlaygroundReferenceImageInput[] | undefined,
  referenceAssets: readonly PlaygroundReferenceAssetInput[] | undefined,
): boolean {
  return (referenceImages?.length ?? 0) > 0 || (referenceAssets?.length ?? 0) > 0;
}

function compactRecord(record: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => (
      value !== undefined
      && value !== null
      && (!(Array.isArray(value)) || value.length > 0)
      && (!(typeof value === 'string') || value.trim().length > 0)
    )),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function readFirstString(record: Record<string, unknown>, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}

function readOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}
