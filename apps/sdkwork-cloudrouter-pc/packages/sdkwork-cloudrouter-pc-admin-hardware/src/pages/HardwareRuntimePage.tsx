import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Gauge, RefreshCw } from 'lucide-react';

import type { HardwareRuntimeCapacity } from '../hardware.ts';
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
  SecondaryButton,
  SectionCard,
} from '../components/ui.tsx';

export function HardwareRuntimePage({ service }: HardwarePageProps = {}) {
  const resolved = useMemo(() => service ?? getHardwareService(), [service]);
  return (
    <HardwareToastProvider>
      <HardwareRuntimeBody service={resolved} />
    </HardwareToastProvider>
  );
}

function HardwareRuntimeBody({ service }: { service: HardwareService }) {
  const { t } = useTranslation();
  const [capacity, setCapacity] = useState<HardwareRuntimeCapacity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ detail: string; key: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await service.retrieveRuntimeCapacity();
      setCapacity(next);
    } catch (cause) {
      setError(describeHardwareError(cause));
      setCapacity(null);
    } finally {
      setLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell
      title={t('admin.hardware.runtime.title')}
      description={t('admin.hardware.runtime.description')}
      actions={
        <SecondaryButton onClick={() => void load()} disabled={loading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
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
      ) : !capacity ? (
        <EmptyBlock title={t('admin.hardware.runtime.empty')} description={t('admin.hardware.runtime.emptyHint')} />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                label={t('admin.hardware.runtime.maxConnections')}
                value={capacity.maxConnectionsPerNode}
                icon={<Gauge className="h-4 w-4" aria-hidden="true" />}
              />
              <KpiCard label={t('admin.hardware.runtime.maxSessions')} value={capacity.maxSessionsPerTenant} />
              <KpiCard label={t('admin.hardware.runtime.maxInflight')} value={String(capacity.maxInflightPerDevice)} />
              <KpiCard
                label={t('admin.hardware.runtime.outboxAttempts')}
                value={String(capacity.outboxMaxAttempts)}
                tone={capacity.deadLetterAfterAttempts > 0 ? 'warning' : 'neutral'}
                detail={t('admin.hardware.runtime.deadLetter', { count: capacity.deadLetterAfterAttempts })}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SectionCard title={t('admin.hardware.runtime.identityTitle')}>
                <div className="px-4 py-3">
                  <DefinitionGrid
                    entries={[
                      { label: t('admin.hardware.runtime.node'), value: <span className="font-mono">{capacity.nodeId}</span> },
                      {
                        label: t('admin.hardware.runtime.leaseTtl'),
                        value: `${capacity.sessionLeaseTtlSeconds}s`,
                      },
                      {
                        label: t('admin.hardware.runtime.leaseRenew'),
                        value: `${capacity.sessionLeaseRenewSeconds}s`,
                      },
                      {
                        label: t('admin.hardware.runtime.orderedCommands'),
                        value: (
                          <Badge tone={capacity.orderedDeviceCommands ? 'success' : 'neutral'}>
                            {capacity.orderedDeviceCommands ? t('admin.hardware.common.yes') : t('admin.hardware.common.no')}
                          </Badge>
                        ),
                      },
                      {
                        label: t('admin.hardware.runtime.idempotentIngest'),
                        value: (
                          <Badge tone={capacity.idempotentIngest ? 'success' : 'neutral'}>
                            {capacity.idempotentIngest ? t('admin.hardware.common.yes') : t('admin.hardware.common.no')}
                          </Badge>
                        ),
                      },
                    ]}
                  />
                </div>
              </SectionCard>

              <SectionCard
                title={t('admin.hardware.runtime.backpressureTitle')}
                description={t('admin.hardware.runtime.backpressureDescription')}
              >
                <div className="px-4 py-3">
                  {capacity.backpressureSummary ? (
                    <pre className="max-h-64 overflow-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] leading-5 text-slate-700 dark:border-white/10 dark:bg-black/30 dark:text-slate-200">
                      {capacity.backpressureSummary}
                    </pre>
                  ) : (
                    <EmptyBlock title={t('admin.hardware.runtime.backpressureEmpty')} />
                  )}
                </div>
              </SectionCard>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
