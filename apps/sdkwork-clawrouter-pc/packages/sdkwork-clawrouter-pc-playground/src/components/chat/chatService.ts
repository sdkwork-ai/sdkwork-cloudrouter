import {
  ensureSdkworkApiSuccess,
  isRecord,
  readApiRecord,
  readNullableString,
  readRequiredApiItems,
  emptyRuntimeUsageSnapshot,
  mergeRuntimeUsageSnapshots,
  readRuntimeUsageSnapshot,
  type RuntimeUsageSnapshot,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { createChatAssistantMessage } from './chatSession.ts';
import { readRuntimeTextDelta } from '../../runtimeStream.ts';
import {
  completeChatTurnResponse,
  completeRuntimeInvocation as completeRuntimeInvocationOperation,
  createChatConversation,
  createChatTurn,
  createRuntimeInvocation as createRuntimeInvocationOperation,
  listChatConversations,
  listChatMessages,
  retrieveChatConversation,
  retrieveRuntimeInvocation,
  streamRuntimeEvents,
} from '../../appRuntimeApiOperations.ts';
import type { ChatMessage, ChatResumeInput, ChatRuntimeEventProgress, ChatSendInput, ChatSendResult, ChatSessionSummary, ChatStreamStarted } from './chatTypes';
import type { PlaygroundModelOption } from '../../playgroundTypes.ts';

const CHAT_SOURCE_SURFACE = 'playground';
const RUNTIME_ADAPTER = 'openai_compatible';
const RUNTIME_ENDPOINT = 'chat.stream';
const RUNTIME_STREAM_FAILED_MESSAGE = 'Runtime stream failed before completion';

type RuntimeStreamingCallbacks = {
  onDelta?: (delta: string) => void;
  onRuntimeEvent?: (event: ChatRuntimeEventProgress) => void;
};

interface RuntimeFailure {
  errorCode: string;
  errorMessageMasked: string;
}

interface ChatConversationItem {
  createdAt?: string | null;
  defaultModel?: string | null;
  defaultProvider?: string | null;
  id: string;
  lastMessagePreview?: string | null;
  messageCount: number;
  title?: string | null;
  updatedAt?: string | null;
}

interface ChatMessageItem {
  content: string;
  createdAt?: string | null;
  id: string;
  model?: string | null;
  provider?: string | null;
  role: 'system' | 'user' | 'assistant' | 'tool' | 'developer';
  status: 'pending' | 'streaming' | 'completed' | 'failed' | 'cancelled' | 'deleted';
}

interface ChatTurnCreateResponse {
  messages: ChatMessageItem[];
  turn: {
    id: string;
  };
}

interface RuntimeInvocationItem {
  completedAt?: string | null;
  createdAt?: string | null;
  id: string;
  model?: string | null;
  provider?: string | null;
  runtime: string;
  status?: string | null;
}

type RuntimeCompletionStatus = 'completed' | 'cancelled';

export class ChatSendFailureError extends Error {
  readonly session: ChatSessionSummary | undefined;

  constructor(message: string, session: ChatSessionSummary | undefined) {
    super(message);
    this.name = 'ChatSendFailureError';
    this.session = session;
  }
}

export class ChatService {
  static async fetchSessions(): Promise<ChatSessionSummary[]> {
    const result = await listChatConversations({ pageSize: 20 });
    ensureSdkworkApiSuccess(result, 'Failed to fetch chat conversations');
    return readRequiredApiItems(result, 'Chat conversations response missing items')
      .filter(isRecord)
      .map((item) => mapConversationToSession(item as unknown as ChatConversationItem))
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
  }

  static async fetchMessages(input: { completionId: string }): Promise<ChatMessage[]> {
    const result = await listChatMessages(input.completionId, {
      pageSize: 20,
    });
    ensureSdkworkApiSuccess(result, 'Failed to fetch chat messages');
    return readRequiredApiItems(result, 'Chat messages response missing items')
      .filter(isRecord)
      .map((item) => mapChatMessage(item as unknown as ChatMessageItem))
      .filter((message): message is ChatMessage => message !== null);
  }

  static async cancelRuntimeInvocation(input: {
    content?: string;
    runtimeInvocationId: string;
    usage?: Partial<RuntimeUsageSnapshot> | null;
  }): Promise<void> {
    const usage = mergeRuntimeUsageSnapshots(emptyRuntimeUsageSnapshot(), input.usage);
    const result = await completeRuntimeInvocationOperation(
      input.runtimeInvocationId,
      {
        finishReason: 'stop',
        metadata: {
          stopRequested: true,
        },
        responseJson: input.content?.trim() ? { outputText: input.content } : {},
        status: 'cancelled',
        usageJson: usage,
      },
    );
    ensureSdkworkApiSuccess(result, 'Failed to stop runtime invocation');
  }

  static async sendMessage(input: ChatSendInput): Promise<ChatSendResult> {
    const conversation = input.sessionId
      ? await retrieveConversation(input.sessionId)
      : await createConversation(input);

    const turn = await createTurn(conversation.id, input);
    const runtimeInvocation = await createChatRuntimeInvocation({
      conversation,
      input,
      turn,
    });
    input.onStreamStarted?.(createChatStreamStarted(conversation, input, runtimeInvocation, turn.turn.id));

    let content = '';
    let usage = emptyRuntimeUsageSnapshot();
    let lastEventNo = 0;
    let cancelled = false;
    try {
      const events = await streamRuntimeEvents(runtimeInvocation.id);
      for await (const event of events) {
        const eventUsage = readRuntimeUsageSnapshot(event);
        usage = mergeRuntimeUsageSnapshots(usage, eventUsage);
        const failureMessage = readRuntimeFailureEventMessage(event);
        if (failureMessage) {
          throw new Error(failureMessage);
        }
        const cancellation = readRuntimeCancellationEvent(event);
        lastEventNo = emitRuntimeEventProgress(input, event, lastEventNo);
        if (cancellation) {
          cancelled = true;
          break;
        }
        const textDelta = readRuntimeTextDelta(event);
        if (textDelta) {
          content += textDelta;
          emitTextDelta(input, textDelta);
        }
      }
    } catch (error) {
      const errorMessage = readRuntimeStreamFailureMessage(error);
      const failure = {
        errorCode: 'runtime_stream_failed',
        errorMessageMasked: errorMessage,
      };
      await recordRuntimeFailure({
        assistantContent: content,
        conversationId: conversation.id,
        failure,
        input,
        invocation: runtimeInvocation,
        turnId: turn.turn.id,
        usage,
      });
      throw new ChatSendFailureError(
        errorMessage === RUNTIME_STREAM_FAILED_MESSAGE
          ? 'playground.chat.errors.runtimeFailed'
          : errorMessage,
        createFailedSessionSummary(conversation, input, errorMessage),
      );
    }

    content = readFinalAssistantContent(content, cancelled, input.cancelledFallbackContent);

    if (!content.trim()) {
      const failure = {
        errorCode: 'runtime_stream_empty',
        errorMessageMasked: 'Runtime stream completed without assistant output',
      };
      await failRuntimeInvocation(runtimeInvocation.id, failure);
      await failTurnResponse({
        assistantContent: content,
        conversationId: conversation.id,
        failure,
        input,
        invocation: runtimeInvocation,
        turnId: turn.turn.id,
        usage,
      });
      throw new ChatSendFailureError(
        'playground.chat.errors.runtimeUnavailable',
        createFailedSessionSummary(conversation, input, failure.errorMessageMasked),
      );
    }

    const finalStatus: RuntimeCompletionStatus = cancelled ? 'cancelled' : 'completed';
    const completedInvocation = await completeRuntimeInvocation(runtimeInvocation.id, content, usage, finalStatus);
    const completedUsage = mergeRuntimeUsageSnapshots(usage, readRuntimeUsageSnapshot(completedInvocation));
    const completedTurn = await completeTurnResponse({
      content,
      conversationId: conversation.id,
      input,
      invocation: completedInvocation,
      status: finalStatus,
      turnId: turn.turn.id,
      usage: completedUsage,
    });
    const assistantMessage = findTurnMessage(completedTurn, 'assistant');
    const createdAt = parseDate(assistantMessage?.createdAt || completedInvocation.completedAt || completedInvocation.createdAt);

    return {
      assistantMessage: createChatAssistantMessage({
        content,
        modelName: input.selectedModel.name || completedInvocation.model || input.selectedModel.model,
        vendorName: input.selectedModel.vendorName || completedInvocation.provider || undefined,
        createdAt,
      }),
      cancelled,
      session: {
        id: conversation.id,
        latestCompletionId: conversation.id,
        title: conversation.title || readSessionTitle(input.messages[0]?.content || input.prompt, conversation.id),
        modelName: input.selectedModel.name || completedInvocation.model || conversation.defaultModel || undefined,
        vendorName: input.selectedModel.vendorName || completedInvocation.provider || conversation.defaultProvider || undefined,
        createdAt: normalizeIsoDate(conversation.createdAt),
        updatedAt: new Date().toISOString(),
        preview: content,
        messageCount: Math.max(conversation.messageCount + 2, input.messages.length + 2),
      },
    };
  }

  static async resumeMessage(input: ChatResumeInput): Promise<ChatSendResult> {
    const conversation = await retrieveConversation(input.sessionId);
    const runtimeInvocation = await retrieveRuntimeInvocationItem(input.runtimeInvocationId);

    let content = input.initialContent || '';
    let usage = mergeRuntimeUsageSnapshots(emptyRuntimeUsageSnapshot(), input.initialUsage);
    let lastEventNo = Math.max(0, Math.trunc(input.lastEventNo || 0));
    let cancelled = false;
    try {
      const events = await streamRuntimeEvents(input.runtimeInvocationId, lastEventNo);
      for await (const event of events) {
        const eventNo = readRuntimeEventNo(event);
        const eventUsage = readRuntimeUsageSnapshot(event);
        const alreadySeen = eventNo > 0 && eventNo <= lastEventNo;
        if (alreadySeen) {
          continue;
        }
        usage = mergeRuntimeUsageSnapshots(usage, eventUsage);
        const failureMessage = readRuntimeFailureEventMessage(event);
        if (failureMessage) {
          throw new Error(failureMessage);
        }
        const cancellation = readRuntimeCancellationEvent(event);
        if (eventNo > 0 || eventUsage) {
          input.onRuntimeEvent?.({
            cancelled: cancellation || undefined,
            eventNo: eventNo > 0 ? eventNo : undefined,
            usage: eventUsage,
          });
        }
        if (eventNo > 0) {
          lastEventNo = Math.max(lastEventNo, eventNo);
        }
        if (cancellation) {
          cancelled = true;
          break;
        }
        const textDelta = readRuntimeTextDelta(event);
        if (textDelta) {
          content += textDelta;
          emitTextDelta(input, textDelta);
        }
      }
    } catch (error) {
      const errorMessage = readRuntimeStreamFailureMessage(error);
      const failure = {
        errorCode: 'runtime_stream_failed',
        errorMessageMasked: errorMessage,
      };
      await recordRuntimeFailure({
        assistantContent: content,
        conversationId: conversation.id,
        failure,
        input,
        invocation: runtimeInvocation,
        turnId: input.turnId,
        usage,
      });
      throw new ChatSendFailureError(
        errorMessage === RUNTIME_STREAM_FAILED_MESSAGE
          ? 'playground.chat.errors.runtimeFailed'
          : errorMessage,
        createFailedSessionSummary(conversation, input, errorMessage),
      );
    }

    content = readFinalAssistantContent(content, cancelled, input.cancelledFallbackContent);

    if (!content.trim()) {
      const failure = {
        errorCode: 'runtime_stream_empty',
        errorMessageMasked: 'Runtime stream completed without assistant output',
      };
      await failRuntimeInvocation(input.runtimeInvocationId, failure);
      await failTurnResponse({
        assistantContent: content,
        conversationId: conversation.id,
        failure,
        input,
        invocation: runtimeInvocation,
        turnId: input.turnId,
        usage,
      });
      throw new ChatSendFailureError(
        'playground.chat.errors.runtimeUnavailable',
        createFailedSessionSummary(conversation, input, failure.errorMessageMasked),
      );
    }

    const finalStatus: RuntimeCompletionStatus = cancelled ? 'cancelled' : 'completed';
    const completedInvocation = await completeRuntimeInvocation(input.runtimeInvocationId, content, usage, finalStatus);
    const completedUsage = mergeRuntimeUsageSnapshots(usage, readRuntimeUsageSnapshot(completedInvocation));
    const completedTurn = await completeTurnResponse({
      content,
      conversationId: conversation.id,
      input,
      invocation: completedInvocation,
      status: finalStatus,
      turnId: input.turnId,
      usage: completedUsage,
    });
    const assistantMessage = findTurnMessage(completedTurn, 'assistant');
    const createdAt = parseDate(assistantMessage?.createdAt || completedInvocation.completedAt || completedInvocation.createdAt);

    return {
      assistantMessage: createChatAssistantMessage({
        content,
        modelName: input.selectedModel.name || completedInvocation.model || input.selectedModel.model,
        vendorName: input.selectedModel.vendorName || completedInvocation.provider || undefined,
        createdAt,
      }),
      cancelled,
      session: {
        id: conversation.id,
        latestCompletionId: conversation.id,
        title: conversation.title || input.session.title || readSessionTitle(input.messages[0]?.content || input.prompt, conversation.id),
        modelName: input.selectedModel.name || completedInvocation.model || conversation.defaultModel || undefined,
        vendorName: input.selectedModel.vendorName || completedInvocation.provider || conversation.defaultProvider || undefined,
        createdAt: normalizeIsoDate(conversation.createdAt || input.session.createdAt),
        updatedAt: new Date().toISOString(),
        preview: content,
        messageCount: Math.max(conversation.messageCount + 2, input.messages.length + 2),
      },
    };
  }
}

function emitTextDelta(callbacks: RuntimeStreamingCallbacks, textDelta: string): void {
  callbacks.onDelta?.(textDelta);
}

function emitRuntimeEventProgress(
  callbacks: RuntimeStreamingCallbacks,
  event: unknown,
  previousEventNo: number,
): number {
  const eventNo = readRuntimeEventNo(event);
  const usage = readRuntimeUsageSnapshot(event);
  const cancelled = readRuntimeCancellationEvent(event);
  if (eventNo <= 0 && !usage && !cancelled) {
    return previousEventNo;
  }
  callbacks.onRuntimeEvent?.({
    cancelled: cancelled || undefined,
    eventNo: eventNo > 0 ? eventNo : undefined,
    usage,
  });
  return eventNo > 0 ? Math.max(previousEventNo, eventNo) : previousEventNo;
}

function readFinalAssistantContent(
  content: string,
  cancelled: boolean,
  cancelledFallbackContent: string | undefined,
): string {
  if (!cancelled || content.trim()) {
    return content;
  }
  return cancelledFallbackContent?.trim() || 'Stopped.';
}

async function createConversation(input: ChatSendInput): Promise<ChatConversationItem> {
  const selectedModelCatalogKey = readSelectedModelCatalogKey(input.selectedModel);
  const result = await createChatConversation({
    defaultModel: selectedModelCatalogKey,
    defaultProvider: input.selectedModel.vendorCode || input.selectedModel.vendorName,
    metadata: {
      modelCatalogKey: selectedModelCatalogKey,
    },
    sourceSurface: CHAT_SOURCE_SURFACE,
    title: readSessionTitle(input.messages[0]?.content || input.prompt, ''),
  });
  ensureSdkworkApiSuccess(result, 'Failed to create chat conversation');
  const data = readApiRecord(result);
  const item = isRecord(data.item) ? data.item : data;
  if (!isRecord(item) || !readNullableString(item, 'id')) {
    throw new Error('Chat conversation response missing item');
  }
  return item as unknown as ChatConversationItem;
}

async function retrieveConversation(conversationId: string): Promise<ChatConversationItem> {
  const result = await retrieveChatConversation(conversationId);
  ensureSdkworkApiSuccess(result, 'Failed to retrieve chat conversation');
  const data = readApiRecord(result);
  const item = isRecord(data.item) ? data.item : data;
  if (!isRecord(item) || !readNullableString(item, 'id')) {
    throw new Error('Chat conversation response missing item');
  }
  return item as unknown as ChatConversationItem;
}

async function createTurn(
  conversationId: string,
  input: ChatSendInput,
): Promise<ChatTurnCreateResponse> {
  const selectedModelCatalogKey = readSelectedModelCatalogKey(input.selectedModel);
  const result = await createChatTurn(
    conversationId,
    {
      message: input.prompt,
      metadata: {
        surface: CHAT_SOURCE_SURFACE,
      },
      mode: 'chat',
      model: selectedModelCatalogKey,
      provider: input.selectedModel.vendorCode || input.selectedModel.vendorName,
    },
  );
  ensureSdkworkApiSuccess(result, 'Failed to create chat turn');
  const data = readApiRecord(result);
  if (!isRecord(data.turn)) {
    throw new Error('Chat turn response missing turn');
  }
  return data as unknown as ChatTurnCreateResponse;
}

async function createChatRuntimeInvocation(
  {
    conversation,
    input,
    turn,
  }: {
    conversation: ChatConversationItem;
    input: ChatSendInput;
    turn: ChatTurnCreateResponse;
  },
): Promise<RuntimeInvocationItem> {
  const selectedModelCatalogKey = readSelectedModelCatalogKey(input.selectedModel);
  const result = await createRuntimeInvocationOperation({
    chatTurnId: turn.turn.id,
    conversationId: conversation.id,
    endpoint: RUNTIME_ENDPOINT,
    invocationType: 'chat_response',
    metadata: compactJsonObject({
      surface: CHAT_SOURCE_SURFACE,
      supportsStreaming: input.selectedModel.supportsStreaming,
    }),
    model: selectedModelCatalogKey,
    provider: input.selectedModel.vendorCode || input.selectedModel.vendorName,
    requestJson: {
      messages: toRuntimeMessages(input.messages, input.prompt),
      prompt: input.prompt,
      selectedModel: selectedModelCatalogKey,
    },
    runtime: RUNTIME_ADAPTER,
    status: 'streaming',
    streaming: true,
  });
  ensureSdkworkApiSuccess(result, 'Failed to create runtime invocation');
  const data = readApiRecord(result);
  const item = isRecord(data.item) ? data.item : data;
  if (!isRecord(item) || !readNullableString(item, 'id')) {
    throw new Error('Runtime invocation response missing item');
  }
  return item as unknown as RuntimeInvocationItem;
}

async function retrieveRuntimeInvocationItem(invocationId: string): Promise<RuntimeInvocationItem> {
  const result = await retrieveRuntimeInvocation(invocationId);
  ensureSdkworkApiSuccess(result, 'Failed to retrieve runtime invocation');
  const data = readApiRecord(result);
  const item = isRecord(data.item) ? data.item : data;
  if (!isRecord(item) || !readNullableString(item, 'id')) {
    throw new Error('Runtime invocation response missing item');
  }
  return item as unknown as RuntimeInvocationItem;
}

function createChatStreamStarted(
  conversation: ChatConversationItem,
  input: ChatSendInput,
  invocation: RuntimeInvocationItem,
  turnId: string,
): ChatStreamStarted {
  const now = new Date().toISOString();
  return {
    runtimeInvocationId: invocation.id,
    sessionId: conversation.id,
    startedAt: now,
    turnId,
    session: {
      id: conversation.id,
      latestCompletionId: conversation.id,
      title: conversation.title || readSessionTitle(input.messages[0]?.content || input.prompt, conversation.id),
      modelName: input.selectedModel.name || invocation.model || conversation.defaultModel || input.selectedModel.model || undefined,
      vendorName: input.selectedModel.vendorName || invocation.provider || conversation.defaultProvider || undefined,
      createdAt: normalizeIsoDate(conversation.createdAt),
      updatedAt: now,
      preview: input.prompt,
      messageCount: Math.max(conversation.messageCount + 2, input.messages.length + 2),
    },
  };
}

async function completeRuntimeInvocation(
  invocationId: string,
  content: string,
  usage: RuntimeUsageSnapshot,
  status: RuntimeCompletionStatus = 'completed',
): Promise<RuntimeInvocationItem> {
  const result = await completeRuntimeInvocationOperation(
    invocationId,
    {
      finishReason: 'stop',
      responseJson: { outputText: content },
      status,
      usageJson: usage,
    },
  );
  ensureSdkworkApiSuccess(result, 'Failed to complete runtime invocation');
  const data = readApiRecord(result);
  const item = isRecord(data.item) ? data.item : data;
  if (!isRecord(item) || !readNullableString(item, 'id')) {
    throw new Error('Runtime invocation completion response missing item');
  }
  return item as unknown as RuntimeInvocationItem;
}

async function failRuntimeInvocation(
  invocationId: string,
  failure: RuntimeFailure,
): Promise<void> {
  const result = await completeRuntimeInvocationOperation(
    invocationId,
    {
      errorCode: failure.errorCode,
      errorMessageMasked: failure.errorMessageMasked,
      errorType: 'runtime_unavailable',
      status: 'failed',
    },
  );
  ensureSdkworkApiSuccess(result, 'Failed to mark runtime invocation failed');
}

async function recordRuntimeFailure(
  {
    assistantContent,
    conversationId,
    failure,
    input,
    invocation,
    turnId,
    usage,
  }: {
    assistantContent: string;
    conversationId: string;
    failure: RuntimeFailure;
    input: ChatSendInput;
    invocation: RuntimeInvocationItem;
    turnId: string;
    usage: RuntimeUsageSnapshot;
  },
): Promise<void> {
  await ignoreTerminalFailure(() => failRuntimeInvocation(invocation.id, failure));
  await ignoreTerminalFailure(() => failTurnResponse({
    assistantContent,
    conversationId,
    failure,
    input,
    invocation,
    turnId,
    usage,
  }));
}

async function ignoreTerminalFailure(operation: () => Promise<void>): Promise<void> {
  try {
    await operation();
  } catch {
    // Preserve the original stream failure for the chat UI; terminal-state recording is best-effort.
  }
}

async function failTurnResponse(
  {
    assistantContent,
    conversationId,
    failure,
    input,
    invocation,
    turnId,
    usage,
  }: {
    assistantContent: string;
    conversationId: string;
    failure: RuntimeFailure;
    input: ChatSendInput;
    invocation: RuntimeInvocationItem;
    turnId: string;
    usage: RuntimeUsageSnapshot;
  },
): Promise<void> {
  const result = await completeChatTurnResponse(
    conversationId,
    turnId,
    {
      message: readFailedTurnResponseMessage(assistantContent, failure),
      metadata: compactJsonObject({
        errorCode: failure.errorCode,
        errorType: 'runtime_unavailable',
        surface: CHAT_SOURCE_SURFACE,
      }),
      model: invocation.model || input.selectedModel.model || input.selectedModel.id,
      provider: invocation.provider || input.selectedModel.vendorCode || input.selectedModel.vendorName,
      runtime: invocation.runtime,
      runtimeInvocationId: invocation.id,
      status: 'failed',
      usage: { ...usage },
    },
  );
  ensureSdkworkApiSuccess(result, 'Failed to mark chat turn response failed');
}

function readFailedTurnResponseMessage(assistantContent: string, failure: RuntimeFailure): string {
  const trimmedContent = assistantContent.trim();
  if (!trimmedContent) {
    return failure.errorMessageMasked;
  }
  return `${trimmedContent}\n\n### Runtime failure\n\n${failure.errorMessageMasked}`;
}

async function completeTurnResponse(
  {
    content,
    conversationId,
    input,
    invocation,
    status = 'completed',
    turnId,
    usage,
  }: {
    content: string;
    conversationId: string;
    input: ChatSendInput;
    invocation: RuntimeInvocationItem;
    status?: RuntimeCompletionStatus;
    turnId: string;
    usage: RuntimeUsageSnapshot;
  },
): Promise<ChatTurnCreateResponse> {
  const result = await completeChatTurnResponse(
    conversationId,
    turnId,
    {
      message: content,
      metadata: {
        surface: CHAT_SOURCE_SURFACE,
      },
      model: invocation.model || input.selectedModel.model || input.selectedModel.id,
      provider: invocation.provider || input.selectedModel.vendorCode || input.selectedModel.vendorName,
      runtime: invocation.runtime,
      runtimeInvocationId: invocation.id,
      status,
      usage: { ...usage },
    },
  );
  ensureSdkworkApiSuccess(result, 'Failed to complete chat turn response');
  const data = readApiRecord(result);
  if (!isRecord(data.turn)) {
    throw new Error('Chat turn completion response missing turn');
  }
  return data as unknown as ChatTurnCreateResponse;
}

function mapConversationToSession(item: ChatConversationItem): ChatSessionSummary {
  return {
    id: item.id,
    latestCompletionId: item.id,
    title: item.title || item.id,
    modelName: item.defaultModel || undefined,
    vendorName: item.defaultProvider || undefined,
    createdAt: normalizeIsoDate(item.createdAt),
    updatedAt: normalizeIsoDate(item.updatedAt),
    preview: item.lastMessagePreview || undefined,
    messageCount: item.messageCount,
  };
}

function createFailedSessionSummary(
  conversation: ChatConversationItem,
  input: ChatSendInput,
  preview: string,
): ChatSessionSummary {
  return {
    id: conversation.id,
    latestCompletionId: conversation.id,
    title: conversation.title || readSessionTitle(input.messages[0]?.content || input.prompt, conversation.id),
    modelName: input.selectedModel.name || input.selectedModel.model || conversation.defaultModel || undefined,
    vendorName: input.selectedModel.vendorName || conversation.defaultProvider || undefined,
    createdAt: normalizeIsoDate(conversation.createdAt),
    updatedAt: new Date().toISOString(),
    preview,
    messageCount: Math.max(conversation.messageCount + 2, input.messages.length + 2),
  };
}

function mapChatMessage(item: ChatMessageItem): ChatMessage | null {
  if (item.role !== 'user' && item.role !== 'assistant') {
    return null;
  }
  return {
    id: item.id,
    role: item.role,
    content: item.content,
    createdAt: normalizeIsoDate(item.createdAt),
    status: mapChatMessageStatus(item.status),
    modelName: item.model || undefined,
    vendorName: item.provider || undefined,
  };
}

function mapChatMessageStatus(status: ChatMessageItem['status']): ChatMessage['status'] {
  switch (status) {
    case 'pending':
    case 'streaming':
      return 'responding';
    case 'failed':
    case 'deleted':
      return 'failed';
    case 'cancelled':
    case 'completed':
    default:
      return 'complete';
  }
}

function findTurnMessage(
  turn: ChatTurnCreateResponse,
  role: 'user' | 'assistant',
): ChatMessageItem | null {
  return turn.messages.find((message) => message.role === role) ?? null;
}

function toRuntimeMessages(messages: ChatMessage[], prompt: string): { role: 'user' | 'assistant'; content: string }[] {
  return [
    ...messages
      .filter((message) => (
        (message.role === 'user' || message.role === 'assistant')
        && (message.status === 'sent' || message.status === 'complete')
        && message.content.trim().length > 0
      ))
      .map((message) => ({ role: message.role, content: message.content })),
    { role: 'user' as const, content: prompt },
  ];
}

function readSessionTitle(value: unknown, fallback: string): string {
  const content = readMessageContent(value);
  if (!content) {
    return fallback || 'New chat';
  }
  return content.length > 60 ? `${content.slice(0, 57).trimEnd()}...` : content;
}

function readMessageContent(value: unknown): string {
  if (typeof value === 'string') {
    return value.trim();
  }
  if (!Array.isArray(value)) {
    if (!value || typeof value !== 'object') {
      return '';
    }
    const record = value as Record<string, unknown>;
    return readMessageContent(record.text || record.content || record.output_text || record.refusal);
  }
  return value
    .map((part) => {
      if (!part || typeof part !== 'object') {
        return '';
      }
      const record = part as Record<string, unknown>;
      return readMessageContent(record.text || record.output_text || record.refusal || record.content);
    })
    .join('\n')
    .trim();
}

function normalizeIsoDate(value: string | undefined | null): string {
  return parseDate(value).toISOString();
}

function parseDate(value: string | undefined | null): Date {
  const date = new Date(value || Date.now());
  return Number.isFinite(date.getTime()) ? date : new Date();
}

function compactJsonObject(record: Record<string, unknown>): Record<string, string | number | boolean> {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => (
      typeof value === 'string'
        ? value.trim().length > 0
        : typeof value === 'number' || typeof value === 'boolean'
    )),
  ) as Record<string, string | number | boolean>;
}

function readSelectedModelCatalogKey(model: PlaygroundModelOption): string {
  return model.catalogKey || model.id || model.model;
}

function readRuntimeStreamFailureMessage(error: unknown): string {
  if (error instanceof SyntaxError) {
    return RUNTIME_STREAM_FAILED_MESSAGE;
  }

  const rawMessage = readErrorMessage(error);
  if (!rawMessage) {
    return RUNTIME_STREAM_FAILED_MESSAGE;
  }

  const backendMessage = readBackendErrorMessage(rawMessage);
  return readUpstreamErrorMessage(backendMessage) || backendMessage || RUNTIME_STREAM_FAILED_MESSAGE;
}

function readRuntimeFailureEventMessage(event: unknown): string {
  if (!isRecord(event)) {
    return '';
  }
  const eventType = readFirstString(event, ['eventType']).toLowerCase();
  if (eventType !== 'runtime.failed') {
    return '';
  }
  const directMessage = readFirstString(event, ['errorMessageMasked']);
  if (directMessage) {
    return directMessage;
  }
  const payload = isRecord(event.payloadJson) ? event.payloadJson : null;
  if (!payload) {
    return RUNTIME_STREAM_FAILED_MESSAGE;
  }
  return readFirstString(payload, ['errorMessageMasked', 'message', 'error'])
    || RUNTIME_STREAM_FAILED_MESSAGE;
}

function readRuntimeCancellationEvent(event: unknown): boolean {
  if (!isRecord(event)) {
    return false;
  }
  const eventType = readFirstString(event, ['eventType']).toLowerCase();
  return eventType === 'runtime.cancelled';
}

function readRuntimeEventNo(event: unknown): number {
  if (!isRecord(event)) {
    return 0;
  }
  const rawEventNo = event.eventNo;
  const eventNo = typeof rawEventNo === 'number'
    ? rawEventNo
    : typeof rawEventNo === 'string'
      ? Number(rawEventNo.trim())
      : Number.NaN;
  return Number.isFinite(eventNo) && eventNo > 0 ? Math.trunc(eventNo) : 0;
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  if (typeof error === 'string') {
    return error.trim();
  }
  if (!isRecord(error)) {
    return '';
  }
  return readFirstString(error, ['msg', 'message', 'error']);
}

function readBackendErrorMessage(message: string): string {
  const parsed = parseJsonObject(message);
  if (!parsed) {
    return message;
  }
  const parsedMessage = readFirstString(parsed, ['msg', 'message']);
  if (parsedMessage) {
    return parsedMessage;
  }
  const parsedError = isRecord(parsed.error) ? parsed.error : null;
  return parsedError ? readFirstString(parsedError, ['message', 'msg']) || message : message;
}

function readUpstreamErrorMessage(message: string): string {
  const upstreamPayload = parseEmbeddedJsonObject(message);
  if (!upstreamPayload) {
    return '';
  }
  const upstreamError = isRecord(upstreamPayload.error) ? upstreamPayload.error : upstreamPayload;
  const upstreamMessage = readFirstString(upstreamError, ['message', 'msg']);
  if (!upstreamMessage) {
    return '';
  }

  const details = [
    readFirstString(upstreamError, ['code']),
    readRuntimeHttpStatus(message),
    readRuntimeRequestedModel(message),
  ].filter((item): item is string => Boolean(item));
  return details.length > 0 ? `${upstreamMessage} (${details.join('; ')})` : upstreamMessage;
}

function readRuntimeHttpStatus(message: string): string {
  const match = /\bHTTP\s+(\d{3})\b/.exec(message);
  return match?.[1] ? `HTTP ${match[1]}` : '';
}

function readRuntimeRequestedModel(message: string): string {
  const match = /\bmodel=([^:\s]+)/.exec(message);
  return match?.[1] ? `model=${match[1]}` : '';
}

function parseEmbeddedJsonObject(message: string): Record<string, unknown> | null {
  const start = message.indexOf('{');
  if (start < 0) {
    return null;
  }
  return parseJsonObject(message.substring(start).trim());
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readFirstString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}
