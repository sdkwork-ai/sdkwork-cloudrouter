import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { CopyButton } from '@sdkwork/cloudroutes-pc-commons/components/CopyButton';
import {
  GroupPicker,
  type GroupPickerOption,
  type GroupPickerVendor,
} from '@sdkwork/cloudroutes-pc-commons/components/GroupPicker';
import type { AccountGroup, ApiKey } from './apiKeyService';
import { DEFAULT_ACCOUNT_GROUP, type ApiKeyFormValues as ApiKeyFormValuesContract } from './apiKeyForm';
import { buildTagLabels, toGroupPickerOptions } from './accountGroups';
import { formatApiKeyCreated, formatApiKeyNumber } from './display';

export type ApiKeyFormValues = ApiKeyFormValuesContract;

interface KeyFormDrawerProps {
  isOpen: boolean;
  mode?: 'create' | 'view' | 'edit';
  initialData?: ApiKey | null;
  groups: AccountGroup[];
  groupsLoading?: boolean;
  /** 模型厂商列表（code + 显示名）；未传时由分组选项去重推导 */
  vendors?: GroupPickerVendor[];
  submitting?: boolean;
  onClose: () => void;
  onRequestGroups?: () => void;
  onSubmit?: (data: ApiKeyFormValues) => void | Promise<void>;
  /** 点击遮罩（抽屉外）时是否关闭；默认 true */
  closeOnClickOutside?: boolean;
}

const MODALITIES = [
  { id: 'text', labelKey: 'common.modality.text', icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'image', labelKey: 'common.modality.image', icon: ImageIcon, color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { id: 'video', labelKey: 'common.modality.video', icon: Video, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'audio', labelKey: 'common.modality.audio', icon: Mic, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'music', labelKey: 'common.modality.music', icon: Music, color: 'text-sky-500', bg: 'bg-sky-500/10' },
];

const DEFAULT_MODALITIES = MODALITIES.map((item) => item.id);

/** 紧凑扁平风格：无边框下划线输入（长写边框属性，避免简写/长写级联覆盖问题） */
const FLAT_INPUT_CLASS =
  'w-full rounded-none border-t-0 border-x-0 border-b border-slate-200 bg-transparent px-0 py-1.5 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-primary-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500';

/** 紧凑扁平字段标签 */
const FIELD_LABEL_CLASS = 'mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-400';

/** 分组选择器触发器：覆盖共享组件默认样式，与下划线输入保持一致 */
const GROUP_PICKER_TRIGGER_CLASS =
  'w-full h-9! rounded-none! border-t-0! border-x-0! border-b! border-slate-200! bg-transparent! px-0! shadow-none! hover:bg-transparent! focus-visible:border-primary-500! dark:border-white/10!';

/** 紧凑扁平分区标题 */
function SectionLabel({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {icon}
      {children}
    </span>
  );
}

export function CreateKeyDrawer({
  isOpen,
  mode = 'create',
  initialData = null,
  groups,
  groupsLoading = false,
  vendors,
  submitting = false,
  onClose,
  onRequestGroups,
  onSubmit,
  closeOnClickOutside = true,
}: KeyFormDrawerProps) {
  const { t, i18n } = useTranslation();
  const isView = mode === 'view';
  const isEdit = mode === 'edit';
  const defaultGroup = useMemo(() => groups[0]?.code ?? DEFAULT_ACCOUNT_GROUP, [groups]);
  const groupPickerOptions = useMemo<GroupPickerOption[]>(() => {
    if (groups.length === 0 && !groupsLoading) {
      return [{ value: DEFAULT_ACCOUNT_GROUP, label: t('console.apiKeys.defaultGroup', '默认分组') }];
    }
    return toGroupPickerOptions(groups);
  }, [groups, groupsLoading, t]);
  const [name, setName] = useState('');
  const [accountGroups, setAccountGroups] = useState<string[]>([defaultGroup]);
  /** 触发器摘要：展示已选分组名（最多 2 个，其余折叠为 +N） */
  const groupTriggerLabel = useMemo(() => {
    if (accountGroups.length === 0) {
      return undefined;
    }
    const labels = accountGroups.map(
      (code) => groupPickerOptions.find((option) => option.value === code)?.label ?? code,
    );
    const shown = labels.slice(0, 2);
    const extra = labels.length - shown.length;
    return extra > 0 ? `${shown.join('、')} +${extra}` : shown.join('、');
  }, [accountGroups, groupPickerOptions]);
  const [expiryType, setExpiryType] = useState<'never' | 'custom' | '1h' | '1d' | '1m'>('never');
  const [expiryDate, setExpiryDate] = useState('');
  const [createCount, setCreateCount] = useState(1);
  const [isUnlimitedQuota, setIsUnlimitedQuota] = useState(true);
  const [quota, setQuota] = useState('0.000000');
  const [ipLimit, setIpLimit] = useState('');
  const [chainEnabled, setChainEnabled] = useState(false);
  const [chainMaxInflight, setChainMaxInflight] = useState('');
  const [chainAllowlistText, setChainAllowlistText] = useState('');
  const [chainDenylistText, setChainDenylistText] = useState('');
  const [allowedModalities, setAllowedModalities] = useState<Set<string>>(new Set(DEFAULT_MODALITIES));

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    if (initialData) {
      setName(initialData.displayName || t('console.apiKeys.unnamed', '令牌 #{{id}}', { id: initialData.id }));
      const boundGroups = initialData.accountGroups.length > 0
        ? initialData.accountGroups
        : [initialData.accountGroup.trim() || DEFAULT_ACCOUNT_GROUP];
      setAccountGroups(boundGroups.filter((code) => code.trim().length > 0));
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
    setAccountGroups([defaultGroup]);
    setExpiryType('never');
    setExpiryDate('');
    setCreateCount(1);
    setIsUnlimitedQuota(true);
    setQuota('0.000000');
    setIpLimit('');
    setChainEnabled(false);
    setChainMaxInflight('');
    setChainAllowlistText('');
    setChainDenylistText('');
    setAllowedModalities(new Set(DEFAULT_MODALITIES));
  }, [defaultGroup, groups, initialData, isOpen]);

  // 与使用详情抽屉保持一致：Escape 关闭
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const title = isView
    ? t('console.apiKeys.detailsTitle', '令牌详情')
    : isEdit
      ? t('console.apiKeys.editTitle', '编辑令牌')
      : t('console.apiKeys.createTitle', '创建令牌');
  const group = accountGroups;
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
      accountGroups: group,
      quota: isUnlimitedQuota ? '0.000000' : quota.trim(),
      isUnlimitedQuota,
      modalities: Array.from(allowedModalities),
      ipLimit: ipLimit.trim(),
      expires: expiryType === 'never' ? 'never' : expiryDate,
      createCount,
      chain: chainEnabled
        ? {
            maxInflight: chainMaxInflight,
            allowlistText: chainAllowlistText,
            denylistText: chainDenylistText,
          }
        : undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-start bg-black/50 backdrop-blur-sm animate-in fade-in duration-300"
      onPointerDown={(event) => {
        if (closeOnClickOutside && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="flex h-full w-full max-w-xl animate-in slide-in-from-left flex-col border-r border-slate-200 bg-white shadow-2xl duration-300 dark:border-white/10 dark:bg-[#1e1e1e]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 dark:border-white/5">
          <div className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-white">
            <Key className="h-5 w-5 text-lobster-500" />
            {title}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label={t('common.actions.close', '关闭')}
            title={t('common.actions.close', '关闭')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="custom-scrollbar min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
          {isView && initialData ? (
            <section className="space-y-3">
              {initialData.rawKey ? (
                <div>
                  <label className={FIELD_LABEL_CLASS}>
                    {t('console.apiKeys.rawToken', '令牌')}
                  </label>
                  <div className="flex items-center gap-2">
                    <code className="min-w-0 flex-1 truncate border-t-0 border-x-0 border-b border-slate-200 py-1.5 font-mono text-xs text-slate-800 dark:border-white/10 dark:text-slate-200">
                      {initialData.rawKey}
                    </code>
                    <CopyButton
                      text={initialData.rawKey}
                      label={t('common.actions.copyKey')}
                      copiedLabel={t('common.actions.keyCopied')}
                      title={t('common.actions.copyKey')}
                      className="h-7 w-7 shrink-0 border border-slate-200 bg-white dark:border-white/10 dark:bg-[#1e1e1e]"
                      iconClassName="h-3.5 w-3.5"
                    />
                  </div>
                </div>
              ) : null}
              <ReadOnlyRow
                label={t('console.apiKeys.maskedToken', 'Masked token')}
                value={initialData.maskedKey}
                monospace
              />
              <ReadOnlyRow label={t('console.apiKeys.status', 'Status')} value={initialData.status} />
              <ReadOnlyRow label={t('console.apiKeys.usedQuota', 'Used quota')} value={formatApiKeyNumber(initialData.usedQuota, i18n.language)} />
              <ReadOnlyRow label={t('console.apiKeys.created', 'Created')} value={formatApiKeyCreated(initialData.created, i18n.language)} monospace />
            </section>
          ) : null}

          <div className="space-y-4">
            <div className="space-y-1">
              <label htmlFor="token-name-input" className={FIELD_LABEL_CLASS}>
                {t('console.apiKeys.name', 'Name')}
              </label>
              <input
                id="token-name-input"
                type="text"
                autoFocus={!isView}
                disabled={isView}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={FLAT_INPUT_CLASS}
                placeholder={t('console.apiKeys.namePlaceholder', '生产环境令牌')}
              />
            </div>
            <div className="space-y-1">
              <label className={FIELD_LABEL_CLASS}>
                {t('console.apiKeys.group', '分组')}
              </label>
              <GroupPicker
                selectionMode="multiple"
                options={groupPickerOptions}
                vendors={vendors}
                value={accountGroups}
                onChange={setAccountGroups}
                disabled={isView}
                triggerLabel={groupTriggerLabel}
                triggerClassName={GROUP_PICKER_TRIGGER_CLASS}
                onOpen={() => {
                  void onRequestGroups?.();
                }}
                labels={{
                  triggerPlaceholder: t('console.apiKeys.groupPickerPlaceholder', '选择分组'),
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
                  modalityLabels: {
                    text: t('common.modality.text'),
                    audio: t('common.modality.audio'),
                    image: t('common.modality.image'),
                    video: t('common.modality.video'),
                    music: t('common.modality.music'),
                  },
                  tagLabels: buildTagLabels(t),
                }}
              />
            </div>
          </div>

          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <SectionLabel icon={<Calendar className="h-3.5 w-3.5 text-primary-500" />}>
                {t('console.apiKeys.expiration', 'Expiration')}
              </SectionLabel>
              {!isView ? (
                <div className="flex items-center gap-0.5 rounded-full bg-slate-100 p-0.5 dark:bg-white/5">
                  {(['never', '1m', '1d', '1h'] as const).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => handleExpiryShortcut(item)}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-colors ${
                        expiryType === item
                          ? 'bg-white text-primary-600 shadow-sm dark:bg-[#2e2e2e] dark:text-primary-300'
                          : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
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
              className={FLAT_INPUT_CLASS}
            />
            {expiryType === 'never' ? (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                <Check className="h-3.5 w-3.5" />
                {t('console.apiKeys.neverExpires', 'Never expires')}
              </div>
            ) : null}
          </section>

          {!isView && !isEdit && (
            <section className="space-y-2.5">
              <label htmlFor="create-count-input" className={FIELD_LABEL_CLASS}>
                {t('console.apiKeys.createCount', 'Create count')}
              </label>
              <input
                id="create-count-input"
                type="number"
                min="1"
                max="100"
                value={createCount}
                onChange={(event) => setCreateCount(Number(event.target.value))}
                className={FLAT_INPUT_CLASS}
              />
            </section>
          )}

          <section className="space-y-2.5">
            <SectionLabel icon={<CreditCard className="h-3.5 w-3.5 text-lobster-500" />}>
              {t('console.apiKeys.quota', 'Quota')}
            </SectionLabel>
            <div className="flex items-center gap-1.5">
              <Zap className={`h-4 w-4 shrink-0 ${isUnlimitedQuota ? 'text-slate-300 dark:text-slate-600' : 'text-lobster-500'}`} />
              <input
                type="text"
                disabled={isView || isUnlimitedQuota}
                value={quota}
                onChange={(event) => setQuota(event.target.value)}
                className={FLAT_INPUT_CLASS}
              />
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t('console.apiKeys.unlimited', 'Unlimited')}
              </span>
              <button
                type="button"
                disabled={isView}
                onClick={() => setIsUnlimitedQuota((value) => !value)}
                aria-pressed={isUnlimitedQuota}
                className={`relative flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                  isUnlimitedQuota ? 'bg-emerald-500' : 'bg-slate-400 dark:bg-slate-600'
                } disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <span className={`h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${isUnlimitedQuota ? 'translate-x-4' : 'translate-x-0'}`} />
              </button>
            </div>
          </section>

          <section className="space-y-2.5">
            <SectionLabel icon={null}>{t('console.apiKeys.modalities', 'Modalities')}</SectionLabel>
            <div className="grid grid-cols-5 gap-1">
              {MODALITIES.map((item) => {
                const Icon = item.icon;
                const checked = allowedModalities.has(item.id);
                return (
                  <button
                    type="button"
                    key={item.id}
                    disabled={isView}
                    onClick={() => toggleModality(item.id)}
                    aria-pressed={checked}
                    className={`relative flex flex-col items-center gap-1.5 rounded-lg py-2 transition-colors disabled:cursor-default ${
                      checked
                        ? `${item.bg} ${item.color}`
                        : 'text-slate-400 opacity-50 hover:opacity-80 dark:text-slate-500'
                    }`}
                  >
                    {checked ? (
                      <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary-600 text-white shadow-sm" aria-hidden="true">
                        <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                      </span>
                    ) : null}
                    <Icon className={`h-4 w-4 ${checked ? item.color : ''}`} />
                    <span className="text-[11px] font-bold leading-tight">
                      {t(item.labelKey)}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <div className="space-y-2.5">
            <label htmlFor="ip-allowlist-input" className={FIELD_LABEL_CLASS}>
              {t('console.apiKeys.ipAllowlist', 'IP allowlist')}
            </label>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <input
                id="ip-allowlist-input"
                type="text"
                disabled={isView}
                value={ipLimit}
                onChange={(event) => setIpLimit(event.target.value)}
                className={FLAT_INPUT_CLASS}
                placeholder={t('console.apiKeys.ipAllowlistPlaceholder', '192.168.1.1, 10.0.0.0/24')}
              />
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('console.apiKeys.chainPolicy', '调用链策略（可选）')}
                </div>
                <div className="text-[11px] leading-4 text-slate-400 dark:text-slate-500">
                  {t('console.apiKeys.chainPolicyDesc', '按此 Key 覆盖全局调用链：并发上限与 IP 白名单/黑名单。')}
                </div>
              </div>
              <label className="flex shrink-0 items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  disabled={isView}
                  checked={chainEnabled}
                  onChange={(event) => setChainEnabled(event.target.checked)}
                  className="accent-primary-600"
                />
                {t('console.apiKeys.chainPolicyEnabled', '启用')}
              </label>
            </div>
            {chainEnabled && (
              <div className="space-y-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('console.apiKeys.chainMaxInflight', '并发上限（0 = 不限制）')}</span>
                  <input
                    type="number"
                    min={0}
                    value={chainMaxInflight}
                    onChange={(event) => setChainMaxInflight(event.target.value)}
                    className={`${FLAT_INPUT_CLASS} max-w-56`}
                    placeholder="100"
                  />
                </label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('console.apiKeys.chainAllowlist', '白名单（每行一条，留空不限制）')}</span>
                    <textarea
                      value={chainAllowlistText}
                      onChange={(event) => setChainAllowlistText(event.target.value)}
                      rows={3}
                      placeholder={'10.0.0.0/8\n192.168.1.1'}
                      className={`${FLAT_INPUT_CLASS} resize-none`}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t('console.apiKeys.chainDenylist', '黑名单（恒优先拒绝）')}</span>
                    <textarea
                      value={chainDenylistText}
                      onChange={(event) => setChainDenylistText(event.target.value)}
                      rows={3}
                      placeholder={'203.0.113.7'}
                      className={`${FLAT_INPUT_CLASS} resize-none`}
                    />
                  </label>
                </div>
              </div>
            )}
          </section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3.5 dark:border-white/5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white"
          >
            {isView ? t('common.actions.close') : t('common.actions.cancel')}
          </button>
          {!isView ? (
            <button
              type="button"
              disabled={!canSubmit}
              onClick={submit}
              className="rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
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
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2.5 text-sm first:border-t-0 first:pt-0 dark:border-white/5">
      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
      <span className={`min-w-0 truncate font-medium text-slate-800 dark:text-slate-200 ${monospace ? 'font-mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
