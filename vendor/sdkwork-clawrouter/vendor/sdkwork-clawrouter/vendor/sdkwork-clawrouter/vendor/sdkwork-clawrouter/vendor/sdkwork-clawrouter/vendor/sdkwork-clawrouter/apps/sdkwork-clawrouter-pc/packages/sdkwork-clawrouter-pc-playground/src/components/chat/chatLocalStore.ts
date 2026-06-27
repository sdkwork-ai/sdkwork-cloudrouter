import type { PlaygroundModelOption } from '../../playgroundTypes';
import type { ChatMessage, ChatSessionSummary } from './chatTypes';
import {
  emptyRuntimeUsageSnapshot,
  type RuntimeUsageSnapshot,
} from '@sdkwork/clawroutes-pc-commons/runtime';

const CHAT_LOCAL_STORE_PREFIX = 'sdkwork-clawrouter.playground.chat';

interface StoredChatConversation {
  inFlightStreams?: Record<string, StoredChatInFlightStream>;
  sessions: ChatSessionSummary[];
  messagesBySessionId: Record<string, ChatMessage[]>;
  updatedAt: string;
}

interface MergeChatSessionsOptions {
  remoteAuthoritative?: boolean;
}

export interface StoredChatInFlightStream {
  assistantContent: string;
  id: string;
  lastEventNo?: number;
  pendingAssistantMessageId: string;
  prompt: string;
  runtimeInvocationId: string;
  selectedModel: PlaygroundModelOption;
  session: ChatSessionSummary;
  sessionId: string;
  startedAt: string;
  turnId: string;
  updatedAt: string;
  usage: RuntimeUsageSnapshot;
  userMessageId: string;
}

function readStorage(): Storage | null {
  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

function storageKey(scope: string): string {
  return `${CHAT_LOCAL_STORE_PREFIX}.${scope}`;
}

export function loadStoredChatSessions(scope: string): ChatSessionSummary[] {
  return loadStoredConversation(scope).sessions;
}

export function loadStoredChatMessages(scope: string, sessionId: string): ChatMessage[] {
  return loadStoredConversation(scope).messagesBySessionId[sessionId] ?? [];
}

export function saveStoredChatConversation(
  scope: string,
  sessions: ChatSessionSummary[],
  messagesBySessionId: Record<string, ChatMessage[]>,
): void {
  const existing = loadStoredConversation(scope);
  saveStoredConversation(scope, {
    inFlightStreams: existing.inFlightStreams,
    sessions: sessions.filter(isChatSessionSummary),
    messagesBySessionId: Object.fromEntries(
      Object.entries(messagesBySessionId).map(([sessionId, messages]) => [
        sessionId,
        messages.filter(isChatMessage),
      ]),
    ),
    updatedAt: new Date().toISOString(),
  });
}

export function loadStoredChatInFlightStreams(scope: string): StoredChatInFlightStream[] {
  return Object.values(loadStoredConversation(scope).inFlightStreams ?? {})
    .filter(isStoredChatInFlightStream)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

export function saveStoredChatInFlightStream(
  scope: string,
  stream: StoredChatInFlightStream,
): void {
  const normalizedStream = normalizeStoredChatInFlightStream(stream);
  if (!normalizedStream) {
    return;
  }
  const conversation = loadStoredConversation(scope);
  saveStoredConversation(scope, {
    ...conversation,
    inFlightStreams: {
      ...(conversation.inFlightStreams ?? {}),
      [normalizedStream.id]: normalizedStream,
    },
    updatedAt: new Date().toISOString(),
  });
}

export function clearStoredChatInFlightStream(scope: string, streamId: string): void {
  const conversation = loadStoredConversation(scope);
  if (!conversation.inFlightStreams?.[streamId]) {
    return;
  }
  const inFlightStreams = { ...conversation.inFlightStreams };
  delete inFlightStreams[streamId];
  saveStoredConversation(scope, {
    ...conversation,
    inFlightStreams,
    updatedAt: new Date().toISOString(),
  });
}

export function mergeChatSessions(
  scope: string,
  remoteSessions: ChatSessionSummary[],
  remoteMessagesBySessionId: Record<string, ChatMessage[]>,
  options: MergeChatSessionsOptions = {},
): {
  sessions: ChatSessionSummary[];
  messagesBySessionId: Record<string, ChatMessage[]>;
} {
  const storedConversation = loadStoredConversation(scope);
  const localSessions = options.remoteAuthoritative
    ? readInFlightStreamSessions(storedConversation)
    : storedConversation.sessions;
  const sessionsById = new Map<string, ChatSessionSummary>();
  for (const session of [...localSessions, ...remoteSessions]) {
    const current = sessionsById.get(session.id);
    if (!current || Date.parse(session.updatedAt) >= Date.parse(current.updatedAt)) {
      sessionsById.set(session.id, session);
    }
  }

  const visibleSessionIds = new Set(sessionsById.keys());
  const messagesBySessionId: Record<string, ChatMessage[]> = {};
  const storedMessageEntries = options.remoteAuthoritative
    ? Object.entries(storedConversation.messagesBySessionId).filter(([sessionId]) => visibleSessionIds.has(sessionId))
    : Object.entries(storedConversation.messagesBySessionId);
  for (const [sessionId, messages] of storedMessageEntries) {
    messagesBySessionId[sessionId] = messages;
  }
  for (const [sessionId, messages] of Object.entries(remoteMessagesBySessionId)) {
    if (!options.remoteAuthoritative || visibleSessionIds.has(sessionId)) {
      messagesBySessionId[sessionId] = messages;
    }
  }

  return {
    sessions: [...sessionsById.values()].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
    messagesBySessionId,
  };
}

function readInFlightStreamSessions(conversation: StoredChatConversation): ChatSessionSummary[] {
  return Object.values(conversation.inFlightStreams ?? {})
    .filter(isStoredChatInFlightStream)
    .map(stream => stream.session);
}

function loadStoredConversation(scope: string): StoredChatConversation {
  const store = readStorage();
  if (!store) {
    return emptyStoredChatConversation();
  }
  const raw = store.getItem(storageKey(scope));
  if (!raw) {
    return emptyStoredChatConversation();
  }
  try {
    const conversation = JSON.parse(raw) as StoredChatConversation;
    if (!conversation) {
      return emptyStoredChatConversation();
    }
    const messagesBySessionId: Record<string, ChatMessage[]> = {};
    for (const [sessionId, messages] of Object.entries(conversation.messagesBySessionId ?? {})) {
      if (Array.isArray(messages)) {
        messagesBySessionId[sessionId] = messages.filter(isChatMessage);
      }
    }
    const inFlightStreams = Object.fromEntries(
      Object.entries(conversation.inFlightStreams ?? {})
        .map(([streamId, stream]) => [streamId, normalizeStoredChatInFlightStream(stream)])
        .filter((entry): entry is [string, StoredChatInFlightStream] => Boolean(entry[1])),
    );
    return {
      inFlightStreams,
      sessions: Array.isArray(conversation.sessions)
        ? conversation.sessions.filter(isChatSessionSummary)
        : [],
      messagesBySessionId,
      updatedAt: typeof conversation.updatedAt === 'string'
        ? conversation.updatedAt
        : new Date().toISOString(),
    };
  } catch {
    return emptyStoredChatConversation();
  }
}

function saveStoredConversation(scope: string, conversation: StoredChatConversation): void {
  const store = readStorage();
  if (!store) {
    return;
  }
  try {
    store.setItem(storageKey(scope), JSON.stringify(conversation));
  } catch {
    // Ignore local storage quota or serialization failures.
  }
}

function emptyStoredChatConversation(): StoredChatConversation {
  return {
    inFlightStreams: {},
    sessions: [],
    messagesBySessionId: {},
    updatedAt: new Date().toISOString(),
  };
}

function isChatSessionSummary(value: unknown): value is ChatSessionSummary {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.latestCompletionId === 'string'
    && typeof record.title === 'string'
    && typeof record.createdAt === 'string'
    && typeof record.updatedAt === 'string';
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && (record.role === 'user' || record.role === 'assistant')
    && typeof record.content === 'string'
    && typeof record.createdAt === 'string'
    && typeof record.status === 'string';
}

function normalizeStoredChatInFlightStream(value: unknown): StoredChatInFlightStream | null {
  if (!isStoredChatInFlightStream(value)) {
    return null;
  }
  return {
    ...value,
    lastEventNo: typeof value.lastEventNo === 'number' && Number.isFinite(value.lastEventNo)
      ? Math.max(0, Math.trunc(value.lastEventNo))
      : undefined,
    updatedAt: value.updatedAt || new Date().toISOString(),
    usage: isRuntimeUsageSnapshot(value.usage)
      ? normalizeRuntimeUsageSnapshot(value.usage)
      : emptyRuntimeUsageSnapshot(),
  };
}

function isStoredChatInFlightStream(value: unknown): value is StoredChatInFlightStream {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string'
    && typeof record.runtimeInvocationId === 'string'
    && typeof record.sessionId === 'string'
    && typeof record.turnId === 'string'
    && typeof record.pendingAssistantMessageId === 'string'
    && typeof record.userMessageId === 'string'
    && typeof record.prompt === 'string'
    && typeof record.assistantContent === 'string'
    && typeof record.startedAt === 'string'
    && typeof record.updatedAt === 'string'
    && isChatSessionSummary(record.session)
    && (record.usage === undefined || isRuntimeUsageSnapshot(record.usage))
    && Boolean(record.selectedModel && typeof record.selectedModel === 'object');
}

function isRuntimeUsageSnapshot(value: unknown): value is RuntimeUsageSnapshot {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isNonNegativeFiniteNumber(record.cachedTokens)
    && isNonNegativeFiniteNumber(record.inputTokens)
    && isNonNegativeFiniteNumber(record.outputTokens)
    && isNonNegativeFiniteNumber(record.totalTokens);
}

function normalizeRuntimeUsageSnapshot(value: RuntimeUsageSnapshot): RuntimeUsageSnapshot {
  return {
    cachedTokens: Math.max(0, Math.trunc(value.cachedTokens)),
    inputTokens: Math.max(0, Math.trunc(value.inputTokens)),
    outputTokens: Math.max(0, Math.trunc(value.outputTokens)),
    totalTokens: Math.max(0, Math.trunc(value.totalTokens)),
  };
}

function isNonNegativeFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}
