import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MembershipDrawerProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 底部固定操作栏（取消/确认等），内容区独立滚动 */
  footer?: ReactNode;
  /** 点击遮罩（抽屉外）时是否关闭；默认 true */
  closeOnClickOutside?: boolean;
}

export function MembershipDrawer({
  title,
  description,
  isOpen,
  onClose,
  children,
  footer,
  closeOnClickOutside = true,
}: MembershipDrawerProps) {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40"
      onPointerDown={(event) => {
        if (closeOnClickOutside && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="membership-drawer-title"
        className="fixed inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-white shadow-2xl dark:bg-slate-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div>
            <h3 id="membership-drawer-title" className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.actions.close', 'Close')}
            title={t('common.actions.close', 'Close')}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-200 px-6 py-4 dark:border-white/10">{footer}</div>
        ) : null}
      </aside>
    </div>
  );
}
