import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CircleAlert,
  FolderOpen,
  LoaderCircle,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {
  StorageObjectBrowser,
  providerDisplayName,
  type StorageProviderAdminService,
  type StorageProviderBucketListItemView,
  type StorageProviderView,
} from 'sdkwork-drive-pc-admin-storage-providers';

/**
 * Cloud Router 存储中心的「存储桶管理」区段。
 *
 * 数据与语义完全来自 drive 属主的存储管理面（provider → 账号级桶清单 →
 * 当前配置桶 → 对象浏览），与 drive 自己的 `StorageBucketsAdminPage` 同源：
 *
 * - `listBuckets`：账号级桶清单（跨地域），标出当前配置桶；
 * - `updateProvider({ bucket })`：把某个桶设为该服务商配置的桶；
 * - `initializeBucket`：幂等确保配置桶在厂商侧存在（不存在则创建）；
 * - `headBucket` / `deleteBucket`：校验与移除配置桶；
 * - `StorageObjectBrowser`：桶内对象的增删改查/上传。
 *
 * 这里不重复实现驱动器页面，也不另建一份桶模型：cloudrouter 只提供宿主外壳
 * （区段标题、i18n、跨区段跳转），从而与 drive 的单一实现保持一致。
 */
export interface BucketManagerSectionProps {
  service: StorageProviderAdminService;
  /** 跳转到服务商配置（端点/区域/凭据在那边编辑）。 */
  onManageProviders?: () => void;
  /** 测试接缝；生产渲染 drive 的对象浏览器。 */
  renderObjectBrowser?: (provider: StorageProviderView, service: StorageProviderAdminService) => ReactNode;
  initialProviderId?: string;
}

type BusyAction = 'refresh' | 'use' | 'initialize' | 'delete' | 'verify';

type Notice = { readonly kind: 'success' | 'error'; readonly text: string };

const CARD_CLASS =
  'rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]';
const TABLE_SHELL_CLASS =
  'flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717]';
const PRIMARY_BUTTON_CLASS =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-lobster-500 px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-50';
const SECONDARY_BUTTON_CLASS =
  'inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10';
const SELECT_CLASS =
  'h-9 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-sm text-slate-700 shadow-sm outline-none transition-colors focus:border-lobster-500 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200';
const ROW_ACTION_CLASS =
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10';
const ROW_ACTION_PRIMARY_CLASS =
  'inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-lobster-500 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-50';
const BADGE_CLASS =
  'inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300';

export function BucketManagerSection({
  service,
  onManageProviders,
  renderObjectBrowser,
  initialProviderId,
}: BucketManagerSectionProps) {
  const { t, i18n } = useTranslation();
  const [providers, setProviders] = useState<StorageProviderView[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState(initialProviderId ?? '');
  const [buckets, setBuckets] = useState<StorageProviderBucketListItemView[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingBuckets, setLoadingBuckets] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState<BusyAction | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [browsingProvider, setBrowsingProvider] = useState<StorageProviderView | null>(null);

  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }),
    [locale],
  );

  const selectedProvider = providers.find((provider) => provider.id === selectedProviderId);

  const loadProviders = useCallback(
    async (signal?: AbortSignal) => {
      setLoadingProviders(true);
      setLoadError(false);
      try {
        const [items, tenantBinding] = await Promise.all([
          service.listAllProviders({ status: 'active', signal }),
          // The tenant default is the provider the install is meant to run on
          // (Tencent COS for the seeded plane). Prefer it over the alphabetical
          // first row so the bucket page opens on the operator's target.
          service.getDefaultBinding(undefined, { signal }).catch(() => undefined),
        ]);
        if (signal?.aborted) return;
        setProviders(items);
        setSelectedProviderId((current) => {
          if (items.some((provider) => provider.id === current)) return current;
          const preferred = tenantBinding?.providerId;
          if (preferred && items.some((provider) => provider.id === preferred)) {
            return preferred;
          }
          return items[0]?.id ?? '';
        });
      } catch (error) {
        if (signal?.aborted) return;
        setLoadError(true);
      } finally {
        if (!signal?.aborted) setLoadingProviders(false);
      }
    },
    [service],
  );

  const loadBuckets = useCallback(
    async (providerId: string, signal?: AbortSignal) => {
      if (!providerId) {
        setBuckets([]);
        return;
      }
      setLoadingBuckets(true);
      setLoadError(false);
      try {
        const items = await service.listBuckets(providerId, { signal });
        if (signal?.aborted) return;
        setBuckets(items);
      } catch (error) {
        if (signal?.aborted) return;
        setBuckets([]);
        setLoadError(true);
      } finally {
        if (!signal?.aborted) setLoadingBuckets(false);
      }
    },
    [service],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadProviders(controller.signal);
    return () => controller.abort();
  }, [loadProviders]);

  useEffect(() => {
    if (!selectedProviderId) {
      setBuckets([]);
      return undefined;
    }
    const controller = new AbortController();
    void loadBuckets(selectedProviderId, controller.signal);
    return () => controller.abort();
  }, [loadBuckets, selectedProviderId]);

  const refresh = useCallback(async () => {
    setBusy('refresh');
    setNotice(null);
    await loadProviders();
    if (selectedProviderId) await loadBuckets(selectedProviderId);
    setBusy(null);
  }, [loadBuckets, loadProviders, selectedProviderId]);

  async function useBucket(bucket: string) {
    if (!selectedProvider) return;
    setBusy('use');
    setNotice(null);
    try {
      await service.updateProvider(selectedProvider.id, { bucket });
      // 切桶后立即幂等确保该桶存在：厂商侧已存在则 changed=false，不重复创建。
      await service.initializeBucket(selectedProvider.id);
      await loadProviders();
      await loadBuckets(selectedProvider.id);
      setNotice({ kind: 'success', text: t('admin.storage.bucketsAdmin.useSuccess', 'Bucket selected and verified.') });
    } catch (error) {
      setNotice({ kind: 'error', text: t('admin.storage.bucketsAdmin.useError', 'The bucket could not be selected.') });
    } finally {
      setBusy(null);
    }
  }

  async function initializeProviderContent() {
    if (!selectedProvider) return;
    setBusy('initialize');
    setNotice(null);
    try {
      const result = await service.initializeProvider(selectedProvider.id);
      await loadProviders();
      await loadBuckets(selectedProvider.id);
      setNotice({
        kind: 'success',
        text: t(
          'admin.storage.bucketsAdmin.initializeSuccess',
          'Provider initialized: bucket "{{bucket}}", {{logical}} logical buckets and {{business}} business bindings ready.',
          {
            bucket: result.bucket,
            logical: result.logicalBucketCount,
            business: result.businessBindingCount,
          },
        ),
      });
    } catch (error) {
      setNotice({
        kind: 'error',
        text: t(
          'admin.storage.bucketsAdmin.initializeError',
          'Provider initialization failed. Check the cloud account credentials and bucket name, then retry.',
        ),
      });
    } finally {
      setBusy(null);
    }
  }

  async function verifyConfiguredBucket() {
    if (!selectedProvider) return;
    setBusy('verify');
    setNotice(null);
    try {
      const result = await service.headBucket(selectedProvider.id);
      setNotice({
        kind: result.exists ? 'success' : 'error',
        text: result.exists
          ? t('admin.storage.bucketsAdmin.verifyExists', 'The configured bucket exists.')
          : t('admin.storage.bucketsAdmin.verifyMissing', 'The configured bucket does not exist yet.'),
      });
    } catch (error) {
      setNotice({ kind: 'error', text: t('admin.storage.bucketsAdmin.verifyError', 'The bucket could not be verified.') });
    } finally {
      setBusy(null);
    }
  }

  async function deleteConfiguredBucket() {
    if (!selectedProvider) return;
    setBusy('delete');
    setNotice(null);
    try {
      await service.deleteBucket(selectedProvider.id);
      setPendingDelete(false);
      await loadBuckets(selectedProvider.id);
      setNotice({ kind: 'success', text: t('admin.storage.bucketsAdmin.deleteSuccess', 'The configured bucket was removed.') });
    } catch (error) {
      setNotice({ kind: 'error', text: t('admin.storage.bucketsAdmin.deleteError', 'The configured bucket could not be removed.') });
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null || loadingProviders || loadingBuckets;
  const configuredBucket = selectedProvider?.bucket ?? '';

  return (
    <div className={`${CARD_CLASS} flex h-full min-h-0 w-full flex-col overflow-hidden`}>
      <div className="shrink-0 border-b border-slate-200 dark:border-white/10">
        <div className="flex flex-col gap-3 p-3 md:flex-row md:items-end md:justify-between">
          <label className="flex min-w-[16rem] flex-1 flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('admin.storage.bucketsAdmin.provider', 'Storage provider')}
            <select
              className={SELECT_CLASS}
              disabled={loadingProviders || providers.length === 0}
              value={selectedProviderId}
              onChange={(event) => {
                setSelectedProviderId(event.target.value);
                setNotice(null);
                setBrowsingProvider(null);
              }}
            >
              {providers.length === 0 ? (
                <option value="">{t('admin.storage.bucketsAdmin.noProviders', 'No active storage provider yet.')}</option>
              ) : null}
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {providerDisplayName(t, provider)} · {provider.bucket}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={SECONDARY_BUTTON_CLASS}
              disabled={disabled}
              type="button"
              onClick={() => void refresh()}
            >
              {busy === 'refresh' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t('admin.storage.reload', 'Reload')}
            </button>
            <button
              className={PRIMARY_BUTTON_CLASS}
              disabled={disabled || !selectedProvider}
              type="button"
              onClick={() => void initializeProviderContent()}
            >
              {busy === 'initialize' ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              {t('admin.storage.bucketsAdmin.initialize', 'Initialize provider')}
            </button>
            <button
              className={SECONDARY_BUTTON_CLASS}
              disabled={disabled || !selectedProvider}
              type="button"
              onClick={() => void verifyConfiguredBucket()}
            >
              {t('admin.storage.bucketsAdmin.verify', 'Verify')}
            </button>
            <button
              className={SECONDARY_BUTTON_CLASS}
              disabled={disabled || !selectedProvider}
              type="button"
              onClick={() => setPendingDelete(true)}
            >
              <Trash2 className="h-4 w-4" />
              {t('admin.storage.bucketsAdmin.deleteBucket', 'Delete bucket')}
            </button>
            {onManageProviders ? (
              <button className={SECONDARY_BUTTON_CLASS} type="button" onClick={onManageProviders}>
                <Settings2 className="h-4 w-4" />
                {t('admin.storage.bucketsAdmin.manageProviders', 'Provider settings')}
              </button>
            ) : null}
          </div>
        </div>
        {configuredBucket || notice || pendingDelete ? (
          <div className="border-t border-slate-200 dark:border-white/10">
            {configuredBucket ? (
              <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400">
                {t('admin.storage.bucketsAdmin.configuredBucket', 'Configured bucket')}: <span className="font-mono">{configuredBucket}</span>
              </div>
            ) : null}
            {notice ? (
              <div
                className={`flex items-start gap-2 border-t border-slate-200 px-3 py-2 text-sm first:border-t-0 dark:border-white/10 ${
                  notice.kind === 'success'
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                    : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                }`}
                role={notice.kind === 'error' ? 'alert' : 'status'}
              >
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notice.text}</span>
              </div>
            ) : null}
            {pendingDelete ? (
              <div className="border-t border-slate-200 p-3 dark:border-white/10">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <p>{t('admin.storage.bucketsAdmin.deleteConfirm', 'Delete the configured bucket on the vendor? Objects inside it are not removed by this console.')}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      className={PRIMARY_BUTTON_CLASS}
                      disabled={busy !== null}
                      type="button"
                      onClick={() => void deleteConfiguredBucket()}
                    >
                      {t('admin.storage.dialog.save', 'Confirm')}
                    </button>
                    <button
                      className={SECONDARY_BUTTON_CLASS}
                      disabled={busy !== null}
                      type="button"
                      onClick={() => setPendingDelete(false)}
                    >
                      {t('admin.storage.dialog.cancel', 'Cancel')}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className={`${TABLE_SHELL_CLASS} m-5 mt-4 ${browsingProvider ? 'flex-[2]' : 'flex-1'}`}>
          <div className="min-h-0 flex-1 overflow-auto custom-scrollbar">
          {loadError ? (
            <div
              className="flex min-h-[320px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-500 dark:text-slate-400"
              role="alert"
            >
              <CircleAlert className="h-5 w-5" />
              {t('admin.storage.bucketsAdmin.loadError', 'Bucket data could not be loaded. Check the provider credentials and endpoint.')}
            </div>
          ) : loadingBuckets ? (
            <div className="flex min-h-[320px] items-center justify-center gap-2 p-6 text-sm text-slate-500 dark:text-slate-400">
              <LoaderCircle className="h-4 w-4 animate-spin" />
              {t('admin.storage.form.bucketLoading', 'Loading buckets...')}
            </div>
          ) : buckets.length === 0 ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              <FolderOpen className="h-5 w-5" />
              {t('admin.storage.bucketsAdmin.empty', 'No bucket is visible to this account yet. Configure the cloud account, then click “Initialize provider” to create the configured bucket and business routes.')}
            </div>
          ) : (
            <table className="w-full min-w-[760px] text-left text-sm text-slate-600 dark:text-slate-400">
              <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-[#121212] dark:text-slate-400">
                <tr>
                  <th className="px-6 py-4 font-semibold">{t('admin.storage.col.bucket', 'Bucket')}</th>
                  <th className="px-6 py-4 font-semibold">{t('admin.storage.col.region', 'Region')}</th>
                  <th className="px-6 py-4 font-semibold">{t('admin.storage.bucketsAdmin.createdAt', 'Created')}</th>
                  <th className="px-6 py-4 font-semibold">{t('admin.storage.col.status', 'Status')}</th>
                  <th className="px-6 py-4 text-right font-semibold">{t('admin.storage.action', 'Action')}</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {buckets.map((bucket) => {
                const isConfigured = bucket.configured || bucket.bucket === configuredBucket;
                const exists = bucket.exists !== false;
                return (
                  <tr
                    key={bucket.bucket}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
                  >
                    <td className="px-6 py-4 font-mono text-xs text-slate-900 dark:text-white">{bucket.bucket}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{bucket.region || '-'}</td>
                    <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                      {bucket.creationDateIso ? dateFormatter.format(new Date(bucket.creationDateIso)) : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`${BADGE_CLASS} ${isConfigured && !exists ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300' : ''}`}>
                        {isConfigured && !exists
                          ? t('admin.storage.bucketsAdmin.pendingInitialize', 'Pending initialization')
                          : isConfigured
                            ? t('admin.storage.bucketsAdmin.configured', 'Configured')
                            : t('admin.storage.bucketsAdmin.available', 'Available')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          className={ROW_ACTION_CLASS}
                          disabled={disabled}
                          type="button"
                          onClick={() => void (isConfigured && !exists ? initializeProviderContent() : useBucket(bucket.bucket))}
                        >
                          {isConfigured && !exists
                            ? t('admin.storage.bucketsAdmin.initialize', 'Initialize provider')
                            : isConfigured
                              ? t('admin.storage.bucketsAdmin.reuse', 'Re-verify')
                              : t('admin.storage.bucketsAdmin.useBucket', 'Use this bucket')}
                        </button>
                        <button
                          className={ROW_ACTION_PRIMARY_CLASS}
                          disabled={!isConfigured || !exists || disabled}
                          type="button"
                          onClick={() => setBrowsingProvider(
                            selectedProvider ? { ...selectedProvider, bucket: bucket.bucket } : null,
                          )}
                        >
                          <FolderOpen className="h-4 w-4" />
                          {t('admin.storage.buckets.files', 'Browse files')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
          </div>
        </div>
      </div>

      {browsingProvider ? (
        <div className={`${TABLE_SHELL_CLASS} mx-5 mb-5 mt-0 flex-[3]`}>
          <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#171717]">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {providerDisplayName(t, browsingProvider)} · <span className="font-mono text-xs">{browsingProvider.bucket}</span>
            </p>
            <button
              className={SECONDARY_BUTTON_CLASS}
              type="button"
              onClick={() => setBrowsingProvider(null)}
            >
              {t('admin.storage.dialog.close', 'Close')}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4">
            {renderObjectBrowser
              ? renderObjectBrowser(browsingProvider, service)
              : <StorageObjectBrowser provider={browsingProvider} service={service} />}
          </div>
        </div>
      ) : null}
    </div>
  );
}
