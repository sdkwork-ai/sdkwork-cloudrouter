import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Building2, Check, CheckCircle2, Edit3, ExternalLink, Loader2, Plus, RefreshCw, Settings2, Share2, Sparkles, Trash2, X } from 'lucide-react';
import { AdminTableShell, ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons';
import { SdkworkSearchableSelect } from '@sdkwork/appbase-pc-react';
import { useTranslation } from 'react-i18next';
import type {
  CreateUpstreamSupplierRequest,
  LlmProtocolConfig,
  UpstreamResourceCatalogResponse,
  UpstreamResourceEntitlementInput,
  UpstreamSupplier,
  UpstreamSupplierAuthMethodInput,
  UpstreamSupplierEndpointInput,
  UpstreamSupplierModelListEntry,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { upstreamService } from './upstreamService';
import { isKnownLlmProtocol, LLM_PROTOCOLS, llmProtocolLabelKey, PROTOCOL_RESOURCE_GROUPS } from './llmProtocols';
import { resolveVendorBaseUrl, vendorStandardBaseUrl } from './vendorBaseUrlRules';
import { resolveVendorProtocolDefaultUrl, normalizeVendorRegion, vendorSupportedProtocols } from './vendorProtocolBaseUrls';
import { emptyResourceSelection, ResourcePicker, toEntitlements, toSelection, type ResourceSelection } from './resourcePicker';
import {
  dangerButtonClass,
  errorMessage,
  errorMessageI18n,
  InlineError,
  inputClass,
  ModelAccessListEditor,
  normalizeModelList,
  primaryButtonClass,
  SearchBox,
  secondaryButtonClass,
  selectClass,
  SidePanel,
  StatusBadge,
  TableState,
  textAreaClass,
  UpstreamPageShell,
} from './components';

type SupplierType = 'official' | 'relay';

interface SupplierFormValues {
  supplierName: string;
  displayName: string;
  description: string;
  supplierType: SupplierType;
  defaultVendorCode: string | null;
  adapterCode: string;
  protocols: LlmProtocolConfig[];
  authMethods: UpstreamSupplierAuthMethodInput[];
  modelBlacklist: UpstreamSupplierModelListEntry[];
  modelWhitelist: UpstreamSupplierModelListEntry[];
  websiteUrl: string;
  docsUrl: string;
  regionCode: string;
  environment: number;
  sortOrder: number;
  status: number;
  resources: UpstreamResourceEntitlementInput[];
}

export function UpstreamSupplierAdmin() {
  return (
    <UpstreamPageShell>
      <SupplierAdminPanel />
    </UpstreamPageShell>
  );
}

const emptyEndpoint = (): UpstreamSupplierEndpointInput => ({
  endpointCode: '',
  endpointName: '',
  baseUrl: '',
  environment: 1,
  priority: 100,
  routingWeight: 100,
  status: 1,
});

const emptyAuthMethod = (): UpstreamSupplierAuthMethodInput => ({
  authMethodCode: 'api-key',
  authMethodName: 'API Key',
  authType: 'api_key',
  priority: 100,
  status: 1,
  configSchema: {},
  runtimeAuthConfig: {
    credentialTransport: 'bearer',
    credentialParameter: null,
    defaultHeaders: {},
  },
});

/**
 * 认证方式预设枚举：勾选即生成对应认证方式记录。
 * code 为固定枚举值（账号表单与运行时按 auth_method_code 关联，不可随意修改），
 * name 为存入数据库的规范名称（语言中立），labelKey 为界面展示文案。
 */
const AUTH_METHOD_PRESETS: readonly {
  code: string;
  name: string;
  labelKey: string;
  authType: UpstreamSupplierAuthMethodInput['authType'];
  runtimeAuthConfig: UpstreamSupplierAuthMethodInput['runtimeAuthConfig'];
}[] = [
  {
    code: 'api-key',
    name: 'API Key',
    labelKey: 'admin.upstream.supplier.auth.preset.apiKeyBearer',
    authType: 'api_key',
    runtimeAuthConfig: { credentialTransport: 'bearer', credentialParameter: null, defaultHeaders: {} },
  },
  {
    code: 'api-key-header',
    name: 'API Key (Header)',
    labelKey: 'admin.upstream.supplier.auth.preset.apiKeyHeader',
    authType: 'api_key',
    runtimeAuthConfig: { credentialTransport: 'header', credentialParameter: 'x-api-key', defaultHeaders: {} },
  },
  {
    code: 'bearer-token',
    name: 'Bearer Token',
    labelKey: 'admin.upstream.supplier.auth.preset.bearerToken',
    authType: 'bearer_token',
    runtimeAuthConfig: { credentialTransport: 'bearer', credentialParameter: null, defaultHeaders: {} },
  },
  {
    code: 'custom-header',
    name: 'Custom Header',
    labelKey: 'admin.upstream.supplier.auth.preset.customHeader',
    authType: 'custom',
    runtimeAuthConfig: { credentialTransport: 'header', credentialParameter: 'x-api-key', defaultHeaders: {} },
  },
  {
    code: 'query-key',
    name: 'Query Key',
    labelKey: 'admin.upstream.supplier.auth.preset.queryKey',
    authType: 'custom',
    runtimeAuthConfig: { credentialTransport: 'query', credentialParameter: 'key', defaultHeaders: {} },
  },
];

function SupplierTypeBadge({ type }: { type: SupplierType }) {
  const { t } = useTranslation();
  const official = type === 'official';
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-1 text-xs font-semibold ${official ? 'bg-lobster-50 text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300' : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300'}`}>
      {official ? <Building2 className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
      {official ? t('admin.upstream.supplier.type.official') : t('admin.upstream.supplier.type.relay')}
    </span>
  );
}

export function SupplierAdminPanel() {
  const { t } = useTranslation();
  const [items, setItems] = useState<UpstreamSupplier[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | SupplierType>('all');
  const [catalog, setCatalog] = useState<UpstreamResourceCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<UpstreamSupplier | null | undefined>(undefined);
  const [selected, setSelected] = useState<UpstreamSupplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UpstreamSupplier | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await upstreamService.suppliers.list({ page: 1, pageSize: 200, q: appliedQuery || undefined });
      setItems(page.items);
      setTotalCount(Number(page.pageInfo?.totalItems ?? page.items.length));
      setSelected((current) => current ? page.items.find((item) => item.id === current.id) ?? null : null);
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, t]);

  useEffect(() => { void load(); }, [load]);

  const loadCatalog = useCallback(async () => {
    if (catalog) return;
    try {
      const value = await upstreamService.fetchResourceCatalog();
      if (!value || !Array.isArray(value.resources) || !Array.isArray(value.resourceGroups)) {
        setError(t('admin.upstream.common.errors.operationFailed'));
        return;
      }
      setCatalog(value);
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    }
  }, [catalog, t]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);

  const filteredItems = useMemo(() => {
    if (typeFilter === 'all') return items;
    return items.filter((item) => item.supplierType === typeFilter);
  }, [items, typeFilter]);

  const officialCount = useMemo(() => items.filter((item) => item.supplierType === 'official').length, [items]);
  const relayCount = useMemo(() => items.filter((item) => item.supplierType === 'relay').length, [items]);

  const submitSupplier = async (values: SupplierFormValues) => {
    setBusy(true);
    setError(null);
    try {
      const input: CreateUpstreamSupplierRequest = {
        supplierName: values.supplierName,
        displayName: values.displayName || null,
        description: values.description || null,
        supplierType: values.supplierType,
        defaultVendorCode: values.defaultVendorCode,
        adapterCode: values.adapterCode,
        protocols: values.protocols,
        modelBlacklist: normalizeModelList(values.modelBlacklist),
        modelWhitelist: normalizeModelList(values.modelWhitelist),
        websiteUrl: values.websiteUrl || null,
        docsUrl: values.docsUrl || null,
        regionCode: values.regionCode || null,
        environment: values.environment,
        sortOrder: values.sortOrder,
        status: values.status,
      };
      let supplier: UpstreamSupplier;
      if (editing) {
        supplier = await upstreamService.suppliers.update(editing, input);
      } else {
        supplier = await upstreamService.suppliers.create(input);
      }
      try {
        // 认证方式随表单全量保存（新建默认含 api-key 行；编辑覆盖原配置，与端点同步语义一致）
        await upstreamService.suppliers.replaceAuthMethods(supplier, { items: values.authMethods });
        // 嵌套替换会推进供应商版本：重新读取最新版本，避免下一次 If-Match 冲突
        supplier = await upstreamService.suppliers.retrieve(supplier.id);
      } catch (cause) {
        setEditing(undefined);
        setSelected(supplier);
        setError(t('admin.upstream.supplier.errors.authMethodsNotSaved'));
        await load();
        return;
      }
      try {
        // 每个协议行同步为一条 endpoint（protocolCode + baseUrl），供运行时路由使用；
        // 保留详情面板中手动添加的非协议端点（protocol-* 前缀由抽屉管理，避免全量替换时静默丢失）
        const existingEndpoints = await upstreamService.suppliers.listEndpoints(supplier.id);
        const customEndpoints = existingEndpoints
          .filter((endpoint) => !(endpoint.endpointCode ?? '').startsWith('protocol-'))
          .map(({ endpointCode, endpointName, baseUrl, protocolCode, regionCode, environment, priority, routingWeight, timeoutMs, status }) => ({ endpointCode, endpointName, baseUrl, protocolCode, regionCode, environment, priority, routingWeight, timeoutMs, status }));
        await upstreamService.suppliers.replaceEndpoints(supplier, {
          items: [
            ...values.protocols.map((protocol, index) => ({
              endpointCode: `protocol-${protocol.protocolCode}`,
              endpointName: protocol.protocolCode,
              baseUrl: protocol.baseUrl.trim(),
              protocolCode: protocol.protocolCode,
              environment: values.environment,
              priority: 100 + index,
              routingWeight: 100,
              status: values.status,
            })),
            ...customEndpoints,
          ],
        });
        // 同上：重新读取最新版本后再进行下一次嵌套替换
        supplier = await upstreamService.suppliers.retrieve(supplier.id);
      } catch (cause) {
        setEditing(undefined);
        setSelected(supplier);
        setError(t('admin.upstream.supplier.errors.endpointsNotSaved'));
        await load();
        return;
      }
      if (values.resources.length > 0) {
        try {
          await upstreamService.suppliers.replaceResources(supplier, { items: values.resources });
        } catch (cause) {
          setEditing(undefined);
          setSelected(supplier);
          setError(t('admin.upstream.supplier.errors.resourcesNotSaved'));
          await load();
          return;
        }
      }
      setEditing(undefined);
      await load();
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const deleteSupplier = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    setError(null);
    try {
      await upstreamService.suppliers.delete(deleteTarget);
      setDeleteTarget(null);
      setSelected((current) => current?.id === deleteTarget.id ? null : current);
      await load();
    } catch (cause) {
      // 供应商被活跃账号引用时后端返回 409 冲突：显示专门提示而非通用冲突文案
      const problem = (cause as { problem?: { code?: number | string } } | undefined)?.problem;
      setError(problem?.code === 40901
        ? t('admin.upstream.supplier.errors.deleteInUse')
        : errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  const updateSelected = (supplier: UpstreamSupplier) => {
    setSelected(supplier);
    setItems((current) => current.map((item) => item.id === supplier.id ? supplier : item));
  };

  const typeFilterOptions: { value: 'all' | SupplierType; label: string }[] = [
    { value: 'all', label: t('admin.upstream.supplier.filter.all') },
    { value: 'official', label: t('admin.upstream.supplier.filter.official') },
    { value: 'relay', label: t('admin.upstream.supplier.filter.relay') },
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" data-admin-upstream-toolbar>
        <div className="flex flex-wrap items-center gap-2">
          <div data-admin-upstream-search><SearchBox value={query} placeholder={t('admin.upstream.supplier.search.placeholder')} onChange={setQuery} onSubmit={setAppliedQuery} /></div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-[#171717]">
            {typeFilterOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setTypeFilter(option.value)}
                className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition ${typeFilter === option.value ? 'bg-lobster-600 text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="hidden items-center gap-2 text-xs text-slate-500 dark:text-slate-400 md:flex">
            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-lobster-500" />{t('admin.upstream.supplier.stats.official', { count: officialCount })}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="inline-flex items-center gap-1"><Share2 className="h-3.5 w-3.5 text-amber-500" />{t('admin.upstream.supplier.stats.relay', { count: relayCount })}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className={secondaryButtonClass} onClick={() => void load()} disabled={loading} title={t('common.actions.refresh')}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.actions.refresh')}
          </button>
          <button type="button" className={primaryButtonClass} onClick={() => setEditing(null)} data-admin-upstream-primary-action>
            <Plus className="h-4 w-4" />
            {t('admin.upstream.supplier.actions.new')}
          </button>
        </div>
      </div>
      <InlineError message={error} />
      <AdminTableShell>
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase text-slate-500 dark:bg-[#111] dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">{t('admin.upstream.supplier.table.supplier')}</th>
              <th className="px-4 py-3">{t('admin.upstream.supplier.table.type')}</th>
              <th className="px-4 py-3">{t('admin.upstream.supplier.table.protocolAdapter')}</th>
              <th className="px-4 py-3">{t('admin.upstream.supplier.table.region')}</th>
              <th className="px-4 py-3">{t('admin.upstream.supplier.table.status')}</th>
              <th className="px-4 py-3 text-right">{t('admin.upstream.supplier.table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredItems.length === 0 ? <TableState loading={loading} empty={t('admin.upstream.supplier.empty')} colSpan={6} /> : filteredItems.map((supplier) => (
              <tr key={supplier.id} className="text-slate-700 hover:bg-slate-50/80 dark:text-slate-200 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => setSelected(supplier)} className="text-left">
                    <span className="block font-semibold text-slate-900 dark:text-white">{supplier.displayName}</span>
                    <span className="mt-0.5 block font-mono text-xs text-slate-500">{supplier.supplierCode}</span>
                  </button>
                </td>
                <td className="px-4 py-3"><SupplierTypeBadge type={supplier.supplierType as SupplierType} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1">
                    {(supplier.protocols?.length ? supplier.protocols : []).map((protocol) => (
                      <span key={protocol.protocolCode} className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300" title={protocol.protocolCode}>
                        {t(llmProtocolLabelKey(protocol.protocolCode))}
                      </span>
                    ))}
                    {!supplier.protocols?.length ? <span className="font-medium">{supplier.protocolCode}</span> : null}
                    <span className="text-xs text-slate-500">{supplier.adapterCode}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{supplier.regionCode || '-'}</td>
                <td className="px-4 py-3"><StatusBadge status={supplier.status} healthy={supplier.healthStatus} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <button type="button" className={secondaryButtonClass} onClick={() => setSelected(supplier)} title={t('admin.upstream.common.actions.configure')}><Settings2 className="h-4 w-4" /></button>
                    <button type="button" className={secondaryButtonClass} onClick={() => setEditing(supplier)} title={t('common.actions.edit')}><Edit3 className="h-4 w-4" /></button>
                    <button type="button" className={dangerButtonClass} onClick={() => setDeleteTarget(supplier)} title={t('common.actions.delete')}><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalCount > items.length ? (
          <p className="px-4 py-3 text-xs text-amber-600 dark:text-amber-400">
            {t('admin.upstream.common.truncated', 'Showing {{shown}} of {{total}} suppliers; refine the search to reach the rest.', { shown: items.length, total: totalCount })}
          </p>
        ) : null}
      </AdminTableShell>

      {editing !== undefined ? (
        <SupplierDrawer supplier={editing} catalog={catalog} busy={busy} onSubmit={(values) => void submitSupplier(values)} onClose={() => setEditing(undefined)} />
      ) : null}
      {selected ? (
        <SupplierCapabilities supplier={selected} onChanged={updateSelected} onClose={() => setSelected(null)} />
      ) : null}
      {deleteTarget ? (
        <ConfirmDialog
          title={t('admin.upstream.supplier.delete.title')}
          description={t('admin.upstream.supplier.delete.description', { name: deleteTarget.displayName })}
          confirmLabel={t('common.actions.delete')}
          tone="danger"
          isBusy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void deleteSupplier()}
        />
      ) : null}
    </div>
  );
}

function SupplierDrawer({ supplier, catalog, busy, onSubmit, onClose }: { supplier: UpstreamSupplier | null; catalog: UpstreamResourceCatalogResponse | null; busy: boolean; onSubmit: (values: SupplierFormValues) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [supplierType, setSupplierType] = useState<SupplierType>(supplier?.supplierType as SupplierType ?? 'official');
  const [defaultVendorCode, setDefaultVendorCode] = useState<string | null>(supplier?.defaultVendorCode ?? null);
  const [regionCode, setRegionCode] = useState(supplier?.regionCode ?? '');
  const [protocols, setProtocols] = useState<LlmProtocolConfig[]>(() => {
    if (supplier?.protocols?.length) return supplier.protocols;
    // 旧数据兼容：协议记录为空但主协议在枚举内时回退勾选该协议待填
    if (supplier?.protocolCode && isKnownLlmProtocol(supplier.protocolCode)) {
      return [{ protocolCode: supplier.protocolCode as LlmProtocolConfig['protocolCode'], baseUrl: '' }];
    }
    // 新建：空起点，由选择 vendor 的级联自动勾选协议
    return [];
  });
  const [selection, setSelection] = useState<ResourceSelection>(emptyResourceSelection());
  // 认证方式：预设枚举多选；已存在但不属于任何预设的自定义认证方式原样保留
  const [selectedAuthPresets, setSelectedAuthPresets] = useState<string[]>(() => (supplier ? [] : ['api-key']));
  const [preservedAuthMethods, setPreservedAuthMethods] = useState<UpstreamSupplierAuthMethodInput[]>([]);
  // 模型黑白名单（结构 {vendorCode, models}，与账号分组一致）
  const [modelBlacklist, setModelBlacklist] = useState<UpstreamSupplierModelListEntry[]>(() => supplier?.modelBlacklist ?? []);
  const [modelWhitelist, setModelWhitelist] = useState<UpstreamSupplierModelListEntry[]>(() => supplier?.modelWhitelist ?? []);
  const [rightTab, setRightTab] = useState<'groups' | 'resources' | 'modelBlacklist'>('groups');
  const [resourcesLoading, setResourcesLoading] = useState(Boolean(supplier));
  const [formError, setFormError] = useState<string | null>(null);

  const vendorResources = useMemo(() => (catalog?.resources ?? []).filter((resource) => resource.resourceType === 'vendor'), [catalog]);
  // 模型黑白名单可选的 vendor 列表（含已配置但目录中已下线的 vendor）
  const availableVendors = useMemo(() => {
    const labels = new Map<string, string>();
    for (const resource of catalog?.resources.filter((entry) => entry.resourceType === 'vendor') ?? []) {
      if (resource.vendorCode) labels.set(resource.vendorCode, `${resource.displayName} (${resource.vendorCode})`);
    }
    for (const entry of [...modelBlacklist, ...modelWhitelist]) {
      if (entry.vendorCode && !labels.has(entry.vendorCode)) labels.set(entry.vendorCode, entry.vendorCode);
    }
    return [...labels.entries()].map(([vendorCode, label]) => ({ vendorCode, label }));
  }, [catalog, modelBlacklist, modelWhitelist]);
  const grantableVendorResources = useMemo(() => {
    if (!defaultVendorCode) return [];
    return (catalog?.resources ?? []).filter((resource) => resource.vendorCode === defaultVendorCode);
  }, [catalog, defaultVendorCode]);
  const vendorGranted = useMemo(() => {
    if (!defaultVendorCode) return false;
    return grantableVendorResources.length > 0 && grantableVendorResources.every((resource) => selection.resourceCodes.includes(resource.resourceCode));
  }, [grantableVendorResources, selection.resourceCodes]);

  useEffect(() => {
    if (!supplier) return;
    let cancelled = false;
    void Promise.all([
      upstreamService.suppliers.listResources(supplier.id),
      upstreamService.suppliers.listAuthMethods(supplier.id),
    ])
      .then(([items, methods]) => {
        if (cancelled) return;
        setSelection(toSelection(items.map(({ resourceCode, resourceGroupCode, grantType, priority, status }) => ({ resourceCode, resourceGroupCode, grantType, priority, status }))));
        const known = new Set(AUTH_METHOD_PRESETS.map((preset) => preset.code));
        const mapped = methods.filter((method) => known.has(method.authMethodCode));
        setSelectedAuthPresets(mapped.length > 0
          ? mapped.map((method) => method.authMethodCode)
          : ['api-key']);
        setPreservedAuthMethods(methods
          .filter((method) => !known.has(method.authMethodCode))
          .map(({ authMethodCode, authMethodName, authType, configSchema, runtimeAuthConfig, priority, status }) => ({ authMethodCode, authMethodName, authType, configSchema, runtimeAuthConfig, priority, status })));
      })
      .catch((cause) => {
        if (!cancelled) setFormError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
      })
      .finally(() => {
        if (!cancelled) setResourcesLoading(false);
      });
    return () => { cancelled = true; };
  }, [supplier, t]);

  // 根据 sdkwork-models 的 vendor×region×协议配置，自动补填仍为空的协议行 Base URL（不覆盖已编辑的值）
  const fillEmptyProtocolBaseUrls = (vendorCode: string | null, region: string) => {
    setProtocols((current) => current.map((item) => (
      item.baseUrl.trim() ? item : { ...item, baseUrl: resolveVendorProtocolDefaultUrl(vendorCode, region, item.protocolCode)?.baseUrl ?? '' }
    )));
  };

  // 初始化后按当前 vendor+region 配置补填一次空的协议 Base URL（兼容历史数据/编辑场景）
  useEffect(() => {
    fillEmptyProtocolBaseUrls(defaultVendorCode, regionCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 已分析收录的 vendor 的协议支持集（null = 未收录，不做协议限制）
  const vendorProtocolSupport = useMemo(() => vendorSupportedProtocols(defaultVendorCode), [defaultVendorCode]);

  const handleVendorChange = (vendorCode: string) => {
    setDefaultVendorCode(vendorCode);
    const supported = vendorSupportedProtocols(vendorCode);
    // 已知 vendor：联动勾选其支持的全部 LLM 协议，并按 region 自动填入官方默认 Base URL
    // 未收录 vendor：保留当前协议行；自动填入的地址重新解析，手动编辑的值保留
    const nextProtocols: LlmProtocolConfig[] = supported
      ? supported.map((protocolCode) => ({
          protocolCode,
          baseUrl: resolveVendorProtocolDefaultUrl(vendorCode, regionCode, protocolCode)?.baseUrl ?? '',
        }))
      : protocols.map((item) => {
          const previousDefault = resolveVendorProtocolDefaultUrl(defaultVendorCode, regionCode, item.protocolCode)?.baseUrl;
          if (item.baseUrl.trim() !== '' && item.baseUrl !== previousDefault) return item;
          return { ...item, baseUrl: resolveVendorProtocolDefaultUrl(vendorCode, regionCode, item.protocolCode)?.baseUrl ?? '' };
        });
    setProtocols(nextProtocols);
    // 官方供应商：自动勾选其全部资源 + 关联资源分组（vendorCodes 匹配）+ 当前协议的对应分组
    if (vendorCode) {
      const vendorResourceCodes = (catalog?.resources ?? [])
        .filter((resource) => resource.vendorCode === vendorCode)
        .map((resource) => resource.resourceCode);
      const protocolGroupCodesList = nextProtocols.flatMap((item) => protocolGroupCodes(item.protocolCode));
      setSelection({
        resourceCodes: vendorResourceCodes,
        resourceGroupCodes: [...new Set([...vendorGroupCodes(vendorCode), ...protocolGroupCodesList])],
      });
    }
  };

  // region 联动：归一化 region（cn/global）变化时自动填入的行跟随新 region 的默认地址，手动值保留
  const handleRegionChange = (value: string) => {
    const previousRegion = regionCode;
    setRegionCode(value);
    if (normalizeVendorRegion(previousRegion) !== normalizeVendorRegion(value)) {
      setProtocols((current) => current.map((item) => {
        const previousDefault = resolveVendorProtocolDefaultUrl(defaultVendorCode, previousRegion, item.protocolCode)?.baseUrl;
        if (item.baseUrl.trim() !== '' && item.baseUrl !== previousDefault) return item;
        return { ...item, baseUrl: resolveVendorProtocolDefaultUrl(defaultVendorCode, value, item.protocolCode)?.baseUrl ?? '' };
      }));
    } else {
      fillEmptyProtocolBaseUrls(defaultVendorCode, value);
    }
  };

  /** 协议对应的资源分组（按供应商类型取映射，仅保留目录中真实存在的分组） */
  const protocolGroupCodes = (protocolCode: LlmProtocolConfig['protocolCode']): string[] =>
    ((supplierType === 'relay' ? PROTOCOL_RESOURCE_GROUPS[protocolCode]?.relay : PROTOCOL_RESOURCE_GROUPS[protocolCode]?.official) ?? [])
      .filter((code) => catalog?.resourceGroups.some((group) => group.groupCode === code));

  /** 该 vendor 的关联资源分组（排除全量 umbrella 分组与中继分组，避免过度授权） */
  const vendorGroupCodes = (vendorCode: string): string[] =>
    (catalog?.resourceGroups ?? [])
      .filter((group) => group.vendorCodes?.includes(vendorCode) && group.groupCode !== 'api.all' && !group.groupCode.startsWith('relay.'))
      .map((group) => group.groupCode);

  const toggleProtocol = (protocolCode: LlmProtocolConfig['protocolCode']) => {
    const adding = !protocols.some((item) => item.protocolCode === protocolCode);
    setProtocols((current) => {
      if (!adding) {
        return current.filter((item) => item.protocolCode !== protocolCode);
      }
      return [...current, { protocolCode, baseUrl: resolveVendorProtocolDefaultUrl(defaultVendorCode, regionCode, protocolCode)?.baseUrl ?? '' }];
    });
    // 协议 ↔ 资源分组联动：勾选时加入对应分组，取消时移除
    const groupCodes = protocolGroupCodes(protocolCode);
    if (groupCodes.length === 0) return;
    setSelection((current) => ({
      ...current,
      resourceGroupCodes: adding
        ? [...new Set([...current.resourceGroupCodes, ...groupCodes])]
        : current.resourceGroupCodes.filter((code) => !groupCodes.includes(code)),
    }));
  };

  const grantVendor = () => {
    setSelection((current) => {
      const selected = new Set(current.resourceCodes);
      grantableVendorResources.forEach((resource) => selected.add(resource.resourceCode));
      // 一键授权联动：同时补上该 vendor 的关联资源分组与当前已勾选协议的对应分组
      const protocolGroupCodesList = protocols.flatMap((item) => protocolGroupCodes(item.protocolCode));
      const groups = new Set([...current.resourceGroupCodes, ...vendorGroupCodes(defaultVendorCode ?? ''), ...protocolGroupCodesList]);
      return { ...current, resourceCodes: [...selected], resourceGroupCodes: [...groups] };
    });
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    if (!supplierType) return;
    if (supplierType === 'official' && !defaultVendorCode) {
      setFormError(t('admin.upstream.supplier.form.vendor.required'));
      return;
    }
    if (protocols.length === 0) {
      setFormError(t('admin.upstream.supplier.form.protocols.required'));
      return;
    }
    if (protocols.some((protocol) => !protocol.baseUrl.trim())) {
      setFormError(t('admin.upstream.supplier.form.protocols.baseUrlRequired'));
      return;
    }
    // 认证方式：预设勾选项生成记录，旧自定义项原样保留
    const authMethodItems: UpstreamSupplierAuthMethodInput[] = [
      ...AUTH_METHOD_PRESETS
        .filter((preset) => selectedAuthPresets.includes(preset.code))
        .map((preset) => ({
          authMethodCode: preset.code,
          authMethodName: preset.name,
          authType: preset.authType,
          priority: 100,
          status: 1,
          configSchema: {},
          runtimeAuthConfig: preset.runtimeAuthConfig,
        })),
      ...preservedAuthMethods,
    ];
    if (authMethodItems.length === 0) {
      setFormError(t('admin.upstream.supplier.form.authMethods.required'));
      return;
    }
    const values = valuesFromForm(event.currentTarget, supplierType, defaultVendorCode, selection, protocols, regionCode, authMethodItems, modelBlacklist, modelWhitelist);
    if (!values) {
      setFormError(t('admin.upstream.common.validation.required', { field: t('admin.upstream.supplier.form.supplierName') }));
      return;
    }
    onSubmit(values);
  };

  return (
    <SidePanel
      title={supplier ? t('admin.upstream.supplier.form.editTitle') : t('admin.upstream.supplier.form.createTitle')}
      anchor="left"
      widthClass="max-w-7xl"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={secondaryButtonClass} onClick={onClose} disabled={busy || resourcesLoading}>{t('common.actions.cancel')}</button>
          <button type="submit" form="supplier-drawer-form" className={primaryButtonClass} disabled={busy || resourcesLoading}>
            {(busy || resourcesLoading) ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {supplier ? t('common.actions.saveChanges') : t('admin.upstream.supplier.form.createAction')}
          </button>
        </>
      }
    >
      <form id="supplier-drawer-form" onSubmit={handleSubmit} className="grid gap-4 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)] lg:grid-rows-[minmax(0,1fr)]">
        <div className="grid min-w-0 gap-3 lg:min-h-0 lg:overflow-y-auto">
          <InlineError message={formError} />
          <div>
            <p className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{t('admin.upstream.supplier.form.supplierType')}<span className="ml-1 text-red-500">*</span></p>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSupplierType('official')}
                className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition ${supplierType === 'official' ? 'border-lobster-500 bg-lobster-50/70 ring-2 ring-lobster-500/20 dark:border-lobster-500/60 dark:bg-lobster-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]'}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${supplierType === 'official' ? 'bg-lobster-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                  <Building2 className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{t('admin.upstream.supplier.type.official')}</span>
                  <span className="block truncate text-xs leading-snug text-slate-500 dark:text-slate-400">{t('admin.upstream.supplier.type.official.hint')}</span>
                </span>
                {supplierType === 'official' ? <Check className="ml-auto h-4 w-4 shrink-0 text-lobster-600 dark:text-lobster-300" /> : null}
              </button>
              <button
                type="button"
                onClick={() => { setSupplierType('relay'); handleVendorChange(''); }}
                className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-left transition ${supplierType === 'relay' ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/20 dark:border-amber-500/60 dark:bg-amber-500/10' : 'border-slate-200 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03]'}`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${supplierType === 'relay' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400'}`}>
                  <Share2 className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white">{t('admin.upstream.supplier.type.relay')}</span>
                  <span className="block truncate text-xs leading-snug text-slate-500 dark:text-slate-400">{t('admin.upstream.supplier.type.relay.hint')}</span>
                </span>
                {supplierType === 'relay' ? <Check className="ml-auto h-4 w-4 shrink-0 text-amber-500" /> : null}
              </button>
            </div>
          </div>

          {supplierType === 'official' ? (
            <div className="flex items-end gap-2.5">
              <DrawerField label={t('admin.upstream.supplier.form.vendor.label')} required className="flex-1" hint={vendorResources.length === 0 ? t('admin.upstream.supplier.form.vendor.catalogUnavailable') : undefined}>
                <select
                  className={selectClass}
                  value={defaultVendorCode ?? ''}
                  onChange={(event) => handleVendorChange(event.currentTarget.value)}
                  disabled={vendorResources.length === 0}
                >
                  <option value="">{t('admin.upstream.supplier.form.vendor.placeholder')}</option>
                  {vendorResources.map((resource) => (
                    <option key={resource.resourceCode} value={resource.vendorCode ?? ''}>{resource.displayName} ({resource.vendorCode})</option>
                  ))}
                </select>
              </DrawerField>
              <DrawerField label={t('admin.upstream.common.fields.regionCode')} className="w-44">
                <SdkworkSearchableSelect
                  className="h-9"
                  value={regionCode}
                  onValueChange={(value) => handleRegionChange(value)}
                  options={[
                    { value: 'global', label: t('admin.upstream.supplier.protocols.region.global') },
                    { value: 'cn', label: t('admin.upstream.supplier.protocols.region.cn') },
                  ]}
                  placeholder={t('admin.upstream.common.fields.regionCode')}
                  searchPlaceholder={t('admin.upstream.common.fields.regionCode')}
                  emptyText={t('admin.upstream.common.fields.regionCode')}
                />
              </DrawerField>
              <button type="button" className={secondaryButtonClass} onClick={grantVendor} disabled={!defaultVendorCode || grantableVendorResources.length === 0}>
                {vendorGranted ? <Check className="h-4 w-4 text-emerald-500" /> : null}
                {vendorGranted ? t('admin.upstream.supplier.form.vendor.granted') : t('admin.upstream.supplier.form.vendor.grantAll')}
              </button>
            </div>
          ) : null}

        <FormSection title={t('admin.upstream.supplier.form.section.basic')}>
          <div className="grid grid-cols-2 gap-4">
            <DrawerField label={t('admin.upstream.supplier.form.supplierName')} required><input name="supplierName" className={inputClass} defaultValue={supplier?.supplierName} required /></DrawerField>
            <DrawerField label={t('admin.upstream.supplier.form.displayName')} hint={t('admin.upstream.supplier.form.displayNameHint')}><input name="displayName" className={inputClass} defaultValue={supplier?.displayName} /></DrawerField>
          </div>
        </FormSection>
        <FormSection title={t('admin.upstream.supplier.form.section.protocol')}>
          <div className={`grid gap-4 ${supplierType === 'official' ? 'grid-cols-3' : 'grid-cols-4'}`}>
            <DrawerField label={t('admin.upstream.supplier.form.protocols.title')} required hint={t('admin.upstream.supplier.form.protocols.description')} className={supplierType === 'official' ? 'col-span-3' : 'col-span-4'}>
              <div className="grid grid-cols-3 gap-1.5">
                {LLM_PROTOCOLS.map((option) => {
                  const checked = protocols.some((item) => item.protocolCode === option.code);
                  const supported = vendorProtocolSupport === null || vendorProtocolSupport.includes(option.code);
                  return (
                    <label key={option.code} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 transition ${checked ? 'bg-lobster-50 text-lobster-700 ring-1 ring-lobster-500/30 dark:bg-lobster-500/10 dark:text-lobster-200' : 'text-slate-600 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-white/5'} ${supported ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                      <input type="checkbox" className="h-4 w-4 shrink-0 accent-lobster-600" checked={checked} disabled={!supported} onChange={() => toggleProtocol(option.code)} />
                      <span className="min-w-0 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{t(option.labelKey)}</span>
                    </label>
                  );
                })}
              </div>
              {protocols.length > 0 ? (
                <div className="grid gap-1.5">
                  {protocols.map((protocol, index) => (
                    <div key={protocol.protocolCode} className="grid grid-cols-[200px_minmax(0,1fr)_auto] items-center gap-2">
                      <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200" title={protocol.protocolCode}>
                        {t(llmProtocolLabelKey(protocol.protocolCode))}
                      </span>
                      <input aria-label={t('admin.upstream.common.fields.baseUrl')} placeholder="https://api.example.com/v1" className={inputClass} value={protocol.baseUrl} onChange={(event) => { const value = event.currentTarget.value; setProtocols((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, baseUrl: value } : item)); }} />
                      {defaultVendorCode && !resolveVendorProtocolDefaultUrl(defaultVendorCode, regionCode, protocol.protocolCode) ? (
                        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{t('admin.upstream.supplier.form.protocols.noDefault')}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </DrawerField>
            <DrawerField label={t('admin.upstream.common.fields.environment')}><select name="environment" className={selectClass} defaultValue={supplier?.environment ?? 1}><option value="1">{t('admin.upstream.common.environment.production')}</option><option value="2">{t('admin.upstream.common.environment.sandbox')}</option></select></DrawerField>
            <DrawerField label={t('admin.upstream.common.fields.status')}><select name="status" className={selectClass} defaultValue={supplier?.status ?? 1}><option value="1">{t('common.status.active')}</option><option value="0">{t('common.status.disabled')}</option></select></DrawerField>
            <DrawerField label={t('admin.upstream.supplier.form.sortOrder')}><input name="sortOrder" type="number" min="0" className={inputClass} defaultValue={supplier?.sortOrder ?? 100} /></DrawerField>
            {supplierType !== 'official' ? (
              <DrawerField label={t('admin.upstream.common.fields.regionCode')} hint={t('admin.upstream.common.fields.regionCodeHint')}>
                <SdkworkSearchableSelect
                  className="h-9"
                  value={regionCode}
                  onValueChange={(value) => handleRegionChange(value)}
                  options={[
                    { value: 'global', label: t('admin.upstream.supplier.protocols.region.global') },
                    { value: 'cn', label: t('admin.upstream.supplier.protocols.region.cn') },
                  ]}
                  placeholder={t('admin.upstream.common.fields.regionCode')}
                  searchPlaceholder={t('admin.upstream.common.fields.regionCode')}
                  emptyText={t('admin.upstream.common.fields.regionCode')}
                />
              </DrawerField>
            ) : null}
          </div>
        </FormSection>
        <FormSection title={t('admin.upstream.supplier.form.authMethods.title')}>
          <div className="grid gap-1.5">
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {AUTH_METHOD_PRESETS.map((preset) => {
                const checked = selectedAuthPresets.includes(preset.code);
                return (
                  <label key={preset.code} className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 transition ${checked ? 'bg-lobster-50 text-lobster-700 ring-1 ring-lobster-500/30 dark:bg-lobster-500/10 dark:text-lobster-200' : 'text-slate-600 hover:bg-slate-100/70 dark:text-slate-300 dark:hover:bg-white/5'} cursor-pointer`}>
                    <input type="checkbox" className="h-4 w-4 shrink-0 accent-lobster-600" checked={checked} onChange={() => setSelectedAuthPresets((current) => current.includes(preset.code) ? current.filter((item) => item !== preset.code) : [...current, preset.code])} />
                    <span className="min-w-0 truncate text-sm font-medium">{t(preset.labelKey)}</span>
                  </label>
                );
              })}
            </div>
            {preservedAuthMethods.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-xs text-slate-400 dark:text-slate-500">{t('admin.upstream.supplier.form.authMethods.preserved')}</span>
                {preservedAuthMethods.map((method) => (
                  <span key={method.authMethodCode} className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    <span className="min-w-0 truncate">{method.authMethodName} ({method.authMethodCode})</span>
                    <button type="button" title={t('common.actions.remove')} aria-label={t('common.actions.remove')} className="shrink-0 text-slate-400 transition hover:text-red-500" onClick={() => setPreservedAuthMethods((current) => current.filter((item) => item !== method))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </FormSection>
        <FormSection title={t('admin.upstream.supplier.form.section.links')}>
          <div className="grid grid-cols-2 gap-4">
            <DrawerField label={t('admin.upstream.supplier.form.websiteUrl')}><input name="websiteUrl" type="url" className={inputClass} defaultValue={supplier?.websiteUrl ?? ''} /></DrawerField>
            <DrawerField label={t('admin.upstream.supplier.form.documentationUrl')}><input name="docsUrl" type="url" className={inputClass} defaultValue={supplier?.docsUrl ?? ''} /></DrawerField>
          </div>
          <div className="mt-3"><DrawerField label={t('admin.upstream.common.fields.description')}><textarea name="description" rows={2} style={{ minHeight: '3.5rem' }} className={textAreaClass} defaultValue={supplier?.description ?? ''} /></DrawerField></div>
        </FormSection>
        </div>

        <div className="flex min-w-0 flex-col lg:min-h-0">
          <div className="mb-2 flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
            {([['groups', 'admin.upstream.supplier.resources.tab.groups'], ['resources', 'admin.upstream.supplier.resources.tab.resources'], ['modelBlacklist', 'admin.upstream.supplier.tab.modelBlacklist']] as const).map(([key, labelKey]) => (
              <button key={key} type="button" onClick={() => setRightTab(key)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${rightTab === key ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
                {t(labelKey)}
              </button>
            ))}
          </div>
          {rightTab === 'modelBlacklist' ? (
            <div className="grid content-start gap-3">
              <ModelAccessListEditor
                title={t('admin.upstream.supplier.modelList.blacklistTitle')}
                hint={t('admin.upstream.supplier.modelList.blacklistHint')}
                entries={modelBlacklist}
                vendors={availableVendors}
                danger
                keyPrefix="admin.upstream.supplier.modelList"
                onEntriesChange={setModelBlacklist}
                t={t}
              />
              <ModelAccessListEditor
                title={t('admin.upstream.supplier.modelList.whitelistTitle')}
                hint={t('admin.upstream.supplier.modelList.whitelistHint')}
                entries={modelWhitelist}
                vendors={availableVendors}
                danger={false}
                keyPrefix="admin.upstream.supplier.modelList"
                onEntriesChange={setModelWhitelist}
                t={t}
              />
            </div>
          ) : catalog ? (
            <ResourcePicker
              resources={catalog.resources}
              resourceGroups={catalog.resourceGroups}
              selection={selection}
              onChange={setSelection}
              flat
              fixedTab={rightTab}
              className="flex min-h-0 flex-1 flex-col"
              listClassName="min-h-0 flex-1 max-h-80 lg:max-h-none"
            />
          ) : (
            <div className="rounded-md border border-slate-200 p-4 text-center text-sm text-slate-500 dark:border-white/10">{t('admin.upstream.common.errors.operationFailed')}</div>
          )}
        </div>
      </form>
    </SidePanel>
  );
}

function valuesFromForm(form: HTMLFormElement, supplierType: SupplierType, defaultVendorCode: string | null, selection: ResourceSelection, protocols: LlmProtocolConfig[], regionCode: string, authMethods: UpstreamSupplierAuthMethodInput[], modelBlacklist: UpstreamSupplierModelListEntry[], modelWhitelist: UpstreamSupplierModelListEntry[]): SupplierFormValues | null {
  const formData = new FormData(form);
  const read = (key: string) => String(formData.get(key) ?? '').trim();
  const supplierName = read('supplierName');
  if (!supplierName) return null;
  return {
    supplierName,
    displayName: read('displayName'),
    description: read('description'),
    supplierType,
    defaultVendorCode,
    adapterCode: 'openai',
    protocols,
    authMethods,
    modelBlacklist,
    modelWhitelist,
    websiteUrl: read('websiteUrl'),
    docsUrl: read('docsUrl'),
    regionCode,
    environment: numericFormValue(formData, 'environment', 1),
    sortOrder: numericFormValue(formData, 'sortOrder', 100),
    status: numericFormValue(formData, 'status', 1),
    resources: toEntitlements(selection),
  };
}

function numericFormValue(form: FormData, key: string, fallback: number): number {
  const value = Number(form.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">{title}</h3>
      {children}
    </section>
  );
}

/** 抽屉表单字段：说明文字渲染在标签行右侧（截断+悬浮全文），
 *  避免多列布局中提示文字出现在输入框下方导致同一行字段错位 */
function DrawerField({ label, required, hint, className, children }: { label: string; required?: boolean; hint?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`grid min-w-0 gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 ${className ?? ''}`}>
      <span className="flex min-w-0 items-baseline justify-between gap-2">
        <span className="shrink-0">{label}{required ? <span className="ml-1 text-red-500">*</span> : null}</span>
        {hint ? <span className="truncate text-xs font-normal text-slate-400 dark:text-slate-500" title={hint}>{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function SupplierCapabilities({ supplier, onChanged, onClose }: { supplier: UpstreamSupplier; onChanged: (supplier: UpstreamSupplier) => void; onClose: () => void }) {
  const { t } = useTranslation();
  const [endpoints, setEndpoints] = useState<UpstreamSupplierEndpointInput[]>([]);
  const [authMethods, setAuthMethods] = useState<UpstreamSupplierAuthMethodInput[]>([]);
  const [resources, setResources] = useState<UpstreamResourceEntitlementInput[]>([]);
  const [catalog, setCatalog] = useState<UpstreamResourceCatalogResponse | null>(null);
  const [resourcePickerOpen, setResourcePickerOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<'endpoints' | 'authMethods' | 'resources'>('endpoints');
  const [loading, setLoading] = useState(true);
  const [busySection, setBusySection] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  // 各分区加载时的基线快照（JSON 比较判定脏状态，全量替换语义）
  const [baselines, setBaselines] = useState({ endpoints: '[]', authMethods: '[]', resources: '[]' });
  const saveTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
  }, []);

  const dirty = {
    endpoints: JSON.stringify(endpoints) !== baselines.endpoints,
    authMethods: JSON.stringify(authMethods) !== baselines.authMethods,
    resources: JSON.stringify(resources) !== baselines.resources,
  };

  const showSaveMessage = (message: string) => {
    setSaveMessage(message);
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => setSaveMessage(null), 2500);
  };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextEndpoints, nextAuthMethods, nextResources] = await Promise.all([
        upstreamService.suppliers.listEndpoints(supplier.id),
        upstreamService.suppliers.listAuthMethods(supplier.id),
        upstreamService.suppliers.listResources(supplier.id),
      ]);
      const nextEndpointsInput = nextEndpoints.map(({ endpointCode, endpointName, baseUrl, protocolCode, regionCode, environment, priority, routingWeight, timeoutMs, status }) => ({ endpointCode, endpointName, baseUrl, protocolCode, regionCode, environment, priority, routingWeight, timeoutMs, status }));
      const nextAuthMethodsInput = nextAuthMethods.map(({ authMethodCode, authMethodName, authType, configSchema, runtimeAuthConfig, priority, status }) => ({ authMethodCode, authMethodName, authType, configSchema, runtimeAuthConfig, priority, status }));
      const nextResourcesInput = nextResources.map(({ resourceCode, resourceGroupCode, grantType, priority, status }) => ({ resourceCode, resourceGroupCode, grantType, priority, status }));
      setEndpoints(nextEndpointsInput);
      setAuthMethods(nextAuthMethodsInput);
      setResources(nextResourcesInput);
      setBaselines({
        endpoints: JSON.stringify(nextEndpointsInput),
        authMethods: JSON.stringify(nextAuthMethodsInput),
        resources: JSON.stringify(nextResourcesInput),
      });
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setLoading(false);
    }
  }, [supplier.id, t]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    let cancelled = false;
    void upstreamService.fetchResourceCatalog()
      .then((value) => {
        if (!cancelled && value && Array.isArray(value.resources) && Array.isArray(value.resourceGroups)) {
          setCatalog(value);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const save = async (section: 'endpoints' | 'authMethods' | 'resources') => {
    setBusySection(section);
    setError(null);
    setSaveMessage(null);
    try {
      if (section === 'endpoints') {
        // 前端预校验，避免不完整行提交后被后端拒绝
        if (!endpoints.every((endpoint) => endpoint.endpointCode.trim() && endpoint.endpointName.trim() && endpoint.baseUrl.trim())) {
          setError(t('admin.upstream.supplier.endpoints.incomplete'));
          return;
        }
        await upstreamService.suppliers.replaceEndpoints(supplier, { items: endpoints });
      }
      if (section === 'authMethods') {
        if (!authMethods.every((method) => method.authMethodCode.trim() && method.authMethodName.trim())) {
          setError(t('admin.upstream.supplier.auth.incomplete'));
          return;
        }
        await upstreamService.suppliers.replaceAuthMethods(supplier, { items: authMethods });
      }
      if (section === 'resources') await upstreamService.suppliers.replaceResources(supplier, { items: resources });
      const refreshed = await upstreamService.suppliers.retrieve(supplier.id);
      onChanged(refreshed);
      await load();
      setResourcePickerOpen(false);
      showSaveMessage(t('admin.upstream.supplier.save.success'));
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusySection(null);
    }
  };

  const resourceSelection: ResourceSelection = toSelection(resources);
  const setResourceSelection = (next: ResourceSelection) => {
    setResources(toEntitlements(next));
  };
  const removeResource = (index: number) => {
    setResources((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };
  const resourceLabel = (item: UpstreamResourceEntitlementInput) => {
    const code = item.resourceCode ?? item.resourceGroupCode ?? '';
    const resource = catalog?.resources.find((entry) => entry.resourceCode === code);
    const group = catalog?.resourceGroups.find((entry) => entry.groupCode === code);
    return resource?.displayName ?? group?.groupName ?? code;
  };

  // 当前 Vendor 的标准 Base URL（有规则时展示提示）；无 Vendor 或未收录时为空
  const vendorStandardUrl = useMemo(() => vendorStandardBaseUrl(supplier.defaultVendorCode), [supplier.defaultVendorCode]);
  // 端点 Base URL 生成：优先按（vendor+region+协议）解析官方默认，协议未选或未收录时回退旧 vendor 规则
  const resolveEndpointBaseUrl = (endpoint: UpstreamSupplierEndpointInput): string => {
    if (endpoint.protocolCode && isKnownLlmProtocol(endpoint.protocolCode)) {
      const protocolDefault = resolveVendorProtocolDefaultUrl(supplier.defaultVendorCode, endpoint.regionCode, endpoint.protocolCode as LlmProtocolConfig['protocolCode'])?.baseUrl;
      if (protocolDefault) return protocolDefault;
    }
    return resolveVendorBaseUrl(supplier.defaultVendorCode, endpoint.baseUrl);
  };
  // 运行时默认端点 = active 端点中 priority 最小者（priority ASC → routing_weight DESC → id ASC）
  const defaultEndpointIndex = useMemo(() => {
    let bestIndex = -1;
    endpoints.forEach((endpoint, index) => {
      if (endpoint.status !== 1) return;
      if (bestIndex === -1 || (endpoint.priority ?? 100) < (endpoints[bestIndex].priority ?? 100)) {
        bestIndex = index;
      }
    });
    return bestIndex;
  }, [endpoints]);

  // 详情抽屉副标题：供应商类型 · LLM 协议（主协议/全部协议）
  const detailSubtitle = useMemo(() => {
    const typeLabel = supplier.supplierType === 'relay'
      ? t('admin.upstream.supplier.type.relay')
      : t('admin.upstream.supplier.type.official');
    const protocolsLabel = supplier.protocols?.length
      ? supplier.protocols.map((protocol) => t(llmProtocolLabelKey(protocol.protocolCode))).join(' / ')
      : supplier.protocolCode;
    return `${typeLabel} · ${protocolsLabel}`;
  }, [supplier, t]);

  return (
    <SidePanel
      title={supplier.displayName}
      subtitle={detailSubtitle}
      anchor="left"
      widthClass="max-w-6xl"
      onClose={onClose}
    >
      <div className="grid gap-4">
        <InlineError message={error} />
        {saveMessage ? (
          <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {saveMessage}
          </div>
        ) : null}
        {supplier.websiteUrl || supplier.docsUrl ? (
          <div className="flex flex-wrap gap-2">
            {supplier.websiteUrl ? <a className={secondaryButtonClass} href={supplier.websiteUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{t('admin.upstream.supplier.links.website')}</a> : null}
            {supplier.docsUrl ? <a className={secondaryButtonClass} href={supplier.docsUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />{t('admin.upstream.supplier.links.documentation')}</a> : null}
          </div>
        ) : null}
        <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5">
          {([['endpoints', 'admin.upstream.supplier.tab.endpoints'], ['authMethods', 'admin.upstream.supplier.tab.authMethods'], ['resources', 'admin.upstream.supplier.tab.resources']] as const).map(([key, labelKey]) => (
            <button key={key} type="button" onClick={() => setActiveSection(key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${activeSection === key ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}>
              {t(labelKey)}
              {dirty[key] ? <span className="h-1.5 w-1.5 rounded-full bg-lobster-500" /> : null}
            </button>
          ))}
        </div>
        {activeSection === 'endpoints' ? (
          <div className="grid gap-1.5">
            <div className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_100px_150px_72px_72px_32px] items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              <span>{t('admin.upstream.supplier.endpoints.default')}</span>
              <span>{t('admin.upstream.supplier.endpoints.code')}</span>
              <span>{t('admin.upstream.supplier.endpoints.name')}</span>
              <span className="flex min-w-0 items-center justify-between gap-2">
                <span>{t('admin.upstream.common.fields.baseUrl')}</span>
                {vendorStandardUrl ? <span className="truncate text-[10px] font-normal text-slate-400" title={t('admin.upstream.supplier.endpoints.generate.hint', { standard: vendorStandardUrl })}>{t('admin.upstream.supplier.endpoints.generate.hint', { standard: vendorStandardUrl })}</span> : null}
              </span>
              <span>{t('admin.upstream.common.fields.regionCode')}</span>
              <span>{t('admin.upstream.supplier.endpoints.protocol')}</span>
              <span>{t('admin.upstream.common.fields.priority')}</span>
              <span>{t('admin.upstream.common.fields.weight')}</span>
              <span />
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">{t('admin.upstream.common.status.loading')}</p>
            ) : endpoints.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">{t('admin.upstream.supplier.endpoints.empty')}</p>
            ) : endpoints.map((endpoint, index) => (
              <div key={`${endpoint.endpointCode}-${index}`} className="grid grid-cols-[56px_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)_100px_150px_72px_72px_32px] items-center gap-2">
                {defaultEndpointIndex === index ? <span className="w-fit rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">{t('admin.upstream.supplier.endpoints.default')}</span> : null}
                <input aria-label={t('admin.upstream.supplier.endpoints.code')} placeholder={t('admin.upstream.supplier.endpoints.code')} className={inputClass} value={endpoint.endpointCode} onChange={(event) => setEndpoints(updateAt(endpoints, index, { endpointCode: event.currentTarget.value }))} />
                <input aria-label={t('admin.upstream.supplier.endpoints.name')} placeholder={t('admin.upstream.supplier.endpoints.name')} className={inputClass} value={endpoint.endpointName} onChange={(event) => setEndpoints(updateAt(endpoints, index, { endpointName: event.currentTarget.value }))} />
                <div className="flex min-w-0 items-center gap-1.5">
                  <input aria-label={t('admin.upstream.common.fields.baseUrl')} placeholder="https://api.example.com/v1" className={inputClass} value={endpoint.baseUrl} onChange={(event) => setEndpoints(updateAt(endpoints, index, { baseUrl: event.currentTarget.value }))} />
                  <button type="button" title={t('admin.upstream.supplier.endpoints.generate.title')} className={`${secondaryButtonClass} w-9 shrink-0 px-0`} onClick={() => setEndpoints(updateAt(endpoints, index, { baseUrl: resolveEndpointBaseUrl(endpoint) }))}><Sparkles className="h-4 w-4" /></button>
                </div>
                <div className="min-w-0">
                  <SdkworkSearchableSelect
                    className="h-9"
                    value={endpoint.regionCode ?? ''}
                    onValueChange={(value) => setEndpoints(updateAt(endpoints, index, { regionCode: emptyToNull(value) }))}
                    options={[
                      { value: 'global', label: t('admin.upstream.supplier.protocols.region.global') },
                      { value: 'cn', label: t('admin.upstream.supplier.protocols.region.cn') },
                    ]}
                    placeholder={t('admin.upstream.common.fields.regionCode')}
                    searchPlaceholder={t('admin.upstream.common.fields.regionCode')}
                    emptyText={t('admin.upstream.common.fields.regionCode')}
                  />
                </div>
                <select aria-label={t('admin.upstream.supplier.endpoints.protocol')} className={selectClass} value={endpoint.protocolCode ?? ''} onChange={(event) => setEndpoints(updateAt(endpoints, index, { protocolCode: emptyToNull(event.currentTarget.value) }))}>
                  <option value="">{t('admin.upstream.supplier.form.protocols.none')}</option>
                  {LLM_PROTOCOLS.map((option) => <option key={option.code} value={option.code}>{t(option.labelKey)}</option>)}
                </select>
                <input aria-label={t('admin.upstream.common.fields.priority')} title={t('admin.upstream.common.fields.priority')} type="number" min="0" className={inputClass} value={endpoint.priority ?? 100} onChange={(event) => setEndpoints(updateAt(endpoints, index, { priority: Number(event.currentTarget.value) }))} />
                <input aria-label={t('admin.upstream.common.fields.weight')} title={t('admin.upstream.common.fields.weight')} type="number" min="0" className={inputClass} value={endpoint.routingWeight ?? 100} onChange={(event) => setEndpoints(updateAt(endpoints, index, { routingWeight: Number(event.currentTarget.value) }))} />
                <button type="button" title={t('common.actions.delete')} aria-label={t('common.actions.delete')} className={dangerButtonClass} onClick={() => setEndpoints(removeAt(endpoints, index))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="mt-1 flex items-center gap-2">
              <button type="button" className={secondaryButtonClass} disabled={loading} onClick={() => setEndpoints((current) => [...current, emptyEndpoint()])}><Plus className="h-4 w-4" />{t('admin.upstream.common.actions.add')}</button>
              <span className="flex-1" />
              <button type="button" className={primaryButtonClass} disabled={loading || busySection !== null || !dirty.endpoints} onClick={() => void save('endpoints')}>
                {busySection === 'endpoints' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('admin.upstream.supplier.endpoints.save')}
              </button>
            </div>
          </div>
        ) : null}
        {activeSection === 'authMethods' ? (
          <div className="grid gap-1.5">
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_110px_minmax(0,1fr)_32px] items-center gap-2 text-xs font-medium text-slate-400 dark:text-slate-500">
              <span>{t('admin.upstream.supplier.auth.code')}</span>
              <span>{t('admin.upstream.supplier.auth.name')}</span>
              <span>{t('admin.upstream.supplier.auth.type')}</span>
              <span>{t('admin.upstream.supplier.auth.transport')}</span>
              <span>{t('admin.upstream.supplier.auth.credentialParameter')}</span>
              <span />
            </div>
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">{t('admin.upstream.common.status.loading')}</p>
            ) : authMethods.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">{t('admin.upstream.supplier.auth.empty')}</p>
            ) : authMethods.map((method, index) => (
              <div key={`${method.authMethodCode}-${index}`} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_110px_minmax(0,1fr)_32px] items-center gap-2">
                <input aria-label={t('admin.upstream.supplier.auth.code')} placeholder={t('admin.upstream.supplier.auth.code')} className={inputClass} value={method.authMethodCode} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { authMethodCode: event.currentTarget.value }))} />
                <input aria-label={t('admin.upstream.supplier.auth.name')} placeholder={t('admin.upstream.supplier.auth.name')} className={inputClass} value={method.authMethodName} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { authMethodName: event.currentTarget.value }))} />
                <select aria-label={t('admin.upstream.supplier.auth.type')} className={selectClass} value={method.authType} onChange={(event) => setAuthMethods(updateAt(authMethods, index, authTypePatch(event.currentTarget.value as UpstreamSupplierAuthMethodInput['authType'])))}>
                  <option value="api_key">{t('admin.upstream.supplier.auth.type.apiKey')}</option><option value="bearer_token">{t('admin.upstream.supplier.auth.type.bearerToken')}</option><option value="custom">{t('admin.upstream.supplier.auth.type.custom')}</option>
                </select>
                <select aria-label={t('admin.upstream.supplier.auth.transport')} className={selectClass} value={method.runtimeAuthConfig.credentialTransport} disabled={method.authType === 'bearer_token'} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { runtimeAuthConfig: authTransportConfig(event.currentTarget.value as 'bearer' | 'header' | 'query') }))}>
                  <option value="bearer">{t('admin.upstream.supplier.auth.transport.bearer')}</option><option value="header">{t('admin.upstream.supplier.auth.transport.header')}</option><option value="query">{t('admin.upstream.supplier.auth.transport.query')}</option>
                </select>
                <input aria-label={t('admin.upstream.supplier.auth.credentialParameter')} placeholder={t('admin.upstream.supplier.auth.credentialParameter')} className={inputClass} value={method.runtimeAuthConfig.credentialParameter ?? ''} disabled={method.runtimeAuthConfig.credentialTransport === 'bearer'} onChange={(event) => setAuthMethods(updateAt(authMethods, index, { runtimeAuthConfig: { ...method.runtimeAuthConfig, credentialParameter: emptyToNull(event.currentTarget.value) } }))} />
                <button type="button" title={t('common.actions.delete')} aria-label={t('common.actions.delete')} className={dangerButtonClass} onClick={() => setAuthMethods(removeAt(authMethods, index))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
            <div className="mt-1 flex items-center gap-2">
              <button type="button" className={secondaryButtonClass} disabled={loading} onClick={() => setAuthMethods((current) => [...current, emptyAuthMethod()])}><Plus className="h-4 w-4" />{t('admin.upstream.common.actions.add')}</button>
              <span className="flex-1" />
              <button type="button" className={primaryButtonClass} disabled={loading || busySection !== null || !dirty.authMethods} onClick={() => void save('authMethods')}>
                {busySection === 'authMethods' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('admin.upstream.supplier.auth.save')}
              </button>
            </div>
          </div>
        ) : null}
        {activeSection === 'resources' ? (
          <div className="grid gap-3">
            {loading ? (
              <p className="py-8 text-center text-sm text-slate-500">{t('admin.upstream.common.status.loading')}</p>
            ) : (
              <>
                {resourcePickerOpen && catalog ? (
                  <ResourcePicker resources={catalog.resources} resourceGroups={catalog.resourceGroups} selection={resourceSelection} onChange={setResourceSelection} />
                ) : null}
                {resources.length === 0 && !resourcePickerOpen ? <p className="py-8 text-center text-sm text-slate-500">{t('admin.upstream.supplier.resources.empty')}</p> : null}
                <div className="flex flex-wrap gap-2">
                  {resources.map((resource, index) => (
                    <span key={`${resource.resourceCode ?? resource.resourceGroupCode}-${index}`} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-slate-100 py-1 pl-2.5 pr-1.5 text-xs font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300">
                      <span className="min-w-0">
                        <span className="block truncate">{resourceLabel(resource)}</span>
                        <span className="block truncate font-mono text-[10px] text-slate-400">{resource.resourceCode ?? resource.resourceGroupCode}</span>
                      </span>
                      <button type="button" title={t('common.actions.delete')} className="rounded-full p-0.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-300" onClick={() => removeResource(index)}><Trash2 className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              </>
            )}
            <div className="mt-1 flex items-center gap-2">
              <button type="button" className={secondaryButtonClass} disabled={loading} onClick={() => setResourcePickerOpen((current) => !current)}><Plus className="h-4 w-4" />{t('admin.upstream.supplier.resources.add')}</button>
              <span className="flex-1" />
              <button type="button" className={primaryButtonClass} disabled={loading || busySection !== null || !dirty.resources} onClick={() => void save('resources')}>
                {busySection === 'resources' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {t('admin.upstream.supplier.resources.save')}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </SidePanel>
  );
}

function authTypePatch(authType: UpstreamSupplierAuthMethodInput['authType']): Partial<UpstreamSupplierAuthMethodInput> {
  return { authType, runtimeAuthConfig: authTransportConfig('bearer') };
}

function authTransportConfig(credentialTransport: 'bearer' | 'header' | 'query') {
  const credentialParameter = credentialTransport === 'header'
    ? 'x-api-key'
    : credentialTransport === 'query'
      ? 'key'
      : null;
  return { credentialTransport, credentialParameter, defaultHeaders: {} };
}

function updateAt<T>(items: T[], index: number, patch: Partial<T>): T[] {
  return items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item);
}

function removeAt<T>(items: T[], index: number): T[] {
  return items.filter((_, itemIndex) => itemIndex !== index);
}

function emptyToNull(value: string): string | null {
  return value.trim() || null;
}
