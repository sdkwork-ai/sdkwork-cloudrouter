import { useEffect, useState, type ReactNode } from 'react';
import { apiRequest } from '../lib/api';
import type { RuntimeEnv } from '../lib/runtime-env';
import { EmptyView, ErrorView, LoadingView, ScreenHeader } from '../components/ui';

interface RateRow {
  model?: string;
  modelId?: string;
  inputRate?: unknown;
  outputRate?: unknown;
  currency?: string;
  unit?: string;
  [key: string]: unknown;
}

function formatRate(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'number') return value % 1 === 0 ? String(value) : value.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const amount = obj.amount ?? obj.price ?? obj.value;
    return amount != null ? `${formatRate(amount)}${obj.currency ? ` ${String(obj.currency)}` : ''}` : JSON.stringify(value);
  }
  return String(value);
}

export function PricingPage({ env }: { env: RuntimeEnv }): ReactNode {
  const [state, setState] = useState<{ loading: boolean; error: string; rows: RateRow[] }>({
    loading: true,
    error: '',
    rows: [],
  });

  async function refresh(): Promise<void> {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await apiRequest<unknown>(env, '/app/v3/api/ai/pricing/rates');
      const rows = Array.isArray(data)
        ? (data as RateRow[])
        : Array.isArray((data as { rates?: unknown })?.rates)
          ? ((data as { rates: RateRow[] }).rates)
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
      <ScreenHeader title="定价" subtitle="模型计费单价（每百万 Token）" />
      {state.loading ? (
        <LoadingView />
      ) : state.error ? (
        <ErrorView message={state.error} onRetry={refresh} />
      ) : state.rows.length === 0 ? (
        <EmptyView label="暂无定价数据" />
      ) : (
        <div className="space-y-2.5 px-4 pb-4">
          <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-2.5 text-[11px] text-slate-500">
            <span>模型</span>
            <span className="text-right">输入</span>
            <span className="text-right">输出</span>
          </div>
          {state.rows.map((row, index) => {
            const model = String(row.model ?? row.modelId ?? `模型 ${index + 1}`);
            return (
              <div
                key={model + index}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-100">{model}</p>
                  {row.unit ? <p className="text-[11px] text-slate-600">{String(row.unit)}</p> : null}
                </div>
                <span className="text-right font-mono text-xs text-slate-200">{formatRate(row.inputRate)}</span>
                <span className="text-right font-mono text-xs text-slate-200">{formatRate(row.outputRate)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
