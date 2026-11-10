import type { ReactNode } from 'react';
import { X } from 'lucide-react';

/**
 * 状态徽章由 `MarketingValueBadge` 统一定义（域 + 值决定颜色），这里保持既有
 * 导出路径，页面无需改 import。
 */
export {
  MarketingBatchStatusBadge,
  MarketingStatusBadge,
  type MarketingStatusBadgeProps,
} from './MarketingValueBadge';

interface MarketingDrawerProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** 点击遮罩（抽屉外）时是否关闭；默认 true */
  closeOnClickOutside?: boolean;
  /** 滑入方向：创建/编辑类表单用 'left'（60% 屏宽），详情类用 'right'；默认 'right' */
  side?: 'left' | 'right';
  /** 抽屉宽度（Tailwind 类）；默认右侧 640px，左侧 60% 屏宽 */
  widthClassName?: string;
  /** 底部固定操作栏（取消/确认等），内容区独立滚动 */
  footer?: ReactNode;
}

export function MarketingDrawer({
  title,
  description,
  isOpen,
  onClose,
  children,
  closeOnClickOutside = true,
  side = 'right',
  widthClassName,
  footer,
}: MarketingDrawerProps) {
  if (!isOpen) {
    return null;
  }

  const width = widthClassName
    ?? (side === 'left' ? 'w-full max-w-[60vw]' : 'w-full max-w-[640px]');

  return (
    <div
      className={`fixed inset-0 z-50 flex ${side === 'left' ? 'justify-start' : 'justify-end'} bg-black/40`}
      onPointerDown={(event) => {
        if (closeOnClickOutside && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className={`fixed inset-y-0 ${side === 'left' ? 'left-0' : 'right-0'} flex ${width} flex-col bg-white shadow-2xl dark:bg-slate-950`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5 dark:border-white/10">
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
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
