import { useTranslation } from 'react-i18next';
import { CopyButton } from '@sdkwork/cloudroutes-pc-commons';
import { MARKETING_EMPTY_VALUE, maskPromotionCode } from '../marketingService';

interface CopyablePromotionCodeProps {
  /**
   * 完整可兑换券码。只能来自受审计的 `codes.reveals.create` /
   * `codeBatches.codeExports.create` 返回；禁止把列表响应的 `promotionCode`
   * （已废弃）传进来——列表只提供脱敏值 `codeMasked`。
   */
  code: string;
  /** 展示时是否脱敏；揭示面板展示完整码时传 false。 */
  masked?: boolean;
  /**
   * 复制按钮的可访问名称与悬停提示，必须包含行上下文（如脱敏券码或券码编号），
   * 例如 `Copy full code for code 3C76****4E21`。
   */
  label?: string;
}

/**
 * 券码展示 + 复制：券码本身渲染为可选择、可朗读的 `<code>` 文本，复制是独立的
 * 图标按钮（可访问名称带行上下文），因此读屏用户能先读到码值再执行复制。
 *
 * 该组件只服务“揭示”结果。列表页的券码列直接渲染后端 `codeMasked`，不经过这里。
 */
export function CopyablePromotionCode({ code, masked = true, label }: CopyablePromotionCodeProps) {
  const { t } = useTranslation();
  const normalized = String(code ?? '');
  const actionLabel = label ?? t('admin.marketing.codes.copy', 'Click to copy the full coupon code');
  if (!normalized) {
    return <span className="text-xs text-slate-400">{MARKETING_EMPTY_VALUE}</span>;
  }
  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1.5">
      <code className="break-all font-mono text-xs tabular-nums text-slate-800 dark:text-slate-100">
        {masked ? maskPromotionCode(normalized) : normalized}
      </code>
      <CopyButton
        text={normalized}
        label={actionLabel}
        copiedLabel={t('admin.marketing.codes.copied', 'Copied')}
        errorLabel={t('admin.marketing.codes.copyFailed', 'Copy failed')}
        title={actionLabel}
        iconClassName="h-3.5 w-3.5"
      />
    </span>
  );
}
