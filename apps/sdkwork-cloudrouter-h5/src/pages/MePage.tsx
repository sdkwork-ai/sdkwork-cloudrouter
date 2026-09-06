import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, CloudCog, LogOut, MonitorSmartphone } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { clearAuth, getSession } from '../lib/auth';
import type { RuntimeEnv } from '../lib/runtime-env';
import { Card, ScreenHeader } from '../components/ui';

function sessionLabel(): string {
  const session = getSession();
  if (!session) return '已登录';
  for (const key of ['displayName', 'username', 'email', 'account', 'name']) {
    const value = session[key];
    if (typeof value === 'string' && value) return value;
  }
  return '已登录';
}

export function MePage({ env }: { env: RuntimeEnv }): ReactNode {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const pcOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  async function logout(): Promise<void> {
    setBusy(true);
    try {
      await apiRequest(env, '/app/v3/api/auth/sessions/current', { method: 'DELETE' });
    } catch {
      // token may already be invalid; clear locally regardless
    } finally {
      clearAuth();
      setBusy(false);
      navigate('/login', { replace: true });
    }
  }

  return (
    <div>
      <ScreenHeader title="我的" />
      <div className="space-y-3 px-4">
        <Card>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sky-950/70">
              <CloudCog size={22} className="text-sky-400" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-100">{sessionLabel()}</p>
              <p className="text-[11px] text-slate-500">CloudRouter 移动控制台 · 已登录</p>
            </div>
          </div>
        </Card>

        <a href={pcOrigin} className="block">
          <Card>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-sm text-slate-200">
                <MonitorSmartphone size={17} className="text-slate-400" />
                打开 PC 控制台（完整功能）
              </span>
              <ChevronRight size={16} className="text-slate-600" />
            </div>
          </Card>
        </a>

        <button type="button" onClick={logout} disabled={busy} className="block w-full disabled:opacity-50">
          <Card>
            <span className="flex items-center justify-center gap-2 text-sm text-rose-400">
              <LogOut size={16} />
              {busy ? '退出中…' : '退出登录'}
            </span>
          </Card>
        </button>

        <p className="pt-2 text-center text-[11px] text-slate-600">SDKWork CloudRouter · H5 v0.1.0</p>
      </div>
    </div>
  );
}
