import { Plus } from 'lucide-react';
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
    <aside className="sdkwork-playground-chat-sidebar">
      <div className="sdkwork-playground-chat-sidebar__header">
        <button
          type="button"
          disabled={disabled}
          onClick={onNewChat}
          className="sdkwork-playground-chat-sidebar__new-chat"
        >
          <Plus className="h-4 w-4" />
          {t('playground.chat.newChat')}
        </button>
      </div>

      <div className="sdkwork-playground-chat-sidebar__section-label">
        {t('playground.chat.history')}
      </div>

      <div className="sdkwork-playground-chat-sidebar__list custom-scrollbar">
        {loading && (
          <div className="py-1">
            <div className="sdkwork-playground-chat-sidebar__skeleton" />
            <div className="sdkwork-playground-chat-sidebar__skeleton" />
            <div className="sdkwork-playground-chat-sidebar__skeleton" />
          </div>
        )}

        {!loading && error && (
          <div className="sdkwork-playground-chat-sidebar__error">{error}</div>
        )}

        {!loading && !error && sessions.length === 0 && (
          <div className="sdkwork-playground-chat-sidebar__empty">
            {t('playground.chat.historyEmpty')}
          </div>
        )}

        {!loading && !error && sessions.map((session) => {
          const active = session.id === selectedSessionId;
          return (
            <button
              key={session.id}
              type="button"
              disabled={disabled}
              data-active={active ? 'true' : 'false'}
              aria-current={active ? 'true' : undefined}
              onClick={() => onSelectSession(session.id)}
              className="sdkwork-chat-session-item disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="sdkwork-chat-session-item__title">{session.title}</span>
              {session.messageCount ? (
                <span className="sdkwork-chat-session-item__badge">
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
