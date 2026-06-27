import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  emptyRuntimeUsageSnapshot,
  mergeRuntimeUsageSnapshots,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import { PlaygroundService } from '../../playgroundService';
import {
  clearStoredChatInFlightStream,
  loadStoredChatInFlightStreams,
  loadStoredChatMessages,
  mergeChatSessions,
  saveStoredChatConversation,
  saveStoredChatInFlightStream,
  type StoredChatInFlightStream,
} from './chatLocalStore';
import { SimpleChatInput } from './SimpleChatInput';
import { ChatMessageList } from './ChatMessageList';
import { ChatSessionList } from './ChatSessionList';
import { createChatUserMessage, createFailedAssistantMessage, createPendingAssistantMessage } from './chatSession';
import { ChatSendFailureError, ChatService } from './chatService';
import { findCallableChatModel, findChatModel, firstCallableChatModel, isCallableChatModel } from './chatModelSelection';
import type { ChatMessage, ChatSessionSummary, SimpleChatInputSubmit } from './chatTypes';
import type { PlaygroundModelGroup, PlaygroundModelOption } from '../../playgroundTypes';

const CHAT_LOCAL_SESSION_SCOPE = 'app-session';

export function ChatPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const routeSessionId = useMemo(() => readChatRouteSessionId(location.pathname), [location.pathname]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessions, setSessions] = useState<ChatSessionSummary[]>([]);
  const [messagesBySessionId, setMessagesBySessionId] = useState<Record<string, ChatMessage[]>>({});
  const [modelGroups, setModelGroups] = useState<PlaygroundModelGroup[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState(routeSessionId);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [loadingModels, setLoadingModels] = useState(false);
  const [modelLoadError, setModelLoadError] = useState<string | null>(null);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [isNewChatDraft, setIsNewChatDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [composerHeightPx, setComposerHeightPx] = useState(224);
  const sessionsRef = useRef<ChatSessionSummary[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const messagesBySessionIdRef = useRef<Record<string, ChatMessage[]>>({});
  const messageScrollerRef = useRef<HTMLDivElement>(null);
  const selectedSessionIdRef = useRef('');
  const isNewChatDraftRef = useRef(false);
  const resumingStreamIdsRef = useRef(new Set<string>());
  const activeChatStreamRef = useRef<StoredChatInFlightStream | null>(null);
  const stopRequestedBeforeStreamRef = useRef(false);

  function scrollChatToBottom(): void {
    const scroll = () => {
      const scroller = messageScrollerRef.current;
      if (!scroller) {
        return;
      }
      scroller.scrollTop = scroller.scrollHeight;
    };

    scroll();
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(scroll);
    }
  }

  const beginNewChatDraft = useCallback(() => {
    isNewChatDraftRef.current = true;
    setIsNewChatDraft(true);
  }, []);

  const clearNewChatDraft = useCallback(() => {
    isNewChatDraftRef.current = false;
    setIsNewChatDraft(false);
  }, []);

  const resetActiveConversationView = useCallback(({ clearSessions = false }: { clearSessions?: boolean } = {}) => {
    setSelectedSessionId('');
    setMessages([]);
    setSessionError(null);
    setMessageError(null);
    setLoadingMessages(false);
    setLoadingSessions(false);
    if (clearSessions) {
      setSessions([]);
      setMessagesBySessionId({});
    }
  }, []);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesBySessionIdRef.current = messagesBySessionId;
  }, [messagesBySessionId]);

  useEffect(() => {
    selectedSessionIdRef.current = selectedSessionId;
  }, [selectedSessionId]);

  useEffect(() => {
    isNewChatDraftRef.current = isNewChatDraft;
  }, [isNewChatDraft]);

  useEffect(() => {
    if (routeSessionId) {
      clearNewChatDraft();
      setSelectedSessionId(routeSessionId);
      return;
    }
    if (isChatRoute(location.pathname)) {
      setSelectedSessionId('');
      setMessages([]);
      setMessageError(null);
      setLoadingMessages(false);
    }
  }, [clearNewChatDraft, location.pathname, routeSessionId]);

  useEffect(() => {
    let cancelled = false;

    setLoadingModels(true);
    setModelLoadError(null);
    PlaygroundService.fetchModelGroups()
      .then((groups) => {
        if (cancelled) {
          return;
        }
        setModelGroups(groups);
        setSelectedModelId((current) => findCallableChatModel(groups, current)?.id || firstCallableChatModel(groups)?.id || '');
      })
      .catch((error) => {
        if (!cancelled) {
          setModelGroups([]);
          setModelLoadError(error instanceof Error ? error.message : t('playground.chat.input.disabled.modelLoadFailed'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingModels(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [t]);

  const selectedSession = useMemo(
    () => sessions.find((session) => session.id === selectedSessionId) || null,
    [sessions, selectedSessionId],
  );

  const selectedChatModel = useMemo(
    () => findCallableChatModel(modelGroups, selectedModelId),
    [modelGroups, selectedModelId],
  );
  const chatStoreScope = CHAT_LOCAL_SESSION_SCOPE;

  useEffect(() => {
    let cancelled = false;
    clearNewChatDraft();
    setSessionError(null);
    setMessageError(null);
    setLoadingMessages(false);
    const localConversation = mergeChatSessions(chatStoreScope, [], {});
    sessionsRef.current = localConversation.sessions;
    messagesBySessionIdRef.current = localConversation.messagesBySessionId;
    setSessions(localConversation.sessions);
    setMessagesBySessionId(localConversation.messagesBySessionId);
    setSelectedSessionId((current) => {
      if (isNewChatDraftRef.current) {
        return '';
      }
      if (current && localConversation.sessions.some((session) => session.id === current)) {
        return current;
      }
      return current;
    });

    setLoadingSessions(true);
    ChatService.fetchSessions()
      .then((items) => {
        if (!cancelled) {
          const merged = mergeChatSessions(chatStoreScope, items, localConversation.messagesBySessionId, {
            remoteAuthoritative: true,
          });
          const activeSelectedSessionId = selectedSessionIdRef.current;
          if (activeSelectedSessionId && !merged.sessions.some((item) => item.id === activeSelectedSessionId)) {
            selectedSessionIdRef.current = '';
            messagesRef.current = [];
            setMessages([]);
            setMessageError(null);
          }
          sessionsRef.current = merged.sessions;
          messagesBySessionIdRef.current = merged.messagesBySessionId;
          setSessions(merged.sessions);
          setMessagesBySessionId(merged.messagesBySessionId);
          saveStoredChatConversation(chatStoreScope, merged.sessions, merged.messagesBySessionId);
          setSelectedSessionId((current) => {
            if (isNewChatDraftRef.current) {
              return '';
            }
            if (current && merged.sessions.some((item) => item.id === current)) {
              return current;
            }
            return '';
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          sessionsRef.current = localConversation.sessions;
          messagesBySessionIdRef.current = localConversation.messagesBySessionId;
          setSessions(localConversation.sessions);
          setMessagesBySessionId(localConversation.messagesBySessionId);
          setSessionError(error instanceof Error ? error.message : t('playground.chat.sessionsLoadFailed'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSessions(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chatStoreScope, clearNewChatDraft, t]);

  useEffect(() => {
    let cancelled = false;
    if (!selectedSessionId) {
      setLoadingMessages(false);
      setMessageError(null);
      return undefined;
    }

    const storedMessages = loadStoredChatMessages(chatStoreScope, selectedSessionId);
    setMessages(storedMessages);
    setLoadingMessages(true);
    setMessageError(null);
    ChatService.fetchMessages({
      completionId: selectedSession?.latestCompletionId || selectedSessionId,
    })
      .then((items) => {
        if (!cancelled) {
          const activeStream = loadStoredChatInFlightStreams(chatStoreScope)
            .find((stream) => stream.sessionId === selectedSessionId);
          const nextItems = activeStream
            ? mergeRuntimeStreamMessages(
              loadStoredChatMessages(chatStoreScope, selectedSessionId),
              items,
              activeStream,
            )
            : items;
          setMessages(nextItems);
          setMessagesBySessionId((current) => {
            const next = { ...current, [selectedSessionId]: nextItems };
            saveStoredChatConversation(chatStoreScope, sessionsRef.current, next);
            return next;
          });
        }
      })
      .catch((error) => {
        if (!cancelled) {
          if (storedMessages.length === 0) {
            setMessages([]);
          }
          setMessageError(error instanceof Error ? error.message : t('playground.chat.messagesLoadFailed'));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [chatStoreScope, selectedSession?.latestCompletionId, selectedSessionId, t]);

  const handleSubmit = async (input: SimpleChatInputSubmit): Promise<boolean> => {
    const requestedModel = findChatModel(modelGroups, input.selectedModelId);
    if (requestedModel && !isCallableChatModel(requestedModel)) {
      const fallbackModel = selectedChatModel || firstCallableChatModel(modelGroups);
      if (fallbackModel && fallbackModel.id !== selectedModelId) {
        setSelectedModelId(fallbackModel.id);
      }
      setMessages((current) => [
        ...current,
        createFailedAssistantMessage(t('playground.chat.errors.modelUnavailable')),
      ]);
      return false;
    }

    const selectedModel = findCallableChatModel(modelGroups, input.selectedModelId) || selectedChatModel || firstCallableChatModel(modelGroups);
    if (!selectedModel) {
      setMessages((current) => [
        ...current,
        createFailedAssistantMessage(t('playground.chat.errors.missingModel')),
      ]);
      return false;
    }
    if (!isCallableChatModel(selectedModel)) {
      setMessages((current) => [
        ...current,
        createFailedAssistantMessage(t('playground.chat.errors.modelUnavailable')),
      ]);
      return false;
    }

    setSubmitting(true);
    setMessageError(null);
    const userMessage = createChatUserMessage(input.prompt);
    const pendingAssistant = createPendingAssistantMessage();
    const priorMessages = messagesRef.current;
    const priorSessions = sessionsRef.current;
    const priorMessagesBySessionId = messagesBySessionIdRef.current;
    const selectedSessionIdSnapshot = selectedSessionId;
    let activeSessionId = selectedSessionIdSnapshot;
    let activeStreamRecord: StoredChatInFlightStream | null = null;
    let lastRuntimeEventNo = 0;
    let streamedAssistantContent = '';
    let runtimeUsage = emptyRuntimeUsageSnapshot();
    let pendingAssistantDelta = '';
    let pendingAssistantDeltaFrame = 0;

    function flushPendingAssistantDelta(): void {
      if (!pendingAssistantDelta) {
        return;
      }
      pendingAssistantDelta = '';
      if (pendingAssistantDeltaFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(pendingAssistantDeltaFrame);
      }
      pendingAssistantDeltaFrame = 0;
      const sessionChanged = Boolean(activeSessionId) && activeSessionId !== selectedSessionIdRef.current;
      if (sessionChanged) {
        return;
      }
      scrollChatToBottom();
      setMessages((current) => current.map((message) => (
        message.id === pendingAssistant.id
          ? {
            ...message,
            content: streamedAssistantContent,
            status: 'responding',
          }
          : message
      )));
    }

    function scheduleAssistantDeltaFlush(): void {
      if (pendingAssistantDeltaFrame) {
        return;
      }
      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        flushPendingAssistantDelta();
        return;
      }
      pendingAssistantDeltaFrame = window.requestAnimationFrame(() => {
        pendingAssistantDeltaFrame = 0;
        flushPendingAssistantDelta();
      });
    }

    function persistActiveStreamSnapshot(content: string): void {
      if (!activeStreamRecord || !activeSessionId) {
        return;
      }
      const now = new Date().toISOString();
      const nextStream: StoredChatInFlightStream = {
        ...activeStreamRecord,
        assistantContent: content,
        lastEventNo: lastRuntimeEventNo || activeStreamRecord.lastEventNo,
        updatedAt: now,
        usage: runtimeUsage,
      };
      activeStreamRecord = nextStream;
      activeChatStreamRef.current = nextStream;
      const activeSessions = sessionsRef.current.length > 0 ? sessionsRef.current : priorSessions;
      const nextSessions = [
        {
          ...nextStream.session,
          preview: content || input.prompt,
          updatedAt: now,
        },
        ...activeSessions.filter((session) => session.id !== activeSessionId),
      ];
      const currentMessages = messagesBySessionIdRef.current[activeSessionId]
        || priorMessagesBySessionId[activeSessionId]
        || [...normalizeChatHistoryMessages(priorMessages), userMessage, pendingAssistant];
      const nextMessages = currentMessages.map((message) => (
        message.id === pendingAssistant.id
          ? {
            ...message,
            content,
            status: 'responding' as const,
          }
          : message
      ));
      const nextMessagesBySessionId = {
        ...messagesBySessionIdRef.current,
        [activeSessionId]: nextMessages,
      };
      sessionsRef.current = nextSessions;
      messagesBySessionIdRef.current = nextMessagesBySessionId;
      saveStoredChatConversation(chatStoreScope, nextSessions, nextMessagesBySessionId);
      saveStoredChatInFlightStream(chatStoreScope, nextStream);
    }

    setMessages((current) => [...current, userMessage, pendingAssistant]);
    scrollChatToBottom();

    try {
      const result = await ChatService.sendMessage({
        messages: priorMessages,
        onDelta: (delta) => {
          if (!delta) {
            return;
          }
          streamedAssistantContent += delta;
          persistActiveStreamSnapshot(streamedAssistantContent);
          const sessionChanged = Boolean(activeSessionId) && activeSessionId !== selectedSessionIdRef.current;
          if (sessionChanged) {
            return;
          }
          pendingAssistantDelta += delta;
          scheduleAssistantDeltaFlush();
        },
        onRuntimeEvent: (event) => {
          runtimeUsage = mergeRuntimeUsageSnapshots(runtimeUsage, event.usage);
          if (event.eventNo) {
            lastRuntimeEventNo = Math.max(lastRuntimeEventNo, event.eventNo);
          }
          persistActiveStreamSnapshot(streamedAssistantContent);
        },
        onStreamStarted: (stream) => {
          activeSessionId = stream.sessionId;
          selectedSessionIdRef.current = stream.sessionId;
          const now = new Date().toISOString();
          activeStreamRecord = {
            assistantContent: streamedAssistantContent,
            id: stream.runtimeInvocationId,
            lastEventNo: lastRuntimeEventNo || undefined,
            pendingAssistantMessageId: pendingAssistant.id,
            prompt: input.prompt,
            runtimeInvocationId: stream.runtimeInvocationId,
            selectedModel,
            session: stream.session,
            sessionId: stream.sessionId,
            startedAt: stream.startedAt,
            turnId: stream.turnId,
            updatedAt: now,
            usage: runtimeUsage,
            userMessageId: userMessage.id,
          };
          activeChatStreamRef.current = activeStreamRecord;
          if (stopRequestedBeforeStreamRef.current) {
            stopRequestedBeforeStreamRef.current = false;
            void ChatService.cancelRuntimeInvocation({
              content: activeStreamRecord.assistantContent,
              runtimeInvocationId: activeStreamRecord.runtimeInvocationId,
              usage: activeStreamRecord.usage,
            }).catch((error) => {
              const message = error instanceof Error ? error.message : t('playground.chat.errors.runtimeUnavailable');
              setMessageError(message);
            });
          }
          const nextMessages = [
            ...normalizeChatHistoryMessages(priorMessages),
            userMessage,
            pendingAssistant,
          ];
          const nextSessions = [stream.session, ...sessionsRef.current.filter((session) => session.id !== stream.sessionId)];
          const nextMessagesBySessionId = {
            ...messagesBySessionIdRef.current,
            [stream.sessionId]: nextMessages,
          };
          sessionsRef.current = nextSessions;
          messagesRef.current = nextMessages;
          messagesBySessionIdRef.current = nextMessagesBySessionId;
          setSessions(nextSessions);
          setMessagesBySessionId(nextMessagesBySessionId);
          saveStoredChatConversation(chatStoreScope, nextSessions, nextMessagesBySessionId);
          saveStoredChatInFlightStream(chatStoreScope, activeStreamRecord);
          if (!selectedSessionIdSnapshot) {
            clearNewChatDraft();
            setSelectedSessionId(stream.sessionId);
            navigate(createChatSessionRoute(stream.sessionId), { replace: true });
          }
        },
        prompt: input.prompt,
        cancelledFallbackContent: t('playground.chat.stopped'),
        selectedModel,
        sessionId: selectedSessionIdSnapshot || undefined,
      });
      flushPendingAssistantDelta();
      const sessionId = activeSessionId || result.session.id;
      const nextMessages = [
        ...normalizeChatHistoryMessages(priorMessages),
        userMessage,
        result.assistantMessage,
      ];
      const sessionChanged = Boolean(sessionId) && sessionId !== selectedSessionIdRef.current;
      const activeSessions = sessionChanged ? priorSessions : sessionsRef.current;
      const nextSessions = [result.session, ...activeSessions.filter((session) => session.id !== result.session.id)];
      const nextMessagesBySessionId = {
        ...priorMessagesBySessionId,
        [sessionId]: nextMessages,
      };
      if (activeStreamRecord) {
        clearStoredChatInFlightStream(chatStoreScope, activeStreamRecord.id);
      }
      if (sessionChanged) {
        saveStoredChatConversation(chatStoreScope, nextSessions, nextMessagesBySessionId);
        return false;
      }
      sessionsRef.current = nextSessions;
      messagesRef.current = nextMessages;
      messagesBySessionIdRef.current = nextMessagesBySessionId;
      setMessages((current) => current.map((message) => (
        message.id === pendingAssistant.id ? result.assistantMessage : message
      )));
      scrollChatToBottom();
      setSessions(nextSessions);
      setMessagesBySessionId(nextMessagesBySessionId);
      saveStoredChatConversation(chatStoreScope, nextSessions, nextMessagesBySessionId);
      clearNewChatDraft();
      setSelectedSessionId(sessionId);
      navigate(createChatSessionRoute(sessionId), { replace: true });
      return true;
    } catch (error) {
      flushPendingAssistantDelta();
      const sessionChanged = Boolean(activeSessionId) && activeSessionId !== selectedSessionIdRef.current;
      const message = error instanceof Error && error.message.startsWith('playground.')
        ? t(error.message)
        : error instanceof Error
          ? error.message
          : t('playground.chat.errors.emptyResponse');
      const errorMessage = message;
      const failedSession = error instanceof ChatSendFailureError ? error.session : undefined;
      const failedMessages = [
        ...normalizeChatHistoryMessages(priorMessages),
        userMessage,
        {
          ...pendingAssistant,
          content: streamedAssistantContent || errorMessage,
          errorMessage: streamedAssistantContent ? errorMessage : undefined,
          status: 'failed' as const,
        },
      ];
      if (!sessionChanged) {
        messagesRef.current = failedMessages;
      }
      const persistedFailure = persistFailedChatConversation({
        errorMessage,
        failedMessages,
        failedSession,
        priorMessagesBySessionId,
        priorSessions,
        prompt: input.prompt,
        selectedModel,
        selectedSessionId: activeSessionId || selectedSessionIdSnapshot,
        updateState: !sessionChanged,
      });
      if (activeStreamRecord) {
        clearStoredChatInFlightStream(chatStoreScope, activeStreamRecord.id);
      }
      if (sessionChanged) {
        return false;
      }
      setMessages((current) => {
        let normalizedCurrent = current;
        if (!normalizedCurrent.some((item) => item.id === userMessage.id)) {
          normalizedCurrent = [...normalizedCurrent, userMessage];
        }
        if (!normalizedCurrent.some((item) => item.id === pendingAssistant.id)) {
          normalizedCurrent = [...normalizedCurrent, pendingAssistant];
        }
        return normalizedCurrent.map((item) => (
          item.id === pendingAssistant.id
            ? {
              ...item,
              content: streamedAssistantContent || item.content || errorMessage,
              errorMessage: streamedAssistantContent ? errorMessage : undefined,
              status: 'failed' as const,
            }
            : item
        ));
      });
      scrollChatToBottom();
      setMessageError(errorMessage);
      if (!activeSessionId && !selectedSessionIdSnapshot && persistedFailure) {
        clearNewChatDraft();
        setSelectedSessionId(persistedFailure.sessionId);
        navigate(createChatSessionRoute(persistedFailure.sessionId), { replace: true });
      }
      return false;
    } finally {
      if (pendingAssistantDeltaFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(pendingAssistantDeltaFrame);
      }
      pendingAssistantDeltaFrame = 0;
      if (activeStreamRecord && activeChatStreamRef.current?.id === activeStreamRecord.id) {
        activeChatStreamRef.current = null;
      }
      stopRequestedBeforeStreamRef.current = false;
      setSubmitting(false);
    }
  };

  const handleStop = useCallback(async (): Promise<void> => {
    const stream = activeChatStreamRef.current;
    if (!stream) {
      stopRequestedBeforeStreamRef.current = true;
      return;
    }
    try {
      await ChatService.cancelRuntimeInvocation({
        content: stream.assistantContent,
        runtimeInvocationId: stream.runtimeInvocationId,
        usage: stream.usage,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('playground.chat.errors.runtimeUnavailable');
      setMessageError(message);
    }
  }, [t]);

  const resumeStoredChatStream = useCallback(async (stream: StoredChatInFlightStream): Promise<void> => {
    if (resumingStreamIdsRef.current.has(stream.id)) {
      return;
    }
    resumingStreamIdsRef.current.add(stream.id);
    activeChatStreamRef.current = stream;
    setSubmitting(true);
    setMessageError(null);
    clearNewChatDraft();
    selectedSessionIdRef.current = stream.sessionId;
    setSelectedSessionId(stream.sessionId);
    navigate(createChatSessionRoute(stream.sessionId), { replace: true });

    const storedMessages = mergeRuntimeStreamMessages(
      loadStoredChatMessages(chatStoreScope, stream.sessionId),
      messagesBySessionIdRef.current[stream.sessionId] ?? [],
      stream,
    );
    const initialSessions = [stream.session, ...sessionsRef.current.filter((session) => session.id !== stream.sessionId)];
    const initialMessagesBySessionId = {
      ...messagesBySessionIdRef.current,
      [stream.sessionId]: storedMessages,
    };
    sessionsRef.current = initialSessions;
    messagesRef.current = storedMessages;
    messagesBySessionIdRef.current = initialMessagesBySessionId;
    setSessions(initialSessions);
    setMessages(storedMessages);
    setMessagesBySessionId(initialMessagesBySessionId);
    saveStoredChatConversation(chatStoreScope, initialSessions, initialMessagesBySessionId);

    let assistantContent = stream.assistantContent;
    let runtimeUsage = mergeRuntimeUsageSnapshots(emptyRuntimeUsageSnapshot(), stream.usage);
    let lastEventNo = stream.lastEventNo || 0;
    let pendingAssistantDelta = '';
    let pendingAssistantDeltaFrame = 0;

    function flushPendingAssistantDelta(): void {
      if (!pendingAssistantDelta) {
        return;
      }
      pendingAssistantDelta = '';
      if (pendingAssistantDeltaFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(pendingAssistantDeltaFrame);
      }
      pendingAssistantDeltaFrame = 0;
      if (selectedSessionIdRef.current !== stream.sessionId) {
        return;
      }
      scrollChatToBottom();
      setMessages((current) => current.map((message) => (
        message.id === stream.pendingAssistantMessageId
          ? {
            ...message,
            content: assistantContent,
            status: 'responding',
          }
          : message
      )));
    }

    function scheduleAssistantDeltaFlush(): void {
      if (pendingAssistantDeltaFrame) {
        return;
      }
      if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        flushPendingAssistantDelta();
        return;
      }
      pendingAssistantDeltaFrame = window.requestAnimationFrame(() => {
        pendingAssistantDeltaFrame = 0;
        flushPendingAssistantDelta();
      });
    }

    function persistResumeSnapshot(content: string): void {
      const now = new Date().toISOString();
      const nextStream: StoredChatInFlightStream = {
        ...stream,
        assistantContent: content,
        lastEventNo: lastEventNo || stream.lastEventNo,
        updatedAt: now,
        usage: runtimeUsage,
      };
      activeChatStreamRef.current = nextStream;
      const nextMessages = mergeRuntimeStreamMessages(
        messagesBySessionIdRef.current[stream.sessionId] ?? storedMessages,
        [],
        nextStream,
      );
      const nextSession = {
        ...stream.session,
        preview: content || stream.prompt,
        updatedAt: now,
      };
      const nextSessions = [nextSession, ...sessionsRef.current.filter((session) => session.id !== stream.sessionId)];
      const nextMessagesBySessionId = {
        ...messagesBySessionIdRef.current,
        [stream.sessionId]: nextMessages,
      };
      sessionsRef.current = nextSessions;
      messagesBySessionIdRef.current = nextMessagesBySessionId;
      saveStoredChatConversation(chatStoreScope, nextSessions, nextMessagesBySessionId);
      saveStoredChatInFlightStream(chatStoreScope, nextStream);
    }

    try {
      const result = await ChatService.resumeMessage({
        initialContent: stream.assistantContent,
        initialUsage: stream.usage,
        lastEventNo: stream.lastEventNo,
        messages: normalizeChatHistoryMessages(storedMessages.filter((message) => (
          message.id !== stream.userMessageId
          && message.id !== stream.pendingAssistantMessageId
        ))),
        onDelta: (delta) => {
          if (!delta) {
            return;
          }
          assistantContent += delta;
          persistResumeSnapshot(assistantContent);
          if (selectedSessionIdRef.current !== stream.sessionId) {
            return;
          }
          pendingAssistantDelta += delta;
          scheduleAssistantDeltaFlush();
        },
        onRuntimeEvent: (event) => {
          runtimeUsage = mergeRuntimeUsageSnapshots(runtimeUsage, event.usage);
          if (event.eventNo) {
            lastEventNo = Math.max(lastEventNo, event.eventNo);
          }
          persistResumeSnapshot(assistantContent);
        },
        prompt: stream.prompt,
        cancelledFallbackContent: t('playground.chat.stopped'),
        runtimeInvocationId: stream.runtimeInvocationId,
        selectedModel: stream.selectedModel,
        session: stream.session,
        sessionId: stream.sessionId,
        turnId: stream.turnId,
      });
      flushPendingAssistantDelta();
      const nextMessages = mergeRuntimeStreamMessages(storedMessages, [], stream)
        .map((message) => (
          message.id === stream.pendingAssistantMessageId ? result.assistantMessage : message
        ));
      const nextSessions = [result.session, ...sessionsRef.current.filter((session) => session.id !== result.session.id)];
      const nextMessagesBySessionId = {
        ...messagesBySessionIdRef.current,
        [stream.sessionId]: nextMessages,
      };
      clearStoredChatInFlightStream(chatStoreScope, stream.id);
      sessionsRef.current = nextSessions;
      messagesRef.current = nextMessages;
      messagesBySessionIdRef.current = nextMessagesBySessionId;
      setSessions(nextSessions);
      setMessagesBySessionId(nextMessagesBySessionId);
      if (selectedSessionIdRef.current === stream.sessionId) {
        setMessages(nextMessages);
        scrollChatToBottom();
      }
      saveStoredChatConversation(chatStoreScope, nextSessions, nextMessagesBySessionId);
    } catch (error) {
      flushPendingAssistantDelta();
      const message = error instanceof Error && error.message.startsWith('playground.')
        ? t(error.message)
        : error instanceof Error
          ? error.message
          : t('playground.chat.errors.emptyResponse');
      const failedMessages = mergeRuntimeStreamMessages(
        messagesBySessionIdRef.current[stream.sessionId] ?? storedMessages,
        [],
        {
          ...stream,
          assistantContent: assistantContent || message,
        },
      ).map((item) => (
        item.id === stream.pendingAssistantMessageId
          ? {
            ...item,
            content: assistantContent || message,
            errorMessage: assistantContent ? message : undefined,
            status: 'failed' as const,
          }
          : item
      ));
      const nextSession = {
        ...stream.session,
        preview: message,
        updatedAt: new Date().toISOString(),
      };
      const nextSessions = [nextSession, ...sessionsRef.current.filter((session) => session.id !== stream.sessionId)];
      const nextMessagesBySessionId = {
        ...messagesBySessionIdRef.current,
        [stream.sessionId]: failedMessages,
      };
      clearStoredChatInFlightStream(chatStoreScope, stream.id);
      sessionsRef.current = nextSessions;
      messagesBySessionIdRef.current = nextMessagesBySessionId;
      setSessions(nextSessions);
      setMessagesBySessionId(nextMessagesBySessionId);
      if (selectedSessionIdRef.current === stream.sessionId) {
        messagesRef.current = failedMessages;
        setMessages(failedMessages);
        setMessageError(message);
        scrollChatToBottom();
      }
      saveStoredChatConversation(chatStoreScope, nextSessions, nextMessagesBySessionId);
    } finally {
      if (pendingAssistantDeltaFrame && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(pendingAssistantDeltaFrame);
      }
      pendingAssistantDeltaFrame = 0;
      resumingStreamIdsRef.current.delete(stream.id);
      if (activeChatStreamRef.current?.id === stream.id) {
        activeChatStreamRef.current = null;
      }
      stopRequestedBeforeStreamRef.current = false;
      setSubmitting(false);
    }
  }, [chatStoreScope, clearNewChatDraft, navigate, t]);

  useEffect(() => {
    const streams = loadStoredChatInFlightStreams(chatStoreScope);
    const stream = selectedSessionId
      ? streams.find((item) => item.sessionId === selectedSessionId)
      : streams[0];
    if (!stream || resumingStreamIdsRef.current.has(stream.id) || activeChatStreamRef.current?.id === stream.id) {
      return;
    }
    void resumeStoredChatStream(stream);
  }, [chatStoreScope, resumeStoredChatStream, selectedSessionId]);

  function persistFailedChatConversation({
    errorMessage,
    failedMessages,
    failedSession,
    priorMessagesBySessionId,
    priorSessions,
    prompt,
    selectedModel,
    selectedSessionId,
    updateState,
  }: {
    errorMessage: string;
    failedMessages: ChatMessage[];
    failedSession: ChatSessionSummary | undefined;
    priorMessagesBySessionId: Record<string, ChatMessage[]>;
    priorSessions: ChatSessionSummary[];
    prompt: string;
    selectedModel: PlaygroundModelOption;
    selectedSessionId: string;
    updateState: boolean;
  }): { sessionId: string } | null {
    const sessionId = selectedSessionId || failedSession?.id || '';
    if (!sessionId) {
      return null;
    }

    const now = new Date().toISOString();
    const activeSessions = priorSessions.length > 0 ? priorSessions : sessionsRef.current;
    const existingSession = failedSession
      || activeSessions.find((session) => session.id === sessionId)
      || createLocalFailedSession(sessionId, prompt, selectedModel, failedMessages[0]?.createdAt || now);
    const nextSession = {
      ...existingSession,
      id: sessionId,
      latestCompletionId: existingSession.latestCompletionId || sessionId,
      title: existingSession.title || readLocalSessionTitle(prompt, sessionId),
      modelName: existingSession.modelName || selectedModel.name || selectedModel.model,
      vendorName: existingSession.vendorName || selectedModel.vendorName || selectedModel.vendorCode,
      createdAt: existingSession.createdAt || now,
      updatedAt: now,
      preview: errorMessage,
      messageCount: Math.max(existingSession.messageCount ?? 0, failedMessages.length),
    };
    const nextSessions = [nextSession, ...activeSessions.filter((session) => session.id !== sessionId)];
    const nextMessagesBySessionId = {
      ...priorMessagesBySessionId,
      [sessionId]: failedMessages,
    };

    saveStoredChatConversation(chatStoreScope, nextSessions, nextMessagesBySessionId);
    if (updateState) {
      sessionsRef.current = nextSessions;
      messagesBySessionIdRef.current = nextMessagesBySessionId;
      setSessions(nextSessions);
      setMessagesBySessionId(nextMessagesBySessionId);
    }
    return { sessionId };
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[#111] text-white lg:flex-row">
      <ChatSessionList
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        loading={loadingSessions}
        error={sessionError}
        disabled={submitting}
        onSelectSession={(sessionId) => {
          clearNewChatDraft();
          setSelectedSessionId(sessionId);
          navigate(createChatSessionRoute(sessionId));
        }}
        onNewChat={() => {
          beginNewChatDraft();
          resetActiveConversationView();
          navigate('/playground/chat');
        }}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          ref={messageScrollerRef}
          className="custom-scrollbar min-h-0 flex-1 overflow-y-auto"
        >
          <ChatMessageList
            messages={messages}
            loading={loadingMessages}
            error={messageError || sessionError}
            bottomPaddingPx={composerHeightPx}
            scrollContainerRef={messageScrollerRef}
          />
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-6">
          <div className="pointer-events-auto w-full max-w-5xl">
            <SimpleChatInput
              modelGroups={modelGroups}
              loadingModels={loadingModels}
              modelLoadError={modelLoadError}
              selectedModelId={selectedModelId}
              setSelectedModelId={setSelectedModelId}
              loadingHistory={loadingSessions || loadingMessages}
              onSubmit={handleSubmit}
              onStop={handleStop}
              submitting={submitting}
              onHeightChange={setComposerHeightPx}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function isChatRoute(pathname: string): boolean {
  return pathname === '/playground/chat'
    || pathname.startsWith('/playground/chat/')
    || pathname.startsWith('/c/');
}

function readChatRouteSessionId(pathname: string): string {
  const chatRootConversationPrefix = '/c/';
  if (pathname.startsWith(chatRootConversationPrefix)) {
    return decodeChatRouteSessionId(pathname.slice(chatRootConversationPrefix.length));
  }

  const playgroundConversationPrefix = '/playground/chat/c/';
  if (pathname.startsWith(playgroundConversationPrefix)) {
    return decodeChatRouteSessionId(pathname.slice(playgroundConversationPrefix.length));
  }

  return '';
}

function decodeChatRouteSessionId(value: string): string {
  const rawSessionId = value.split('/')[0] || '';
  if (!rawSessionId) {
    return '';
  }
  try {
    return decodeURIComponent(rawSessionId);
  } catch {
    return rawSessionId;
  }
}

function createChatSessionRoute(sessionId: string): string {
  return `/c/${encodeURIComponent(sessionId)}`;
}

function normalizeChatHistoryMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((message) => (
    (message.role === 'user' || message.role === 'assistant')
    && (message.status === 'sent' || message.status === 'complete')
    && message.content.trim().length > 0
  ));
}

function mergeRuntimeStreamMessages(
  primaryMessages: ChatMessage[],
  fallbackMessages: ChatMessage[],
  stream: StoredChatInFlightStream,
): ChatMessage[] {
  const messages = primaryMessages.length > 0 ? primaryMessages : fallbackMessages;
  const userMessage: ChatMessage = {
    id: stream.userMessageId,
    role: 'user',
    content: stream.prompt,
    createdAt: stream.startedAt,
    status: 'sent',
  };
  const assistantMessage: ChatMessage = {
    id: stream.pendingAssistantMessageId,
    role: 'assistant',
    content: stream.assistantContent,
    createdAt: stream.startedAt,
    status: 'responding',
    modelName: stream.selectedModel.name || stream.selectedModel.model,
    vendorName: stream.selectedModel.vendorName || stream.selectedModel.vendorCode,
  };
  const withoutStreamMessages = messages.filter((message) => (
    message.id !== stream.userMessageId
    && message.id !== stream.pendingAssistantMessageId
  ));
  return [...withoutStreamMessages, userMessage, assistantMessage];
}

function createLocalFailedSession(
  sessionId: string,
  prompt: string,
  selectedModel: PlaygroundModelOption,
  createdAt: string,
): ChatSessionSummary {
  return {
    id: sessionId,
    latestCompletionId: sessionId,
    title: readLocalSessionTitle(prompt, sessionId),
    modelName: selectedModel.name || selectedModel.model,
    vendorName: selectedModel.vendorName || selectedModel.vendorCode,
    createdAt,
    updatedAt: createdAt,
    messageCount: 0,
  };
}

function readLocalSessionTitle(prompt: string, fallback: string): string {
  const content = prompt.trim();
  if (!content) {
    return fallback || 'New chat';
  }
  return content.length > 60 ? `${content.slice(0, 57).trimEnd()}...` : content;
}
