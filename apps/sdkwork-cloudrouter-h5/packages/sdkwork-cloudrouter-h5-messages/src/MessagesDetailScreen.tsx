import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Loader2, MessageSquare, Send } from "lucide-react";
import type { ConversationMessageEntry } from "@sdkwork/im-sdk";

import { getCloudRouterImClient } from "./configure";

export interface MessagesDetailScreenProps {
  readonly currentUserId?: string | null;
}

interface RouteState {
  readonly name?: string;
  readonly avatarUrl?: string;
}

/**
 * SDKWork IM chat detail (`/chat/:conversationId`).
 *
 * Reads `conversations.listMessages` and posts text through
 * `conversations.postText` on the same generated IM client; the host shell is
 * outside the tab bar so the chat keeps a native stacked-screen back button.
 */
export function MessagesDetailScreen({ currentUserId }: MessagesDetailScreenProps) {
  const { conversationId = "" } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state ?? {}) as RouteState;

  const [messages, setMessages] = useState<ConversationMessageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) {
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const page = await getCloudRouterImClient().conversations.listMessages(conversationId, {
        pageSize: 50,
      });
      const sorted = [...page.items].sort((left, right) =>
        left.occurredAt.localeCompare(right.occurredAt)
        || left.messageSeq.localeCompare(right.messageSeq),
      );
      setMessages(sorted);
      const latest = sorted[sorted.length - 1];
      if (latest) {
        // Best-effort read cursor; a failure must not block the transcript.
        void getCloudRouterImClient()
          .conversations.updateReadCursor(conversationId, { readSeq: latest.messageSeq })
          .catch(() => {});
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const title = state.name?.trim() || "会话";

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending || !conversationId) {
      return;
    }
    setSending(true);
    try {
      await getCloudRouterImClient().conversations.postText(conversationId, text, {
        clientMsgId: createClientMessageId(),
      });
      setInput("");
      await load();
    } catch {
      setError(true);
    } finally {
      setSending(false);
    }
  }, [conversationId, input, load, sending]);

  const visibleMessages = useMemo(() => messages, [messages]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <header className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2.5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="返回消息列表"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted active:bg-surface-elevated"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </button>
        <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-lg bg-brand-soft text-[13px] font-semibold text-brand">
          {state.avatarUrl ? (
            <img src={state.avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            title.trim().slice(0, 1).toUpperCase() || "会"
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">{title}</span>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-behavior-contain px-[0.9rem] py-3">
        {loading && visibleMessages.length === 0 ? (
          <div className="flex h-32 items-center justify-center gap-2 text-[12px] text-ink-subtle">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            正在加载消息
          </div>
        ) : null}

        {!loading && error && visibleMessages.length === 0 ? (
          <button
            type="button"
            onClick={() => void load()}
            className="flex h-32 w-full flex-col items-center justify-center gap-2 text-[12px] text-brand"
          >
            <MessageSquare className="h-6 w-6" aria-hidden />
            消息加载失败，点击重试
          </button>
        ) : null}

        {!loading && !error && visibleMessages.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-[12px] text-ink-subtle">
            <MessageSquare className="h-6 w-6" aria-hidden />
            暂无消息，发条消息开始聊天
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          {visibleMessages.map((message) => {
            const mine = currentUserId !== undefined && currentUserId !== null
              && message.sender.id === currentUserId;
            const text = message.body.text?.trim() || message.summary?.trim() || "";
            return (
              <div key={message.messageId} className={mine ? "flex justify-end" : "flex justify-start"}>
                <div className={mine ? "max-w-[80%] text-right" : "max-w-[80%] text-left"}>
                  {!mine ? (
                    <p className="mb-0.5 text-[10px] text-ink-subtle">
                      {message.sender.displayName || "用户"}
                    </p>
                  ) : null}
                  <div
                    className={
                      mine
                        ? "rounded-2xl rounded-br-md bg-brand-fill px-3 py-2 text-[13px] leading-5 text-on-brand"
                        : "rounded-2xl rounded-bl-md border border-line bg-surface px-3 py-2 text-[13px] leading-5 text-ink"
                    }
                  >
                    {text || "[消息]"}
                  </div>
                  <p className="mt-0.5 text-[9px] text-ink-subtle">{formatTime(message.occurredAt)}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex items-end gap-2 border-t border-line bg-surface px-[0.9rem] py-2.5">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send();
            }
          }}
          rows={1}
          placeholder="输入消息"
          aria-label="输入消息"
          className="max-h-24 min-h-9 flex-1 resize-none rounded-xl border border-line bg-canvas px-3 py-2 text-[13px] text-ink outline-none placeholder:text-ink-subtle focus:border-brand"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!input.trim() || sending}
          aria-label="发送消息"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-fill text-on-brand transition-opacity disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

function createClientMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatTime(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return "";
  }
  return new Date(timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
