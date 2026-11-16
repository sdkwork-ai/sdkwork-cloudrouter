import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Globe2, Loader2, RefreshCw, Save } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  fetchPlatformCorsSettings,
  updatePlatformCorsSettings,
  type PlatformCorsSettings,
} from './CorsSettingsService';
import { formatOriginLines, parseOriginLines } from './CorsOriginLines';

/**
 * `/admin/settings` → 系统配置 → CORS 跨域设置.
 *
 * The panel edits the platform-scoped framework CORS row. It is independent
 * from the auth settings form (own load/save lifecycle), because saving the
 * CORS allowlist must not require saving unrelated auth policy.
 */
export function CorsSettingsPanel() {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<PlatformCorsSettings | null>(null);
  const [originsText, setOriginsText] = useState('');
  const [allowAllOrigins, setAllowAllOrigins] = useState(false);
  const [allowCredentials, setAllowCredentials] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const applySettings = useCallback((next: PlatformCorsSettings) => {
    setSettings(next);
    setOriginsText(formatOriginLines(next.allowedOrigins));
    setAllowAllOrigins(next.allowAllOrigins);
    setAllowCredentials(next.allowCredentials);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      applySettings(await fetchPlatformCorsSettings());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('admin.authSettings.cors.errors.load'));
    } finally {
      setLoading(false);
    }
  }, [applySettings, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const origins = useMemo(() => parseOriginLines(originsText), [originsText]);

  const save = useCallback(async () => {
    setError(null);
    setSuccess(null);
    if (!allowAllOrigins && origins.length === 0) {
      setError(t('admin.authSettings.cors.errors.originsRequired'));
      return;
    }
    setSaving(true);
    try {
      const next = await updatePlatformCorsSettings({
        allowAllOrigins,
        allowedOrigins: origins,
        allowCredentials,
      });
      applySettings(next);
      setSuccess(t('admin.authSettings.cors.messages.saved'));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : t('admin.authSettings.cors.errors.save'));
    } finally {
      setSaving(false);
    }
  }, [allowAllOrigins, allowCredentials, applySettings, origins, t]);

  return (
    <section
      data-admin-cors-settings
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Globe2 className="mt-0.5 h-5 w-5 text-lobster-500" />
          <div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('admin.authSettings.cors.title')}
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t('admin.authSettings.cors.description')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.actions.reload')}
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="inline-flex items-center gap-2 rounded-lg bg-lobster-500 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {t('common.actions.save')}
          </button>
        </div>
      </div>

      {error ? (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}
      {success ? (
        <div role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
          {success}
        </div>
      ) : null}

      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="cors-allowed-origins"
            className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            {t('admin.authSettings.cors.fields.allowedOrigins')}
          </label>
          <textarea
            id="cors-allowed-origins"
            value={originsText}
            onChange={(event) => setOriginsText(event.target.value)}
            rows={7}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-slate-200 bg-white px-2.5 py-2 font-mono text-xs leading-relaxed text-slate-700 outline-none focus:border-lobster-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-100"
            placeholder={'https://mall.sdkwork.com\nhttps://*.sdkwork.com\nhttps://**.birdcoder.com'}
          />
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            {t('admin.authSettings.cors.fields.allowedOriginsHint')}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            {t('admin.authSettings.cors.fields.originCount', { count: origins.length })}
            {settings ? ` · ${t('admin.authSettings.cors.fields.version')} ${settings.version}` : ''}
          </p>
        </div>

        <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={allowCredentials}
            onChange={(event) => setAllowCredentials(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-lobster-500 focus:ring-lobster-500"
          />
          <span>
            {t('admin.authSettings.cors.fields.allowCredentials')}
            <span className="mt-0.5 block text-[11px] text-slate-400 dark:text-slate-500">
              {t('admin.authSettings.cors.fields.allowCredentialsHint')}
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={allowAllOrigins}
            onChange={(event) => setAllowAllOrigins(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-lobster-500 focus:ring-lobster-500"
          />
          <span>
            {t('admin.authSettings.cors.fields.allowAllOrigins')}
            <span className="mt-0.5 block text-[11px] text-amber-600 dark:text-amber-400">
              {t('admin.authSettings.cors.fields.allowAllOriginsHint')}
            </span>
          </span>
        </label>
      </div>
    </section>
  );
}
