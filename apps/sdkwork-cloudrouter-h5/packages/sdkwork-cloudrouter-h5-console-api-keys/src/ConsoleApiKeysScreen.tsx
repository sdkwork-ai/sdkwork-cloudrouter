import { useCallback, useEffect, useState } from 'react';

import type { ConsoleApiKeySummary } from '@sdkwork/cloudrouter-contracts';
import type { CloudRouterConsolePorts } from '@sdkwork/cloudrouter-sdk-ports';
import { loadConsoleApiKeyPage } from '@sdkwork/cloudrouter-service';

import { ConsoleApiKeysView, type ConsoleApiKeysLabels } from './ConsoleApiKeysView.js';

/** Bounded server page size; additional pages are appended via "load more". */
const API_KEYS_PAGE_SIZE = 20;

export interface ConsoleApiKeysScreenProps {
  readonly ports: CloudRouterConsolePorts;
  readonly locale: string;
  readonly labels: ConsoleApiKeysLabels & {
    readonly loading: string;
    readonly empty: string;
    readonly reload: string;
    readonly createdOnce: string;
    readonly loadMore: string;
  };
}

export function ConsoleApiKeysScreen({ ports, locale, labels }: ConsoleApiKeysScreenProps) {
  const [keys, setKeys] = useState<readonly ConsoleApiKeySummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadConsoleApiKeyPage(ports, { pageSize: API_KEYS_PAGE_SIZE })
      .then((result) => {
        if (!active) return;
        setKeys(result.items);
        setPage(result.page);
        setHasMore(result.hasMore);
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

  const loadMore = useCallback(() => {
    if (loadingMore) return;
    setLoadingMore(true);
    setError(null);
    loadConsoleApiKeyPage(ports, { page: page + 1, pageSize: API_KEYS_PAGE_SIZE })
      .then((result) => {
        setKeys((previous) => [...previous, ...result.items]);
        setPage(result.page);
        setHasMore(result.hasMore);
      })
      .catch((cause: unknown) => {
        setError(cause instanceof Error ? cause.message : labels.empty);
      })
      .finally(() => setLoadingMore(false));
  }, [ports, page, loadingMore, labels.empty]);

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
        <>
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
          {hasMore && (
            <button
              type="button"
              disabled={loadingMore}
              onClick={loadMore}
              className="w-full rounded-md border border-white/15 px-3 py-2 text-xs text-gray-300 disabled:opacity-50"
            >
              {loadingMore ? labels.loading : labels.loadMore}
            </button>
          )}
        </>
      )}
    </div>
  );
}
