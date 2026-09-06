import { useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/api';
import type { RuntimeEnv } from '../lib/runtime-env';
import { EmptyView, ErrorView, LoadingView, ScreenHeader } from '../components/ui';

interface UsageLog {
  id?: string;
  logId?: string;
  model?: string;
  tokens?: unknown;
  totalTokens?: unknown;
  cost?: unknown;
  status?: string;
  createdAt?: string;
  [key: string]: unknown;
}

function fieldValue(row: UsageLog, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value != null && value !== '') return String(value);
  }
  return '';
}

export function UsagePage({ env }: { env: RuntimeEnv }): ReactNode {
  const [state, setState] = useState<{ loading: boolean; error: string; rows: UsageLog[] }>({
    loading: true,
    error: '',
    rows: [],
  });

  async function refresh(): Promise<void> {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await apiRequest<unknown>(env, '/app/v3/api/ai/usage/logs');
      const rows = Array.isArray(data)
        ? (data as UsageLog[])
        : Array.isArray((data as { logs?: unknown })?.logs)
          ? ((data as { logs: UsageLog[] }).logs)
          : [];
      setState({ loading: false, error: '', rows });
    } catch (err) {
      setState({ loading: false, error: err instanceof Error ? err.message : '加载失败', rows: [] });
    }
  }

  useEffect(() => {
    void refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <ScreenHeader title="用量" subtitle="最近的调用记录" />
      {state.loading ? (
        <LoadingView />
      ) : state.error ? (
        <ErrorView message={state.error} onRetry={refresh} />
      ) : state.rows.length === 0 ? (
        <EmptyView label="暂无调用记录" />
      ) : (
        <div className="space-y-2.5 px-4 pb-4">
          {state.rows.map((row, index) => {
            const model = fieldValue(row, ['model', 'modelId']) || '未知模型';
            const tokens = fieldValue(row, ['totalTokens', 'tokens']);
            const cost = fieldValue(row, ['cost', 'totalCost']);
            const createdAt = fieldValue(row, ['createdAt', 'timestamp', 'time']);
            const status = fieldValue(row, ['status', 'state']) || '—';
            const failed = /fail|error|denied/i.test(status);
            return (
              <div key={String(row.id ?? row.logId ?? index)} className="rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm text-slate-100">{model}</p>
                  <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] ${failed ? 'bg-rose-950/60 text-rose-400' : 'bg-emerald-950/60 text-emerald-400'}`}>
                    {status}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3 text-[11px] text-slate-500">
                  {tokens ? <span>Tokens {tokens}</span> : null}
                  {cost ? <span>¥ {cost}</span> : null}
                  {createdAt ? <span className="ml-auto">{createdAt}</span> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
