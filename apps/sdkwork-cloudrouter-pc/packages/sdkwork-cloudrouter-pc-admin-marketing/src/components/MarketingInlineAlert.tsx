import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CopyButton } from '@sdkwork/cloudroutes-pc-commons';

/**
 * 行内反馈条（设计规范 §2.5）：成功/失败都在页面内展示，不使用 toast，
 * 也不把整页替换成状态面板。危险操作失败时必须同时给出可复制的 `traceId`。
 */
export type MarketingAlertTone = 'danger' | 'success' | 'warning';

interface MarketingAlertStyle {
  container: string;
  icon: string;
}

const toneClassNames: Record<MarketingAlertTone, MarketingAlertStyle> = {
  danger: {
    container: 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300',
    icon: 'text-red-500 dark:text-red-400',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
    icon: 'text-emerald-500 dark:text-emerald-400',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
    icon: 'text-amber-500 dark:text-amber-400',
  },
};

export interface MarketingInlineAlertProps {
  message: string;
  tone?: MarketingAlertTone;
  /** 后端 `ProblemDetail.traceId`，有值时渲染可复制条。 */
  traceId?: string | null;
  /** 可恢复失败的行内操作（如乐观锁冲突后的“重新加载”）。 */
  action?: ReactNode;
  onDismiss?: () => void;
}

export function MarketingInlineAlert({
  message,
  tone = 'danger',
  traceId,
  action,
  onDismiss,
}: MarketingInlineAlertProps) {
  const { t } = useTranslation();
  const style = toneClassNames[tone];
  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex shrink-0 items-start gap-2 rounded-md border px-3 py-2 text-xs ${style.container}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="break-words">{message}</p>
        {traceId ? (
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span>{t('admin.marketing.feedback.traceId', 'Trace ID')}</span>
            <code className="max-w-[20rem] truncate rounded bg-white/70 px-1.5 py-0.5 font-mono text-[11px] dark:bg-white/10">
              {traceId}
            </code>
            <CopyButton
              text={traceId}
              label={t('admin.marketing.feedback.copyTraceId', 'Copy trace ID')}
              copiedLabel={t('admin.marketing.codes.copied', 'Copied')}
              errorLabel={t('admin.marketing.codes.copyFailed', 'Copy failed')}
              title={t('admin.marketing.feedback.copyTraceId', 'Copy trace ID')}
              iconClassName="h-3.5 w-3.5"
            />
          </div>
        ) : null}
        {action ? <div className="mt-2 flex flex-wrap items-center gap-2">{action}</div> : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('admin.marketing.feedback.dismiss', 'Dismiss notice')}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-slate-400 hover:bg-white/60 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-lobster-500 dark:hover:bg-white/10 dark:hover:text-white"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
