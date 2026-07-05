import { useState } from 'react';
import { AlertTriangle, Check, Copy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { copyTextToClipboard } from '@sdkwork/clawroutes-pc-commons/clipboard';
import { ChatMarkdownMessage } from '../chat/generationsMarkdown.ts';
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
    ? 'sdkwork-playground-chat-message-bubble--user'
    : isFailed
      ? 'sdkwork-playground-chat-message-bubble--failed'
      : 'sdkwork-playground-chat-message-bubble--assistant';

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
            <span className="sdkwork-playground-chat-message-typing">
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
            <span className="sdkwork-playground-chat-message-typing">{'\u00a0'}</span>
          )}
          {hasSeparateError && message.errorMessage && (
            <div className="sdkwork-playground-chat-error-divider">
              <div className="sdkwork-playground-chat-error-panel">
                <AlertTriangle className="sdkwork-playground-chat-error-panel__icon" />
                <div className="min-w-0 flex-1 text-[13px] leading-5">
                  <ChatMarkdownMessage content={message.errorMessage} tone="danger" />
                </div>
              </div>
            </div>
          )}
        </div>
        <div className={`sdkwork-playground-chat-message-meta ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex min-w-0 items-center gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && isFailed && <AlertTriangle className="sdkwork-playground-chat-message-meta__failed-icon" />}
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
              className="sdkwork-playground-chat-message-copy-btn"
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
