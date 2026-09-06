import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Layers, Loader2, Search } from 'lucide-react';
const PANEL_MAX_HEIGHT = 320;
const PANEL_GAP = 6;
const PANEL_MIN_WIDTH = 280;
const PANEL_SIDE_MARGIN = 8;
const HOVER_CARD_WIDTH = 260;
const HOVER_CARD_MAX_HEIGHT = 220;
const HOVER_CARD_SHOW_DELAY = 120;
const HOVER_CARD_HIDE_DELAY = 180;
/**
 * 图标兜底色板：类名必须整串书写，保证 Tailwind 可扫描到。
 * 未提供自定义 icon 的选项按 value 哈希确定性取色。
 */
const GROUP_ICON_PALETTE = [
    { tile: 'border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400' },
    { tile: 'border-emerald-100 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400' },
    { tile: 'border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400' },
    { tile: 'border-amber-100 bg-amber-50 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400' },
    { tile: 'border-rose-100 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400' },
    { tile: 'border-sky-100 bg-sky-50 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400' },
    { tile: 'border-teal-100 bg-teal-50 text-teal-600 dark:border-teal-500/20 dark:bg-teal-500/10 dark:text-teal-400' },
    { tile: 'border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400' },
];
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
function hashOptionColorKey(value) {
    let hash = 0;
    for (let index = 0; index < value.length; index += 1) {
        hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
    }
    return hash % GROUP_ICON_PALETTE.length;
}
function matchesGroupSelectorFilter(query, option) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return true;
    }
    return [option.label, option.description, option.value].some((text) => (text ?? '').toLowerCase().includes(normalizedQuery));
}
/**
 * 倍率格式化：保留 4 位小数，并去除末尾多余的 0。
 * 例如 "0.100" -> "0.1"、"1.23456" -> "1.2346"、"2" -> "2"。
 * 非数字文本原样返回。
 */
export function formatGroupMultiplier(value) {
    if (value === null || value === undefined) {
        return null;
    }
    const normalized = value.trim();
    if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
        return normalized;
    }
    return Number(normalized).toFixed(4).replace(/\.?0+$/, '');
}
export function GroupSelector({ options, value, onChange, selectionMode = 'single', filterable = true, variant = 'field', loading = false, showDescription = true, hoverCard = false, disabled = false, placeholder = 'Select group', width, labels = {}, onOpen, title, className, }) {
    const [open, setOpen] = useState(false);
    const [filterQuery, setFilterQuery] = useState('');
    const [panelStyle, setPanelStyle] = useState(null);
    const [hoverVisible, setHoverVisible] = useState(false);
    const [hoverStyle, setHoverStyle] = useState(null);
    const triggerRef = useRef(null);
    const panelRef = useRef(null);
    const hoverTimerRef = useRef(null);
    const clearHoverTimer = () => {
        if (hoverTimerRef.current !== null) {
            window.clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
    };
    const scheduleHoverShow = () => {
        clearHoverTimer();
        if (!hoverCard || disabled || open) {
            return;
        }
        hoverTimerRef.current = window.setTimeout(() => {
            hoverTimerRef.current = null;
            setHoverVisible(true);
        }, HOVER_CARD_SHOW_DELAY);
    };
    const scheduleHoverHide = () => {
        clearHoverTimer();
        hoverTimerRef.current = window.setTimeout(() => {
            hoverTimerRef.current = null;
            setHoverVisible(false);
        }, HOVER_CARD_HIDE_DELAY);
    };
    const isMultiple = selectionMode === 'multiple';
    const selectedValues = useMemo(() => {
        const values = Array.isArray(value) ? value : value ? [value] : [];
        return new Set(values);
    }, [value]);
    const selectedOptions = useMemo(() => options.filter((option) => selectedValues.has(option.value)), [options, selectedValues]);
    const firstSelected = selectedOptions[0];
    const filteredOptions = useMemo(() => {
        if (!filterQuery.trim()) {
            return options;
        }
        return options.filter((option) => matchesGroupSelectorFilter(filterQuery, option));
    }, [filterQuery, options]);
    const openPanel = () => {
        if (disabled) {
            return;
        }
        clearHoverTimer();
        setHoverVisible(false);
        setOpen(true);
        onOpen?.();
    };
    useEffect(() => {
        if (!open) {
            return;
        }
        const trigger = triggerRef.current;
        if (!trigger) {
            return;
        }
        const panelWidth = width ?? Math.max(trigger.offsetWidth, PANEL_MIN_WIDTH);
        const rect = trigger.getBoundingClientRect();
        const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const left = Math.max(PANEL_SIDE_MARGIN, Math.min(rect.left, viewportWidth - panelWidth - PANEL_SIDE_MARGIN));
        const below = rect.bottom + PANEL_GAP;
        const above = rect.top - PANEL_GAP - PANEL_MAX_HEIGHT;
        const top = below + PANEL_MAX_HEIGHT <= viewportHeight - PANEL_SIDE_MARGIN
            ? below
            : Math.max(PANEL_SIDE_MARGIN, above);
        setPanelStyle({ top, left, width: panelWidth });
        setFilterQuery('');
    }, [open, width]);
    useEffect(() => {
        if (!open) {
            return;
        }
        const handlePointerDown = (event) => {
            const target = event.target;
            if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
                return;
            }
            setOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        const close = () => setOpen(false);
        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);
    useEffect(() => {
        if (!hoverVisible) {
            return;
        }
        const trigger = triggerRef.current;
        if (!trigger) {
            return;
        }
        const rect = trigger.getBoundingClientRect();
        const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
        const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
        const left = Math.max(PANEL_SIDE_MARGIN, Math.min(rect.left, viewportWidth - HOVER_CARD_WIDTH - PANEL_SIDE_MARGIN));
        const below = rect.bottom + PANEL_GAP;
        const above = rect.top - PANEL_GAP - HOVER_CARD_MAX_HEIGHT;
        const top = below + HOVER_CARD_MAX_HEIGHT <= viewportHeight - PANEL_SIDE_MARGIN
            ? below
            : Math.max(PANEL_SIDE_MARGIN, above);
        setHoverStyle({ top, left, width: HOVER_CARD_WIDTH });
    }, [hoverVisible, firstSelected, selectedOptions]);
    useEffect(() => {
        if (!hoverVisible) {
            return;
        }
        const close = () => setHoverVisible(false);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [hoverVisible]);
    useEffect(() => clearHoverTimer, []);
    const selectOption = (option) => {
        if (option.disabled) {
            return;
        }
        if (isMultiple) {
            const next = new Set(selectedValues);
            if (next.has(option.value)) {
                next.delete(option.value);
            }
            else {
                next.add(option.value);
            }
            onChange(Array.from(next));
            return;
        }
        if (!selectedValues.has(option.value)) {
            onChange(option.value);
        }
        setOpen(false);
    };
    const renderTriggerContent = () => {
        if (isMultiple) {
            const count = selectedValues.size;
            return (_jsx("span", { className: "min-w-0 flex-1 truncate text-left", children: count > 0 ? (labels.selectedCount?.(count) ?? `${count} selected`) : placeholder }));
        }
        if (variant === 'compact') {
            return (_jsxs("span", { className: "min-w-0 flex items-center gap-1", children: [firstSelected ? (_jsx(OptionIconTile, { option: firstSelected, size: "tiny" })) : null, _jsx("span", { className: "truncate", children: firstSelected?.label ?? placeholder })] }));
        }
        return (_jsxs("span", { className: "min-w-0 flex items-center gap-2", children: [firstSelected ? _jsx(OptionIconTile, { option: firstSelected, size: "sm" }) : null, _jsx("span", { className: "truncate", children: firstSelected?.label ?? placeholder }), firstSelected?.rate ? (_jsx(RateBadge, { rate: firstSelected.rate, labels: labels, className: "hidden sm:inline-flex" })) : null] }));
    };
    return (_jsxs("div", { className: cn('relative', className), children: [_jsxs("button", { ref: triggerRef, type: "button", disabled: disabled, title: title, "aria-haspopup": "listbox", "aria-expanded": open, onMouseEnter: scheduleHoverShow, onMouseLeave: scheduleHoverHide, onClick: () => (open ? setOpen(false) : openPanel()), className: variant === 'compact'
                    ? cn('inline-flex max-w-[170px] items-center gap-1 rounded border border-lobster-200 bg-lobster-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-lobster-600 transition-colors hover:bg-lobster-100 disabled:opacity-60 dark:border-lobster-500/20 dark:bg-lobster-500/10 dark:text-lobster-400 dark:hover:bg-lobster-500/20', open && 'bg-lobster-100 dark:bg-lobster-500/20')
                    : cn('flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-lobster-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#252525] dark:text-white', open && 'border-lobster-500 ring-2 ring-lobster-500/30'), children: [renderTriggerContent(), _jsx(ChevronDown, { className: cn('h-4 w-4 shrink-0 text-slate-400 transition-transform', variant === 'compact' && 'h-3 w-3', open && 'rotate-180') })] }), hoverCard && hoverVisible && !open && hoverStyle && selectedOptions.length > 0
                ? createPortal(_jsx("div", { onMouseEnter: scheduleHoverShow, onMouseLeave: scheduleHoverHide, "data-sdk-group-selector-hover-card": true, className: "fixed z-[200] rounded-xl border border-slate-200 bg-white p-3 shadow-lg animate-in fade-in zoom-in-95 duration-100 dark:border-white/10 dark:bg-[#1a1a1a]", style: { top: hoverStyle.top, left: hoverStyle.left, width: hoverStyle.width }, children: isMultiple ? (_jsxs("div", { className: "space-y-1.5", children: [_jsx("div", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500", children: labels.selectedCount?.(selectedOptions.length) ?? `${selectedOptions.length} selected` }), selectedOptions.slice(0, 5).map((option) => (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(OptionIconTile, { option: option, size: "tiny" }), _jsx("span", { className: "min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200", children: option.label }), option.rate ? _jsx(RateBadge, { rate: option.rate, labels: labels }) : null] }, option.value))), selectedOptions.length > 5 ? (_jsxs("div", { className: "text-xs text-slate-400 dark:text-slate-500", children: ["+", selectedOptions.length - 5, " more"] })) : null] })) : firstSelected ? (_jsxs("div", { className: "flex items-start gap-2.5", children: [_jsx(OptionIconTile, { option: firstSelected, size: "md" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "truncate text-sm font-semibold text-slate-800 dark:text-white", children: firstSelected.label }), firstSelected.rate ? _jsx(RateBadge, { rate: firstSelected.rate, labels: labels }) : null] }), showDescription && firstSelected.description ? (_jsx("span", { className: "mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400 line-clamp-2", children: firstSelected.description })) : null] })] })) : null }), document.body)
                : null, open && panelStyle
                ? createPortal(_jsxs("div", { ref: panelRef, role: "listbox", "aria-multiselectable": isMultiple, "data-sdk-group-selector": true, className: "fixed z-[200] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-white/10 dark:bg-[#1a1a1a]", style: { top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }, children: [filterable ? (_jsx("div", { className: "border-b border-slate-100 p-2 dark:border-white/5", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" }), _jsx("input", { type: "text", autoFocus: true, value: filterQuery, onChange: (event) => setFilterQuery(event.currentTarget.value), placeholder: labels.searchPlaceholder ?? 'Filter groups', className: "h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-lobster-500 focus:bg-white dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-blue-500" })] }) })) : null, _jsx("div", { className: "custom-scrollbar max-h-[320px] overflow-y-auto p-1.5", children: loading && options.length === 0 ? (_jsxs("div", { className: "flex items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-slate-400", children: [_jsx(Loader2, { className: "h-4 w-4 animate-spin" }), labels.loading ?? 'Loading groups...'] })) : filteredOptions.length === 0 ? (_jsxs("div", { className: "flex items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-slate-400", children: [_jsx(Layers, { className: "h-4 w-4 opacity-60" }), filterQuery.trim()
                                        ? (labels.emptySearch ?? 'No matching groups')
                                        : (labels.empty ?? 'No groups')] })) : (filteredOptions.map((option) => {
                                const selected = selectedValues.has(option.value);
                                return (_jsxs("button", { type: "button", role: "option", "aria-selected": selected, disabled: option.disabled, "data-sdk-group-selector-option": true, onClick: () => selectOption(option), className: cn('flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors disabled:opacity-50', selected
                                        ? 'bg-lobster-50 dark:bg-lobster-500/10'
                                        : 'hover:bg-slate-50 dark:hover:bg-white/5'), children: [_jsx(OptionIconTile, { option: option, size: "md" }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate text-sm font-semibold text-slate-800 dark:text-white", children: option.label }), showDescription && option.description ? (_jsx("span", { className: "block truncate text-xs text-slate-500 dark:text-slate-400", children: option.description })) : null] }), option.rate ? _jsx(RateBadge, { rate: option.rate, labels: labels }) : null, _jsx("span", { className: cn('flex h-4 w-4 shrink-0 items-center justify-center', isMultiple
                                                ? cn('rounded border', selected
                                                    ? 'border-lobster-500 bg-lobster-500 text-white dark:border-lobster-500 dark:bg-lobster-500'
                                                    : 'border-slate-300 bg-white dark:border-white/20 dark:bg-transparent')
                                                : 'text-lobster-600 dark:text-lobster-400'), children: selected ? _jsx(Check, { className: "h-3 w-3" }) : null })] }, option.value));
                            })) }), isMultiple && selectedValues.size > 0 ? (_jsxs("div", { className: "flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 dark:border-white/5", children: [_jsx("span", { className: "text-xs font-medium text-slate-500 dark:text-slate-400", children: labels.selectedCount?.(selectedValues.size) ?? `${selectedValues.size} selected` }), _jsx("button", { type: "button", onClick: () => onChange([]), className: "rounded px-2 py-0.5 text-xs font-semibold text-lobster-600 transition-colors hover:bg-lobster-50 dark:text-lobster-400 dark:hover:bg-lobster-500/10", children: labels.clear ?? 'Clear' })] })) : null] }), document.body)
                : null] }));
}
export function OptionIconTile({ option, size, }) {
    const palette = GROUP_ICON_PALETTE[hashOptionColorKey(option.value)] ?? GROUP_ICON_PALETTE[0];
    const sizeClass = size === 'tiny'
        ? 'h-3.5 w-3.5 rounded [&>svg]:h-2 [&>svg]:w-2'
        : size === 'sm'
            ? 'h-5 w-5 rounded-md [&>svg]:h-3 [&>svg]:w-3'
            : 'h-7 w-7 rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5';
    return (_jsx("span", { title: option.label, className: cn('flex shrink-0 items-center justify-center border', sizeClass, palette.tile), children: option.icon ?? _jsx(Layers, { "aria-hidden": "true" }) }));
}
function RateBadge({ rate, labels, className, }) {
    return (_jsxs("span", { title: labels.rate, className: cn('shrink-0 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300', className), children: ["\u00D7", formatGroupMultiplier(rate) ?? rate] }));
}
//# sourceMappingURL=GroupSelector.js.map