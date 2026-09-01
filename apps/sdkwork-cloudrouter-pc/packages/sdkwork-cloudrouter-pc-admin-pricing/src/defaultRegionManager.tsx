import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Globe2, Pencil, Plus, Search, Star, Trash2, X } from 'lucide-react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { BottomPagination } from '@sdkwork/cloudroutes-pc-commons';
import {
  pricingService,
  type AdminDefaultRegionItem,
  type AdminPricingListParams,
} from './pricingService';
import {
  errorMessageI18n,
  Field,
  InlineError,
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  selectClass,
  StatusBadge,
  TableState,
} from './components';

interface DefaultRegionManagerProps {
  open: boolean;
  onClose: () => void;
}

const EMPTY_FORM = {
  catalogKey: '',
  vendorCode: '',
  productCode: '',
  defaultRegionCode: '',
  currencyCode: 'CNY',
  description: '',
  effectiveFrom: '',
  effectiveTo: '',
};

/** Admin management panel for per-model default billing regions. Lets the
 * operator select, for multi-region models, which region is used for billing
 * when an account carries no explicit region. */
export function DefaultRegionManager({ open, onClose }: DefaultRegionManagerProps) {
  const { t } = useTranslation();
  const translate = (key: string, fallback: string) =>
    String(t(key, { defaultValue: fallback }));

  const [items, setItems] = useState<AdminDefaultRegionItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showCreate, setShowCreate] = useState(false);
  /** Row being edited; while set the form runs in update mode and the resource
   * identity fields (catalog key / vendor / product) are locked to the row. */
  const [editing, setEditing] = useState<AdminDefaultRegionItem | null>(null);

  const beginCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowCreate((value) => !value);
  };

  const beginEdit = (item: AdminDefaultRegionItem) => {
    setShowCreate(true);
    setEditing(item);
    setForm({
      catalogKey: item.catalogKey,
      vendorCode: item.vendorCode,
      productCode: item.productCode,
      defaultRegionCode: item.defaultRegionCode,
      currencyCode: item.currencyCode,
      description: item.description ?? '',
      effectiveFrom: item.effectiveFrom ?? '',
      effectiveTo: item.effectiveTo ?? '',
    });
  };

  const closeForm = () => {
    setShowCreate(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const reload = useCallback(async (params: AdminPricingListParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await pricingService.defaultRegions.list(params);
      setItems(result.items);
      setTotal(Number(result.pageInfo.totalItems ?? result.items.length));
    } catch (cause) {
      setError(errorMessageI18n(cause, 'Default billing regions could not be loaded', t));
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (open) {
      setPage(1);
      setAppliedSearch('');
      setShowCreate(false);
      setEditing(null);
      setForm(EMPTY_FORM);
      void reload({ page: 1, pageSize });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const applySearch = () => {
    setPage(1);
    setAppliedSearch(search.trim());
    void reload({ q: search.trim() || undefined, page: 1, pageSize });
  };

  const pickPage = (next: number) => {
    setPage(next);
    void reload({ q: appliedSearch || undefined, page: next, pageSize });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      catalogKey: form.catalogKey.trim(),
      vendorCode: form.vendorCode.trim(),
      productCode: form.productCode.trim(),
      defaultRegionCode: form.defaultRegionCode.trim(),
      currencyCode: form.currencyCode.trim().toUpperCase(),
      description: form.description.trim() || undefined,
      effectiveFrom: form.effectiveFrom.trim() || undefined,
      effectiveTo: form.effectiveTo.trim() || undefined,
    };
    try {
      if (editing) {
        await pricingService.defaultRegions.update(editing.id, payload);
      } else {
        await pricingService.defaultRegions.create(payload);
      }
      closeForm();
      await reload({ q: appliedSearch || undefined, page, pageSize });
    } catch (cause) {
      setError(errorMessageI18n(
        cause,
        editing
          ? 'Default billing region could not be updated'
          : 'Default billing region could not be created',
        t,
      ));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await pricingService.defaultRegions.delete(id);
      await reload({ q: appliedSearch || undefined, page, pageSize });
    } catch (cause) {
      setError(errorMessageI18n(cause, 'Default billing region could not be deleted', t));
    }
  };

  if (!open) return null;

  const hasMore = page * pageSize < total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex h-[82vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl dark:bg-slate-900 dark:ring-1 dark:ring-white/10"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900 dark:text-white">
              <Globe2 className="h-5 w-5 text-lobster-600 dark:text-lobster-400" aria-hidden="true" />
              {translate('admin.pricing.settings.defaultRegion.title', '默认计费 Region')}
            </h2>
            <p className="mt-0.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
              {translate('admin.pricing.settings.defaultRegion.subtitle', '为多 Region 模型指定在账号未显式选择地域时的默认计费地域。每个模型（Catalog Key）互斥，仅允许一个默认 Region；重复设置将覆盖原配置。')}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className={primaryButtonClass} onClick={beginCreate}>
              <Plus className="h-4 w-4" aria-hidden="true" />{translate('admin.pricing.settings.defaultRegion.new', '新建默认 Region')}
            </button>
            <button type="button" className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10" onClick={onClose} aria-label={translate('admin.pricing.common.aria.close', 'Close')}>
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {showCreate ? (
          <form className="shrink-0 border-b border-slate-200 bg-slate-50/80 px-5 py-4 dark:border-white/10 dark:bg-white/[0.04]" onSubmit={handleSubmit}>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-white">
              {editing
                ? translate('admin.pricing.settings.defaultRegion.formTitleEdit', '编辑默认计费 Region')
                : translate('admin.pricing.settings.defaultRegion.formTitle', '新建默认计费 Region')}
            </h3>
            {editing ? (
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                {translate('admin.pricing.settings.defaultRegion.formEditHint', '模型（Catalog Key）身份不可修改：每个模型互斥仅保留一个默认 Region，此处仅切换默认地域及有效期。')}
              </p>
            ) : (
              <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
                {translate('admin.pricing.settings.defaultRegion.formCreateHint', '同一模型重复设置将覆盖原默认 Region（互斥）。')}
              </p>
            )}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label={translate('admin.pricing.settings.defaultRegion.catalogKey', '模型 Catalog Key')} hint={translate('admin.pricing.settings.defaultRegion.formOptional', '必填')}>
                <input className={inputClass} value={form.catalogKey} onChange={(event) => setForm({ ...form, catalogKey: event.target.value })} placeholder="openai/gpt-4o" required disabled={Boolean(editing)} />
              </Field>
              <Field label={translate('admin.pricing.settings.defaultRegion.vendorCode', '厂商 Code')} hint={translate('admin.pricing.settings.defaultRegion.formOptional', '必填')}>
                <input className={inputClass} value={form.vendorCode} onChange={(event) => setForm({ ...form, vendorCode: event.target.value })} placeholder="openai" required disabled={Boolean(editing)} />
              </Field>
              <Field label={translate('admin.pricing.settings.defaultRegion.productCode', '产品 Code')} hint={translate('admin.pricing.settings.defaultRegion.formOptional', '必填')}>
                <input className={inputClass} value={form.productCode} onChange={(event) => setForm({ ...form, productCode: event.target.value })} placeholder="gpt-4o" required disabled={Boolean(editing)} />
              </Field>
              <Field label={translate('admin.pricing.settings.defaultRegion.defaultRegionCode', '默认计费 Region')} hint={translate('admin.pricing.settings.defaultRegion.formOptional', '必填')}>
                <input className={inputClass} value={form.defaultRegionCode} onChange={(event) => setForm({ ...form, defaultRegionCode: event.target.value })} placeholder="cn-beijing" required />
              </Field>
              <Field label={translate('admin.pricing.settings.defaultRegion.currency', '币种')} hint={translate('admin.pricing.settings.defaultRegion.formOptional', '必填')}>
                <input className={inputClass} value={form.currencyCode} onChange={(event) => setForm({ ...form, currencyCode: event.target.value.toUpperCase() })} placeholder="CNY" maxLength={3} required />
              </Field>
              <Field label={translate('admin.pricing.settings.defaultRegion.description', '说明')}>
                <input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder={translate('admin.pricing.settings.defaultRegion.descriptionPlaceholder', '可选')} />
              </Field>
              <Field label={translate('admin.pricing.settings.defaultRegion.effectiveFrom', '生效时间')}>
                <input className={inputClass} value={form.effectiveFrom} onChange={(event) => setForm({ ...form, effectiveFrom: event.target.value })} placeholder="2026-08-30T00:00:00Z" />
              </Field>
              <Field label={translate('admin.pricing.settings.defaultRegion.effectiveTo', '失效时间')}>
                <input className={inputClass} value={form.effectiveTo} onChange={(event) => setForm({ ...form, effectiveTo: event.target.value })} placeholder="2027-08-30T00:00:00Z" />
              </Field>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={closeForm} disabled={saving}>{translate('admin.pricing.settings.defaultRegion.cancel', '取消')}</button>
              <button type="submit" className={primaryButtonClass} disabled={saving}>{translate('admin.pricing.settings.defaultRegion.save', '保存')}</button>
            </div>
          </form>
        ) : null}

        <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 px-5 py-3 dark:border-white/10">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              className={inputClass}
              style={{ paddingLeft: '2.25rem' }}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') applySearch(); }}
              placeholder={translate('admin.pricing.settings.defaultRegion.searchPlaceholder', '搜索 Catalog Key / 厂商 / 产品')}
            />
          </div>
          <button type="button" className={secondaryButtonClass} onClick={applySearch}>{translate('admin.pricing.settings.defaultRegion.search', '搜索')}</button>
        </div>

        <InlineError message={error} />

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full min-w-[720px] table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-slate-900">
            <tr><th className="w-[26%] px-4 py-3 font-medium">{translate('admin.pricing.settings.defaultRegion.colModel', '模型')}</th><th className="w-[16%] px-4 py-3 font-medium">{translate('admin.pricing.settings.defaultRegion.colRegion', '默认 Region')}</th><th className="w-[12%] px-4 py-3 font-medium">{translate('admin.pricing.settings.defaultRegion.colCurrency', '币种')}</th><th className="w-[12%] px-4 py-3 font-medium">{translate('admin.pricing.settings.defaultRegion.colStatus', '状态')}</th><th className="w-[22%] px-4 py-3 font-medium">{translate('admin.pricing.settings.defaultRegion.colEffective', '生效时间')}</th><th className="w-[12%] px-4 py-3 text-right font-medium">{translate('admin.pricing.settings.defaultRegion.colActions', '操作')}</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {loading || items.length === 0 ? (
              <TableState loading={loading} empty={translate('admin.pricing.settings.defaultRegion.empty', '尚未配置默认计费 Region')} colSpan={6} />
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                  <td className="px-4 py-3"><div className="truncate font-medium text-slate-900 dark:text-white">{item.catalogKey}</div><div className="truncate text-xs text-slate-500 dark:text-slate-400">{item.vendorCode} · {item.productCode}</div></td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-200">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                      {item.defaultRegionCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.currencyCode}</td>
                  <td className="px-4 py-3"><StatusBadge status={item.status} /></td>
                  <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{item.effectiveFrom ?? '—'}{item.effectiveTo ? ` → ${item.effectiveTo}` : ''}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button type="button" className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10" onClick={() => beginEdit(item)} aria-label={translate('admin.pricing.settings.defaultRegion.edit', '编辑')}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />{translate('admin.pricing.settings.defaultRegion.edit', '编辑')}
                      </button>
                      <button type="button" className="inline-flex h-8 items-center justify-center gap-1 rounded-md px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10" onClick={() => void handleDelete(item.id)} aria-label={translate('admin.pricing.settings.defaultRegion.delete', '删除')}>
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />{translate('admin.pricing.settings.defaultRegion.delete', '删除')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
            </tbody>
          </table>
        </div>

        <div className="shrink-0 border-t border-slate-200 px-5 py-3 dark:border-white/10">
          <BottomPagination
            page={page}
            pageSize={pageSize}
            itemCount={Math.min(total, page * pageSize)}
            hasNextPage={hasMore}
            pageLabel={translate('admin.pricing.common.pagination.page', '第')}
            pageSizeLabel={translate('admin.pricing.common.pagination.rows', '条/页')}
            previousLabel={translate('admin.pricing.common.pagination.previous', '上一页')}
            nextLabel={translate('admin.pricing.common.pagination.next', '下一页')}
            showingLabel={translate('admin.pricing.common.pagination.showing', '显示')}
            onPreviousPage={() => pickPage(Math.max(1, page - 1))}
            onNextPage={() => pickPage(page + 1)}
            onPageSizeChange={(value) => { setPageSize(value); setPage(1); void reload({ q: appliedSearch || undefined, page: 1, pageSize: value }); }}
            pageSizeOptions={[20, 50, 100]}
          />
        </div>
      </div>
    </div>
  );
}