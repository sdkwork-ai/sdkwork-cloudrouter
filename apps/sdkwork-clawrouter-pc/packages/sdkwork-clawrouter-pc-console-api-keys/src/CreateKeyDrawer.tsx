import { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Check,
  CreditCard,
  Image as ImageIcon,
  Key,
  MapPin,
  MessageSquare,
  Mic,
  Music,
  Video,
  X,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AccountGroup, ApiKey } from './apiKeyService';
import { DEFAULT_ACCOUNT_GROUP, type ApiKeyFormValues as ApiKeyFormValuesContract } from './apiKeyForm';
import { formatAccountGroupOptionLabel } from './accountGroups';

export type ApiKeyFormValues = ApiKeyFormValuesContract;

interface KeyFormDrawerProps {
  isOpen: boolean;
  mode?: 'create' | 'view' | 'edit';
  initialData?: ApiKey | null;
  groups: AccountGroup[];
  groupsLoading?: boolean;
  submitting?: boolean;
  onClose: () => void;
  onRequestGroups?: () => void;
  onSubmit?: (data: ApiKeyFormValues) => void | Promise<void>;
}

const MODALITIES = [
  { id: 'text', labelKey: 'common.modality.text', icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  { id: 'image', labelKey: 'common.modality.image', icon: ImageIcon, color: 'text-pink-500', bg: 'bg-pink-500/10', border: 'border-pink-500/30' },
  { id: 'video', labelKey: 'common.modality.video', icon: Video, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  { id: 'audio', labelKey: 'common.modality.audio', icon: Mic, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  { id: 'music', labelKey: 'common.modality.music', icon: Music, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/30' },
];

const DEFAULT_MODALITIES = MODALITIES.map((item) => item.id);

export function CreateKeyDrawer({
  isOpen,
  mode = 'create',
  initialData = null,
  groups,
  groupsLoading = false,
  submitting = false,
  onClose,
  onRequestGroups,
  onSubmit,
}: KeyFormDrawerProps) {
  const { t } = useTranslation();
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const defaultGroup = useMemo(() => groups[0]?.code ?? DEFAULT_ACCOUNT_GROUP, [groups]);
  const [name, setName] = useState('');
  const [accountGroup, setAccountGroup] = useState(defaultGroup);
  const [expiryType, setExpiryType] = useState<'never' | 'custom' | '1h' | '1d' | '1m'>('never');
  const [expiryDate, setExpiryDate] = useState('');
  const [createCount, setCreateCount] = useState(1);
  const [isUnlimitedQuota, setIsUnlimitedQuota] = useState(true);
  const [quota, setQuota] = useState('0.000000');
  const [ipLimit, setIpLimit] = useState('');
  const [allowedModalities, setAllowedModalities] = useState<Set<string>>(new Set(DEFAULT_MODALITIES));

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (initialData) {
      setName(initialData.displayName);
      const normalizedGroup = initialData.accountGroup.trim();
      setAccountGroup(
        groups.some((item) => item.code === normalizedGroup)
          ? normalizedGroup
          : defaultGroup,
      );
      setIpLimit(initialData.ipLimit === 'unrestricted' ? '' : initialData.ipLimit);
      setExpiryType(initialData.expires === 'never' ? 'never' : 'custom');
      setExpiryDate(initialData.expires === 'never' ? '' : initialData.expires.replace(' ', 'T').slice(0, 16));
      setIsUnlimitedQuota(initialData.quota === 'unlimited');
      setQuota(initialData.quota === 'unlimited' ? '0.000000' : initialData.quota);
      setAllowedModalities(new Set(initialData.modalities.length > 0 ? initialData.modalities : DEFAULT_MODALITIES));
      setCreateCount(1);
      return;
    }
    setName('');
    setAccountGroup(defaultGroup);
    setExpiryType('never');
    setExpiryDate('');
    setCreateCount(1);
    setIsUnlimitedQuota(true);
    setQuota('0.000000');
    setIpLimit('');
    setAllowedModalities(new Set(DEFAULT_MODALITIES));
  }, [defaultGroup, groups, initialData, isOpen]);

  if (!isOpen) {
    return null;
  }

  const title = isView
    ? t('console.apiKeys.detailsTitle', 'API 密钥详情')
    : isEdit
      ? t('console.apiKeys.editTitle', '编辑 API 密钥')
      : t('console.apiKeys.createTitle', '创建 API 密钥');
  const group = accountGroup;
  const canSubmit = !isView && !submitting && name.trim().length > 0 && group.length > 0 && allowedModalities.size > 0;

  const handleExpiryShortcut = (type: 'never' | '1h' | '1d' | '1m') => {
    if (isView) {
      return;
    }
    setExpiryType(type);
    if (type === 'never') {
      setExpiryDate('');
      return;
    }
    const date = new Date();
    if (type === '1h') {
      date.setHours(date.getHours() + 1);
    }
    if (type === '1d') {
      date.setDate(date.getDate() + 1);
    }
    if (type === '1m') {
      date.setMonth(date.getMonth() + 1);
    }
    setExpiryDate(toLocalInputValue(date));
  };

  const toggleModality = (id: string) => {
    if (isView) {
      return;
    }
    const next = new Set(allowedModalities);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setAllowedModalities(next);
  };

  const submit = async () => {
    if (!canSubmit || !onSubmit) {
      return;
    }
    await onSubmit({
      name: name.trim(),
      accountGroup: group,
      quota: isUnlimitedQuota ? '0.000000' : quota.trim(),
      isUnlimitedQuota,
      modalities: Array.from(allowedModalities),
      ipLimit: ipLimit.trim(),
      expires: expiryType === 'never' ? 'never' : expiryDate,
      createCount,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className="h-full w-full max-w-xl animate-in slide-in-from-right border-l border-slate-200 bg-white shadow-2xl duration-300 dark:border-white/10 dark:bg-[#1e1e1e]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
          <div className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <Key className="h-5 w-5 text-lobster-500" />
            {title}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
          {isView && initialData ? (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-white/5 dark:bg-[#252525]">
              <ReadOnlyRow
                label={t('console.apiKeys.maskedToken', 'Masked token')}
                value={initialData.maskedKey}
                monospace
              />
              <ReadOnlyRow label={t('console.apiKeys.status', 'Status')} value={initialData.status} />
              <ReadOnlyRow label={t('console.apiKeys.usedQuota', 'Used quota')} value={initialData.usedQuota} />
              <ReadOnlyRow label={t('console.apiKeys.created', 'Created')} value={initialData.created} monospace />
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('console.apiKeys.name', 'Name')}
              </label>
              <input
                type="text"
                disabled={isView}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-60 dark:border-white/10 dark:bg-[#252525] dark:text-white"
                placeholder={t('console.apiKeys.namePlaceholder', '生产环境密钥')}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                {t('console.apiKeys.group', '分组')}
              </label>
              <select
                disabled={isView}
                value={group}
                onFocus={() => {
                  void onRequestGroups?.();
                }}
                onChange={(event) => setAccountGroup(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-60 dark:border-white/10 dark:bg-[#252525] dark:text-white"
              >
                {groupsLoading ? (
                  <option value={group}>{t('console.apiKeys.loadingGroups', '加载分组中...')}</option>
                ) : null}
                {groups.map((item) => (
                  <option key={item.code} value={item.code}>
                    {formatAccountGroupOptionLabel(item)}
                  </option>
                ))}
                {!groupsLoading && groups.length > 0 && !groups.some((item) => item.code === group) ? (
                  <option value={group}>{group}</option>
                ) : null}
                {!groupsLoading && groups.length === 0 ? (
                  <option value={DEFAULT_ACCOUNT_GROUP}>{t('console.apiKeys.defaultGroup', '默认分组')}</option>
                ) : null}
              </select>
            </div>
          </div>

          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-white/5 dark:bg-[#252525]">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Calendar className="h-4 w-4 text-blue-400" />
                {t('console.apiKeys.expiration', 'Expiration')}
              </span>
              {!isView ? (
                <div className="flex items-center gap-2 text-xs">
                  {(['never', '1m', '1d', '1h'] as const).map((item) => (
                    <button
                      key={item}
                      onClick={() => handleExpiryShortcut(item)}
                      className={`rounded px-2.5 py-1 transition-colors ${
                        expiryType === item
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-slate-700 hover:bg-slate-100 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                      }`}
                    >
                      {item === 'never' ? t('common.actions.never') : item.toUpperCase()}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
            <input
              type="datetime-local"
              disabled={isView || expiryType === 'never'}
              value={expiryType === 'never' ? '' : expiryDate}
              onChange={(event) => {
                setExpiryDate(event.target.value);
                setExpiryType('custom');
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
            />
            {expiryType === 'never' ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-500">
                <Check className="h-3.5 w-3.5" />
                {t('console.apiKeys.neverExpires', 'Never expires')}
              </div>
            ) : null}
          </section>

          {!isView && !isEdit && (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-white/5 dark:bg-[#252525]">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                {t('console.apiKeys.createCount', 'Create count')}
              </span>
              <input
                type="number"
                min="1"
                max="100"
                value={createCount}
                onChange={(event) => setCreateCount(Number(event.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white"
              />
            </section>
          )}

          <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-white/5 dark:bg-[#252525]">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500">
                <CreditCard className="h-4 w-4 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {t('console.apiKeys.quota', 'Quota')}
              </span>
            </div>
            <div className="flex items-center rounded-lg border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#1e1e1e]">
              <Zap className={`mr-2 h-4 w-4 ${isUnlimitedQuota ? 'text-slate-500' : 'text-amber-500'}`} />
              <input
                type="text"
                disabled={isView || isUnlimitedQuota}
                value={quota}
                onChange={(event) => setQuota(event.target.value)}
                className="w-full bg-transparent text-sm text-slate-900 focus:outline-none disabled:opacity-50 dark:text-white"
              />
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 pt-4 dark:border-white/5">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {t('console.apiKeys.unlimited', 'Unlimited')}
              </span>
              <button
                disabled={isView}
                onClick={() => setIsUnlimitedQuota((value) => !value)}
                className={`relative flex h-6 w-10 items-center rounded-full p-1 transition-colors ${
                  isUnlimitedQuota ? 'bg-emerald-500' : 'bg-slate-600'
                } disabled:opacity-50`}
              >
                <span className={`h-4 w-4 rounded-full bg-white transition-transform ${isUnlimitedQuota ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </section>

          <section className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300">
              {t('console.apiKeys.modalities', 'Modalities')}
            </label>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {MODALITIES.map((item) => {
                const Icon = item.icon;
                const checked = allowedModalities.has(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    disabled={isView}
                    onClick={() => toggleModality(item.id)}
                    className={`flex flex-col items-center gap-2 rounded-lg border p-3 transition-colors ${
                      checked
                        ? `${item.bg} ${item.border}`
                        : 'border-transparent bg-slate-100 opacity-50 grayscale dark:bg-[#252525]'
                    } disabled:cursor-default`}
                  >
                    <Icon className={`h-5 w-5 ${checked ? item.color : 'text-slate-400'}`} />
                    <span className={`text-xs font-bold leading-tight ${checked ? item.color : 'text-slate-500'}`}>
                      {t(item.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div>
            <label className="mb-1.5 block text-sm font-bold text-slate-700 dark:text-slate-300">
              {t('console.apiKeys.ipAllowlist', 'IP allowlist')}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                disabled={isView}
                value={ipLimit}
                onChange={(event) => setIpLimit(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-white/10 dark:bg-[#252525] dark:text-white"
                placeholder={t('console.apiKeys.ipAllowlistPlaceholder', '192.168.1.1, 10.0.0.0/24')}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-[#1a1a1a]">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
          >
            {isView ? t('common.actions.close') : t('common.actions.cancel')}
          </button>
          {!isView ? (
            <button
              disabled={!canSubmit}
              onClick={submit}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? t('common.actions.saving', 'Saving...')
                : isEdit
                  ? t('common.actions.save', 'Save')
                  : t('common.actions.createKey')}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyRow({
  label,
  value,
  monospace = false,
}: {
  label: string;
  value: string;
  monospace?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-sm first:border-t-0 first:pt-0 dark:border-white/10">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="flex min-w-0 items-center gap-2">
        <span className={`truncate font-medium text-slate-800 dark:text-slate-200 ${monospace ? 'font-mono' : ''}`}>
          {value}
        </span>
      </span>
    </div>
  );
}

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
