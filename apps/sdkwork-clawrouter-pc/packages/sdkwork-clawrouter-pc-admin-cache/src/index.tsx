import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Database, Eye, HardDrive, Layers, RefreshCw, Search, Trash2, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel, BusinessStateTableRow } from '@sdkwork/clawroutes-pc-commons/components/BusinessState';
import { ConfirmDialog } from '@sdkwork/clawroutes-pc-commons/components/ConfirmDialog';
import {
  AdminCacheService,
  type CacheInstance,
  type CacheKeyList,
  type CacheNamespacePolicy,
  type CacheOperationOutcome,
  type CacheOverview,
  type CacheProviderKind,
  type CacheRuntimeTarget,
} from './cacheService';

type CacheTab = 'instances' | 'namespaces';
type Translate = (key: string, fallback: string) => string;

const TABS: CacheTab[] = ['instances', 'namespaces'];

export function CacheAdmin() {
  const { t } = useTranslation();
  const [overview, setOverview] = useState<CacheOverview | null>(null);
  const [activeTab, setActiveTab] = useState<CacheTab>('instances');
  const [search, setSearch] = useState('');
  const [deleteKeyNamespace, setDeleteKeyNamespace] = useState('');
  const [deleteKeyValue, setDeleteKeyValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [operationBusy, setOperationBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [operationOutcome, setOperationOutcome] = useState<CacheOperationOutcome | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [keyList, setKeyList] = useState<CacheKeyList | null>(null);
  const [keyListError, setKeyListError] = useState<string | null>(null);
  const [pendingDeleteInstance, setPendingDeleteInstance] = useState<string | null>(null);
  const [pendingDeleteNamespace, setPendingDeleteNamespace] = useState<string | null>(null);
  const [pendingDeleteKey, setPendingDeleteKey] = useState<{ namespace: string; key: string } | null>(null);

  const loadOverview = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await AdminCacheService.fetchOverview();
      setOverview(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : t('admin.cache.errors.loadFallback', 'Cache data could not be loaded.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOverview();
  }, []);

  const normalizedSearch = search.trim().toLowerCase();
  const instances = useMemo(() => {
    const rows = overview?.instances ?? [];
    if (!normalizedSearch) {
      return rows;
    }
    return rows.filter((item) => [
      item.name,
      item.providerKind,
      item.purpose,
      item.keyPrefix,
      item.connectionProfileName ?? '',
      item.status,
    ].some((value) => value.toLowerCase().includes(normalizedSearch)));
  }, [normalizedSearch, overview]);
  const namespacePolicies = useMemo(() => {
    const rows = overview?.namespacePolicies ?? [];
    if (!normalizedSearch) {
      return rows;
    }
    return rows.filter((item) => [
      item.namespace,
      item.instanceName,
      item.scope,
      item.sensitivity,
      item.failureMode,
      item.consistency,
      item.enabled ? 'enabled' : 'disabled',
      ...item.tags,
    ].some((value) => value.toLowerCase().includes(normalizedSearch)));
  }, [normalizedSearch, overview]);

  const executeOperation = async (
    busyKey: string,
    action: () => Promise<CacheOperationOutcome>,
  ): Promise<boolean> => {
    setOperationBusy(busyKey);
    setOperationError(null);
    setOperationOutcome(null);
    try {
      const outcome = await action();
      setOperationOutcome(outcome);
      await loadOverview();
      return true;
    } catch (error) {
      setOperationError(error instanceof Error ? error.message : t('admin.cache.errors.operationFallback', 'Cache operation failed.'));
      return false;
    } finally {
      setOperationBusy(null);
    }
  };

  const handleDeleteKey = () => {
    const namespace = deleteKeyNamespace.trim();
    const key = deleteKeyValue.trim();
    if (!namespace || !key) {
      setOperationError(t('admin.cache.errors.keyDeleteInput', 'Namespace and key are required.'));
      return;
    }
    setPendingDeleteKey({ namespace, key });
  };

  const confirmDeleteKey = () => {
    if (!pendingDeleteKey) {
      return;
    }
    const { namespace, key } = pendingDeleteKey;
    void executeOperation('delete-key', () => AdminCacheService.deleteKey(namespace, key)).then((succeeded) => {
      if (succeeded) {
        setPendingDeleteKey(null);
      }
    });
  };

  const confirmDeleteNamespace = () => {
    if (!pendingDeleteNamespace) {
      return;
    }
    const namespace = pendingDeleteNamespace;
    void executeOperation(`delete-namespace:${namespace}`, () => AdminCacheService.deleteNamespace(namespace)).then((succeeded) => {
      if (succeeded) {
        setPendingDeleteNamespace(null);
      }
    });
  };

  const confirmDeleteInstance = () => {
    if (!pendingDeleteInstance) {
      return;
    }
    const instanceName = pendingDeleteInstance;
    void executeOperation(`delete-instance:${instanceName}`, () => AdminCacheService.deleteInstance(instanceName)).then((succeeded) => {
      if (succeeded) {
        setPendingDeleteInstance(null);
      }
    });
  };

  const inspectNamespaceKeys = async (namespace: string, cursor?: string | null) => {
    const busyKey = cursor ? `inspect-namespace-next:${namespace}` : `inspect-namespace:${namespace}`;
    setOperationBusy(busyKey);
    setKeyListError(null);
    try {
      const data = await AdminCacheService.listKeys(namespace, undefined, cursor);
      setKeyList((current) => (
        cursor && current && current.namespace === data.namespace
          ? {
              ...data,
              scannedItems: current.scannedItems + data.scannedItems,
              returnedItems: current.returnedItems + data.returnedItems,
              items: [...current.items, ...data.items],
              pageInfo: data.pageInfo,
            }
          : data
      ));
    } catch (error) {
      setKeyListError(error instanceof Error ? error.message : t('admin.cache.errors.keyListFallback', 'Cache keys could not be loaded.'));
    } finally {
      setOperationBusy(null);
    }
  };

  const summary = overview?.summary;
  const isInitialLoading = loading && overview === null;

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-4 overflow-hidden">
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div />
          <button
            type="button"
            disabled={loading || operationBusy !== null}
            onClick={() => { void executeOperation('refresh-all', () => AdminCacheService.refreshAll()); }}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
          >
            <RefreshCw className={`h-4 w-4 ${operationBusy === 'refresh-all' ? 'animate-spin' : ''}`} />
            {t('admin.cache.actions.refreshAll', 'Refresh all')}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            icon={HardDrive}
            label={t('admin.cache.metrics.runtime', 'Runtime')}
            value={summary ? formatRuntimeTarget(summary.runtimeTarget, t) : '--'}
            detail={t('admin.cache.metrics.runtimeDetail', 'Deployment binding')}
            loading={isInitialLoading}
          />
          <MetricCard
            icon={Database}
            label={t('admin.cache.metrics.instances', 'Instances')}
            value={summary ? String(summary.totalInstances) : '--'}
            detail={t('admin.cache.metrics.instancesDetail', 'Configured stores')}
            loading={isInitialLoading}
          />
          <MetricCard
            icon={Layers}
            label={t('admin.cache.metrics.namespaces', 'Namespaces')}
            value={summary ? String(summary.totalNamespaces) : '--'}
            detail={t('admin.cache.metrics.namespacesDetail', 'Policy bindings')}
            loading={isInitialLoading}
          />
          <MetricCard
            icon={Zap}
            label={t('admin.cache.metrics.entries', 'Entries')}
            value={summary ? String(summary.totalEntries) : '--'}
            detail={t('admin.cache.metrics.entriesDetail', 'Active keys')}
            loading={isInitialLoading}
          />
          <MetricCard
            icon={Trash2}
            label={t('admin.cache.metrics.expired', 'Expired')}
            value={summary ? String(summary.expiredEntries) : '--'}
            detail={t('admin.cache.metrics.expiredDetail', 'Pending cleanup')}
            loading={isInitialLoading}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-7">
          <CompactMetric
            label={t('admin.cache.metrics.hits', 'Hits')}
            value={summary ? String(summary.cacheHits) : '--'}
            loading={isInitialLoading}
          />
          <CompactMetric
            label={t('admin.cache.metrics.misses', 'Misses')}
            value={summary ? String(summary.cacheMisses) : '--'}
            loading={isInitialLoading}
          />
          <CompactMetric
            label={t('admin.cache.metrics.writes', 'Writes')}
            value={summary ? String(summary.cacheWrites) : '--'}
            loading={isInitialLoading}
          />
          <CompactMetric
            label={t('admin.cache.metrics.deletes', 'Deletes')}
            value={summary ? String(summary.cacheDeletes) : '--'}
            loading={isInitialLoading}
          />
          <CompactMetric
            label={t('admin.cache.metrics.refreshes', 'Refreshes')}
            value={summary ? String(summary.cacheRefreshes) : '--'}
            loading={isInitialLoading}
          />
          <CompactMetric
            label={t('admin.cache.metrics.inspections', 'Inspections')}
            value={summary ? String(summary.cacheInspections) : '--'}
            loading={isInitialLoading}
          />
          <CompactMetric
            label={t('admin.cache.metrics.errors', 'Errors')}
            value={summary ? String(summary.cacheErrors) : '--'}
            loading={isInitialLoading}
            tone={summary && summary.cacheErrors > 0 ? 'danger' : 'default'}
          />
        </div>
      </div>

      {loadError ? (
        <BusinessStatePanel
          kind="error"
          title={t('admin.cache.states.loadError', 'Cache data could not be loaded')}
          description={loadError}
          onRetry={() => { void loadOverview(); }}
          retryLabel={t('common.retry', 'Retry')}
          className="rounded-xl border border-red-200 bg-red-50/70 dark:border-red-500/20 dark:bg-red-500/5"
        />
      ) : null}

      {(operationOutcome || operationError) ? (
        <div className={`rounded-lg border px-4 py-3 text-sm ${
          operationError
            ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300'
            : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
        }`}>
          {operationError
            ? operationError
            : t('admin.cache.operation.result', '{{operation}} completed. Deleted {{deleted}} entries, refreshed {{refreshed}} entries.', {
                operation: operationOutcome?.operation ?? '',
                deleted: operationOutcome?.deletedEntries ?? 0,
                refreshed: operationOutcome?.refreshedEntries ?? 0,
              })}
        </div>
      ) : null}

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-[#111]">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-white text-emerald-600 shadow-sm dark:bg-white/10 dark:text-emerald-300'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {t(`admin.cache.tabs.${tab}`, tab)}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative w-full lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('admin.cache.filters.search', 'Search instance, namespace, tag...')}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-emerald-500/70"
              />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-auto">
            {activeTab === 'instances' ? (
              <InstancesTable
                instances={instances}
                loading={loading}
                busyKey={operationBusy}
                onRefresh={(instanceName) => {
                  void executeOperation(`refresh-instance:${instanceName}`, () => AdminCacheService.refreshInstance(instanceName));
                }}
                onDelete={(instanceName) => {
                  setPendingDeleteInstance(instanceName);
                }}
              />
            ) : (
              <NamespacesTable
                policies={namespacePolicies}
                instances={overview?.instances ?? []}
                loading={loading}
                busyKey={operationBusy}
                onDelete={(namespace) => {
                  setPendingDeleteNamespace(namespace);
                }}
                onRefresh={(namespace) => {
                  void executeOperation(`refresh-namespace:${namespace}`, () => AdminCacheService.refreshNamespace(namespace));
                }}
                onInspect={(namespace) => {
                  void inspectNamespaceKeys(namespace);
                }}
              />
            )}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {t('admin.cache.keyList.title', 'Namespace keys')}
              </h3>
              {keyList ? (
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {keyList.returnedItems}/{keyList.scannedItems}
                </span>
              ) : null}
            </div>
            {keyListError ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                {keyListError}
              </div>
            ) : null}
            {keyList ? (
              <div className="mt-3">
                <div className="min-w-0 text-xs text-slate-500 dark:text-slate-400">
                  <div className="truncate font-mono text-slate-700 dark:text-slate-200">{keyList.namespace}</div>
                  <div className="mt-0.5 truncate">{keyList.instanceName}</div>
                </div>
                {keyList.pageInfo.hasMore ? (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    {t('admin.cache.keyList.truncated', 'Showing {{shown}} keys from a bounded scan of {{scanned}} keys. Load more to continue the safe scan.', {
                      shown: keyList.returnedItems,
                      scanned: keyList.scannedItems,
                    })}
                  </div>
                ) : null}
                <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                  {keyList.items.length === 0 ? (
                    <div className="rounded-lg border border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                      {t('admin.cache.states.noKeys', 'No cache keys')}
                    </div>
                  ) : keyList.items.map((item) => (
                    <button
                      key={`${item.namespace}:${item.key}`}
                      type="button"
                      onClick={() => {
                        setDeleteKeyNamespace(item.namespace);
                        setDeleteKeyValue(item.key);
                      }}
                      className="flex w-full min-w-0 items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/50 dark:border-white/10 dark:hover:border-emerald-500/40 dark:hover:bg-emerald-500/10"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-xs text-slate-800 dark:text-slate-100">{item.key}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500 dark:text-slate-400">
                          {item.expiresInSeconds === null
                            ? t('admin.cache.keyList.noExpiry', 'No expiry metadata')
                            : t('admin.cache.keyList.expiresIn', '{{seconds}}s remaining', { seconds: item.expiresInSeconds })}
                        </span>
                      </span>
                      <StatusBadge status={item.status} />
                    </button>
                  ))}
                </div>
                {keyList.pageInfo.nextCursor ? (
                  <button
                    type="button"
                    disabled={operationBusy !== null}
                    onClick={() => {
                      void inspectNamespaceKeys(keyList.namespace, keyList.pageInfo.nextCursor);
                    }}
                    className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
                  >
                    <ChevronDown className="h-4 w-4" />
                    {t('admin.cache.actions.loadMoreKeys', 'Load more keys')}
                  </button>
                ) : null}
              </div>
            ) : (
              <div className="mt-3 rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
                {t('admin.cache.keyList.emptyPrompt', 'Select inspect on a namespace to load key metadata.')}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {t('admin.cache.keyDelete.title', 'Delete cache key')}
            </h3>
            <div className="mt-4 space-y-3">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('admin.cache.keyDelete.namespace', 'Namespace')}
                <input
                  type="text"
                  value={deleteKeyNamespace}
                  onChange={(event) => setDeleteKeyNamespace(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="auth.qr.challenge"
                />
              </label>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                {t('admin.cache.keyDelete.key', 'Key')}
                <input
                  type="text"
                  value={deleteKeyValue}
                  onChange={(event) => setDeleteKeyValue(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  placeholder="qr-key"
                />
              </label>
              <button
                type="button"
                disabled={operationBusy !== null}
                onClick={handleDeleteKey}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition-colors hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/15"
              >
                <Trash2 className="h-4 w-4" />
                {t('admin.cache.actions.deleteKey', 'Delete key')}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-5 text-slate-500 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a] dark:text-slate-400">
            <div className="font-semibold text-slate-700 dark:text-slate-200">{t('admin.cache.policy.title', 'Runtime policy')}</div>
            <div className="mt-2">{t('admin.cache.policy.desktop', 'Desktop packaged mode binds to local cache.')}</div>
            <div>{t('admin.cache.policy.service', 'Server, Docker, and Kubernetes modes bind to Redis cache.')}</div>
          </div>
        </aside>
      </div>

      {pendingDeleteNamespace ? (
        <ConfirmDialog
          title={t('admin.cache.confirm.deleteNamespaceTitle', 'Delete cache namespace')}
          description={t('admin.cache.confirm.deleteNamespaceDescription', 'Delete all keys under namespace {{namespace}}. This cannot be undone.', {
            namespace: pendingDeleteNamespace,
          })}
          confirmLabel={t('admin.cache.actions.deleteNamespace', 'Delete namespace')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={operationBusy === `delete-namespace:${pendingDeleteNamespace}`}
          onCancel={() => setPendingDeleteNamespace(null)}
          onConfirm={confirmDeleteNamespace}
        />
      ) : null}

      {pendingDeleteInstance ? (
        <ConfirmDialog
          title={t('admin.cache.confirm.deleteInstanceTitle', 'Delete cache instance')}
          description={t('admin.cache.confirm.deleteInstanceDescription', 'Delete all keys under cache instance {{instanceName}}. This cannot be undone.', {
            instanceName: pendingDeleteInstance,
          })}
          confirmLabel={t('admin.cache.actions.deleteInstance', 'Delete instance')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={operationBusy === `delete-instance:${pendingDeleteInstance}`}
          onCancel={() => setPendingDeleteInstance(null)}
          onConfirm={confirmDeleteInstance}
        />
      ) : null}

      {pendingDeleteKey ? (
        <ConfirmDialog
          title={t('admin.cache.confirm.deleteKeyTitle', 'Delete cache key')}
          description={t('admin.cache.confirm.deleteKeyDescription', 'Delete key {{key}} from namespace {{namespace}}. This cannot be undone.', {
            key: pendingDeleteKey.key,
            namespace: pendingDeleteKey.namespace,
          })}
          confirmLabel={t('admin.cache.actions.deleteKey', 'Delete key')}
          cancelLabel={t('common.actions.cancel', 'Cancel')}
          tone="danger"
          icon={<Trash2 className="h-4 w-4" />}
          isBusy={operationBusy === 'delete-key'}
          onCancel={() => setPendingDeleteKey(null)}
          onConfirm={confirmDeleteKey}
        />
      ) : null}
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  loading,
}: {
  icon: typeof Database;
  label: string;
  value: string;
  detail: string;
  loading: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="min-w-0">
        <div className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</div>
        <div className="mt-1 truncate text-xl font-semibold tabular-nums text-slate-900 dark:text-white">
          {loading ? '--' : value}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-slate-400 dark:text-slate-500">{detail}</div>
      </div>
      <div className="ml-3 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
        <Icon className="h-4 w-4" />
      </div>
    </div>
  );
}

function CompactMetric({
  label,
  value,
  loading,
  tone = 'default',
}: {
  label: string;
  value: string;
  loading?: boolean;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="truncate text-[11px] font-medium uppercase text-slate-500 dark:text-slate-400">{label}</div>
      <div className={`mt-1 text-sm font-semibold tabular-nums ${tone === 'danger' ? 'text-red-600 dark:text-red-300' : 'text-slate-900 dark:text-white'}`}>
        {loading ? '--' : value}
      </div>
    </div>
  );
}

function InstancesTable({
  instances,
  loading,
  busyKey,
  onRefresh,
  onDelete,
}: {
  instances: CacheInstance[];
  loading: boolean;
  busyKey: string | null;
  onRefresh: (instanceName: string) => void;
  onDelete: (instanceName: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <table className="w-full min-w-[1040px] text-left text-sm">
      <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        <tr>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.instance', 'Instance')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.provider', 'Provider')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.entries', 'Entries')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.activity', 'Activity')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.ttl', 'TTL')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.prefix', 'Prefix')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.status', 'Status')}</th>
          <th className="px-4 py-3 text-right font-medium">{t('admin.cache.table.actions', 'Actions')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-white/5">
        {loading ? (
          <BusinessStateTableRow colSpan={8} kind="loading" title={t('admin.cache.states.loading', 'Loading cache data...')} />
        ) : instances.length === 0 ? (
          <BusinessStateTableRow colSpan={8} kind="empty" title={t('admin.cache.states.noInstances', 'No cache instances')} />
        ) : instances.map((instance) => (
          <tr key={instance.name} className="hover:bg-slate-50 dark:hover:bg-white/5">
            <td className="px-4 py-3">
              <div className="font-medium text-slate-900 dark:text-white">{instance.name}</div>
              <div className="mt-0.5 max-w-[280px] truncate text-xs text-slate-500 dark:text-slate-400">{instance.purpose}</div>
            </td>
            <td className="px-4 py-3">
              <ProviderBadge providerKind={instance.providerKind} />
              {instance.connectionProfileName ? (
                <div className="mt-1 text-xs text-slate-400">{instance.connectionProfileName}</div>
              ) : null}
            </td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              <span className="font-medium tabular-nums text-slate-900 dark:text-white">{instance.entryCount}</span>
              <span className="ml-2 text-xs text-slate-400">{t('admin.cache.table.expiredCount', '{{count}} expired', { count: instance.expiredEntryCount })}</span>
            </td>
            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
              <div className="whitespace-nowrap">
                {t('admin.cache.table.hitMissValue', '{{hits}} hit / {{misses}} miss', {
                  hits: instance.cacheHits,
                  misses: instance.cacheMisses,
                })}
              </div>
              <div className={`mt-0.5 whitespace-nowrap ${instance.cacheErrors > 0 ? 'text-red-600 dark:text-red-300' : ''}`}>
                {t('admin.cache.table.operationValue', '{{writes}} write / {{deletes}} delete / {{errors}} error', {
                  writes: instance.cacheWrites,
                  deletes: instance.cacheDeletes,
                  errors: instance.cacheErrors,
                })}
              </div>
            </td>
            <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{formatSeconds(instance.defaultTtlSeconds)}</td>
            <td className="px-4 py-3 font-mono text-xs text-slate-500 dark:text-slate-400">{instance.keyPrefix}</td>
            <td className="px-4 py-3">
              <StatusBadge status={instance.status} />
            </td>
            <td className="px-4 py-3 text-right">
              <div className="inline-flex items-center gap-2">
              <button
                type="button"
                disabled={!instance.supportsRefresh || busyKey !== null}
                onClick={() => onRefresh(instance.name)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busyKey === `refresh-instance:${instance.name}` ? 'animate-spin' : ''}`} />
                {instance.supportsRefresh
                  ? t('admin.cache.actions.refresh', 'Refresh')
                  : t('admin.cache.actions.refreshUnavailable', 'Refresh unavailable')}
              </button>
              <button
                type="button"
                disabled={!instance.supportsDelete || busyKey !== null}
                onClick={() => onDelete(instance.name)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {instance.supportsDelete
                  ? t('admin.cache.actions.deleteInstance', 'Delete instance')
                  : t('admin.cache.actions.deleteUnavailable', 'Delete unavailable')}
              </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function NamespacesTable({
  policies,
  instances,
  loading,
  busyKey,
  onDelete,
  onRefresh,
  onInspect,
}: {
  policies: CacheNamespacePolicy[];
  instances: CacheInstance[];
  loading: boolean;
  busyKey: string | null;
  onDelete: (namespace: string) => void;
  onRefresh: (namespace: string) => void;
  onInspect: (namespace: string) => void;
}) {
  const { t } = useTranslation();
  const capabilitiesByInstance = useMemo(() => {
    const capabilityByInstance = new Map<string, { supportsDelete: boolean; supportsInspect: boolean; supportsRefresh: boolean }>();
    for (const instance of instances) {
      if (!capabilityByInstance.has(instance.name)) {
        capabilityByInstance.set(instance.name, {
          supportsDelete: instance.supportsDelete,
          supportsInspect: instance.supportsInspect,
          supportsRefresh: instance.supportsRefresh,
        });
      }
    }
    return capabilityByInstance;
  }, [instances]);
  return (
    <table className="w-full min-w-[920px] text-left text-sm">
      <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
        <tr>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.namespace', 'Namespace')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.instance', 'Instance')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.policy', 'Policy')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.ttl', 'TTL')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.tags', 'Tags')}</th>
          <th className="px-4 py-3 font-medium">{t('admin.cache.table.status', 'Status')}</th>
          <th className="px-4 py-3 text-right font-medium">{t('admin.cache.table.actions', 'Actions')}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-200 dark:divide-white/5">
        {loading ? (
          <BusinessStateTableRow colSpan={7} kind="loading" title={t('admin.cache.states.loading', 'Loading cache data...')} />
        ) : policies.length === 0 ? (
          <BusinessStateTableRow colSpan={7} kind="empty" title={t('admin.cache.states.noNamespaces', 'No cache namespaces')} />
        ) : policies.map((policy) => {
          const capabilities = capabilitiesByInstance.get(policy.instanceName);
          const supportsDelete = capabilities?.supportsDelete ?? true;
          const supportsInspect = capabilities?.supportsInspect ?? true;
          const supportsRefresh = capabilities?.supportsRefresh ?? true;
          return (
          <tr key={policy.namespace} className="hover:bg-slate-50 dark:hover:bg-white/5">
            <td className="px-4 py-3 font-mono text-xs text-slate-700 dark:text-slate-200">{policy.namespace}</td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{policy.instanceName}</td>
            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
              <div className="flex max-w-[340px] flex-wrap items-center gap-1.5">
                <PolicyPill value={policy.scope} />
                <PolicyPill value={policy.sensitivity} />
                <PolicyPill value={policy.consistency} />
                <PolicyPill value={policy.failureMode} />
                <PolicyPill value={`jitter ${policy.jitterPercent}%`} />
                {policy.staleWhileRevalidateSeconds > 0 ? (
                  <PolicyPill value={`stale ${formatSeconds(policy.staleWhileRevalidateSeconds)}`} />
                ) : null}
              </div>
            </td>
            <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{formatSeconds(policy.ttlSeconds)}</td>
            <td className="px-4 py-3">
              <div className="flex max-w-[260px] flex-wrap gap-1">
                {policy.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            </td>
            <td className="px-4 py-3">
              <StatusBadge status={policy.enabled ? 'enabled' : 'disabled'} />
            </td>
            <td className="px-4 py-3 text-right">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={!supportsInspect || busyKey !== null}
                  onClick={() => onInspect(policy.namespace)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
                >
                  <Eye className="h-3.5 w-3.5" />
                  {supportsInspect
                    ? t('admin.cache.actions.inspectKeys', 'Inspect keys')
                    : t('admin.cache.actions.inspectUnavailable', 'Inspect unavailable')}
                </button>
                <button
                  type="button"
                  disabled={!supportsRefresh || busyKey !== null}
                  onClick={() => onRefresh(policy.namespace)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:text-slate-200 dark:hover:border-emerald-500/40 dark:hover:text-emerald-300"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${busyKey === `refresh-namespace:${policy.namespace}` ? 'animate-spin' : ''}`} />
                  {supportsRefresh
                    ? t('admin.cache.actions.refresh', 'Refresh')
                    : t('admin.cache.actions.refreshUnavailable', 'Refresh unavailable')}
                </button>
                <button
                  type="button"
                  disabled={!supportsDelete || busyKey !== null}
                  onClick={() => onDelete(policy.namespace)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {supportsDelete
                    ? t('admin.cache.actions.deleteNamespace', 'Delete namespace')
                    : t('admin.cache.actions.deleteUnavailable', 'Delete unavailable')}
                </button>
              </div>
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PolicyPill({ value }: { value: string }) {
  return (
    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">
      {value}
    </span>
  );
}

function ProviderBadge({ providerKind }: { providerKind: CacheProviderKind }) {
  const { t } = useTranslation();
  const isRedis = providerKind === 'redis_cache';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
      isRedis
        ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
    }`}>
      {t(`admin.cache.provider.${providerKind}`, providerKind)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const normalized = status.toLowerCase();
  const active = normalized === 'ready' || normalized === 'enabled' || normalized === 'completed';
  const warning = normalized === 'degraded';
  const label = t(`admin.cache.status.${normalized}`, status);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
      active
        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
        : warning
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'
        : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300'
    }`}>
      {label}
    </span>
  );
}

function formatRuntimeTarget(value: CacheRuntimeTarget, t: Translate): string {
  return t(`admin.cache.runtime.${value}`, value);
}

function formatSeconds(value: number): string {
  if (value >= 3600 && value % 3600 === 0) {
    return `${value / 3600}h`;
  }
  if (value >= 60 && value % 60 === 0) {
    return `${value / 60}m`;
  }
  return `${value}s`;
}
