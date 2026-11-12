import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';

import { BottomPagination } from '@sdkwork/cloudroutes-pc-commons/components/BottomPagination';
import { ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons/components/ConfirmDialog';

import { matchesQuery, type HardwarePage } from '../hardware.ts';
import type { HardwareFormOption, HardwareResourceDescriptor, HardwareResourceRow } from '../resources.ts';
import { describeHardwareError } from '../hardwareService.ts';
import {
  Drawer,
  EmptyBlock,
  ErrorBlock,
  Field,
  LinkButton,
  LoadingBlock,
  PageShell,
  PrimaryButton,
  SecondaryButton,
  SelectInput,
  TableCell,
  TableHeadCell,
  TableRow,
  TableShell,
  TextArea,
  TextInput,
  Toolbar,
  useHardwareToast,
} from './ui.tsx';

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

type FormValues = Record<string, string>;

export interface ResourceBrowserProps {
  descriptor: HardwareResourceDescriptor;
  /** Test seam / capability flag: hides mutating actions when the operator cannot write. */
  readOnly?: boolean;
}

function buildInitialValues(descriptor: HardwareResourceDescriptor): FormValues {
  const values: FormValues = {};
  for (const field of descriptor.fields) {
    values[field.key] = descriptor.initialFields?.[field.key] ?? (field.kind === 'select' ? field.options?.[0]?.value ?? '' : '');
  }
  return values;
}

function resolveFormValues(
  descriptor: HardwareResourceDescriptor,
  record: unknown,
): FormValues {
  const values = buildInitialValues(descriptor);
  const fromRecord = descriptor.formFromRecord?.(record) ?? {};
  for (const field of descriptor.fields) {
    const next = fromRecord[field.key];
    if (next !== undefined) {
      values[field.key] = next;
    }
  }
  return values;
}

export function ResourceBrowser({ descriptor, readOnly = false }: ResourceBrowserProps) {
  const { t } = useTranslation();
  const { notify } = useHardwareToast();

  const [rows, setRows] = useState<HardwareResourceRow[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ detail: string; key: string } | null>(null);
  const [query, setQuery] = useState('');

  const [editing, setEditing] = useState<HardwareResourceRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [dynamicOptions, setDynamicOptions] = useState<Record<string, readonly HardwareFormOption[]>>({});
  const [optionsLoading, setOptionsLoading] = useState(false);

  const [pendingDelete, setPendingDelete] = useState<HardwareResourceRow | null>(null);

  const load = useCallback(
    async (targetPage: number, targetPageSize: number) => {
      setLoading(true);
      setError(null);
      try {
        const result: HardwarePage<HardwareResourceRow> = await descriptor.list({
          page: targetPage,
          pageSize: targetPageSize,
        });
        setRows(result.items);
        setPage(result.page || targetPage);
        setHasMore(result.hasMore);
      } catch (cause) {
        const description = describeHardwareError(cause);
        setError({ detail: description.detail, key: description.key });
        setRows([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [descriptor],
  );

  useEffect(() => {
    void load(1, pageSize);
    // `pageSize` is intentionally part of the dependency set: changing it reloads from page 1.
  }, [load, pageSize]);

  const visibleRows = useMemo(() => {
    if (!query.trim()) {
      return rows;
    }
    return rows.filter((row) => matchesQuery(Object.values(row.cells), query));
  }, [query, rows]);

  const openCreate = useCallback(async () => {
    setEditing(null);
    setFormErrors({});
    const values = buildInitialValues(descriptor);
    setFormValues(values);
    setDrawerOpen(true);
    const loaders = descriptor.fields.filter((field) => field.loadOptions);
    if (loaders.length === 0) {
      return;
    }
    setOptionsLoading(true);
    try {
      const entries = await Promise.all(
        loaders.map(async (field) => {
          try {
            const options = await field.loadOptions?.();
            return [field.key, options ?? []] as const;
          } catch {
            return [field.key, []] as const;
          }
        }),
      );
      const next: Record<string, readonly HardwareFormOption[]> = {};
      for (const [key, options] of entries) {
        next[key] = options;
      }
      setDynamicOptions(next);
      setFormValues((current) => {
        const merged = { ...current };
        for (const field of loaders) {
          if (!merged[field.key]) {
            merged[field.key] = next[field.key]?.[0]?.value ?? '';
          }
        }
        return merged;
      });
    } finally {
      setOptionsLoading(false);
    }
  }, [descriptor]);

  const openEdit = useCallback(
    async (row: HardwareResourceRow) => {
      setEditing(row);
      setFormErrors({});
      setFormValues(resolveFormValues(descriptor, row.raw));
      setDrawerOpen(true);
      const loaders = descriptor.fields.filter((field) => field.loadOptions);
      if (loaders.length === 0) {
        return;
      }
      setOptionsLoading(true);
      try {
        const entries = await Promise.all(
          loaders.map(async (field) => {
            try {
              const options = await field.loadOptions?.();
              return [field.key, options ?? []] as const;
            } catch {
              return [field.key, []] as const;
            }
          }),
        );
        const next: Record<string, readonly HardwareFormOption[]> = {};
        for (const [key, options] of entries) {
          next[key] = options;
        }
        setDynamicOptions(next);
      } finally {
        setOptionsLoading(false);
      }
    },
    [descriptor],
  );

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditing(null);
    setFormErrors({});
  }, []);

  const submit = useCallback(async () => {
    const validation: Record<string, string> = {};
    for (const field of descriptor.fields) {
      if (field.required && !(formValues[field.key] ?? '').trim()) {
        validation[field.key] = t('admin.hardware.common.required');
      }
      if (field.kind === 'json' && (formValues[field.key] ?? '').trim()) {
        try {
          const parsed = JSON.parse(formValues[field.key] as string) as unknown;
          const shape = field.jsonShape;
          if (shape === 'array' && !Array.isArray(parsed)) {
            validation[field.key] = t('admin.hardware.common.invalidJsonArray');
          } else if (shape === 'object' && (Array.isArray(parsed) || parsed === null || typeof parsed !== 'object')) {
            validation[field.key] = t('admin.hardware.common.invalidJsonObject');
          } else if (shape === 'array' && Array.isArray(parsed)) {
            const malformed = parsed.some(
              (entry) => entry === null || typeof entry !== 'object' || Array.isArray(entry),
            );
            if (malformed) {
              validation[field.key] = t('admin.hardware.common.invalidJsonArrayEntries');
            }
          }
        } catch {
          validation[field.key] = t('admin.hardware.common.invalidJson');
        }
      }
    }
    if (Object.keys(validation).length > 0) {
      setFormErrors(validation);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await descriptor.update(editing.id, formValues);
        notify(t('admin.hardware.common.saved'));
      } else {
        await descriptor.create(formValues);
        notify(t('admin.hardware.common.created'));
      }
      closeDrawer();
      await load(editing ? page : 1, pageSize);
    } catch (cause) {
      const description = describeHardwareError(cause);
      setError({ detail: description.detail, key: description.key });
      closeDrawer();
    } finally {
      setBusy(false);
    }
  }, [closeDrawer, descriptor, editing, formValues, load, notify, page, pageSize, t]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await descriptor.remove(pendingDelete.id);
      notify(t('admin.hardware.common.deleted'));
      setPendingDelete(null);
      await load(page, pageSize);
    } catch (cause) {
      const description = describeHardwareError(cause);
      setError({ detail: description.detail, key: description.key });
      setPendingDelete(null);
    } finally {
      setBusy(false);
    }
  }, [descriptor, load, notify, page, pageSize, pendingDelete, t]);

  const errorTitle = error ? t(`admin.hardware.error.${error.key}`) : '';
  const formTitle = editing ? t(descriptor.formEditTitleKey) : t(descriptor.formCreateTitleKey);

  return (
    <PageShell
      title={t(descriptor.titleKey)}
      description={t(descriptor.descriptionKey)}
      actions={
        <>
          <SecondaryButton onClick={() => void load(page, pageSize)} disabled={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('admin.hardware.common.refresh')}
          </SecondaryButton>
          {readOnly ? null : (
            <PrimaryButton onClick={() => void openCreate()}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {t(descriptor.createLabelKey)}
            </PrimaryButton>
          )}
        </>
      }
    >
      <Toolbar>
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor={`${descriptor.id}-search`}>
            {t('admin.hardware.common.search')}
          </label>
          <TextInput
            id={`${descriptor.id}-search`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('admin.hardware.common.searchPlaceholder')}
            className="max-w-sm"
          />
        </div>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          {t('admin.hardware.common.rowCount', { count: visibleRows.length })}
        </span>
      </Toolbar>

      {error ? (
        <ErrorBlock
          title={errorTitle}
          description={error.detail || undefined}
          onRetry={() => void load(page, pageSize)}
          retryLabel={t('admin.hardware.common.retry')}
        />
      ) : (
        <TableShell
          footer={
            <BottomPagination
              page={page}
              pageSize={pageSize}
              itemCount={visibleRows.length}
              hasNextPage={hasMore}
              showingLabel={t('admin.hardware.common.showing')}
              pageLabel={t('admin.hardware.common.pageOf', { page })}
              pageSizeLabel={t('admin.hardware.common.pageSize')}
              previousLabel={t('admin.hardware.common.previousPage')}
              nextLabel={t('admin.hardware.common.nextPage')}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              disabled={loading || busy}
              onPreviousPage={() => void load(Math.max(1, page - 1), pageSize)}
              onNextPage={() => void load(page + 1, pageSize)}
              onPageSizeChange={(next) => {
                setPageSize(next);
                setPage(1);
              }}
            />
          }
        >
          {loading ? (
            <LoadingBlock label={t('admin.hardware.common.loading')} />
          ) : visibleRows.length === 0 ? (
            <EmptyBlock
              title={query.trim() ? t('admin.hardware.common.noMatches') : t(descriptor.emptyTitleKey)}
              description={query.trim() ? undefined : t(descriptor.emptyDescriptionKey)}
              action={
                readOnly || query.trim() ? undefined : (
                  <PrimaryButton className="mt-2" onClick={() => void openCreate()}>
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    {t(descriptor.createLabelKey)}
                  </PrimaryButton>
                )
              }
            />
          ) : (
            <table className="w-full min-w-max border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr>
                  {descriptor.columns.map((column) => (
                    <TableHeadCell key={column.key} className={column.className}>
                      {t(column.labelKey)}
                    </TableHeadCell>
                  ))}
                  <TableHeadCell className="text-right">{t('admin.hardware.common.actions')}</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <TableRow key={row.id}>
                    {descriptor.columns.map((column) => (
                      <TableCell
                        key={column.key}
                        className={
                          column.mono
                            ? 'font-mono text-[11px] text-slate-600 dark:text-slate-300'
                            : 'text-slate-700 dark:text-slate-200'
                        }
                      >
                        {row.cells[column.key] || <span className="text-slate-400">-</span>}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <LinkButton
                          onClick={() => void openEdit(row)}
                          disabled={busy}
                          aria-label={t('admin.hardware.common.edit')}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </LinkButton>
                        {readOnly ? null : (
                          <LinkButton
                            className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                            onClick={() => setPendingDelete(row)}
                            disabled={busy}
                            aria-label={t('admin.hardware.common.delete')}
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </LinkButton>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </table>
          )}
        </TableShell>
      )}

      {drawerOpen ? (
        <Drawer
          title={formTitle}
          subtitle={t('admin.hardware.common.drawerHint')}
          onClose={closeDrawer}
          closeLabel={t('admin.hardware.common.close')}
          footer={
            <>
              <SecondaryButton onClick={closeDrawer} disabled={busy}>
                {t('admin.hardware.common.cancel')}
              </SecondaryButton>
              <PrimaryButton onClick={() => void submit()} disabled={busy || optionsLoading}>
                {busy ? t('admin.hardware.common.saving') : t('admin.hardware.common.save')}
              </PrimaryButton>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            {descriptor.fields.map((field) => {
              const value = formValues[field.key] ?? '';
              const disabled = busy || (Boolean(editing) && field.readOnlyOnEdit === true) || optionsLoading;
              const options = field.options ?? dynamicOptions[field.key] ?? [];
              const fieldError = formErrors[field.key];
              const hint = field.hintKey ? t(field.hintKey) : undefined;
              return (
                <Field
                  key={field.key}
                  label={t(field.labelKey)}
                  required={field.required}
                  error={fieldError}
                  hint={hint}
                  htmlFor={`${descriptor.id}-${field.key}`}
                >
                  {field.kind === 'select' ? (
                    <SelectInput
                      id={`${descriptor.id}-${field.key}`}
                      value={value}
                      disabled={disabled}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    >
                      <option value="">{t('admin.hardware.common.selectPlaceholder')}</option>
                      {options.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectInput>
                  ) : field.kind === 'textarea' || field.kind === 'list' || field.kind === 'json' ? (
                    <TextArea
                      id={`${descriptor.id}-${field.key}`}
                      value={value}
                      disabled={disabled}
                      rows={field.kind === 'json' ? 8 : 4}
                      spellCheck={false}
                      placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  ) : (
                    <TextInput
                      id={`${descriptor.id}-${field.key}`}
                      value={value}
                      disabled={disabled}
                      placeholder={field.placeholderKey ? t(field.placeholderKey) : undefined}
                      onChange={(event) => setFormValues((current) => ({ ...current, [field.key]: event.target.value }))}
                    />
                  )}
                </Field>
              );
            })}
          </div>
        </Drawer>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={t(descriptor.deleteTitleKey)}
          description={t(descriptor.deleteDescriptionKey, { id: pendingDelete.id })}
          confirmLabel={t('admin.hardware.common.delete')}
          cancelLabel={t('admin.hardware.common.cancel')}
          tone="danger"
          isBusy={busy}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDelete()}
        />
      ) : null}
    </PageShell>
  );
}
