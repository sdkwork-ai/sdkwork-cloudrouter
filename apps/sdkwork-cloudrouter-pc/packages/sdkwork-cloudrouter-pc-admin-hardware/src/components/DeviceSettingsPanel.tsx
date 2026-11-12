import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, RotateCcw, Save, Undo2 } from 'lucide-react';

import {
  buildSettingsInputs,
  buildSettingsOverrides,
  countOverrides,
  effectiveSettingValue,
  formatTimestamp,
  groupSettingDefinitions,
  isSettingOverridden,
  type HardwareDeviceSettings,
  type HardwareSettingDefinition,
  type HardwareSettingsHistoryEntry,
} from '../hardware.ts';
import {
  describeHardwareError,
  isHardwareRevisionConflict,
  type HardwareService,
} from '../hardwareService.ts';
import {
  Badge,
  DangerButton,
  EmptyBlock,
  ErrorBlock,
  Field,
  JsonBlock,
  LinkButton,
  LoadingBlock,
  PrimaryButton,
  SecondaryButton,
  SectionCard,
  SelectInput,
  TextArea,
  TextInput,
  ToggleInput,
  useHardwareToast,
} from './ui.tsx';

export interface DeviceSettingsPanelProps {
  deviceId: string;
  service: HardwareService;
}

function SettingEditor({
  definition,
  disabled,
  value,
  overridden,
  onChange,
  onClear,
  clearLabel,
  inheritedHint,
}: {
  clearLabel: string;
  definition: HardwareSettingDefinition;
  disabled: boolean;
  inheritedHint?: string;
  overridden: boolean;
  value: string;
  onChange: (next: string) => void;
  onClear: () => void;
}) {
  const toggleValue = value.trim().toLowerCase() === 'true' || value === '1';

  if (definition.kind === 'boolean') {
    return (
      <ToggleInput
        checked={toggleValue}
        disabled={disabled || !definition.writable}
        label={definition.displayName}
        onChange={(next) => onChange(next ? 'true' : 'false')}
      />
    );
  }
  return (
    <div className="flex items-start gap-1">
      <div className="min-w-0 flex-1">
        {definition.kind === 'enum' ? (
          <SelectInput
            value={value}
            disabled={disabled || !definition.writable}
            onChange={(event) => onChange(event.target.value)}
          >
            <option value="">-</option>
            {definition.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </SelectInput>
        ) : definition.kind === 'json' ? (
          <TextArea
            value={value}
            rows={4}
            spellCheck={false}
            disabled={disabled || !definition.writable}
            onChange={(event) => onChange(event.target.value)}
          />
        ) : (
          <TextInput
            value={value}
            inputMode={definition.kind === 'integer' || definition.kind === 'number' ? 'decimal' : 'text'}
            disabled={disabled || !definition.writable}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      </div>
      {overridden ? (
        <LinkButton onClick={onClear} disabled={disabled} className="mt-1 shrink-0">
          <Undo2 className="h-3 w-3" aria-hidden="true" />
          {clearLabel}
        </LinkButton>
      ) : inheritedHint ? (
        <span className="mt-1.5 shrink-0 text-[10px] text-slate-400 dark:text-slate-500">{inheritedHint}</span>
      ) : null}
    </div>
  );
}

export function DeviceSettingsPanel({ deviceId, service }: DeviceSettingsPanelProps) {
  const { t } = useTranslation();
  const { notify } = useHardwareToast();

  const [settings, setSettings] = useState<HardwareDeviceSettings | null>(null);
  const [history, setHistory] = useState<HardwareSettingsHistoryEntry[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [cleared, setCleared] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ detail: string; key: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setFieldErrors({});
    setCleared([]);
    try {
      const [nextSettings, historyPage] = await Promise.all([
        service.getDeviceSettings(deviceId),
        service.listSettingsHistory(deviceId, { page: 1, pageSize: 20 }).catch(() => ({
          items: [] as HardwareSettingsHistoryEntry[],
          page: 1,
          pageSize: 0,
          hasMore: false,
        })),
      ]);
      setSettings(nextSettings);
      setInputs(buildSettingsInputs(nextSettings));
      setHistory(historyPage.items);
    } catch (cause) {
      setError(describeHardwareError(cause));
      setSettings(null);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [deviceId, service]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(
    () => (settings ? groupSettingDefinitions(settings.definitions) : []),
    [settings],
  );

  const overrideCount = settings ? countOverrides(settings.overrides) : 0;

  const save = useCallback(async () => {
    if (!settings) {
      return;
    }
    const draft = buildSettingsOverrides(settings, inputs, cleared);
    if (Object.keys(draft.errors).length > 0) {
      setFieldErrors(draft.errors);
      setError({ detail: '', key: 'validation' });
      return;
    }
    setBusy(true);
    setError(null);
    setFieldErrors({});
    try {
      const next = await service.saveDeviceSettings(deviceId, {
        expectedRevision: settings.revision,
        overrides: draft.overrides,
      });
      setSettings(next);
      setInputs(buildSettingsInputs(next));
      setCleared([]);
      notify(t('admin.hardware.settings.saved'));
      const historyPage = await service
        .listSettingsHistory(deviceId, { page: 1, pageSize: 20 })
        .catch(() => null);
      if (historyPage) {
        setHistory(historyPage.items);
      }
    } catch (cause) {
      if (isHardwareRevisionConflict(cause)) {
        setError({ detail: '', key: 'revisionConflict' });
        await load();
      } else {
        setError(describeHardwareError(cause));
      }
    } finally {
      setBusy(false);
    }
  }, [cleared, deviceId, inputs, load, notify, service, settings, t]);

  const resetAll = useCallback(async () => {
    if (!settings) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await service.resetDeviceSettings(deviceId);
      notify(t('admin.hardware.settings.resetDone'));
      await load();
    } catch (cause) {
      setError(describeHardwareError(cause));
    } finally {
      setBusy(false);
    }
  }, [deviceId, load, notify, service, settings, t]);

  const rollback = useCallback(
    async (entry: HardwareSettingsHistoryEntry) => {
      if (!settings) {
        return;
      }
      setBusy(true);
      setError(null);
      try {
        const next = await service.rollbackDeviceSettings(deviceId, {
          expectedRevision: settings.revision,
          targetRevision: entry.revision,
        });
        setSettings(next);
        setInputs(buildSettingsInputs(next));
        setCleared([]);
        notify(t('admin.hardware.settings.rollbackDone'));
      } catch (cause) {
        if (isHardwareRevisionConflict(cause)) {
          setError({ detail: '', key: 'revisionConflict' });
          await load();
        } else {
          setError(describeHardwareError(cause));
        }
      } finally {
        setBusy(false);
      }
    },
    [deviceId, load, notify, service, settings, t],
  );

  if (loading) {
    return <LoadingBlock label={t('admin.hardware.common.loading')} />;
  }

  if (error && !settings) {
    return (
      <ErrorBlock
        title={t(`admin.hardware.error.${error.key}`)}
        description={error.detail || undefined}
        onRetry={() => void load()}
        retryLabel={t('admin.hardware.common.retry')}
      />
    );
  }

  if (!settings) {
    return <EmptyBlock title={t('admin.hardware.settings.empty')} />;
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-0.5">
      {error ? (
        <ErrorBlock
          title={t(`admin.hardware.error.${error.key}`)}
          description={error.detail || undefined}
          onRetry={() => void load()}
          retryLabel={t('admin.hardware.common.retry')}
        />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-white/10 dark:bg-[#171717]">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Badge tone="info">{t('admin.hardware.settings.revision', { revision: settings.revision })}</Badge>
          <Badge tone={overrideCount > 0 ? 'warning' : 'neutral'}>
            {t('admin.hardware.settings.overrideCount', { count: overrideCount })}
          </Badge>
          <span>{t('admin.hardware.settings.capabilityModel', { id: settings.capabilityModelId || '-' })}</span>
          {settings.updatedAt ? (
            <span>
              {t('admin.hardware.settings.updatedAt', {
                at: formatTimestamp(settings.updatedAt),
                by: settings.updatedBy || '-',
              })}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SecondaryButton onClick={() => setShowHistory((current) => !current)} disabled={busy}>
            <History className="h-4 w-4" aria-hidden="true" />
            {t('admin.hardware.settings.historyToggle')}
          </SecondaryButton>
          <SecondaryButton onClick={() => void load()} disabled={busy}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {t('admin.hardware.common.refresh')}
          </SecondaryButton>
          <DangerButton onClick={() => void resetAll()} disabled={busy || overrideCount === 0}>
            {t('admin.hardware.settings.resetAll')}
          </DangerButton>
          <PrimaryButton onClick={() => void save()} disabled={busy}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {busy ? t('admin.hardware.common.saving') : t('admin.hardware.common.save')}
          </PrimaryButton>
        </div>
      </div>

      {settings.definitions.length === 0 ? (
        <EmptyBlock
          title={t('admin.hardware.settings.noDefinitions')}
          description={t('admin.hardware.settings.noDefinitionsHint')}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          {groups.map((group) => (
            <SectionCard
              key={group.group}
              title={group.group === 'general' ? t('admin.hardware.settings.groupGeneral') : group.group}
            >
              <div className="flex flex-col gap-3 px-4 py-3">
                {group.definitions.map((definition) => {
                  const overridden = isSettingOverridden(settings, definition.settingKey);
                  const defaultValue = settings.defaults[definition.settingKey];
                  const errorReason = fieldErrors[definition.settingKey];
                  const hintParts: string[] = [];
                  if (definition.description) {
                    hintParts.push(definition.description);
                  }
                  if (definition.unit) {
                    hintParts.push(definition.unit);
                  }
                  if (defaultValue !== undefined) {
                    hintParts.push(
                      t('admin.hardware.settings.defaultHint', {
                        value: String(defaultValue),
                      }),
                    );
                  }
                  if (definition.required) {
                    hintParts.push(t('admin.hardware.settings.requiredHint'));
                  }
                  return (
                    <Field
                      key={definition.settingKey}
                      label={`${definition.displayName}${overridden ? ' *' : ''}`}
                      hint={hintParts.join(' · ')}
                      error={errorReason ? t(`admin.hardware.settings.error.${errorReason}`) : undefined}
                    >
                      <div className="flex items-start gap-2">
                        <SettingEditor
                          definition={definition}
                          disabled={busy}
                          value={inputs[definition.settingKey] ?? ''}
                          overridden={overridden}
                          clearLabel={t('admin.hardware.settings.inherit')}
                          inheritedHint={t('admin.hardware.settings.inherited')}
                          onChange={(next) =>
                            setInputs((current) => ({ ...current, [definition.settingKey]: next }))
                          }
                          onClear={() => {
                            setCleared((current) =>
                              current.includes(definition.settingKey)
                                ? current
                                : [...current, definition.settingKey],
                            );
                            setInputs((current) => ({
                              ...current,
                              [definition.settingKey]: String(defaultValue ?? ''),
                            }));
                          }}
                        />
                        <span className="mt-1.5 shrink-0 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                          {definition.settingKey}
                        </span>
                      </div>
                      {cleared.includes(definition.settingKey) ? (
                        <p className="mt-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          {t('admin.hardware.settings.clearedHint')}
                        </p>
                      ) : null}
                    </Field>
                  );
                })}
              </div>
            </SectionCard>
          ))}
        </div>
      )}

      {showHistory ? (
        <SectionCard title={t('admin.hardware.settings.historyTitle')}>
          {history.length === 0 ? (
            <EmptyBlock title={t('admin.hardware.settings.historyEmpty')} />
          ) : (
            <ul className="flex flex-col divide-y divide-slate-100 dark:divide-white/5">
              {history.map((entry) => (
                <li key={entry.revision} className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                      {t('admin.hardware.settings.revision', { revision: entry.revision })} ·{' '}
                      {t(`admin.hardware.settings.action.${entry.action}`)}
                    </p>
                    <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {entry.changedKeys.join(', ') || '-'}
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      {formatTimestamp(entry.updatedAt)} · {entry.updatedBy || '-'}
                    </p>
                  </div>
                  <SecondaryButton onClick={() => void rollback(entry)} disabled={busy}>
                    {t('admin.hardware.settings.rollback')}
                  </SecondaryButton>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      <SectionCard title={t('admin.hardware.settings.effectiveTitle')}>
        <div className="px-4 py-3">
          <JsonBlock
            label={t('admin.hardware.settings.overrides')}
            value={JSON.stringify(settings.overrides, null, 2)}
          />
          <div className="mt-3">
            <JsonBlock
              label={t('admin.hardware.settings.effective')}
              value={JSON.stringify(
                Object.fromEntries(
                  settings.definitions.map((definition) => [
                    definition.settingKey,
                    effectiveSettingValue(settings, definition.settingKey),
                  ]),
                ),
                null,
                2,
              )}
            />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
