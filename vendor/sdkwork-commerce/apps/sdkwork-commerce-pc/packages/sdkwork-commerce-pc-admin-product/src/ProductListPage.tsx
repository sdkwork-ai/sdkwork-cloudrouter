import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, ImageIcon, Info, Plus, RefreshCw, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BusinessStatePanel } from './commerce-admin-primitives';
import {
  readMediaResource,
  readMediaResourceUrl,
  type ClawRouterMediaResource,
} from './commerce-media-resource';
import { listCommerceProducts } from './catalogService';
import { readProductCommercialSignals } from './productAdminMapping';
import type { ProductCommercialSignals } from './productAdminTypes';

type ProductRecord = Record<string, unknown>;

type ProductStatusTab = {
  id: string;
  label: string;
  status?: string;
};

type ProductListState = {
  loading: boolean;
  error: string | null;
  records: ProductRecord[];
  meta: ProductCollectionMeta | null;
};

type ProductListFiltersState = {
  productId: string;
  merchantCode: string;
  productName: string;
};

type ProductCollectionMeta = {
  total: number;
  page: number;
  pageSize: number;
};

type ProductPaginationState = {
  page: number;
  pageSize: number;
};

type ProductStatusTone = 'blue' | 'green' | 'gray' | 'orange' | 'red';

type ProductPageWindowItem = number | 'ellipsis-start' | 'ellipsis-end';

const PRODUCT_PAGE_SIZE_OPTIONS = [20, 25, 50, 100];
const INITIAL_PAGINATION: ProductPaginationState = {
  page: 1,
  pageSize: 50,
};

export const PRODUCT_STATUS_TABS: ProductStatusTab[] = [
  { id: 'all', label: '全部' },
  { id: 'selling', label: '销售中', status: 'active' },
  { id: 'offline', label: '已下架', status: 'inactive' },
  { id: 'reviewing', label: '审核中', status: 'pending_review' },
  { id: 'reviewPending', label: '审核待处理', status: 'rejected' },
  { id: 'drafts', label: '草稿箱', status: 'draft' },
  { id: 'recycleBin', label: '回收站', status: 'archived' },
];

const INITIAL_FILTERS: ProductListFiltersState = {
  productId: '',
  merchantCode: '',
  productName: '',
};

const INITIAL_STATE: ProductListState = {
  loading: true,
  error: null,
  records: [],
  meta: null,
};

export function ProductListPage() {
  const [activeTabId, setActiveTabId] = useState(PRODUCT_STATUS_TABS[0].id);
  const [filters, setFilters] = useState<ProductListFiltersState>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ProductListFiltersState>(INITIAL_FILTERS);
  const [noticeVisible, setNoticeVisible] = useState(true);
  const [pagination, setPagination] = useState<ProductPaginationState>(INITIAL_PAGINATION);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(() => new Set());
  const [state, setState] = useState<ProductListState>(INITIAL_STATE);

  const activeTab = PRODUCT_STATUS_TABS.find((tab) => tab.id === activeTabId) ?? PRODUCT_STATUS_TABS[0];
  const queryText = useMemo(() => buildProductQueryText(appliedFilters), [appliedFilters]);

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: true, error: null }));
    void listCommerceProducts({
      page: String(pagination.page),
      pageSize: String(pagination.pageSize),
      q: queryText || undefined,
      status: activeTab.status,
    })
      .then((result) => {
        if (!active) {
          return;
        }
        setState({
          loading: false,
          error: null,
          records: readProductRecords(result),
          meta: readProductCollectionMeta(result),
        });
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setState({
          loading: false,
          error: error instanceof Error && error.message ? error.message : '商品列表加载失败',
          records: [],
          meta: null,
        });
      });
    return () => {
      active = false;
    };
  }, [activeTab.status, pagination.page, pagination.pageSize, queryText]);

  useEffect(() => {
    setSelectedProductIds(new Set());
  }, [activeTab.status, pagination.page, pagination.pageSize, queryText]);

  function reload() {
    setAppliedFilters({ ...filters });
    setPagination((current) => ({ ...current, page: 1 }));
  }

  function resetFilters() {
    setFilters(INITIAL_FILTERS);
    setAppliedFilters(INITIAL_FILTERS);
    setPagination((current) => ({ ...current, page: 1 }));
  }

  function changeTab(tabId: string) {
    setActiveTabId(tabId);
    setPagination((current) => ({ ...current, page: 1 }));
  }

  function updatePagination(nextPagination: ProductPaginationState) {
    setPagination(normalizeProductPagination(nextPagination));
  }

  return (
    <section
      className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-slate-50 dark:bg-[#0a0a0a] px-5 pb-6 pt-4 text-slate-900 transition-colors duration-300 dark:text-slate-100"
      data-admin-product-list-page
    >
      <div
        className="flex min-h-0 flex-1 flex-col rounded-lg border border-slate-200 bg-white px-7 pb-7 pt-7 shadow-sm transition-colors duration-300 dark:border-white/10 dark:bg-[#171717]"
        data-admin-product-list-card
      >
        <ProductStatusTabs activeTabId={activeTabId} onChange={changeTab} />
        <ProductListFilters
          filters={filters}
          onChange={setFilters}
          onQuery={reload}
          onReset={resetFilters}
        />
        {noticeVisible ? <ProductListNotice onDismiss={() => setNoticeVisible(false)} /> : null}
        <ProductListTable
          pagination={pagination}
          selectedProductIds={selectedProductIds}
          state={state}
          onPaginationChange={updatePagination}
          onRetry={reload}
          onSelectionChange={setSelectedProductIds}
        />
      </div>

      <ProductBatchToolbar selectedCount={selectedProductIds.size} />
    </section>
  );
}

type ProductStatusTabsProps = {
  activeTabId: string;
  onChange: (tabId: string) => void;
};

function ProductStatusTabs({ activeTabId, onChange }: ProductStatusTabsProps) {
  return (
    <div className="flex h-10 shrink-0 items-start justify-between gap-6" data-admin-product-list-tabs>
      <div className="flex min-w-0 items-start gap-9">
        {PRODUCT_STATUS_TABS.map((tab) => {
          const active = tab.id === activeTabId;
          return (
            <button
              className={`relative h-9 whitespace-nowrap px-0 text-[16px] font-semibold leading-7 transition-colors ${
                active
                  ? 'text-slate-950 dark:text-white'
                  : 'text-slate-600 hover:text-lobster-600 dark:text-slate-400 dark:hover:text-lobster-300'
              }`}
              key={tab.id}
              onClick={() => onChange(tab.id)}
              type="button"
            >
              {tab.label}
              {active ? (
                <span className="absolute bottom-0 left-0 h-[2px] w-full rounded-full bg-lobster-600 dark:bg-lobster-400" />
              ) : null}
            </button>
          );
        })}
      </div>
      <Link
        className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-lobster-600 px-4 text-[14px] font-semibold text-white shadow-sm shadow-lobster-500/20 transition-colors hover:bg-lobster-700 focus:outline-none focus:ring-2 focus:ring-lobster-500/25 dark:bg-lobster-500 dark:hover:bg-lobster-400 dark:hover:text-slate-950"
        data-admin-product-create-button
        to="/admin/commerce/products/new"
      >
        <Plus className="h-4 w-4" />
        新增商品
      </Link>
    </div>
  );
}

type ProductListFiltersProps = {
  filters: ProductListFiltersState;
  onChange: (filters: ProductListFiltersState) => void;
  onQuery: () => void;
  onReset: () => void;
};

function ProductListFilters({ filters, onChange, onQuery, onReset }: ProductListFiltersProps) {
  return (
    <form
      className="mt-6 grid shrink-0 grid-cols-[minmax(220px,413px)_minmax(220px,413px)_minmax(220px,413px)_140px_auto_auto] items-center gap-4"
      data-admin-product-list-filters
      onSubmit={(event) => {
        event.preventDefault();
        onQuery();
      }}
    >
      <ProductFilterInput
        label="商品ID"
        onChange={(value) => onChange({ ...filters, productId: value })}
        placeholder="多个以空格/逗号/分号分隔"
        value={filters.productId}
      />
      <ProductFilterInput
        label="商家编码"
        onChange={(value) => onChange({ ...filters, merchantCode: value })}
        placeholder="SKU/商家编码/条形码，空格/逗号分隔"
        value={filters.merchantCode}
      />
      <ProductFilterInput
        label="商品名称"
        onChange={(value) => onChange({ ...filters, productName: value })}
        placeholder="多个词用空格分割"
        value={filters.productName}
      />
      <button
        className="h-12 rounded-lg bg-slate-100 px-8 text-[16px] font-semibold text-slate-950 transition-colors hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-lobster-500/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
        type="submit"
      >
        查询
      </button>
      <button
        className="inline-flex h-12 items-center justify-center gap-1.5 whitespace-nowrap px-1 text-[15px] font-medium text-slate-500 transition-colors hover:text-lobster-600 dark:text-slate-400 dark:hover:text-lobster-300"
        onClick={onReset}
        type="button"
      >
        重置
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
      <button
        className="inline-flex h-12 items-center justify-center gap-1.5 whitespace-nowrap px-1 text-[15px] font-medium text-slate-500 transition-colors hover:text-lobster-600 dark:text-slate-400 dark:hover:text-lobster-300"
        type="button"
      >
        更多筛选
        <ChevronDown className="h-4 w-4" />
      </button>
    </form>
  );
}

type ProductFilterInputProps = {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
};

function ProductFilterInput({ label, placeholder, value, onChange }: ProductFilterInputProps) {
  return (
    <label className="flex h-12 min-w-0 items-center overflow-hidden rounded-lg border border-slate-200 bg-white text-[15px] shadow-sm transition-colors focus-within:border-lobster-400 focus-within:ring-2 focus-within:ring-lobster-500/10 dark:border-white/10 dark:bg-[#1e1e1e] dark:focus-within:border-lobster-400">
      <span className="shrink-0 border-r border-slate-200 px-5 font-semibold text-slate-500 dark:border-white/10 dark:text-slate-300">{label}</span>
      <input
        className="min-w-0 flex-1 bg-transparent px-4 text-[15px] font-medium text-slate-950 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

type ProductListNoticeProps = {
  onDismiss: () => void;
};

function ProductListNotice({ onDismiss }: ProductListNoticeProps) {
  return (
    <div
      className="mt-7 flex h-14 shrink-0 items-center rounded-lg border border-lobster-200 bg-lobster-50 px-5 text-[15px] text-slate-700 shadow-sm transition-colors dark:border-lobster-500/20 dark:bg-lobster-500/10 dark:text-slate-200"
      data-admin-product-list-notice
    >
      <div className="mr-3 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-lobster-600 text-white shadow-sm shadow-lobster-500/20 dark:bg-lobster-500">
        <Info className="h-4 w-4" />
      </div>
      <span className="font-medium">
        运费模板新增「今日发」发货时效，设置后可获专属标识，多场景透传，可提升下单转化。
      </span>
      <button className="ml-4 font-semibold text-lobster-600 transition-colors hover:text-lobster-700 dark:text-lobster-300 dark:hover:text-lobster-200" type="button">
        去设置
      </button>
      <button
        aria-label="关闭提示"
        className="ml-auto flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-white/70 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
        onClick={onDismiss}
        type="button"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );
}

type ProductListTableProps = {
  state: ProductListState;
  pagination: ProductPaginationState;
  selectedProductIds: Set<string>;
  onPaginationChange: (pagination: ProductPaginationState) => void;
  onRetry: () => void;
  onSelectionChange: (selectedProductIds: Set<string>) => void;
};

function ProductListTable({
  onPaginationChange,
  onRetry,
  onSelectionChange,
  pagination,
  selectedProductIds,
  state,
}: ProductListTableProps) {
  const selectableProductIds = state.records
    .map((record, index) => productRecordKey(record, index))
    .filter(Boolean);
  const allVisibleSelected = selectableProductIds.length > 0
    && selectableProductIds.every((productId) => selectedProductIds.has(productId));

  function toggleAllVisible(checked: boolean) {
    const next = new Set(selectedProductIds);
    for (const productId of selectableProductIds) {
      if (checked) {
        next.add(productId);
      } else {
        next.delete(productId);
      }
    }
    onSelectionChange(next);
  }

  function toggleRecord(productId: string, checked: boolean) {
    const next = new Set(selectedProductIds);
    if (checked) {
      next.add(productId);
    } else {
      next.delete(productId);
    }
    onSelectionChange(next);
  }

  return (
    <div
      className="mt-5 flex min-h-[420px] flex-1 flex-col overflow-hidden border-b border-slate-200 dark:border-white/10"
      data-admin-product-list-table
    >
      <div className="min-h-0 flex-1 overflow-auto" data-admin-product-list-table-viewport>
      <table className="w-full table-fixed border-collapse text-left">
        <thead>
          <tr className="h-14 bg-slate-50 text-[15px] font-medium text-slate-500 transition-colors dark:bg-white/[0.03] dark:text-slate-300">
            <th className="w-14 px-5">
              <label className="flex h-5 w-5 items-center justify-center">
                <input
                  aria-label="选择全部商品"
                  checked={allVisibleSelected}
                  className="h-5 w-5 rounded border-slate-300 accent-lobster-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/20 dark:accent-lobster-400"
                  disabled={selectableProductIds.length === 0}
                  onChange={(event) => toggleAllVisible(event.target.checked)}
                  type="checkbox"
                />
              </label>
            </th>
            <th className="px-1 font-medium">商品</th>
            <SortableHeader align="right" label="价格" widthClassName="w-44" />
            <SortableHeader align="right" label="库存" widthClassName="w-44" />
            <SortableHeader label="近30天经营概览" widthClassName="w-72" withInfo />
            <SortableHeader label="商品状态/时间" widthClassName="w-72" />
            <th className="w-28 px-5 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-white/10">
          {state.loading ? (
            <tr>
              <td colSpan={7}>
                <BusinessStatePanel className="h-[352px]" kind="loading" title="正在加载商品列表..." />
              </td>
            </tr>
          ) : state.error ? (
            <tr>
              <td colSpan={7}>
                <BusinessStatePanel
                  action={{ label: '重试', onClick: onRetry }}
                  className="h-[352px]"
                  description={state.error}
                  kind="error"
                  title="商品列表加载失败"
                />
              </td>
            </tr>
          ) : state.records.length === 0 ? (
            <tr>
              <td className="h-[352px] text-center text-[16px] font-medium text-slate-900 dark:text-white" colSpan={7}>
                暂无数据
              </td>
            </tr>
          ) : (
            state.records.map((record, index) => (
              <ProductTableRow
                key={productRecordKey(record, index)}
                record={record}
                selected={selectedProductIds.has(productRecordKey(record, index))}
                selectionId={productRecordKey(record, index)}
                onSelectedChange={toggleRecord}
              />
            ))
          )}
        </tbody>
      </table>
      </div>
      <ProductTablePagination
        disabled={state.loading}
        meta={state.meta}
        pagination={pagination}
        visibleCount={state.records.length}
        onPaginationChange={onPaginationChange}
      />
    </div>
  );
}

type SortableHeaderProps = {
  label: string;
  widthClassName: string;
  align?: 'right';
  withInfo?: boolean;
};

function SortableHeader({ label, widthClassName, align, withInfo }: SortableHeaderProps) {
  return (
    <th className={`${widthClassName} px-5 font-medium ${align === 'right' ? 'text-right' : ''}`}>
      <span className={`inline-flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
        {label}
        {withInfo ? <Info className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" /> : null}
        <ArrowUpDown className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
      </span>
    </th>
  );
}

type ProductTableRowProps = {
  record: ProductRecord;
  selected: boolean;
  selectionId: string;
  onSelectedChange: (productId: string, selected: boolean) => void;
};

function ProductTableRow({ onSelectedChange, record, selected, selectionId }: ProductTableRowProps) {
  const title = readProductString(record, ['title', 'name']) || '-';
  const spuNo = readProductString(record, ['spuNo', 'code', 'id']);
  const productId = readProductString(record, ['id']);
  const price = readProductString(record, ['minPriceAmount', 'priceAmount']);
  const currency = readProductString(record, ['currencyCode']);
  const productType = readProductString(record, ['productType']);
  const status = readProductString(record, ['status']) || '-';
  const updatedAt = readProductString(record, ['updatedAt', 'publishedAt', 'createdAt']);
  const coverResource = readProductCoverResource(record);
  const coverSource = readMediaResourceUrl(coverResource);
  const commercialSignals = readProductCommercialSignals(record);

  return (
    <tr className="h-[104px] border-b border-slate-200 text-[14px] text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.03]">
      <td className="px-5">
        <input
          aria-label={`选择商品 ${title}`}
          checked={selected}
          className="h-5 w-5 rounded border-slate-300 accent-lobster-600 dark:border-white/20 dark:accent-lobster-400"
          onChange={(event) => onSelectedChange(selectionId, event.target.checked)}
          type="checkbox"
        />
      </td>
      <td className="px-1">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50 shadow-sm dark:border-white/10 dark:bg-[#1e1e1e]">
            {coverSource ? (
              <img alt={title} className="h-full w-full object-cover" src={coverSource} />
            ) : (
              <ImageIcon className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            )}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-slate-950 dark:text-white">{title}</div>
            <div className="mt-1 flex min-w-0 items-center gap-2">
              <span className="shrink-0 rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[12px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {productTypeLabel(productType)}
              </span>
              <span className="truncate text-[13px] text-slate-500 dark:text-slate-400">商品ID：{productId || '-'}</span>
            </div>
            <div className="mt-1 truncate text-[13px] text-slate-500 dark:text-slate-400">商家编码：{spuNo || '-'}</div>
          </div>
        </div>
      </td>
      <td className="px-5 text-right text-[15px] font-semibold tabular-nums text-slate-950 dark:text-white">
        {price ? `${currency ? `${currency} ` : ''}${price}` : '-'}
      </td>
      <td className="px-5 text-right tabular-nums">{commercialSignals.inventoryReady ? 'Ready' : 'Risk'}</td>
      <td className="px-5">
        <CommercialSignalStack signals={commercialSignals} />
      </td>
      <td className="px-5">
        <span className={productStatusClassName(productStatusTone(status))}>{productStatusLabel(status)}</span>
        <div className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{formatProductDate(updatedAt)}</div>
      </td>
      <td className="px-5 text-right">
        {productId ? (
          <Link
            className="font-medium text-lobster-600 transition-colors hover:text-lobster-700 dark:text-lobster-300 dark:hover:text-lobster-200"
            to={`/admin/commerce/products/${encodeURIComponent(productId)}/edit`}
          >
            编辑
          </Link>
        ) : (
          <span className="font-medium text-slate-400 dark:text-slate-500">编辑</span>
        )}
      </td>
    </tr>
  );
}

function CommercialSignalStack({ signals }: { signals: ProductCommercialSignals }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5" data-admin-product-commercial-signals>
      <span className={commercialReadinessClassName(signals.readinessStatus)}>
        {signals.readinessLabel}
      </span>
      <div className="grid grid-cols-5 gap-1 text-[11px] font-semibold">
        <SignalPill active={signals.detailComplete} label="Detail" />
        <SignalPill active={signals.skuAttributeComplete} label="SKU" />
        <SignalPill active={signals.storeVisible} label="Store" />
        <SignalPill active={signals.inventoryReady} label="Inv" />
        <SignalPill active={signals.priceComplete} label="Price" />
      </div>
    </div>
  );
}

function SignalPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={`truncate rounded px-1.5 py-0.5 text-center ${
        active
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200'
      }`}
    >
      {label}
    </span>
  );
}

function commercialReadinessClassName(status: ProductCommercialSignals['readinessStatus']): string {
  if (status === 'ready') {
    return 'inline-flex w-fit rounded-full bg-emerald-50 px-2 py-1 text-[12px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
  }
  if (status === 'blocked') {
    return 'inline-flex w-fit rounded-full bg-red-50 px-2 py-1 text-[12px] font-semibold text-red-700 dark:bg-red-500/10 dark:text-red-200';
  }
  return 'inline-flex w-fit rounded-full bg-slate-100 px-2 py-1 text-[12px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300';
}

type ProductTablePaginationProps = {
  disabled: boolean;
  meta: ProductCollectionMeta | null;
  pagination: ProductPaginationState;
  visibleCount: number;
  onPaginationChange: (pagination: ProductPaginationState) => void;
};

function ProductTablePagination({
  disabled,
  meta,
  onPaginationChange,
  pagination,
  visibleCount,
}: ProductTablePaginationProps) {
  const total = meta?.total ?? visibleCount;
  const page = clampProductPage(meta?.page ?? pagination.page, calculateProductTotalPages(total, pagination.pageSize));
  const pageSize = meta?.pageSize ?? pagination.pageSize;
  const totalPages = calculateProductTotalPages(total, pageSize);
  const firstItem = total > 0 ? (page - 1) * pageSize + 1 : 0;
  const lastItem = total > 0 ? Math.min(total, firstItem + visibleCount - 1) : 0;
  const canPrevious = page > 1 && !disabled;
  const canNext = page < totalPages && !disabled;

  function goToPage(nextPage: number) {
    onPaginationChange({
      page: clampProductPage(nextPage, totalPages),
      pageSize: pagination.pageSize,
    });
  }

  function changePageSize(nextPageSize: number) {
    onPaginationChange({
      page: 1,
      pageSize: nextPageSize,
    });
  }

  function submitJump(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextPage = Number(formData.get('page'));
    if (Number.isFinite(nextPage)) {
      goToPage(nextPage);
    }
  }

  return (
    <div
      className="flex h-14 shrink-0 items-center justify-between gap-4 border-t border-slate-200 text-[13px] font-medium text-slate-500 dark:border-white/10 dark:text-slate-400"
      data-admin-product-list-pagination
    >
      <div className="flex min-w-0 items-center gap-2">
        <span>共 {total.toLocaleString('zh-CN')} 条</span>
        <span className="text-slate-300 dark:text-white/20">|</span>
        <span>
          显示 {firstItem.toLocaleString('zh-CN')}-{lastItem.toLocaleString('zh-CN')}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <label className="inline-flex items-center gap-2">
          <span>每页</span>
          <select
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[13px] font-semibold text-slate-700 outline-none transition-colors focus:border-lobster-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200"
            data-admin-product-pagination-page-size
            disabled={disabled}
            onChange={(event) => changePageSize(Number(event.target.value))}
            value={pagination.pageSize}
          >
            {PRODUCT_PAGE_SIZE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option} 条/页
              </option>
            ))}
          </select>
        </label>

        <button
          aria-label="上一页"
          className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-slate-600 transition-colors hover:border-lobster-300 hover:text-lobster-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
          disabled={!canPrevious}
          onClick={() => goToPage(page - 1)}
          title="上一页"
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-1" data-admin-product-pagination-pages>
          {renderProductPageWindow(page, totalPages).map((item) => {
            if (typeof item !== 'number') {
              return (
                <span className="inline-flex h-8 min-w-8 items-center justify-center text-slate-400 dark:text-slate-500" key={item}>
                  ...
                </span>
              );
            }
            const active = item === page;
            return (
              <button
                aria-current={active ? 'page' : undefined}
                className={`inline-flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[13px] font-semibold transition-colors ${
                  active
                    ? 'border-lobster-500 bg-lobster-50 text-lobster-600 dark:border-lobster-500/40 dark:bg-lobster-500/10 dark:text-lobster-300'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300'
                }`}
                disabled={disabled || active}
                key={item}
                onClick={() => goToPage(item)}
                type="button"
              >
                {item}
              </button>
            );
          })}
        </div>

        <button
          aria-label="下一页"
          className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-slate-600 transition-colors hover:border-lobster-300 hover:text-lobster-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300"
          disabled={!canNext}
          onClick={() => goToPage(page + 1)}
          title="下一页"
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <form className="ml-1 inline-flex items-center gap-2" onSubmit={submitJump}>
          <span>跳至</span>
          <input
            aria-label="跳转页码"
            className="h-8 w-14 rounded-lg border border-slate-200 bg-white px-2 text-center text-[13px] font-semibold text-slate-700 outline-none transition-colors focus:border-lobster-400 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-[#1e1e1e] dark:text-slate-200"
            data-admin-product-pagination-jump-input
            defaultValue={page}
            disabled={disabled}
            key={page}
            max={totalPages}
            min={1}
            name="page"
            type="number"
          />
          <span>页</span>
        </form>
      </div>
    </div>
  );
}

type ProductBatchToolbarProps = {
  selectedCount: number;
};

function ProductBatchToolbar({ selectedCount }: ProductBatchToolbarProps) {
  const hasSelection = selectedCount > 0;
  return (
    <div
      className="pointer-events-auto absolute bottom-8 left-8 z-20 flex h-16 items-center rounded-lg border border-slate-200 bg-white px-7 text-[16px] shadow-xl shadow-slate-900/15 backdrop-blur transition-colors dark:border-white/10 dark:bg-[#1e1e1e] dark:shadow-black/40"
      data-admin-product-list-batch-toolbar
    >
      <span className="mr-7 font-semibold text-slate-950 dark:text-white">批量</span>
      {['上架', '下架', '运费', '删除', '库存', '隐藏', '取消隐藏'].map((action, index) => (
        <React.Fragment key={action}>
          <button
            className={`font-semibold transition-colors hover:text-lobster-700 dark:hover:text-lobster-300 ${
              hasSelection ? 'text-lobster-600 dark:text-lobster-300' : 'text-slate-400 dark:text-slate-500'
            }`}
            disabled={!hasSelection || index === 0}
            type="button"
          >
            {action}
          </button>
          {index < 6 ? <span className="mx-5 h-5 w-px bg-slate-200 dark:bg-white/10" /> : null}
        </React.Fragment>
      ))}
      {hasSelection ? <span className="ml-6 text-[13px] font-medium text-slate-500 dark:text-slate-400">已选 {selectedCount} 件</span> : null}
    </div>
  );
}

function buildProductQueryText(filters: ProductListFiltersState): string {
  return [filters.productId, filters.merchantCode, filters.productName]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(' ');
}

export function normalizeProductPagination(value: Partial<ProductPaginationState>): ProductPaginationState {
  const page = Number.isFinite(value.page) && value.page && value.page > 0
    ? Math.trunc(value.page)
    : INITIAL_PAGINATION.page;
  const requestedPageSize = Number.isFinite(value.pageSize) && value.pageSize && value.pageSize > 0
    ? Math.trunc(value.pageSize)
    : INITIAL_PAGINATION.pageSize;
  const pageSize = PRODUCT_PAGE_SIZE_OPTIONS.includes(requestedPageSize)
    ? requestedPageSize
    : requestedPageSize > PRODUCT_PAGE_SIZE_OPTIONS[PRODUCT_PAGE_SIZE_OPTIONS.length - 1]
      ? PRODUCT_PAGE_SIZE_OPTIONS[PRODUCT_PAGE_SIZE_OPTIONS.length - 1]
      : PRODUCT_PAGE_SIZE_OPTIONS[0];

  return { page, pageSize };
}

export function clampProductPage(page: number, totalPages: number): number {
  const normalizedTotalPages = Number.isFinite(totalPages) && totalPages > 0 ? Math.trunc(totalPages) : 1;
  if (!Number.isFinite(page)) {
    return 1;
  }
  return Math.min(normalizedTotalPages, Math.max(1, Math.trunc(page)));
}

export function calculateProductTotalPages(total: number, pageSize: number): number {
  const normalizedTotal = Number.isFinite(total) && total > 0 ? Math.trunc(total) : 0;
  const normalizedPageSize = Number.isFinite(pageSize) && pageSize > 0 ? Math.trunc(pageSize) : INITIAL_PAGINATION.pageSize;
  return Math.max(1, Math.ceil(normalizedTotal / normalizedPageSize));
}

export function renderProductPageWindow(page: number, totalPages: number): ProductPageWindowItem[] {
  const normalizedTotalPages = Math.max(1, Math.trunc(totalPages));
  const currentPage = clampProductPage(page, normalizedTotalPages);
  if (normalizedTotalPages <= 5) {
    return Array.from({ length: normalizedTotalPages }, (_, index) => index + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 'ellipsis-end', normalizedTotalPages];
  }
  if (currentPage >= normalizedTotalPages - 2) {
    return [1, 'ellipsis-start', normalizedTotalPages - 2, normalizedTotalPages - 1, normalizedTotalPages];
  }
  return [
    1,
    'ellipsis-start',
    currentPage - 1,
    currentPage,
    currentPage + 1,
    'ellipsis-end',
    normalizedTotalPages,
  ];
}

export function readProductRecords(value: unknown): ProductRecord[] {
  const payload = readPayload(value);
  if (Array.isArray(payload)) {
    return payload.filter(isProductRecord);
  }
  if (!isProductRecord(payload)) {
    return [];
  }
  for (const key of ['items', 'records', 'list', 'data']) {
    const records = payload[key];
    if (Array.isArray(records)) {
      return records.filter(isProductRecord);
    }
  }
  const item = payload.item;
  return isProductRecord(item) ? [item] : [];
}

export function readProductCollectionMeta(value: unknown): ProductCollectionMeta | null {
  const payload = readPayload(value);
  if (!isProductRecord(payload)) {
    return null;
  }
  const total = readFiniteNumber(payload.total ?? payload.totalElements ?? payload.total_count);
  const page = readFiniteNumber(payload.page ?? payload.pageNo ?? payload.page_no);
  const pageSize = readFiniteNumber(payload.pageSize ?? payload.page_size ?? payload.size);
  if (total === null || page === null || pageSize === null) {
    return null;
  }
  return { total, page, pageSize };
}

function readPayload(value: unknown): unknown {
  if (!isProductRecord(value)) {
    return value;
  }
  return 'data' in value ? value.data : value;
}

function isProductRecord(value: unknown): value is ProductRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function readProductString(record: ProductRecord, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return '';
}

function readFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.trunc(value));
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : null;
  }
  return null;
}

function productRecordKey(record: ProductRecord, index: number): string {
  return readProductString(record, ['id', 'spuNo']) || String(index);
}

export function readProductCoverResource(record: ProductRecord): ClawRouterMediaResource | undefined {
  const media = record.media;
  if (!Array.isArray(media)) {
    return undefined;
  }
  const preferred = media.find((item) => (
    isProductRecord(item)
    && ['main_image', 'gallery_image', 'detail_image', 'sku_image'].includes(readProductString(item, ['mediaRole']))
    && readMediaResource(item.resource)
  ));
  if (!isProductRecord(preferred)) {
    return undefined;
  }
  return readMediaResource(preferred.resource);
}

export function productTypeLabel(productType: string): string {
  switch (productType) {
    case 'physical_good':
      return '实物商品';
    case 'virtual_good':
      return '虚拟商品';
    case 'membership':
      return '会员商品';
    case 'points_recharge':
      return '积分充值';
    case 'wallet_recharge':
      return '钱包充值';
    case 'subscription':
      return '订阅服务';
    case 'service':
      return '服务商品';
    default:
      return productType || '-';
  }
}

export function productStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return '销售中';
    case 'inactive':
      return '已下架';
    case 'draft':
      return '草稿箱';
    case 'archived':
      return '回收站';
    case 'pending_review':
      return '审核中';
    case 'rejected':
      return '审核待处理';
    default:
      return status;
  }
}

export function productStatusTone(status: string): ProductStatusTone {
  switch (status) {
    case 'active':
      return 'green';
    case 'inactive':
      return 'gray';
    case 'draft':
      return 'blue';
    case 'archived':
      return 'gray';
    case 'pending_review':
      return 'orange';
    case 'rejected':
      return 'red';
    default:
      return 'gray';
  }
}

function productStatusClassName(tone: ProductStatusTone): string {
  const baseClassName = 'inline-flex rounded border px-2 py-0.5 text-[13px] font-semibold';
  switch (tone) {
    case 'green':
      return `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300`;
    case 'blue':
      return `${baseClassName} border-lobster-200 bg-lobster-50 text-lobster-600 dark:border-lobster-500/20 dark:bg-lobster-500/10 dark:text-lobster-300`;
    case 'orange':
      return `${baseClassName} border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300`;
    case 'red':
      return `${baseClassName} border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300`;
    case 'gray':
    default:
      return `${baseClassName} border-slate-200 bg-slate-100 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300`;
  }
}

export function formatProductDate(value: string): string {
  if (!value) {
    return '-';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
  });
}
