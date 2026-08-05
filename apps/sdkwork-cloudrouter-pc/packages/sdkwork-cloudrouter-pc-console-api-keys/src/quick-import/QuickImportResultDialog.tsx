import { AlertTriangle, Check, Download, ExternalLink, FolderOpen, Key, ListChecks, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CopyButton } from '@sdkwork/cloudroutes-pc-commons/components/CopyButton';
import {
  downloadQuickImportContent,
  resolveQuickImportTarget,
  type QuickImportResult,
} from './quickImport';

interface QuickImportResultDialogProps {
  result: QuickImportResult;
  /**
   * Set when the deep link was opened but no app hand-off was detected. Renders
   * an install banner above the manual import content so the user can still
   * download the app or fall back to copying the config.
   */
  appUnavailable?: boolean;
  /** Retries opening the deep link (the probe is a heuristic, so a failed
   *  hand-off may still be a false negative when the app is installed). */
  onRetryOpen?: () => void;
  onClose: () => void;
  /** 点击遮罩（弹窗外）时是否关闭；默认 true */
  closeOnClickOutside?: boolean;
}

export function QuickImportResultDialog({ result, appUnavailable, onRetryOpen, onClose, closeOnClickOutside = true }: QuickImportResultDialogProps) {
  const { t } = useTranslation();
  const target = resolveQuickImportTarget(result.targetId);
  const steps = t(target.stepsKey, target.fallbackSteps).split('\n');

  const openInstallPage = () => {
    window.open(target.homepageUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={(event) => {
        if (closeOnClickOutside && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#252525]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Download className="h-5 w-5 text-lobster-500" />
              {t('console.apiKeys.quickImport.title', {
                defaultValue: 'Quick import · {{tool}}',
                tool: t(target.labelKey, target.fallbackLabel),
              })}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{result.keyName || t('console.apiKeys.unnamed', '令牌 #{{id}}', { id: result.keyId })}</span>
              <span className="font-mono">{result.maskedKey}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t('common.actions.close', '关闭')}
            title={t('common.actions.close', '关闭')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-6">
          {appUnavailable && (
            <div className="mb-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-amber-500/20 dark:bg-amber-500/10">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <p className="text-sm leading-6 text-amber-800 dark:text-amber-200">
                  {t('console.apiKeys.quickImport.appNotDetected', {
                    defaultValue: '{{tool}} was not detected on this device and may not be installed.',
                    tool: t(target.labelKey, target.fallbackLabel),
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={openInstallPage}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-500/30 dark:bg-transparent dark:text-amber-300 dark:hover:bg-amber-500/10"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t('console.apiKeys.quickImport.installApp', {
                  defaultValue: 'Install {{tool}}',
                  tool: t(target.labelKey, target.fallbackLabel),
                })}
              </button>
            </div>
          )}

          <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
            {t(target.summaryKey, target.fallbackSummary)}
          </p>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Key className="h-4 w-4 text-blue-500" />
                {t('console.apiKeys.quickImport.contentLabel', '配置内容')}
              </div>
              <div className="flex items-center gap-2">
                <CopyButton
                  text={result.content}
                  variant="inline"
                  label={t('console.apiKeys.quickImport.copyContent', '复制配置')}
                  copiedLabel={t('console.apiKeys.quickImport.contentCopied', '配置已复制')}
                  title={t('console.apiKeys.quickImport.copyContent', '复制配置')}
                />
                <button
                  type="button"
                  onClick={() => downloadQuickImportContent(result)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                >
                  <Download className="h-3.5 w-3.5" />
                  {t('console.apiKeys.quickImport.download', '下载文件')}
                </button>
              </div>
            </div>
            <pre className="mt-3 max-h-[320px] overflow-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-800 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-100 custom-scrollbar">
              <code>{result.content}</code>
            </pre>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#1e1e1e]">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <FolderOpen className="h-4 w-4 text-amber-500" />
                {t('console.apiKeys.quickImport.configPath', '配置位置')}
              </div>
              <div className="mt-2 break-all font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                {t(target.configPathKey, target.fallbackConfigPath)}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#1e1e1e]">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <ListChecks className="h-4 w-4 text-emerald-500" />
                {t('console.apiKeys.quickImport.steps', '导入步骤')}
              </div>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-slate-600 dark:text-slate-300">
                {steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-white/10 dark:bg-[#1a1a1a]">
          {appUnavailable && onRetryOpen && (
            <button
              onClick={onRetryOpen}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-5 py-2 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50 dark:border-blue-500/20 dark:bg-transparent dark:text-blue-300 dark:hover:bg-blue-500/10"
            >
              <ExternalLink className="h-4 w-4" />
              {t('console.apiKeys.quickImport.retryOpenApp', {
                defaultValue: 'Open {{tool}} again',
                tool: t(target.labelKey, target.fallbackLabel),
              })}
            </button>
          )}
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Check className="h-4 w-4" />
            {t('common.actions.close', '关闭')}
          </button>
        </div>
      </div>
    </div>
  );
}
