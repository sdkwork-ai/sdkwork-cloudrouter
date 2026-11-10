import { useId, useState, type FormEvent, type ReactNode } from 'react';
import type { ApiRecord } from '@sdkwork/cloudroutes-pc-commons/runtime';

export function MarketingTablePanel({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5">
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer}
    </div>
  );
}

export function MarketingTableActions({ children }: { children: ReactNode }) {
  return <div className="flex justify-end gap-2">{children}</div>;
}

interface MarketingIconActionButtonProps {
  label: string;
  icon: ReactNode;
  tone?: 'default' | 'danger';
  disabled?: boolean;
  /**
   * 悬停提示，缺省与 `label` 相同。禁用状态下用它说明"为什么不能操作"
   * （可访问名称仍是 `label`，避免读屏失去按钮用途）。
   */
  title?: string;
  onClick: () => void;
}

const iconActionToneClassNames: Record<'default' | 'danger', string> = {
  default: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10',
  danger: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10',
};

export function MarketingIconActionButton({
  label,
  icon,
  tone = 'default',
  disabled = false,
  title,
  onClick,
}: MarketingIconActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={title ?? label}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md disabled:cursor-not-allowed disabled:opacity-40 ${iconActionToneClassNames[tone]}`}
    >
      {icon}
    </button>
  );
}

/**
 * 解析分页计数字段。
 *
 * 后端把 int64 序列化为十进制字符串（API_SPEC §13.6：`page`、`pageSize`、
 * `totalItems`、`totalPages` 均为 `type: string, format: int64`），但同一份
 * 数据在本地测试、旧接口或 SDK 兼容层里也可能是 `number`。这里同时接受
 * `string | number | null | undefined`，只返回安全非负整数；空串、小数、
 * 负数、超安全整数或非数字文本一律返回 `null`，调用方据此回退到不确定状态的
 * 保守行为，而不是把 `"50"` 当成缺失值。
 */
export function parseMarketingPageNumber(value: string | number | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!/^\d+$/u.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * 从 `pageInfo` 读取分页计数：只接受字符串或数字，其余类型（对象、布尔等）
 * 视作缺失并返回 `null`。
 */
export function readMarketingPageInfoNumber(pageInfo: ApiRecord | null, key: string): number | null {
  const value = pageInfo?.[key];
  if (typeof value === 'string' || typeof value === 'number') {
    return parseMarketingPageNumber(value);
  }
  return null;
}

/**
 * 是否还有下一页。
 *
 * 优先使用后端显式 `hasMore`；其次使用经过字符串解析的 `totalPages`，这样
 * 满页的最后一页不会因为 `itemCount >= pageSize` 而错误显示“下一页”。只有
 * 两个字段都无法判定时才回退到“满页即可能还有下一页”的保守推断。
 */
export function hasNextMarketingPage(
  pageInfo: ApiRecord | null,
  page: number,
  itemCount: number,
  pageSize: number,
): boolean {
  const hasMore = pageInfo?.['hasMore'];
  if (typeof hasMore === 'boolean') {
    return hasMore;
  }
  const totalPages = readMarketingPageInfoNumber(pageInfo, 'totalPages');
  if (totalPages !== null) {
    return page < totalPages;
  }
  return itemCount >= pageSize;
}

type MarketingTranslate = (key: string, fallback: string, options?: Record<string, unknown>) => string;

export function marketingPageLabel(t: MarketingTranslate, page: number, pageInfo: ApiRecord | null): string {
  const totalPages = readMarketingPageInfoNumber(pageInfo, 'totalPages');
  if (totalPages !== null) {
    return t('admin.marketing.pagination.pageOfTotal', 'Page {{page}} / {{totalPages}}', { page, totalPages });
  }
  return t('admin.marketing.pagination.page', 'Page {{page}}', { page });
}

export interface MarketingPageJumpProps {
  totalPages: number | null;
  disabled?: boolean;
  jumpLabel: string;
  goLabel: string;
  /** 页码越界提示（由调用方按当前 totalPages 插入变量）；未知总页数时为空串。 */
  invalidPageLabel: string;
  /** 总行数文案；未知总行数时为 null。 */
  totalItemsLabel: string | null;
  onJump: (page: number) => void;
}

/**
 * 页码跳转条：与既有上一页/下一页共用同一视觉规范（h-8、圆角、边框、字号）。
 * 总页数未知时禁用跳转（无法做 1..totalPages 校验），已经知道总页数时校验输入
 * 范围并给出可朗读的错误提示。
 */
export function MarketingPageJump({
  totalPages,
  disabled = false,
  jumpLabel,
  goLabel,
  invalidPageLabel,
  totalItemsLabel,
  onJump,
}: MarketingPageJumpProps) {
  const inputId = useId();
  const errorId = useId();
  const [rawPage, setRawPage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const canJump = totalPages !== null && totalPages > 0 && !disabled;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canJump || totalPages === null) {
      return;
    }
    const requestedPage = parseMarketingPageNumber(rawPage);
    if (requestedPage === null || requestedPage < 1 || requestedPage > totalPages) {
      setError(invalidPageLabel);
      return;
    }
    setError(null);
    setRawPage('');
    onJump(requestedPage);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-2 dark:border-white/5">
      {totalItemsLabel !== null ? (
        <span className="mr-auto whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400">
          {totalItemsLabel}
        </span>
      ) : null}
      <form onSubmit={handleSubmit} className="ml-auto flex items-center gap-2" noValidate>
        <label
          htmlFor={inputId}
          className="whitespace-nowrap text-xs font-medium text-slate-500 dark:text-slate-400"
        >
          {jumpLabel}
        </label>
        <input
          id={inputId}
          type="number"
          inputMode="numeric"
          min={1}
          max={totalPages ?? undefined}
          value={rawPage}
          disabled={!canJump}
          onChange={(event) => {
            setRawPage(event.target.value);
            setError(null);
          }}
          aria-describedby={error !== null ? errorId : undefined}
          aria-invalid={error !== null}
          className="h-8 w-20 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-700 outline-none focus:border-lobster-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#202020] dark:text-slate-200"
        />
        <button
          type="submit"
          disabled={!canJump}
          className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition-colors hover:border-lobster-300 hover:text-lobster-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
        >
          {goLabel}
        </button>
      </form>
      {error !== null ? (
        <p id={errorId} role="alert" className="w-full text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function marketingStatusLabel(status: unknown, active: string, inactive: string): string {
  return status === 'active' || status === 'ACTIVE' ? active : inactive;
}
