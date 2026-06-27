import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe2, Loader2, MapPin, RefreshCw, Route, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons';
import type { AdminRuntimeRegionSettingsUpdateRequest } from '@sdkwork/clawrouter-backend-sdk';
import {
  DEFAULT_RUNTIME_REGION_SETTINGS,
  RuntimeRegionService,
  type RuntimeRegionSettingsForm,
} from './runtimeRegionService';

export {
  DEFAULT_RUNTIME_REGION_SETTINGS,
  RuntimeRegionService,
  toRuntimeRegionSettings,
} from './runtimeRegionService';
export type { RuntimeRegionSettingsForm } from './runtimeRegionService';

const REGION_CODE_PATTERN = /^[a-z0-9_-]+$/u;

const REGION_PRESETS = [
  { code: 'cn', name: 'China', labelKey: 'admin.runtimeRegion.presets.cn' },
  { code: 'us', name: 'United States', labelKey: 'admin.runtimeRegion.presets.us' },
  { code: 'eu', name: 'Europe', labelKey: 'admin.runtimeRegion.presets.eu' },
  { code: 'global', name: 'Global', labelKey: 'admin.runtimeRegion.presets.global' },
] as const;

export function RuntimeRegionAdmin() {
  const { t } = useTranslation();
  const [form, setForm] = useState<RuntimeRegionSettingsForm>(DEFAULT_RUNTIME_REGION_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const regionCodeError = useMemo(() => {
    const code = form.currentRegionCode.trim();
    if (!code || REGION_CODE_PATTERN.test(code)) {
      return null;
    }
    return t('admin.runtimeRegion.errors.invalidRegionCode');
  }, [form.currentRegionCode, t]);

  const loadSettings = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setLoadError(null);
    try {
      const settings = await RuntimeRegionService.fetchSettings();
      if (isActive()) {
        setForm(settings);
      }
    } catch (error) {
      if (isActive()) {
        setLoadError(errorMessage(error, t('admin.runtimeRegion.errors.loadFallback')));
      }
    } finally {
      if (isActive()) {
        setLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    void loadSettings(() => active);
    return () => {
      active = false;
    };
  }, [loadSettings]);

  const saveSettings = async () => {
    if (regionCodeError) {
      setSaveError(regionCodeError);
      setSaveSuccess(null);
      return;
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const saved = await RuntimeRegionService.updateSettings(toUpdateRequest(form));
      setForm(saved);
      setSaveSuccess(t('admin.runtimeRegion.messages.saved'));
    } catch (error) {
      setSaveError(errorMessage(error, t('admin.runtimeRegion.errors.saveFallback')));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof RuntimeRegionSettingsForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const applyPreset = (preset: typeof REGION_PRESETS[number]) => {
    setForm((current) => ({
      ...current,
      currentRegionCode: preset.code,
      currentRegionName: preset.name,
    }));
    setSaveError(null);
    setSaveSuccess(null);
  };

  if (loading) {
    return (
      <BusinessStatePanel
        className="min-h-[480px]"
        kind="loading"
        title={t('admin.runtimeRegion.loading')}
      />
    );
  }

  if (loadError) {
    return (
      <BusinessStatePanel
        className="min-h-[480px]"
        description={loadError}
        kind="error"
        onRetry={() => void loadSettings()}
        title={t('admin.runtimeRegion.errors.loadTitle')}
      />
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden">
      <div className="flex shrink-0 justify-end gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          onClick={() => void loadSettings()}
          type="button"
        >
          <RefreshCw className="h-4 w-4" />
          {t('common.actions.reload')}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={saving || Boolean(regionCodeError)}
          onClick={() => void saveSettings()}
          type="button"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {t('common.actions.save')}
        </button>
      </div>

      {saveError ? (
        <div className="shrink-0 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300" role="alert">
          {saveError}
        </div>
      ) : null}
      {saveSuccess ? (
        <div className="shrink-0 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300" role="status">
          {saveSuccess}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto pr-1" data-admin-runtime-region-scroll>
      <div className="grid min-h-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
          <SectionHeader icon={<Globe2 className="h-5 w-5 text-blue-500" />} title={t('admin.runtimeRegion.sections.current')} />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField
              error={regionCodeError}
              label={t('admin.runtimeRegion.fields.currentRegionCode')}
              onChange={(value) => updateField('currentRegionCode', value)}
              required
              value={form.currentRegionCode}
            />
            <TextField
              label={t('admin.runtimeRegion.fields.currentRegionName')}
              onChange={(value) => updateField('currentRegionName', value)}
              required
              value={form.currentRegionName}
            />
            <TextArea
              className="md:col-span-2"
              label={t('admin.runtimeRegion.fields.remark')}
              onChange={(value) => updateField('remark', value)}
              rows={5}
              value={form.remark}
            />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
          <SectionHeader icon={<MapPin className="h-5 w-5 text-emerald-500" />} title={t('admin.runtimeRegion.sections.presets')} />
          <div className="mt-5 grid grid-cols-1 gap-3">
            {REGION_PRESETS.map((preset) => {
              const active = form.currentRegionCode.trim() === preset.code;
              return (
                <button
                  className={`flex min-h-14 items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                    active
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10'
                  }`}
                  key={preset.code}
                  onClick={() => applyPreset(preset)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{t(preset.labelKey)}</span>
                    <span className="mt-0.5 block truncate text-xs opacity-70">{preset.code}</span>
                  </span>
                  <Route className="h-4 w-4 shrink-0 opacity-70" />
                </button>
              );
            })}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode, title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h3>
    </div>
  );
}

function TextField({ label, value, onChange, className = '', required = false, error = null }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  error?: string | null;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:ring-2 dark:bg-black/20 dark:text-white ${
          error
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/40'
            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10'
        }`}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
      {error ? <span className="mt-1 block text-xs text-red-600 dark:text-red-300">{error}</span> : null}
    </label>
  );
}

function TextArea({ label, value, onChange, className = '', rows = 4 }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  rows?: number;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <textarea
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        value={value}
      />
    </label>
  );
}

function toUpdateRequest(form: RuntimeRegionSettingsForm): AdminRuntimeRegionSettingsUpdateRequest {
  return {
    currentRegionCode: form.currentRegionCode.trim() || DEFAULT_RUNTIME_REGION_SETTINGS.currentRegionCode,
    currentRegionName: form.currentRegionName.trim() || DEFAULT_RUNTIME_REGION_SETTINGS.currentRegionName,
    remark: form.remark.trim() || DEFAULT_RUNTIME_REGION_SETTINGS.remark,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
