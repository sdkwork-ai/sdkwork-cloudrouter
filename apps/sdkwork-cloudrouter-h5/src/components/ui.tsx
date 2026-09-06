import clsx from 'clsx';
import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, Home, KeyRound, Tags, UserRound } from 'lucide-react';

const tabs = [
  { path: '/', label: '概览', icon: Home },
  { path: '/api-keys', label: 'API Keys', icon: KeyRound },
  { path: '/pricing', label: '定价', icon: Tags },
  { path: '/usage', label: '用量', icon: BarChart3 },
  { path: '/me', label: '我的', icon: UserRound },
];

export function TabBar(): ReactNode {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-slate-800/80 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-2 pt-1.5">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => navigate(tab.path)}
              className={clsx(
                'flex min-w-14 flex-col items-center gap-0.5 rounded-lg px-2 py-1 text-[11px] transition-colors',
                active ? 'text-sky-400' : 'text-slate-500 active:text-slate-300',
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export function ScreenHeader({ title, subtitle }: { title: string; subtitle?: string }): ReactNode {
  return (
    <header className="px-4 pt-6 pb-3">
      <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
      {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
    </header>
  );
}

export function LoadingView({ label = '加载中…' }: { label?: string }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-slate-500">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-700 border-t-sky-400" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message: string; onRetry?: () => void }): ReactNode {
  return (
    <div className="flex flex-col items-center gap-3 py-16 px-6 text-center">
      <p className="text-sm text-rose-400">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-slate-700 px-4 py-1.5 text-sm text-slate-300 active:bg-slate-800"
        >
          重试
        </button>
      ) : null}
    </div>
  );
}

export function EmptyView({ label = '暂无数据' }: { label?: string }): ReactNode {
  return <p className="py-16 text-center text-sm text-slate-600">{label}</p>;
}

export function StatCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }): ReactNode {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-slate-100">{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-slate-600">{hint}</p> : null}
    </div>
  );
}

export function Card({ children, onClick }: { children: ReactNode; onClick?: () => void }): ReactNode {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={clsx(
        'block w-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 text-left',
        onClick && 'active:bg-slate-800/70',
      )}
    >
      {children}
    </Tag>
  );
}
