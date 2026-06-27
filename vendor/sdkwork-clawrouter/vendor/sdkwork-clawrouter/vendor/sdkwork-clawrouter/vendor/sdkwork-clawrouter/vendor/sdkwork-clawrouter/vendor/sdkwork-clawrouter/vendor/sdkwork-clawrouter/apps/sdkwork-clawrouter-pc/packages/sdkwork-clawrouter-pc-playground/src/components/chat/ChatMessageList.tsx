import { useLayoutEffect, useRef, type RefObject } from 'react';
import { Loader2, MessageSquareText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ChatMarkdownMessage } from './ChatMarkdownMessage';
import { ChatMessageBubble } from './ChatMessageBubble';
import type { ChatMessage } from './chatTypes';

export function ChatMessageList({
  messages,
  loading = false,
  error = null,
  bottomPaddingPx = 224,
  scrollContainerRef,
}: {
  messages: ChatMessage[];
  loading?: boolean;
  error?: string | null;
  bottomPaddingPx?: number;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}) {
  const { t } = useTranslation();
  const bottomRef = useRef<HTMLDivElement>(null);
  const bottomPaddingStyle = { paddingBottom: `${Math.max(bottomPaddingPx, 224)}px` };
  const shouldShowErrorBanner = Boolean(error && !hasFailedAssistantError(messages, error));

  useLayoutEffect(() => {
    const scroller = scrollContainerRef?.current;
    if (scroller) {
      scroller.scrollTop = scroller.scrollHeight;
      return;
    }
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [loading, messages, error, scrollContainerRef]);

  if (loading && messages.length === 0) {
    return (
      <div style={bottomPaddingStyle} className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center px-4 pt-20 text-center">
        <Loader2 className="mb-4 h-6 w-6 animate-spin text-slate-500" />
        <p className="text-sm text-slate-500">{t('playground.chat.messagesLoading')}</p>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div style={bottomPaddingStyle} className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center px-4 pt-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-cyan-300">
          <MessageSquareText className="h-7 w-7" />
        </div>
        <h2 className="text-xl font-semibold text-white">{t('playground.chat.emptyTitle')}</h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">{t('playground.chat.emptyDescription')}</p>
        {error && (
          <div className="mt-3 max-w-md text-xs leading-5 text-red-300">
            <ChatMarkdownMessage content={error} tone="danger" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={bottomPaddingStyle} className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-6 md:px-8">
      {loading && messages.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-400">
          {t('playground.chat.messagesLoading')}
        </div>
      )}
      {shouldShowErrorBanner && (
        <div className="min-w-0 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
          <ChatMarkdownMessage content={error || ''} tone="danger" />
        </div>
      )}
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function hasFailedAssistantError(messages: ChatMessage[], error: string | null): boolean {
  const normalizedError = error?.trim();
  if (!normalizedError) {
    return false;
  }
  return messages.some((message) => {
    const isFailedAssistant = message.role === 'assistant' && message.status === 'failed';
    if (!isFailedAssistant) {
      return false;
    }
    const failedText = message.errorMessage || message.content;
    return failedText.includes(normalizedError);
  });
}
