import { useEffect, useState, type ReactNode } from 'react';
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { apiRequest } from '../lib/api';
import type { RuntimeEnv } from '../lib/runtime-env';
import { Card, EmptyView, ErrorView, LoadingView, ScreenHeader } from '../components/ui';

interface ApiKeyItem {
  apiKeyId?: string;
  id?: string;
  name?: string;
  displayName?: string;
  secret?: string;
  maskedSecret?: string;
  createdAt?: string;
  status?: string;
  [key: string]: unknown;
}

function keyId(item: ApiKeyItem): string {
  return String(item.apiKeyId ?? item.id ?? '');
}

function keyName(item: ApiKeyItem): string {
  return String(item.displayName ?? item.name ?? '未命名 Key');
}

function keySecret(item: ApiKeyItem): string {
  return String(item.maskedSecret ?? item.secret ?? item.apiKey ?? 'sk-••••••••');
}

function keyCreated(item: ApiKeyItem): string {
  if (!item.createdAt) return '';
  const date = new Date(String(item.createdAt));
  return Number.isNaN(date.getTime()) ? String(item.createdAt) : date.toLocaleString('zh-CN');
}

export function ApiKeysPage({ env }: { env: RuntimeEnv }): ReactNode {
  const [state, setState] = useState<{ loading: boolean; error: string; items: ApiKeyItem[] }>({
    loading: true,
    error: '',
    items: [],
  });
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  async function refresh(): Promise<void> {
    setState((s) => ({ ...s, loading: true, error: '' }));
    try {
      const data = await apiRequest<unknown>(env, '/app/v3/api/iam/api_keys');
      const items = Array.isArray(data)
        ? (data as ApiKeyItem[])
        : Array.isArray((data as { apiKeys?: unknown })?.apiKeys)
          ? ((data as { apiKeys: ApiKeyItem[] }).apiKeys)
          : [];
      setState({ loading: false, error: '', items });
    } catch (err) {
      setState({ loading: false, error: err instanceof Error ? err.message : '加载失败', items: [] });
    }
  }

  useEffect(() => {
    void refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function createKey(): Promise<void> {
    if (!newName.trim()) {
      setNotice('请输入 Key 名称');
      return;
    }
    setBusy(true);
    setNotice('');
    try {
      await apiRequest(env, '/app/v3/api/iam/api_keys', { method: 'POST', body: { name: newName.trim() } });
      setNewName('');
      setCreating(false);
      setNotice('创建成功');
      await refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '创建失败');
    } finally {
      setBusy(false);
    }
  }

  async function removeKey(item: ApiKeyItem): Promise<void> {
    if (!window.confirm(`确认删除 API Key「${keyName(item)}」？删除后立即失效。`)) return;
    try {
      await apiRequest(env, `/app/v3/api/iam/api_keys/${encodeURIComponent(keyId(item))}`, { method: 'DELETE' });
      setNotice('已删除');
      await refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : '删除失败');
    }
  }

  async function copySecret(item: ApiKeyItem): Promise<void> {
    try {
      await navigator.clipboard.writeText(keySecret(item));
      setNotice('已复制到剪贴板');
    } catch {
      setNotice('复制失败，请长按手动复制');
    }
  }

  return (
    <div>
      <ScreenHeader title="API Keys" subtitle="管理网关访问密钥" />
      <div className="px-4">
        <button
          type="button"
          onClick={() => setCreating((v) => !v)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-700 py-2.5 text-sm text-sky-400 active:bg-slate-900"
        >
          <Plus size={16} /> 新建 API Key
        </button>
      </div>

      {creating ? (
        <div className="mx-4 mt-3 flex gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Key 名称，例如：生产环境"
            className="min-w-0 flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-600"
          />
          <button
            type="button"
            disabled={busy}
            onClick={createKey}
            className="rounded-lg bg-sky-500 px-4 text-sm font-medium text-slate-950 active:bg-sky-400 disabled:opacity-50"
          >
            {busy ? '创建中…' : '创建'}
          </button>
        </div>
      ) : null}

      {notice ? <p className="px-4 pt-3 text-xs text-slate-400">{notice}</p> : null}

      {state.loading ? (
        <LoadingView />
      ) : state.error ? (
        <ErrorView message={state.error} onRetry={refresh} />
      ) : state.items.length === 0 ? (
        <EmptyView label="还没有 API Key，点击上方新建" />
      ) : (
        <div className="space-y-3 px-4 pt-4 pb-4">
          {state.items.map((item) => (
            <Card key={keyId(item) || keyName(item)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-slate-100">
                    <KeyRound size={14} className="shrink-0 text-sky-400" />
                    <span className="truncate">{keyName(item)}</span>
                  </p>
                  <p className="mt-1.5 truncate font-mono text-[11px] text-slate-500">{keySecret(item)}</p>
                  {keyCreated(item) ? (
                    <p className="mt-1 text-[11px] text-slate-600">创建于 {keyCreated(item)}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={() => copySecret(item)}
                    className="flex items-center gap-1 rounded-lg border border-slate-700 px-2.5 py-1.5 text-[11px] text-slate-300 active:bg-slate-800"
                  >
                    <Copy size={12} /> 复制
                  </button>
                  <button
                    type="button"
                    onClick={() => removeKey(item)}
                    className="flex items-center gap-1 rounded-lg border border-rose-900/60 px-2.5 py-1.5 text-[11px] text-rose-400 active:bg-rose-950/40"
                  >
                    <Trash2 size={12} /> 删除
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
