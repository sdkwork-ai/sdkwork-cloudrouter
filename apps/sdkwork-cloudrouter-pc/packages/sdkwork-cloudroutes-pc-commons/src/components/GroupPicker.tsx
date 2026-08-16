import { useTranslation } from 'react-i18next';
import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import {
  Building2,
  Check,
  ChevronDown,
  Image as ImageIcon,
  Layers,
  MessageSquare,
  Mic,
  Music,
  Plus,
  Search,
  Video,
  X,
} from 'lucide-react';
import { formatGroupMultiplier, OptionIconTile } from './GroupSelector';

export type GroupPickerSelectionMode = 'single' | 'multiple';

export interface GroupPickerOption {
  value: string;
  label: string;
  description?: string;
  rate?: string | null;
  /** 绑定的模型厂商 code；null/undefined 表示不绑定（全局分组） */
  vendorCode?: string | null;
  /** 支持的模态（text/audio/image/video/music）；空数组表示不限制 */
  modalities?: string[];
  /** 营销/运营标签 code 列表（stable/hot/recommended/...） */
  tags?: string[];
  icon?: ReactNode;
  disabled?: boolean;
}

export interface GroupPickerVendor {
  code: string;
  label: string;
}

export interface GroupPickerLabels {
  /** 触发器占位文案 */
  triggerPlaceholder?: string;
  title?: string;
  /** 穿梭器左右列搜索框占位文案 */
  searchPlaceholder?: string;
  empty?: string;
  emptySearch?: string;
  emptySelected?: string;
  vendorAll?: string;
  modalityAll?: string;
  /** 厂商筛选下拉搜索框占位文案 */
  vendorSearchPlaceholder?: string;
  /** 厂商筛选已选计数文案（count = 已选厂商数） */
  vendorSelected?: (count: number) => string;
  available?: (count: number) => string;
  selected?: (count: number) => string;
  selectedCount?: (count: number) => string;
  addAll?: string;
  removeAll?: string;
  clear?: string;
  confirm?: string;
  cancel?: string;
  rate?: string;
  /** 模态标签覆盖，key 为模态 code（text/audio/image/video/music） */
  modalityLabels?: Record<string, string>;
  /** 标签显示覆盖，key 为标签 code；缺省时显示标签 code 原文 */
  tagLabels?: Record<string, string>;
}

export interface GroupPickerHandle {
  /** 编程式打开选择弹窗（如分组 cell 预览弹层中的编辑按钮） */
  open: () => void;
}

export interface GroupPickerProps {
  /** 全部分组（数据由调用方经 SDK 获取） */
  options: GroupPickerOption[];
  value: string[];
  onChange: (value: string[]) => void;
  /** vendor 列表；未传时从 options 的 vendorCode 去重推导 */
  vendors?: GroupPickerVendor[];
  /** 单选 / 多选，默认 multiple */
  selectionMode?: GroupPickerSelectionMode;
  /** 是否显示分组说明文字，默认 true */
  showDescription?: boolean;
  labels?: GroupPickerLabels;
  disabled?: boolean;
  /** 打开弹层时回调（用于懒加载分组数据） */
  onOpen?: () => void;
  /** 触发器文本覆盖（优先于已选计数/占位文案） */
  triggerLabel?: string;
  triggerClassName?: string;
  /** 禁用点击触发器打开弹窗（仍可通过 ref.open() 编程式打开）；默认 false */
  disableTriggerOpen?: boolean;
  /** 点击遮罩（弹窗外）时是否关闭选择弹窗；默认 true */
  closeOnClickOutside?: boolean;
  /** 命令式句柄：编程式打开选择弹窗 */
  ref?: Ref<GroupPickerHandle>;
}

const GROUP_MODALITIES = [
  { code: 'text', defaultLabel: 'LLM', icon: MessageSquare, color: 'text-amber-500' },
  { code: 'audio', defaultLabel: 'Voice', icon: Mic, color: 'text-emerald-500' },
  { code: 'image', defaultLabel: 'Image', icon: ImageIcon, color: 'text-pink-500' },
  { code: 'video', defaultLabel: 'Video', icon: Video, color: 'text-purple-500' },
  { code: 'music', defaultLabel: 'Music', icon: Music, color: 'text-sky-500' },
] as const;

function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

function deriveVendors(options: GroupPickerOption[]): GroupPickerVendor[] {
  const seen = new Map<string, string>();
  for (const option of options) {
    const code = option.vendorCode?.trim();
    if (code) {
      seen.set(code, code);
    }
  }
  return Array.from(seen, ([code]) => ({ code, label: code }));
}

function matchesQuery(option: GroupPickerOption, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }
  return [option.label, option.description, option.value, option.vendorCode, ...(option.tags ?? [])].some((text) =>
    (text ?? '').toLowerCase().includes(normalizedQuery),
  );
}

/** 高亮命中搜索词的文本片段 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return <>{text}</>;
  }
  const index = text.toLowerCase().indexOf(normalized);
  if (index === -1) {
    return <>{text}</>;
  }
  return (
    <>
      {text.slice(0, index)}
      <mark className="rounded-sm bg-primary-100 px-0.5 text-primary-700 dark:bg-primary-500/25 dark:text-primary-300">
        {text.slice(index, index + normalized.length)}
      </mark>
      {text.slice(index + normalized.length)}
    </>
  );
}

export function GroupPicker({
  options,
  value,
  onChange,
  vendors,
  selectionMode = 'multiple',
  showDescription = true,
  labels = {},
  disabled = false,
  onOpen,
  triggerLabel,
  triggerClassName,
  disableTriggerOpen = false,
  closeOnClickOutside = true,
  ref,
}: GroupPickerProps) {
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState<string[]>([]);
  /** 厂商筛选多选；空数组表示全部厂商 */
  const [activeVendors, setActiveVendors] = useState<string[]>([]);
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
    const handleKeyDown = (event: KeyboardEvent) => {
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

  const availableOptions = useMemo(
    () => filteredOptions.filter((option) => !selectedSet.has(option.value)),
    [filteredOptions, selectedSet],
  );
  const selectedOptions = useMemo(
    () => options.filter((option) => selectedSet.has(option.value)),
    [options, selectedSet],
  );

  /** 左右穿梭器各自的搜索过滤结果 */
  const filteredAvailableOptions = useMemo(
    () => availableOptions.filter((option) => matchesQuery(option, availableQuery)),
    [availableOptions, availableQuery],
  );
  const filteredSelectedOptions = useMemo(
    () => selectedOptions.filter((option) => matchesQuery(option, selectedQuery)),
    [selectedOptions, selectedQuery],
  );

  const moveToSelected = (option: GroupPickerOption) => {
    if (option.disabled) {
      return;
    }
    if (isMultiple) {
      setDraftValue((previous) =>
        previous.includes(option.value) ? previous : [...previous, option.value],
      );
      return;
    }
    setDraftValue([option.value]);
  };

  const moveToAvailable = (optionValue: string) => {
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

  return (
    <div className="inline-flex" data-sdk-group-picker>
      <button
        type="button"
        disabled={disabled}
        onClick={disableTriggerOpen ? undefined : openDialog}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-white/5',
          triggerClassName,
        )}
      >
        <Layers className="h-4 w-4 shrink-0 text-primary-500" aria-hidden="true" />
        <span className="min-w-0 truncate">
          {triggerLabel ??
            (value.length > 0
              ? (labels.selectedCount?.(value.length) ?? `${value.length} selected`)
              : (labels.triggerPlaceholder ?? 'Select groups'))}
        </span>
        {value.length > 0 ? (
          <span className="rounded-full bg-primary-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
            {value.length}
          </span>
        ) : null}
        <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={labels.title ?? 'Select groups'}
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onPointerDown={(event) => {
            if (closeOnClickOutside && event.target === event.currentTarget) {
              cancel();
            }
          }}
        >
          <div className="flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {labels.title ?? 'Select groups'}
              </h3>
              <button
                type="button"
                onClick={cancel}
                aria-label={labels.cancel ?? 'Cancel'}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-slate-200 px-5 py-3 dark:border-white/10">
              <VendorFilterSelect
                vendors={resolvedVendors}
                value={activeVendors}
                onChange={setActiveVendors}
                allLabel={labels.vendorAll ?? 'All vendors'}
                selectedLabel={
                  labels.vendorSelected ?? ((count) => `${count} vendors`)
                }
                searchPlaceholder={labels.vendorSearchPlaceholder ?? 'Search vendors'}
                emptyText={labels.empty ?? 'No vendors'}
              />
              <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-white/10" aria-hidden="true" />
              <FilterChip
                active={activeModality === 'all'}
                label={labels.modalityAll ?? 'All modalities'}
                onClick={() => setActiveModality('all')}
              />
              {GROUP_MODALITIES.map((modality) => {
                const Icon = modality.icon;
                const label = labels.modalityLabels?.[modality.code] ?? modality.defaultLabel;
                return (
                  <FilterChip
                    key={modality.code}
                    active={activeModality === modality.code}
                    label={label}
                    icon={<Icon className={cn('h-3.5 w-3.5', activeModality !== modality.code && modality.color)} aria-hidden="true" />}
                    onClick={() => setActiveModality(modality.code)}
                  />
                );
              })}
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <TransferColumn
                title={labels.available?.(availableOptions.length) ?? `${availableOptions.length} available`}
                totalCount={availableOptions.length}
                options={filteredAvailableOptions}
                query={availableQuery}
                onQueryChange={setAvailableQuery}
                searchPlaceholder={labels.searchPlaceholder ?? 'Search groups'}
                emptyText={
                  availableQuery.trim()
                    ? (labels.emptySearch ?? 'No matching groups')
                    : (labels.empty ?? 'No groups')
                }
                showDescription={showDescription}
                labels={labels}
                actionLabel={isMultiple ? (labels.addAll ?? 'Add all') : undefined}
                onAction={addAllFiltered}
                onSelect={moveToSelected}
                actionIcon={<Plus className="h-3 w-3" aria-hidden="true" />}
              />
              <TransferColumn
                title={labels.selected?.(selectedOptions.length) ?? `${selectedOptions.length} selected`}
                totalCount={selectedOptions.length}
                options={filteredSelectedOptions}
                query={selectedQuery}
                onQueryChange={setSelectedQuery}
                searchPlaceholder={labels.searchPlaceholder ?? 'Search groups'}
                emptyText={
                  selectedQuery.trim()
                    ? (labels.emptySearch ?? 'No matching groups')
                    : (labels.emptySelected ?? 'Nothing selected')
                }
                showDescription={showDescription}
                labels={labels}
                actionLabel={isMultiple ? (labels.removeAll ?? 'Remove all') : undefined}
                onAction={removeAllSelected}
                onSelect={(option) => moveToAvailable(option.value)}
                actionIcon={<X className="h-3 w-3" aria-hidden="true" />}
              />
            </div>

            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-5 py-3.5 dark:border-white/10">
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {labels.selectedCount?.(draftValue.length) ?? `${draftValue.length} selected`}
                </span>
                {draftValue.length > 0 ? (
                  <button
                    type="button"
                    onClick={removeAllSelected}
                    className="rounded px-1.5 py-0.5 text-xs font-semibold text-primary-600 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:text-primary-400 dark:hover:bg-primary-500/10"
                  >
                    {labels.clear ?? 'Clear'}
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  {labels.cancel ?? 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  className="rounded-lg bg-primary-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
                >
                  {labels.confirm ?? 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 厂商筛选：多选下拉（厂商数量会持续增长，不使用平铺 chips） */
function VendorFilterSelect({
  vendors,
  value,
  onChange,
  allLabel,
  selectedLabel,
  searchPlaceholder,
  emptyText,
}: {
  vendors: GroupPickerVendor[];
  value: string[];
  onChange: (value: string[]) => void;
  allLabel: string;
  selectedLabel: (count: number) => string;
  searchPlaceholder: string;
  emptyText: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
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

  return (
    <div ref={rootRef} className="relative" data-sdk-group-picker-vendor-filter>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className={cn(
          'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
          open
            ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5',
        )}
      >
        <Building2 className={cn('h-3.5 w-3.5', open ? '' : 'text-primary-500')} aria-hidden="true" />
        <span className="max-w-44 truncate">{triggerLabel}</span>
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </button>

      {open ? (
        <div className="absolute left-0 top-full z-10 mt-1.5 w-64 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-[#1f1f1f]">
          <div className="relative border-b border-slate-100 p-2 dark:border-white/5">
            <Search
              className="pointer-events-none absolute left-[13px] top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              placeholder={searchPlaceholder}
              autoFocus
              className="h-7 w-full rounded-md border border-slate-200 bg-white pl-7 pr-2 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-primary-500"
            />
          </div>
          <div className="custom-scrollbar max-h-56 overflow-y-auto p-1">
            <button
              type="button"
              onClick={() => {
                onChange([]);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors',
                value.length === 0
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                  : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5',
              )}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-white/20">
                {value.length === 0 ? <Check className="h-3 w-3 text-primary-600 dark:text-primary-400" aria-hidden="true" /> : null}
              </span>
              {allLabel}
            </button>
            {filteredVendors.map((vendor) => {
              const checked = value.includes(vendor.code);
              return (
                <button
                  key={vendor.code}
                  type="button"
                  onClick={() => {
                    onChange(checked ? value.filter((code) => code !== vendor.code) : [...value, vendor.code]);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-medium transition-colors',
                    checked
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5',
                  )}
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-slate-300 dark:border-white/20">
                    {checked ? <Check className="h-3 w-3 text-primary-600 dark:text-primary-400" aria-hidden="true" /> : null}
                  </span>
                  <span className="min-w-0 truncate">{vendor.label}</span>
                </button>
              );
            })}
            {filteredVendors.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-slate-400 dark:text-slate-500">
                <Building2 className="h-4 w-4 opacity-60" aria-hidden="true" />
                {emptyText}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterChip({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon?: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary-600 bg-primary-600 text-white shadow-sm'
          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-300 dark:hover:bg-white/5',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function TransferColumn({
  title,
  totalCount,
  options,
  query,
  onQueryChange,
  searchPlaceholder,
  emptyText,
  showDescription,
  labels,
  actionLabel,
  onAction,
  onSelect,
  actionIcon,
}: {
  title: string;
  totalCount: number;
  /** 已应用本列搜索过滤后的选项 */
  options: GroupPickerOption[];
  query: string;
  onQueryChange: (query: string) => void;
  searchPlaceholder: string;
  emptyText: string;
  showDescription: boolean;
  labels: GroupPickerLabels;
  actionLabel?: string;
  onAction?: () => void;
  onSelect: (option: GroupPickerOption) => void;
  actionIcon?: ReactNode;
}) {

  const { t } = useTranslation();
  const searching = query.trim().length > 0;
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1a1a1a]" data-sdk-group-picker-column>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/5 dark:bg-white/[0.02]">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </span>
          {searching ? (
            <span className="shrink-0 rounded-full bg-slate-200/80 px-1.5 py-px font-mono text-[10px] font-bold leading-4 text-slate-600 dark:bg-white/10 dark:text-slate-300">
              {options.length}/{totalCount}
            </span>
          ) : null}
        </span>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-primary-600 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 dark:text-primary-400 dark:hover:bg-primary-500/10"
          >
            {actionIcon}
            {actionLabel}
          </button>
        ) : null}
      </div>
      <div className="relative shrink-0 bg-slate-50 px-2 pb-2 pt-1.5 dark:bg-white/[0.02]">
        <Search
          className="pointer-events-none absolute left-[13px] top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
          aria-hidden="true"
        />
        <input
          type="text"
          value={query}
          onChange={(event) => onQueryChange(event.currentTarget.value)}
          placeholder={searchPlaceholder}
          data-sdk-group-picker-search
          className="h-7 w-full rounded-md border border-slate-200 bg-white pl-7 pr-6 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-primary-500"
        />
        {searching ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label={t('commons.actions.clearSearch', 'Clear search')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-1.5">
        {options.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400 dark:text-slate-500">
            <Layers className="h-4 w-4 opacity-60" aria-hidden="true" />
            {emptyText}
          </div>
        ) : (
          options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={option.disabled}
              onClick={() => onSelect(option)}
              data-sdk-group-picker-option
              className="group/picker-item flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-primary-50/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 disabled:opacity-50 dark:hover:bg-primary-500/10"
            >
              <OptionIconTile option={option} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800 dark:text-white">
                  <HighlightedText text={option.label} query={query} />
                </span>
                {showDescription && option.description ? (
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    <HighlightedText text={option.description} query={query} />
                  </span>
                ) : null}
              </span>
              {(option.tags ?? []).length > 0 ? (
                <span className="flex shrink-0 flex-wrap justify-end gap-0.5">
                  {(option.tags ?? []).map((tag) => (
                    <span key={tag} className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      {labels.tagLabels?.[tag] ?? tag}
                    </span>
                  ))}
                </span>
              ) : null}
              {option.rate ? (
                <span
                  title={labels.rate}
                  className="shrink-0 rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
                >
                  ×{formatGroupMultiplier(option.rate)}
                </span>
              ) : null}
              <span className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover/picker-item:opacity-100 dark:text-slate-600">
                {actionIcon ?? <Plus className="h-3.5 w-3.5" aria-hidden="true" />}
              </span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
