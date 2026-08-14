import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import { AlertCircle, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import type { UpstreamAccountGroup, UpstreamAccountGroupModelListEntry } from '@sdkwork/cloudrouter-pc-admin-core/sdk';

export const inputClass = 'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white';
export const selectClass = inputClass;
export const textAreaClass = 'min-h-20 w-full resize-y rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white';
export const secondaryButtonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10';
export const primaryButtonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-md bg-lobster-600 px-3 text-sm font-semibold text-white transition hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-50';
export const dangerButtonClass = 'inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10';

export function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 ${className ?? ''}`}>
      <span>{label}{required ? <span className="ml-1 text-red-500">*</span> : null}</span>
      {children}
      {hint ? <span className="text-xs font-normal text-slate-500 dark:text-slate-400">{hint}</span> : null}
    </label>
  );
}

export function SearchBox({
  value,
  placeholder,
  onChange,
  onSubmit,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  /** 提交搜索时携带最新输入值（trim 后） */
  onSubmit: (value: string) => void;
}) {
  const { t } = useTranslation();
  const clearable = value.trim() !== '';
  return (
    <form
      className="relative w-full sm:w-72"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(value.trim());
      }}
    >
      <input
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        className={`${inputClass} pr-20`}
      />
      {clearable ? (
        <button
          type="button"
          title={t('common.actions.clear')}
          aria-label={t('common.actions.clear')}
          className="absolute right-11 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10 dark:hover:text-slate-300"
          onClick={() => {
            onChange('');
            onSubmit('');
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
      <button
        type="submit"
        title={t('common.actions.search')}
        aria-label={t('common.actions.search')}
        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-md bg-lobster-600 text-white transition hover:bg-lobster-700"
      >
        <Search className="h-4 w-4" />
      </button>
    </form>
  );
}

export function StatusBadge({ status, healthy }: { status: number; healthy?: number }) {
  const { t } = useTranslation();
  const enabled = status === 1;
  const tone = healthy === 1
    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
    : healthy !== undefined && healthy !== 0
      ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
      : enabled
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
  return (
    <span className={`inline-flex min-w-16 justify-center rounded-full px-2 py-1 text-xs font-semibold ${tone}`}>
      {healthy === 1 ? t('admin.upstream.common.status.healthy') : enabled ? t('common.status.active') : t('common.status.disabled')}
    </span>
  );
}

export function InlineError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">{message}</span>
    </div>
  );
}

export function TableState({ loading, empty, colSpan }: { loading: boolean; empty: string; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="h-48 text-center text-sm text-slate-500 dark:text-slate-400">
        {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : empty}
      </td>
    </tr>
  );
}

export function UpstreamPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full min-h-0 flex-col" data-admin-upstream>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

export function Modal({
  title,
  description,
  busy,
  submitLabel,
  size = 'md',
  fillHeight = false,
  maxHeightClass = 'max-h-[90vh]',
  children,
  onSubmit,
  onClose,
  closeOnClickOutside = true,
}: {
  title: string;
  description?: string;
  busy: boolean;
  submitLabel: string;
  /** 弹窗宽度档位：md 默认 768px，xl 用于左右分栏等宽表单场景；默认 md */
  size?: 'md' | 'xl';
  /** 宽屏下弹窗撑满高度上限，内容改由左右分栏内部各自滚动；默认 false */
  fillHeight?: boolean;
  /** 弹窗高度上限（配合 fillHeight 使用）；默认 90vh */
  maxHeightClass?: string;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClose: () => void;
  /** 点击遮罩（弹窗外）时是否关闭；默认 true */
  closeOnClickOutside?: boolean;
}) {
  const { t } = useTranslation();
  const sizeClass = size === 'xl' ? 'max-w-7xl' : 'max-w-3xl';
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (closeOnClickOutside && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        onSubmit={onSubmit}
        className={`flex w-full ${sizeClass} ${maxHeightClass} flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171717] ${fillHeight ? 'lg:h-full' : ''}`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <button type="button" aria-label={t('admin.upstream.common.aria.close')} onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className={`min-h-0 flex-1 p-5 ${fillHeight ? 'overflow-y-auto lg:overflow-hidden' : 'overflow-y-auto'}`}>{children}</div>
        <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-white/10">
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy}>{t('common.actions.cancel')}</button>
          <button type="submit" className={primaryButtonClass} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {submitLabel}
          </button>
        </footer>
      </form>
    </div>
  );
}

export function SidePanel({
  title,
  subtitle,
  children,
  onClose,
  closeOnClickOutside = true,
  anchor = 'right',
  widthClass = 'max-w-3xl',
  action,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  onClose: () => void;
  /** 点击遮罩（抽屉外）时是否关闭；默认 true */
  closeOnClickOutside?: boolean;
  /** 抽屉弹出方向：left 从左侧滑出，right 从右侧滑出；默认 right */
  anchor?: 'left' | 'right';
  /** 抽屉宽度档位；默认 max-w-3xl */
  widthClass?: string;
  /** 头部操作区（位于标题与关闭按钮之间） */
  action?: ReactNode;
  /** 底部操作栏（可选，如取消/提交） */
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const left = anchor === 'left';
  return (
    <div className={`fixed inset-0 z-[60] flex ${left ? 'justify-start' : 'justify-end'} bg-slate-950/30 backdrop-blur-[1px]`}>
      {left ? null : <button type="button" aria-label={t('admin.upstream.common.aria.close')} className="min-w-0 flex-1" onPointerDown={() => { if (closeOnClickOutside) onClose(); }} />}
      <aside className={`flex h-full w-full ${widthClass} flex-col bg-white shadow-2xl dark:bg-[#171717] ${left ? 'border-r border-slate-200 dark:border-white/10' : 'border-l border-slate-200 dark:border-white/10'}`}>
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <h2 className="truncate text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            {subtitle ? <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
          <button type="button" aria-label={t('admin.upstream.common.aria.close')} onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer ? <footer className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-white/10">{footer}</footer> : null}
      </aside>
      {left ? <button type="button" aria-label={t('admin.upstream.common.aria.close')} className="min-w-0 flex-1" onPointerDown={() => { if (closeOnClickOutside) onClose(); }} /> : null}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="border-b border-slate-200 pb-6 last:border-0 last:pb-0 dark:border-white/10">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

/**
 * Error text with backend problem translation: `i18nKey` -> `errors.result.<code>`
 * -> raw backend detail (`I18N_SPEC.md` §7). Requires a translation function.
 */
export function errorMessageI18n(
  error: unknown,
  fallback: string,
  t: (key: string, options?: { defaultValue?: string } & Record<string, unknown>) => string,
): string {
  return resolveProblemMessage(error, t, fallback);
}

function groupLanguage(language: string | undefined): string {
  const lang = language ?? 'zh-CN';
  if (lang.toLowerCase().startsWith('zh')) return 'zh-CN';
  if (lang.toLowerCase().startsWith('en')) return 'en-US';
  return lang;
}

export function resolveGroupDisplayName(group: { groupName: string; groupNameI18n?: string | null }, language: string | undefined): string {
  if (!group.groupNameI18n) return group.groupName;
  try {
    const map = JSON.parse(group.groupNameI18n) as Record<string, string>;
    const value = map[groupLanguage(language)] ?? map['zh-CN'] ?? map['en-US'];
    if (value && value.trim()) return value;
  } catch {
    // malformed i18n payload; fall back to the default group name
  }
  return group.groupName;
}

/** 账号分组类型过滤值：'all' 表示不按类型过滤 */
export type GroupTypeFilterValue = UpstreamAccountGroup['groupType'] | 'all';

const GROUP_TYPE_ORDER: UpstreamAccountGroup['groupType'][] = ['mixed', 'llm', 'image', 'video', 'audio', 'music', 'other'];

function typeTabClass(selected: boolean): string {
  return `shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${selected ? 'bg-lobster-600 text-white' : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'}`;
}

export function GroupTypeFilter({ value, onChange, className }: { value: GroupTypeFilterValue; onChange: (value: GroupTypeFilterValue) => void; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ''}`}>
      <span className="mr-1 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">{t('admin.upstream.accountGroup.groupType.title')}</span>
      <button type="button" className={typeTabClass(value === 'all')} onClick={() => onChange('all')}>{t('admin.upstream.accountGroup.groupType.all')}</button>
      {GROUP_TYPE_ORDER.map((groupType) => (
        <button key={groupType} type="button" className={typeTabClass(value === groupType)} onClick={() => onChange(groupType)}>
          {t(`admin.upstream.accountGroup.groupType.${groupType}`)}
        </button>
      ))}
    </div>
  );
}

/** 倍率范围过滤值：空字符串表示该边界不限制 */
export interface MultiplierRangeValue {
  costMin: string;
  costMax: string;
  saleMin: string;
  saleMax: string;
}

export const EMPTY_MULTIPLIER_RANGE: MultiplierRangeValue = { costMin: '', costMax: '', saleMin: '', saleMax: '' };

export function hasMultiplierFilter(range: MultiplierRangeValue): boolean {
  return [range.costMin, range.costMax, range.saleMin, range.saleMax].some((value) => value.trim() !== '');
}

export function matchesMultiplierRange(group: { costMultiplier: string; saleMultiplier: string }, range: MultiplierRangeValue): boolean {
  const within = (value: number, min: string, max: string): boolean => {
    if (min.trim() !== '') {
      const minValue = parseFloat(min);
      if (!Number.isNaN(minValue) && value < minValue) return false;
    }
    if (max.trim() !== '') {
      const maxValue = parseFloat(max);
      if (!Number.isNaN(maxValue) && value > maxValue) return false;
    }
    return true;
  };
  return within(parseFloat(group.costMultiplier), range.costMin, range.costMax) && within(parseFloat(group.saleMultiplier), range.saleMin, range.saleMax);
}

const rangeInputClass = 'h-7 w-20 min-w-0 rounded-md border border-slate-300 bg-white px-2 text-xs text-slate-900 outline-none transition focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/15 dark:border-white/10 dark:bg-white/5 dark:text-white';

function MultiplierRangeInputs({ label, min, max, onMinChange, onMaxChange }: { label: string; min: string; max: string; onMinChange: (value: string) => void; onMaxChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <input type="number" min="0" step="0.1" placeholder={t('admin.upstream.accountGroup.multiplier.min')} className={rangeInputClass} value={min} onChange={(event) => onMinChange(event.currentTarget.value.trim())} />
      <span className="shrink-0 text-slate-400">-</span>
      <input type="number" min="0" step="0.1" placeholder={t('admin.upstream.accountGroup.multiplier.max')} className={rangeInputClass} value={max} onChange={(event) => onMaxChange(event.currentTarget.value.trim())} />
    </div>
  );
}

export function MultiplierRangeFilter({ value, onChange, className }: { value: MultiplierRangeValue; onChange: (value: MultiplierRangeValue) => void; className?: string }) {
  const { t } = useTranslation();
  const active = hasMultiplierFilter(value);
  const update = (key: keyof MultiplierRangeValue) => (next: string) => onChange({ ...value, [key]: next });
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 ${className ?? ''}`}>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{t('admin.upstream.accountGroup.multiplier.title')}</span>
      <MultiplierRangeInputs label={t('admin.upstream.accountGroup.multiplier.cost')} min={value.costMin} max={value.costMax} onMinChange={update('costMin')} onMaxChange={update('costMax')} />
      <MultiplierRangeInputs label={t('admin.upstream.accountGroup.multiplier.sale')} min={value.saleMin} max={value.saleMax} onMinChange={update('saleMin')} onMaxChange={update('saleMax')} />
      {active ? <button type="button" className="text-xs font-medium text-lobster-600 hover:underline dark:text-lobster-400" onClick={() => onChange(EMPTY_MULTIPLIER_RANGE)}>{t('common.actions.clear')}</button> : null}
    </div>
  );
}

/** 账号分组预定义标签集（营销/运营维度，与后端 SUPPORTED_TAGS 一致） */
export const SUPPORTED_GROUP_TAGS = ['stable', 'hot', 'recommended', 'promotion', 'new', 'premium', 'high_value', 'official', 'beta', 'limited'] as const;
export type AccountGroupTag = (typeof SUPPORTED_GROUP_TAGS)[number];

const TAG_STYLES: Record<AccountGroupTag, string> = {
  stable: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  hot: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300',
  recommended: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300',
  promotion: 'bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300',
  new: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  premium: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  high_value: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-300',
  official: 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300',
  beta: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300',
  limited: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-300',
};

export function TagBadge({ tag, small, className }: { tag: string; small?: boolean; className?: string }) {
  const { t } = useTranslation();
  const style = TAG_STYLES[tag as AccountGroupTag] ?? TAG_STYLES.beta;
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full font-medium ${small ? 'px-1.5 py-px text-[10px]' : 'px-2 py-0.5 text-xs'} ${style} ${className ?? ''}`}>
      {t(`admin.upstream.accountGroup.tag.${tag}`)}
    </span>
  );
}

export function TagFilter({ value, onChange, className }: { value: string[]; onChange: (value: string[]) => void; className?: string }) {
  const { t } = useTranslation();
  const toggle = (tag: string) => {
    onChange(value.includes(tag) ? value.filter((item) => item !== tag) : [...value, tag]);
  };
  return (
    <div className={`flex flex-wrap items-center gap-1 ${className ?? ''}`}>
      <span className="mr-1 shrink-0 text-xs font-medium text-slate-600 dark:text-slate-300">{t('admin.upstream.accountGroup.tag.title')}</span>
      {SUPPORTED_GROUP_TAGS.map((tag) => (
        <button key={tag} type="button" className={typeTabClass(value.includes(tag))} onClick={() => toggle(tag)}>
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: TAG_DOT_COLORS[tag as AccountGroupTag] }} />
          {t(`admin.upstream.accountGroup.tag.${tag}`)}
        </button>
      ))}
      {value.length > 0 ? (
        <button type="button" className="ml-1 shrink-0 text-xs font-medium text-lobster-600 hover:underline dark:text-lobster-400" onClick={() => onChange([])}>{t('common.actions.clear')}</button>
      ) : null}
    </div>
  );
}

/** 标签筛选胶囊圆点色（与 TAG_STYLES 色系一致的 hex 值） */
const TAG_DOT_COLORS: Record<AccountGroupTag, string> = {
  stable: '#10b981',
  hot: '#f97316',
  recommended: '#6366f1',
  promotion: '#ef4444',
  new: '#0ea5e9',
  premium: '#f59e0b',
  high_value: '#14b8a6',
  official: '#3b82f6',
  beta: '#94a3b8',
  limited: '#a855f7',
};

/** AND 语义：分组必须包含全部所选标签（selected 为空时不限制） */
export function matchesTagFilter(group: { tags?: string[] | null }, selected: string[]): boolean {
  if (selected.length === 0) return true;
  return selected.every((tag) => group.tags?.includes(tag));
}

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

/** 模型黑白名单空条目（结构：{vendorCode, models}，与账号分组一致） */
export const emptyModelListEntry = (): UpstreamAccountGroupModelListEntry => ({ vendorCode: '', models: [] });

/** 逗号/中文逗号/换行分隔的模型名解析 */
export const parseModelNames = (value: string): string[] => value.split(/[,，\n]/).map((model) => model.trim()).filter(Boolean);

/** 规范化模型列表：去空模型名、去空 vendor 条目 */
export const normalizeModelList = (entries: UpstreamAccountGroupModelListEntry[]): UpstreamAccountGroupModelListEntry[] => entries
  .map(({ vendorCode, models }) => ({ vendorCode: vendorCode.trim(), models: models.map((model) => model.trim()).filter(Boolean) }))
  .filter((entry) => entry.vendorCode !== '');

function updateAt<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

/**
 * 模型黑白名单编辑器（账号分组与供应商抽屉共用）。
 * danger=true 渲染为黑名单红色分区，否则为白名单绿色分区；
 * keyPrefix 提供 i18n key 命名空间（accountGroup.access / supplier.modelList）。
 */
export function ModelAccessListEditor({
  title,
  hint,
  entries,
  vendors,
  danger,
  keyPrefix,
  onEntriesChange,
  t,
}: {
  title: string;
  hint: string;
  entries: UpstreamAccountGroupModelListEntry[];
  vendors: { vendorCode: string; label: string }[];
  danger: boolean;
  keyPrefix: string;
  onEntriesChange: (entries: UpstreamAccountGroupModelListEntry[]) => void;
  t: TranslationFunction;
}) {
  const tone = danger
    ? 'border-red-200 bg-red-50/40 dark:border-red-500/20 dark:bg-red-500/5'
    : 'border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5';
  const textTone = danger
    ? 'text-red-700 dark:text-red-300'
    : 'text-emerald-700 dark:text-emerald-300';
  const label = (suffix: string) => `${keyPrefix}.${suffix}`;
  return (
    <div className={`grid gap-2 rounded-md border p-3 ${tone}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs font-semibold ${textTone}`}>{title}</span>
        <button type="button" className={secondaryButtonClass} onClick={() => onEntriesChange([...entries, emptyModelListEntry()])}><Plus className="h-4 w-4" />{t('admin.upstream.common.actions.add')}</button>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      {entries.length === 0 ? <p className="py-2 text-center text-sm text-slate-500">{t(label('empty'))}</p> : null}
      {entries.map((entry, index) => (
        <div key={`${entry.vendorCode}-${index}`} className="grid gap-2 sm:grid-cols-[1fr_1fr_40px]">
          <select aria-label={t(label('vendor'))} className={selectClass} value={entry.vendorCode} onChange={(event) => onEntriesChange(updateAt(entries, index, { vendorCode: event.currentTarget.value }))}>
            <option value="">{t(label('selectVendor'))}</option>
            {vendors.map((vendor) => <option key={vendor.vendorCode} value={vendor.vendorCode}>{vendor.label}</option>)}
          </select>
          <input aria-label={t(label('models'))} placeholder={t(label('modelsPlaceholder'))} className={inputClass} value={entry.models.join(', ')} onChange={(event) => onEntriesChange(updateAt(entries, index, { models: parseModelNames(event.currentTarget.value) }))} />
          <button type="button" title={t('common.actions.delete')} className={dangerButtonClass} onClick={() => onEntriesChange(removeAt(entries, index))}><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  );
}
