import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Send, Users } from 'lucide-react';

import {
  matchesQuery,
  parseJsonObjectInput,
  summarizeBulkResult,
  type HardwareBulkResult,
  type HardwareDevice,
} from '../hardware.ts';
import { describeHardwareError, getHardwareService, type HardwareService } from '../hardwareService.ts';
import { DeviceSettingsPanel } from '../components/DeviceSettingsPanel.tsx';
import type { HardwarePageProps } from './HardwareResourcePages.tsx';
import {
  Badge,
  EmptyBlock,
  ErrorBlock,
  Field,
  HardwareToastProvider,
  LoadingBlock,
  PageShell,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  SelectInput,
  Tabs,
  TextArea,
  TextInput,
  ToggleInput,
  Toolbar,
  useHardwareToast,
  type BadgeTone,
} from '../components/ui.tsx';

type SettingsTab = 'single' | 'bulk';

const BULK_TONE: Record<string, BadgeTone> = {
  conflict: 'warning',
  failed: 'danger',
  invalid: 'warning',
  not_found: 'neutral',
  skipped: 'neutral',
  updated: 'success',
};

export function HardwareDeviceSettingsPage({ service }: HardwarePageProps = {}) {
  const resolvedService = useMemo(() => service ?? getHardwareService(), [service]);
  return (
    <HardwareToastProvider>
      <HardwareDeviceSettingsBody service={resolvedService} />
    </HardwareToastProvider>
  );
}

function HardwareDeviceSettingsBody({ service }: { service: HardwareService }) {
  const { t } = useTranslation();
  const { notify } = useHardwareToast();

  const [tab, setTab] = useState<SettingsTab>('single');
  const [devices, setDevices] = useState<HardwareDevice[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);
  const [devicesError, setDevicesError] = useState<{ detail: string; key: string } | null>(null);
  const [query, setQuery] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState('');

  const [selectedForBulk, setSelectedForBulk] = useState<string[]>([]);
  const [bulkOverrides, setBulkOverrides] = useState('{\n}\n');
  const [bulkOverridesError, setBulkOverridesError] = useState<string | null>(null);
  const [allOrNothing, setAllOrNothing] = useState(true);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkResult, setBulkResult] = useState<HardwareBulkResult | null>(null);
  const [bulkError, setBulkError] = useState<{ detail: string; key: string } | null>(null);

  const loadDevices = useCallback(async () => {
    setDevicesLoading(true);
    setDevicesError(null);
    try {
      const page = await service.listDevices({ page: 1, pageSize: 100 });
      setDevices(page.items);
      setSelectedDeviceId((current) => current || page.items[0]?.deviceId || '');
    } catch (cause) {
      setDevicesError(describeHardwareError(cause));
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, [service]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const visibleDevices = useMemo(
    () => devices.filter((device) => matchesQuery([device.deviceId, device.displayName, device.productId], query)),
    [devices, query],
  );

  const bulkSummary = useMemo(() => (bulkResult ? summarizeBulkResult(bulkResult) : null), [bulkResult]);

  const toggleBulkSelection = useCallback((deviceId: string) => {
    setSelectedForBulk((current) =>
      current.includes(deviceId) ? current.filter((entry) => entry !== deviceId) : [...current, deviceId],
    );
  }, []);

  const applyBulk = useCallback(async () => {
    const parsed = parseJsonObjectInput(bulkOverrides);
    if (!parsed.ok) {
      setBulkOverridesError(t('admin.hardware.common.invalidJson'));
      return;
    }
    setBulkOverridesError(null);
    setBulkError(null);
    setBulkBusy(true);
    try {
      const result = await service.applyDeviceSettingsBulk({
        allOrNothing,
        items: selectedForBulk.map((deviceId) => ({ deviceId, overrides: parsed.value ?? {} })),
      });
      setBulkResult(result);
      notify(t('admin.hardware.settings.bulkDone'));
    } catch (cause) {
      setBulkError(describeHardwareError(cause));
    } finally {
      setBulkBusy(false);
    }
  }, [allOrNothing, bulkOverrides, notify, selectedForBulk, service, t]);

  return (
    <PageShell
      title={t('admin.hardware.deviceSettings.title')}
      description={t('admin.hardware.deviceSettings.description')}
      actions={
        <SecondaryButton onClick={() => void loadDevices()} disabled={devicesLoading}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t('admin.hardware.common.refresh')}
        </SecondaryButton>
      }
    >
      <Tabs
        activeId={tab}
        label={t('admin.hardware.deviceSettings.tabsLabel')}
        onChange={setTab}
        items={[
          { id: 'single', label: t('admin.hardware.deviceSettings.tab.single') },
          { id: 'bulk', label: t('admin.hardware.deviceSettings.tab.bulk') },
        ]}
      />

      {tab === 'single' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <Toolbar>
            <TextInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('admin.hardware.devices.searchPlaceholder')}
              className="max-w-xs"
            />
            <div className="min-w-[16rem] max-w-sm flex-1">
              <SelectInput
                value={selectedDeviceId}
                onChange={(event) => setSelectedDeviceId(event.target.value)}
                aria-label={t('admin.hardware.deviceSettings.devicePicker')}
              >
                {visibleDevices.length === 0 ? (
                  <option value="">{t('admin.hardware.deviceSettings.noDevice')}</option>
                ) : null}
                {visibleDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.displayName} · {device.deviceId}
                  </option>
                ))}
              </SelectInput>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              {t('admin.hardware.common.rowCount', { count: visibleDevices.length })}
            </span>
          </Toolbar>

          {devicesLoading ? (
            <LoadingBlock label={t('admin.hardware.common.loading')} />
          ) : devicesError ? (
            <ErrorBlock
              title={t(`admin.hardware.error.${devicesError.key}`)}
              description={devicesError.detail || undefined}
              onRetry={() => void loadDevices()}
              retryLabel={t('admin.hardware.common.retry')}
            />
          ) : !selectedDeviceId ? (
            <EmptyBlock
              title={t('admin.hardware.deviceSettings.noDevice')}
              description={t('admin.hardware.deviceSettings.noDeviceHint')}
            />
          ) : (
            <DeviceSettingsPanel deviceId={selectedDeviceId} service={service} />
          )}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pr-0.5">
          <div className="flex flex-col gap-4">
            <SectionCard
              title={t('admin.hardware.settings.bulk.title')}
              description={t('admin.hardware.settings.bulk.description')}
              actions={<Badge tone="info">{t('admin.hardware.settings.bulk.selected', { count: selectedForBulk.length })}</Badge>}
            >
              {devicesLoading ? (
                <LoadingBlock label={t('admin.hardware.common.loading')} />
              ) : devices.length === 0 ? (
                <EmptyBlock title={t('admin.hardware.deviceSettings.noDevice')} />
              ) : (
                <ul className="grid max-h-64 grid-cols-1 gap-1 overflow-y-auto px-4 py-3 md:grid-cols-2 xl:grid-cols-3">
                  {visibleDevices.map((device) => {
                    const selected = selectedForBulk.includes(device.deviceId);
                    return (
                      <li key={device.deviceId}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleBulkSelection(device.deviceId)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-lobster-600 focus:ring-lobster-400"
                          />
                          <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
                            {device.displayName}
                          </span>
                          <span className="shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                            {device.deviceId}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </SectionCard>

            <SectionCard title={t('admin.hardware.settings.bulk.overridesTitle')}>
              <div className="flex flex-col gap-3 px-4 py-3">
                <Field
                  label={t('admin.hardware.settings.overrides')}
                  hint={t('admin.hardware.settings.bulk.overridesHint')}
                  error={bulkOverridesError ?? undefined}
                >
                  <TextArea
                    value={bulkOverrides}
                    rows={8}
                    spellCheck={false}
                    onChange={(event) => setBulkOverrides(event.target.value)}
                  />
                </Field>
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 dark:bg-white/5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                      {t('admin.hardware.settings.bulk.allOrNothing')}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {t('admin.hardware.settings.bulk.allOrNothingHint')}
                    </p>
                  </div>
                  <ToggleInput
                    checked={allOrNothing}
                    label={t('admin.hardware.settings.bulk.allOrNothing')}
                    onChange={setAllOrNothing}
                  />
                </div>
                <div className="flex justify-end">
                  <PrimaryButton
                    onClick={() => void applyBulk()}
                    disabled={bulkBusy || selectedForBulk.length === 0}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    {bulkBusy ? t('admin.hardware.common.saving') : t('admin.hardware.settings.bulk.apply')}
                  </PrimaryButton>
                </div>
              </div>
            </SectionCard>

            {bulkError ? (
              <ErrorBlock
                title={t(`admin.hardware.error.${bulkError.key}`)}
                description={bulkError.detail || undefined}
                onRetry={() => void applyBulk()}
                retryLabel={t('admin.hardware.common.retry')}
              />
            ) : null}

            {bulkResult && bulkSummary ? (
              <SectionCard
                title={t('admin.hardware.settings.bulk.resultTitle')}
                description={t('admin.hardware.settings.bulk.resultSummary', {
                  updated: bulkSummary.succeeded,
                  failed: bulkSummary.failed,
                  total: bulkSummary.total,
                })}
              >
                <ul className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
                  {bulkResult.items.map((item) => (
                    <li
                      key={item.deviceId}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
                    >
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-200">
                        {item.deviceId}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        {item.errors.length > 0 ? (
                          <span className="max-w-md truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {item.errors.map((error) => error.message).join('; ')}
                          </span>
                        ) : null}
                        <Badge tone={BULK_TONE[item.status] ?? 'neutral'}>
                          {t(`admin.hardware.bulkStatus.${item.status}`)}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ) : null}

            {bulkResult ? (
              <div className="flex justify-end">
                <SecondaryButton onClick={() => setBulkResult(null)}>
                  <Users className="h-4 w-4" aria-hidden="true" />
                  {t('admin.hardware.settings.bulk.clearResult')}
                </SecondaryButton>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </PageShell>
  );
}
