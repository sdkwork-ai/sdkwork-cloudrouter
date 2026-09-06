import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, CheckSquare, ChevronDown, Key, Terminal, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CopyButton } from '@sdkwork/cloudroutes-pc-commons/components/CopyButton';
import { fetchGatewayModelList } from '../quick-import/quickImport';
import { ConfigCodeEditor } from './ConfigCodeEditor';
import { API_KEY_USAGE_TOOL_PROFILES, buildApiKeyUsageToolSnippets, resolveCurrentGatewayEndpoints, } from './toolProfiles';
/** 令牌未明文返回时片段内使用的占位符 */
const API_KEY_PLACEHOLDER = '<YOUR_CLOUD_ROUTER_API_KEY>';
/** 网关模型列表不可用时的兜底模型名 */
const FALLBACK_MODEL_ID = 'gpt-4o-mini';
export function ApiKeyUsageDetailsDrawer({ isOpen, apiKey, onClose, closeOnClickOutside = true, }) {
    const { t } = useTranslation();
    const [activeToolId, setActiveToolId] = useState('codex');
    const [modelId, setModelId] = useState(FALLBACK_MODEL_ID);
    const [availableModels, setAvailableModels] = useState([]);
    const [modelsLoading, setModelsLoading] = useState(false);
    const endpoints = useMemo(() => resolveCurrentGatewayEndpoints(), []);
    // 新建令牌包含明文（rawKey），可直接生成可用的配置片段；否则使用占位符
    const apiKeyPlaceholder = apiKey?.rawKey ?? API_KEY_PLACEHOLDER;
    const snippets = useMemo(() => buildApiKeyUsageToolSnippets({
        apiKeyPlaceholder,
        modelId,
        ...endpoints,
    }), [apiKeyPlaceholder, modelId, endpoints]);
    // 打开抽屉且令牌有明文时，通过 GET /v1/models 获取该 key 可用的模型列表
    useEffect(() => {
        if (!isOpen || !apiKey?.rawKey) {
            return;
        }
        let cancelled = false;
        setModelsLoading(true);
        void fetchGatewayModelList(apiKey.rawKey).then((models) => {
            if (cancelled) {
                return;
            }
            setModelsLoading(false);
            setAvailableModels(models);
            if (models.length > 0) {
                const firstModelId = models[0];
                if (firstModelId) {
                    setModelId(firstModelId);
                }
            }
        });
        return () => {
            cancelled = true;
        };
    }, [isOpen, apiKey]);
    const activeProfile = API_KEY_USAGE_TOOL_PROFILES.find((profile) => profile.id === activeToolId)
        ?? API_KEY_USAGE_TOOL_PROFILES[0];
    useEffect(() => {
        if (!isOpen) {
            return;
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);
    if (!isOpen || !apiKey || !activeProfile) {
        return null;
    }
    const activeEndpoint = activeProfile.endpointKind === 'anthropic'
        ? endpoints.anthropicBaseUrl
        : activeProfile.endpointKind === 'gemini'
            ? endpoints.geminiBaseUrl
            : endpoints.openAiBaseUrl;
    return (_jsx("div", { className: "fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm animate-in fade-in duration-300", onPointerDown: (event) => {
            if (closeOnClickOutside && event.target === event.currentTarget) {
                onClose();
            }
        }, children: _jsxs("div", { className: "flex h-full w-full max-w-5xl animate-in slide-in-from-left flex-col border-r border-slate-200 bg-white shadow-2xl duration-300 dark:border-white/10 dark:bg-[#1e1e1e]", onClick: (event) => event.stopPropagation(), children: [_jsxs("div", { className: "flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white", children: [_jsx(Key, { className: "h-5 w-5 text-lobster-500" }), t('console.apiKeys.usageDetailsTitle', '使用详情')] }), _jsxs("div", { className: "mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400", children: [_jsx("span", { className: "font-semibold text-slate-700 dark:text-slate-200", children: apiKey.displayName || t('console.apiKeys.unnamed', '令牌 #{{id}}', { id: apiKey.id }) }), _jsx("span", { className: "font-mono", children: apiKey.maskedKey }), _jsx("span", { children: apiKey.accountGroupName ?? apiKey.accountGroup }), apiKey.rawKey ? (_jsx("span", { className: "rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400", children: t('console.apiKeys.usageDetails.hasPlaintext', '含完整令牌') })) : null] })] }), _jsx("button", { type: "button", onClick: onClose, className: "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white", "aria-label": t('common.actions.close', '关闭'), title: t('common.actions.close', '关闭'), children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsxs("div", { className: "grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)]", children: [_jsx("aside", { className: "flex min-h-0 flex-col border-b border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-[#181818] lg:border-b-0 lg:border-r", children: _jsx("div", { className: "grid grid-cols-2 gap-2 p-3 lg:grid-cols-1 lg:overflow-y-auto lg:custom-scrollbar", children: API_KEY_USAGE_TOOL_PROFILES.map((profile) => {
                                    const isActive = profile.id === activeProfile.id;
                                    return (_jsxs("button", { type: "button", onClick: () => setActiveToolId(profile.id), "aria-current": isActive ? 'true' : undefined, className: `flex min-h-12 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm font-semibold transition-colors ${isActive
                                            ? 'border-primary-200 bg-primary-50 text-primary-700 dark:border-primary-500/30 dark:bg-primary-500/10 dark:text-primary-300'
                                            : 'border-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'}`, children: [_jsx("span", { className: "truncate", children: t(profile.labelKey, profile.fallbackLabel) }), isActive ? _jsx(CheckSquare, { className: "h-4 w-4 shrink-0" }) : null] }, profile.id));
                                }) }) }), _jsx("main", { className: "min-h-0 overflow-y-auto p-5 custom-scrollbar", children: _jsxs("div", { className: "grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]", children: [_jsxs("section", { className: "min-w-0 space-y-4", children: [_jsx("div", { className: "rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#252525]", children: _jsxs("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between", children: [_jsxs("div", { className: "min-w-0", children: [_jsxs("div", { className: "flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white", children: [_jsx(Terminal, { className: "h-4 w-4 text-primary-500" }), t(activeProfile.labelKey, activeProfile.fallbackLabel)] }), _jsx("p", { className: "mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300", children: t(activeProfile.summaryKey, activeProfile.fallbackSummary) })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 text-xs dark:border-white/10 dark:bg-white/5", children: [_jsx("span", { className: "text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500", children: t('console.apiKeys.usageDetails.configLocation', '配置位置') }), _jsx("span", { className: "font-mono font-semibold text-slate-800 dark:text-slate-200", children: t(activeProfile.configPathKey, activeProfile.fallbackConfigPath) })] })] }) }), _jsxs("div", { className: "overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#252525]", children: [_jsxs("div", { className: "flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-bold text-slate-900 dark:text-white", children: t('console.apiKeys.usageDetails.quickConfig', '快速配置') }), _jsx("div", { className: "mt-1 text-xs text-slate-500 dark:text-slate-400", children: apiKey.rawKey
                                                                            ? t('console.apiKeys.usageDetails.secretIncluded', '此配置片段包含当前令牌的完整密钥，可直接使用。')
                                                                            : t('console.apiKeys.usageDetails.secretPlaceholder', '此配置片段使用占位符 {{placeholder}}，请替换为你的令牌。', { placeholder: API_KEY_PLACEHOLDER }) })] }), _jsx(CopyButton, { text: snippets[activeProfile.id], variant: "inline", label: t('console.apiKeys.usageDetails.copySnippet', '复制配置'), copiedLabel: t('console.apiKeys.usageDetails.snippetCopied', '配置已复制'), title: t('console.apiKeys.usageDetails.copySnippet', '复制配置') })] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-white/10", children: [_jsx("label", { htmlFor: "usage-details-model-id", className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: t('console.apiKeys.usageDetails.defaultModel', '默认模型') }), modelsLoading ? (_jsx("span", { className: "text-xs text-slate-400", children: t('console.apiKeys.usageDetails.modelLoading', '加载模型中…') })) : availableModels.length > 0 ? (_jsx("select", { id: "usage-details-model-id", value: modelId, onChange: (event) => setModelId(event.target.value), className: "min-w-0 max-w-full flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-800 focus:border-primary-400 focus:outline-none dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200", children: availableModels.map((id) => (_jsx("option", { value: id, children: id }, id))) })) : (_jsx("input", { id: "usage-details-model-id", type: "text", value: modelId, onChange: (event) => setModelId(event.target.value), placeholder: FALLBACK_MODEL_ID, className: "min-w-0 max-w-full flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-800 focus:border-primary-400 focus:outline-none dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200" })), !modelsLoading && availableModels.length === 0 && (_jsx("span", { className: "text-xs text-slate-400", children: t('console.apiKeys.usageDetails.modelListUnavailable', '无法获取该令牌的模型列表，可手动输入模型名。') }))] }), _jsx(ConfigCodeEditor, { toolId: activeProfile.id, value: snippets[activeProfile.id] })] })] }), _jsxs("aside", { className: "space-y-4", children: [_jsx(InfoBlock, { label: t('console.apiKeys.usageDetails.activeEndpoint', '当前端点'), value: activeEndpoint, copyLabel: t('common.actions.copyUrl', 'Copy URL'), highlight: true }), _jsxs("details", { className: "group rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#252525]", children: [_jsxs("summary", { className: "flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-bold text-slate-900 dark:text-white", children: [_jsx("span", { children: t('console.apiKeys.usageDetails.gatewayEndpoints', '网关端点') }), _jsx(ChevronDown, { className: "h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" })] }), _jsxs("div", { className: "space-y-3 border-t border-slate-200 p-4 dark:border-white/10", children: [_jsx(InfoBlock, { label: t('console.apiKeys.usageDetails.openAiEndpoint', 'OpenAI 端点'), value: endpoints.openAiBaseUrl, copyLabel: t('common.actions.copyUrl', 'Copy URL') }), _jsx(InfoBlock, { label: t('console.apiKeys.usageDetails.anthropicEndpoint', 'Anthropic 端点'), value: endpoints.anthropicBaseUrl, copyLabel: t('common.actions.copyUrl', 'Copy URL') }), _jsx(InfoBlock, { label: t('console.apiKeys.usageDetails.geminiEndpoint', 'Gemini 端点'), value: endpoints.geminiBaseUrl, copyLabel: t('common.actions.copyUrl', 'Copy URL') })] })] }), _jsxs("div", { className: "rounded-lg border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-[#252525]", children: [_jsxs("div", { className: "flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white", children: [_jsx(BookOpen, { className: "h-4 w-4 text-primary-500" }), t('console.apiKeys.usageDetails.reference', '参考')] }), _jsx("p", { className: "mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300", children: t(activeProfile.referenceKey, activeProfile.fallbackReference) })] })] })] }) })] })] }) }));
}
function InfoBlock({ label, value, copyLabel, highlight = false, }) {
    return (_jsxs("div", { className: `rounded-lg border p-4 ${highlight
            ? 'border-primary-200 bg-primary-50 dark:border-primary-500/30 dark:bg-primary-500/10'
            : 'border-slate-200 bg-white dark:border-white/10 dark:bg-[#252525]'}`, children: [_jsxs("div", { className: "mb-2 flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400", children: label }), _jsx(CopyButton, { text: value, label: copyLabel, copiedLabel: copyLabel, title: copyLabel, className: "h-7 w-7 border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1e1e1e]", iconClassName: "h-3.5 w-3.5" })] }), _jsx("div", { className: "break-all font-mono text-xs font-semibold leading-5 text-slate-800 dark:text-slate-200", children: value })] }));
}
//# sourceMappingURL=ApiKeyUsageDetailsDrawer.js.map