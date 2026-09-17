import { useCallback, useEffect, useState } from 'react';

import type { ConsoleApiKeySummary } from '@sdkwork/cloudrouter-contracts';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import { loadConsoleApiKeys } from '@sdkwork/cloudrouter-service';

import { ConsoleApiKeysView, type ConsoleApiKeysLabels } from './ConsoleApiKeysView.js';

export interface ConsoleApiKeysScreenProps {
  readonly ports: CloudRouterConsolePorts;
  readonly locale: string;
  readonly labels: ConsoleApiKeysLabels & {
    readonly loading: string;
    readonly empty: string;
    readonly reload: string;
    readonly createdOnce: string;
  };
}

export function ConsoleApiKeysScreen({ ports, locale, labels }: ConsoleApiKeysScreenProps) {
  const [keys, setKeys] = useState<readonly ConsoleApiKeySummary[]>([]);
  const [draftName, setDraftName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadConsoleApiKeys(ports)
      .then((rows) => {
        if (active) setKeys(rows);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : labels.empty);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [ports, labels.empty]);

  useEffect(() => reload(), [reload]);

  const handleCreate = useCallback(() => {
    setBusy(true);
    setError(null);
    ports.apiKeys
      .createApiKey({ name: draftName.trim() })
      .then((payload) => {
        const secret = typeof payload.key === 'string' ? payload.key : null;
        setCreatedSecret(secret);
        setDraftName('');
        reload();
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : labels.empty);
      })
      .finally(() => setBusy(false));
  }, [draftName, ports, reload, labels.empty]);

  const handleRevoke = useCallback(
    (apiKeyId: string) => {
      setError(null);
      ports.apiKeys
        .revokeApiKey(apiKeyId)
        .then(() => reload())
        .catch((cause: unknown) => {
          setError(cause instanceof Error ? cause.message : labels.empty);
        });
    },
    [ports, reload, labels.empty],
  );

  return (
    <div className="space-y-3">
      {createdSecret && (
        <p className="break-all rounded-md border border-amber-400/40 bg-amber-400/10 p-2 text-[11px] text-amber-100">
          {labels.createdOnce} <span className="font-mono">{createdSecret}</span>
        </p>
      )}
      {error && <p className="text-[11px] text-red-300">{error}</p>}
      {loading ? (
        <p className="py-6 text-center text-xs text-gray-400">{labels.loading}</p>
      ) : keys.length === 0 ? (
        <p className="py-6 text-center text-xs text-gray-400">{labels.empty}</p>
      ) : (
        <ConsoleApiKeysView
          keys={keys}
          locale={locale}
          labels={labels}
          draftName={draftName}
          busy={busy}
          onDraftNameChange={setDraftName}
          onCreate={handleCreate}
          onRevoke={handleRevoke}
        />
      )}
    </div>
  );
}
