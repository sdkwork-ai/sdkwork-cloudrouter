import type { ConsoleApiKeySummary } from '@sdkwork/cloudrouter-contracts';
import { PageHeader, Panel } from '@sdkwork/cloudrouter-h5-commons';
import { formatIsoTimestamp } from '@sdkwork/cloudrouter-service';

export interface ConsoleApiKeysLabels {
  readonly title: string;
  readonly summary: string;
  readonly create: string;
  readonly creating: string;
  readonly revoke: string;
  readonly namePlaceholder: string;
  readonly columnStatus: string;
  readonly columnTime: string;
  readonly statusActive: string;
  readonly statusDisabled: string;
  readonly statusRevoked: string;
}

export interface ConsoleApiKeysViewProps {
  readonly keys: readonly ConsoleApiKeySummary[];
  readonly locale: string;
  readonly labels: ConsoleApiKeysLabels;
  readonly draftName: string;
  readonly busy: boolean;
  readonly onDraftNameChange: (value: string) => void;
  readonly onCreate: () => void;
  readonly onRevoke: (apiKeyId: string) => void;
}

function statusText(status: ConsoleApiKeySummary['status'], labels: ConsoleApiKeysLabels): string {
  if (status === 'active') return labels.statusActive;
  if (status === 'disabled') return labels.statusDisabled;
  if (status === 'revoked') return labels.statusRevoked;
  return status;
}

function statusClassName(status: ConsoleApiKeySummary['status']): string {
  if (status === 'active') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  if (status === 'disabled') return 'bg-surface-elevated text-ink-subtle';
  return 'bg-danger-soft text-danger';
}

export function ConsoleApiKeysView({
  keys,
  locale,
  labels,
  draftName,
  busy,
  onDraftNameChange,
  onCreate,
  onRevoke,
}: ConsoleApiKeysViewProps) {
  return (
    <div className="flex flex-col">
      <PageHeader title={labels.title} summary={labels.summary} />
      <Panel>
        <div className="flex gap-2">
          <input
            value={draftName}
            onChange={(event) => onDraftNameChange(event.target.value)}
            placeholder={labels.namePlaceholder}
            className="min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3.5 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-subtle focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            disabled={busy || !draftName.trim()}
            onClick={onCreate}
            className="shrink-0 rounded-xl bg-brand-fill px-4 py-2.5 text-xs font-semibold text-on-brand transition-opacity disabled:opacity-50"
          >
            {busy ? labels.creating : labels.create}
          </button>
        </div>
      </Panel>
      <Panel>
        <ul className="divide-y divide-line">
          {keys.map((key) => (
            <li key={key.id} className="flex items-start justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[13px] font-medium text-ink">{key.name}</p>
                  <span
                    className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusClassName(key.status)}`}
                  >
                    {statusText(key.status, labels)}
                  </span>
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-ink-subtle">{key.maskedKey}</p>
                <p className="mt-0.5 text-[10px] text-ink-subtle">
                  {labels.columnTime}: {formatIsoTimestamp(key.createdAt, locale) ?? '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRevoke(key.id)}
                className="shrink-0 rounded-lg border border-danger/40 px-2.5 py-1.5 text-[10px] font-medium text-danger transition-colors active:bg-danger-soft"
              >
                {labels.revoke}
              </button>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
