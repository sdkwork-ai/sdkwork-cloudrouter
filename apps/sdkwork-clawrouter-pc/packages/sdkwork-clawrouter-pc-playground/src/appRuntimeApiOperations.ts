import {
  createClientOperationToken,
  getClawRouterAppSdkClient,
  getModelsAppSdkClient,
  getSdkworkMemoryAppSdkClient,
  streamRuntimeInvocationEvents,
  toSdkMediaResource,
  type ClawRouterAppSdkClient,
  type ClawRouterMediaResource,
  type ClawRouterSdkMediaResource,
  type JsonValue,
  type ModelsAppSdkClient,
  type RuntimeStreamEvent,
  type RuntimeUsageSnapshot,
  type SdkworkMemoryAppSdkClient,
} from '@sdkwork/clawroutes-pc-commons/runtime';

type JsonObject = Record<string, JsonValue>;
type SdkUsageSnapshot = JsonObject & {
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
  usage?: RuntimeUsageSnapshot;
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
  modelTypes?: string;
  modalities?: string[];
  page?: number;
  pageSize?: number;
  q?: string;
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
    return sdkClient.ai.models.list(params);
  }
  return getModelsAppSdkClient().ai.models.list(params);
}

export async function listChatConversations(
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.conversations.list(params);
}

export async function createChatConversation(
  body: ChatConversationCreateBody,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.conversations.create(body);
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
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.conversations.messages.list(conversationId, params);
}

export async function createChatTurn(
  conversationId: string,
  body: ChatTurnCreateBody,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.conversations.turns.create(conversationId, body);
}

export async function completeChatTurnResponse(
  conversationId: string,
  turnId: string,
  body: ChatTurnResponseBody,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.chat.conversations.turns.response.create(
    conversationId,
    turnId,
    sdkChatTurnResponseBody(body),
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
  spaceId: string,
  entryId: string,
  sdkClient?: SdkworkMemoryAppSdkClient,
): Promise<unknown> {
  const client = memoryClient(sdkClient);
  return client.memory.retrieve(entryId, { spaceId });
}

export async function listRuntimeInvocations(
  params: PageParams & {
    agentSessionId?: string;
    chatTurnId?: string;
    conversationId?: string;
    runtime?: string;
    status?: 'pending' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  } = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.list(params);
}

export async function createRuntimeInvocation(
  body: RuntimeInvocationCreateBody,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.create(body);
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
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.complete(
    invocationId,
    sdkRuntimeInvocationCompleteBody(body),
  );
}

export async function listRuntimeEvents(
  invocationId: string,
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.events.list(invocationId, params);
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
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.events.create(invocationId, body);
}

export async function listRuntimeArtifacts(
  invocationId: string,
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.artifacts.list(invocationId, params);
}

export async function createRuntimeArtifact(
  invocationId: string,
  body: RuntimeArtifactCreateBody,
  sdkClient?: ClawRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.artifacts.create(
    invocationId,
    sdkRuntimeArtifactCreateBody(body),
  );
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

function sdkChatTurnResponseBody(
  body: ChatTurnResponseBody,
): Omit<ChatTurnResponseBody, 'usage'> & { usage?: SdkUsageSnapshot } {
  return {
    ...body,
    usage: sdkUsageSnapshot(body.usage),
  };
}

function sdkRuntimeInvocationCompleteBody(body: RuntimeInvocationCompleteBody): Omit<RuntimeInvocationCompleteBody, 'usageJson'> & { usageJson?: SdkUsageSnapshot } {
  return {
    ...body,
    usageJson: sdkUsageSnapshot(body.usageJson),
  };
}

function sdkRuntimeArtifactCreateBody(
  body: RuntimeArtifactCreateBody,
): Omit<RuntimeArtifactCreateBody, 'resource' | 'sizeBytes'> & {
  resource?: ClawRouterSdkMediaResource;
  sizeBytes?: string;
} {
  return {
    ...body,
    resource: toSdkMediaResource(body.resource, 'runtimeArtifact.resource'),
    sizeBytes: body.sizeBytes === undefined ? undefined : String(body.sizeBytes),
  };
}
