import type { ConsoleApiKeySummary } from '@sdkwork/cloudrouter-contracts';
import { Panel } from '@sdkwork/cloudrouter-h5-commons';
import { formatIsoTimestamp } from '@sdkwork/cloudrouter-service';

export interface ConsoleApiKeysLabels {
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
    <div className="space-y-3">
      <Panel>
        <div className="flex gap-2">
          <input
            value={draftName}
            onChange={(event) => onDraftNameChange(event.target.value)}
            placeholder={labels.namePlaceholder}
            className="min-w-0 flex-1 rounded-md border border-white/15 bg-black/40 px-3 py-2 text-xs outline-none focus:border-white/40"
          />
          <button
            type="button"
            disabled={busy || !draftName.trim()}
            onClick={onCreate}
            className="rounded-md bg-white px-3 py-2 text-xs font-medium text-black disabled:opacity-50"
          >
            {busy ? labels.creating : labels.create}
          </button>
        </div>
      </Panel>
      <Panel>
        <ul className="divide-y divide-white/10">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-3 py-2 text-[11px]">
              <div className="min-w-0">
                <p className="truncate text-gray-100">{key.name}</p>
                <p className="font-mono text-[10px] text-gray-400">{key.maskedKey}</p>
                <p className="text-gray-500">
                  {labels.columnStatus}: {statusText(key.status, labels)} · {labels.columnTime}:{' '}
                  {formatIsoTimestamp(key.createdAt, locale) ?? '-'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRevoke(key.id)}
                className="shrink-0 rounded-md border border-red-400/50 px-2 py-1 text-[10px] text-red-200"
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
