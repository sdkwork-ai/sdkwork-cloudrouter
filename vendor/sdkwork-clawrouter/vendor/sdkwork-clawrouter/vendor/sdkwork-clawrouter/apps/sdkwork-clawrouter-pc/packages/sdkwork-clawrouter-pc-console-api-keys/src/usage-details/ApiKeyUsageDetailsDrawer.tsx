import { useMemo, useState } from 'react';
import { BookOpen, CheckSquare, Key, Terminal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CopyButton } from '@sdkwork/clawroutes-pc-commons/components/CopyButton';
import type { ApiKey } from '../apiKeyService';
import {
  API_KEY_USAGE_TOOL_PROFILES,
  buildApiKeyUsageToolSnippets,
  resolveCurrentGatewayEndpoints,
  type ApiKeyUsageToolId,
} from './toolProfiles';

interface ApiKeyUsageDetailsDrawerProps {
  isOpen: boolean;
  apiKey: ApiKey | null;
  onClose: () => void;
}

export function ApiKeyUsageDetailsDrawer({
  isOpen,
  apiKey,
  onClose,
}: ApiKeyUsageDetailsDrawerProps) {
  const { t } = useTranslation();
  const [activeToolId, setActiveToolId] = useState<ApiKeyUsageToolId>('codex');
  const endpoints = useMemo(() => resolveCurrentGatewayEndpoints(), []);
  const apiKeyCopyableKey = apiKey?.copyableKey ?? '<YOUR_CLAW_ROUTER_API_KEY>';
  const snippets = useMemo(
    () =>
      buildApiKeyUsageToolSnippets({
        apiKeyPlaceholder: apiKeyCopyableKey,
        ...endpoints,
      }),
    [apiKeyCopyableKey, endpoints],
  );
  const activeProfile =
    API_KEY_USAGE_TOOL_PROFILES.find((profile) => profile.id === activeToolId)
    ?? API_KEY_USAGE_TOOL_PROFILES[0];
  const activeEndpoint =
    activeProfile.endpointKind === 'anthropic'
      ? endpoints.anthropicBaseUrl
      : activeProfile.endpointKind === 'gemini'
        ? endpoints.geminiBaseUrl
        : endpoints.openAiBaseUrl;

  if (!isOpen || !apiKey) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="fixed inset-y-0 left-0 flex h-full w-[90vw] max-w-[90vw] flex-col border-r border-slate-200 bg-white shadow-2xl animate-in slide-in-from-left duration-300 dark:border-white/10 dark:bg-[#1e1e1e]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Key className="h-5 w-5 text-lobster-500" />
              {t('console.apiKeys.usageDetailsTitle', '使用详情')}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold text-slate-700 dark:text-slate-200">{apiKey.displayName}</span>
              <span className="font-mono">{apiKey.maskedKey}</span>
              <CopyButton
                text={apiKey.copyableKey ?? ''}
                label={t('console.apiKeys.copyKey', '复制密钥')}
                copiedLabel={t('console.apiKeys.keyCopied', '密钥已复制')}
                title={t('console.apiKeys.copyKey', '复制密钥')}
                disabled={!apiKey.copyableKey}
                className="h-7 w-7 border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1e1e1e]"
                iconClassName="h-3.5 w-3.5"
              />
              <span>{apiKey.channelGroupName ?? apiKey.channelGroup}</span>
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

        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="border-b border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-[#181818] lg:border-b-0 lg:border-r">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              {API_KEY_USAGE_TOOL_PROFILES.map((profile) => {
                const isActive = profile.id === activeProfile.id;
                return (
                  <button
                    type="button"
                    key={profile.id}
                    onClick={() => setActiveToolId(profile.id)}
                    className={`flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      isActive
                        ? 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300'
                        : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                    }`}
                  >
                    <span className="truncate">{t(profile.labelKey, profile.fallbackLabel)}</span>
                    {isActive ? <CheckSquare className="h-4 w-4 shrink-0" /> : null}
                  </button>
                );
              })}
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto p-5 custom-scrollbar">
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <section className="min-w-0 space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#252525]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
                        <Terminal className="h-4 w-4 text-blue-500" />
                        {t(activeProfile.labelKey, activeProfile.fallbackLabel)}
                      </div>
                      <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {t(activeProfile.summaryKey, activeProfile.fallbackSummary)}
                      </p>
                    </div>
                    <div className="shrink-0 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs dark:border-white/10 dark:bg-[#1e1e1e]">
                      <div className="text-slate-500 dark:text-slate-400">{t('console.apiKeys.usageDetails.configLocation', '配置位置')}</div>
                      <div className="mt-1 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {t(activeProfile.configPathKey, activeProfile.fallbackConfigPath)}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#252525]">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10">
                    <div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {t('console.apiKeys.usageDetails.quickConfig', '快速配置')}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {t('console.apiKeys.usageDetails.secretPlaceholder', '此配置片段包含管理接口返回的完整 API Key。')}
                      </div>
                    </div>
                    <CopyButton
                      text={snippets[activeProfile.id]}
                      variant="inline"
                      label={t('console.apiKeys.usageDetails.copySnippet', '复制配置')}
                      copiedLabel={t('console.apiKeys.usageDetails.snippetCopied', '配置已复制')}
                      title={t('console.apiKeys.usageDetails.copySnippet', '复制配置')}
                    />
                  </div>
                  <pre className="max-h-[520px] overflow-auto p-4 text-xs leading-6 text-slate-800 dark:text-slate-100 custom-scrollbar">
                    <code>{snippets[activeProfile.id]}</code>
                  </pre>
                </div>
              </section>

              <aside className="space-y-4">
                <InfoBlock
                  label={t('console.apiKeys.usageDetails.openAiEndpoint', 'OpenAI 端点')}
                  value={endpoints.openAiBaseUrl}
                  copyLabel={t('common.actions.copyUrl', 'Copy URL')}
                />
                <InfoBlock
                  label={t('console.apiKeys.usageDetails.anthropicEndpoint', 'Anthropic 端点')}
                  value={endpoints.anthropicBaseUrl}
                  copyLabel={t('common.actions.copyUrl', 'Copy URL')}
                />
                <InfoBlock
                  label={t('console.apiKeys.usageDetails.geminiEndpoint', 'Gemini 端点')}
                  value={endpoints.geminiBaseUrl}
                  copyLabel={t('common.actions.copyUrl', 'Copy URL')}
                />
                <InfoBlock
                  label={t('console.apiKeys.usageDetails.activeEndpoint', '当前端点')}
                  value={activeEndpoint}
                  copyLabel={t('common.actions.copyUrl', 'Copy URL')}
                />
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#252525]">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    {t('console.apiKeys.usageDetails.reference', '参考')}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t(activeProfile.referenceKey, activeProfile.fallbackReference)}
                  </p>
                </div>
              </aside>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  copyLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#252525]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</span>
        <CopyButton
          text={value}
          label={copyLabel}
          copiedLabel={copyLabel}
          title={copyLabel}
          className="h-7 w-7 border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1e1e1e]"
          iconClassName="h-3.5 w-3.5"
        />
      </div>
      <div className="break-all font-mono text-xs font-semibold leading-5 text-slate-800 dark:text-slate-200">{value}</div>
    </div>
  );
}
