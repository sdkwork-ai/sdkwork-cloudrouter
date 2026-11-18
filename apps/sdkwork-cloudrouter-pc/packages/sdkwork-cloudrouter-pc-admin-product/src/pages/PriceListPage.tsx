import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Coins, Pencil, Plus, Trash2 } from 'lucide-react';

import {
  Button,
  DataTable,
  Dialog,
  Notice,
  Pagination,
  StatusBadge,
  formatMinorAmount,
  type DataColumn,
  type FilterControl,
  type FormFieldSpec,
} from '../components/ui.tsx';
import { RecordFormDialog } from '../components/RecordFormDialog.tsx';
import { ResourcePageFrame, requireString, type ProductCenterPageProps } from './resourcePage.tsx';
import {
  describeProductCenterError,
  getProductCenterService,
  type PriceList,
  type PriceListItem,
  type ProductCenterService,
} from '../productCenterService.ts';

const PRICE_STATUSES = ['active', 'inactive'] as const;
const ITEMS_PAGE_SIZE = 50;
const SKU_OPTION_PAGE_SIZE = 200;
const SKU_OPTION_MAX_PAGES = 25;

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

interface PriceItemsDialogProps {
  list: PriceList;
  service: ProductCenterService;
  onClose: () => void;
}

/**
 * Price items of one price book.
 *
 * A price list is a market/segment-scoped override: the SKU's own sale price
 * stays the default, and an item here replaces it for the targeted segment with
 * its own minimum quantity.
 */
function PriceItemsDialog({ list, service, onClose }: PriceItemsDialogProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<PriceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; item: PriceListItem | null } | null>(null);
  const [deleting, setDeleting] = useState<PriceListItem | null>(null);
  const [skuOptions, setSkuOptions] = useState<readonly { value: string; label: string }[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(ITEMS_PAGE_SIZE);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    let active = true;
    // The catalog can hold thousands of SKUs; page through the bounded lookup
    // instead of silently offering only the first page in the picker.
    (async () => {
      const collected: { value: string; label: string }[] = [];
      let currentPage = 1;
      for (; currentPage <= SKU_OPTION_MAX_PAGES && active; currentPage += 1) {
        const result = await service.listSkus({ page: currentPage, pageSize: SKU_OPTION_PAGE_SIZE });
        collected.push(...result.items.map((sku) => ({
          value: sku.id,
          label: `${sku.skuNo} · ${sku.title ?? sku.name ?? sku.id}`,
        })));
        if (!result.pageInfo.hasNextPage) {
          break;
        }
      }
      if (active) {
        setSkuOptions(collected);
      }
    })().catch(() => {
      // A failed lookup keeps the free-text fallback so the dialog stays usable.
      if (active) {
        setSkuOptions([]);
      }
    });
    return () => {
      active = false;
    };
  }, [service]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    service.listPriceListItems({ listId: list.id, page, pageSize }).then(
      (result) => {
        if (!active) {
          return;
        }
        setItems(result.items);
        setTotalItems(result.pageInfo.totalItems ?? 0);
        setLoading(false);
        if (result.items.length === 0 && page > 1) {
          setPage(page - 1);
        }
      },
      (loadError: unknown) => {
        if (active) {
          setItems([]);
          setError(describeProductCenterError(loadError).message);
          setLoading(false);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [list.id, page, pageSize, reloadToken, service]);

  const reload = () => setReloadToken((token) => token + 1);

  const fields = useMemo<FormFieldSpec[]>(() => {
    const skuField: FormFieldSpec = form?.mode === 'edit'
      ? {
        name: 'skuId',
        label: t('admin.productCenter.priceLists.items.field.sku', 'SKU id'),
        kind: 'text',
        required: true,
        readOnly: true,
      }
      : skuOptions.length > 0
        ? {
          name: 'skuId',
          label: t('admin.productCenter.priceLists.items.field.sku', 'SKU'),
          kind: 'select',
          required: true,
          options: skuOptions,
        }
        : {
          name: 'skuId',
          label: t('admin.productCenter.priceLists.items.field.sku', 'SKU id'),
          kind: 'text',
          required: true,
          help: t('admin.productCenter.priceLists.items.field.skuHint', 'No SKU list was available; enter the SKU id.'),
        };
    return [
      skuField,
      {
        name: 'priceMinor',
        label: t('admin.productCenter.priceLists.items.field.price', 'Price (minor units)'),
        kind: 'number',
        required: true,
      },
      {
        name: 'minQuantity',
        label: t('admin.productCenter.priceLists.items.field.minQuantity', 'Min quantity'),
        kind: 'number',
      },
      {
        name: 'status',
        label: t('admin.productCenter.priceLists.items.field.status', 'Status'),
        kind: 'select',
        options: PRICE_STATUSES.map((status) => ({
          value: status,
          label: t(`admin.productCenter.status.${status}`, status),
        })),
      },
    ];
  }, [form?.mode, skuOptions, t]);

  const skuLabelById = useMemo(
    () => new Map(skuOptions.map((option) => [option.value, option.label])),
    [skuOptions],
  );

  const columns = useMemo<DataColumn<PriceListItem>[]>(() => [
    {
      key: 'sku',
      header: t('admin.productCenter.priceLists.items.column.sku', 'SKU'),
      cell: (row) => (
        <span className="text-xs" title={skuLabelById.get(row.skuId)}>
          {skuLabelById.get(row.skuId) ?? row.skuId}
        </span>
      ),
    },
    {
      key: 'price',
      header: t('admin.productCenter.priceLists.items.column.price', 'Price'),
      cell: (row) => formatMinorAmount(row.priceMinor, row.currencyCode, row.minorUnitExponent),
    },
    {
      key: 'minQuantity',
      header: t('admin.productCenter.priceLists.items.column.minQuantity', 'Min quantity'),
      cell: (row) => row.minQuantity,
    },
    {
      key: 'status',
      header: t('admin.productCenter.priceLists.items.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
    {
      key: 'actions',
      header: t('admin.productCenter.common.actions', 'Actions'),
      headerClassName: 'text-right',
      className: 'text-right',
      cell: (row) => (
        <span className="flex justify-end gap-1">
          <Button onClick={() => setForm({ mode: 'edit', item: row })} variant="ghost">
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.actions.edit', 'Edit')}
          </Button>
          <Button onClick={() => setDeleting(row)} variant="ghost">
            <Trash2 aria-hidden="true" className="h-3.5 w-3.5 text-rose-500" />
            {t('admin.productCenter.actions.delete', 'Delete')}
          </Button>
        </span>
      ),
    },
  ], [skuLabelById, t]);

  return (
    <Dialog
      footer={
        <Button onClick={onClose} variant="secondary">
          {t('admin.productCenter.actions.close', 'Close')}
        </Button>
      }
      onClose={onClose}
      open
      title={`${t('admin.productCenter.priceLists.itemsTitle', 'Price items')} · ${list.name}`}
      wide
    >
      <div className="flex flex-col gap-3">
        {notice ? <Notice onDismiss={() => setNotice(null)} tone="success">{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {list.currencyCode} · {list.marketCode ?? '—'} · {list.customerSegment ?? '—'}
          </p>
          <Button onClick={() => setForm({ mode: 'create', item: null })} variant="primary">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.priceLists.items.createTitle', 'Add price item')}
          </Button>
        </div>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('admin.productCenter.state.loading', 'Loading…')}
          </p>
        ) : (
          <>
            <DataTable
              columns={columns}
              emptyLabel={t('admin.productCenter.priceLists.items.empty', 'No price item yet')}
              rowKey={(row) => row.id}
              rows={items}
            />
            <Pagination
              hasNextPage={page * pageSize < totalItems}
              itemCount={items.length}
              labels={{
                next: t('admin.productCenter.actions.next', 'Next'),
                page: t('admin.productCenter.common.page', 'Page'),
                pageSize: t('admin.productCenter.common.pageSize', 'Rows'),
                previous: t('admin.productCenter.actions.previous', 'Previous'),
                showing: t('admin.productCenter.common.showing', 'Showing'),
                total: t('admin.productCenter.common.total', 'Total'),
              }}
              onNextPage={() => setPage(page + 1)}
              onPageSizeChange={(nextPageSize) => {
                setPageSize(nextPageSize);
                setPage(1);
              }}
              onPreviousPage={() => setPage(Math.max(1, page - 1))}
              page={page}
              pageSize={pageSize}
              totalItems={totalItems}
            />
          </>
        )}
      </div>

      <RecordFormDialog
        fields={fields}
        initialValues={form?.item ? {
          skuId: form.item.skuId,
          priceMinor: form.item.priceMinor,
          minQuantity: form.item.minQuantity,
          status: form.item.status,
        } : {}}
        onClose={() => setForm(null)}
        onSubmit={(values) => {
          const priceMinor = requireString(values, 'priceMinor');
          const minQuantity = optionalString(values, 'minQuantity');
          if (form?.mode === 'edit' && form.item) {
            return service.updatePriceListItem(form.item.id, form.item.version, {
              priceMinor,
              ...(minQuantity ? { minQuantity } : {}),
              status: narrow(PRICE_STATUSES, values.status),
            }).then(() => {
              setNotice(t('admin.productCenter.toast.saved', 'Saved'));
              reload();
            });
          }
          return service.createPriceListItem({
            listId: list.id,
            skuId: requireString(values, 'skuId'),
            priceMinor,
            ...(minQuantity ? { minQuantity } : {}),
          }).then(() => {
            setNotice(t('admin.productCenter.toast.created', 'Created'));
            reload();
          });
        }}
        open={form !== null}
        title={form?.mode === 'edit'
          ? t('admin.productCenter.priceLists.items.editTitle', 'Edit price item')
          : t('admin.productCenter.priceLists.items.createTitle', 'Add price item')}
      />

      <Dialog
        footer={
          <>
            <Button onClick={() => setDeleting(null)} variant="secondary">
              {t('admin.productCenter.actions.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => {
                if (!deleting) {
                  return;
                }
                service.deletePriceListItem(deleting.id, deleting.version).then(
                  () => {
                    setNotice(t('admin.productCenter.toast.deleted', 'Deleted'));
                    setDeleting(null);
                    reload();
                  },
                  (deleteError: unknown) => {
                    setError(describeProductCenterError(deleteError).message);
                    setDeleting(null);
                  },
                );
              }}
              variant="danger"
            >
              {t('admin.productCenter.actions.delete', 'Delete')}
            </Button>
          </>
        }
        onClose={() => setDeleting(null)}
        open={deleting !== null}
        title={t('admin.productCenter.actions.confirmDelete', 'Delete this record?')}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">{deleting?.skuId}</p>
      </Dialog>
    </Dialog>
  );
}

export function PriceListPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const [itemsList, setItemsList] = useState<PriceList | null>(null);
  const [editing, setEditing] = useState<{ row: PriceList; reload: () => void } | null>(null);

  const filters = useMemo<FilterControl[]>(() => [
    {
      name: 'status',
      label: t('admin.productCenter.priceLists.filter.status', 'Status'),
      kind: 'select',
      options: [
        { value: '', label: t('admin.productCenter.common.all', 'All') },
        ...PRICE_STATUSES.map((status) => ({
          value: status,
          label: t(`admin.productCenter.status.${status}`, status),
        })),
      ],
    },
    {
      name: 'currencyCode',
      label: t('admin.productCenter.priceLists.filter.currency', 'Currency'),
      kind: 'text',
    },
  ], [t]);

  const load = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listPriceLists({
        page: query.page,
        pageSize: query.pageSize,
        status: query.filters.status || undefined,
        currencyCode: query.filters.currencyCode || undefined,
      }),
    [resolved],
  );

  const columns = useMemo<DataColumn<PriceList>[]>(() => [
    {
      key: 'no',
      header: t('admin.productCenter.priceLists.column.no', 'Price list no.'),
      cell: (row) => <span className="font-mono text-xs">{row.priceListNo}</span>,
    },
    {
      key: 'name',
      header: t('admin.productCenter.priceLists.column.name', 'Name'),
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'currency',
      header: t('admin.productCenter.priceLists.column.currency', 'Currency'),
      cell: (row) => row.currencyCode,
    },
    {
      key: 'market',
      header: t('admin.productCenter.priceLists.column.market', 'Market'),
      cell: (row) => row.marketCode ?? '—',
    },
    {
      key: 'segment',
      header: t('admin.productCenter.priceLists.column.segment', 'Segment'),
      cell: (row) => row.customerSegment ?? '—',
    },
    {
      key: 'status',
      header: t('admin.productCenter.priceLists.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
  ], [t]);

  const createFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'priceListNo', label: t('admin.productCenter.priceLists.field.no', 'Price list no.'), kind: 'text', required: true },
    { name: 'name', label: t('admin.productCenter.priceLists.field.name', 'Name'), kind: 'text', required: true },
    { name: 'currencyCode', label: t('admin.productCenter.priceLists.field.currency', 'Currency'), kind: 'text', required: true, placeholder: 'CNY' },
    { name: 'marketCode', label: t('admin.productCenter.priceLists.field.market', 'Market code'), kind: 'text' },
    { name: 'customerSegment', label: t('admin.productCenter.priceLists.field.segment', 'Customer segment'), kind: 'text' },
  ], [t]);

  const editFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'name', label: t('admin.productCenter.priceLists.field.name', 'Name'), kind: 'text', required: true },
    { name: 'customerSegment', label: t('admin.productCenter.priceLists.field.segment', 'Customer segment'), kind: 'text' },
    {
      name: 'status',
      label: t('admin.productCenter.priceLists.field.status', 'Status'),
      kind: 'select',
      options: PRICE_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
  ], [t]);

  return (
    <>
      <ResourcePageFrame<PriceList>
        columns={columns}
        create={{
          label: t('admin.productCenter.actions.create', 'Create'),
          title: t('admin.productCenter.priceLists.createTitle', 'Create price list'),
          fields: createFields,
          onSubmit: (values) => resolved.createPriceList({
            priceListNo: requireString(values, 'priceListNo'),
            name: requireString(values, 'name'),
            currencyCode: requireString(values, 'currencyCode') || 'CNY',
            ...(optionalString(values, 'marketCode') ? { marketCode: optionalString(values, 'marketCode') } : {}),
            ...(optionalString(values, 'customerSegment')
              ? { customerSegment: optionalString(values, 'customerSegment') }
              : {}),
          }).then(() => undefined),
        }}
        description={t('admin.productCenter.priceLists.description', '')}
        emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
        filters={filters}
        load={load}
        rowActions={(row, context) => (
          <>
            <Button onClick={() => setItemsList(row)} variant="ghost">
              <Coins aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.priceLists.items', 'Items')}
            </Button>
            <Button onClick={() => setEditing({ row, reload: context.reload })} variant="ghost">
              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.edit', 'Edit')}
            </Button>
          </>
        )}
        rowKey={(row) => row.id}
        title={t('admin.productCenter.priceLists.title', 'Price Lists')}
      />

      {itemsList ? (
        <PriceItemsDialog list={itemsList} onClose={() => setItemsList(null)} service={resolved} />
      ) : null}

      <RecordFormDialog
        fields={editFields}
        initialValues={editing ? {
          name: editing.row.name,
          customerSegment: editing.row.customerSegment ?? '',
          status: editing.row.status,
        } : {}}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          if (!editing) {
            return Promise.resolve();
          }
          const target = editing;
          return resolved.updatePriceList(target.row.id, target.row.version, {
            name: requireString(values, 'name'),
            customerSegment: optionalString(values, 'customerSegment') ?? null,
            status: narrow(PRICE_STATUSES, values.status),
          }).then(() => target.reload());
        }}
        open={editing !== null}
        title={t('admin.productCenter.priceLists.editTitle', 'Edit price list')}
      />
    </>
  );
}
