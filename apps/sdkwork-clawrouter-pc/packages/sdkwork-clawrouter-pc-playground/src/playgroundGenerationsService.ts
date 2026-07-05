import {
  createClientOperationToken,
  readMediaResource,
  readMediaResourceUrl,
  type ClawRouterMediaResource,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { trim } from '@sdkwork/clawroutes-pc-commons/sdkwork-utils';
import {
  mapSdkworkGenerationArtifactsToHistoryMedia,
  mapSdkworkGenerationModalityToHistoryType,
} from '@sdkwork/generations-pc-workspace/generation-history';
import type {
  SdkworkGenerationCommandInput,
  SdkworkGenerationCommandModality,
  SdkworkGenerationOperationType,
  SdkworkGenerationRecord,
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
  PlaygroundReferenceImageInput,
} from './playgroundTypes.ts';
import type { GenerationAgentRunCreateInput } from './playgroundTypes.ts';

export async function fetchPlaygroundGenerationHistoryFromService(
  service: SdkworkGenerationService,
): Promise<PlaygroundHistoryItem[]> {
  const workspace = await service.getWorkspace();
  return workspace.runs.map(mapWorkspaceRunToHistoryItem);
}

function mapWorkspaceRunToHistoryItem(run: SdkworkGenerationRun): PlaygroundHistoryItem {
  const timestamp = run.updatedAt;
  return {
    id: run.id,
    date: timestamp.slice(0, 10),
    prompt: run.promptPreview || run.title,
    type: 'text',
    modelInfo: run.model,
    status: run.status,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export async function runPlaygroundAssetGeneration(
  input: GenerationAgentRunCreateInput,
  service: SdkworkGenerationService,
): Promise<GenerationAgentRunCreateResult> {
  const prompt = trim(input.prompt ?? '');
  if (!prompt) {
    throw new Error('Generation prompt is required');
  }

  const targetType = requireAssetTargetType(input.targetType);
  const command = createGenerationCommandInput(input, prompt, targetType);
  const commandResult = await service.createGenerationCommand(command);
  const resultsPage = await service.listGenerationResults({
    generationId: commandResult.record.id,
    pageSize: 20,
  });
  const artifacts = mapGenerationResultsToArtifacts(resultsPage.items ?? [], targetType);
  for (const artifact of artifacts) {
    input.onArtifact?.(artifact);
  }

  const status = mapGenerationRecordStatus(commandResult.record.status);
  const updatedAt = commandResult.record.updatedAt || new Date().toISOString();
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
      generationId: commandResult.record.id,
    }),
    meteringEvents: [],
    run: mapGenerationCommandToRunSnapshot(commandResult.record.id, status),
    steps: mapGenerationCommandToSteps(commandResult.record.id, status, artifacts),
    targetType,
    status,
    usage: mapGenerationCommandUsage(artifacts),
  };
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

function createGenerationCommandParameters(
  input: GenerationAgentRunCreateInput,
  targetType: PlaygroundGenerationTargetType,
): Record<string, unknown> {
  return compactRecord({
    generationConfig: input.generationConfig,
    referenceAssets: mapReferenceAssets(input.referenceAssets),
    referenceImages: mapReferenceImages(input.referenceImages),
    referenceMode: input.referenceMode,
    targetType,
  });
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
  };
}

function readGenerationResultResource(
  value: unknown,
  resultType: string,
  previewText: string | undefined,
): ClawRouterMediaResource | undefined {
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
  resource: ClawRouterMediaResource,
  rawValue: unknown,
  previewText: string | undefined,
): ClawRouterMediaResource {
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
): ClawRouterMediaResource['kind'] {
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

function mapGenerationRecordToHistoryItem(
  record: SdkworkGenerationRecord,
  artifacts: readonly PlaygroundGenerationArtifact[],
  targetType: PlaygroundGenerationTargetType | undefined,
): PlaygroundHistoryItem {
  const status = mapGenerationRecordStatus(record.status);
  const timestamp = record.updatedAt || record.createdAt;
  const prompt = trim(record.promptPreview ?? '') || record.operationType || record.id;
  const media = targetType
    ? mapSdkworkGenerationArtifactsToHistoryMedia(artifacts, targetType)
    : { images: [], videos: [] };
  return {
    createdAt: record.createdAt,
    date: record.createdAt.slice(0, 10),
    durationSeconds: media.durationSeconds,
    id: record.id,
    asset: media.asset,
    images: media.images,
    modelCatalogKey: record.sourceProvider,
    modelInfo: record.sourceProvider,
    prompt,
    status,
    type: mapSdkworkGenerationModalityToHistoryType(targetType),
    updatedAt: record.updatedAt,
    videos: media.videos,
  };
}

function mapRecordModalityToTargetType(
  modality: string,
): PlaygroundGenerationTargetType | undefined {
  switch (modality) {
    case 'image':
    case 'video':
    case 'music':
    case 'audio':
    case 'sfx':
      return modality;
    case 'voice':
      return 'audio';
    default:
      return undefined;
  }
}

function mapGenerationCommandToHistoryItem({
  artifacts,
  generationId,
  input,
  prompt,
  status,
  targetType,
  timestamp,
}: {
  artifacts: readonly PlaygroundGenerationArtifact[];
  generationId: string;
  input: GenerationAgentRunCreateInput;
  prompt: string;
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
    resource: referenceAsset.resource,
    role: referenceAsset.role,
    sizeBytes: referenceAsset.sizeBytes,
    url: readMediaResourceUrl(referenceAsset.resource),
  }));
  return references.length > 0 ? references : undefined;
}

function readReferenceResourceAssetId(resource: ClawRouterMediaResource): string | undefined {
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
