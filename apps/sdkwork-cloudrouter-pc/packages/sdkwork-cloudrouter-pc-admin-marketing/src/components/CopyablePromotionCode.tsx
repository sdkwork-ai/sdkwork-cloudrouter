import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy } from 'lucide-react';
import { maskPromotionCode } from '../marketingService';

interface CopyablePromotionCodeProps {
  code: string;
  /** 展示时是否脱敏（点击复制完整码）；默认脱敏 */
  masked?: boolean;
}

/** 复制券码到剪贴板的降级实现（非安全上下文时 navigator.clipboard 不可用）。 */
function copyTextToClipboard(text: string): boolean {
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand('copy');
    textarea.remove();
    return copied;
  } catch {
    return false;
  }
}

/**
 * 可复制的优惠码：展示（默认脱敏）优惠码，点击复制完整码并短暂提示。
 * 用于券码查询与批次券码列表，保障码值不泄露的同时支持一键复制。
 */
export function CopyablePromotionCode({ code, masked = true }: CopyablePromotionCodeProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const normalized = String(code ?? '');
    if (!normalized) {
      return;
    }
    let succeeded = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(normalized);
        succeeded = true;
      }
    } catch {
      succeeded = false;
    }
    if (!succeeded) {
      succeeded = copyTextToClipboard(normalized);
    }
    if (succeeded) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      title={t('admin.marketing.codes.copy', 'Click to copy full code')}
      className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-xs tabular-nums text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/10"
    >
      {masked ? maskPromotionCode(String(code ?? '')) : String(code ?? '')}
      {copied ? (
        <>
          <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span className="text-emerald-600 dark:text-emerald-400">
            {t('admin.marketing.codes.copied', 'Copied')}
          </span>
        </>
      ) : (
        <Copy className="h-3 w-3 text-slate-400 dark:text-slate-500" />
      )}
    </button>
  );
}
