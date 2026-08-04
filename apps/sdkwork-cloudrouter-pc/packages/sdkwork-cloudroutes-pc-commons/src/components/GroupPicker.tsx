import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
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
  searchPlaceholder?: string;
  empty?: string;
  emptySearch?: string;
  emptySelected?: string;
  vendorAll?: string;
  modalityAll?: string;
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
}: GroupPickerProps) {
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState<string[]>([]);
  const [activeVendor, setActiveVendor] = useState('all');
  const [activeModality, setActiveModality] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const isMultiple = selectionMode === 'multiple';
  const resolvedVendors = vendors ?? deriveVendors(options);

  const openDialog = () => {
    if (disabled) {
      return;
    }
    setDraftValue(Array.isArray(value) ? [...value] : []);
    setOpen(true);
    onOpen?.();
  };

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

  const filteredOptions = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    return options.filter((option) => {
      if (
        normalizedQuery &&
        ![option.label, option.description, option.value, option.vendorCode].some((text) =>
          (text ?? '').toLowerCase().includes(normalizedQuery),
        )
      ) {
        return false;
      }
      if (activeVendor !== 'all' && option.vendorCode && option.vendorCode !== activeVendor) {
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
  }, [activeModality, activeVendor, options, searchQuery]);

  const availableOptions = filteredOptions.filter((option) => !selectedSet.has(option.value));
  const selectedOptions = options.filter((option) => selectedSet.has(option.value));

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
      for (const option of availableOptions) {
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
        onClick={openDialog}
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#252525] dark:text-slate-200 dark:hover:bg-white/5',
          triggerClassName,
        )}
      >
        <Layers className="h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
        <span className="min-w-0 truncate">
          {triggerLabel ??
            (value.length > 0
              ? (labels.selectedCount?.(value.length) ?? `${value.length} selected`)
              : (labels.triggerPlaceholder ?? 'Select groups'))}
        </span>
        {value.length > 0 ? (
          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
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
        >
          <div className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1a1a1a]">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5 dark:border-white/10">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {labels.title ?? 'Select groups'}
              </h3>
              <button
                type="button"
                onClick={cancel}
                aria-label={labels.cancel ?? 'Cancel'}
                className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="shrink-0 space-y-2.5 border-b border-slate-200 px-5 py-3 dark:border-white/10">
              <div className="flex flex-wrap items-center gap-1.5">
                <FilterChip
                  active={activeVendor === 'all'}
                  label={labels.vendorAll ?? 'All vendors'}
                  onClick={() => setActiveVendor('all')}
                />
                {resolvedVendors.map((vendor) => (
                  <FilterChip
                    key={vendor.code}
                    active={activeVendor === vendor.code}
                    label={vendor.label}
                    onClick={() => setActiveVendor(vendor.code)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
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
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.currentTarget.value)}
                  placeholder={labels.searchPlaceholder ?? 'Search groups'}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2 text-xs text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:bg-white dark:border-white/10 dark:bg-[#121212] dark:text-white dark:focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <TransferColumn
                title={labels.available?.(availableOptions.length) ?? `${availableOptions.length} available`}
                options={availableOptions}
                emptyText={
                  searchQuery.trim()
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
                options={selectedOptions}
                emptyText={labels.emptySelected ?? 'Nothing selected'}
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
                    className="rounded px-1.5 py-0.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                  >
                    {labels.clear ?? 'Clear'}
                  </button>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cancel}
                  className="rounded-lg border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  {labels.cancel ?? 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
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
          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
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
  options,
  emptyText,
  showDescription,
  labels,
  actionLabel,
  onAction,
  onSelect,
  actionIcon,
}: {
  title: string;
  options: GroupPickerOption[];
  emptyText: string;
  showDescription: boolean;
  labels: GroupPickerLabels;
  actionLabel?: string;
  onAction?: () => void;
  onSelect: (option: GroupPickerOption) => void;
  actionIcon?: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-200 dark:border-white/10" data-sdk-group-picker-column>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2 dark:border-white/5 dark:bg-white/[0.02]">
        <span className="truncate text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </span>
        {actionLabel && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className="inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 transition-colors hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
          >
            {actionIcon}
            {actionLabel}
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
              className="group/picker-item flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50 disabled:opacity-50 dark:hover:bg-white/5"
            >
              <OptionIconTile option={option} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-800 dark:text-white">
                  {option.label}
                </span>
                {showDescription && option.description ? (
                  <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                    {option.description}
                  </span>
                ) : null}
              </span>
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
