import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Pencil } from 'lucide-react';
import type { GroupPickerOption } from '@sdkwork/cloudroutes-pc-commons/components/GroupPicker';
import {
  formatGroupMultiplier,
  OptionIconTile,
} from '@sdkwork/cloudroutes-pc-commons/components/GroupSelector';

export interface GroupCellPopoverLabels {
  /** 弹层标题 */
  title?: string;
  /** 未绑定分组空态文案 */
  empty?: string;
  /** 底部「修改分组」按钮文案 */
  editHint?: string;
}

export interface GroupCellPopoverProps {
  /** 触发器（分组 cell 内容，如 GroupPicker） */
  children: ReactNode;
  /** 已绑定分组的展示数据（调用方按 key 过滤） */
  options: GroupPickerOption[];
  labels?: GroupCellPopoverLabels;
  /** 悬停打开预览时回调（用于懒加载分组数据） */
  onHoverOpen?: () => void;
  /** 点击「修改分组」按钮时回调（用于打开分组选择弹窗） */
  onEdit?: () => void;
  /** 触发器禁用时不再显示预览 */
  disabled?: boolean;
}

const SHOW_DELAY_MS = 120;
const HIDE_DELAY_MS = 150;
const PANEL_GAP = 8;
const VIEWPORT_MARGIN = 8;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

interface Placement {
  top: number;
  left: number;
  /** true 表示空间不足翻转到触发器上方 */
  flip: boolean;
  /** 箭头相对弹层左侧的水平偏移 */
  arrowLeft: number;
}

export function GroupCellPopover({
  children,
  options,
  labels = {},
  onHoverOpen,
  onEdit,
  disabled = false,
}: GroupCellPopoverProps) {
  const triggerRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<Placement | null>(null);

  const cancelShow = useCallback(() => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelShow();
      cancelHide();
    };
  }, [cancelHide, cancelShow]);

  /** 按弹层真实尺寸计算自适应位置：优先下方，空间不足翻转到上方，水平钳制在视口内 */
  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) {
      return;
    }
    const triggerRect = trigger.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const belowTop = triggerRect.bottom + PANEL_GAP;
    const aboveTop = triggerRect.top - PANEL_GAP - panelHeight;
    const fitsBelow = belowTop + panelHeight <= window.innerHeight - VIEWPORT_MARGIN;
    const fitsAbove = aboveTop >= VIEWPORT_MARGIN;
    const flip = !fitsBelow && fitsAbove;
    const top = flip
      ? Math.max(VIEWPORT_MARGIN, aboveTop)
      : clamp(belowTop, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerHeight - panelHeight - VIEWPORT_MARGIN));
    const left = clamp(
      triggerRect.left,
      VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, window.innerWidth - panelWidth - VIEWPORT_MARGIN),
    );
    const arrowLeft = clamp(triggerRect.left + triggerRect.width / 2 - left - 4, 14, panelWidth - 14);
    setPlacement({ top, left, flip, arrowLeft });
  }, []);

  const handlePointerEnter = () => {
    if (disabled) {
      return;
    }
    cancelHide();
    if (showTimerRef.current !== null) {
      return;
    }
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      setOpen(true);
      onHoverOpen?.();
    }, SHOW_DELAY_MS);
  };

  const handlePointerLeave = () => {
    cancelShow();
    if (hideTimerRef.current !== null) {
      return;
    }
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      setOpen(false);
    }, HIDE_DELAY_MS);
  };

  /** 点击触发器：打开/关闭预览弹层（与悬停并存） */
  const handleTriggerClick = () => {
    if (disabled) {
      return;
    }
    cancelShow();
    cancelHide();
    if (open) {
      setOpen(false);
      return;
    }
    measure();
    setOpen(true);
    onHoverOpen?.();
  };

  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    // 先以隐藏态渲染并测量真实尺寸，再定位显示，避免闪烁与错误落点
    measure();
    const recompute = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      // 触发器滚出视口时直接关闭
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      measure();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('scroll', recompute, true);
    window.addEventListener('resize', recompute);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('scroll', recompute, true);
      window.removeEventListener('resize', recompute);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [measure, open]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleTriggerClick}
      data-sdk-group-cell-popover
    >
      {children}
      {open
        ? createPortal(
            <div
              ref={panelRef}
              role="tooltip"
              className="fixed z-[200] w-72 max-w-[calc(100vw-16px)]"
              style={{
                top: placement?.top ?? 0,
                left: placement?.left ?? 0,
                visibility: placement ? 'visible' : 'hidden',
              }}
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
              data-sdk-group-cell-popover-panel
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute h-2 w-2 rotate-45 bg-white dark:bg-[#1f1f1f]',
                  placement?.flip
                    ? 'bottom-[-4px] border-b border-r border-slate-200 dark:border-white/10'
                    : 'top-[-4px] border-l border-t border-slate-200 dark:border-white/10',
                )}
                style={{ left: placement?.arrowLeft ?? 16 }}
              />
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1f1f1f]">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-white/5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {labels.title ?? 'Groups'}
                  </span>
                  <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {options.length}
                  </span>
                </div>
                <div className="custom-scrollbar max-h-56 min-h-0 overflow-y-auto p-1.5">
                  {options.length === 0 ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400 dark:text-slate-500">
                      <Layers className="h-4 w-4 opacity-60" aria-hidden="true" />
                      {labels.empty ?? 'No groups bound'}
                    </div>
                  ) : (
                    options.map((option) => (
                      <div
                        key={option.value}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left"
                        data-sdk-group-cell-popover-option
                      >
                        <OptionIconTile option={option} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-800 dark:text-white">
                            {option.label}
                          </span>
                          {option.description ? (
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              {option.description}
                            </span>
                          ) : null}
                        </span>
                        {option.rate ? (
                          <span className="shrink-0 rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300">
                            ×{formatGroupMultiplier(option.rate)}
                          </span>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t border-slate-100 p-2 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      cancelShow();
                      cancelHide();
                      setOpen(false);
                      onEdit?.();
                    }}
                    className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                    data-sdk-group-cell-popover-edit
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    {labels.editHint ?? 'Edit groups'}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
