import { MessageSquareText, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ChatSessionSummary } from './chatTypes';

export function ChatSessionList({
  sessions,
  selectedSessionId,
  loading = false,
  error = null,
  disabled = false,
  onSelectSession,
  onNewChat,
}: {
  sessions: ChatSessionSummary[];
  selectedSessionId: string;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
}) {
  const { t } = useTranslation();

  return (
    <aside className="flex max-h-[280px] w-full shrink-0 flex-col border-b border-white/5 bg-[#101013] px-3 py-4 lg:max-h-none lg:w-[248px] lg:border-b-0 lg:border-r">
      <button
        type="button"
        disabled={disabled}
        onClick={onNewChat}
        className="mb-4 flex h-9 items-center justify-center gap-2 rounded-lg bg-white text-xs font-semibold text-slate-950 transition-colors hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Plus className="h-3.5 w-3.5" />
        {t('playground.chat.newChat')}
      </button>

      <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {t('playground.chat.history')}
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-2 px-1 py-2">
            <div className="h-8 rounded-lg bg-white/5" />
            <div className="h-8 rounded-lg bg-white/5" />
            <div className="h-8 rounded-lg bg-white/5" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-lg border border-red-400/10 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-200">
            {error}
          </div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="rounded-lg bg-white/5 px-3 py-2 text-xs leading-5 text-slate-500">
            {t('playground.chat.historyEmpty')}
          </div>
        )}

        {!loading && !error && sessions.map((session) => {
          const active = session.id === selectedSessionId;
          return (
            <button
              key={session.id}
              type="button"
              disabled={disabled || active}
              onClick={() => onSelectSession(session.id)}
              className={`mb-1 flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition-colors disabled:cursor-not-allowed ${
                active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <MessageSquareText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate text-xs font-medium">{session.title}</span>
              {session.messageCount ? (
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-slate-500">
                  {session.messageCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
