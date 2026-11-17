import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

import {
  Button,
  DataTable,
  Dialog,
  Notice,
  PageHeader,
  StatusBadge,
  type DataColumn,
  type FilterControl,
  type FormFieldSpec,
} from '../components/ui.tsx';
import { RecordFormDialog } from '../components/RecordFormDialog.tsx';
import { useCatalogLookups } from './catalogLookups.ts';
import {
  ResourceListPanel,
  requireString,
  useResourceList,
  type ProductCenterPageProps,
} from './resourcePage.tsx';
import {
  describeProductCenterError,
  getProductCenterService,
  type Attribute,
  type AttributeValue,
  type Category,
  type CategoryAttribute,
  type ProductCenterService,
} from '../productCenterService.ts';

const CATEGORY_STATUSES = ['active', 'inactive'] as const;
const ATTRIBUTE_ROLES = ['key', 'sales', 'parameter'] as const;
const ATTRIBUTE_VALUE_TYPES = ['enum', 'text', 'number', 'bool', 'date'] as const;
const ATTRIBUTE_INPUT_HINTS = ['select', 'multi_select', 'text', 'number', 'toggle', 'date'] as const;

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

export function CategoryListPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const lookups = useCatalogLookups(resolved);
  const [editing, setEditing] = useState<Category | null>(null);

  const filters = useMemo<FilterControl[]>(() => [
    {
      name: 'parentId',
      label: t('admin.productCenter.categories.filter.parent', 'Parent id'),
      kind: 'text',
    },
    {
      name: 'status',
      label: t('admin.productCenter.categories.filter.status', 'Status'),
      kind: 'select',
      options: [
        { value: '', label: t('admin.productCenter.common.all', 'All') },
        ...CATEGORY_STATUSES.map((status) => ({
          value: status,
          label: t(`admin.productCenter.status.${status}`, status),
        })),
      ],
    },
  ], [t]);

  const load = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listCategories({
        page: query.page,
        pageSize: query.pageSize,
        parentId: query.filters.parentId || undefined,
        status: query.filters.status || undefined,
      }),
    [resolved],
  );

  const state = useResourceList<Category>({ filters, load });
  const [createOpen, setCreateOpen] = useState(false);

  const columns = useMemo<DataColumn<Category>[]>(() => [
    {
      key: 'categoryNo',
      header: t('admin.productCenter.categories.column.categoryNo', 'Category no.'),
      cell: (row) => <span className="font-mono text-xs">{row.categoryNo}</span>,
    },
    {
      key: 'name',
      header: t('admin.productCenter.categories.column.name', 'Category'),
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'parent',
      header: t('admin.productCenter.categories.column.parent', 'Parent'),
      cell: (row) => (
        row.parentId
          ? lookups.categoryName(row.parentId) ?? row.parentId
          : t('admin.productCenter.categories.root', 'Root')
      ),
    },
    {
      key: 'depth',
      header: t('admin.productCenter.categories.column.depth', 'Depth'),
      cell: (row) => row.depth,
    },
    {
      key: 'status',
      header: t('admin.productCenter.categories.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
    {
      key: 'sortOrder',
      header: t('admin.productCenter.categories.column.sortOrder', 'Sort order'),
      cell: (row) => row.sortOrder,
    },
  ], [lookups, t]);

  const formFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'categoryNo', label: t('admin.productCenter.categories.field.categoryNo', 'Category no.'), kind: 'text', required: true },
    { name: 'name', label: t('admin.productCenter.categories.field.name', 'Name'), kind: 'text', required: true },
    {
      name: 'parentId',
      label: t('admin.productCenter.categories.field.parentId', 'Parent id'),
      kind: 'select',
      options: [
        { value: '', label: t('admin.productCenter.categories.root', 'Root') },
        ...lookups.categoryOptions,
      ],
    },
    { name: 'sortOrder', label: t('admin.productCenter.categories.field.sortOrder', 'Sort order'), kind: 'number' },
    {
      name: 'status',
      label: t('admin.productCenter.categories.field.status', 'Status'),
      kind: 'select',
      options: CATEGORY_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
  ], [lookups.categoryOptions, t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        actions={
          <>
            <Button onClick={state.reload} variant="secondary">
              <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.refresh', 'Refresh')}
            </Button>
            <Button onClick={() => setCreateOpen(true)} variant="primary">
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.create', 'Create')}
            </Button>
          </>
        }
        description={t('admin.productCenter.categories.description', '')}
        title={t('admin.productCenter.categories.title', 'Categories')}
      />
      {state.notice ? <Notice onDismiss={state.clearNotice} tone="success">{state.notice}</Notice> : null}
      {state.actionError ? <Notice onDismiss={state.clearActionError} tone="error">{state.actionError}</Notice> : null}

      <ResourceListPanel
        columns={columns}
        emptyLabel={t('admin.productCenter.state.empty', 'No records yet')}
        filters={filters}
        rowActions={(row) => (
          <Button onClick={() => setEditing(row)} variant="ghost">
            <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.actions.edit', 'Edit')}
          </Button>
        )}
        rowKey={(row) => row.id}
        state={state}
      />

      <RecordFormDialog
        fields={formFields}
        initialValues={{}}
        onClose={() => setCreateOpen(false)}
        onSubmit={(values) => resolved.createCategory({
          categoryNo: requireString(values, 'categoryNo'),
          name: requireString(values, 'name'),
          ...(optionalString(values, 'parentId') ? { parentId: optionalString(values, 'parentId') } : {}),
          ...(optionalString(values, 'sortOrder') ? { sortOrder: optionalString(values, 'sortOrder') } : {}),
        }).then(() => {
          state.reportSuccess(t('admin.productCenter.toast.created', 'Created'));
          state.reload();
        })}
        open={createOpen}
        title={t('admin.productCenter.categories.createTitle', 'Create category')}
      />

      <RecordFormDialog
        fields={formFields}
        initialValues={editing ? {
          categoryNo: editing.categoryNo,
          name: editing.name,
          parentId: editing.parentId ?? '',
          sortOrder: editing.sortOrder,
          status: editing.status,
        } : {}}
        onClose={() => setEditing(null)}
        onSubmit={(values) => {
          if (!editing) {
            return Promise.resolve();
          }
          return resolved.updateCategory(editing.id, editing.version, {
            name: requireString(values, 'name'),
            parentId: optionalString(values, 'parentId'),
            sortOrder: optionalString(values, 'sortOrder'),
            status: narrow(CATEGORY_STATUSES, values.status),
          }).then(() => {
            state.reportSuccess(t('admin.productCenter.toast.saved', 'Saved'));
            state.reload();
          });
        }}
        open={editing !== null}
        title={t('admin.productCenter.categories.editTitle', 'Edit category')}
      />
    </div>
  );
}

function useAttributeDictionary(
  service: ProductCenterService,
): readonly Attribute[] {
  const [attributes, setAttributes] = useState<Attribute[]>([]);
  useEffect(() => {
    let active = true;
    service.listAttributes({ page: 1, pageSize: 200 }).then(
      (result) => {
        if (active) {
          setAttributes(result.items);
        }
      },
      () => {
        if (active) {
          setAttributes([]);
        }
      },
    );
    return () => {
      active = false;
    };
  }, [service]);
  return attributes;
}

export function AttributeListPage({ service }: ProductCenterPageProps) {
  const { t } = useTranslation();
  const resolved = useMemo(() => service ?? getProductCenterService(), [service]);
  const lookups = useCatalogLookups(resolved);
  const attributes = useAttributeDictionary(resolved);
  const [creatingAttribute, setCreatingAttribute] = useState(false);
  const [editingAttribute, setEditingAttribute] = useState<Attribute | null>(null);
  const [creatingBinding, setCreatingBinding] = useState(false);
  const [editingBinding, setEditingBinding] = useState<CategoryAttribute | null>(null);
  const [deletingBinding, setDeletingBinding] = useState<CategoryAttribute | null>(null);
  const [managingValues, setManagingValues] = useState<Attribute | null>(null);

  const attributeOptions = useMemo(
    () => attributes.map((attribute) => ({ value: attribute.id, label: `${attribute.name} (${attribute.attributeNo})` })),
    [attributes],
  );

  const dictionaryFilters = useMemo<FilterControl[]>(() => [
    {
      name: 'status',
      label: t('admin.productCenter.attributes.filter.status', 'Status'),
      kind: 'select',
      options: [
        { value: '', label: t('admin.productCenter.common.all', 'All') },
        ...CATEGORY_STATUSES.map((status) => ({
          value: status,
          label: t(`admin.productCenter.status.${status}`, status),
        })),
      ],
    },
  ], [t]);

  const dictionaryLoad = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listAttributes({
        page: query.page,
        pageSize: query.pageSize,
        status: query.filters.status || undefined,
      }),
    [resolved],
  );

  const bindingFilters = useMemo<FilterControl[]>(() => [
    {
      name: 'categoryId',
      label: t('admin.productCenter.attributes.bindings.filter.category', 'Category id'),
      kind: 'text',
    },
    {
      name: 'attributeId',
      label: t('admin.productCenter.attributes.bindings.filter.attribute', 'Attribute id'),
      kind: 'text',
    },
  ], [t]);

  const bindingLoad = useCallback(
    (query: { page: number; pageSize: number; filters: Record<string, string> }) =>
      resolved.listCategoryAttributes({
        page: query.page,
        pageSize: query.pageSize,
        categoryId: query.filters.categoryId || undefined,
        attributeId: query.filters.attributeId || undefined,
      }),
    [resolved],
  );

  const dictionaryState = useResourceList<Attribute>({
    filters: dictionaryFilters,
    load: dictionaryLoad,
  });
  const bindingState = useResourceList<CategoryAttribute>({
    filters: bindingFilters,
    load: bindingLoad,
  });

  const attributeColumns = useMemo<DataColumn<Attribute>[]>(() => [
    {
      key: 'attributeNo',
      header: t('admin.productCenter.attributes.column.attributeNo', 'Attribute no.'),
      cell: (row) => <span className="font-mono text-xs">{row.attributeNo}</span>,
    },
    {
      key: 'name',
      header: t('admin.productCenter.attributes.column.name', 'Attribute'),
      cell: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: 'valueType',
      header: t('admin.productCenter.attributes.column.valueType', 'Value type'),
      cell: (row) => row.valueType,
    },
    {
      key: 'inputHint',
      header: t('admin.productCenter.attributes.column.inputHint', 'Input'),
      cell: (row) => row.inputHint,
    },
    {
      key: 'multi',
      header: t('admin.productCenter.attributes.column.multi', 'Multi value'),
      cell: (row) => (row.isMultiValue
        ? t('admin.productCenter.common.yes', 'Yes')
        : t('admin.productCenter.common.no', 'No')),
    },
    {
      key: 'status',
      header: t('admin.productCenter.attributes.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
  ], [t]);

  const bindingColumns = useMemo<DataColumn<CategoryAttribute>[]>(() => [
    {
      key: 'category',
      header: t('admin.productCenter.attributes.bindings.column.category', 'Category id'),
      cell: (row) => lookups.categoryName(row.categoryId) ?? row.categoryId,
    },
    {
      key: 'attribute',
      header: t('admin.productCenter.attributes.bindings.column.attribute', 'Attribute id'),
      cell: (row) => {
        const attribute = attributes.find((candidate) => candidate.id === row.attributeId);
        return attribute ? attribute.name : row.attributeId;
      },
    },
    {
      key: 'role',
      header: t('admin.productCenter.attributes.bindings.column.role', 'Role'),
      cell: (row) => t(`admin.productCenter.attributes.role.${row.attributeRole}`, row.attributeRole),
    },
    {
      key: 'required',
      header: t('admin.productCenter.attributes.bindings.column.required', 'Required'),
      cell: (row) => (row.required ? t('admin.productCenter.common.yes', 'Yes') : t('admin.productCenter.common.no', 'No')),
    },
    {
      key: 'searchable',
      header: t('admin.productCenter.attributes.bindings.column.searchable', 'Searchable'),
      cell: (row) => (row.searchable ? t('admin.productCenter.common.yes', 'Yes') : t('admin.productCenter.common.no', 'No')),
    },
    {
      key: 'filterable',
      header: t('admin.productCenter.attributes.bindings.column.filterable', 'Filterable'),
      cell: (row) => (row.filterable ? t('admin.productCenter.common.yes', 'Yes') : t('admin.productCenter.common.no', 'No')),
    },
    {
      key: 'status',
      header: t('admin.productCenter.attributes.bindings.column.status', 'Status'),
      cell: (row) => (
        <StatusBadge label={t(`admin.productCenter.status.${row.status}`, row.status)} value={row.status} />
      ),
    },
  ], [attributes, lookups, t]);

  const attributeFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'attributeNo', label: t('admin.productCenter.attributes.field.attributeNo', 'Attribute no.'), kind: 'text', required: true },
    { name: 'name', label: t('admin.productCenter.attributes.field.name', 'Name'), kind: 'text', required: true },
    {
      name: 'valueType',
      label: t('admin.productCenter.attributes.field.valueType', 'Value type'),
      kind: 'select',
      options: ATTRIBUTE_VALUE_TYPES.map((value) => ({ value, label: value })),
    },
    {
      name: 'inputHint',
      label: t('admin.productCenter.attributes.field.inputHint', 'Input control'),
      kind: 'select',
      options: ATTRIBUTE_INPUT_HINTS.map((value) => ({ value, label: value })),
    },
    {
      name: 'isMultiValue',
      label: t('admin.productCenter.attributes.field.isMultiValue', 'Allow multiple values'),
      kind: 'checkbox',
    },
    { name: 'unitSymbol', label: t('admin.productCenter.attributes.field.unitSymbol', 'Unit symbol'), kind: 'text' },
    {
      name: 'values',
      label: t('admin.productCenter.attributes.field.values', 'Enum values (comma separated)'),
      kind: 'text',
      help: t('admin.productCenter.attributes.description', ''),
    },
    {
      name: 'status',
      label: t('admin.productCenter.attributes.field.status', 'Status'),
      kind: 'select',
      options: CATEGORY_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
  ], [t]);

  const attributeEditFields = useMemo<FormFieldSpec[]>(() => [
    { name: 'name', label: t('admin.productCenter.attributes.field.name', 'Name'), kind: 'text', required: true },
    { name: 'unitSymbol', label: t('admin.productCenter.attributes.field.unitSymbol', 'Unit symbol'), kind: 'text' },
    {
      name: 'status',
      label: t('admin.productCenter.attributes.field.status', 'Status'),
      kind: 'select',
      options: CATEGORY_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
  ], [t]);

  const bindingFields = useMemo<FormFieldSpec[]>(() => [
    {
      name: 'categoryId',
      label: t('admin.productCenter.attributes.bindings.field.categoryId', 'Category id'),
      kind: 'select',
      required: true,
      options: lookups.categoryOptions,
    },
    {
      name: 'attributeId',
      label: t('admin.productCenter.attributes.bindings.field.attributeId', 'Attribute id'),
      kind: 'select',
      required: true,
      options: attributeOptions,
    },
    {
      name: 'role',
      label: t('admin.productCenter.attributes.bindings.field.role', 'Role'),
      kind: 'select',
      options: ATTRIBUTE_ROLES.map((role) => ({
        value: role,
        label: t(`admin.productCenter.attributes.role.${role}`, role),
      })),
    },
    { name: 'required', label: t('admin.productCenter.attributes.bindings.field.required', 'Required'), kind: 'checkbox' },
    { name: 'searchable', label: t('admin.productCenter.attributes.bindings.field.searchable', 'Searchable'), kind: 'checkbox' },
    { name: 'filterable', label: t('admin.productCenter.attributes.bindings.field.filterable', 'Filterable'), kind: 'checkbox' },
    { name: 'comparable', label: t('admin.productCenter.attributes.bindings.field.comparable', 'Comparable'), kind: 'checkbox' },
    {
      name: 'status',
      label: t('admin.productCenter.attributes.bindings.column.status', 'Status'),
      kind: 'select',
      options: CATEGORY_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
  ], [attributeOptions, lookups.categoryOptions, t]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <PageHeader
        actions={
          <Button
            onClick={() => {
              dictionaryState.reload();
              bindingState.reload();
            }}
            variant="secondary"
          >
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.actions.refresh', 'Refresh')}
          </Button>
        }
        description={t('admin.productCenter.attributes.description', '')}
        title={t('admin.productCenter.attributes.title', 'Category Attributes')}
      />
      {dictionaryState.notice ?? bindingState.notice ? (
        <Notice
          onDismiss={() => {
            dictionaryState.clearNotice();
            bindingState.clearNotice();
          }}
          tone="success"
        >
          {dictionaryState.notice ?? bindingState.notice}
        </Notice>
      ) : null}
      {dictionaryState.actionError ?? bindingState.actionError ? (
        <Notice
          onDismiss={() => {
            dictionaryState.clearActionError();
            bindingState.clearActionError();
          }}
          tone="error"
        >
          {dictionaryState.actionError ?? bindingState.actionError}
        </Notice>
      ) : null}

      <ResourceListPanel
        columns={attributeColumns}
        emptyLabel={t('admin.productCenter.attributes.empty', 'No attributes yet')}
        filters={dictionaryFilters}
        panelActions={
          <Button onClick={() => setCreatingAttribute(true)} variant="primary">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.actions.create', 'Create')}
          </Button>
        }
        panelTitle={t('admin.productCenter.attributes.dictionaryTitle', 'Attribute dictionary')}
        rowActions={(row) => (
          <>
            <Button onClick={() => setEditingAttribute(row)} variant="ghost">
              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.edit', 'Edit')}
            </Button>
            {row.valueType === 'enum' ? (
              <Button onClick={() => setManagingValues(row)} variant="ghost">
                {t('admin.productCenter.attributes.values.action', 'Enum values')}
              </Button>
            ) : null}
          </>
        )}
        rowKey={(row) => row.id}
        state={dictionaryState}
      />

      <ResourceListPanel
        columns={bindingColumns}
        emptyLabel={t('admin.productCenter.attributes.bindings.empty', 'No category binding yet')}
        filters={bindingFilters}
        panelActions={
          <Button onClick={() => setCreatingBinding(true)} variant="primary">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.attributes.bindings.createTitle', 'Bind attribute to category')}
          </Button>
        }
        panelTitle={t('admin.productCenter.attributes.bindingsTitle', 'Category bindings')}
        rowActions={(row) => (
          <>
            <Button onClick={() => setEditingBinding(row)} variant="ghost">
              <Pencil aria-hidden="true" className="h-3.5 w-3.5" />
              {t('admin.productCenter.actions.edit', 'Edit')}
            </Button>
            <Button onClick={() => setDeletingBinding(row)} variant="ghost">
              <Trash2 aria-hidden="true" className="h-3.5 w-3.5 text-rose-500" />
              {t('admin.productCenter.actions.delete', 'Delete')}
            </Button>
          </>
        )}
        rowKey={(row) => row.id}
        state={bindingState}
      />

      <RecordFormDialog
        fields={attributeFields}
        initialValues={{}}
        onClose={() => setCreatingAttribute(false)}
        onSubmit={(values) => {
          const enumValues = optionalString(values, 'values');
          return resolved.createAttribute({
            attributeNo: requireString(values, 'attributeNo'),
            name: requireString(values, 'name'),
            valueType: narrow(ATTRIBUTE_VALUE_TYPES, values.valueType) ?? 'text',
            inputHint: narrow(ATTRIBUTE_INPUT_HINTS, values.inputHint) ?? 'text',
            isMultiValue: values.isMultiValue === true,
            ...(optionalString(values, 'unitSymbol') ? { unitSymbol: optionalString(values, 'unitSymbol') } : {}),
            ...(enumValues ? { values: enumValues.split(',').map((entry) => entry.trim()).filter(Boolean) } : {}),
          }).then(() => {
            dictionaryState.reportSuccess(t('admin.productCenter.toast.created', 'Created'));
            dictionaryState.reload();
          });
        }}
        open={creatingAttribute}
        title={t('admin.productCenter.attributes.createTitle', 'Create attribute')}
      />

      <RecordFormDialog
        fields={attributeEditFields}
        initialValues={editingAttribute ? {
          name: editingAttribute.name,
          unitSymbol: editingAttribute.unitSymbol ?? '',
          status: editingAttribute.status,
        } : {}}
        onClose={() => setEditingAttribute(null)}
        onSubmit={(values) => {
          if (!editingAttribute) {
            return Promise.resolve();
          }
          return resolved.updateAttribute(editingAttribute.id, editingAttribute.version, {
            name: requireString(values, 'name'),
            unitSymbol: optionalString(values, 'unitSymbol') ?? null,
            status: narrow(CATEGORY_STATUSES, values.status),
          }).then(() => {
            dictionaryState.reportSuccess(t('admin.productCenter.toast.saved', 'Saved'));
            dictionaryState.reload();
          });
        }}
        open={editingAttribute !== null}
        title={t('admin.productCenter.attributes.editTitle', 'Edit attribute')}
      />

      <RecordFormDialog
        fields={bindingFields}
        initialValues={{}}
        onClose={() => setCreatingBinding(false)}
        onSubmit={(values) => resolved.createCategoryAttribute({
          categoryId: requireString(values, 'categoryId'),
          attributeId: requireString(values, 'attributeId'),
          role: narrow(ATTRIBUTE_ROLES, values.role) ?? 'key',
          required: values.required === true,
          searchable: values.searchable === true,
          filterable: values.filterable === true,
          comparable: values.comparable === true,
        }).then(() => {
          bindingState.reportSuccess(t('admin.productCenter.toast.created', 'Created'));
          bindingState.reload();
        })}
        open={creatingBinding}
        title={t('admin.productCenter.attributes.bindings.createTitle', 'Bind attribute to category')}
      />

      <RecordFormDialog
        fields={bindingFields.filter((field) => field.name !== 'categoryId' && field.name !== 'attributeId')}
        initialValues={editingBinding ? {
          role: editingBinding.attributeRole,
          required: editingBinding.required,
          searchable: editingBinding.searchable,
          filterable: editingBinding.filterable,
          comparable: editingBinding.comparable,
          status: editingBinding.status,
        } : {}}
        onClose={() => setEditingBinding(null)}
        onSubmit={(values) => {
          if (!editingBinding) {
            return Promise.resolve();
          }
          return resolved.updateCategoryAttribute(editingBinding.id, editingBinding.version, {
            role: narrow(ATTRIBUTE_ROLES, values.role),
            required: values.required === true,
            searchable: values.searchable === true,
            filterable: values.filterable === true,
            comparable: values.comparable === true,
            status: narrow(CATEGORY_STATUSES, values.status),
          }).then(() => {
            bindingState.reportSuccess(t('admin.productCenter.toast.saved', 'Saved'));
            bindingState.reload();
          });
        }}
        open={editingBinding !== null}
        title={t('admin.productCenter.attributes.bindings.editTitle', 'Edit category binding')}
      />

      <Dialog
        footer={
          <>
            <Button onClick={() => setDeletingBinding(null)} variant="secondary">
              {t('admin.productCenter.actions.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={() => {
                if (!deletingBinding) {
                  return;
                }
                resolved.deleteCategoryAttribute(deletingBinding.id, deletingBinding.version).then(
                  () => {
                    bindingState.reportSuccess(t('admin.productCenter.toast.deleted', 'Deleted'));
                    setDeletingBinding(null);
                    bindingState.reload();
                  },
                  (deleteError: unknown) => {
                    bindingState.reportError(deleteError);
                    setDeletingBinding(null);
                  },
                );
              }}
              variant="danger"
            >
              {t('admin.productCenter.actions.delete', 'Delete')}
            </Button>
          </>
        }
        onClose={() => setDeletingBinding(null)}
        open={deletingBinding !== null}
        title={t('admin.productCenter.actions.confirmDelete', 'Delete this record?')}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {deletingBinding?.id}
        </p>
      </Dialog>

      {managingValues ? (
        <AttributeValuesDialog
          attribute={managingValues}
          onClose={() => setManagingValues(null)}
          service={resolved}
        />
      ) : null}
    </div>
  );
}

interface AttributeValuesDialogProps {
  attribute: Attribute;
  service: ProductCenterService;
  onClose: () => void;
}

const ATTRIBUTE_VALUE_STATUSES = ['active', 'inactive'] as const;

/**
 * Enum value registry for one attribute.
 *
 * The attribute row owns the value set that SKU variants are built from, so the
 * dialog reads it through `catalog.attributeValues` and never keeps a local
 * cache that could drift from the backend.
 */
function AttributeValuesDialog({ attribute, service, onClose }: AttributeValuesDialogProps) {
  const { t } = useTranslation();
  const [items, setItems] = useState<AttributeValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState<{ mode: 'create' | 'edit'; value: AttributeValue | null } | null>(null);
  const [deleting, setDeleting] = useState<AttributeValue | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    service.listAttributeValues({ attributeId: attribute.id, page: 1, pageSize: 100 }).then(
      (page) => {
        if (active) {
          setItems(page.items);
          setLoading(false);
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
  }, [attribute.id, reloadToken, service]);

  const fields = useMemo<FormFieldSpec[]>(() => [
    {
      name: 'valueCode',
      label: t('admin.productCenter.attributes.values.field.code', 'Code'),
      kind: 'text',
      required: true,
    },
    {
      name: 'displayValue',
      label: t('admin.productCenter.attributes.values.field.display', 'Display value'),
      kind: 'text',
      required: true,
    },
    {
      name: 'colorHex',
      label: t('admin.productCenter.attributes.values.field.color', 'Colour hex'),
      kind: 'text',
      placeholder: '#RRGGBB',
    },
    {
      name: 'sortOrder',
      label: t('admin.productCenter.attributes.values.field.sort', 'Sort order'),
      kind: 'number',
    },
    {
      name: 'status',
      label: t('admin.productCenter.attributes.values.field.status', 'Status'),
      kind: 'select',
      options: ATTRIBUTE_VALUE_STATUSES.map((status) => ({
        value: status,
        label: t(`admin.productCenter.status.${status}`, status),
      })),
    },
  ], [t]);

  const columns = useMemo<DataColumn<AttributeValue>[]>(() => [
    {
      key: 'code',
      header: t('admin.productCenter.attributes.values.column.code', 'Code'),
      cell: (row) => <span className="font-mono text-xs">{row.valueCode}</span>,
    },
    {
      key: 'display',
      header: t('admin.productCenter.attributes.values.column.display', 'Display value'),
      cell: (row) => (
        <span className="inline-flex items-center gap-1.5 font-medium">
          {row.colorHex ? (
            <span
              aria-hidden="true"
              className="inline-block h-3 w-3 rounded-full border border-slate-300"
              style={{ backgroundColor: row.colorHex }}
            />
          ) : null}
          {row.displayValue}
        </span>
      ),
    },
    {
      key: 'sort',
      header: t('admin.productCenter.attributes.values.column.sort', 'Sort'),
      cell: (row) => row.sortOrder,
    },
    {
      key: 'status',
      header: t('admin.productCenter.attributes.values.column.status', 'Status'),
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
          <Button onClick={() => setForm({ mode: 'edit', value: row })} variant="ghost">
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
  ], [t]);

  const reload = () => setReloadToken((token) => token + 1);

  return (
    <Dialog
      footer={
        <Button onClick={onClose} variant="secondary">
          {t('admin.productCenter.actions.close', 'Close')}
        </Button>
      }
      onClose={onClose}
      open
      title={`${t('admin.productCenter.attributes.valuesTitle', 'Enum values')} · ${attribute.name}`}
      wide
    >
      <div className="flex flex-col gap-3">
        {notice ? <Notice onDismiss={() => setNotice(null)} tone="success">{notice}</Notice> : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('admin.productCenter.attributes.values.hint', 'Only enum attributes carry a value list.')}
          </p>
          <Button onClick={() => setForm({ mode: 'create', value: null })} variant="primary">
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            {t('admin.productCenter.attributes.values.createTitle', 'Add enum value')}
          </Button>
        </div>
        {loading ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
            {t('admin.productCenter.state.loading', 'Loading…')}
          </p>
        ) : (
          <DataTable
            columns={columns}
            emptyLabel={t('admin.productCenter.attributes.values.empty', 'No enum value yet')}
            rowKey={(row) => row.id}
            rows={items}
          />
        )}
      </div>

      <RecordFormDialog
        fields={fields}
        initialValues={form?.value ? {
          valueCode: form.value.valueCode,
          displayValue: form.value.displayValue,
          colorHex: form.value.colorHex ?? '',
          sortOrder: form.value.sortOrder,
          status: form.value.status,
        } : {}}
        onClose={() => setForm(null)}
        onSubmit={(values) => {
          const valueCode = requireString(values, 'valueCode');
          const displayValue = requireString(values, 'displayValue');
          const colorHex = optionalString(values, 'colorHex');
          const sortOrder = optionalString(values, 'sortOrder');
          if (form?.mode === 'edit' && form.value) {
            return service.updateAttributeValue(form.value.id, form.value.version, {
              displayValue,
              ...(colorHex ? { colorHex } : {}),
              ...(sortOrder ? { sortOrder } : {}),
              status: narrow(ATTRIBUTE_VALUE_STATUSES, values.status),
            }).then(() => {
              setNotice(t('admin.productCenter.toast.saved', 'Saved'));
              reload();
            });
          }
          return service.createAttributeValue({
            attributeId: attribute.id,
            valueCode,
            displayValue,
            ...(colorHex ? { colorHex } : {}),
            ...(sortOrder ? { sortOrder } : {}),
          }).then(() => {
            setNotice(t('admin.productCenter.toast.created', 'Created'));
            reload();
          });
        }}
        open={form !== null}
        title={form?.mode === 'edit'
          ? t('admin.productCenter.attributes.values.editTitle', 'Edit enum value')
          : t('admin.productCenter.attributes.values.createTitle', 'Add enum value')}
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
                service.deleteAttributeValue(deleting.id, deleting.version).then(
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
        <p className="text-sm text-slate-600 dark:text-slate-300">{deleting?.displayValue}</p>
      </Dialog>
    </Dialog>
  );
}
