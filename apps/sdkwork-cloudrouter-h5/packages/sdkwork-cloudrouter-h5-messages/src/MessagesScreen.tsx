import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BellOff,
  Loader2,
  MessageSquare,
  Pin,
  RefreshCw,
  Search,
} from "lucide-react";
import type { ConversationInboxEntry } from "@sdkwork/im-sdk";

import { getCloudRouterImClient } from "./configure";

interface ConversationRow {
  readonly id: string;
  readonly name: string;
  readonly avatarUrl?: string;
  readonly summary: string;
  readonly time: number;
  readonly unread: number;
  readonly pinned: boolean;
  readonly muted: boolean;
}

/**
 * SDKWork IM conversation list ("消息" tab).
 *
 * Reads the generated IM SDK inbox (`conversations.list`) with the host
 * session, and keeps the Cloud Router mobile list styling instead of embedding
 * the IM host's full tabbed shell. Selecting a row opens `/chat/:id`.
 */
export function MessagesScreen() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<ConversationInboxEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const page = await getCloudRouterImClient().conversations.list({ pageSize: 30 });
      setEntries(page.items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = useMemo<ConversationRow[]>(() => {
    return entries
      .map((entry) => {
        const name =
          entry.displayName
          || entry.peer?.displayName
          || entry.peer?.chatId
          || entry.conversationId;
        const avatarUrl = entry.avatarUrl ?? entry.peer?.avatarUrl ?? undefined;
        const time = Date.parse(entry.lastMessageAt ?? entry.lastActivityAt);
        return {
          id: entry.conversationId,
          name,
          ...(avatarUrl ? { avatarUrl } : {}),
          summary: entry.lastSummary?.trim() || "暂无消息",
          time: Number.isFinite(time) ? time : 0,
          unread: entry.unreadCount ?? 0,
          pinned: entry.preferences?.isPinned ?? false,
          muted: entry.preferences?.isMuted ?? false,
        };
      })
      .sort((left, right) => Number(right.pinned) - Number(left.pinned) || right.time - left.time);
  }, [entries]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return rows;
    }
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle)
        || row.summary.toLowerCase().includes(needle),
    );
  }, [query, rows]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-[0.9rem] py-2.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-subtle" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索会话"
            aria-label="搜索会话"
            className="w-full rounded-full border border-line bg-canvas py-1.5 pl-8 pr-3 text-[12px] text-ink outline-none placeholder:text-ink-subtle focus:border-brand"
          />
        </div>
        <button
          type="button"
          onClick={() => void load()}
          aria-label="刷新会话"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-muted active:bg-surface-elevated"
        >
          <RefreshCw className={loading ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} aria-hidden />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-behavior-contain">
        {loading && entries.length === 0 ? (
          <div className="flex h-32 items-center justify-center gap-2 text-[12px] text-ink-subtle">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            正在加载会话
          </div>
        ) : null}

        {!loading && error && entries.length === 0 ? (
          <button
            type="button"
            onClick={() => void load()}
            className="flex h-32 w-full flex-col items-center justify-center gap-2 text-[12px] text-brand"
          >
            <MessageSquare className="h-6 w-6" aria-hidden />
            会话列表加载失败，点击重试
          </button>
        ) : null}

        {!loading && !error && filtered.length === 0 ? (
          <div className="flex h-32 flex-col items-center justify-center gap-2 text-[12px] text-ink-subtle">
            <MessageSquare className="h-6 w-6" aria-hidden />
            {query.trim() ? "没有匹配的会话" : "暂无会话"}
          </div>
        ) : null}

        {filtered.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() =>
              navigate(`/chat/${row.id}`, {
                state: { name: row.name, ...(row.avatarUrl ? { avatarUrl: row.avatarUrl } : {}) },
              })
            }
            className="flex w-full items-center gap-3 border-b border-line/70 bg-surface px-[0.9rem] py-3 text-left transition-colors active:bg-surface-elevated"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-soft text-[15px] font-semibold text-brand">
              {row.avatarUrl ? (
                <img src={row.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                row.name.trim().slice(0, 1).toUpperCase() || "消"
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="truncate text-[14px] font-medium text-ink">{row.name}</span>
                {row.pinned ? <Pin className="h-3 w-3 shrink-0 text-ink-subtle" aria-hidden /> : null}
                {row.muted ? <BellOff className="h-3 w-3 shrink-0 text-ink-subtle" aria-hidden /> : null}
                <span className="ml-auto shrink-0 text-[10px] text-ink-subtle">
                  {formatTime(row.time)}
                </span>
              </span>
              <span className="mt-1 flex items-center gap-2">
                <span className="truncate text-[12px] text-ink-muted">{row.summary}</span>
                {row.unread > 0 ? (
                  <span className="ml-auto flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
                    {row.unread > 99 ? "99+" : row.unread}
                  </span>
                ) : null}
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  }
  if (now.getTime() - date.getTime() < 86_400_000) {
    return "昨天";
  }
  return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
}
