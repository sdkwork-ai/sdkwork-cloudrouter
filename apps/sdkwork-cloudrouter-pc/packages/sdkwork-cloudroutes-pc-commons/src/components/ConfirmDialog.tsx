import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

export interface ConfirmDialogProps {
  title: string;
  description: string;
  /** 附加内容（如警告、勾选项），渲染在描述文本下方 */
  children?: ReactNode;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  cancelLabel?: string;
  /** 确认中的按钮文案；默认沿用 “删除中…” 的历史行为。 */
  busyLabel?: string;
  isBusy?: boolean;
  tone?: 'danger' | 'default';
  icon?: ReactNode;
  /** 点击遮罩（弹窗外）时是否调用 onCancel 关闭；默认 true */
  closeOnClickOutside?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  confirmDisabled = false,
  cancelLabel = 'Cancel',
  busyLabel,
  isBusy = false,
  tone = 'default',
  icon,
  closeOnClickOutside = true,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(
    typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null),
  );
  const confirmClass =
    tone === 'danger'
      ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500'
      : 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-500 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200';

  // Escape cancels; focus starts on the least destructive action so a stray
  // Enter cannot confirm an irreversible operation.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
      restoreFocusRef.current?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || isBusy) {
        return;
      }
      event.preventDefault();
      onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isBusy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (!isBusy && closeOnClickOutside && event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        aria-busy={isBusy}
        className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]"
      >
        <div className="flex gap-3">
          {icon ? (
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-300">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0 flex-1">
            <h3 id="confirm-dialog-title" className="text-base font-bold text-slate-900 dark:text-white">
              {title}
            </h3>
            <p id="confirm-dialog-description" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
            {children ? <div className="mt-3">{children}</div> : null}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5 dark:focus-visible:ring-offset-[#1a1a1a]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy || confirmDisabled}
            aria-busy={isBusy}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus-visible:ring-offset-[#1a1a1a] ${confirmClass}`}
          >
            {isBusy ? (busyLabel ?? t('common.actions.deleting')) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
