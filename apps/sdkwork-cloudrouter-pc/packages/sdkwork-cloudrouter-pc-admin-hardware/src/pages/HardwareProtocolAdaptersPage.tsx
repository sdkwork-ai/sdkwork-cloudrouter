import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';

import { matchesQuery, type HardwareProtocolAdapter } from '../hardware.ts';
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
  TableCell,
  TableHeadCell,
  TableRow,
  TableShell,
  TextInput,
  Toolbar,
} from '../components/ui.tsx';

export function HardwareProtocolAdaptersPage({ service }: HardwarePageProps = {}) {
  const resolved = useMemo(() => service ?? getHardwareService(), [service]);
  return (
    <HardwareToastProvider>
      <HardwareProtocolAdaptersBody service={resolved} />
    </HardwareToastProvider>
  );
}

function HardwareProtocolAdaptersBody({ service }: { service: HardwareService }) {
  const { t } = useTranslation();
  const [adapters, setAdapters] = useState<HardwareProtocolAdapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ detail: string; key: string } | null>(null);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const page = await service.listProtocolAdapters({ page: 1, pageSize: 100 });
      setAdapters(page.items);
    } catch (cause) {
      setError(describeHardwareError(cause));
      setAdapters([]);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => adapters.filter((adapter) => matchesQuery([adapter.protocolId, adapter.pluginId, adapter.path, adapter.kind], query)),
    [adapters, query],
  );

  return (
    <PageShell
      title={t('admin.hardware.adapters.title')}
      description={t('admin.hardware.adapters.description')}
      actions={
        <SecondaryButton onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('admin.hardware.common.refresh')}
        </SecondaryButton>
      }
    >
      <Toolbar>
        <TextInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('admin.hardware.adapters.searchPlaceholder')}
          className="max-w-xs"
        />
        <span className="ml-auto text-[11px] text-slate-500 dark:text-slate-400">
          {t('admin.hardware.common.rowCount', { count: visible.length })}
        </span>
      </Toolbar>

      {error ? (
        <ErrorBlock
          title={t(`admin.hardware.error.${error.key}`)}
          description={error.detail || undefined}
          onRetry={() => void load()}
          retryLabel={t('admin.hardware.common.retry')}
        />
      ) : (
        <TableShell>
          {loading ? (
            <LoadingBlock label={t('admin.hardware.common.loading')} />
          ) : visible.length === 0 ? (
            <EmptyBlock title={t('admin.hardware.adapters.empty')} description={t('admin.hardware.adapters.emptyHint')} />
          ) : (
            <table className="w-full min-w-max border-collapse text-left">
              <thead className="sticky top-0 z-10">
                <tr>
                  <TableHeadCell>{t('admin.hardware.adapters.column.protocol')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.adapters.column.scope')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.adapters.column.kind')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.adapters.column.transport')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.adapters.column.codecs')}</TableHeadCell>
                  <TableHeadCell>{t('admin.hardware.adapters.column.hardwareFamilies')}</TableHeadCell>
                </tr>
              </thead>
              <tbody>
                {visible.map((adapter) => (
                  <TableRow key={`${adapter.protocolId}-${adapter.path}`}>
                    <TableCell className="font-mono text-[11px] text-slate-700 dark:text-slate-200">
                      {adapter.protocolId}
                    </TableCell>
                    <TableCell>
                      <Badge tone={adapter.scope === 'StandardAdapter' ? 'success' : 'info'}>{adapter.scope}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">{adapter.kind}</TableCell>
                    <TableCell className="text-slate-600 dark:text-slate-300">{adapter.transportSummary || '-'}</TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {adapter.codecs.join(', ') || '-'}
                    </TableCell>
                    <TableCell className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {adapter.hardwareFamilies.join(', ') || '-'}
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
