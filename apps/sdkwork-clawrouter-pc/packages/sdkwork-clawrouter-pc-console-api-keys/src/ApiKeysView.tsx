import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Bird,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  Image as ImageIcon,
  Loader2,
  Lock,
  MessageSquare,
  Mic,
  Music,
  Plus,
  Repeat,
  Search,
  Trash2,
  Unlock,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@sdkwork/clawroutes-pc-commons/components/ConfirmDialog';
import { CopyButton } from '@sdkwork/clawroutes-pc-commons/components/CopyButton';
import { copyTextToClipboard } from '@sdkwork/clawroutes-pc-commons/clipboard';
import {
  GroupPicker,
  type GroupPickerOption,
} from '@sdkwork/clawroutes-pc-commons/components/GroupPicker';
import { CreateKeyDrawer, type ApiKeyFormValues } from './CreateKeyDrawer';
import { chainInputFromForm, createApiKeyInputsFromForm } from './apiKeyForm';
import { ApiKeyService, type AccountGroup, type ApiKey } from './apiKeyService';
import { toGroupPickerOptions } from './accountGroups';
import {
  displayApiKeyGroupName,
  formatApiKeyCreated,
  formatApiKeyExpiration,
  formatApiKeyIpLimit,
  formatApiKeyNumber,
  formatApiKeyQuota,
} from './display';
import { ApiKeyUsageDetailsDrawer } from './usage-details/ApiKeyUsageDetailsDrawer';
import {
  buildQuickImportResult,
  QUICK_IMPORT_TARGETS,
  type QuickImportResult,
  type QuickImportTargetId,
} from './quick-import/quickImport';
import { QuickImportResultDialog } from './quick-import/QuickImportResultDialog';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

interface CreatedSecret {
  key: ApiKey;
  rawKey: string;
}

function getApiKeyProductErrorMessage(error: unknown, fallback: string, t: TranslationFunction): string {
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
  const [keysData, setKeysData] = useState<ApiKey[]>([]);
  const [totalKeys, setTotalKeys] = useState(0);
  const [groups, setGroups] = useState<AccountGroup[]>([]);
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdKeys, setCreatedKeys] = useState<CreatedSecret[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [usageDetailsKey, setUsageDetailsKey] = useState<ApiKey | null>(null);
  const [detailsKey, setDetailsKey] = useState<ApiKey | null>(null);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [deletingKey, setDeletingKey] = useState<ApiKey | null>(null);
  const [mutatingKeyId, setMutatingKeyId] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copyFailedKeyId, setCopyFailedKeyId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [quickImportMenu, setQuickImportMenu] = useState<QuickImportMenuAnchor | null>(null);
  const [quickImportResult, setQuickImportResult] = useState<QuickImportResult | null>(null);
  const quickImportCloseTimerRef = useRef<number | null>(null);

  const itemsPerPage = 10;

  // The row cell copies the raw (plaintext) key only. Keys without stored raw
  // key material (legacy rows) render masked and are not copyable.
  const copyKeyToClipboard = async (key: ApiKey) => {
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

  const openQuickImportMenu = (key: ApiKey, element: HTMLElement) => {
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

  const selectQuickImportTarget = (targetId: QuickImportTargetId) => {
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
    if (result) {
      setQuickImportResult(result);
    }
  };

  useEffect(() => {
    return () => {
      if (quickImportCloseTimerRef.current !== null) {
        window.clearTimeout(quickImportCloseTimerRef.current);
      }
    };
  }, []);

  const loadKeys = async (isActive: () => boolean = () => true) => {
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
    } catch (reason) {
      if (!isActive()) {
        return;
      }
      setKeysData([]);
      setTotalKeys(0);
      setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.loadFallback', '令牌加载失败。'), t));
    } finally {
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

  const ensureGroupsLoaded = async () => {
    if (groupsLoaded || groupsLoading) {
      return;
    }
    setGroupsLoading(true);
    setError(null);
    try {
      const items = await ApiKeyService.fetchGroups();
      setGroups(items);
      setGroupsLoaded(true);
    } catch (reason) {
      setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.loadGroupsFallback', '令牌分组加载失败。'), t));
    } finally {
      setGroupsLoading(false);
    }
  };

  const openCreateDrawer = async () => {
    setShowCreateDrawer(true);
  };

  const openDetailsDrawer = async (key: ApiKey) => {
    setDetailsKey(key);
  };

  const openEditDrawer = async (key: ApiKey) => {
    setEditingKey(key);
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(totalKeys / itemsPerPage));
  const visibleStart = keysData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const visibleEnd = keysData.length > 0 ? Math.min(currentPage * itemsPerPage, totalKeys) : 0;

  const handleCreateSubmit = async (data: ApiKeyFormValues) => {
    setCreating(true);
    setError(null);
    try {
      const created: CreatedSecret[] = [];
      const createdItems: ApiKey[] = [];
      for (const input of createApiKeyInputsFromForm(data)) {
        const result = await ApiKeyService.createKey(input);
        created.push({ key: result.key, rawKey: result.rawKey });
        createdItems.push(result.key);
      }
      setKeysData((previous) => [...createdItems, ...previous]);
      setCreatedKeys(created);
      setShowCreateDrawer(false);
      setShowSuccessModal(true);
    } catch (reason) {
      setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.createFallback', '令牌创建失败。'), t));
    } finally {
      setCreating(false);
    }
  };

  const handleEditSubmit = async (data: ApiKeyFormValues) => {
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
    } catch (reason) {
      setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.updateFallback', '令牌更新失败。'), t));
    } finally {
      setMutatingKeyId(null);
    }
  };

  const boundGroupsFor = (key: ApiKey): string[] => {
    const bound = key.accountGroups.length > 0 ? key.accountGroups : [key.accountGroup.trim()];
    return bound.filter((code) => code.length > 0);
  };

  const handleGroupChange = async (key: ApiKey, groups: string[]) => {
    const normalized = groups.map((code) => code.trim()).filter((code) => code.length > 0);
    const current = boundGroupsFor(key);
    if (
      normalized.length === current.length &&
      normalized.every((code, index) => code === current[index])
    ) {
      return;
    }
    setMutatingKeyId(key.id);
    setError(null);
    try {
      const updated = await ApiKeyService.updateKey(key.id, { accountGroups: normalized });
      setKeysData((previous) => previous.map((item) => mergeUpdatedApiKey(item, updated)));
    } catch (reason) {
      setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.groupUpdateFallback', '令牌分组更新失败。'), t));
    } finally {
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
    } catch (reason) {
      setError(getApiKeyProductErrorMessage(reason, t('console.apiKeys.errors.deleteFallback', '令牌删除失败。'), t));
    } finally {
      setMutatingKeyId(null);
    }
  };

  const closeSuccessDialog = () => {
    setShowSuccessModal(false);
    setCreatedKeys([]);
  };

  const handleCreatedKeyUsageDetails = (key: ApiKey) => {
    setShowSuccessModal(false);
    setCreatedKeys([]);
    setUsageDetailsKey(key);
  };

  const renderModalities = (modes: string[]) => {
    return (
      <div className="flex items-center gap-1.5">
        {modes.includes('text') && <ModalityIcon title={t('common.modality.text', '文本')} icon={<MessageSquare className="w-3.5 h-3.5" />} className="bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-500" />}
        {modes.includes('image') && <ModalityIcon title={t('common.modality.image', '图像')} icon={<ImageIcon className="w-3.5 h-3.5" />} className="bg-pink-50 dark:bg-pink-500/10 border-pink-200 dark:border-pink-500/20 text-pink-500" />}
        {modes.includes('video') && <ModalityIcon title={t('common.modality.video', '视频')} icon={<Video className="w-3.5 h-3.5" />} className="bg-purple-50 dark:bg-purple-500/10 border-purple-200 dark:border-purple-500/20 text-purple-500" />}
        {modes.includes('audio') && <ModalityIcon title={t('common.modality.audio', '音频')} icon={<Mic className="w-3.5 h-3.5" />} className="bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-500" />}
        {modes.includes('music') && <ModalityIcon title={t('common.modality.music', '音乐')} icon={<Music className="w-3.5 h-3.5" />} className="bg-sky-50 dark:bg-sky-500/10 border-sky-200 dark:border-sky-500/20 text-sky-500" />}
      </div>
    );
  };

  const groupPickerOptionsFor = (key: ApiKey): GroupPickerOption[] => {
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

  return (
    <div className="mx-auto box-border flex h-full w-full flex-col gap-3 overflow-hidden bg-slate-50 animate-in fade-in duration-500 dark:bg-[#121212]">
      <div className="shrink-0 flex flex-col gap-3 bg-white p-3 shadow-sm dark:bg-[#252525] md:flex-row md:items-center md:justify-between rounded-xl border border-slate-200 dark:border-white/5" data-console-api-keys-toolbar>
        <div className="relative w-full sm:w-72" data-console-api-keys-search>
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            placeholder={t('console.apiKeys.searchPlaceholder', '搜索令牌或分组')}
            className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-shadow text-slate-800 dark:text-white placeholder:text-slate-400"
          />
        </div>

        <div className="flex w-full items-center justify-end sm:w-auto">
          <button
            data-console-api-keys-primary-action
            onClick={() => {
              void openCreateDrawer();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 sm:w-auto"
          >
            <Plus className="w-4 h-4" /> {t('common.actions.createKey')}
          </button>
        </div>
      </div>

      {error && (
        <div className="shrink-0 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/5 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0 w-full">
        <div className="flex-1 min-h-0 overflow-auto custom-scrollbar">
          <table className="w-full text-left text-sm whitespace-nowrap min-w-[1120px]">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#1e1e1e] text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/5 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">{t('console.apiKeys.nameToken', '名称 / 令牌')}</th>
                <th className="px-3 py-3">{t('console.apiKeys.group', '分组')}</th>
                <th className="px-3 py-3">{t('console.apiKeys.quota', '额度')}</th>
                <th className="px-3 py-3">{t('console.apiKeys.modalities', '模态')}</th>
                <th className="px-3 py-3">{t('console.apiKeys.ipAcl', 'IP 访问控制')}</th>
                <th className="px-3 py-3">{t('console.apiKeys.status', '状态')}</th>
                <th className="px-3 py-3">{t('console.apiKeys.created', '创建时间')}</th>
                <th className="px-3 py-3">{t('console.apiKeys.expiration', '过期时间')}</th>
                <th className="px-4 py-3 text-right">{t('common.actions.actions', '操作')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5 text-slate-700 dark:text-slate-300 text-sm">
              {loading && (
                <tr>
                  <td colSpan={9} className="text-center py-20 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                    {t('console.apiKeys.loading', '正在加载令牌')}
                  </td>
                </tr>
              )}

              {!loading &&
                keysData.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group">
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <span className="font-bold text-slate-800 dark:text-white">{key.displayName || t('console.apiKeys.unnamed', '令牌 #{{id}}', { id: key.id })}</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!key.rawKey}
                            onClick={() => {
                              void copyKeyToClipboard(key);
                            }}
                            title={key.rawKey ? t('common.actions.copyKey') : undefined}
                            aria-label={key.rawKey ? t('common.actions.copyKey') : undefined}
                            className="group/secret inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed dark:border-white/5 dark:bg-[#1e1e1e] dark:text-slate-300 dark:hover:border-blue-500/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
                          >
                            <span className="max-w-[240px] truncate">{key.rawKey ?? key.maskedKey}</span>
                            {copiedKeyId === key.id ? (
                              <Check className="h-3 w-3 shrink-0 text-emerald-500" />
                            ) : copyFailedKeyId === key.id ? (
                              <AlertCircle className="h-3 w-3 shrink-0 text-rose-500" />
                            ) : key.rawKey ? (
                              <Copy className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover/secret:opacity-100" />
                            ) : null}
                            <span role="status" aria-live="polite" className="sr-only">
                              {copiedKeyId === key.id
                                ? t('common.actions.keyCopied')
                                : copyFailedKeyId === key.id
                                  ? t('common.actions.copyFailed', '复制失败')
                                  : ''}
                            </span>
                          </button>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <GroupPicker
                          selectionMode="multiple"
                          options={groupPickerOptionsFor(key)}
                          value={boundGroupsFor(key)}
                          onChange={(next) => {
                            void handleGroupChange(key, next);
                          }}
                          disabled={mutatingKeyId === key.id}
                          triggerLabel={displayApiKeyGroupName(key, groups, t)}
                          triggerClassName="h-7 max-w-[180px] rounded border border-blue-200 bg-blue-50 px-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:bg-blue-100 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-400 dark:hover:bg-blue-500/20"
                          labels={{
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
                          }}
                          onOpen={() => {
                            void ensureGroupsLoaded();
                          }}
                        />
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1 text-[11px]">
                        <span className="text-amber-600 dark:text-amber-500 font-mono font-bold flex items-center gap-1">
                          <Zap className="w-3 h-3" /> {formatApiKeyNumber(key.usedQuota, i18n.language)}
                        </span>
                        <span className="text-slate-500 font-mono font-medium">/ {formatApiKeyQuota(key.quota, t, i18n.language)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3">{renderModalities(key.modalities)}</td>
                    <td className="px-3 py-3">
                      {key.ipLimit === 'unrestricted' ? (
                        <span className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 flex items-center gap-1 w-fit rounded text-[11px] font-mono font-medium">
                          <Unlock className="w-3 h-3" /> {formatApiKeyIpLimit(key.ipLimit, t)}
                        </span>
                      ) : (
                        <span className="bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 px-2 py-1 flex items-center gap-1 w-fit rounded text-[11px] font-mono font-medium">
                          <Lock className="w-3 h-3" /> {key.ipLimit}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-col items-start gap-1.5">
                        <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2 flex items-center gap-1 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide w-fit">
                          <CheckSquare className="w-3 h-3" /> {displayApiKeyStatus(key.status, t)}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 font-medium" title={key.created}>
                        {formatApiKeyCreated(key.created, i18n.language)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`text-[11px] font-mono ${key.expires === 'never' ? 'text-emerald-500' : 'text-slate-500'}`}
                        title={key.expires === 'never' ? undefined : key.expires}
                      >
                        {formatApiKeyExpiration(key.expires, t, i18n.language)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div
                          className="relative"
                          onMouseEnter={(event) => openQuickImportMenu(key, event.currentTarget)}
                          onMouseLeave={scheduleCloseQuickImportMenu}
                        >
                          <button
                            type="button"
                            disabled={!key.rawKey}
                            onClick={(event) => {
                              if (quickImportMenu?.keyId === key.id) {
                                setQuickImportMenu(null);
                              } else {
                                openQuickImportMenu(key, event.currentTarget);
                              }
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-emerald-400"
                            title={key.rawKey
                              ? t('console.apiKeys.quickImport', '快速导入')
                              : t('console.apiKeys.quickImport.noPlaintext', '该令牌无明文值，无法快速导入')}
                            aria-label={key.rawKey
                              ? t('console.apiKeys.quickImport', '快速导入')
                              : t('console.apiKeys.quickImport.noPlaintext', '该令牌无明文值，无法快速导入')}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <button
                          onClick={() => setUsageDetailsKey(key)}
                          className="bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          {t('console.apiKeys.usageDetails', '使用详情')}
                        </button>
                        <button
                          onClick={() => {
                            void openDetailsDrawer(key);
                          }}
                          className="bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        >
                          {t('common.actions.details')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            void openEditDrawer(key);
                          }}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:text-blue-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5"
                          title={t('common.actions.edit', '编辑')}
                          aria-label={t('common.actions.edit', '编辑')}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingKey(key)}
                          disabled={mutatingKeyId === key.id}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-60 dark:border-rose-500/20 dark:hover:bg-rose-500/10"
                          title={t('common.actions.delete', '删除')}
                          aria-label={t('common.actions.delete', '删除')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && keysData.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-20 text-slate-500">
                    {t('console.apiKeys.empty', '暂无令牌')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 p-3 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row gap-3 items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#1e1e1e]/50">
          <div>
            {t('console.apiKeys.showing', {
              defaultValue: 'Showing {{start}} - {{end}} of {{total}}',
              start: visibleStart,
              end: visibleEnd,
              total: totalKeys,
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1 || loading}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="p-1.5 border border-slate-200 dark:border-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-300 rounded disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="bg-blue-600 text-white min-w-[28px] h-7 px-2 rounded flex items-center justify-center font-bold shadow-sm">
              {currentPage}
            </div>
            <button
              disabled={currentPage === totalPages || loading}
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              className="p-1.5 border border-slate-200 dark:border-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-500 dark:text-slate-300 rounded disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <CreateKeyDrawer
        isOpen={showCreateDrawer}
        mode="create"
        groups={groups}
        groupsLoading={groupsLoading}
        submitting={creating}
        onRequestGroups={() => {
          void ensureGroupsLoaded();
        }}
        onClose={() => setShowCreateDrawer(false)}
        onSubmit={handleCreateSubmit}
      />
      <CreateKeyDrawer
        isOpen={!!detailsKey}
        mode="view"
        initialData={detailsKey}
        groups={groups}
        groupsLoading={groupsLoading}
        onRequestGroups={() => {
          void ensureGroupsLoaded();
        }}
        onClose={() => setDetailsKey(null)}
      />
      <ApiKeyUsageDetailsDrawer
        isOpen={!!usageDetailsKey}
        apiKey={usageDetailsKey}
        onClose={() => setUsageDetailsKey(null)}
      />
      {quickImportMenu &&
        createPortal(
          <div
            className="fixed z-[130] w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-xl animate-in fade-in zoom-in-95 duration-150 dark:border-white/10 dark:bg-[#1e1e1e]"
            style={{ top: quickImportMenu.top, left: quickImportMenu.left }}
            onMouseEnter={cancelCloseQuickImportMenu}
            onMouseLeave={scheduleCloseQuickImportMenu}
          >
            {QUICK_IMPORT_TARGETS.map((target) => (
              <button
                key={target.id}
                type="button"
                onClick={() => selectQuickImportTarget(target.id)}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-700 dark:text-slate-200 dark:hover:bg-blue-500/10 dark:hover:text-blue-300"
              >
                {target.id === 'birdcoder'
                  ? <Bird className="h-4 w-4 shrink-0 text-lobster-500" />
                  : <Repeat className="h-4 w-4 shrink-0 text-blue-500" />}
                <span className="truncate">{t(target.labelKey, target.fallbackLabel)}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
      {quickImportResult && (
        <QuickImportResultDialog
          result={quickImportResult}
          onClose={() => setQuickImportResult(null)}
        />
      )}
      <CreateKeyDrawer
        isOpen={!!editingKey}
        mode="edit"
        initialData={editingKey}
        groups={groups}
        groupsLoading={groupsLoading}
        onRequestGroups={() => {
          void ensureGroupsLoaded();
        }}
        submitting={mutatingKeyId === editingKey?.id}
        onClose={() => setEditingKey(null)}
        onSubmit={handleEditSubmit}
      />

      {deletingKey && (
        <ConfirmDialog
          title={t('console.apiKeys.deleteTitle', '删除令牌？')}
          description={t('console.apiKeys.deleteDescription', 'This API key will be revoked and removed from the list. Existing clients using it will stop working.')}
          confirmLabel={t('common.actions.delete', '删除')}
          cancelLabel={t('common.actions.cancel', '取消')}
          isBusy={mutatingKeyId === deletingKey.id}
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
          onConfirm={() => {
            void handleDeleteConfirm();
          }}
          onCancel={() => setDeletingKey(null)}
        />
      )}

      <AnimatePresence>
        {showSuccessModal && createdKeys.length > 0 && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#252525] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-500" /> {t('console.apiKeys.createdTitle', '令牌已创建')}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                {createdKeys.map((item) => (
                  <div key={`${item.key.id}-${item.rawKey}`} className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">{item.key.displayName || t('console.apiKeys.unnamed', '令牌 #{{id}}', { id: item.key.id })}</label>
                    <div className="flex items-center gap-2 relative">
                      <input
                        type="text"
                        readOnly
                        value={item.rawKey}
                        className="w-full bg-slate-50 dark:bg-[#1e1e1e] border border-slate-200 dark:border-white/10 pl-4 pr-12 py-3.5 rounded-xl text-sm font-mono text-slate-800 dark:text-white shadow-inner focus:outline-none"
                      />
                      <CopyButton
                        text={item.rawKey}
                        label={t('common.actions.copyKey')}
                        copiedLabel={t('common.actions.keyCopied')}
                        className="absolute right-2 p-2 bg-white dark:bg-[#252525] text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white rounded-lg border border-slate-200 dark:border-white/10 transition-colors shadow-sm"
                        title={t('common.actions.copyKey')}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreatedKeyUsageDetails(item.key)}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
                    >
                      {t('console.apiKeys.usageDetails', '使用详情')}
                    </button>
                  </div>
                ))}

                <div className="pt-2 flex justify-end">
                  <button onClick={closeSuccessDialog} className="px-6 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors w-full shadow-sm">
                    {t('common.actions.close')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModalityIcon({ title, icon, className }: { title: string; icon: React.ReactNode; className: string }) {
  return (
    <div className={`w-6 h-6 rounded flex items-center justify-center border cursor-help ${className}`} title={title}>
      {icon}
    </div>
  );
}

function mergeUpdatedApiKey(current: ApiKey, updated: ApiKey): ApiKey {
  if (current.id !== updated.id) {
    return current;
  }
  return updated;
}

function displayApiKeyStatus(status: ApiKey['status'], t: TranslationFunction): string {
  return status === 'enabled'
    ? t('console.apiKeys.status.enabled', '启用中')
    : t('console.apiKeys.status.disabled', '已停用');
}

interface QuickImportMenuAnchor {
  keyId: string;
  top: number;
  left: number;
}
