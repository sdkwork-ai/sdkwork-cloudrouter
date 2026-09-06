import { useEffect, useState, type ReactNode } from 'react';
import { Activity, KeyRound, TrendingUp, Wallet } from 'lucide-react';
import { apiRequest, unwrap } from '../lib/api';
import type { RuntimeEnv } from '../lib/runtime-env';
import { Card, EmptyView, ErrorView, LoadingView, ScreenHeader, StatCard } from '../components/ui';

function formatMetric(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toLocaleString('zh-CN') : value.toFixed(2);
  }
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'number' || typeof value === 'string') return value;
  }
  return undefined;
}

export function OverviewPage({ env }: { env: RuntimeEnv }): ReactNode {
  const [state, setState] = useState<{ loading: boolean; error: string; data: Record<string, unknown> | null }>({
    loading: true,
    error: '',
    data: null,
  });

  async function refresh(): Promise<void> {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = unwrap<Record<string, unknown>>(
        await apiRequest(env, '/app/v3/api/ai/dashboard/overview'),
      );
      setState({ loading: false, error: '', data: data && typeof data === 'object' ? (data as Record<string, unknown>) : {} });
    } catch (err) {
      setState({ loading: false, error: err instanceof Error ? err.message : '加载失败', data: null });
    }
  }

  useEffect(() => {
    void refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const data = state.data;
  const requests = data ? pickNumber(data, ['totalRequests', 'requestCount', 'requests', 'total_requests']) : undefined;
  const tokens = data ? pickNumber(data, ['totalTokens', 'tokenCount', 'tokens', 'total_tokens']) : undefined;
  const spend = data ? pickNumber(data, ['totalCost', 'totalSpend', 'cost', 'spend', 'total_cost']) : undefined;
  const errorRate = data ? pickNumber(data, ['errorRate', 'error_rate', 'failedRequests']) : undefined;

  return (
    <div>
      <ScreenHeader title="概览" subtitle="路由网关运行总览" />
      {state.loading ? (
        <LoadingView />
      ) : state.error ? (
        <ErrorView message={state.error} onRetry={refresh} />
      ) : !data ? (
        <EmptyView />
      ) : (
        <div className="space-y-3 px-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="请求总数" value={formatMetric(requests)} />
            <StatCard label="Token 消耗" value={formatMetric(tokens)} />
            <StatCard label="累计花费" value={spend != null ? `¥ ${formatMetric(spend)}` : '—'} />
            <StatCard label="错误率" value={errorRate != null ? formatMetric(errorRate) : '—'} />
          </div>

          {Object.entries(data)
            .filter(([, value]) => value != null && typeof value === 'object' && !Array.isArray(value))
            .slice(0, 4)
            .map(([key, value]) => (
              <Card key={key}>
                <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <Activity size={13} className="text-sky-500" />
                  {key}
                </p>
                <div className="space-y-1.5">
                  {Object.entries(value as Record<string, unknown>)
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">{k}</span>
                        <span className="text-slate-200">{formatMetric(v)}</span>
                      </div>
                    ))}
                </div>
              </Card>
            ))}

          <Card>
            <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
              <TrendingUp size={13} className="text-emerald-400" />
              快捷入口
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2.5 py-2">
                <KeyRound size={13} className="text-sky-400" /> API Keys
              </span>
              <span className="flex items-center gap-1.5 rounded-lg bg-slate-800/60 px-2.5 py-2">
                <Wallet size={13} className="text-amber-400" /> 定价与用量
              </span>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
