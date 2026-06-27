import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, RefreshCw, Archive, X } from 'lucide-react';
import { BusinessStatePanel } from './commerce-admin-primitives';
import {
  readMediaResource,
  readMediaResourceUrl,
  toExternalUrlMediaResource,
  type ClawRouterMediaResource,
} from './commerce-media-resource';
import {
  createCommerceSku,
  deleteCommerceSku,
  listCommerceProducts,
  listCommerceSkus,
  updateCommerceSku,
} from './catalogService';
import { readProductRecords, readProductString } from './ProductListPage';

type SkuRecord = Record<string, unknown>;
type SkuAttributeSummary = {
  total: number;
  required: number;
  completed: number;
};

type SkuPageState = {
  loading: boolean;
  saving: boolean;
  error: string | null;
  items: SkuRecord[];
};

type ProductOption = {
  id: string;
  label: string;
};

type SkuFormState = {
  productId: string;
  title: string;
  skuNo: string;
  defaultPriceAmount: string;
  defaultCurrencyCode: string;
  fulfillmentType: SkuFulfillmentType;
  status: SkuStatus;
  barcode: string;
  image?: ClawRouterMediaResource;
};

type SkuFulfillmentType =
  | 'physical_shipment'
  | 'digital_delivery'
  | 'entitlement_grant'
  | 'points_credit'
  | 'wallet_credit'
  | 'subscription_activation'
  | 'service_activation'
  | 'none';

type SkuStatus = 'draft' | 'active' | 'inactive' | 'archived';

type SkuManagementDrawerState = {
  open: boolean;
  mode: 'create' | 'edit' | 'view';
  record: SkuRecord | null;
};

const DEFAULT_STATE: SkuPageState = {
  loading: true,
  saving: false,
  error: null,
  items: [],
};

const FULFILLMENT_TYPE_OPTIONS: Array<{ value: SkuFulfillmentType; label: string }> = [
  { value: 'physical_shipment', label: 'Physical shipment' },
  { value: 'digital_delivery', label: 'Digital delivery' },
  { value: 'entitlement_grant', label: 'Entitlement grant' },
  { value: 'points_credit', label: 'Points credit' },
  { value: 'wallet_credit', label: 'Wallet credit' },
  { value: 'subscription_activation', label: 'Subscription activation' },
  { value: 'service_activation', label: 'Service activation' },
  { value: 'none', label: 'None' },
];

const SKU_STATUS_OPTIONS: Array<{ value: SkuStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'archived', label: 'Archived' },
];

export function SkuManagementPage() {
  const [state, setState] = useState<SkuPageState>(DEFAULT_STATE);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [drawer, setDrawer] = useState<SkuManagementDrawerState>({
    open: false,
    mode: 'view',
    record: null,
  });
  const [form, setForm] = useState<SkuFormState>(createEmptySkuForm([]));

  const productLabelById = useMemo(
    () => new Map(productOptions.map((option) => [option.id, option.label])),
    [productOptions],
  );

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const [skuResult, productResult] = await Promise.all([
        listCommerceSkus({ page: '1', pageSize: '200' }),
        listCommerceProducts({ page: '1', pageSize: '200' }),
      ]);
      const nextProductOptions = readProductRecords(productResult).map((record) => {
        const id = readProductString(record, ['id']);
        return {
          id,
          label: readProductString(record, ['title', 'name']) || id,
        };
      }).filter((option) => option.id.length > 0);
      setProductOptions(nextProductOptions);
      setState({
        loading: false,
        saving: false,
        error: null,
        items: readSkuRecords(skuResult),
      });
    } catch (error) {
      setState({
        loading: false,
        saving: false,
        error: error instanceof Error ? error.message : 'SKU data could not be loaded.',
        items: [],
      });
    }
  }

  function openDrawer(mode: 'create' | 'edit' | 'view', record: SkuRecord | null = null) {
    setDrawer({
      open: true,
      mode,
      record,
    });
    setForm(record ? readSkuFormState(record) : createEmptySkuForm(productOptions));
  }

  function closeDrawer() {
    setDrawer((current) => ({ ...current, open: false, record: null }));
  }

  async function saveSku(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (drawer.mode === 'view') {
      closeDrawer();
      return;
    }
    const validationError = validateSkuForm(form);
    if (validationError) {
      setState((current) => ({ ...current, error: validationError }));
      return;
    }

    const mutationBody = buildSkuMutationBody(form);
    const skuId = drawer.record ? readSkuString(drawer.record, ['id']) : '';
    setState((current) => ({ ...current, saving: true, error: null }));
    try {
      if (drawer.mode === 'edit' && skuId) {
        await updateCommerceSku(skuId, mutationBody);
      } else {
        await createCommerceSku(mutationBody);
      }
      closeDrawer();
      await loadPage();
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: error instanceof Error ? error.message : 'SKU changes could not be saved.',
      }));
    }
  }

  async function archiveSku(record: SkuRecord) {
    const skuId = readSkuString(record, ['id']);
    if (!skuId) {
      return;
    }
    setState((current) => ({ ...current, saving: true, error: null }));
    try {
      await deleteCommerceSku(skuId);
      await loadPage();
    } catch (error) {
      setState((current) => ({
        ...current,
        saving: false,
        error: error instanceof Error ? error.message : 'SKU could not be archived.',
      }));
    }
  }

  return (
    <section
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-50 px-5 pb-6 pt-4 text-slate-900 dark:bg-[#0a0a0a] dark:text-slate-100"
      data-admin-catalog-sku-management-page
    >
      <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white px-6 pb-6 pt-6 shadow-sm dark:border-white/10 dark:bg-[#171717]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">SKU management</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage catalog SKU variants with create, edit, view, and archive operations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
              onClick={() => void loadPage()}
              type="button"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg bg-lobster-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-lobster-700"
              onClick={() => openDrawer('create')}
              type="button"
            >
              <Plus className="h-4 w-4" />
              Create SKU
            </button>
          </div>
        </div>

        {state.error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200">
            {state.error}
          </div>
        ) : null}

        <div className="mt-6 min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-white/10">
          {state.loading ? (
            <BusinessStatePanel className="h-full min-h-[360px]" kind="loading" title="Loading SKUs..." />
          ) : state.items.length === 0 ? (
            <BusinessStatePanel className="h-full min-h-[360px]" kind="empty" title="No SKUs found" />
          ) : (
            <div className="h-full overflow-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-[#111111] dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Attributes</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Image</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                  {state.items.map((record, index) => {
                    const skuId = readSkuString(record, ['id']) || String(index);
                    const productId = readSkuString(record, ['productId', 'product_id']);
                    const image = readSkuImage(record);
                    const imageHref = readMediaResourceUrl(image);
                    const status = normalizeSkuStatus(readSkuString(record, ['status']));
                    const attributeSummary = readSkuAttributeSummary(record);
                    return (
                      <tr key={skuId} className="align-top text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5">
                        <td className="px-4 py-3 font-medium">{readSkuString(record, ['skuNo', 'sku_no']) || skuId}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900 dark:text-white">{productLabelById.get(productId) || productId || '-'}</div>
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{productId || '-'}</div>
                        </td>
                        <td className="px-4 py-3">{readSkuString(record, ['title', 'name']) || '-'}</td>
                        <td className="px-4 py-3">
                          {readSkuString(record, ['defaultCurrencyCode', 'currencyCode', 'currency_code']) || 'CNY'}{' '}
                          {readSkuString(record, ['defaultPriceAmount', 'priceAmount', 'price_amount']) || '0.00'}
                        </td>
                        <td className="px-4 py-3">
                          <SkuAttributeSummaryPill summary={attributeSummary} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-white/10 dark:text-slate-200">
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {imageHref ? (
                            <a className="text-lobster-600 hover:underline dark:text-lobster-300" href={imageHref} rel="noreferrer" target="_blank">
                              Preview
                            </a>
                          ) : (
                            <span className="text-slate-400 dark:text-slate-500">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            <button
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                              onClick={() => openDrawer('view', record)}
                              type="button"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                              onClick={() => openDrawer('edit', record)}
                              type="button"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Edit
                            </button>
                            <button
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-500/20 dark:text-red-200 dark:hover:bg-red-500/10"
                              onClick={() => void archiveSku(record)}
                              type="button"
                            >
                              <Archive className="h-3.5 w-3.5" />
                              Archive
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {drawer.open ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[1px] dark:bg-black/50">
          <aside className="flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#171717]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5 dark:border-white/10">
              <div>
                <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                  {drawer.mode === 'create' ? 'Create SKU' : drawer.mode === 'edit' ? 'Edit SKU' : 'View SKU'}
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  Maintain catalog SKU pricing, fulfillment, and lifecycle state.
                </p>
              </div>
              <button
                className="rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
                onClick={closeDrawer}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={saveSku}>
              <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto px-6 py-5 md:grid-cols-2">
                <Field label="Product">
                  <select
                    disabled={drawer.mode === 'view'}
                    onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
                    value={form.productId}
                    className={fieldClassName(drawer.mode === 'view')}
                  >
                    <option value="">Select product</option>
                    {productOptions.map((option) => (
                      <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="SKU no">
                  <input
                    disabled={drawer.mode === 'view'}
                    onChange={(event) => setForm((current) => ({ ...current, skuNo: event.target.value }))}
                    value={form.skuNo}
                    className={fieldClassName(drawer.mode === 'view')}
                  />
                </Field>
                <Field label="Title">
                  <input
                    disabled={drawer.mode === 'view'}
                    onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                    value={form.title}
                    className={fieldClassName(drawer.mode === 'view')}
                  />
                </Field>
                <Field label="Barcode">
                  <input
                    disabled={drawer.mode === 'view'}
                    onChange={(event) => setForm((current) => ({ ...current, barcode: event.target.value }))}
                    value={form.barcode}
                    className={fieldClassName(drawer.mode === 'view')}
                  />
                </Field>
                <Field label="Price amount">
                  <input
                    disabled={drawer.mode === 'view'}
                    onChange={(event) => setForm((current) => ({ ...current, defaultPriceAmount: event.target.value }))}
                    value={form.defaultPriceAmount}
                    className={fieldClassName(drawer.mode === 'view')}
                  />
                </Field>
                <Field label="Currency">
                  <input
                    disabled={drawer.mode === 'view'}
                    onChange={(event) => setForm((current) => ({ ...current, defaultCurrencyCode: event.target.value.toUpperCase() }))}
                    value={form.defaultCurrencyCode}
                    className={fieldClassName(drawer.mode === 'view')}
                  />
                </Field>
                <Field label="Fulfillment type">
                  <select
                    disabled={drawer.mode === 'view'}
                    onChange={(event) => setForm((current) => ({ ...current, fulfillmentType: event.target.value as SkuFulfillmentType }))}
                    value={form.fulfillmentType}
                    className={fieldClassName(drawer.mode === 'view')}
                  >
                    {FULFILLMENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    disabled={drawer.mode === 'view'}
                    onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as SkuStatus }))}
                    value={form.status}
                    className={fieldClassName(drawer.mode === 'view')}
                  >
                    {SKU_STATUS_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </Field>
                <div className="md:col-span-2">
                  <Field label="SKU image">
                    <input
                      disabled={drawer.mode === 'view'}
                      onChange={(event) => setForm((current) => ({ ...current, image: toExternalUrlMediaResource(event.target.value, 'image') }))}
                      value={readMediaResourceUrl(form.image)}
                      className={fieldClassName(drawer.mode === 'view')}
                    />
                  </Field>
                </div>
                {drawer.record ? (
                  <div className="md:col-span-2">
                    <Field label="SKU attributes">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
                        {formatSkuAttributeSummary(readSkuAttributeSummary(drawer.record))}
                      </div>
                    </Field>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-white/10">
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/5"
                  onClick={closeDrawer}
                  type="button"
                >
                  {drawer.mode === 'view' ? 'Close' : 'Cancel'}
                </button>
                {drawer.mode !== 'view' ? (
                  <button
                    className="rounded-lg bg-lobster-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-lobster-700 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={state.saving}
                    type="submit"
                  >
                    {drawer.mode === 'create' ? 'Create SKU' : 'Save changes'}
                  </button>
                ) : null}
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </section>
  );
}

type FieldProps = {
  label: string;
  children: React.ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      {children}
    </label>
  );
}

function fieldClassName(disabled = false) {
  return `w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-lobster-400 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-white ${
    disabled ? 'cursor-not-allowed bg-slate-50 text-slate-500 dark:bg-white/5 dark:text-slate-400' : ''
  }`;
}

function SkuAttributeSummaryPill({ summary }: { summary: SkuAttributeSummary }) {
  const complete = summary.required === 0 || summary.completed >= summary.required;
  return (
    <span
      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
        complete
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
      }`}
    >
      {formatSkuAttributeSummary(summary)}
    </span>
  );
}

export function readSkuRecords(value: unknown): SkuRecord[] {
  const payload = readPayload(value);
  if (Array.isArray(payload)) {
    return payload.filter(isSkuRecord);
  }
  if (!isSkuRecord(payload)) {
    return [];
  }
  for (const key of ['items', 'records', 'list', 'data']) {
    const records = payload[key];
    if (Array.isArray(records)) {
      return records.filter(isSkuRecord);
    }
  }
  const item = payload.item;
  return isSkuRecord(item) ? [item] : [];
}

function readPayload(value: unknown): unknown {
  if (!isSkuRecord(value)) {
    return value;
  }
  return 'data' in value ? value.data : value;
}

function isSkuRecord(value: unknown): value is SkuRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readSkuString(record: SkuRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

function readSkuImage(record: SkuRecord): ClawRouterMediaResource | undefined {
  return readMediaResource(record.image);
}

function readSkuAttributeSummary(record: SkuRecord): SkuAttributeSummary {
  const attributes = Array.isArray(record.attributes) ? record.attributes.filter(isSkuRecord) : [];
  const required = attributes.filter((attribute) => attribute.required === true).length;
  const completed = attributes.filter((attribute) => (
    attribute.required !== true
    || Boolean(readSkuString(attribute, ['displayValue', 'customValue', 'valueCode', 'attributeValueId']))
  )).length;
  return {
    total: attributes.length,
    required,
    completed,
  };
}

function formatSkuAttributeSummary(summary: SkuAttributeSummary): string {
  if (summary.total === 0) {
    return 'No attributes';
  }
  if (summary.required === 0) {
    return `${summary.total} optional`;
  }
  return `${summary.completed}/${summary.required} required`;
}

function createEmptySkuForm(productOptions: ProductOption[]): SkuFormState {
  return {
    productId: productOptions[0]?.id ?? '',
    title: '',
    skuNo: '',
    defaultPriceAmount: '0.00',
    defaultCurrencyCode: 'CNY',
    fulfillmentType: 'none',
    status: 'draft',
    barcode: '',
    image: undefined,
  };
}

function readSkuFormState(record: SkuRecord): SkuFormState {
  return {
    productId: readSkuString(record, ['productId', 'product_id']),
    title: readSkuString(record, ['title', 'name']),
    skuNo: readSkuString(record, ['skuNo', 'sku_no']),
    defaultPriceAmount: readSkuString(record, ['defaultPriceAmount', 'priceAmount', 'price_amount']) || '0.00',
    defaultCurrencyCode: readSkuString(record, ['defaultCurrencyCode', 'currencyCode', 'currency_code']) || 'CNY',
    fulfillmentType: normalizeSkuFulfillmentType(readSkuString(record, ['fulfillmentType'])),
    status: normalizeSkuStatus(readSkuString(record, ['status'])),
    barcode: readSkuString(record, ['barcode']),
    image: readSkuImage(record),
  };
}

function validateSkuForm(form: SkuFormState): string | null {
  if (!form.productId.trim()) {
    return 'Product is required.';
  }
  if (!form.title.trim()) {
    return 'Title is required.';
  }
  if (!form.skuNo.trim()) {
    return 'SKU no is required.';
  }
  if (!form.defaultPriceAmount.trim()) {
    return 'Price amount is required.';
  }
  return null;
}

function buildSkuMutationBody(form: SkuFormState) {
  return {
    barcode: form.barcode || null,
    defaultCurrencyCode: form.defaultCurrencyCode || 'CNY',
    defaultPriceAmount: form.defaultPriceAmount || '0.00',
    fulfillmentType: form.fulfillmentType,
    image: form.image,
    productId: form.productId,
    skuNo: form.skuNo.trim(),
    status: form.status,
    title: form.title.trim(),
  };
}

function normalizeSkuStatus(value: string): SkuStatus {
  if (value === 'active' || value === 'inactive' || value === 'archived') {
    return value;
  }
  return 'draft';
}

function normalizeSkuFulfillmentType(value: string): SkuFulfillmentType {
  for (const option of FULFILLMENT_TYPE_OPTIONS) {
    if (option.value === value) {
      return option.value;
    }
  }
  return 'none';
}
