import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Activity, AlertTriangle, Boxes, Cpu, RadioTower, ShieldCheck } from 'lucide-react';

import { Link } from 'react-router-dom';

import {
  countHealth,
  formatTimestamp,
  type HardwareDevice,
  type HardwareEvent,
  type HardwareFirmwareRollout,
  type HardwareHealth,
  type HardwareProduct,
  type HardwareRuntimeCapacity,
} from '../hardware.ts';
import { describeHardwareError, getHardwareService, type HardwareService } from '../hardwareService.ts';
import type { HardwarePageProps } from './HardwareResourcePages.tsx';
import {
  Badge,
  DefinitionGrid,
  EmptyBlock,
  ErrorBlock,
  HardwareToastProvider,
  KpiCard,
  LoadingBlock,
  PageShell,
  SectionCard,
  SecondaryButton,
  TableCell,
  TableHeadCell,
  TableRow,
  TableShell,
  type BadgeTone,
} from '../components/ui.tsx';

const HEALTH_TONE: Record<HardwareHealth, BadgeTone> = {
  critical: 'danger',
  healthy: 'success',
  offline: 'neutral',
  warning: 'warning',
};

interface OverviewData {
  capacity: HardwareRuntimeCapacity | null;
  devices: HardwareDevice[];
  deviceTotal: number;
  events: HardwareEvent[];
  products: HardwareProduct[];
  rollouts: HardwareFirmwareRollout[];
}

const EMPTY_DATA: OverviewData = {
  capacity: null,
  devices: [],
  deviceTotal: 0,
  events: [],
  products: [],
  rollouts: [],
};

function useOverviewData(service: HardwareService) {
  const [data, setData] = useState<OverviewData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ detail: string; key: string } | null>(null);
  const [failedSections, setFailedSections] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    // Each panel is independently useful: one unavailable domain must not blank
    // the whole cockpit, so settle every read and report per-section gaps.
    const [devices, products, rollouts, events, capacity] = await Promise.allSettled([
      service.listDevices({ page: 1, pageSize: 100 }),
      service.listProducts({ page: 1, pageSize: 100 }),
      service.listFirmwareRollouts({ page: 1, pageSize: 20 }),
      service.listEvents({ page: 1, pageSize: 8 }),
      service.retrieveRuntimeCapacity(),
    ]);

    const failures: string[] = [];
    if (devices.status === 'rejected') failures.push('devices');
    if (products.status === 'rejected') failures.push('products');
    if (rollouts.status === 'rejected') failures.push('rollouts');
    if (events.status === 'rejected') failures.push('events');
    if (capacity.status === 'rejected') failures.push('capacity');

    const allFailed = failures.length === 5;
    if (allFailed) {
      const description = describeHardwareError(
        devices.status === 'rejected' ? devices.reason : new Error(''),
      );
      setError({ detail: description.detail, key: description.key });
    }

    setFailedSections(failures);
    setData({
      capacity: capacity.status === 'fulfilled' ? capacity.value : null,
      devices: devices.status === 'fulfilled' ? devices.value.items : [],
      deviceTotal:
        devices.status === 'fulfilled'
          ? devices.value.total ?? devices.value.items.length
          : 0,
      events: events.status === 'fulfilled' ? events.value.items : [],
      products: products.status === 'fulfilled' ? products.value.items : [],
      rollouts: rollouts.status === 'fulfilled' ? rollouts.value.items : [],
    });
    setLoading(false);
  }, [service]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, failedSections, load, loading };
}

export function HardwareOverviewPage({ service }: HardwarePageProps = {}) {
  const { t } = useTranslation();
  const resolvedService = useMemo(() => service ?? getHardwareService(), [service]);
  const { data, error, failedSections, load, loading } = useOverviewData(resolvedService);

  const health = useMemo(() => countHealth(data.devices), [data.devices]);
  const activeRollouts = data.rollouts.filter(
    (rollout) => rollout.status === 'running' || rollout.status === 'scheduled',
  ).length;
  const coverage = data.products.length > 0 ? Math.round((data.devices.length / data.products.length) * 10) / 10 : 0;

  return (
    <HardwareToastProvider>
      <PageShell
        title={t('admin.hardware.overview.title')}
        description={t('admin.hardware.overview.description')}
        actions={
          <SecondaryButton onClick={() => void load()} disabled={loading}>
            {t('admin.hardware.common.refresh')}
          </SecondaryButton>
        }
      >
        {loading ? (
          <LoadingBlock label={t('admin.hardware.common.loading')} />
        ) : error ? (
          <ErrorBlock
            title={t(`admin.hardware.error.${error.key}`)}
            description={error.detail || undefined}
            onRetry={() => void load()}
            retryLabel={t('admin.hardware.common.retry')}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
            <div className="flex flex-col gap-4">
              {failedSections.length > 0 ? (
                <Badge tone="warning">
                  {t('admin.hardware.overview.partialFailure', { sections: failedSections.join(', ') })}
                </Badge>
              ) : null}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <KpiCard
                  label={t('admin.hardware.overview.kpi.devices')}
                  value={String(data.deviceTotal)}
                  detail={t('admin.hardware.overview.kpi.devicesDetail', { count: data.devices.length })}
                  icon={<Cpu className="h-4 w-4" aria-hidden="true" />}
                />
                <KpiCard
                  label={t('admin.hardware.overview.kpi.healthy')}
                  value={String(health.healthy)}
                  tone="success"
                  detail={t('admin.hardware.overview.kpi.healthyDetail')}
                  icon={<ShieldCheck className="h-4 w-4" aria-hidden="true" />}
                />
                <KpiCard
                  label={t('admin.hardware.overview.kpi.attention')}
                  value={String(health.warning + health.critical)}
                  tone={health.critical > 0 ? 'danger' : 'warning'}
                  detail={t('admin.hardware.overview.kpi.attentionDetail', {
                    warning: health.warning,
                    critical: health.critical,
                  })}
                  icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
                />
                <KpiCard
                  label={t('admin.hardware.overview.kpi.products')}
                  value={String(data.products.length)}
                  detail={t('admin.hardware.overview.kpi.productsDetail', { count: coverage })}
                  icon={<Boxes className="h-4 w-4" aria-hidden="true" />}
                />
                <KpiCard
                  label={t('admin.hardware.overview.kpi.rollouts')}
                  value={String(activeRollouts)}
                  tone={activeRollouts > 0 ? 'info' : 'neutral'}
                  detail={t('admin.hardware.overview.kpi.rolloutsDetail', { count: data.rollouts.length })}
                  icon={<RadioTower className="h-4 w-4" aria-hidden="true" />}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <SectionCard
                  className="xl:col-span-2"
                  title={t('admin.hardware.overview.fleet.title')}
                  description={t('admin.hardware.overview.fleet.description')}
                  actions={
                    <Link to="/admin/hardware/devices" className="text-xs font-semibold text-lobster-600 dark:text-lobster-400">
                      {t('admin.hardware.overview.fleet.open')}
                    </Link>
                  }
                >
                  {data.devices.length === 0 ? (
                    <EmptyBlock title={t('admin.hardware.overview.fleet.empty')} />
                  ) : (
                    <ul className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                      {data.devices.slice(0, 8).map((device) => (
                        <li key={device.deviceId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-slate-800 dark:text-slate-100">
                              {device.displayName}
                            </p>
                            <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                              {device.deviceId} · {device.productId || '-'}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">
                              {formatTimestamp(device.lastSeenAt) || '-'}
                            </span>
                            <Badge tone={HEALTH_TONE[device.health]}>
                              {t(`admin.hardware.health.${device.health}`)}
                            </Badge>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </SectionCard>

                <SectionCard
                  title={t('admin.hardware.overview.capacity.title')}
                  description={t('admin.hardware.overview.capacity.description')}
                >
                  {data.capacity ? (
                    <div className="px-4 py-3">
                      <DefinitionGrid
                        entries={[
                          {
                            label: t('admin.hardware.runtime.node'),
                            value: <span className="font-mono">{data.capacity.nodeId}</span>,
                          },
                          {
                            label: t('admin.hardware.runtime.maxConnections'),
                            value: data.capacity.maxConnectionsPerNode,
                          },
                          {
                            label: t('admin.hardware.runtime.maxSessions'),
                            value: data.capacity.maxSessionsPerTenant,
                          },
                          {
                            label: t('admin.hardware.runtime.maxInflight'),
                            value: String(data.capacity.maxInflightPerDevice),
                          },
                          {
                            label: t('admin.hardware.runtime.leaseTtl'),
                            value: `${data.capacity.sessionLeaseTtlSeconds}s`,
                          },
                          {
                            label: t('admin.hardware.runtime.orderedCommands'),
                            value: data.capacity.orderedDeviceCommands ? t('admin.hardware.common.yes') : t('admin.hardware.common.no'),
                          },
                        ]}
                      />
                    </div>
                  ) : (
                    <EmptyBlock title={t('admin.hardware.overview.capacity.empty')} />
                  )}
                </SectionCard>
              </div>

              <SectionCard
                title={t('admin.hardware.overview.events.title')}
                description={t('admin.hardware.overview.events.description')}
                actions={
                  <Link to="/admin/hardware/events" className="text-xs font-semibold text-lobster-600 dark:text-lobster-400">
                    {t('admin.hardware.overview.events.open')}
                  </Link>
                }
              >
                {data.events.length === 0 ? (
                  <EmptyBlock title={t('admin.hardware.overview.events.empty')} />
                ) : (
                  <TableShell>
                    <table className="w-full min-w-max border-collapse text-left">
                      <thead className="sticky top-0 z-10">
                        <tr>
                          <TableHeadCell>{t('admin.hardware.events.column.type')}</TableHeadCell>
                          <TableHeadCell>{t('admin.hardware.events.column.device')}</TableHeadCell>
                          <TableHeadCell>{t('admin.hardware.events.column.direction')}</TableHeadCell>
                          <TableHeadCell>{t('admin.hardware.events.column.occurredAt')}</TableHeadCell>
                        </tr>
                      </thead>
                      <tbody>
                        {data.events.map((event) => (
                          <TableRow key={event.eventId}>
                            <TableCell className="font-mono text-[11px]">{event.eventType || '-'}</TableCell>
                            <TableCell className="font-mono text-[11px]">{event.deviceId || '-'}</TableCell>
                            <TableCell>
                              <Badge tone={event.direction === 'cloud_to_device' ? 'info' : 'neutral'}>
                                {t(`admin.hardware.events.direction.${event.direction === 'cloud_to_device' ? 'downlink' : 'uplink'}`)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-[11px] text-slate-500 dark:text-slate-400">
                              {formatTimestamp(event.occurredAt) || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </tbody>
                    </table>
                  </TableShell>
                )}
              </SectionCard>

              <SectionCard
                title={t('admin.hardware.overview.rollouts.title')}
                description={t('admin.hardware.overview.rollouts.description')}
                actions={
                  <Link to="/admin/hardware/firmware-rollouts" className="text-xs font-semibold text-lobster-600 dark:text-lobster-400">
                    {t('admin.hardware.overview.rollouts.open')}
                  </Link>
                }
              >
                {data.rollouts.length === 0 ? (
                  <EmptyBlock title={t('admin.hardware.overview.rollouts.empty')} />
                ) : (
                  <ul className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                    {data.rollouts.slice(0, 6).map((rollout) => (
                      <li key={rollout.rolloutId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <div className="min-w-0">
                          <p className="truncate font-mono text-[11px] text-slate-700 dark:text-slate-200">
                            {rollout.rolloutId}
                          </p>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {t('admin.hardware.firmwareRollouts.column.artifact')}: {rollout.artifactId || '-'} ·{' '}
                            {rollout.targetSummary || '-'}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Activity className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                          <Badge tone={rolloutBadgeTone(rollout.status)}>
                            {t(`admin.hardware.rolloutStatus.${normalizeRolloutStatus(rollout.status)}`)}
                          </Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>
            </div>
          </div>
        )}
      </PageShell>
    </HardwareToastProvider>
  );
}

function normalizeRolloutStatus(status: string): string {
  const known = ['draft', 'scheduled', 'running', 'completed', 'canceled', 'failed'];
  return known.includes(status) ? status : 'draft';
}

function rolloutBadgeTone(status: string): BadgeTone {
  switch (status) {
    case 'running':
      return 'info';
    case 'completed':
      return 'success';
    case 'failed':
      return 'danger';
    case 'canceled':
      return 'neutral';
    default:
      return 'warning';
  }
}
