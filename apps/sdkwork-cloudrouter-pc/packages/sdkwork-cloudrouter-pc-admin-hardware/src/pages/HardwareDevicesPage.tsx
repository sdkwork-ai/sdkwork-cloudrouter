import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

import { BottomPagination } from '@sdkwork/cloudroutes-pc-commons/components/BottomPagination';
import { ConfirmDialog } from '@sdkwork/cloudroutes-pc-commons/components/ConfirmDialog';

import {
  countHealth,
  formatTimestamp,
  matchesQuery,
  type HardwareDevice,
  type HardwareHealth,
  type HardwareProduct,
} from '../hardware.ts';
import { describeHardwareError, getHardwareService, type HardwareService } from '../hardwareService.ts';
import type { HardwarePageProps } from './HardwareResourcePages.tsx';
import {
  Badge,
  Drawer,
  EmptyBlock,
  ErrorBlock,
  Field,
  HardwareToastProvider,
  KpiCard,
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
  TextInput,
  Toolbar,
  useHardwareToast,
  type BadgeTone,
} from '../components/ui.tsx';

const PAGE_SIZE = 50;

const HEALTH_TONE: Record<HardwareHealth, BadgeTone> = {
  critical: 'danger',
  healthy: 'success',
  offline: 'neutral',
  warning: 'warning',
};

const DEVICE_STATUS_OPTIONS = ['online', 'offline', 'disabled', 'maintenance'] as const;

interface DeviceFormState {
  chipFamily: string;
  clientId: string;
  deviceId: string;
  displayName: string;
  productId: string;
  status: string;
}

function emptyForm(): DeviceFormState {
  return { chipFamily: '', clientId: '', deviceId: '', displayName: '', productId: '', status: 'online' };
}

function HardwareDevicesBody({ service }: { service: HardwareService }) {
  const { t } = useTranslation();
  const { notify } = useHardwareToast();

  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [products, setProducts] = useState<HardwareProduct[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ detail: string; key: string } | null>(null);

  const [query, setQuery] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<HardwareDevice | null>(null);
  const [form, setForm] = useState<DeviceFormState>(emptyForm());
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HardwareDevice | null>(null);

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const [devicePage, productPage] = await Promise.all([
          service.listDevices({ page: targetPage, pageSize: PAGE_SIZE }),
          service.listProducts({ page: 1, pageSize: 100 }).catch(() => ({ items: [], page: 1, pageSize: 0, hasMore: false })),
        ]);
        setDevices(devicePage.items);
        setHasMore(devicePage.hasMore);
        setPage(devicePage.page || targetPage);
        setProducts(productPage.items);
      } catch (cause) {
        const description = describeHardwareError(cause);
        setError({ detail: description.detail, key: description.key });
        setDevices([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    [service],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const visible = useMemo(
    () =>
      devices.filter(
        (device) =>
          (!productFilter || device.productId === productFilter)
          && (!healthFilter || device.health === healthFilter)
          && matchesQuery([device.deviceId, device.displayName, device.productId, device.chipFamily], query),
      ),
    [devices, healthFilter, productFilter, query],
  );

  const health = useMemo(() => countHealth(devices), [devices]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormError(null);
    setForm({ ...emptyForm(), productId: products[0]?.productId ?? '' });
    setDrawerOpen(true);
  }, [products]);

  const openEdit = useCallback((device: HardwareDevice) => {
    setEditing(device);
    setFormError(null);
    setForm({
      chipFamily: device.chipFamily,
      clientId: device.clientId,
      deviceId: device.deviceId,
      displayName: device.displayName,
      productId: device.productId,
      status: device.status || 'online',
    });
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setEditing(null);
    setFormError(null);
  }, []);

  const submit = useCallback(async () => {
    if (!form.displayName.trim()) {
      setFormError(t('admin.hardware.common.required'));
      return;
    }
    if (!editing && !form.deviceId.trim()) {
      setFormError(t('admin.hardware.common.required'));
      return;
    }
    if (!editing && !form.productId.trim()) {
      setFormError(t('admin.hardware.devices.productRequired'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (editing) {
        await service.updateDevice(editing.deviceId, {
          displayName: form.displayName.trim(),
          ...(form.status ? { status: form.status } : {}),
        });
        notify(t('admin.hardware.common.saved'));
      } else {
        await service.createDevice({
          deviceId: form.deviceId.trim(),
          displayName: form.displayName.trim(),
          productId: form.productId.trim(),
          ...(form.clientId.trim() ? { clientId: form.clientId.trim() } : {}),
          ...(form.chipFamily.trim() ? { chipFamily: form.chipFamily.trim() } : {}),
        });
        notify(t('admin.hardware.common.created'));
      }
      closeDrawer();
      await load(editing ? page : 1);
    } catch (cause) {
      const description = describeHardwareError(cause);
      setError({ detail: description.detail, key: description.key });
      closeDrawer();
    } finally {
      setBusy(false);
    }
  }, [closeDrawer, editing, form, load, notify, page, service, t]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) {
      return;
    }
    setBusy(true);
    try {
      await service.deleteDevice(pendingDelete.deviceId);
      notify(t('admin.hardware.common.deleted'));
      setPendingDelete(null);
      await load(page);
    } catch (cause) {
      const description = describeHardwareError(cause);
      setError({ detail: description.detail, key: description.key });
      setPendingDelete(null);
    } finally {
      setBusy(false);
    }
  }, [load, notify, page, pendingDelete, service, t]);

  return (
    <PageShell
      title={t('admin.hardware.devices.title')}
      description={t('admin.hardware.devices.description')}
      actions={
        <>
          <SecondaryButton onClick={() => void load(page)} disabled={loading}>
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            {t('admin.hardware.common.refresh')}
          </SecondaryButton>
          <PrimaryButton onClick={openCreate}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('admin.hardware.devices.create')}
          </PrimaryButton>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard label={t('admin.hardware.devices.kpi.onPage')} value={String(devices.length)} />
        <KpiCard label={t('admin.hardware.overview.kpi.healthy')} value={String(health.healthy)} tone="success" />
        <KpiCard label={t('admin.hardware.health.warning')} value={String(health.warning)} tone="warning" />
        <KpiCard
          label={t('admin.hardware.health.critical')}
          value={String(health.critical + health.offline)}
          tone={health.critical > 0 ? 'danger' : 'neutral'}
        />
      </div>

      <Toolbar>
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.hardware.devices.searchPlaceholder')}
          className="max-w-xs"
        />
        <SelectInput
          value={productFilter}
          onChange={(event) => setProductFilter(event.target.value)}
          className="max-w-xs"
        >
          <option value="">{t('admin.hardware.devices.allProducts')}</option>
          {products.map((product) => (
            <option key={product.productId} value={product.productId}>
              {product.displayName}
            </option>
          ))}
        </SelectInput>
        <SelectInput
          value={healthFilter}
          onChange={(event) => setHealthFilter(event.target.value)}
          className="max-w-[10rem]"
        >
          <option value="">{t('admin.hardware.devices.allHealth')}</option>
          {(['healthy', 'warning', 'critical', 'offline'] as const).map((value) => (
            <option key={value} value={value}>
              {t(`admin.hardware.health.${value}`)}
            </option>
          ))}
        </SelectInput>
        <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
          {t('admin.hardware.common.rowCount', { count: visible.length })}
        </span>
      </Toolbar>

      {error ? (
        <ErrorBlock
          title={t(`admin.hardware.error.${error.key}`)}
          description={error.detail || undefined}
          onRetry={() => void load(page)}
          retryLabel={t('admin.hardware.common.retry')}
        />
      ) : (
        <TableShell
          footer={
            <BottomPagination
              page={page}
              pageSize={PAGE_SIZE}
              itemCount={devices.length}
              hasNextPage={hasMore}
              showingLabel={t('admin.hardware.common.showing')}
              pageLabel={t('admin.hardware.common.pageOf', { page })}
              pageSizeLabel={t('admin.hardware.common.pageSize')}
              previousLabel={t('admin.hardware.common.previousPage')}
              nextLabel={t('admin.hardware.common.nextPage')}
              pageSizeOptions={[PAGE_SIZE]}
              disabled={loading || busy}
              onPreviousPage={() => void load(Math.max(1, page - 1))}
              onNextPage={() => void load(page + 1)}
              onPageSizeChange={() => undefined}
            />
          }
        >
          {loading ? (
            <LoadingBlock label={t('admin.hardware.common.loading')} />
          ) : visible.length === 0 ? (
            <EmptyBlock
              title={t('admin.hardware.devices.empty')}
              description={t('admin.hardware.devices.emptyHint')}
              action={
                <PrimaryButton className="mt-2" onClick={openCreate}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  {t('admin.hardware.devices.create')}
                </PrimaryButton>
              }
            />
          ) : (
            <table className="w-full min-w-max border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr>
                  <TableHeadCell>{t('admin.hardware.devices.column.displayName')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.devices.column.deviceId')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.devices.column.product')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.devices.column.chipFamily')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.common.status')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.devices.column.lastSeenAt')}</TableHeadCell>
                  <TableHeadCell className="text-right">{t('admin.hardware.common.actions')}</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {visible.map((device) => (
                  <TableRow key={device.deviceId}>
                    <TableCell className="font-semibold text-slate-800 dark:text-slate-100">
                      <Link
                        to={`/admin/hardware/devices/${encodeURIComponent(device.deviceId)}`}
                        className="inline-flex items-center gap-1 hover:text-lobster-700 dark:hover:text-lobster-300"
                      >
                        {device.displayName}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {device.deviceId}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {device.productId || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-300">
                      {device.chipFamily || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge tone={HEALTH_TONE[device.health]}>{t(`admin.hardware.health.${device.health}`)}</Badge>
                    </TableCell>
                    <TableCell className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatTimestamp(device.lastSeenAt) || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <LinkButton
                          onClick={() => openEdit(device)}
                          disabled={busy}
                          aria-label={t('admin.hardware.common.edit')}
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </LinkButton>
                        <LinkButton
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                          onClick={() => setPendingDelete(device)}
                          disabled={busy}
                          aria-label={t('admin.hardware.common.delete')}
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </LinkButton>
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
          title={editing ? t('admin.hardware.devices.formEditTitle') : t('admin.hardware.devices.formCreateTitle')}
          subtitle={t('admin.hardware.common.drawerHint')}
          onClose={closeDrawer}
          closeLabel={t('admin.hardware.common.close')}
          footer={
            <>
              <SecondaryButton onClick={closeDrawer} disabled={busy}>
                {t('admin.hardware.common.cancel')}
              </SecondaryButton>
              <PrimaryButton onClick={() => void submit()} disabled={busy}>
                {busy ? t('admin.hardware.common.saving') : t('admin.hardware.common.save')}
              </PrimaryButton>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <Field
              label={t('admin.hardware.devices.field.deviceId')}
              required
              hint={t('admin.hardware.devices.field.deviceIdHint')}
              error={formError ?? undefined}
              htmlFor="device-id"
            >
              <TextInput
                id="device-id"
                value={form.deviceId}
                disabled={busy || Boolean(editing)}
                onChange={(event) => setForm((current) => ({ ...current, deviceId: event.target.value }))}
              />
            </Field>
            <Field label={t('admin.hardware.devices.field.displayName')} required htmlFor="device-display-name">
              <TextInput
                id="device-display-name"
                value={form.displayName}
                disabled={busy}
                onChange={(event) => setForm((current) => ({ ...current, displayName: event.target.value }))}
              />
            </Field>
            <Field
              label={t('admin.hardware.devices.field.product')}
              required
              hint={editing ? t('admin.hardware.devices.field.productImmutable') : undefined}
              htmlFor="device-product"
            >
              <SelectInput
                id="device-product"
                value={form.productId}
                disabled={busy || Boolean(editing)}
                onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
              >
                <option value="">{t('admin.hardware.common.selectPlaceholder')}</option>
                {products.map((product) => (
                  <option key={product.productId} value={product.productId}>
                    {product.displayName} · {product.productId}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label={t('admin.hardware.devices.field.clientId')} htmlFor="device-client-id">
              <TextInput
                id="device-client-id"
                value={form.clientId}
                disabled={busy || Boolean(editing)}
                onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))}
              />
            </Field>
            <Field label={t('admin.hardware.devices.field.chipFamily')} htmlFor="device-chip-family">
              <TextInput
                id="device-chip-family"
                value={form.chipFamily}
                disabled={busy || Boolean(editing)}
                onChange={(event) => setForm((current) => ({ ...current, chipFamily: event.target.value }))}
              />
            </Field>
            {editing ? (
              <Field label={t('admin.hardware.common.status')} htmlFor="device-status">
                <SelectInput
                  id="device-status"
                  value={form.status}
                  disabled={busy}
                  onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}
                >
                  {DEVICE_STATUS_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {t(`admin.hardware.deviceStatus.${value}`)}
                    </option>
                  ))}
                </SelectInput>
              </Field>
            ) : null}
          </div>
        </Drawer>
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title={t('admin.hardware.devices.deleteTitle')}
          description={t('admin.hardware.devices.deleteDescription', { id: pendingDelete.deviceId })}
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

export function HardwareDevicesPage({ service }: HardwarePageProps = {}) {
  const resolved = useMemo(() => service ?? getHardwareService(), [service]);
  return (
    <HardwareToastProvider>
      <HardwareDevicesBody service={resolved} />
    </HardwareToastProvider>
  );
}
