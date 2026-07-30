import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons';
import { MessagesService, type MessageItem } from './messagesService';

function markMessageReadFeedback(messages: MessageItem[], messageId: string): MessageItem[] {
  return messages.map((message) => (
    message.id === messageId ? { ...message, read: true } : message
  ));
}

function getLoadErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function MessagesView() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const selectedMessage = useMemo(
    () => messages.find((message) => message.id === selectedMessageId) ?? null,
    [messages, selectedMessageId],
  );

  const loadMessages = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setLoadError(null);
    try {
      const items = await MessagesService.fetchMessages();
      if (isActive()) {
        setMessages(items);
        setSelectedMessageId((current) => current ?? items[0]?.id ?? null);
      }
    } catch (error) {
      if (isActive()) {
        setLoadError(getLoadErrorMessage(error, t('console.messages.states.loadErrorFallback', 'Messages could not be loaded.')));
      }
    } finally {
      if (isActive()) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    void loadMessages(() => active);
    return () => {
      active = false;
    };
  }, [loadMessages]);

  const handleSelectMessage = useCallback((message: MessageItem) => {
    setSelectedMessageId(message.id);
    if (!message.read) {
      setMessages((current) => markMessageReadFeedback(current, message.id));
      void MessagesService.acknowledge(message.id);
    }
  }, []);

  if (loading) {
    return (
      <div className="mx-auto flex h-full w-full flex-col overflow-hidden bg-slate-50 dark:bg-[#121212]">
        <BusinessStatePanel kind="loading" title={t('console.messages.states.loading', 'Loading messages...')} />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto flex h-full w-full flex-col overflow-hidden bg-slate-50 dark:bg-[#121212]">
        <BusinessStatePanel kind="error" title={loadError} onRetry={() => void loadMessages()} retryLabel={t('commons.actions.retry', 'Retry')} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full flex-col overflow-hidden bg-slate-50 animate-in fade-in duration-500 dark:bg-[#121212]">
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:flex-row gap-[5px]">
        <aside className="md:w-80 shrink-0 overflow-y-auto custom-scrollbar rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1e1e1e]">
          {messages.length === 0 ? (
            <BusinessStatePanel kind="empty" title={t('console.messages.states.emptyTitle', 'No messages yet.')} />
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-white/10">
              {messages.map((message) => (
                <li key={message.id}>
                  <button
                    type="button"
                    className={`w-full px-4 py-3 text-left transition-colors ${selectedMessageId === message.id ? 'bg-lobster-50 dark:bg-lobster-500/10' : 'hover:bg-slate-50 dark:hover:bg-white/5'}`}
                    onSelect={() => handleSelectMessage(message)}
                    onClick={() => handleSelectMessage(message)}
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">{message.title}</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{message.desc}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>
        <section className="flex-1 min-h-0 overflow-hidden bg-white dark:bg-[#1e1e1e] flex flex-col rounded-xl border border-slate-200 dark:border-white/10">
          {selectedMessage ? (
            <div className={`flex-1 min-h-0 flex flex-col overflow-hidden`}>
              <div className="border-b border-slate-200 px-5 py-3 dark:border-white/10">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{selectedMessage.title}</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{selectedMessage.time}</p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
                {selectedMessage.content}
              </div>
            </div>
          ) : (
            <BusinessStatePanel kind="empty" title={t('console.messages.states.selectMessage', 'Select a message to read details.')} />
          )}
        </section>
      </div>
    </div>
  );
}
