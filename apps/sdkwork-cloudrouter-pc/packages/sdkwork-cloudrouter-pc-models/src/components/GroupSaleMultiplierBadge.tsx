import { formatGroupMultiplier } from '@sdkwork/cloudroutes-pc-commons/components/GroupSelector';

/**
 * 分组销售倍率徽章（如 "×1.5"），样式与控制台分组选择器的 RateBadge 保持一致，
 * 让模型库分组之间的倍率差异一目了然。
 */
export function GroupSaleMultiplierBadge({
  multiplier,
  title,
}: {
  multiplier: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className="shrink-0 rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600 dark:border-white/10 dark:bg-white/10 dark:text-slate-300"
    >
      ×{formatGroupMultiplier(multiplier) ?? multiplier}
    </span>
  );
}
