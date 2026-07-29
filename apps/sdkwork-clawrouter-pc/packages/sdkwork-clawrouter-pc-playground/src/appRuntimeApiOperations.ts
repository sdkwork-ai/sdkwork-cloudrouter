import {
  createClientOperationToken,
  getClawRouterAppSdkClient,
  getModelsAppSdkClient,
  getSdkworkMemoryAppSdkClient,
  streamRuntimeInvocationEvents,
  type ClawRouterMediaResource,
  type ClawRouterAppSdkClient,
  type JsonValue,
  type ModelsAppSdkClient,
  type RuntimeStreamEvent,
  type RuntimeUsageSnapshot,
  type SdkworkMemoryAppSdkClient,
} from '@sdkwork/clawroutes-pc-commons/runtime';

type JsonObject = Record<string, JsonValue>;
type SdkUsageSnapshot = {
  cachedTokens?: string;
  inputTokens?: string;
  outputTokens?: string;
  totalTokens?: string;
};

interface MutationOptions {
  idempotencyPrefix?: string;
  idempotencyKey?: string;
}

interface PageParams {
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;

export interface ChatConversationCreateBody {
  agentId?: string;
  agentSessionId?: string;
  defaultModel?: string;
  defaultProvider?: string;
  memorySpaceId?: string;
  metadata?: JsonObject;
  sourceSurface?: string;
  title?: string;
}

export interface ChatTurnCreateBody {
  message: string;
  metadata?: JsonObject;
  mode?: string;
  model?: string;
  provider?: string;
}

export interface ChatTurnResponseBody {
  message: string;
  metadata?: JsonObject;
  model?: string;
  provider?: string;
  runtime?: string;
  runtimeInvocationId?: string;
  status?: 'completed' | 'failed' | 'cancelled' | 'streaming';
  usage?: Record<string, unknown>;
  usageFactId?: string;
}

export interface MemorySpaceCreateBody {
  metadata?: JsonObject;
  title: string;
}

export interface MemoryEntryCreateBody {
  content: string;
  contentJson?: JsonObject;
  memoryType?: string;
  metadata?: JsonObject;
  sourceConversationId?: string;
  sourceInvocationId?: string;
  sourceItemId?: string;
  sourceKind?: string;
  sourceTurnId?: string;
}

export interface RuntimeInvocationCreateBody {
  agentRunId?: string;
  agentRunStepId?: string;
  agentSessionId?: string;
  chatItemId?: string;
  chatTurnId?: string;
  conversationId?: string;
  endpoint?: string;
  invocationType?: string;
  metadata?: JsonObject;
  model?: string;
  provider?: string;
  requestJson?: JsonObject;
  runtime: string;
  status?: 'pending' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  streaming?: boolean;
}

export interface RuntimeInvocationCompleteBody {
  errorCode?: string;
  errorMessageMasked?: string;
  errorType?: string;
  finishReason?: string;
  metadata?: JsonObject;
  responseJson?: JsonObject;
  status?: 'pending' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  usageJson?: RuntimeUsageSnapshot;
}

export interface RuntimeEventCreateBody {
  eventSource?: string;
  eventType: string;
  metadata?: JsonObject;
  payloadJson?: JsonObject;
  textDelta?: string;
}

export interface RuntimeArtifactCreateBody {
  artifactType: string;
  contentJson?: JsonObject;
  contentText?: string;
  metadata?: JsonObject;
  mimeType?: string;
  name?: string;
  resource?: ClawRouterMediaResource;
  sha256?: string;
  sizeBytes?: number;
  storageKey?: string;
}

interface ModelCatalogParams {
  billingMeter?: string;
  capabilities?: string[];
  categories?: string[];
  groups?: string[];
  limit?: number;
  modalities?: string[];
  q?: string;
  vendorCode?: string;
  vendorCodes?: string[];
}

function appClient(client?: ClawRouterAppSdkClient): ClawRouterAppSdkClient {
  return client ?? getClawRouterAppSdkClient();
}

function memoryClient(client?: SdkworkMemoryAppSdkClient): SdkworkMemoryAppSdkClient {
  return client ?? getSdkworkMemoryAppSdkClient();
}

function mutationParams(prefix: string, options: MutationOptions = {}): { idempotencyKey: string } {
  return {
    idempotencyKey: options.idempotencyKey ?? createClientOperationToken(options.idempotencyPrefix ?? prefix),
  };
}

export async function listModelCatalog(
  params: ModelCatalogParams = {},
  sdkClient?: ModelsAppSdkClient,
): Promise<unknown> {
  if (sdkClient) {
    return sdkClient.ai.models.list(sdkModelCatalogParams(params));
  }
  return getModelsAppSdkClient().ai.models.list(sdkModelCatalogParams(params));
}

export async function listChatConversations(
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.conversations.list(sdkPageParams(params));
}

export async function createChatConversation(
  body: ChatConversationCreateBody,
  options?: MutationOptions,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.conversations.create(body, mutationParams('chat-conversation', options));
}

export async function retrieveChatConversation(
  conversationId: string,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.conversations.retrieve(conversationId);
}

export async function listChatMessages(
  conversationId: string,
  params: { limit?: number; order?: 'asc' | 'desc' } = { limit: DEFAULT_PAGE_SIZE, order: 'asc' },
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.conversationMessages.list(conversationId, {
    ...params,
    limit: params.limit === undefined ? undefined : String(params.limit),
  });
}

export async function createChatTurn(
  conversationId: string,
  body: ChatTurnCreateBody,
  options?: MutationOptions,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.turns.create(conversationId, body, mutationParams('chat-turn', options));
}

export async function completeChatTurnResponse(
  conversationId: string,
  turnId: string,
  body: ChatTurnResponseBody,
  options?: MutationOptions,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.turnResponses.create(
    conversationId,
    turnId,
    body,
    mutationParams('chat-turn-response', options),
  );
}

export async function listMemorySpaces(
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: SdkworkMemoryAppSdkClient,
): Promise<unknown> {
  const client = memoryClient(sdkClient);
  return client.memory.spaces.list({ pageSize: params.pageSize });
}

export async function createMemorySpace(
  body: MemorySpaceCreateBody,
  options?: MutationOptions,
  sdkClient?: SdkworkMemoryAppSdkClient,
): Promise<unknown> {
  const client = memoryClient(sdkClient);
  return client.memory.spaces.create(
    mapMemorySpaceCreateBody(body),
    mutationParams('memory-space', options),
  );
}

export async function retrieveMemorySpace(
  spaceId: string,
  sdkClient?: SdkworkMemoryAppSdkClient,
): Promise<unknown> {
  const client = memoryClient(sdkClient);
  return client.memory.spaces.retrieve(spaceId);
}

export async function listMemoryEntries(
  spaceId: string,
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: SdkworkMemoryAppSdkClient,
): Promise<unknown> {
  const client = memoryClient(sdkClient);
  return client.memory.list({ spaceId, pageSize: params.pageSize });
}

export async function createMemoryEntry(
  spaceId: string,
  body: MemoryEntryCreateBody,
  options?: MutationOptions,
  sdkClient?: SdkworkMemoryAppSdkClient,
): Promise<unknown> {
  const client = memoryClient(sdkClient);
  return client.memory.create(
    mapMemoryEntryCreateBody(spaceId, body),
    mutationParams('memory-entry', options),
  );
}

export async function retrieveMemoryEntry(
  entryId: string,
  sdkClient?: SdkworkMemoryAppSdkClient,
): Promise<unknown> {
  const client = memoryClient(sdkClient);
  return client.memory.retrieve(entryId);
}

export async function listRuntimeInvocations(
  params: PageParams & {
    agentSessionId?: string;
    chatTurnId?: string;
    conversationId?: string;
    runtime?: string;
    status?: string;
  } = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.list(sdkPageParams(params));
}

export async function createRuntimeInvocation(
  body: RuntimeInvocationCreateBody,
  options?: MutationOptions,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.create(body, mutationParams('runtime-invocation', options));
}

export async function retrieveRuntimeInvocation(
  invocationId: string,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.retrieve(invocationId);
}

export async function completeRuntimeInvocation(
  invocationId: string,
  body: RuntimeInvocationCompleteBody,
  options?: MutationOptions,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.submit(
    invocationId,
    sdkRuntimeInvocationCompleteBody(body),
    mutationParams('runtime-invocation-complete', options),
  );
}

export async function listRuntimeEvents(
  invocationId: string,
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocationEvents.list(invocationId, sdkPageParams(params));
}

export async function streamRuntimeEvents(
  invocationId: string,
  afterEventNo = 0,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<AsyncIterable<RuntimeStreamEvent>> {
  const client = appClient(sdkClient);
  return streamRuntimeInvocationEvents(client, invocationId, afterEventNo);
}

export async function createRuntimeEvent(
  invocationId: string,
  body: RuntimeEventCreateBody,
  options?: MutationOptions,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocationEvents.create(
    invocationId,
    body,
    mutationParams('runtime-event', options),
  );
}

export async function listRuntimeArtifacts(
  invocationId: string,
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.artifacts.list(invocationId, sdkPageParams(params));
}

export async function createRuntimeArtifact(
  invocationId: string,
  body: RuntimeArtifactCreateBody,
  options?: MutationOptions,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.artifacts.create(invocationId, sdkRuntimeArtifactCreateBody(body), mutationParams('runtime-artifact', options));
}

function sdkPageParams<T extends PageParams>(params: T): Omit<T, 'page' | 'pageSize'> & {
  page?: string;
  pageSize?: string;
} {
  return {
    ...params,
    page: params.page === undefined ? undefined : String(params.page),
    pageSize: params.pageSize === undefined ? undefined : String(params.pageSize),
  };
}

type MemoryRecordType =
  | 'working'
  | 'session'
  | 'semantic'
  | 'episodic'
  | 'procedural'
  | 'habit'
  | 'relationship'
  | 'domain_knowledge';

function mapMemorySpaceCreateBody(body: MemorySpaceCreateBody): {
  ownerSubjectType: string;
  ownerSubjectId: string;
  spaceType: string;
  displayName: string;
  metadata?: JsonObject;
} {
  const metadata = body.metadata ?? {};
  const ownerSubjectType = readMetadataString(metadata, 'ownerSubjectType') ?? 'user';
  const ownerSubjectId = readMetadataString(metadata, 'ownerSubjectId') ?? 'playground';
  const spaceType = readMetadataString(metadata, 'spaceType') ?? 'personal';
  return {
    ownerSubjectType,
    ownerSubjectId,
    spaceType,
    displayName: body.title,
    metadata: body.metadata,
  };
}

function mapMemoryEntryCreateBody(spaceId: string, body: MemoryEntryCreateBody): {
  spaceId: string;
  scope: string;
  memoryType: MemoryRecordType;
  canonicalText: string;
  metadata?: JsonObject;
} {
  return {
    spaceId,
    scope: 'user',
    memoryType: normalizeMemoryRecordType(body.memoryType),
    canonicalText: body.content,
    metadata: compactJsonObject({
      ...body.metadata,
      contentJson: body.contentJson,
      sourceConversationId: body.sourceConversationId,
      sourceInvocationId: body.sourceInvocationId,
      sourceItemId: body.sourceItemId,
      sourceKind: body.sourceKind,
      sourceTurnId: body.sourceTurnId,
    }),
  };
}

function normalizeMemoryRecordType(value: string | undefined): MemoryRecordType {
  const normalized = (value ?? 'semantic').trim().toLowerCase();
  switch (normalized) {
    case 'working':
    case 'session':
    case 'semantic':
    case 'episodic':
    case 'procedural':
    case 'habit':
    case 'relationship':
    case 'domain_knowledge':
      return normalized as MemoryRecordType;
    default:
      return 'semantic';
  }
}

function readMetadataString(metadata: JsonObject, key: string): string | undefined {
  const value = metadata[key];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function compactJsonObject(value: Record<string, JsonValue | undefined>): JsonObject | undefined {
  const entries = Object.entries(value).filter(
    (entry): entry is [string, JsonValue] => entry[1] !== undefined,
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function sdkModelCatalogParams(params: ModelCatalogParams): Omit<ModelCatalogParams, 'limit'> & { limit?: string } {
  return {
    ...params,
    limit: params.limit === undefined ? undefined : String(params.limit),
  };
}

function sdkUsageSnapshot(value: RuntimeUsageSnapshot | undefined): SdkUsageSnapshot | undefined {
  if (!value) {
    return undefined;
  }
  return {
    cachedTokens: String(value.cachedTokens),
    inputTokens: String(value.inputTokens),
    outputTokens: String(value.outputTokens),
    totalTokens: String(value.totalTokens),
  };
}

function sdkRuntimeInvocationCompleteBody(body: RuntimeInvocationCompleteBody): Omit<RuntimeInvocationCompleteBody, 'usageJson'> & { usageJson?: SdkUsageSnapshot } {
  return {
    ...body,
    usageJson: sdkUsageSnapshot(body.usageJson),
  };
}

function sdkRuntimeArtifactCreateBody(body: RuntimeArtifactCreateBody): Omit<RuntimeArtifactCreateBody, 'sizeBytes'> & { sizeBytes?: string } {
  return {
    ...body,
    sizeBytes: body.sizeBytes === undefined ? undefined : String(body.sizeBytes),
  };
}
