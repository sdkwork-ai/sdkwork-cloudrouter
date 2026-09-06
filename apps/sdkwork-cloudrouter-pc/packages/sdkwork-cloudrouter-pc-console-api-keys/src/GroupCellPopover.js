import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, } from 'react';
import { createPortal } from 'react-dom';
import { Layers, Pencil } from 'lucide-react';
import { formatGroupMultiplier, OptionIconTile, } from '@sdkwork/cloudroutes-pc-commons/components/GroupSelector';
const SHOW_DELAY_MS = 120;
const HIDE_DELAY_MS = 150;
const PANEL_GAP = 8;
const VIEWPORT_MARGIN = 8;
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
export function GroupCellPopover({ children, options, labels = {}, onHoverOpen, onEdit, disabled = false, }) {
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const showTimerRef = useRef(null);
    const hideTimerRef = useRef(null);
    const [open, setOpen] = useState(false);
    const [placement, setPlacement] = useState(null);
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
        const left = clamp(triggerRect.left, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerWidth - panelWidth - VIEWPORT_MARGIN));
        const arrowLeft = clamp(triggerRect.left + triggerRect.width / 2 - left - 4, 14, panelWidth - 14);
        setPlacement({ top, left, flip, arrowLeft });
    }, []);
    /**
     * 编辑弹窗（GroupPicker dialog）渲染在触发器 span 子树内，其内部发生的
     * hover/click 会冒泡到触发器；命中弹窗内部的事件不应再触发预览弹层，
     * 否则会出现预览（z-200）盖在编辑弹窗（z-110）上方的层级错误。
     */
    const isInsideModalDialog = (target) => target instanceof Element && target.closest('[role="dialog"]') !== null;
    const handlePointerEnter = (event) => {
        if (disabled || isInsideModalDialog(event.target)) {
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
    /** 点击触发器：打开/关闭预览弹层（与悬停并存）；点击编辑弹窗内部不触发切换 */
    const handleTriggerClick = (event) => {
        if (disabled || isInsideModalDialog(event.target)) {
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
        const handleKeyDown = (event) => {
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
    return (_jsxs("span", { ref: triggerRef, className: "relative inline-flex", onPointerEnter: handlePointerEnter, onPointerLeave: handlePointerLeave, onClick: handleTriggerClick, "data-sdk-group-cell-popover": true, children: [children, open
                ? createPortal(_jsxs("div", { ref: panelRef, role: "tooltip", className: "fixed z-[200] w-72 max-w-[calc(100vw-16px)]", style: {
                        top: placement?.top ?? 0,
                        left: placement?.left ?? 0,
                        visibility: placement ? 'visible' : 'hidden',
                    }, onPointerEnter: handlePointerEnter, onPointerLeave: handlePointerLeave, "data-sdk-group-cell-popover-panel": true, children: [_jsx("span", { "aria-hidden": "true", className: cn('absolute h-2 w-2 rotate-45 bg-white dark:bg-[#1f1f1f]', placement?.flip
                                ? 'bottom-[-4px] border-b border-r border-slate-200 dark:border-white/10'
                                : 'top-[-4px] border-l border-t border-slate-200 dark:border-white/10'), style: { left: placement?.arrowLeft ?? 16 } }), _jsxs("div", { className: "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1f1f1f]", children: [_jsxs("div", { className: "flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-white/5", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: labels.title ?? 'Groups' }), _jsx("span", { className: "rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white", children: options.length })] }), _jsx("div", { className: "custom-scrollbar max-h-56 min-h-0 overflow-y-auto p-1.5", children: options.length === 0 ? (_jsxs("div", { className: "flex items-center justify-center gap-2 py-8 text-xs text-slate-400 dark:text-slate-500", children: [_jsx(Layers, { className: "h-4 w-4 opacity-60", "aria-hidden": "true" }), labels.empty ?? 'No groups bound'] })) : (options.map((option) => (_jsxs("div", { className: "flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left", "data-sdk-group-cell-popover-option": true, children: [_jsx(OptionIconTile, { option: option, size: "sm" }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate text-sm font-medium text-slate-800 dark:text-white", children: option.label }), option.description ? (_jsx("span", { className: "block truncate text-xs text-slate-500 dark:text-slate-400", children: option.description })) : null] }), option.rate ? (_jsxs("span", { className: "shrink-0 rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300", children: ["\u00D7", formatGroupMultiplier(option.rate)] })) : null] }, option.value)))) }), _jsx("div", { className: "border-t border-slate-100 p-2 dark:border-white/5", children: _jsxs("button", { type: "button", onClick: () => {
                                            cancelShow();
                                            cancelHide();
                                            setOpen(false);
                                            onEdit?.();
                                        }, className: "flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40", "data-sdk-group-cell-popover-edit": true, children: [_jsx(Pencil, { className: "h-3.5 w-3.5", "aria-hidden": "true" }), labels.editHint ?? 'Edit groups'] }) })] })] }), document.body)
                : null] }));
}
//# sourceMappingURL=GroupCellPopover.js.map