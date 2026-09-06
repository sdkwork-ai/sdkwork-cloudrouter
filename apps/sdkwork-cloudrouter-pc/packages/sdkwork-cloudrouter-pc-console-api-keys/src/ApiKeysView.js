import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Bird, Bot, Check, CheckSquare, ChevronLeft, ChevronRight, Copy, Download, Edit3, Image as ImageIcon, Loader2, Lock, MessageSquare, Mic, Music, Plus, Repeat, Search, Trash2, Unlock, Video, X, Zap, } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons/components/ConfirmDialog';
import { CopyButton } from '@sdkwork/cloudroutes-pc-commons/components/CopyButton';
import { copyTextToClipboard } from '@sdkwork/cloudroutes-pc-commons/clipboard';
import { GroupPicker, } from '@sdkwork/cloudroutes-pc-commons/components/GroupPicker';
import { CreateKeyDrawer } from './CreateKeyDrawer';
import { GroupCellPopover } from './GroupCellPopover';
import { chainInputFromForm, createApiKeyInputsFromForm } from './apiKeyForm';
import { ApiKeyService } from './apiKeyService';
import { buildTagLabels, toGroupPickerOptions } from './accountGroups';
import { fetchModelVendors } from './vendorCatalog';
import { displayApiKeyGroupName, formatApiKeyCreated, formatApiKeyExpiration, formatApiKeyIpLimit, formatApiKeyNumber, formatApiKeyQuota, } from './display';
import { ApiKeyUsageDetailsDrawer } from './usage-details/ApiKeyUsageDetailsDrawer';
import { buildQuickImportDeepLink, buildQuickImportResult, QUICK_IMPORT_TARGETS, resolveQuickImportTarget, } from './quick-import/quickImport';
import { openDeeplink } from './quick-import/openDeeplink';
import { QuickImportAppPickerDialog } from './quick-import/QuickImportAppPickerDialog';
import { QuickImportResultDialog } from './quick-import/QuickImportResultDialog';
function getApiKeyProductErrorMessage(error, fallback, t) {
    if (error instanceof Error) {
        const message = error.message.trim();
        if (message.startsWith('console.')) {
            return t(message, fallback);
        }
        if (message) {
            return message;
        }
    }
    return fallback;
}
export function ApiKeysView() {
    const { t, i18n } = useTranslation();
    /** 最新分组列表镜像，供异步流程（导入弹窗厂商解析）在 setState 生效前读取 */
    const groupsRef = useRef([]);
    /** 进行中的分组加载 promise：并发调用方共享同一批加载并等待其完成 */
    const groupsLoadingPromiseRef = useRef(null);
    const groupPickerHandlesRef = useRef({});
    const [keysData, setKeysData] = useState([]);
    const [totalKeys, setTotalKeys] = useState(0);
    const [groups, setGroups] = useState([]);
    const [groupsLoaded, setGroupsLoaded] = useState(false);
    const [groupsLoading, setGroupsLoading] = useState(false);
    /** 模型厂商列表（code + 显示名）；null = 未加载/加载失败（回退推导） */
    const [vendors, setVendors] = useState(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState(null);
    const [showCreateDrawer, setShowCreateDrawer] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdKeys, setCreatedKeys] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [usageDetailsKey, setUsageDetailsKey] = useState(null);
    const [detailsKey, setDetailsKey] = useState(null);
    const [editingKey, setEditingKey] = useState(null);
    const [deletingKey, setDeletingKey] = useState(null);
    const [mutatingKeyId, setMutatingKeyId] = useState(null);
    const [copiedKeyId, setCopiedKeyId] = useState(null);
    const [copyFailedKeyId, setCopyFailedKeyId] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [quickImportMenu, setQuickImportMenu] = useState(null);
    const [quickImportResult, setQuickImportResult] = useState(null);
    const [quickImportAppUnavailable, setQuickImportAppUnavailable] = useState(false);
    const [quickImportDeepLink, setQuickImportDeepLink] = useState(null);
    const [quickImportAppPicker, setQuickImportAppPicker] = useState(null);
    const quickImportCloseTimerRef = useRef(null);
    const itemsPerPage = 10;
    // The row cell copies the raw (plaintext) key only. Keys without stored raw
    // key material (legacy rows) render masked and are not copyable.
    const copyKeyToClipboard = async (key) => {
        if (!key.rawKey) {
            return;
        }
        const result = await copyTextToClipboard(key.rawKey);
        if (result.ok) {
            setCopyFailedKeyId(null);
            setCopiedKeyId(key.id);
            window.setTimeout(() => {
                setCopiedKeyId((current) => (current === key.id ? null : current));
            }, 1500);
            return;
        }
        setCopiedKeyId(null);
        setCopyFailedKeyId(key.id);
        window.setTimeout(() => {
            setCopyFailedKeyId((current) => (current === key.id ? null : current));
        }, 1500);
    };
    const openQuickImportMenu = (key, element) => {
        if (!key.rawKey) {
            return;
        }
        if (quickImportCloseTimerRef.current !== null) {
            window.clearTimeout(quickImportCloseTimerRef.current);
            quickImportCloseTimerRef.current = null;
        }
        const rect = element.getBoundingClientRect();
        const menuWidth = 200;
        const menuHeight = 104;
        setQuickImportMenu({
            keyId: key.id,
            top: rect.bottom + menuHeight <= window.innerHeight - 8 ? rect.bottom + 6 : rect.top - menuHeight - 6,
            left: Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8)),
        });
    };
    const scheduleCloseQuickImportMenu = () => {
        if (quickImportCloseTimerRef.current !== null) {
            window.clearTimeout(quickImportCloseTimerRef.current);
        }
        quickImportCloseTimerRef.current = window.setTimeout(() => {
            quickImportCloseTimerRef.current = null;
            setQuickImportMenu(null);
        }, 160);
    };
    const cancelCloseQuickImportMenu = () => {
        if (quickImportCloseTimerRef.current !== null) {
            window.clearTimeout(quickImportCloseTimerRef.current);
            quickImportCloseTimerRef.current = null;
        }
    };
    const selectQuickImportTarget = (targetId) => {
        const anchor = quickImportMenu;
        setQuickImportMenu(null);
        if (quickImportCloseTimerRef.current !== null) {
            window.clearTimeout(quickImportCloseTimerRef.current);
            quickImportCloseTimerRef.current = null;
        }
        if (!anchor) {
            return;
        }
        const key = keysData.find((item) => item.id === anchor.keyId);
        if (!key) {
            return;
        }
        const result = buildQuickImportResult(key, targetId);
        if (!result) {
            return;
        }
        const target = resolveQuickImportTarget(targetId);
        if (target.requiresManualImport) {
            // DeepSeek Harness does not accept the `v1/import` deep-link contract
            // yet: show the manual import dialog directly (config content + install
            // banner) instead of probing its `dsh://` protocol.
            setQuickImportAppUnavailable(true);
            setQuickImportResult(result);
            return;
        }
        if (target.requiresAppSelection) {
            // CC Switch keeps a separate provider list per app; ask which app the
            // relay provider belongs to before building the import link.
            setQuickImportAppPicker({ key, result, targetId });
            return;
        }
        // Birdcoder unifies model configuration: configure name / default model
        // in the same dialog without the app grid, then import directly. The
        // vendors/models are resolved by Birdcoder itself through the gateway
        // `/v1/vendors` endpoint at import time, so no vendor selection here.
        setQuickImportAppPicker({ key, result, targetId });
    };
    const openImportDeepLink = (key, targetId, app, result, options) => {
        const deeplink = buildQuickImportDeepLink(key, targetId, app, options);
        setQuickImportDeepLink(deeplink);
        // Preferred flow: hand off directly to the desktop app through its custom
        // protocol. When no app hand-off is detected (not installed / protocol not
        // registered) fall back to the manual import dialog with an install banner.
        if (!deeplink) {
            setQuickImportAppUnavailable(false);
            setQuickImportResult(result);
            return;
        }
        openDeeplink(deeplink, () => {
            setQuickImportAppUnavailable(true);
            setQuickImportResult(result);
        });
    };
    const retryQuickImportOpen = () => {
        if (!quickImportDeepLink) {
            return;
        }
        // The probe is a heuristic; a second attempt often succeeds when the first
        // one raced the app startup or the browser's protocol prompt.
        openDeeplink(quickImportDeepLink, () => {
            setQuickImportAppUnavailable(true);
        });
    };
    useEffect(() => {
        return () => {
            if (quickImportCloseTimerRef.current !== null) {
                window.clearTimeout(quickImportCloseTimerRef.current);
            }
        };
    }, []);
    const loadKeys = async (isActive = () => true) => {
        setLoading(true);
        try {
            const data = await ApiKeyService.fetchKeys({
                page: currentPage,
                pageSize: itemsPerPage,
                q: searchQuery.trim() || undefined,
            });
            if (!isActive()) {
                return;
            }
            setKeysData(data.keys);
            setTotalKeys(data.total);
            setError(null);
        }
        catch (reason) {
            if (!isActive()) {
                return;
            }
            setKeysData([]);
            setTotalKeys(0);
            setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.loadFallback', '令牌加载失败。'), t));
        }
        finally {
            if (isActive()) {
                setLoading(false);
            }
        }
    };
    useEffect(() => {
        let mounted = true;
        void loadKeys(() => mounted);
        return () => {
            mounted = false;
        };
    }, [currentPage, searchQuery, t]);
    /**
     * Ensures the account group list is loaded and returns it. Concurrent
     * callers share the in-flight request; the result is mirrored into
     * `groupsRef` so async flows (e.g. the import dialog vendor resolution)
     * can read it before React commits the state update.
     */
    const ensureGroupsLoaded = async () => {
        if (groupsLoaded) {
            return groupsRef.current;
        }
        if (groupsLoadingPromiseRef.current) {
            await groupsLoadingPromiseRef.current;
            return groupsRef.current;
        }
        setGroupsLoading(true);
        setError(null);
        groupsLoadingPromiseRef.current = (async () => {
            try {
                const items = await ApiKeyService.fetchGroups();
                groupsRef.current = items;
                setGroups(items);
                setGroupsLoaded(true);
            }
            catch (reason) {
                setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.loadGroupsFallback', '令牌分组加载失败。'), t));
            }
            finally {
                setGroupsLoading(false);
                groupsLoadingPromiseRef.current = null;
            }
        })();
        await groupsLoadingPromiseRef.current;
        return groupsRef.current;
    };
    /**
     * 懒加载模型厂商列表（sdkwork-models 权威主数据）。失败时保持 null，
     * GroupPicker 自动回退到分组选项去重推导。
     */
    const ensureVendorsLoaded = async () => {
        if (vendors !== null) {
            return;
        }
        setVendors(await fetchModelVendors());
    };
    const openCreateDrawer = async () => {
        setShowCreateDrawer(true);
        void ensureVendorsLoaded();
    };
    const openDetailsDrawer = async (key) => {
        setDetailsKey(key);
    };
    const openEditDrawer = async (key) => {
        setEditingKey(key);
        void ensureVendorsLoaded();
    };
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);
    const totalPages = Math.max(1, Math.ceil(totalKeys / itemsPerPage));
    const visibleStart = keysData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const visibleEnd = keysData.length > 0 ? Math.min(currentPage * itemsPerPage, totalKeys) : 0;
    const handleCreateSubmit = async (data) => {
        setCreating(true);
        setError(null);
        try {
            const created = [];
            const createdItems = [];
            for (const input of createApiKeyInputsFromForm(data)) {
                const result = await ApiKeyService.createKey(input);
                created.push({ key: result.key, rawKey: result.rawKey });
                createdItems.push(result.key);
            }
            setKeysData((previous) => [...createdItems, ...previous]);
            setCreatedKeys(created);
            setShowCreateDrawer(false);
            setShowSuccessModal(true);
        }
        catch (reason) {
            setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.createFallback', '令牌创建失败。'), t));
        }
        finally {
            setCreating(false);
        }
    };
    const handleEditSubmit = async (data) => {
        if (!editingKey) {
            return;
        }
        setMutatingKeyId(editingKey.id);
        setError(null);
        try {
            const chain = chainInputFromForm(data);
            const updated = await ApiKeyService.updateKey(editingKey.id, {
                name: data.name,
                accountGroups: data.accountGroups,
                quota: data.quota,
                isUnlimitedQuota: data.isUnlimitedQuota,
                modalities: data.modalities,
                ipLimit: data.ipLimit,
                expires: data.expires,
                chain,
            });
            setKeysData((previous) => previous.map((item) => mergeUpdatedApiKey(item, updated)));
            setEditingKey(null);
        }
        catch (reason) {
            setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.updateFallback', '令牌更新失败。'), t));
        }
        finally {
            setMutatingKeyId(null);
        }
    };
    const boundGroupsFor = (key) => {
        const bound = key.accountGroups.length > 0 ? key.accountGroups : [key.accountGroup.trim()];
        return bound.filter((code) => code.length > 0);
    };
    const handleGroupChange = async (key, groups) => {
        const normalized = groups.map((code) => code.trim()).filter((code) => code.length > 0);
        const current = boundGroupsFor(key);
        if (normalized.length === current.length &&
            normalized.every((code, index) => code === current[index])) {
            return;
        }
        setMutatingKeyId(key.id);
        setError(null);
        try {
            const updated = await ApiKeyService.updateKey(key.id, { accountGroups: normalized });
            setKeysData((previous) => previous.map((item) => mergeUpdatedApiKey(item, updated)));
        }
        catch (reason) {
            setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.groupUpdateFallback', '令牌分组更新失败。'), t));
        }
        finally {
            setMutatingKeyId(null);
        }
    };
    const handleDeleteConfirm = async () => {
        if (!deletingKey) {
            return;
        }
        setMutatingKeyId(deletingKey.id);
        setError(null);
        try {
            await ApiKeyService.deleteKey(deletingKey.id);
            setKeysData((previous) => previous.filter((item) => item.id !== deletingKey.id));
            setDeletingKey(null);
        }
        catch (reason) {
            setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.deleteFallback', '令牌删除失败。'), t));
        }
        finally {
            setMutatingKeyId(null);
        }
    };
    const closeSuccessDialog = () => {
        setShowSuccessModal(false);
        setCreatedKeys([]);
    };
    const handleCreatedKeyUsageDetails = (key) => {
        setShowSuccessModal(false);
        setCreatedKeys([]);
        setUsageDetailsKey(key);
    };
    const renderModalities = (modes) => {
        return (_jsxs("div", { className: "flex items-center gap-1.5", children: [modes.includes('text') && _jsx(ModalityIcon, { title: t('common.modality.text', '文本'), icon: _jsx(MessageSquare, { className: "w-3.5 h-3.5" }), className: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-500" }), modes.includes('image') && _jsx(ModalityIcon, { title: t('common.modality.image', '图像'), icon: _jsx(ImageIcon, { className: "w-3.5 h-3.5" }), className: "bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/20 text-pink-500" }), modes.includes('video') && _jsx(ModalityIcon, { title: t('common.modality.video', '视频'), icon: _jsx(Video, { className: "w-3.5 h-3.5" }), className: "bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-500" }), modes.includes('audio') && _jsx(ModalityIcon, { title: t('common.modality.audio', '音频'), icon: _jsx(Mic, { className: "w-3.5 h-3.5" }), className: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-500" }), modes.includes('music') && _jsx(ModalityIcon, { title: t('common.modality.music', '音乐'), icon: _jsx(Music, { className: "w-3.5 h-3.5" }), className: "bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20 text-sky-500" })] }));
    };
    const groupPickerOptionsFor = (key) => {
        const options = toGroupPickerOptions(groups);
        const bound = boundGroupsFor(key);
        const missing = bound.filter((code) => !options.some((option) => option.value === code));
        if (missing.length === 0) {
            return options;
        }
        return [
            ...missing.map((code) => ({
                value: code,
                label: displayApiKeyGroupName(key, groups, t),
            })),
            ...options,
        ];
    };
    const boundGroupOptionsFor = (key) => {
        const bound = boundGroupsFor(key);
        return groupPickerOptionsFor(key).filter((option) => bound.includes(option.value));
    };
    return (_jsxs("div", { className: "mx-auto box-border flex h-full w-full flex-col gap-3 overflow-hidden bg-slate-50 animate-in fade-in duration-500 dark:bg-[#121212]", children: [_jsxs("div", { className: "shrink-0 flex flex-col gap-3 bg-white p-3 shadow-sm dark:bg-[#252525] md:flex-row md:items-center md:justify-between rounded-xl border border-slate-200 dark:border-white/5", "data-console-api-keys-toolbar": true, children: [_jsxs("div", { className: "relative w-full sm:w-72", "data-console-api-keys-search": true, children: [_jsx(Search, { className: "w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" }), _jsx("input", { type: "text", value: searchQuery, onChange: (event) => {
                                    setSearchQuery(event.target.value);
                                    setCurrentPage(1);
                                }, placeholder: t('console.apiKeys.searchPlaceholder', '搜索令牌或分组'), className: "w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-shadow text-slate-800 dark:text-white placeholder:text-slate-400" })] }), _jsx("div", { className: "flex w-full items-center justify-end sm:w-auto", children: _jsxs("button", { "data-console-api-keys-primary-action": true, onClick: () => {
                                void openCreateDrawer();
                            }, className: "flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-primary-700 sm:w-auto", children: [_jsx(Plus, { className: "w-4 h-4" }), " ", t('common.actions.createKey')] }) })] }), error && (_jsxs("div", { className: "shrink-0 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2", children: [_jsx(AlertCircle, { className: "w-4 h-4" }), error, _jsx("button", { onClick: () => setError(null), className: "ml-auto text-rose-500 hover:text-rose-700", children: _jsx(X, { className: "w-4 h-4" }) })] })), _jsxs("div", { className: "bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/5 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 w-full", children: [_jsx("div", { className: "flex-1 min-h-0 overflow-auto custom-scrollbar", children: _jsxs("table", { className: "w-full text-left text-sm whitespace-nowrap min-w-[1120px]", children: [_jsx("thead", { className: "sticky top-0 z-10 bg-slate-50 dark:bg-[#1e1e1e] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/5 text-xs font-semibold uppercase tracking-wider", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3", children: t('console.apiKeys.nameToken', '名称 / 令牌') }), _jsx("th", { className: "px-3 py-3", children: t('console.apiKeys.group', '分组') }), _jsx("th", { className: "px-3 py-3", children: t('console.apiKeys.quota', '额度') }), _jsx("th", { className: "px-3 py-3", children: t('console.apiKeys.modalities', '模态') }), _jsx("th", { className: "px-3 py-3", children: t('console.apiKeys.ipAcl', 'IP 访问控制') }), _jsx("th", { className: "px-3 py-3", children: t('console.apiKeys.status', '状态') }), _jsx("th", { className: "px-3 py-3", children: t('console.apiKeys.created', '创建时间') }), _jsx("th", { className: "px-3 py-3", children: t('console.apiKeys.expiration', '过期时间') }), _jsx("th", { className: "px-4 py-3 text-right", children: t('common.actions.actions', '操作') })] }) }), _jsxs("tbody", { className: "divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300 text-sm", children: [loading && (_jsx("tr", { children: _jsxs("td", { colSpan: 9, className: "text-center py-20 text-slate-500", children: [_jsx(Loader2, { className: "w-5 h-5 animate-spin inline-block mr-2" }), t('console.apiKeys.loading', '正在加载令牌')] }) })), !loading &&
                                            keysData.map((key) => (_jsxs("tr", { className: "hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group", children: [_jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex flex-col gap-1.5", children: [_jsx("span", { className: "font-bold text-slate-800 dark:text-white", children: key.displayName || t('console.apiKeys.unnamed', '令牌 #{{id}}', { id: key.id }) }), _jsx("div", { className: "flex items-center gap-2", children: _jsxs("button", { type: "button", disabled: !key.rawKey, onClick: () => {
                                                                            void copyKeyToClipboard(key);
                                                                        }, title: key.rawKey ? t('common.actions.copyKey') : undefined, "aria-label": key.rawKey ? t('common.actions.copyKey') : undefined, className: "group/secret inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 disabled:cursor-not-allowed dark:border-white/5 dark:bg-[#1e1e1e] dark:text-slate-300 dark:hover:border-primary-500/30 dark:hover:bg-primary-500/10 dark:hover:text-primary-300", children: [_jsx("span", { className: "max-w-[240px] truncate", children: key.rawKey ?? key.maskedKey }), copiedKeyId === key.id ? (_jsx(Check, { className: "h-3 w-3 shrink-0 text-emerald-500" })) : copyFailedKeyId === key.id ? (_jsx(AlertCircle, { className: "h-3 w-3 shrink-0 text-rose-500" })) : key.rawKey ? (_jsx(Copy, { className: "h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/secret:opacity-100" })) : null, _jsx("span", { role: "status", "aria-live": "polite", className: "sr-only", children: copiedKeyId === key.id
                                                                                    ? t('common.actions.keyCopied')
                                                                                    : copyFailedKeyId === key.id
                                                                                        ? t('common.actions.copyFailed', '复制失败')
                                                                                        : '' })] }) })] }) }), _jsx("td", { className: "px-3 py-3", children: _jsx(GroupCellPopover, { options: boundGroupOptionsFor(key), onHoverOpen: () => {
                                                                void ensureGroupsLoaded();
                                                            }, onEdit: () => {
                                                                groupPickerHandlesRef.current[key.id]?.open();
                                                            }, labels: {
                                                                title: t('console.apiKeys.group', '分组'),
                                                                empty: t('console.apiKeys.groupUnassigned', '未绑定分组'),
                                                                editHint: t('console.apiKeys.editGroupsHint', '修改分组'),
                                                            }, children: _jsx(GroupPicker, { ref: (handle) => {
                                                                    groupPickerHandlesRef.current[key.id] = handle;
                                                                }, disableTriggerOpen: true, selectionMode: "multiple", options: groupPickerOptionsFor(key), vendors: vendors ?? undefined, value: boundGroupsFor(key), onChange: (next) => {
                                                                    void handleGroupChange(key, next);
                                                                }, disabled: mutatingKeyId === key.id, triggerLabel: displayApiKeyGroupName(key, groups, t), triggerClassName: "h-7 max-w-[180px] rounded border border-primary-200 bg-primary-50 px-1.5 text-[10px] font-bold uppercase tracking-wider text-primary-600 hover:bg-primary-100 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-400 dark:hover:bg-primary-500/20", labels: {
                                                                    triggerPlaceholder: t('console.apiKeys.group', '分组'),
                                                                    title: t('console.apiKeys.groupPickerTitle', '选择分组'),
                                                                    searchPlaceholder: t('console.apiKeys.searchGroups', '搜索分组'),
                                                                    empty: t('console.apiKeys.emptyGroups', '暂无分组'),
                                                                    emptySearch: t('console.apiKeys.noMatchingGroups', '无匹配分组'),
                                                                    emptySelected: t('console.apiKeys.emptySelectedGroups', '未选择分组'),
                                                                    vendorAll: t('console.apiKeys.vendorAll', '全部厂商'),
                                                                    modalityAll: t('console.apiKeys.modalityAll', '全部模态'),
                                                                    available: (count) => t('console.apiKeys.availableGroups', '{{count}} 个可用分组', { count }),
                                                                    selected: (count) => t('console.apiKeys.selectedGroups', '{{count}} 个已选分组', { count }),
                                                                    selectedCount: (count) => t('console.apiKeys.selectedCount', '已选 {{count}} 项', { count }),
                                                                    addAll: t('console.apiKeys.addAllGroups', '全部添加'),
                                                                    removeAll: t('console.apiKeys.removeAllGroups', '全部移除'),
                                                                    clear: t('common.actions.clear'),
                                                                    confirm: t('common.actions.confirm'),
                                                                    cancel: t('common.actions.cancel'),
                                                                    rate: t('console.apiKeys.rate', '倍率'),
                                                                    tagLabels: buildTagLabels(t),
                                                                }, onOpen: () => {
                                                                    void ensureGroupsLoaded();
                                                                    void ensureVendorsLoaded();
                                                                } }) }) }), _jsx("td", { className: "px-3 py-3", children: _jsxs("div", { className: "flex flex-col gap-1 text-[11px]", children: [_jsxs("span", { className: "text-lobster-500 dark:text-lobster-400 font-mono font-bold flex items-center gap-1", children: [_jsx(Zap, { className: "w-3 h-3" }), " ", formatApiKeyNumber(key.usedQuota, i18n.language)] }), _jsxs("span", { className: "text-slate-500 font-mono font-medium", children: ["/ ", formatApiKeyQuota(key.quota, t, i18n.language)] })] }) }), _jsx("td", { className: "px-3 py-3", children: renderModalities(key.modalities) }), _jsx("td", { className: "px-3 py-3", children: key.ipLimit === 'unrestricted' ? (_jsxs("span", { className: "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 flex items-center gap-1 w-fit rounded text-[11px] font-mono font-medium", children: [_jsx(Unlock, { className: "w-3 h-3" }), " ", formatApiKeyIpLimit(key.ipLimit, t)] })) : (_jsxs("span", { className: "bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 px-2 py-1 flex items-center gap-1 w-fit rounded text-[11px] font-mono font-medium", children: [_jsx(Lock, { className: "w-3 h-3" }), " ", key.ipLimit] })) }), _jsx("td", { className: "px-3 py-3", children: _jsx("div", { className: "flex flex-col items-start gap-1.5", children: _jsxs("span", { className: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2 flex items-center gap-1 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide w-fit", children: [_jsx(CheckSquare, { className: "w-3 h-3" }), " ", displayApiKeyStatus(key.status, t)] }) }) }), _jsx("td", { className: "px-3 py-3", children: _jsx("span", { className: "text-[11px] font-mono text-slate-700 dark:text-slate-300 font-medium", title: key.created, children: formatApiKeyCreated(key.created, i18n.language) }) }), _jsx("td", { className: "px-3 py-3", children: _jsx("span", { className: `text-[11px] font-mono ${key.expires === 'never' ? 'text-emerald-500' : 'text-slate-500'}`, title: key.expires === 'never' ? undefined : key.expires, children: formatApiKeyExpiration(key.expires, t, i18n.language) }) }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx("div", { className: "relative", onMouseEnter: (event) => openQuickImportMenu(key, event.currentTarget), onMouseLeave: scheduleCloseQuickImportMenu, children: _jsxs("button", { type: "button", disabled: !key.rawKey, onClick: (event) => {
                                                                            if (quickImportMenu?.keyId === key.id) {
                                                                                setQuickImportMenu(null);
                                                                            }
                                                                            else {
                                                                                openQuickImportMenu(key, event.currentTarget);
                                                                            }
                                                                        }, className: "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-lobster-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-transparent dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-lobster-400", title: key.rawKey
                                                                            ? t('console.apiKeys.quickImport', '导入到')
                                                                            : t('console.apiKeys.quickImport.noPlaintext', '该令牌无明文值，无法快速导入'), "aria-label": key.rawKey
                                                                            ? t('console.apiKeys.quickImport', '导入到')
                                                                            : t('console.apiKeys.quickImport.noPlaintext', '该令牌无明文值，无法快速导入'), children: [_jsx(Download, { className: "h-3.5 w-3.5" }), t('console.apiKeys.quickImport', '导入到')] }) }), _jsx("button", { onClick: () => setUsageDetailsKey(key), className: "bg-lobster-50 dark:bg-lobster-500/10 hover:bg-lobster-100 dark:hover:bg-lobster-500/20 text-lobster-700 dark:text-lobster-300 border border-lobster-200 dark:border-lobster-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors", children: t('console.apiKeys.usageDetails', '使用详情') }), _jsx("button", { onClick: () => {
                                                                        void openDetailsDrawer(key);
                                                                    }, className: "bg-primary-50 dark:bg-primary-500/10 hover:bg-primary-100 dark:hover:bg-primary-500/20 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors", children: t('common.actions.details') }), _jsx("button", { type: "button", onClick: () => {
                                                                        void openEditDrawer(key);
                                                                    }, className: "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:text-primary-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5", title: t('common.actions.edit', '编辑'), "aria-label": t('common.actions.edit', '编辑'), children: _jsx(Edit3, { className: "h-3.5 w-3.5" }) }), _jsx("button", { type: "button", onClick: () => setDeletingKey(key), disabled: mutatingKeyId === key.id, className: "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/20 dark:hover:bg-rose-500/10", title: t('common.actions.delete', '删除'), "aria-label": t('common.actions.delete', '删除'), children: _jsx(Trash2, { className: "h-3.5 w-3.5" }) })] }) })] }, key.id))), !loading && keysData.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 9, className: "text-center py-20 text-slate-500", children: t('console.apiKeys.empty', '暂无令牌') }) }))] })] }) }), _jsxs("div", { className: "shrink-0 p-3 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#1e1e1e]/50", children: [_jsx("div", { children: t('console.apiKeys.showing', {
                                    defaultValue: 'Showing {{start}} - {{end}} of {{total}}',
                                    start: visibleStart,
                                    end: visibleEnd,
                                    total: totalKeys,
                                }) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { disabled: currentPage === 1 || loading, onClick: () => setCurrentPage((page) => Math.max(1, page - 1)), className: "p-1.5 border border-slate-200 dark:border-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-300 rounded disabled:opacity-50 transition-colors", children: _jsx(ChevronLeft, { className: "w-4 h-4" }) }), _jsx("div", { className: "bg-primary-600 text-white min-w-[28px] h-7 px-2 rounded flex items-center justify-center font-bold shadow-sm", children: currentPage }), _jsx("button", { disabled: currentPage === totalPages || loading, onClick: () => setCurrentPage((page) => Math.min(totalPages, page + 1)), className: "p-1.5 border border-slate-200 dark:border-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-300 rounded disabled:opacity-50 transition-colors", children: _jsx(ChevronRight, { className: "w-4 h-4" }) })] })] })] }), _jsx(CreateKeyDrawer, { isOpen: showCreateDrawer, mode: "create", groups: groups, groupsLoading: groupsLoading, vendors: vendors ?? undefined, submitting: creating, onRequestGroups: () => {
                    void ensureGroupsLoaded();
                }, onClose: () => setShowCreateDrawer(false), onSubmit: handleCreateSubmit }), _jsx(CreateKeyDrawer, { isOpen: !!detailsKey, mode: "view", initialData: detailsKey, groups: groups, groupsLoading: groupsLoading, vendors: vendors ?? undefined, onRequestGroups: () => {
                    void ensureGroupsLoaded();
                }, onClose: () => setDetailsKey(null) }), _jsx(ApiKeyUsageDetailsDrawer, { isOpen: !!usageDetailsKey, apiKey: usageDetailsKey, onClose: () => setUsageDetailsKey(null) }), quickImportMenu &&
                createPortal(_jsx("div", { className: "fixed z-[200] w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-white/10 dark:bg-[#1e1e1e]", style: { top: quickImportMenu.top, left: quickImportMenu.left }, onMouseEnter: cancelCloseQuickImportMenu, onMouseLeave: scheduleCloseQuickImportMenu, children: QUICK_IMPORT_TARGETS.map((target) => (_jsxs("button", { type: "button", onClick: () => selectQuickImportTarget(target.id), className: "flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-primary-50 hover:text-primary-700 dark:text-slate-200 dark:hover:bg-primary-500/10 dark:hover:text-primary-300", children: [target.id === 'birdcoder' ? (_jsx(Bird, { className: "h-4 w-4 shrink-0 text-lobster-500" })) : target.id === 'deepseek-harness' ? (_jsx(Bot, { className: "h-4 w-4 shrink-0 text-primary-500" })) : (_jsx(Repeat, { className: "h-4 w-4 shrink-0 text-primary-500" })), _jsx("span", { className: "truncate", children: t(target.labelKey, target.fallbackLabel) })] }, target.id))) }), document.body), quickImportAppPicker && ((() => {
                const target = resolveQuickImportTarget(quickImportAppPicker.targetId);
                return (_jsx(QuickImportAppPickerDialog, { keyName: quickImportAppPicker.result.keyName, maskedKey: quickImportAppPicker.result.maskedKey, rawKey: quickImportAppPicker.key.rawKey ?? '', showAppSelection: target.requiresAppSelection ? undefined : false, confirmLabel: target.requiresAppSelection
                        ? undefined
                        : t(target.labelKey, target.fallbackLabel), onSelect: (app, options) => {
                        const picker = quickImportAppPicker;
                        setQuickImportAppPicker(null);
                        openImportDeepLink(picker.key, picker.targetId, app, picker.result, options);
                    }, onClose: () => setQuickImportAppPicker(null) }));
            })()), quickImportResult && (_jsx(QuickImportResultDialog, { result: quickImportResult, appUnavailable: quickImportAppUnavailable, onRetryOpen: quickImportDeepLink ? retryQuickImportOpen : undefined, onClose: () => {
                    setQuickImportAppUnavailable(false);
                    setQuickImportDeepLink(null);
                    setQuickImportResult(null);
                } })), _jsx(CreateKeyDrawer, { isOpen: !!editingKey, mode: "edit", initialData: editingKey, groups: groups, groupsLoading: groupsLoading, vendors: vendors ?? undefined, onRequestGroups: () => {
                    void ensureGroupsLoaded();
                }, submitting: mutatingKeyId === editingKey?.id, onClose: () => setEditingKey(null), onSubmit: handleEditSubmit }), deletingKey && (_jsx(ConfirmDialog, { title: t('console.apiKeys.deleteTitle', '删除令牌？'), description: t('console.apiKeys.deleteDescription', 'This API key will be revoked and removed from the list. Existing clients using it will stop working.'), confirmLabel: t('common.actions.delete', '删除'), cancelLabel: t('common.actions.cancel', '取消'), isBusy: mutatingKeyId === deletingKey.id, tone: "danger", icon: _jsx(Trash2, { className: "h-4 w-4" }), onConfirm: () => {
                    void handleDeleteConfirm();
                }, onCancel: () => setDeletingKey(null) })), _jsx(AnimatePresence, { children: showSuccessModal && createdKeys.length > 0 && (_jsx("div", { className: "fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm", onPointerDown: (event) => {
                        if (event.target === event.currentTarget) {
                            closeSuccessDialog();
                        }
                    }, children: _jsxs(motion.div, { initial: { opacity: 0, scale: 0.95 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.95 }, className: "bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden", onClick: (event) => event.stopPropagation(), children: [_jsx("div", { className: "px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]", children: _jsxs("h2", { className: "text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2", children: [_jsx(Check, { className: "w-5 h-5 text-emerald-500" }), " ", t('console.apiKeys.createdTitle', '令牌已创建')] }) }), _jsxs("div", { className: "p-6 space-y-4", children: [createdKeys.map((item) => (_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "block text-sm font-bold text-slate-700 dark:text-slate-300", children: item.key.displayName || t('console.apiKeys.unnamed', '令牌 #{{id}}', { id: item.key.id }) }), _jsxs("div", { className: "flex items-center gap-2 relative", children: [_jsx("input", { type: "text", readOnly: true, value: item.rawKey, className: "w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 pl-4 pr-12 py-3.5 rounded-xl text-sm font-mono text-slate-800 dark:text-white shadow-inner focus:outline-none" }), _jsx(CopyButton, { text: item.rawKey, label: t('common.actions.copyKey'), copiedLabel: t('common.actions.keyCopied'), className: "absolute right-2 p-2 bg-white dark:bg-[#252525] text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-white rounded-lg border border-slate-200 dark:border-white/10 transition-colors shadow-sm", title: t('common.actions.copyKey') })] }), _jsx("button", { type: "button", onClick: () => handleCreatedKeyUsageDetails(item.key), className: "inline-flex w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20", children: t('console.apiKeys.usageDetails', '使用详情') })] }, `${item.key.id}-${item.rawKey}`))), _jsx("div", { className: "pt-2 flex justify-end", children: _jsx("button", { onClick: closeSuccessDialog, className: "px-6 py-2.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors w-full shadow-sm", children: t('common.actions.close') }) })] })] }) })) })] }));
}
function ModalityIcon({ title, icon, className }) {
    return (_jsx("div", { className: `w-6 h-6 rounded flex items-center justify-center border cursor-help ${className}`, title: title, children: icon }));
}
function mergeUpdatedApiKey(current, updated) {
    if (current.id !== updated.id) {
        return current;
    }
    return updated;
}
function displayApiKeyStatus(status, t) {
    return status === 'enabled'
        ? t('console.apiKeys.status.enabled', '启用中')
        : t('console.apiKeys.status.disabled', '已停用');
}
//# sourceMappingURL=ApiKeysView.js.map