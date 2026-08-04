import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Layers, Loader2, Search } from 'lucide-react';

export type GroupSelectorSelectionMode = 'single' | 'multiple';

export interface GroupSelectorOption {
  /** 提交值（例如分组 code） */
  value: string;
  /** 名称 */
  label: string;
  /** 名称下方的说明文字 */
  description?: string;
  /** 倍率，展示在选项右侧徽章 */
  rate?: string | null;
  /** 自定义图标；未提供时按 value 哈希确定性配色渲染默认图标 */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface GroupSelectorLabels {
  searchPlaceholder?: string;
  empty?: string;
  emptySearch?: string;
  loading?: string;
  clear?: string;
  selectedCount?: (count: number) => string;
  /** 倍率徽章 title（前缀固定为 ×） */
  rate?: string;
}

export interface GroupSelectorProps {
  options: GroupSelectorOption[];
  /** 单选传 string，多选传 string[] */
  value: string | string[] | null | undefined;
  onChange: (value: string | string[]) => void;
  /** 通过属性配置单选 / 多选，默认 single */
  selectionMode?: GroupSelectorSelectionMode;
  /** 顶部过滤输入框，默认开启 */
  filterable?: boolean;
  /** 触发器形态：表单字段 / 行内紧凑徽章 */
  variant?: 'field' | 'compact';
  /** 打开弹层时展示加载态（配合 onOpen 懒加载数据） */
  loading?: boolean;
  /** 是否在选项名称下方显示说明文字，默认 true */
  showDescription?: boolean;
  /** 触发器 hover 时展示当前选中分组详情卡片（含说明与倍率） */
  hoverCard?: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** 弹层面板宽度（px），默认取触发器宽度且不小于 280 */
  width?: number;
  labels?: GroupSelectorLabels;
  /** 弹层打开时回调（用于懒加载） */
  onOpen?: () => void;
  /** 触发器 title（tooltip） */
  title?: string;
  className?: string;
}

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
] as const;

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function hashOptionColorKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash % GROUP_ICON_PALETTE.length;
}

function matchesGroupSelectorFilter(query: string, option: GroupSelectorOption): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  return [option.label, option.description, option.value].some((text) =>
    (text ?? '').toLowerCase().includes(normalizedQuery),
  );
}

/**
 * 倍率格式化：保留 4 位小数，并去除末尾多余的 0。
 * 例如 "0.100" -> "0.1"、"1.23456" -> "1.2346"、"2" -> "2"。
 * 非数字文本原样返回。
 */
export function formatGroupMultiplier(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const normalized = value.trim();
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) {
    return normalized;
  }
  return Number(normalized).toFixed(4).replace(/\.?0+$/, '');
}

export function GroupSelector({
  options,
  value,
  onChange,
  selectionMode = 'single',
  filterable = true,
  variant = 'field',
  loading = false,
  showDescription = true,
  hoverCard = false,
  disabled = false,
  placeholder = 'Select group',
  width,
  labels = {},
  onOpen,
  title,
  className,
}: GroupSelectorProps) {
  const [open, setOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [panelStyle, setPanelStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const [hoverVisible, setHoverVisible] = useState(false);
  const [hoverStyle, setHoverStyle] = useState<{ top: number; left: number; width: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<number | null>(null);

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

  const selectedOptions = useMemo(
    () => options.filter((option) => selectedValues.has(option.value)),
    [options, selectedValues],
  );
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
    const top =
      below + PANEL_MAX_HEIGHT <= viewportHeight - PANEL_SIDE_MARGIN
        ? below
        : Math.max(PANEL_SIDE_MARGIN, above);
    setPanelStyle({ top, left, width: panelWidth });
    setFilterQuery('');
  }, [open, width]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
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
    const top =
      below + HOVER_CARD_MAX_HEIGHT <= viewportHeight - PANEL_SIDE_MARGIN
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

  const selectOption = (option: GroupSelectorOption) => {
    if (option.disabled) {
      return;
    }
    if (isMultiple) {
      const next = new Set(selectedValues);
      if (next.has(option.value)) {
        next.delete(option.value);
      } else {
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
      return (
        <span className="min-w-0 flex-1 truncate text-left">
          {count > 0 ? (labels.selectedCount?.(count) ?? `${count} selected`) : placeholder}
        </span>
      );
    }
    if (variant === 'compact') {
      return (
        <span className="min-w-0 flex items-center gap-1">
          {firstSelected ? (
            <OptionIconTile option={firstSelected} size="tiny" />
          ) : null}
          <span className="truncate">{firstSelected?.label ?? placeholder}</span>
        </span>
      );
    }
    return (
      <span className="min-w-0 flex items-center gap-2">
        {firstSelected ? <OptionIconTile option={firstSelected} size="sm" /> : null}
        <span className="truncate">{firstSelected?.label ?? placeholder}</span>
        {firstSelected?.rate ? (
          <RateBadge rate={firstSelected.rate} labels={labels} className="hidden sm:inline-flex" />
        ) : null}
      </span>
    );
  };

  return (
    <div className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={open}
        onMouseEnter={scheduleHoverShow}
        onMouseLeave={scheduleHoverHide}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={
          variant === 'compact'
            ? cn(
                'inline-flex max-w-[170px] items-center gap-1 rounded border border-blue-200 bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 transition-colors hover:bg-blue-100 disabled:opacity-60 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20',
                open && 'bg-blue-100 dark:bg-blue-500/20',
              )
            : cn(
                'flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#252525] dark:text-white',
                open && 'border-blue-500 ring-2 ring-blue-500/30',
              )
        }
      >
        {renderTriggerContent()}
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-slate-400 transition-transform',
            variant === 'compact' && 'h-3 w-3',
            open && 'rotate-180',
          )}
        />
      </button>

      {hoverCard && hoverVisible && !open && hoverStyle && selectedOptions.length > 0
        ? createPortal(
            <div
              onMouseEnter={scheduleHoverShow}
              onMouseLeave={scheduleHoverHide}
              data-sdk-group-selector-hover-card
              className="fixed z-[110] rounded-xl border border-slate-200 bg-white p-3 shadow-lg animate-in fade-in zoom-in-95 duration-100 dark:border-white/10 dark:bg-[#1a1a1a]"
              style={{ top: hoverStyle.top, left: hoverStyle.left, width: hoverStyle.width }}
            >
              {isMultiple ? (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {labels.selectedCount?.(selectedOptions.length) ?? `${selectedOptions.length} selected`}
                  </div>
                  {selectedOptions.slice(0, 5).map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <OptionIconTile option={option} size="tiny" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">
                        {option.label}
                      </span>
                      {option.rate ? <RateBadge rate={option.rate} labels={labels} /> : null}
                    </div>
                  ))}
                  {selectedOptions.length > 5 ? (
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      +{selectedOptions.length - 5} more
                    </div>
                  ) : null}
                </div>
              ) : firstSelected ? (
                <div className="flex items-start gap-2.5">
                  <OptionIconTile option={firstSelected} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                        {firstSelected.label}
                      </span>
                      {firstSelected.rate ? <RateBadge rate={firstSelected.rate} labels={labels} /> : null}
                    </div>
                    {showDescription && firstSelected.description ? (
                      <span className="mt-0.5 block text-xs leading-5 text-slate-500 dark:text-slate-400 line-clamp-2">
                        {firstSelected.description}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}

      {open && panelStyle
        ? createPortal(
            <div
              ref={panelRef}
              role="listbox"
              aria-multiselectable={isMultiple}
              data-sdk-group-selector
              className="fixed z-[110] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-white/10 dark:bg-[#1a1a1a]"
              style={{ top: panelStyle.top, left: panelStyle.left, width: panelStyle.width }}
            >
              {filterable ? (
                <div className="border-b border-slate-100 p-2 dark:border-white/5">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      autoFocus
                      value={filterQuery}
                      onChange={(event) => setFilterQuery(event.currentTarget.value)}
                      placeholder={labels.searchPlaceholder ?? 'Filter groups'}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-blue-500"
                    />
                  </div>
                </div>
              ) : null}

              <div className="custom-scrollbar max-h-[320px] overflow-y-auto p-1.5">
                {loading && options.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {labels.loading ?? 'Loading groups...'}
                  </div>
                ) : filteredOptions.length === 0 ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500 dark:text-slate-400">
                    <Layers className="h-4 w-4 opacity-60" />
                    {filterQuery.trim()
                      ? (labels.emptySearch ?? 'No matching groups')
                      : (labels.empty ?? 'No groups')}
                  </div>
                ) : (
                  filteredOptions.map((option) => {
                    const selected = selectedValues.has(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        disabled={option.disabled}
                        data-sdk-group-selector-option
                        onClick={() => selectOption(option)}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors disabled:opacity-50',
                          selected
                            ? 'bg-blue-50 dark:bg-blue-500/10'
                            : 'hover:bg-slate-50 dark:hover:bg-white/5',
                        )}
                      >
                        <OptionIconTile option={option} size="md" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-800 dark:text-white">
                            {option.label}
                          </span>
                          {showDescription && option.description ? (
                            <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                              {option.description}
                            </span>
                          ) : null}
                        </span>
                        {option.rate ? <RateBadge rate={option.rate} labels={labels} /> : null}
                        <span
                          className={cn(
                            'flex h-4 w-4 shrink-0 items-center justify-center',
                            isMultiple
                              ? cn(
                                  'rounded border',
                                  selected
                                    ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-500'
                                    : 'border-slate-300 bg-white dark:border-white/20 dark:bg-transparent',
                                )
                              : 'text-blue-600 dark:text-blue-400',
                          )}
                        >
                          {selected ? <Check className="h-3 w-3" /> : null}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {isMultiple && selectedValues.size > 0 ? (
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3 py-2 dark:border-white/5">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {labels.selectedCount?.(selectedValues.size) ?? `${selectedValues.size} selected`}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChange([])}
                    className="rounded px-2 py-0.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                  >
                    {labels.clear ?? 'Clear'}
                  </button>
                </div>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export function OptionIconTile({
  option,
  size,
}: {
  option: Pick<GroupSelectorOption, 'value' | 'label' | 'icon'>;
  size: 'tiny' | 'sm' | 'md';
}) {
  const palette = GROUP_ICON_PALETTE[hashOptionColorKey(option.value)] ?? GROUP_ICON_PALETTE[0];
  const sizeClass =
    size === 'tiny'
      ? 'h-3.5 w-3.5 rounded [&>svg]:h-2 [&>svg]:w-2'
      : size === 'sm'
        ? 'h-5 w-5 rounded-md [&>svg]:h-3 [&>svg]:w-3'
        : 'h-7 w-7 rounded-lg [&>svg]:h-3.5 [&>svg]:w-3.5';
  return (
    <span
      title={option.label}
      className={cn(
        'flex shrink-0 items-center justify-center border',
        sizeClass,
        palette.tile,
      )}
    >
      {option.icon ?? <Layers aria-hidden="true" />}
    </span>
  );
}

function RateBadge({
  rate,
  labels,
  className,
}: {
  rate: string;
  labels: GroupSelectorLabels;
  className?: string;
}) {
  return (
    <span
      title={labels.rate}
      className={cn(
        'shrink-0 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300',
        className,
      )}
    >
      ×{formatGroupMultiplier(rate) ?? rate}
    </span>
  );
}
