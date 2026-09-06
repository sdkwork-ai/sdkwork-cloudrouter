import { Fragment as _Fragment, jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { useEffect, useImperativeHandle, useMemo, useRef, useState, } from 'react';
import { Building2, Check, ChevronDown, Image as ImageIcon, Layers, MessageSquare, Mic, Music, Plus, Search, Video, X, } from 'lucide-react';
import { formatGroupMultiplier, OptionIconTile } from './GroupSelector';
const GROUP_MODALITIES = [
    { code: 'text', defaultLabel: 'LLM', icon: MessageSquare, color: 'text-amber-500' },
    { code: 'audio', defaultLabel: 'Voice', icon: Mic, color: 'text-emerald-500' },
    { code: 'image', defaultLabel: 'Image', icon: ImageIcon, color: 'text-pink-500' },
    { code: 'video', defaultLabel: 'Video', icon: Video, color: 'text-purple-500' },
    { code: 'music', defaultLabel: 'Music', icon: Music, color: 'text-sky-500' },
];
function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
function deriveVendors(options) {
    const seen = new Map();
    for (const option of options) {
        const code = option.vendorCode?.trim();
        if (code) {
            seen.set(code, code);
        }
    }
    return Array.from(seen, ([code]) => ({ code, label: code }));
}
function matchesQuery(option, query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return true;
    }
    return [option.label, option.description, option.value, option.vendorCode, ...(option.tags ?? [])].some((text) => (text ?? '').toLowerCase().includes(normalizedQuery));
}
/** 高亮命中搜索词的文本片段 */
function HighlightedText({ text, query }) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        return _jsx(_Fragment, { children: text });
    }
    const index = text.toLowerCase().indexOf(normalized);
    if (index === -1) {
        return _jsx(_Fragment, { children: text });
    }
    return (_jsxs(_Fragment, { children: [text.slice(0, index), _jsx("mark", { className: "rounded-sm bg-primary-100 px-0.5 text-primary-700 dark:bg-primary-500/25 dark:text-primary-300", children: text.slice(index, index + normalized.length) }), text.slice(index + normalized.length)] }));
}
export function GroupPicker({ options, value, onChange, vendors, selectionMode = 'multiple', showDescription = true, labels = {}, disabled = false, onOpen, triggerLabel, triggerClassName, disableTriggerOpen = false, closeOnClickOutside = true, ref, }) {
    const [open, setOpen] = useState(false);
    const [draftValue, setDraftValue] = useState([]);
    /** 厂商筛选多选；空数组表示全部厂商 */
    const [activeVendors, setActiveVendors] = useState([]);
    const [activeModality, setActiveModality] = useState('all');
    const [availableQuery, setAvailableQuery] = useState('');
    const [selectedQuery, setSelectedQuery] = useState('');
    const isMultiple = selectionMode === 'multiple';
    const resolvedVendors = vendors ?? deriveVendors(options);
    const openDialog = () => {
        if (disabled) {
            return;
        }
        setDraftValue(Array.isArray(value) ? [...value] : []);
        setAvailableQuery('');
        setSelectedQuery('');
        setOpen(true);
        onOpen?.();
    };
    useImperativeHandle(ref, () => ({ open: openDialog }), [openDialog]);
    const cancel = () => setOpen(false);
    const confirm = () => {
        onChange(draftValue);
        setOpen(false);
    };
    useEffect(() => {
        if (!open) {
            return;
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [open]);
    const selectedSet = useMemo(() => new Set(draftValue), [draftValue]);
    /** vendor/模态全局过滤后的候选池（顶部筛选区） */
    const filteredOptions = useMemo(() => {
        return options.filter((option) => {
            if (activeVendors.length > 0 && option.vendorCode && !activeVendors.includes(option.vendorCode)) {
                return false;
            }
            if (activeModality !== 'all') {
                const modalities = option.modalities ?? [];
                if (modalities.length > 0 && !modalities.includes(activeModality)) {
                    return false;
                }
            }
            return true;
        });
    }, [activeModality, activeVendors, options]);
    const availableOptions = useMemo(() => filteredOptions.filter((option) => !selectedSet.has(option.value)), [filteredOptions, selectedSet]);
    const selectedOptions = useMemo(() => options.filter((option) => selectedSet.has(option.value)), [options, selectedSet]);
    /** 左右穿梭器各自的搜索过滤结果 */
    const filteredAvailableOptions = useMemo(() => availableOptions.filter((option) => matchesQuery(option, availableQuery)), [availableOptions, availableQuery]);
    const filteredSelectedOptions = useMemo(() => selectedOptions.filter((option) => matchesQuery(option, selectedQuery)), [selectedOptions, selectedQuery]);
    const moveToSelected = (option) => {
        if (option.disabled) {
            return;
        }
        if (isMultiple) {
            setDraftValue((previous) => previous.includes(option.value) ? previous : [...previous, option.value]);
            return;
        }
        setDraftValue([option.value]);
    };
    const moveToAvailable = (optionValue) => {
        setDraftValue((previous) => previous.filter((item) => item !== optionValue));
    };
    const addAllFiltered = () => {
        if (!isMultiple) {
            return;
        }
        setDraftValue((previous) => {
            const next = new Set(previous);
            for (const option of filteredAvailableOptions) {
                next.add(option.value);
            }
            return Array.from(next);
        });
    };
    const removeAllSelected = () => setDraftValue([]);
    return (_jsxs("div", { className: "inline-flex", "data-sdk-group-picker": true, children: [_jsxs("button", { type: "button", disabled: disabled, onClick: disableTriggerOpen ? undefined : openDialog, className: cn('inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-white/5', triggerClassName), children: [_jsx(Layers, { className: "h-4 w-4 shrink-0 text-primary-500", "aria-hidden": "true" }), _jsx("span", { className: "min-w-0 truncate", children: triggerLabel ??
                            (value.length > 0
                                ? (labels.selectedCount?.(value.length) ?? `${value.length} selected`)
                                : (labels.triggerPlaceholder ?? 'Select groups')) }), value.length > 0 ? (_jsx("span", { className: "rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white", children: value.length })) : null, _jsx(ChevronDown, { className: "h-4 w-4 shrink-0 text-slate-400", "aria-hidden": "true" })] }), open ? (_jsx("div", { role: "dialog", "aria-modal": "true", "aria-label": labels.title ?? 'Select groups', className: "fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm", onPointerDown: (event) => {
                    if (closeOnClickOutside && event.target === event.currentTarget) {
                        cancel();
                    }
                }, children: _jsxs("div", { className: "flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]", children: [_jsxs("div", { className: "flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-white/10", children: [_jsx("h3", { className: "text-base font-bold text-slate-900 dark:text-white", children: labels.title ?? 'Select groups' }), _jsx("button", { type: "button", onClick: cancel, "aria-label": labels.cancel ?? 'Cancel', className: "rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:hover:bg-white/10 dark:hover:text-slate-200", children: _jsx(X, { className: "h-4 w-4", "aria-hidden": "true" }) })] }), _jsxs("div", { className: "flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-200 px-5 py-3 dark:border-white/10", children: [_jsx(VendorFilterSelect, { vendors: resolvedVendors, value: activeVendors, onChange: setActiveVendors, allLabel: labels.vendorAll ?? 'All vendors', selectedLabel: labels.vendorSelected ?? ((count) => `${count} vendors`), searchPlaceholder: labels.vendorSearchPlaceholder ?? 'Search vendors', emptyText: labels.empty ?? 'No vendors' }), _jsx("span", { className: "mx-1 h-4 w-px bg-slate-200 dark:bg-white/10", "aria-hidden": "true" }), _jsx(FilterChip, { active: activeModality === 'all', label: labels.modalityAll ?? 'All modalities', onClick: () => setActiveModality('all') }), GROUP_MODALITIES.map((modality) => {
                                    const Icon = modality.icon;
                                    const label = labels.modalityLabels?.[modality.code] ?? modality.defaultLabel;
                                    return (_jsx(FilterChip, { active: activeModality === modality.code, label: label, icon: _jsx(Icon, { className: cn('h-3.5 w-3.5', activeModality !== modality.code && modality.color), "aria-hidden": "true" }), onClick: () => setActiveModality(modality.code) }, modality.code));
                                })] }), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 gap-4 p-5 sm:grid-cols-2", children: [_jsx(TransferColumn, { title: labels.available?.(availableOptions.length) ?? `${availableOptions.length} available`, totalCount: availableOptions.length, options: filteredAvailableOptions, query: availableQuery, onQueryChange: setAvailableQuery, searchPlaceholder: labels.searchPlaceholder ?? 'Search groups', emptyText: availableQuery.trim()
                                        ? (labels.emptySearch ?? 'No matching groups')
                                        : (labels.empty ?? 'No groups'), showDescription: showDescription, labels: labels, actionLabel: isMultiple ? (labels.addAll ?? 'Add all') : undefined, onAction: addAllFiltered, onSelect: moveToSelected, actionIcon: _jsx(Plus, { className: "h-3 w-3", "aria-hidden": "true" }) }), _jsx(TransferColumn, { title: labels.selected?.(selectedOptions.length) ?? `${selectedOptions.length} selected`, totalCount: selectedOptions.length, options: filteredSelectedOptions, query: selectedQuery, onQueryChange: setSelectedQuery, searchPlaceholder: labels.searchPlaceholder ?? 'Search groups', emptyText: selectedQuery.trim()
                                        ? (labels.emptySearch ?? 'No matching groups')
                                        : (labels.emptySelected ?? 'Nothing selected'), showDescription: showDescription, labels: labels, actionLabel: isMultiple ? (labels.removeAll ?? 'Remove all') : undefined, onAction: removeAllSelected, onSelect: (option) => moveToAvailable(option.value), actionIcon: _jsx(X, { className: "h-3 w-3", "aria-hidden": "true" }) })] }), _jsxs("div", { className: "flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5 dark:border-white/10", children: [_jsxs("div", { className: "flex min-w-0 items-center gap-3", children: [_jsx("span", { className: "text-xs font-medium text-slate-500 dark:text-slate-400", children: labels.selectedCount?.(draftValue.length) ?? `${draftValue.length} selected` }), draftValue.length > 0 ? (_jsx("button", { type: "button", onClick: removeAllSelected, className: "rounded px-1.5 py-0.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:text-primary-400 dark:hover:bg-primary-500/10", children: labels.clear ?? 'Clear' })) : null] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { type: "button", onClick: cancel, className: "rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5", children: labels.cancel ?? 'Cancel' }), _jsx("button", { type: "button", onClick: confirm, className: "rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40", children: labels.confirm ?? 'Confirm' })] })] })] }) })) : null] }));
}
/** 厂商筛选：多选下拉（厂商数量会持续增长，不使用平铺 chips） */
function VendorFilterSelect({ vendors, value, onChange, allLabel, selectedLabel, searchPlaceholder, emptyText, }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const rootRef = useRef(null);
    useEffect(() => {
        if (!open) {
            return;
        }
        const handlePointerDown = (event) => {
            if (rootRef.current && !rootRef.current.contains(event.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, [open]);
    const normalizedQuery = query.trim().toLowerCase();
    const filteredVendors = normalizedQuery
        ? vendors.filter((vendor) => vendor.label.toLowerCase().includes(normalizedQuery))
        : vendors;
    const triggerLabel = value.length === 0 ? allLabel : selectedLabel(value.length);
    return (_jsxs("div", { ref: rootRef, className: "relative", "data-sdk-group-picker-vendor-filter": true, children: [_jsxs("button", { type: "button", onClick: () => setOpen((current) => !current), "aria-expanded": open, className: cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors', open
                    ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5'), children: [_jsx(Building2, { className: cn('h-3.5 w-3.5', open ? '' : 'text-primary-500'), "aria-hidden": "true" }), _jsx("span", { className: "max-w-44 truncate", children: triggerLabel }), _jsx(ChevronDown, { className: "h-3 w-3", "aria-hidden": "true" })] }), open ? (_jsxs("div", { className: "absolute left-0 top-full z-10 mt-1.5 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1f1f1f]", children: [_jsxs("div", { className: "relative border-b border-slate-100 p-2 dark:border-white/5", children: [_jsx(Search, { className: "pointer-events-none absolute left-[13px] top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400", "aria-hidden": "true" }), _jsx("input", { type: "text", value: query, onChange: (event) => setQuery(event.currentTarget.value), placeholder: searchPlaceholder, autoFocus: true, className: "h-7 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-primary-500" })] }), _jsxs("div", { className: "custom-scrollbar max-h-56 overflow-y-auto p-1", children: [_jsxs("button", { type: "button", onClick: () => {
                                    onChange([]);
                                    setOpen(false);
                                }, className: cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors', value.length === 0
                                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                                    : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'), children: [_jsx("span", { className: "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-white/20", children: value.length === 0 ? _jsx(Check, { className: "h-3 w-3 text-primary-600 dark:text-primary-400", "aria-hidden": "true" }) : null }), allLabel] }), filteredVendors.map((vendor) => {
                                const checked = value.includes(vendor.code);
                                return (_jsxs("button", { type: "button", onClick: () => {
                                        onChange(checked ? value.filter((code) => code !== vendor.code) : [...value, vendor.code]);
                                    }, className: cn('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors', checked
                                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'), children: [_jsx("span", { className: "flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-white/20", children: checked ? _jsx(Check, { className: "h-3 w-3 text-primary-600 dark:text-primary-400", "aria-hidden": "true" }) : null }), _jsx("span", { className: "min-w-0 truncate", children: vendor.label })] }, vendor.code));
                            }), filteredVendors.length === 0 ? (_jsxs("div", { className: "flex items-center justify-center gap-2 py-6 text-xs text-slate-400 dark:text-slate-500", children: [_jsx(Building2, { className: "h-4 w-4 opacity-60", "aria-hidden": "true" }), emptyText] })) : null] })] })) : null] }));
}
function FilterChip({ active, icon, label, onClick, }) {
    return (_jsxs("button", { type: "button", onClick: onClick, className: cn('inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors', active
            ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5'), children: [icon, label] }));
}
function TransferColumn({ title, totalCount, options, query, onQueryChange, searchPlaceholder, emptyText, showDescription, labels, actionLabel, onAction, onSelect, actionIcon, }) {
    const { t } = useTranslation();
    const searching = query.trim().length > 0;
    return (_jsxs("div", { className: "flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1a1a1a]", "data-sdk-group-picker-column": true, children: [_jsxs("div", { className: "flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/5 dark:bg-white/[0.02]", children: [_jsxs("span", { className: "flex min-w-0 items-center gap-1.5", children: [_jsx("span", { className: "truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: title }), searching ? (_jsxs("span", { className: "shrink-0 rounded-full bg-slate-200/80 px-1.5 py-px font-mono text-[10px] font-bold leading-4 text-slate-600 dark:bg-white/10 dark:text-slate-300", children: [options.length, "/", totalCount] })) : null] }), actionLabel && onAction ? (_jsxs("button", { type: "button", onClick: onAction, className: "inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-primary-600 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:text-primary-400 dark:hover:bg-primary-500/10", children: [actionIcon, actionLabel] })) : null] }), _jsxs("div", { className: "relative shrink-0 bg-slate-50 px-2 pb-2 pt-1.5 dark:bg-white/[0.02]", children: [_jsx(Search, { className: "pointer-events-none absolute left-[13px] top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400", "aria-hidden": "true" }), _jsx("input", { type: "text", value: query, onChange: (event) => onQueryChange(event.currentTarget.value), placeholder: searchPlaceholder, "data-sdk-group-picker-search": true, className: "h-7 w-full rounded-md border border-slate-200 bg-white pl-7 pr-6 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-primary-500" }), searching ? (_jsx("button", { type: "button", onClick: () => onQueryChange(''), "aria-label": t('commons.actions.clearSearch', 'Clear search'), className: "absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200", children: _jsx(X, { className: "h-3 w-3", "aria-hidden": "true" }) })) : null] }), _jsx("div", { className: "custom-scrollbar min-h-0 flex-1 overflow-y-auto p-1.5", children: options.length === 0 ? (_jsxs("div", { className: "flex items-center justify-center gap-2 py-8 text-xs text-slate-400 dark:text-slate-500", children: [_jsx(Layers, { className: "h-4 w-4 opacity-60", "aria-hidden": "true" }), emptyText] })) : (options.map((option) => (_jsxs("button", { type: "button", disabled: option.disabled, onClick: () => onSelect(option), "data-sdk-group-picker-option": true, className: "group/picker-item flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-primary-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50 dark:hover:bg-primary-500/10", children: [_jsx(OptionIconTile, { option: option, size: "sm" }), _jsxs("span", { className: "min-w-0 flex-1", children: [_jsx("span", { className: "block truncate text-sm font-medium text-slate-800 dark:text-white", children: _jsx(HighlightedText, { text: option.label, query: query }) }), showDescription && option.description ? (_jsx("span", { className: "block truncate text-xs text-slate-500 dark:text-slate-400", children: _jsx(HighlightedText, { text: option.description, query: query }) })) : null] }), (option.tags ?? []).length > 0 ? (_jsx("span", { className: "flex shrink-0 flex-wrap justify-end gap-0.5", children: (option.tags ?? []).map((tag) => (_jsx("span", { className: "rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300", children: labels.tagLabels?.[tag] ?? tag }, tag))) })) : null, option.rate ? (_jsxs("span", { title: labels.rate, className: "shrink-0 rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300", children: ["\u00D7", formatGroupMultiplier(option.rate)] })) : null, _jsx("span", { className: "h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover/picker-item:opacity-100 dark:text-slate-600", children: actionIcon ?? _jsx(Plus, { className: "h-3.5 w-3.5", "aria-hidden": "true" }) })] }, option.value)))) })] }));
}
//# sourceMappingURL=GroupPicker.js.map