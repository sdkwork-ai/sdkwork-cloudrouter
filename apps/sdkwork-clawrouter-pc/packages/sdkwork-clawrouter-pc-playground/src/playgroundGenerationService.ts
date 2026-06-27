import {
  ensureSdkworkApiSuccess,
  hasStoredPortalSession,
  isRecord,
  readMediaResource,
  readMediaResourceUrl,
  readApiItem,
  readRequiredApiItems,
  type ApiRecord,
  type ClawRouterMediaResource,
  type JsonValue,
  emptyRuntimeUsageSnapshot,
  mergeRuntimeUsageSnapshots,
  readPreferredRuntimeUsageCount,
  readRuntimeUsageSnapshot,
  type RuntimeUsageSnapshot,
  createClientOperationToken,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { trim } from '@sdkwork/clawroutes-pc-commons/sdkwork-utils';
import {
  mapSdkworkGenerationArtifactsToHistoryMedia,
  mapSdkworkGenerationModalityToHistoryType,
} from '@sdkwork/generations-pc-workspace/generation-history';
import {
  completeRuntimeInvocation as completeRuntimeInvocationOperation,
  createRuntimeInvocation,
  listRuntimeArtifacts,
  streamRuntimeEvents,
} from './appRuntimeApiOperations.ts';
import { readRuntimeTextDelta, type RuntimeStreamEvent } from './runtimeStream.ts';
import type {
  GenerationAgentRunCreateInput,
  GenerationAgentRunCreateResult,
  GenerationAgentRunSnapshot,
  GenerationAgentRunStatus,
  GenerationAgentRunStepSnapshot,
  GenerationAgentStepStatus,
  GenerationAgentUsageSummary,
  PlaygroundGenerationArtifact,
  PlaygroundGenerationRunStatus,
  PlaygroundGenerationTargetType,
  PlaygroundHistoryItem,
} from './playgroundTypes.ts';

const PLAYGROUND_AGENT_NAME = 'Playground Generation Agent';
const PLAYGROUND_SOURCE_SURFACE = 'playground';
const RUNTIME_ADAPTER = 'openai_compatible';
const RUNTIME_ENDPOINT = 'agent.stream';
const TITLE_MAX_LENGTH = 96;

interface AgentRunItem {
  cachedTokens?: number | null;
  completedAt?: string | null;
  createdAt?: string | null;
  id: string;
  inputTokens?: number | null;
  model?: string | null;
  outputTokens?: number | null;
  requestId: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  totalTokens?: number | null;
}

interface AgentRunStepItem {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  stepIndex: number;
  stepType: 'input' | 'model' | 'tool' | 'memory' | 'runtime' | 'system' | 'custom';
  title?: string | null;
}

interface RuntimeInvocationItem {
  completedAt?: string | null;
  createdAt?: string | null;
  id: string;
}

interface RuntimeGenerationOutput {
  artifacts: PlaygroundGenerationArtifact[];
  outputText: string;
  usage: RuntimeUsageSnapshot;
}

export async function runPlaygroundGeneration(input: GenerationAgentRunCreateInput): Promise<GenerationAgentRunCreateResult> {
  const prompt = trim(input.prompt ?? '');
  if (!prompt) {
    throw new Error('Generation agent prompt is required');
  }
  if (!hasStoredPortalSession()) {
    throw new Error('Portal session is required to run generation agent');
  }

  const selectedModel = trim(input.selectedModel ?? '');
  const requestedTargetType = input.targetType;
  const runId = createClientOperationToken('playground-runtime-run');
  const runtimeInvocation = await createPlaygroundRuntimeInvocation({
    input,
    prompt,
    requestedTargetType,
    runId,
    selectedModel,
  });

  let generationOutput: RuntimeGenerationOutput;
  try {
    generationOutput = await readRuntimeGenerationOutput(runtimeInvocation.id, input);
  } catch {
    await failPlaygroundRuntimeInvocation({
      errorCode: 'runtime_stream_failed',
      errorMessageMasked: 'Runtime stream failed before completion',
      invocationId: runtimeInvocation.id,
    });
    throw new Error('playground.agent.errors.runtimeUnavailable');
  }

  if (!generationOutput.outputText.trim() && generationOutput.artifacts.length === 0) {
    await failPlaygroundRuntimeInvocation({
      errorCode: 'runtime_stream_empty',
      errorMessageMasked: 'Runtime stream completed without agent output',
      invocationId: runtimeInvocation.id,
    });
    throw new Error('playground.agent.errors.runtimeUnavailable');
  }

  const completedInvocation = await completeAgentRuntimeInvocation(
    runtimeInvocation.id,
    generationOutput,
  );
  const completedGenerationOutput: RuntimeGenerationOutput = {
    ...generationOutput,
    usage: mergeRuntimeUsageSnapshots(generationOutput.usage, readRuntimeUsageSnapshot(completedInvocation)),
  };
  const completedRun = createSyntheticRun(completedInvocation, completedGenerationOutput.usage, selectedModel, runId);
  const completedStep = createSyntheticRuntimeStep(completedInvocation.id);
  const completedAt = completedRun.completedAt || completedInvocation.completedAt || completedRun.createdAt;

  const resultTargetType = resolveGenerationResultTargetType(requestedTargetType, completedGenerationOutput.artifacts);
  const steps = [mapAgentRunStepSnapshot(completedStep)];
  if (completedGenerationOutput.artifacts.length > 0) {
    steps.push(createMediaGenerationStepSnapshot(completedStep));
  }

  return {
    agent: {
      id: 'playground-runtime',
      model: selectedModel || completedRun.model || undefined,
      name: PLAYGROUND_AGENT_NAME,
      versionId: 'playground-runtime',
    },
    item: mapAgentRunToHistoryItem({
      artifacts: completedGenerationOutput.artifacts,
      generationConfig: input.generationConfig,
      model: selectedModel || completedRun.model || undefined,
      prompt,
      run: completedRun,
      targetType: resultTargetType,
      timestamp: completedAt,
      outputText: completedGenerationOutput.outputText,
    }),
    meteringEvents: [],
    run: mapAgentRunSnapshot(completedRun),
    steps,
    targetType: resultTargetType,
    status: mapPlaygroundGenerationStatus(completedRun.status),
    usage: mapRuntimeUsageSummary(completedGenerationOutput.artifacts, completedGenerationOutput.usage),
  };
}

async function createPlaygroundRuntimeInvocation(
  {
    input,
    prompt,
    requestedTargetType,
    runId,
    selectedModel,
  }: {
    input: GenerationAgentRunCreateInput;
    prompt: string;
    requestedTargetType?: PlaygroundGenerationTargetType;
    runId: string;
    selectedModel: string;
  },
): Promise<RuntimeInvocationItem> {
  const result = await createRuntimeInvocation(
    {
      endpoint: RUNTIME_ENDPOINT,
      invocationType: 'agent_run',
      metadata: compactJsonObject({
        generationService: 'playground-generation-service',
        runId,
        surface: PLAYGROUND_SOURCE_SURFACE,
        targetType: requestedTargetType,
      }),
      model: selectedModel || undefined,
      provider: selectedModel ? readProviderFromModel(selectedModel) : undefined,
      requestJson: compactJsonObject({
        generationConfig: input.generationConfig,
        prompt,
        referenceAssets: input.referenceAssets,
        referenceImages: input.referenceImages,
        referenceMode: input.referenceMode,
        selectedModel: selectedModel || undefined,
        targetType: requestedTargetType,
      }),
      runtime: RUNTIME_ADAPTER,
      status: 'streaming',
      streaming: true,
    },
    { idempotencyPrefix: 'playground-agent-runtime' },
  );
  ensureSdkworkApiSuccess(result, 'Failed to create playground runtime invocation');
  const item = readApiItem(result);
  if (!item) {
    throw new Error('Playground runtime invocation response missing item');
  }
  return item as unknown as RuntimeInvocationItem;
}

function createSyntheticRun(
  invocation: RuntimeInvocationItem,
  usage: RuntimeUsageSnapshot,
  selectedModel: string,
  runId: string,
): AgentRunItem {
  const now = new Date().toISOString();
  return {
    cachedTokens: readPreferredRuntimeUsageCount(undefined, usage.cachedTokens),
    completedAt: invocation.completedAt ?? now,
    createdAt: invocation.createdAt ?? now,
    id: runId,
    inputTokens: readPreferredRuntimeUsageCount(undefined, usage.inputTokens),
    model: selectedModel || undefined,
    outputTokens: readPreferredRuntimeUsageCount(undefined, usage.outputTokens),
    requestId: runId,
    status: 'completed',
    totalTokens: readPreferredRuntimeUsageCount(undefined, usage.totalTokens),
  };
}

function createSyntheticRuntimeStep(invocationId: string): AgentRunStepItem {
  return {
    id: `${invocationId}-runtime`,
    status: 'completed',
    stepIndex: 1,
    stepType: 'runtime',
    title: 'Runtime stream',
  };
}

async function failPlaygroundRuntimeInvocation(
  {
    errorCode,
    errorMessageMasked,
    invocationId,
  }: {
    errorCode: string;
    errorMessageMasked: string;
    invocationId: string;
  },
): Promise<void> {
  const runtimeResult = await completeRuntimeInvocationOperation(
    invocationId,
    {
      errorCode,
      errorMessageMasked,
      errorType: 'runtime_unavailable',
      status: 'failed',
    },
    { idempotencyPrefix: 'playground-agent-runtime-failed' },
  );
  ensureSdkworkApiSuccess(runtimeResult, 'Failed to mark playground runtime invocation failed');
}

async function readRuntimeGenerationOutput(
  invocationId: string,
  callbacks: Pick<GenerationAgentRunCreateInput, 'onArtifact' | 'onDelta' | 'targetType'>,
): Promise<RuntimeGenerationOutput> {
  const artifacts: PlaygroundGenerationArtifact[] = [];
  let outputText = '';
  let usage = emptyRuntimeUsageSnapshot();
  let shouldLoadRuntimeArtifacts = false;
  const events = await streamRuntimeEvents(invocationId);
  for await (const event of events) {
    const textDelta = readRuntimeTextDelta(event);
    if (textDelta) {
      outputText += textDelta;
      callbacks.onDelta?.(textDelta);
    }
    usage = mergeRuntimeUsageSnapshots(usage, readRuntimeUsageSnapshot(event));
    const eventArtifacts = readGenerationArtifactsFromRuntimeEvent(event, callbacks.targetType);
    if (eventArtifacts.length === 0 && isRuntimeArtifactReferenceEvent(event)) {
      shouldLoadRuntimeArtifacts = true;
    }
    for (const artifact of eventArtifacts) {
      if (hasGenerationArtifact(artifacts, artifact)) {
        continue;
      }
      artifacts.push(artifact);
      callbacks.onArtifact?.(artifact);
    }
  }
  if (shouldLoadRuntimeArtifacts) {
    await appendRuntimeArtifactListOutput(invocationId, callbacks, artifacts);
  }
  return { artifacts, outputText, usage };
}

async function appendRuntimeArtifactListOutput(
  invocationId: string,
  callbacks: Pick<GenerationAgentRunCreateInput, 'onArtifact' | 'targetType'>,
  artifacts: PlaygroundGenerationArtifact[],
): Promise<void> {
  const result = await listRuntimeArtifacts(invocationId, { pageSize: 100 });
  ensureSdkworkApiSuccess(result, 'Failed to list playground runtime artifacts');
  const eventArtifacts = readRequiredApiItems(result, 'Playground runtime artifact list response missing items')
    .map((artifact) => readGenerationArtifact(artifact, callbacks.targetType))
    .filter((artifact): artifact is PlaygroundGenerationArtifact => artifact !== null);
  for (const artifact of eventArtifacts) {
    if (hasGenerationArtifact(artifacts, artifact)) {
      continue;
    }
    artifacts.push(artifact);
    callbacks.onArtifact?.(artifact);
  }
}

function readGenerationArtifactsFromRuntimeEvent(
  event: RuntimeStreamEvent,
  targetType?: PlaygroundGenerationTargetType,
): PlaygroundGenerationArtifact[] {
  const eventType = trim(event.eventType ?? '').toLowerCase();
  const eventSource = trim(event.eventSource ?? '').toLowerCase();
  const payload = event.payloadJson;
  const candidates: unknown[] = [];
  const isAssetSignal = isGenerationAssetSignal(eventType, eventSource);

  if (isAssetSignal && isRecord(payload)) {
    candidates.push(payload);
  }
  if (isRecord(payload)) {
    appendGenerationArtifactCandidates(candidates, payload, {
      allowEnvelopeTraversal: isAssetSignal,
      includeCurrentRecord: isAssetSignal,
    });
  }

  return candidates
    .map((candidate) => readGenerationArtifact(candidate, targetType))
    .filter((artifact): artifact is PlaygroundGenerationArtifact => artifact !== null);
}

function isGenerationAssetSignal(eventType: string, eventSource: string): boolean {
  return eventType === 'generation.asset'
    || eventType === 'media.asset'
    || eventType === 'artifact.created'
    || eventType === 'runtime.artifact'
    || eventType.endsWith('.asset')
    || eventSource === 'generation';
}

function isRuntimeArtifactReferenceEvent(event: RuntimeStreamEvent): boolean {
  const eventType = trim(event.eventType ?? '').toLowerCase();
  if (eventType !== 'artifact.created' && eventType !== 'runtime.artifact') {
    return false;
  }
  const payload = event.payloadJson;
  return isRecord(payload) && hasRuntimeArtifactReference(payload);
}

function hasRuntimeArtifactReference(record: ApiRecord): boolean {
  if (readFirstString(record, ['artifactId', 'artifact_id'])) {
    return true;
  }
  for (const key of ['artifact', 'asset']) {
    const value = record[key];
    if (isRecord(value) && readFirstString(value, ['id', 'artifactId', 'artifact_id'])) {
      return true;
    }
  }
  for (const key of ['artifacts', 'assets']) {
    const value = record[key];
    if (Array.isArray(value) && value.some((item) => isRecord(item) && readFirstString(item, ['id', 'artifactId', 'artifact_id']))) {
      return true;
    }
  }
  return false;
}

function appendGenerationArtifactCandidates(
  candidates: unknown[],
  value: unknown,
  options: { allowEnvelopeTraversal: boolean; includeCurrentRecord: boolean },
  depth = 0,
): void {
  if (depth > 5) {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      appendGenerationArtifactCandidates(candidates, item, {
        ...options,
        includeCurrentRecord: true,
      }, depth + 1);
    }
    return;
  }
  if (!isRecord(value)) {
    return;
  }
  if (options.includeCurrentRecord) {
    candidates.push(value);
  }
  const keys = options.allowEnvelopeTraversal
    ? ['asset', 'artifact', 'assets', 'artifacts', 'media', 'data', 'result', 'output', 'response', 'payload', 'item']
    : ['asset', 'artifact', 'assets', 'artifacts', 'media'];
  for (const key of keys) {
    appendGenerationArtifactCandidates(candidates, value[key], {
      ...options,
      includeCurrentRecord: true,
    }, depth + 1);
  }
}

function readGenerationArtifact(
  value: unknown,
  targetType?: PlaygroundGenerationTargetType,
): PlaygroundGenerationArtifact | null {
  if (!isRecord(value)) {
    return null;
  }
  const resource = readGenerationArtifactResource(value);
  const url = readMediaResourceUrl(resource);
  if (!url) {
    return null;
  }
  const modality = readGenerationArtifactModality(value, targetType, url);
  if (!modality) {
    return null;
  }
  const mimeType = readGenerationArtifactMimeType(value, resource);
  const durationSeconds = readArtifactDurationSeconds(value, resource);
  const thumbnail = readGenerationArtifactThumbnail(value, resource);
  return {
    asset: createGenerationArtifactAsset({
      durationSeconds,
      mimeType,
      resource,
      thumbnail,
    }),
    modality,
  };
}

function readGenerationArtifactModality(
  record: ApiRecord,
  targetType?: PlaygroundGenerationTargetType,
  url?: string,
): PlaygroundGenerationTargetType | null {
  const raw = readFirstString(record, ['modality', 'targetType', 'type', 'assetType', 'artifactType']);
  const normalized = normalizeArtifactDescriptor(raw);
  const explicitModality = readGenerationTargetTypeFromDescriptor(normalized);
  if (explicitModality) {
    return explicitModality;
  }

  const mimeType = normalizeArtifactDescriptor(readFirstString(record, ['mimeType', 'mime', 'contentType']));
  const mimeModality = readGenerationTargetTypeFromMimeType(mimeType, targetType);
  if (mimeModality) {
    return mimeModality;
  }

  const extensionModality = readGenerationTargetTypeFromUrl(url, targetType);
  return extensionModality ?? null;
}

function readGenerationArtifactResource(record: ApiRecord): ClawRouterMediaResource | undefined {
  return readMediaResource(record.asset) ?? readMediaResource(record.resource);
}

function readGenerationArtifactThumbnail(
  record: ApiRecord,
  resource?: ClawRouterMediaResource,
): ClawRouterMediaResource | undefined {
  const poster = readMediaResource(resource?.poster);
  if (poster) {
    return cloneMediaResource(poster);
  }
  const thumbnails = Array.isArray(resource?.thumbnails) ? resource.thumbnails : [];
  for (const thumbnail of thumbnails) {
    const thumbnailResource = readMediaResource(thumbnail);
    if (thumbnailResource) {
      return cloneMediaResource(thumbnailResource);
    }
  }
  const thumbnailResource = readMediaResource(record.thumbnail) ?? readMediaResource(record.poster);
  if (thumbnailResource) {
    return cloneMediaResource(thumbnailResource);
  }
  return undefined;
}

function readGenerationArtifactMimeType(
  record: ApiRecord,
  resource?: ClawRouterMediaResource,
): string | undefined {
  const mimeType = typeof resource?.mimeType === 'string' ? resource.mimeType.trim() : '';
  if (mimeType) {
    return mimeType;
  }
  return readFirstString(record, ['mimeType', 'mime', 'contentType']) || undefined;
}

function normalizeArtifactDescriptor(value: string): string {
  return value.toLowerCase().replace(/[\s-]+/gu, '_');
}

function readGenerationTargetTypeFromDescriptor(normalized: string): PlaygroundGenerationTargetType | null {
  if (normalized.includes('image')) {
    return 'image';
  }
  if (normalized.includes('video')) {
    return 'video';
  }
  if (normalized.includes('music')) {
    return 'music';
  }
  if (normalized.includes('sfx') || normalized.includes('sound_effect')) {
    return 'sfx';
  }
  if (normalized.includes('audio') || normalized.includes('voice') || normalized.includes('speech')) {
    return 'audio';
  }
  return null;
}

function readGenerationTargetTypeFromMimeType(
  mimeType: string,
  targetType?: PlaygroundGenerationTargetType,
): PlaygroundGenerationTargetType | null {
  if (mimeType.startsWith('image/')) {
    return 'image';
  }
  if (mimeType.startsWith('video/')) {
    return 'video';
  }
  if (mimeType.startsWith('audio/')) {
    return targetType === 'music' || targetType === 'sfx' ? targetType : 'audio';
  }
  return null;
}

function readGenerationTargetTypeFromUrl(
  url: string | undefined,
  targetType?: PlaygroundGenerationTargetType,
): PlaygroundGenerationTargetType | null {
  const normalized = normalizeArtifactDescriptor(url ?? '');
  if (/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/u.test(normalized)) {
    return 'image';
  }
  if (/\.(mp4|webm|mov|m4v|avi|mkv)(\?|#|$)/u.test(normalized)) {
    return 'video';
  }
  if (/\.(mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/u.test(normalized)) {
    return targetType === 'music' || targetType === 'sfx' ? targetType : 'audio';
  }
  return null;
}

function readFirstString(record: ApiRecord, keys: readonly string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return '';
}

function readOptionalPositiveNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

function readArtifactDurationSeconds(
  record: ApiRecord,
  resource?: ClawRouterMediaResource,
): number | undefined {
  if (typeof resource?.durationSeconds === 'number' && Number.isFinite(resource.durationSeconds)) {
    return resource.durationSeconds;
  }
  const seconds = readOptionalPositiveNumber(record.durationSeconds ?? record.duration_secs ?? record.duration ?? record.seconds);
  if (seconds !== undefined) {
    return seconds;
  }
  const milliseconds = readOptionalPositiveNumber(record.durationMs ?? record.durationMillis ?? record.duration_milliseconds);
  return milliseconds === undefined ? undefined : milliseconds / 1000;
}

function createGenerationArtifactAsset(
  {
    durationSeconds,
    mimeType,
    resource,
    thumbnail,
  }: {
    durationSeconds?: number;
    mimeType?: string;
    resource: ClawRouterMediaResource;
    thumbnail?: ClawRouterMediaResource;
  },
): ClawRouterMediaResource {
  const asset = cloneMediaResource(resource);
  if (mimeType && !asset.mimeType) {
    asset.mimeType = mimeType;
  }
  if (durationSeconds !== undefined && asset.durationSeconds === undefined) {
    asset.durationSeconds = durationSeconds;
  }
  if (thumbnail && !asset.poster) {
    asset.poster = thumbnail;
  }
  if (thumbnail && (!Array.isArray(asset.thumbnails) || asset.thumbnails.length === 0)) {
    asset.thumbnails = [cloneMediaResource(thumbnail)];
  }
  return asset;
}

function cloneMediaResource(resource: ClawRouterMediaResource): ClawRouterMediaResource {
  const clone: ClawRouterMediaResource = { ...resource };
  if (resource.poster) {
    clone.poster = cloneMediaResource(resource.poster);
  }
  if (resource.thumbnails) {
    clone.thumbnails = resource.thumbnails.map(cloneMediaResource);
  }
  return clone;
}

function hasGenerationArtifact(
  artifacts: readonly PlaygroundGenerationArtifact[],
  candidate: PlaygroundGenerationArtifact,
): boolean {
  const candidateLocator = readMediaResourceUrl(candidate.asset);
  return artifacts.some((artifact) => (
    artifact.modality === candidate.modality
    && readMediaResourceUrl(artifact.asset) === candidateLocator
  ));
}

function resolveGenerationResultTargetType(
  requestedTargetType: PlaygroundGenerationTargetType | undefined,
  artifacts: readonly PlaygroundGenerationArtifact[],
): PlaygroundGenerationTargetType | undefined {
  if (requestedTargetType) {
    return requestedTargetType;
  }
  return artifacts[0]?.modality;
}

async function completeAgentRuntimeInvocation(
  invocationId: string,
  generationOutput: RuntimeGenerationOutput,
): Promise<RuntimeInvocationItem> {
  const result = await completeRuntimeInvocationOperation(
    invocationId,
    {
      finishReason: 'stop',
      responseJson: createGenerationOutputJson(generationOutput),
      status: 'completed',
      usageJson: generationOutput.usage,
    },
    { idempotencyPrefix: 'playground-agent-runtime-complete' },
  );
  ensureSdkworkApiSuccess(result, 'Failed to complete playground runtime invocation');
  const item = readApiItem(result);
  if (!item) {
    throw new Error('Playground runtime invocation completion response missing item');
  }
  return item as unknown as RuntimeInvocationItem;
}

function mapRuntimeUsageSummary(
  artifacts: readonly PlaygroundGenerationArtifact[],
  usage: RuntimeUsageSnapshot,
): GenerationAgentUsageSummary {
  const promptTokens = readPreferredRuntimeUsageCount(undefined, usage.inputTokens);
  const cachedTokens = readPreferredRuntimeUsageCount(undefined, usage.cachedTokens);
  const completionTokens = readPreferredRuntimeUsageCount(undefined, usage.outputTokens);
  const totalTokens = readPreferredRuntimeUsageCount(undefined, usage.totalTokens)
    || promptTokens + cachedTokens + completionTokens;
  const videoSeconds = artifacts
    .filter((artifact) => artifact.modality === 'video')
    .reduce((total, artifact) => total + (artifact.asset.durationSeconds ?? 0), 0);
  return {
    cachedTokens,
    completionTokens,
    events: [],
    imageCount: artifacts.filter((artifact) => artifact.modality === 'image').length,
    promptTokens,
    totalTokens,
    videoSeconds: String(videoSeconds),
  };
}

function createGenerationOutputJson(generationOutput: RuntimeGenerationOutput): Record<string, JsonValue> {
  return compactJsonObject({
    media: generationOutput.artifacts.length > 0 ? generationOutput.artifacts : undefined,
    outputText: generationOutput.outputText || undefined,
  });
}

function mapAgentRunSnapshot(run: AgentRunItem): GenerationAgentRunSnapshot {
  return {
    id: run.id,
    requestId: run.requestId,
    source: 'generation-agent',
    status: mapAgentRunStatus(run.status),
  };
}

function mapAgentRunStepSnapshot(step: AgentRunStepItem): GenerationAgentRunStepSnapshot {
  return {
    id: step.id,
    index: Math.max(0, step.stepIndex - 1),
    status: mapAgentStepStatus(step.status),
    title: step.title || 'Runtime stream',
    type: mapAgentStepType(step.stepType),
  };
}

function createMediaGenerationStepSnapshot(step: AgentRunStepItem): GenerationAgentRunStepSnapshot {
  return {
    id: `${step.id}-media-generation`,
    index: Math.max(0, step.stepIndex),
    status: mapAgentStepStatus(step.status),
    title: 'Media generation',
    type: 'media_generation',
  };
}

function mapAgentRunToHistoryItem({
  artifacts,
  generationConfig,
  model,
  outputText,
  prompt,
  run,
  targetType,
  timestamp,
}: {
  artifacts: readonly PlaygroundGenerationArtifact[];
  generationConfig?: GenerationAgentRunCreateInput['generationConfig'];
  model?: string;
  outputText?: string;
  prompt: string;
  run: AgentRunItem;
  targetType?: PlaygroundGenerationTargetType;
  timestamp?: string | null;
}): PlaygroundHistoryItem {
  const isoTimestamp = normalizeIsoDate(timestamp);
  const media = mapSdkworkGenerationArtifactsToHistoryMedia(artifacts, targetType);
  return {
    aspectRatio: generationConfig?.aspectRatio,
    createdAt: normalizeIsoDate(run.createdAt),
    date: isoTimestamp.slice(0, 10),
    durationSeconds: media.durationSeconds ?? generationConfig?.durationSeconds,
    generationConfig: generationConfig,
    id: run.id,
    asset: media.asset,
    images: media.images,
    modelCatalogKey: model,
    modelInfo: model,
    outputText: outputText?.trim() || undefined,
    prompt,
    status: mapPlaygroundGenerationStatus(run.status),
    type: mapSdkworkGenerationModalityToHistoryType(targetType),
    updatedAt: isoTimestamp,
    videos: media.videos,
  };
}

function mapAgentRunStatus(status: AgentRunItem['status']): GenerationAgentRunStatus {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'running':
      return 'running';
    case 'completed':
      return 'succeeded';
    case 'cancelled':
      return 'cancelled';
    case 'failed':
    default:
      return 'failed';
  }
}

function mapAgentStepStatus(status: AgentRunStepItem['status']): GenerationAgentStepStatus {
  switch (status) {
    case 'queued':
      return 'queued';
    case 'running':
      return 'running';
    case 'completed':
      return 'succeeded';
    case 'cancelled':
      return 'skipped';
    case 'failed':
    default:
      return 'failed';
  }
}

function mapAgentStepType(stepType: AgentRunStepItem['stepType']): GenerationAgentRunStepSnapshot['type'] {
  switch (stepType) {
    case 'input':
      return 'input';
    case 'memory':
      return 'memory_retrieval';
    case 'tool':
      return 'skill_call';
    case 'runtime':
    case 'model':
      return 'model_call';
    case 'system':
    case 'custom':
    default:
      return 'output';
  }
}

function mapPlaygroundGenerationStatus(status: AgentRunItem['status']): PlaygroundGenerationRunStatus {
  switch (status) {
    case 'queued':
      return 'pending';
    case 'running':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'cancelled':
      return 'cancelled';
    case 'failed':
    default:
      return 'failed';
  }
}

function createGenerationTitle(prompt: string): string {
  return prompt.length <= TITLE_MAX_LENGTH
    ? prompt
    : `${prompt.slice(0, TITLE_MAX_LENGTH - 3).trimEnd()}...`;
}

function readProviderFromModel(model: string): string | undefined {
  const [provider] = model.split('/');
  return provider && provider !== model ? provider : undefined;
}

function compactJsonObject(record: Record<string, unknown>): Record<string, JsonValue> {
  const entries: [string, JsonValue][] = [];
  for (const [key, value] of Object.entries(record)) {
    if (value === undefined || value === null) {
      continue;
    }
    const jsonValue = toJsonValue(value);
    if (jsonValue !== undefined) {
      entries.push([key, jsonValue]);
    }
  }
  return Object.fromEntries(entries);
}

function toJsonValue(value: unknown): JsonValue | undefined {
  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return value as JsonValue;
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    return normalized ? normalized : undefined;
  }
  if (Array.isArray(value)) {
    const items = value
      .map(toJsonValue)
      .filter((item): item is JsonValue => item !== undefined);
    return items.length > 0 ? items as JsonValue : undefined;
  }
  if (isRecord(value)) {
    return compactJsonObject(value);
  }
  return undefined;
}

function normalizeIsoDate(value: string | undefined | null): string {
  const date = new Date(value || Date.now());
  return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
}
