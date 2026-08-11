import {
  createClientOperationToken,
  getCloudRouterAppSdkClient,
  getModelsAppSdkClient,
  streamRuntimeInvocationEvents,
  toSdkMediaResource,
  type CloudRouterAppSdkClient,
  type CloudRouterMediaResource,
  type CloudRouterSdkMediaResource,
  type JsonValue,
  type ModelsAppSdkClient,
  type RuntimeStreamEvent,
  type RuntimeUsageSnapshot,
} from '@sdkwork/cloudroutes-pc-commons/runtime';

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
  resource?: CloudRouterMediaResource;
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

function appClient(client?: CloudRouterAppSdkClient): CloudRouterAppSdkClient {
  return client ?? getCloudRouterAppSdkClient();
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

export async function listRuntimeInvocations(
  params: PageParams & {
    agentSessionId?: string;
    chatTurnId?: string;
    conversationId?: string;
    runtime?: string;
    status?: 'pending' | 'running' | 'streaming' | 'completed' | 'failed' | 'cancelled';
  } = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: CloudRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.list(params);
}

export async function createRuntimeInvocation(
  body: RuntimeInvocationCreateBody,
  sdkClient?: CloudRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.create(body);
}

export async function retrieveRuntimeInvocation(
  invocationId: string,
  sdkClient?: CloudRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.retrieve(invocationId);
}

export async function completeRuntimeInvocation(
  invocationId: string,
  body: RuntimeInvocationCompleteBody,
  sdkClient?: CloudRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.completions.create(
    invocationId,
    sdkRuntimeInvocationCompleteBody(body),
  );
}

export async function listRuntimeEvents(
  invocationId: string,
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: CloudRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.events.list(invocationId, params);
}

export async function streamRuntimeEvents(
  invocationId: string,
  afterEventNo = 0,
  sdkClient?: CloudRouterAppSdkClient,
): Promise<AsyncIterable<RuntimeStreamEvent>> {
  const client = appClient(sdkClient);
  return streamRuntimeInvocationEvents(client, invocationId, afterEventNo);
}

export async function createRuntimeEvent(
  invocationId: string,
  body: RuntimeEventCreateBody,
  sdkClient?: CloudRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.events.create(invocationId, body);
}

export async function listRuntimeArtifacts(
  invocationId: string,
  params: PageParams = { pageSize: DEFAULT_PAGE_SIZE },
  sdkClient?: CloudRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.artifacts.list(invocationId, params);
}

export async function createRuntimeArtifact(
  invocationId: string,
  body: RuntimeArtifactCreateBody,
  sdkClient?: CloudRouterAppSdkClient,
): Promise<unknown> {
  const client = appClient(sdkClient);
  return client.runtime.invocations.artifacts.create(
    invocationId,
    sdkRuntimeArtifactCreateBody(body),
  );
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


function sdkRuntimeInvocationCompleteBody(body: RuntimeInvocationCompleteBody): Omit<RuntimeInvocationCompleteBody, 'usageJson'> & { usageJson?: SdkUsageSnapshot } {
  return {
    ...body,
    usageJson: sdkUsageSnapshot(body.usageJson),
  };
}

function sdkRuntimeArtifactCreateBody(
  body: RuntimeArtifactCreateBody,
): Omit<RuntimeArtifactCreateBody, 'resource' | 'sizeBytes'> & {
  resource?: CloudRouterSdkMediaResource;
  sizeBytes?: string;
} {
  return {
    ...body,
    resource: toSdkMediaResource(body.resource, 'runtimeArtifact.resource'),
    sizeBytes: body.sizeBytes === undefined ? undefined : String(body.sizeBytes),
  };
}
