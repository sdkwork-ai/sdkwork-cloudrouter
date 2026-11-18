import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Archive, Eye, Pencil, Send } from 'lucide-react';

import { Button, StatusBadge, formatMinorAmount, formatTimestamp, type DataColumn, type FilterControl, type FormFieldSpec } from '../components/ui.tsx';
import { RecordFormDialog } from '../components/RecordFormDialog.tsx';
import { useCatalogLookups } from './catalogLookups.ts';
import { ResourcePageFrame, requireString, type ProductCenterPageProps, type RowActionContext } from './resourcePage.tsx';
import {
  getProductCenterService,
  type Brand,
  type Product,
  type Sku,
} from '../productCenterService.ts';

const PRODUCT_TYPES = ['physical', 'digital', 'service', 'membership', 'points'] as const;
const PRODUCT_STATUSES = ['draft', 'active', 'inactive', 'archived'] as const;
const SKU_FULFILLMENT_TYPES = ['physical', 'digital', 'service', 'membership_activation', 'points_topup'] as const;
const INVENTORY_TRACKING = ['none', 'quantity'] as const;
const INVENTORY_POLICY = ['deny', 'backorder'] as const;

function optionalString(values: Record<string, string | boolean>, name: string): string | undefined {
  const value = values[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function narrow<T extends readonly string[]>(
  values: T,
  value: string | boolean | undefined,
): T[number] | undefined {
  const candidate = typeof value === 'string' ? value : undefined;
  return candidate !== undefined && (values as readonly string[]).includes(candidate)
    ? (candidate as T[number])
    : undefined;
}

export interface ProductListPageProps extends ProductCenterPageProps {
  /** Host-supplied SPA navigation to the product detail route. */
  onOpenProduct?: (productId: string) => void;
}

export function ProductListPage({ service, onOpenProduct }: ProductListPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const lookups = useCatalogLookups(resolved);
  const [editing, setEditing] = useState<Product | null>(null);

  const typeOptions = useMemo(
    () => [
      { value: '', label: t('admin.productCenter.common.all', 'All') },
      ...PRODUCT_TYPES.map((type) => ({
        value: type,
        label: t(`admin.productCenter.products.type.${type}`, type),
      })),
    ],
    [t],
  );

  const statusOptions = useMemo(
    () => [
      { value: '', label: t('admin.productCenter.common.all', 'All') },
      ...PRODUCT_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    ],
    [t],
  );

  const categoryFilterOptions = useMemo(
    () => [
      { value: '', label: t('admin.productCenter.common.all', 'All') },
      ...lookups.categoryOptions,
    ],
    [lookups.categoryOptions, t],
  );

  const filters = useMemo<FilterControl[]>(() => [
    {
      name: 'q',
      label: t('admin.productCenter.actions.search', 'Search'),
      kind: 'text',
      placeholder: t('admin.productCenter.products.filter.search', 'Search products'),
    },
    {
      name: 'categoryId',
      label: t('admin.productCenter.products.filter.category', 'Category'),
      kind: 'select',
      options: categoryFilterOptions,
    },
    {
      name: 'productType',
      label: t('admin.productCenter.products.filter.type', 'Fulfillment type'),
      kind: 'select',
      options: typeOptions,
    },
    {
      name: 'status',
      label: t('admin.productCenter.products.filter.status', 'Status'),
      kind: 'select',
      options: statusOptions,
    },
  ], [categoryFilterOptions, statusOptions, t, typeOptions]);

  const load = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listProducts({
        page: query.page,
        pageSize: query.pageSize,
        q: query.filters.q || undefined,
        categoryId: query.filters.categoryId || undefined,
        productType: query.filters.productType || undefined,
        status: query.filters.status || undefined,
      }),
    [resolved],
  );

  const columns = useMemo<DataColumn<Product>[]>(() => [
    {
      key: 'productNo',
      header: t('admin.productCenter.products.column.productNo', 'Product no.'),
      cell: (row) => <span className="font-mono text-xs">{row.productNo}</span>,
    },
    {
      key: 'name',
      header: t('admin.productCenter.products.column.name', 'Product'),
      cell: (row) => (
        <div className="min-w-40">
          <div className="font-medium">{row.title || row.name}</div>
          {row.subtitle ? <div className="truncate text-xs text-slate-500 dark:text-slate-400">{row.subtitle}</div> : null}
        </div>
      ),
    },
    {
      key: 'category',
      header: t('admin.productCenter.products.column.category', 'Category'),
      cell: (row) => lookups.categoryName(row.categoryId) ?? '—',
    },
    {
      key: 'brand',
      header: t('admin.productCenter.products.column.brand', 'Brand'),
      cell: (row) => lookups.brandName(row.brandId) ?? '—',
    },
    {
      key: 'type',
      header: t('admin.productCenter.products.column.type', 'Fulfillment type'),
      cell: (row) => t(`admin.productCenter.products.type.${row.productType}`, row.productType),
    },
    {
      key: 'status',
      header: t('admin.productCenter.products.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge
          label={t(`admin.productCenter.status.${row.status}`, row.status)}
          value={row.status}
        />
      ),
    },
    {
      key: 'updatedAt',
      header: t('admin.productCenter.products.column.updatedAt', 'Updated'),
      cell: (row) => <span className="whitespace-nowrap text-xs">{formatTimestamp(row.updatedAt)}</span>,
    },
  ], [lookups, t]);

  const createFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'productNo', label: t('admin.productCenter.products.column.productNo', 'Product no.'), kind: 'text', required: true },
    { name: 'title', label: t('admin.productCenter.products.field.title', 'Title'), kind: 'text', required: true },
    {
      name: 'categoryId',
      label: t('admin.productCenter.products.field.category', 'Category'),
      kind: 'select',
      required: true,
      options: lookups.categoryOptions,
    },
    {
      name: 'brandId',
      label: t('admin.productCenter.products.field.brand', 'Brand'),
      kind: 'select',
      options: [{ value: '', label: t('admin.productCenter.common.dash', '—') }, ...lookups.brandOptions],
    },
    {
      name: 'productType',
      label: t('admin.productCenter.products.field.productType', 'Fulfillment type'),
      kind: 'select',
      required: true,
      options: PRODUCT_TYPES.map((type) => ({
        value: type,
        label: t(`admin.productCenter.products.type.${type}`, type),
      })),
    },
    { name: 'barcode', label: t('admin.productCenter.products.field.barcode', 'Barcode'), kind: 'text' },
    { name: 'weightGram', label: t('admin.productCenter.products.field.weightGram', 'Weight (g)'), kind: 'number' },
  ], [lookups.brandOptions, lookups.categoryOptions, t]);

  const editFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'title', label: t('admin.productCenter.products.field.title', 'Title'), kind: 'text', required: true },
    {
      name: 'categoryId',
      label: t('admin.productCenter.products.field.category', 'Category'),
      kind: 'select',
      required: true,
      options: lookups.categoryOptions,
    },
    {
      name: 'brandId',
      label: t('admin.productCenter.products.field.brand', 'Brand'),
      kind: 'select',
      options: [{ value: '', label: t('admin.productCenter.common.dash', '—') }, ...lookups.brandOptions],
    },
    {
      name: 'status',
      label: t('admin.productCenter.products.field.status', 'Status'),
      kind: 'select',
      options: PRODUCT_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
    { name: 'modelNo', label: t('admin.productCenter.products.field.modelNo', 'Model number'), kind: 'text' },
    { name: 'barcode', label: t('admin.productCenter.products.field.barcode', 'Barcode'), kind: 'text' },
    { name: 'weightGram', label: t('admin.productCenter.products.field.weightGram', 'Weight (g)'), kind: 'number' },
  ], [lookups.brandOptions, lookups.categoryOptions, t]);

  const runTransition = (
    row: Product,
    context: RowActionContext,
    action: (productId: string, version: string) => Promise<Product>,
    successKey: string,
    successFallback: string,
  ) => {
    action(row.id, row.version).then(
      () => {
        context.reportSuccess(t(successKey, successFallback));
        context.reload();
      },
      context.reportError,
    );
  };

  return (
    <>
      <ResourcePageFrame<Product>
        columns={columns}
        create={{
          label: t('admin.productCenter.actions.create', 'Create'),
          title: t('admin.productCenter.products.createTitle', 'Create product'),
          fields: createFields,
          onSubmit: (values) => resolved.createProduct({
            productNo: requireString(values, 'productNo'),
            title: requireString(values, 'title'),
            categoryId: requireString(values, 'categoryId'),
            productType: narrow(PRODUCT_TYPES, values.productType) ?? 'physical',
            ...(optionalString(values, 'brandId') ? { brandId: optionalString(values, 'brandId') } : {}),
            ...(optionalString(values, 'barcode') ? { barcode: optionalString(values, 'barcode') } : {}),
            ...(optionalString(values, 'weightGram') ? { weightGram: optionalString(values, 'weightGram') } : {}),
          }).then(() => undefined),
        }}
        description={t('admin.productCenter.products.description', '')}
        emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
        filters={filters}
        load={load}
        rowActions={(row, context) => (
          <>
            {onOpenProduct ? (
              <Button onClick={() => onOpenProduct(row.id)} variant="ghost">
                <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                {t('admin.productCenter.products.actions.detail', 'Detail')}
              </Button>
            ) : null}
            <Button onClick={() => setEditing(row)} variant="ghost">
              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.edit', 'Edit')}
            </Button>
            {row.status !== 'active' ? (
              <Button
                onClick={() => runTransition(row, context, resolved.publishProduct, 'admin.productCenter.toast.published', 'Published')}
                variant="ghost"
              >
                <Send aria-hidden="true" className="h-3.5 w-3.5" />
                {t('admin.productCenter.actions.publish', 'Publish')}
              </Button>
            ) : null}
            {row.status !== 'archived' ? (
              <Button
                onClick={() => runTransition(row, context, resolved.archiveProduct, 'admin.productCenter.toast.archived', 'Archived')}
                variant="ghost"
              >
                <Archive aria-hidden="true" className="h-3.5 w-3.5" />
                {t('admin.productCenter.actions.archive', 'Archive')}
              </Button>
            ) : null}
          </>
        )}
        rowKey={(row) => row.id}
        title={t('admin.productCenter.products.title', 'Products')}
      />

      <RecordFormDialog
        fields={editFields}
        initialValues={editing ? {
          title: editing.title ?? editing.name,
          categoryId: editing.categoryId,
          brandId: editing.brandId ?? '',
          status: editing.status,
          modelNo: editing.modelNo ?? '',
          barcode: editing.barcode ?? '',
          weightGram: editing.weightGram ?? '',
        } : {}}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          if (!editing) {
            return Promise.resolve();
          }
          return resolved.updateProduct(editing.id, editing.version, {
            title: requireString(values, 'title'),
            categoryId: requireString(values, 'categoryId'),
            brandId: optionalString(values, 'brandId') ?? null,
            status: narrow(PRODUCT_STATUSES, values.status),
            modelNo: optionalString(values, 'modelNo') ?? null,
            barcode: optionalString(values, 'barcode') ?? null,
            weightGram: optionalString(values, 'weightGram') ?? null,
          }).then(() => undefined);
        }}
        open={editing !== null}
        title={t('admin.productCenter.products.editTitle', 'Edit product')}
      />
    </>
  );
}

export function SkuListPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const [editing, setEditing] = useState<Sku | null>(null);

  const filters = useMemo<FilterControl[]>(() => [
    {
      name: 'productId',
      label: t('admin.productCenter.skus.filter.product', 'Product id'),
      kind: 'text',
    },
    {
      name: 'status',
      label: t('admin.productCenter.skus.filter.status', 'Status'),
      kind: 'select',
      options: [
        { value: '', label: t('admin.productCenter.common.all', 'All') },
        ...PRODUCT_STATUSES.map((status) => ({
          value: status,
          label: t(`admin.productCenter.status.${status}`, status),
        })),
      ],
    },
  ], [t]);

  const load = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listSkus({
        page: query.page,
        pageSize: query.pageSize,
        productId: query.filters.productId || undefined,
        status: query.filters.status || undefined,
      }),
    [resolved],
  );

  const columns = useMemo<DataColumn<Sku>[]>(() => [
    {
      key: 'skuNo',
      header: t('admin.productCenter.skus.column.skuNo', 'SKU no.'),
      cell: (row) => <span className="font-mono text-xs">{row.skuNo}</span>,
    },
    {
      key: 'name',
      header: t('admin.productCenter.skus.column.name', 'SKU'),
      cell: (row) => <span className="font-medium">{row.title || row.name || row.skuNo}</span>,
    },
    {
      key: 'product',
      header: t('admin.productCenter.skus.column.product', 'Product'),
      cell: (row) => <span className="font-mono text-xs">{row.productId}</span>,
    },
    {
      key: 'price',
      header: t('admin.productCenter.skus.column.price', 'Sale price'),
      cell: (row) => formatMinorAmount(row.salePriceMinor, row.currencyCode, row.minorUnitExponent),
    },
    {
      key: 'inventory',
      header: t('admin.productCenter.skus.column.inventory', 'Inventory'),
      cell: (row) => t(`admin.productCenter.skus.tracking.${row.inventoryTracking}`, row.inventoryTracking),
    },
    {
      key: 'status',
      header: t('admin.productCenter.skus.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
    {
      key: 'updatedAt',
      header: t('admin.productCenter.skus.column.updatedAt', 'Updated'),
      cell: (row) => <span className="whitespace-nowrap text-xs">{formatTimestamp(row.updatedAt)}</span>,
    },
  ], [t]);

  const fulfillmentOptions = useMemo(
    () => SKU_FULFILLMENT_TYPES.map((type) => ({
      value: type,
      label: t(`admin.productCenter.products.type.${type}`, type),
    })),
    [t],
  );

  const createFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'productId', label: t('admin.productCenter.skus.field.productId', 'Product id'), kind: 'text', required: true },
    { name: 'skuNo', label: t('admin.productCenter.skus.field.skuNo', 'SKU no.'), kind: 'text', required: true },
    { name: 'name', label: t('admin.productCenter.skus.field.name', 'Name'), kind: 'text', required: true },
    { name: 'title', label: t('admin.productCenter.skus.field.title', 'Title'), kind: 'text', required: true },
    {
      name: 'salePriceMinor',
      label: t('admin.productCenter.skus.field.salePrice', 'Sale price (minor units)'),
      kind: 'number',
      required: true,
      help: t('admin.productCenter.skus.description', ''),
    },
    { name: 'currencyCode', label: t('admin.productCenter.skus.field.currencyCode', 'Currency'), kind: 'text', required: true, placeholder: 'CNY' },
    {
      name: 'fulfillmentType',
      label: t('admin.productCenter.skus.field.fulfillmentType', 'Fulfillment type'),
      kind: 'select',
      options: fulfillmentOptions,
    },
    {
      name: 'inventoryTracking',
      label: t('admin.productCenter.skus.field.inventoryTracking', 'Inventory tracking'),
      kind: 'select',
      options: INVENTORY_TRACKING.map((value) => ({
        value,
        label: t(`admin.productCenter.skus.tracking.${value}`, value),
      })),
    },
    {
      name: 'inventoryPolicy',
      label: t('admin.productCenter.skus.field.inventoryPolicy', 'Oversell policy'),
      kind: 'select',
      options: INVENTORY_POLICY.map((value) => ({
        value,
        label: t(`admin.productCenter.skus.policy.${value}`, value),
      })),
    },
    { name: 'barcode', label: t('admin.productCenter.skus.field.barcode', 'Barcode'), kind: 'text' },
  ], [fulfillmentOptions, t]);

  const editFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'name', label: t('admin.productCenter.skus.field.name', 'Name'), kind: 'text' },
    { name: 'title', label: t('admin.productCenter.skus.field.title', 'Title'), kind: 'text' },
    { name: 'salePriceMinor', label: t('admin.productCenter.skus.field.salePrice', 'Sale price (minor units)'), kind: 'number' },
    { name: 'listPriceMinor', label: t('admin.productCenter.skus.field.listPrice', 'List price (minor units)'), kind: 'number' },
    {
      name: 'status',
      label: t('admin.productCenter.skus.field.status', 'Status'),
      kind: 'select',
      options: PRODUCT_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
    {
      name: 'inventoryPolicy',
      label: t('admin.productCenter.skus.field.inventoryPolicy', 'Oversell policy'),
      kind: 'select',
      options: INVENTORY_POLICY.map((value) => ({
        value,
        label: t(`admin.productCenter.skus.policy.${value}`, value),
      })),
    },
    { name: 'barcode', label: t('admin.productCenter.skus.field.barcode', 'Barcode'), kind: 'text' },
  ], [t]);

  return (
    <>
      <ResourcePageFrame<Sku>
        columns={columns}
        create={{
          label: t('admin.productCenter.actions.create', 'Create'),
          title: t('admin.productCenter.skus.createTitle', 'Create SKU'),
          fields: createFields,
          onSubmit: (values) => resolved.createSku({
            productId: requireString(values, 'productId'),
            skuNo: requireString(values, 'skuNo'),
            name: requireString(values, 'name'),
            title: requireString(values, 'title'),
            salePriceMinor: requireString(values, 'salePriceMinor'),
            currencyCode: requireString(values, 'currencyCode') || 'CNY',
            fulfillmentType: narrow(SKU_FULFILLMENT_TYPES, values.fulfillmentType) ?? 'physical',
            inventoryTracking: narrow(INVENTORY_TRACKING, values.inventoryTracking) ?? 'quantity',
            inventoryPolicy: narrow(INVENTORY_POLICY, values.inventoryPolicy) ?? 'deny',
            ...(optionalString(values, 'barcode') ? { barcode: optionalString(values, 'barcode') } : {}),
          }).then(() => undefined),
        }}
        description={t('admin.productCenter.skus.description', '')}
        emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
        filters={filters}
        load={load}
        rowActions={(row) => (
          <Button onClick={() => setEditing(row)} variant="ghost">
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.actions.edit', 'Edit')}
          </Button>
        )}
        rowKey={(row) => row.id}
        title={t('admin.productCenter.skus.title', 'SKUs')}
      />

      <RecordFormDialog
        fields={editFields}
        initialValues={editing ? {
          name: editing.name ?? '',
          title: editing.title ?? '',
          salePriceMinor: editing.salePriceMinor,
          listPriceMinor: editing.listPriceMinor ?? '',
          status: editing.status,
          inventoryPolicy: editing.inventoryPolicy,
          barcode: editing.barcode ?? '',
        } : {}}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          if (!editing) {
            return Promise.resolve();
          }
          return resolved.updateSku(editing.id, editing.version, {
            ...(optionalString(values, 'name') ? { name: optionalString(values, 'name') } : {}),
            ...(optionalString(values, 'title') ? { title: optionalString(values, 'title') } : {}),
            ...(optionalString(values, 'salePriceMinor') ? { salePriceMinor: optionalString(values, 'salePriceMinor') } : {}),
            listPriceMinor: optionalString(values, 'listPriceMinor') ?? null,
            status: narrow(PRODUCT_STATUSES, values.status),
            inventoryPolicy: narrow(INVENTORY_POLICY, values.inventoryPolicy),
            barcode: optionalString(values, 'barcode') ?? null,
          }).then(() => undefined);
        }}
        open={editing !== null}
        title={t('admin.productCenter.skus.editTitle', 'Edit SKU')}
      />
    </>
  );
}

export function BrandListPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const [editing, setEditing] = useState<Brand | null>(null);

  const filters = useMemo<FilterControl[]>(() => [
    {
      name: 'status',
      label: t('admin.productCenter.brands.filter.status', 'Status'),
      kind: 'select',
      options: [
        { value: '', label: t('admin.productCenter.common.all', 'All') },
        ...(['active', 'inactive'] as const).map((status) => ({
          value: status,
          label: t(`admin.productCenter.status.${status}`, status),
        })),
      ],
    },
  ], [t]);

  const load = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listBrands({
        page: query.page,
        pageSize: query.pageSize,
        status: query.filters.status || undefined,
      }),
    [resolved],
  );

  const columns = useMemo<DataColumn<Brand>[]>(() => [
    {
      key: 'brandNo',
      header: t('admin.productCenter.brands.column.brandNo', 'Brand no.'),
      cell: (row) => <span className="font-mono text-xs">{row.brandNo}</span>,
    },
    {
      key: 'name',
      header: t('admin.productCenter.brands.column.name', 'Brand'),
      cell: (row) => (
        <div className="min-w-32">
          <div className="font-medium">{row.name}</div>
          {row.description ? (
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">{row.description}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'status',
      header: t('admin.productCenter.brands.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
    {
      key: 'sortOrder',
      header: t('admin.productCenter.brands.column.sortOrder', 'Sort order'),
      cell: (row) => row.sortOrder,
    },
  ], [t]);

  const formFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'brandNo', label: t('admin.productCenter.brands.field.brandNo', 'Brand no.'), kind: 'text', required: true },
    { name: 'name', label: t('admin.productCenter.brands.field.name', 'Name'), kind: 'text', required: true },
    { name: 'description', label: t('admin.productCenter.brands.field.description', 'Description'), kind: 'textarea' },
    { name: 'sortOrder', label: t('admin.productCenter.brands.field.sortOrder', 'Sort order'), kind: 'number' },
    {
      name: 'status',
      label: t('admin.productCenter.brands.field.status', 'Status'),
      kind: 'select',
      options: (['active', 'inactive'] as const).map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
  ], [t]);

  return (
    <>
      <ResourcePageFrame<Brand>
        columns={columns}
        create={{
          label: t('admin.productCenter.actions.create', 'Create'),
          title: t('admin.productCenter.brands.createTitle', 'Create brand'),
          fields: formFields,
          onSubmit: (values) => resolved.createBrand({
            brandNo: requireString(values, 'brandNo'),
            name: requireString(values, 'name'),
            ...(optionalString(values, 'description') ? { description: optionalString(values, 'description') } : {}),
            ...(optionalString(values, 'sortOrder') ? { sortOrder: optionalString(values, 'sortOrder') } : {}),
          }).then(() => undefined),
        }}
        description={t('admin.productCenter.brands.description', '')}
        emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
        filters={filters}
        load={load}
        rowActions={(row) => (
          <Button onClick={() => setEditing(row)} variant="ghost">
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.actions.edit', 'Edit')}
          </Button>
        )}
        rowKey={(row) => row.id}
        title={t('admin.productCenter.brands.title', 'Brands')}
      />

      <RecordFormDialog
        fields={formFields}
        initialValues={editing ? {
          brandNo: editing.brandNo,
          name: editing.name,
          description: editing.description ?? '',
          sortOrder: editing.sortOrder,
          status: editing.status,
        } : {}}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          if (!editing) {
            return Promise.resolve();
          }
          return resolved.updateBrand(editing.id, editing.version, {
            name: requireString(values, 'name'),
            description: optionalString(values, 'description') ?? null,
            sortOrder: optionalString(values, 'sortOrder'),
            status: narrow(['active', 'inactive'] as const, values.status),
          }).then(() => undefined);
        }}
        open={editing !== null}
        title={t('admin.productCenter.brands.editTitle', 'Edit brand')}
      />
    </>
  );
}
