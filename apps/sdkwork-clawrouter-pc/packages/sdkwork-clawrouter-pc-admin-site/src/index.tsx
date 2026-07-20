import React, { useCallback, useEffect, useId, useState } from 'react';
import { Image, Loader2, Palette, RefreshCw, Save, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BusinessStatePanel } from '@sdkwork/clawroutes-pc-commons';
import {
  readMediaResourceUrl,
  toExternalUrlMediaResource,
} from '@sdkwork/clawroutes-pc-commons/runtime';
import {
  DEFAULT_SITE_SETTINGS,
  SiteSettingsService,
  type SiteSettingsForm,
} from './SiteSettingsService';

export { DEFAULT_SITE_SETTINGS, SiteSettingsService, toSiteSettings } from './SiteSettingsService';
export type { SiteSettingsForm } from './SiteSettingsService';
export {
  ClawRouterAuthSettingsPage,
  formatOAuthProviders,
  parseOAuthProviderText,
  toAuthSettingsForm,
  toAuthSettingsRequest,
} from './ClawRouterAuthSettingsPage';
export {
  fetchClawRouterAuthSettings,
  updateClawRouterAuthSettings,
} from './AuthSettingsService';

export function ClawRouterSiteSettingsPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<SiteSettingsForm>(DEFAULT_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const siteNameError = form.siteName.trim()
    ? null
    : t('admin.siteSettings.errors.siteNameRequired');

  const loadSettings = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setLoadError(null);
    try {
      const settings = await SiteSettingsService.fetchSettings();
      if (isActive()) {
        setForm(settings);
      }
    } catch (error) {
      if (isActive()) {
        setLoadError(errorMessage(error, t('admin.siteSettings.errors.loadFallback')));
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
    if (siteNameError) {
      setSaveError(siteNameError);
      setSaveSuccess(null);
      return;
    }
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const saved = await SiteSettingsService.updateSettings({
        ...form,
        siteName: form.siteName.trim(),
      });
      setForm(saved);
      setSaveSuccess(t('admin.siteSettings.messages.saved'));
    } catch (error) {
      setSaveError(errorMessage(error, t('admin.siteSettings.errors.saveFallback')));
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof SiteSettingsForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const updateMediaField = (field: 'logo' | 'icon' | 'favicon', value: string) => {
    setForm((current) => ({ ...current, [field]: toExternalUrlMediaResource(value, 'image') }));
  };
  const logoSource = readMediaResourceUrl(form.logo);
  const iconSource = readMediaResourceUrl(form.icon);
  const faviconSource = readMediaResourceUrl(form.favicon);

  if (loading) {
    return (
      <BusinessStatePanel
        className="min-h-[480px]"
        kind="loading"
        title={t('admin.siteSettings.loading')}
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
        title={t('admin.siteSettings.errors.loadTitle')}
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
            disabled={saving || Boolean(siteNameError)}
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

      <div className="min-h-0 flex-1 overflow-y-auto pr-1" data-admin-site-settings-scroll>
      <div className="grid min-h-0 grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
          <SectionHeader icon={<Settings2 className="h-5 w-5 text-blue-500" />} title={t('admin.siteSettings.sections.identity')} />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField error={siteNameError} label={t('admin.siteSettings.fields.siteName')} onChange={(value) => updateField('siteName', value)} required value={form.siteName} />
            <TextField label={t('admin.siteSettings.fields.shortName')} onChange={(value) => updateField('shortName', value)} value={form.shortName} />
            <TextArea className="md:col-span-2" label={t('admin.siteSettings.fields.description')} onChange={(value) => updateField('description', value)} rows={3} value={form.description} />
            <TextField label={t('admin.siteSettings.fields.seoTitle')} onChange={(value) => updateField('seoTitle', value)} value={form.seoTitle} />
            <TextField label={t('admin.siteSettings.fields.seoDescription')} onChange={(value) => updateField('seoDescription', value)} value={form.seoDescription} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
          <SectionHeader icon={<Image className="h-5 w-5 text-emerald-500" />} title={t('admin.siteSettings.sections.assets')} />
          <div className="mt-5 grid grid-cols-1 gap-4">
            <TextField label={t('admin.siteSettings.fields.logo')} onChange={(value) => updateMediaField('logo', value)} value={logoSource} />
            <TextField label={t('admin.siteSettings.fields.icon')} onChange={(value) => updateMediaField('icon', value)} value={iconSource} />
            <TextField label={t('admin.siteSettings.fields.favicon')} onChange={(value) => updateMediaField('favicon', value)} value={faviconSource} />
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 dark:bg-white">
                {logoSource ? <img alt={form.siteName} className="h-7 w-7 object-contain" src={logoSource} /> : <Image className="h-5 w-5 text-white dark:text-slate-900" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{form.shortName || form.siteName}</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{logoSource || t('admin.siteSettings.preview.noLogo')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
          <SectionHeader icon={<Palette className="h-5 w-5 text-purple-500" />} title={t('admin.siteSettings.sections.theme')} />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <ColorField label={t('admin.siteSettings.fields.brandColor')} onChange={(value) => updateField('brandColor', value)} value={form.brandColor} />
            <ColorField label={t('admin.siteSettings.fields.accentColor')} onChange={(value) => updateField('accentColor', value)} value={form.accentColor} />
            <TextArea className="md:col-span-2" label={t('admin.siteSettings.fields.customCss')} onChange={(value) => updateField('customCss', value)} rows={6} value={form.customCss} />
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
          <SectionHeader icon={<Settings2 className="h-5 w-5 text-slate-500" />} title={t('admin.siteSettings.sections.links')} />
          <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextField label={t('admin.siteSettings.fields.docsUrl')} onChange={(value) => updateField('docsUrl', value)} value={form.docsUrl} />
            <TextField label={t('admin.siteSettings.fields.supportUrl')} onChange={(value) => updateField('supportUrl', value)} value={form.supportUrl} />
            <TextField label={t('admin.siteSettings.fields.privacyUrl')} onChange={(value) => updateField('privacyUrl', value)} value={form.privacyUrl} />
            <TextField label={t('admin.siteSettings.fields.termsUrl')} onChange={(value) => updateField('termsUrl', value)} value={form.termsUrl} />
            <TextField className="md:col-span-2" label={t('admin.siteSettings.fields.footerCopyright')} onChange={(value) => updateField('footerCopyright', value)} value={form.footerCopyright} />
            <div className="md:col-span-2">
              <SectionDivider title={t('admin.siteSettings.sections.filings')} />
            </div>
            <TextField label={t('admin.siteSettings.fields.icpRecordNumber')} onChange={(value) => updateField('icpRecordNumber', value)} value={form.icpRecordNumber} />
            <TextField label={t('admin.siteSettings.fields.icpRecordUrl')} onChange={(value) => updateField('icpRecordUrl', value)} value={form.icpRecordUrl} />
            <TextField label={t('admin.siteSettings.fields.policeRecordNumber')} onChange={(value) => updateField('policeRecordNumber', value)} value={form.policeRecordNumber} />
            <TextField label={t('admin.siteSettings.fields.policeRecordUrl')} onChange={(value) => updateField('policeRecordUrl', value)} value={form.policeRecordUrl} />
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

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</span>
      <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

function TextField({ label, value, onChange, className = '', error = null, required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  error?: string | null;
  required?: boolean;
}) {
  const errorId = useId();
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? 'true' : undefined}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:ring-2 dark:bg-black/20 dark:text-white ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500/60'
            : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20 dark:border-white/10'
        }`}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        value={value}
      />
      {error ? (
        <span className="mt-1 block text-xs text-red-600 dark:text-red-400" id={errorId} role="alert">
          {error}
        </span>
      ) : null}
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

function ColorField({ label, value, onChange }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <div className="flex gap-2">
        <input
          className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-black/20"
          onChange={(event) => onChange(event.target.value)}
          type="color"
          value={/^#[0-9a-f]{6}$/iu.test(value) ? value : '#0f172a'}
        />
        <input
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      </div>
    </label>
  );
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
