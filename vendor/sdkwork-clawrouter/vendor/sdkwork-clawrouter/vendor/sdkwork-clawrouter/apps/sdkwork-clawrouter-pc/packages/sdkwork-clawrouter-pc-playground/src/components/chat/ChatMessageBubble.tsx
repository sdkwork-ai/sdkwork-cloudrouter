import { useState } from 'react';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { copyTextToClipboard } from '@sdkwork/clawroutes-pc-commons/clipboard';
import { ChatMarkdownMessage } from './ChatMarkdownMessage';
import type { ChatMessage } from './chatTypes';

const COPY_RESET_MS = 1400;

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';
  const timestamp = formatChatTime(message.createdAt);
  const isPending = message.status === 'responding';
  const isFailed = message.status === 'failed';
  const hasSeparateError = Boolean(
    isFailed
      && message.errorMessage?.trim()
      && message.errorMessage.trim() !== message.content.trim(),
  );
  const displayContent = hasSeparateError ? message.content : (message.content || message.errorMessage || '');
  const showTypingIndicator = isPending && displayContent.trim().length === 0;
  const copyText = readChatMessageCopyText(message);
  const responseFrameClassName = isUser
    ? 'flex max-w-[min(760px,88%)] min-w-0 flex-col gap-1 items-end'
    : 'flex w-full min-w-0 flex-col gap-1 items-stretch';
  const responseSurfaceClassName = isUser
    ? 'select-text min-w-0 max-w-full rounded-[22px] rounded-br-lg border border-white/10 bg-slate-800/80 px-4 py-3 text-[15px] leading-7 text-slate-50 shadow-[0_12px_28px_rgba(2,6,23,0.20)] backdrop-blur'
    : isFailed
      ? 'select-text w-full min-w-0 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100 shadow-sm'
      : 'select-text w-full min-w-0 px-0 py-0 text-sm leading-6 text-slate-100';

  async function handleCopy(): Promise<void> {
    if (!copyText) {
      return;
    }
    const result = await copyTextToClipboard(copyText);
    if (!result.ok) {
      setCopied(false);
      return;
    }
    setCopied(true);
    globalThis.setTimeout(() => {
      setCopied(false);
    }, COPY_RESET_MS);
  }

  return (
    <div className={isUser ? 'flex w-full justify-end' : 'flex w-full justify-start'}>
      <div className={responseFrameClassName}>
        <div className={responseSurfaceClassName}>
          {showTypingIndicator ? (
            <span className="inline-flex items-center gap-2 text-slate-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:120ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current [animation-delay:240ms]" />
            </span>
          ) : displayContent.trim() ? (
            <ChatMarkdownMessage
              content={displayContent}
              tone={isUser ? 'user' : isFailed ? 'danger' : 'assistant'}
              streaming={isPending}
            />
          ) : (
            <span className="text-slate-400">{'\u00a0'}</span>
          )}
          {hasSeparateError && message.errorMessage && (
            <div className="mt-3 border-t border-red-300/20 pt-3">
              <div className="flex min-w-0 gap-2 rounded-lg bg-red-950/30 px-3 py-2 text-red-100">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-300" />
                <div className="min-w-0 flex-1 text-[13px] leading-5">
                  <ChatMarkdownMessage content={message.errorMessage} tone="danger" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={`flex max-w-full items-center gap-2 px-1 text-[11px] text-slate-500 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex min-w-0 items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && isFailed && <AlertTriangle className="h-3 w-3 shrink-0 text-red-400" />}
            {!isUser && message.vendorName && (
              <span title={message.vendorName} className="max-w-[160px] truncate whitespace-nowrap">
                {message.vendorName}
              </span>
            )}
            {!isUser && message.modelName && (
              <span title={message.modelName} className="max-w-[220px] truncate whitespace-nowrap">
                {message.modelName}
              </span>
            )}
            <span className="shrink-0 whitespace-nowrap">{timestamp}</span>
          </div>
          {copyText && (
            <button
              type="button"
              title={copied ? t('playground.chat.message.copied', 'Copied message') : t('playground.chat.message.copy', 'Copy message')}
              aria-label={copied ? t('playground.chat.message.copied', 'Copied message') : t('playground.chat.message.copy', 'Copy message')}
              onClick={() => {
                void handleCopy();
              }}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-200"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function readChatMessageCopyText(message: ChatMessage): string {
  const content = message.content.trim();
  const errorMessage = message.errorMessage?.trim() || '';
  if (!errorMessage || errorMessage === content) {
    return content || errorMessage;
  }
  if (!content) {
    return errorMessage;
  }
  return `${content}\n\n${errorMessage}`;
}

function formatChatTime(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return '';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
