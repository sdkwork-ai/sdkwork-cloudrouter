import React, { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Tags } from 'lucide-react';
import { BusinessStatePanel } from './commerce-admin-primitives';
import { readApiItems } from './commerce-api-result';
import {
  createCommerceCategoryAttribute,
  listCommerceAttributes,
  listCommerceCategories,
  listCommerceCategoryAttributes,
  updateCommerceCategoryAttribute,
  deleteCommerceCategoryAttribute,
} from './catalogService';

type AttributeOption = {
  id: string;
  name: string;
  attributeNo: string;
};

type CategoryOption = {
  id: string;
  name: string;
  categoryNo: string;
};

type CategoryAttributeBinding = {
  id: string;
  categoryId: string;
  attributeId: string;
  required: boolean;
  searchable: boolean;
  filterable: boolean;
  sortOrder: number;
  status: BindingStatus;
};

type BindingStatus = 'active' | 'inactive' | 'archived';

type BindingFormState = {
  categoryId: string;
  attributeId: string;
  required: boolean;
  searchable: boolean;
  filterable: boolean;
  sortOrder: string;
  status: BindingStatus;
};

const EMPTY_BINDING_FORM: BindingFormState = {
  categoryId: '',
  attributeId: '',
  required: false,
  searchable: true,
  filterable: true,
  sortOrder: '0',
  status: 'active',
};

const BINDING_STATUS_OPTIONS: Array<{ value: BindingStatus; label: string }> = [
  { value: 'active', label: '启用' },
  { value: 'inactive', label: '停用' },
  { value: 'archived', label: '归档' },
];

export function AttributeManagementPage() {
  const [attributes, setAttributes] = useState<AttributeOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [bindings, setBindings] = useState<CategoryAttributeBinding[]>([]);
  const [form, setForm] = useState<BindingFormState>(EMPTY_BINDING_FORM);
  const [editingBindingId, setEditingBindingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const attributeById = useMemo(() => new Map(attributes.map((attribute) => [attribute.id, attribute])), [attributes]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  useEffect(() => {
    void loadAttributeCenter();
  }, []);

  async function loadAttributeCenter() {
    setLoading(true);
    setError(null);
    try {
      const [attributeResult, categoryResult, bindingResult] = await Promise.all([
        listCommerceAttributes({ page: '1', pageSize: '200' }),
        listCommerceCategories({ page: '1', pageSize: '200' }),
        listCommerceCategoryAttributes({ page: '1', pageSize: '200' }),
      ]);
      setAttributes(readAttributeOptions(attributeResult));
      setCategories(readCategoryOptions(categoryResult));
      setBindings(readCategoryAttributeBindings(bindingResult));
    } catch (loadError) {
      setError(loadError instanceof Error && loadError.message ? loadError.message : '商品属性数据加载失败');
    } finally {
      setLoading(false);
    }
  }

  async function submitBinding(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.categoryId || !form.attributeId) {
      setError('请选择分类和属性。');
      return;
    }

    setSaving(true);
    setError(null);
    setMessage(null);
    const payload = {
      categoryId: form.categoryId,
      attributeId: form.attributeId,
      required: form.required,
      searchable: form.searchable,
      filterable: form.filterable,
      sortOrder: String(Number.parseInt(form.sortOrder, 10) || 0),
      status: form.status,
    };
    try {
      if (editingBindingId) {
        await updateCommerceCategoryAttribute(editingBindingId, payload);
        setMessage('类目属性绑定已更新。');
      } else {
        await createCommerceCategoryAttribute(payload);
        setMessage('类目属性绑定已创建。');
      }
      setEditingBindingId(null);
      setForm(EMPTY_BINDING_FORM);
      await loadAttributeCenter();
    } catch (saveError) {
      setError(saveError instanceof Error && saveError.message ? saveError.message : '类目属性绑定保存失败。');
    } finally {
      setSaving(false);
    }
  }

  function editBinding(binding: CategoryAttributeBinding) {
    setEditingBindingId(binding.id);
    setForm({
      categoryId: binding.categoryId,
      attributeId: binding.attributeId,
      required: binding.required,
      searchable: binding.searchable,
      filterable: binding.filterable,
      sortOrder: String(binding.sortOrder),
      status: binding.status,
    });
  }

  async function archiveBinding(binding: CategoryAttributeBinding) {
    setError(null);
    setMessage(null);
    try {
      await deleteCommerceCategoryAttribute(binding.id);
      setMessage('类目属性绑定已归档。');
      await loadAttributeCenter();
    } catch (archiveError) {
      setError(archiveError instanceof Error && archiveError.message ? archiveError.message : '类目属性绑定归档失败。');
    }
  }

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 overflow-hidden bg-slate-50 p-5 text-slate-900 dark:bg-[#0a0a0a] dark:text-slate-100" data-admin-catalog-attribute-management-page>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171717]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lobster-50 text-lobster-600 dark:bg-lobster-500/10 dark:text-lobster-300">
            <Tags className="h-4 w-4" />
          </span>
          <div>
            <div className="text-base font-semibold">属性维护</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">维护商品属性与分类绑定关系。</div>
          </div>
        </div>
        <button type="button" onClick={() => void loadAttributeCenter()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-lobster-300 hover:text-lobster-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200" data-admin-catalog-attribute-create>
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      </div>

      {error ? <BusinessStatePanel kind="error" title="属性中心加载失败" description={error} onRetry={() => void loadAttributeCenter()} /> : null}
      {message ? <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{message}</div> : null}

      <div className="grid min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[360px_minmax(0,1fr)]">
        <CommerceCategoryAttributeBindingForm
          attributes={attributes}
          categories={categories}
          form={form}
          saving={saving}
          onChange={setForm}
          onSubmit={submitBinding}
        />

        <div className="min-h-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#171717]">
          {loading ? (
            <BusinessStatePanel kind="loading" title="属性绑定加载中" />
          ) : bindings.length === 0 ? (
            <BusinessStatePanel kind="empty" title="暂无类目属性绑定" description="选择类目和属性后创建绑定。" />
          ) : (
            <div className="h-full overflow-y-auto p-3">
              {bindings.map((binding) => (
                <div key={binding.id} className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-3 text-sm dark:border-white/10">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{categoryById.get(binding.categoryId)?.name ?? binding.categoryId}</div>
                    <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{attributeById.get(binding.attributeId)?.name ?? binding.attributeId}</div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">{binding.required ? '必填' : '选填'}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">{binding.searchable ? '可搜索' : '不可搜索'}</span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-white/10 dark:text-slate-300">{binding.filterable ? '可筛选' : '不可筛选'}</span>
                    <span className="rounded-full bg-lobster-50 px-2 py-1 text-xs text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-200">{bindingStatusLabel(binding.status)}</span>
                    <button type="button" onClick={() => editBinding(binding)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs dark:border-white/10">编辑</button>
                    <button type="button" onClick={() => void archiveBinding(binding)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 dark:border-red-500/20 dark:text-red-300">归档</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function CommerceCategoryAttributeBindingForm({
  attributes,
  categories,
  form,
  onChange,
  onSubmit,
  saving,
}: {
  attributes: AttributeOption[];
  categories: CategoryOption[];
  form: BindingFormState;
  saving: boolean;
  onChange: (form: BindingFormState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="min-h-0 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#171717]" data-admin-catalog-category-attribute-create>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold">类目属性绑定</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">将属性挂载到商品分类。</div>
        </div>
        <Plus className="h-4 w-4 text-lobster-600" />
      </div>
      <label className="mb-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
        分类
        <select value={form.categoryId} onChange={(event) => onChange({ ...form, categoryId: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white">
          <option value="">选择分类</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="mb-3 block text-xs font-medium text-slate-600 dark:text-slate-300">
        属性
        <select value={form.attributeId} onChange={(event) => onChange({ ...form, attributeId: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white">
          <option value="">选择属性</option>
          {attributes.map((attribute) => <option key={attribute.id} value={attribute.id}>{attribute.name}</option>)}
        </select>
      </label>
      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200" data-admin-catalog-category-attribute-required>
        <input type="checkbox" checked={form.required} onChange={(event) => onChange({ ...form, required: event.target.checked })} />
        必填
      </label>
      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200" data-admin-catalog-category-attribute-searchable>
        <input type="checkbox" checked={form.searchable} onChange={(event) => onChange({ ...form, searchable: event.target.checked })} />
        支持搜索
      </label>
      <label className="mb-3 flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200" data-admin-catalog-category-attribute-filterable>
        <input type="checkbox" checked={form.filterable} onChange={(event) => onChange({ ...form, filterable: event.target.checked })} />
        支持筛选
      </label>
      <label className="mb-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
        排序
        <input value={form.sortOrder} onChange={(event) => onChange({ ...form, sortOrder: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white" data-admin-catalog-category-attribute-sort-order />
      </label>
      <label className="mb-4 block text-xs font-medium text-slate-600 dark:text-slate-300">
        状态
        <select value={form.status} onChange={(event) => onChange({ ...form, status: readBindingStatus(event.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white">
          {BINDING_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      <button type="submit" disabled={saving || !form.categoryId || !form.attributeId} className="w-full rounded-lg bg-lobster-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-60">
        {saving ? '保存中' : '保存绑定'}
      </button>
    </form>
  );
}

function readAttributeOptions(result: unknown): AttributeOption[] {
  return readApiItems(result).map((item) => {
    const record = item as Record<string, unknown>;
    return {
      id: String(record.id ?? ''),
      name: String(record.name ?? record.attributeName ?? record.attributeNo ?? ''),
      attributeNo: String(record.attributeNo ?? ''),
    };
  }).filter((item) => item.id && item.name);
}

function readCategoryOptions(result: unknown): CategoryOption[] {
  return readApiItems(result).map((item) => {
    const record = item as Record<string, unknown>;
    return {
      id: String(record.id ?? ''),
      name: String(record.name ?? record.categoryNo ?? ''),
      categoryNo: String(record.categoryNo ?? ''),
    };
  }).filter((item) => item.id && item.name);
}

function readCategoryAttributeBindings(result: unknown): CategoryAttributeBinding[] {
  return readApiItems(result).map((item) => {
    const record = item as Record<string, unknown>;
    return {
      id: String(record.id ?? ''),
      categoryId: String(record.categoryId ?? ''),
      attributeId: String(record.attributeId ?? ''),
      required: Boolean(record.required),
      searchable: Boolean(record.searchable),
      filterable: Boolean(record.filterable),
      sortOrder: typeof record.sortOrder === 'number' ? record.sortOrder : Number(record.sortOrder ?? 0) || 0,
      status: readBindingStatus(record.status),
    };
  }).filter((item) => item.id);
}

function readBindingStatus(value: unknown): BindingStatus {
  return value === 'inactive' || value === 'archived' ? value : 'active';
}

function bindingStatusLabel(status: BindingStatus): string {
  return BINDING_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status;
}
