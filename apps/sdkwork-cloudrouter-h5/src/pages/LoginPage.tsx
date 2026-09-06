import { useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { CloudCog, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { extractAccessToken, getSession, setSession, setToken } from '../lib/auth';
import type { RuntimeEnv } from '../lib/runtime-env';

interface LoginResponse {
  session?: Record<string, unknown>;
  [key: string]: unknown;
}

export function LoginPage({ env }: { env: RuntimeEnv }): ReactNode {
  const navigate = useNavigate();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent): Promise<void> {
    event.preventDefault();
    if (!account.trim() || !password) {
      setError('请输入账号和密码');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload: Record<string, string> = { password };
      if (account.includes('@')) payload.email = account.trim();
      else payload.username = account.trim();

      const response = await apiRequest<LoginResponse>(env, '/app/v3/api/auth/sessions', {
        method: 'POST',
        body: payload,
      });
      const token = extractAccessToken(response);
      if (!token) {
        setError('登录成功但未返回访问令牌，请改用 PC 端登录后再试');
        return;
      }
      setToken(token);
      const session = (response.session ?? (response as Record<string, unknown>)) as Record<string, unknown>;
      setSession(session);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败，请稍后重试');
    } finally {
      setBusy(false);
    }
  }

  const remembered = getSession();

  return (
    <div className="flex min-h-full flex-col justify-center px-7 py-12">
      <div className="mb-9 flex flex-col items-center gap-3">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 shadow-lg shadow-sky-950/50">
          <CloudCog size={32} className="text-sky-400" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-slate-100">CloudRouter 移动控制台</h1>
          <p className="mt-1 text-xs text-slate-500">登录后管理 API Keys、查看定价与用量</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">邮箱或用户名</span>
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            autoComplete="username"
            inputMode="email"
            placeholder="you@example.com"
            className="rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-600"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-xs text-slate-400">密码</span>
          <div className="relative">
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-800 bg-slate-900/70 px-3.5 py-2.5 pr-11 text-sm text-slate-100 placeholder-slate-600 outline-none focus:border-sky-600"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500"
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </label>

        {error ? <p className="text-xs text-rose-400">{error}</p> : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 rounded-xl bg-sky-500 py-3 text-sm font-medium text-slate-950 active:bg-sky-400 disabled:opacity-50"
        >
          {busy ? '登录中…' : '登录'}
        </button>
      </form>

      {remembered ? (
        <p className="mt-6 text-center text-[11px] text-slate-600">
          上次登录：{String(remembered.displayName ?? remembered.username ?? remembered.email ?? '已保存的会话')}
        </p>
      ) : null}
    </div>
  );
}
