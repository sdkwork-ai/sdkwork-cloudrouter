import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';

import { BottomPagination } from '@sdkwork/cloudroutes-pc-commons/components/BottomPagination';

import { formatTimestamp, matchesQuery, type HardwareEvent } from '../hardware.ts';
import { describeHardwareError, getHardwareService, type HardwareService } from '../hardwareService.ts';
import type { HardwarePageProps } from './HardwareResourcePages.tsx';
import {
  Badge,
  EmptyBlock,
  ErrorBlock,
  HardwareToastProvider,
  LoadingBlock,
  PageShell,
  SecondaryButton,
  SelectInput,
  TableCell,
  TableHeadCell,
  TableRow,
  TableShell,
  TextInput,
  Toolbar,
} from '../components/ui.tsx';

const PAGE_SIZE = 50;

export function HardwareEventsPage({ service }: HardwarePageProps = {}) {
  const resolved = useMemo(() => service ?? getHardwareService(), [service]);
  return (
    <HardwareToastProvider>
      <HardwareEventsBody service={resolved} />
    </HardwareToastProvider>
  );
}

function HardwareEventsBody({ service }: { service: HardwareService }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState<HardwareEvent[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ detail: string; key: string } | null>(null);
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('');

  const load = useCallback(
    async (targetPage: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await service.listEvents({ page: targetPage, pageSize: PAGE_SIZE });
        setEvents(result.items);
        setHasMore(result.hasMore);
        setPage(result.page || targetPage);
      } catch (cause) {
        setError(describeHardwareError(cause));
        setEvents([]);
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
      events.filter(
        (event) =>
          (!direction || event.direction === direction)
          && matchesQuery(
            [event.deviceId, event.eventType, event.messageClass, event.semanticType, event.adapterId],
            query,
          ),
      ),
    [direction, events, query],
  );

  return (
    <PageShell
      title={t('admin.hardware.events.title')}
      description={t('admin.hardware.events.description')}
      actions={
        <SecondaryButton onClick={() => void load(page)} disabled={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('admin.hardware.common.refresh')}
        </SecondaryButton>
      }
    >
      <Toolbar>
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.hardware.events.searchPlaceholder')}
          className="max-w-xs"
        />
        <SelectInput
          value={direction}
          onChange={(event) => setDirection(event.target.value)}
          className="max-w-[12rem]"
        >
          <option value="">{t('admin.hardware.events.allDirections')}</option>
          <option value="device_to_cloud">{t('admin.hardware.events.direction.uplink')}</option>
          <option value="cloud_to_device">{t('admin.hardware.events.direction.downlink')}</option>
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
              itemCount={events.length}
              hasNextPage={hasMore}
              showingLabel={t('admin.hardware.common.showing')}
              pageLabel={t('admin.hardware.common.pageOf', { page })}
              pageSizeLabel={t('admin.hardware.common.pageSize')}
              previousLabel={t('admin.hardware.common.previousPage')}
              nextLabel={t('admin.hardware.common.nextPage')}
              pageSizeOptions={[PAGE_SIZE]}
              disabled={loading}
              onPreviousPage={() => void load(Math.max(1, page - 1))}
              onNextPage={() => void load(page + 1)}
              onPageSizeChange={() => undefined}
            />
          }
        >
          {loading ? (
            <LoadingBlock label={t('admin.hardware.common.loading')} />
          ) : visible.length === 0 ? (
            <EmptyBlock title={t('admin.hardware.events.empty')} description={t('admin.hardware.events.emptyHint')} />
          ) : (
            <table className="w-full min-w-max border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr>
                  <TableHeadCell>{t('admin.hardware.events.column.occurredAt')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.events.column.type')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.events.column.device')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.events.column.messageClass')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.events.column.adapter')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.events.column.direction')}</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {visible.map((event) => (
                  <TableRow key={event.eventId}>
                    <TableCell className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatTimestamp(event.occurredAt) || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-[11px]">{event.eventType || '-'}</TableCell>
                    <TableCell className="font-mono text-[11px]">{event.deviceId || '-'}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">{event.messageClass || '-'}</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {event.adapterId || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge tone={event.direction === 'cloud_to_device' ? 'info' : 'neutral'}>
                        {t(`admin.hardware.events.direction.${event.direction === 'cloud_to_device' ? 'downlink' : 'uplink'}`)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </table>
          )}
        </TableShell>
      )}
    </PageShell>
  );
}
