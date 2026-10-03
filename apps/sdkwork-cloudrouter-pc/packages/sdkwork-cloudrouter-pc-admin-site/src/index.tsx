import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Download,
  Fingerprint,
  Home,
  Image,
  Languages,
  Layout,
  Link2,
  Loader2,
  Palette,
  Plus,
  QrCode,
  RefreshCw,
  Save,
  Share2,
  Trash2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DriveUploadImage } from 'sdkwork-drive-pc-upload-image';
import { getLoadErrorMessage } from '@sdkwork/cloudroutes-pc-commons/runtime';
import { BusinessStatePanel } from '@sdkwork/cloudroutes-pc-commons';
import {
  cloudRouterMediaResourceToDriveUploadImageValue,
  driveUploadImageValueToCloudRouterMediaResource,
  getCloudRouterDriveImageService,
  getCloudRouterUploadSlot,
  readMediaResourceUrl,
  type CloudRouterMediaResource,
  type CloudRouterUploadSlotCode,
} from '@sdkwork/cloudroutes-pc-commons/runtime';
import {
  FOOTER_SECTIONS,
  QR_CHANNELS,
  QR_UPLOAD_SLOT,
  SOCIAL_PLATFORMS,
  socialPlatformFieldNames,
  type FooterSectionDefinition,
  type SocialPlatformDefinition,
} from '@sdkwork/cloudroutes-pc-commons/footer-settings';
import { SocialPlatformTile } from '@sdkwork/cloudroutes-pc-commons/footer-glyphs';
import {
  DEFAULT_SITE_SETTINGS,
  SITE_SETTINGS_I18N_FIELDS,
  SITE_SETTINGS_LOCALES,
  SiteSettingsService,
  siteSettingsI18nFieldFor,
  type SiteSettingsCopyField,
  type SiteSettingsForm,
  type SiteSettingsI18nField,
  type SiteSettingsLocale,
} from './SiteSettingsService';
import {
  CATEGORY_FIELDS,
  SITE_SETTINGS_CATEGORY_IDS,
  type SiteSettingsCategoryId,
} from './siteSettingsCategories';
import {
  HOME_LABEL_MAX_LENGTH,
  HOME_MAX_COLLECTION_ROWS,
  HOME_SECTIONS,
  HOME_TEXT_MAX_LENGTH,
  checkDownloadCatalog,
  findIncompleteHomeContent,
  type DownloadCatalogCheck,
  type HomeContentForm,
  type HomeContentWarningCode,
  type HomeFeatureFields,
  type HomeLinkFields,
  type HomeModalityFields,
  type HomeSectionCode,
  type HomeStatFields,
} from './siteContentFields';

export { DEFAULT_SITE_SETTINGS, SiteSettingsService, toSiteSettings } from './SiteSettingsService';
export type { SiteSettingsForm } from './SiteSettingsService';
export {
  CATEGORY_FIELDS,
  findDuplicatedSiteSettingsFields,
  findUnreachableSiteSettingsFields,
} from './siteSettingsCategories';
export type { SiteSettingsCategoryId } from './siteSettingsCategories';
export {
  DOWNLOAD_CATALOG_SCHEMA_VERSION,
  HOME_SECTIONS,
  checkDownloadCatalog,
  findIncompleteHomeContent,
  readDownloadCatalogText,
  readHomeContentForm,
  toDownloadCatalogPayload,
  toHomeContentPayload,
} from './siteContentFields';
export type {
  DownloadCatalogCheck,
  HomeContentForm,
  HomeContentWarningCode,
} from './siteContentFields';
export {
  CloudRouterAuthSettingsPage,
  formatOAuthProviders,
  parseOAuthProviderText,
  toAuthSettingsForm,
  toAuthSettingsRequest,
} from './CloudRouterAuthSettingsPage';
export {
  fetchCloudRouterAuthSettings,
  updateCloudRouterAuthSettings,
} from './AuthSettingsService';

type MediaFieldName =
  | 'logo'
  | 'icon'
  | 'favicon'
  | 'officialAccountQrCode'
  | 'videoChannelQrCode'
  | 'douyinQrCode'
  | 'communityGroupQrCode';

/**
 * One row per follow channel, read from the shared registry so the console cannot offer a
 * channel the footer does not render (or miss one it does). The console wording lives in
 * `adminLabelKey` / `adminDescriptionKey`; the footer labels the same channel differently and
 * reads its own pair off the same entry.
 */
const QR_CODE_SLOTS = QR_CHANNELS.map((channel) => ({
  code: channel.code,
  mediaField: channel.mediaField,
  visibilityField: channel.visibilityField,
  labelKey: channel.adminLabelKey,
  descriptionKey: channel.adminDescriptionKey,
}));

const SITE_SETTINGS_CATEGORIES: ReadonlyArray<{
  id: SiteSettingsCategoryId;
  icon: React.ComponentType<{ className?: string }>;
  labelKey: string;
  descriptionKey: string;
}> = [
  {
    id: 'identity',
    icon: Fingerprint,
    labelKey: 'admin.siteSettings.categories.identity.label',
    descriptionKey: 'admin.siteSettings.categories.identity.description',
  },
  {
    id: 'assets',
    icon: Image,
    labelKey: 'admin.siteSettings.categories.assets.label',
    descriptionKey: 'admin.siteSettings.categories.assets.description',
  },
  {
    id: 'theme',
    icon: Palette,
    labelKey: 'admin.siteSettings.categories.theme.label',
    descriptionKey: 'admin.siteSettings.categories.theme.description',
  },
  {
    id: 'homepage',
    icon: Home,
    labelKey: 'admin.siteSettings.categories.homepage.label',
    descriptionKey: 'admin.siteSettings.categories.homepage.description',
  },
  {
    id: 'downloads',
    icon: Download,
    labelKey: 'admin.siteSettings.categories.downloads.label',
    descriptionKey: 'admin.siteSettings.categories.downloads.description',
  },
  {
    id: 'social',
    icon: Share2,
    labelKey: 'admin.siteSettings.categories.social.label',
    descriptionKey: 'admin.siteSettings.categories.social.description',
  },
  {
    id: 'qrCodes',
    icon: QrCode,
    labelKey: 'admin.siteSettings.categories.qrCodes.label',
    descriptionKey: 'admin.siteSettings.categories.qrCodes.description',
  },
  {
    id: 'footerLayout',
    icon: Layout,
    labelKey: 'admin.siteSettings.categories.footerLayout.label',
    descriptionKey: 'admin.siteSettings.categories.footerLayout.description',
  },
  {
    id: 'links',
    icon: Link2,
    labelKey: 'admin.siteSettings.categories.links.label',
    descriptionKey: 'admin.siteSettings.categories.links.description',
  },
];

if (SITE_SETTINGS_CATEGORIES.length !== SITE_SETTINGS_CATEGORY_IDS.length) {
  // A tab that exists in the field map but not in this list would make its fields unreachable.
  throw new Error('Every site-settings category needs exactly one tab definition.');
}

export function CloudRouterSiteSettingsPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState<SiteSettingsForm>(DEFAULT_SITE_SETTINGS);
  /**
   * The last value the server confirmed. Kept separately from `form` so "unsaved changes" is a
   * comparison rather than a manually maintained flag that can drift out of step.
   */
  const [savedForm, setSavedForm] = useState<SiteSettingsForm>(DEFAULT_SITE_SETTINGS);
  const [activeCategory, setActiveCategory] = useState<SiteSettingsCategoryId>('identity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const siteNameError = form.siteName.trim()
    ? null
    : t('admin.siteSettings.errors.siteNameRequired');
  /**
   * Homepage entries the landing page would skip — a half-written link or row.
   *
   * A warning rather than a blocker: the runtime already drops an incomplete entry at render, so
   * saving one publishes nothing broken, and refusing to save would trap an operator mid-edit.
   */
  const homepageWarnings = useMemo(() => findIncompleteHomeContent(form.homepage), [form.homepage]);
  /**
   * The download catalog's verdict, derived from the text instead of cached in state.
   *
   * Derived because the tab body, the sidebar badge and the save guard all have to agree about
   * whether the document is publishable; a second copy of the answer is how they stop agreeing.
   */
  const downloadCatalogCheck = useMemo(() => checkDownloadCatalog(form.downloads), [form.downloads]);

  const loadSettings = useCallback(async (isActive: () => boolean = () => true) => {
    setLoading(true);
    setLoadError(null);
    try {
      const settings = await SiteSettingsService.fetchSettings();
      if (isActive()) {
        setForm(settings);
        setSavedForm(settings);
        setSaveError(null);
        setSaveSuccess(null);
      }
    } catch (error) {
      if (isActive()) {
        setLoadError(errorMessage(error, t('admin.siteSettings.errors.loadFallback'), t));
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

  const dirtyFields = useMemo(() => {
    const changed = new Set<keyof SiteSettingsForm>();
    for (const key of Object.keys(form) as Array<keyof SiteSettingsForm>) {
      if (!fieldValuesEqual(form[key], savedForm[key])) {
        changed.add(key);
      }
    }
    return changed;
  }, [form, savedForm]);

  /**
   * Per-tab counters. `errors` block saving, `warnings` do not — a switched-on account with no
   * link is a legitimate intermediate state, it just will not render.
   */
  const categoryStatus = useMemo(() => {
    const status = {} as Record<
      SiteSettingsCategoryId,
      { changes: number; errors: number; warnings: number }
    >;
    for (const category of SITE_SETTINGS_CATEGORIES) {
      const fields = CATEGORY_FIELDS[category.id];
      let changes = 0;
      for (const field of fields) {
        if (dirtyFields.has(field)) {
          changes += 1;
        }
      }
      let errors = 0;
      let warnings = 0;
      if (category.id === 'identity' && siteNameError) {
        errors = 1;
      }
      if (category.id === 'homepage') {
        warnings = homepageWarnings.length;
      }
      if (category.id === 'downloads' && !downloadCatalogCheck.ok) {
        // An unparseable catalog cannot be sent at all, so this blocks saving rather than warning.
        errors = 1;
      }
      if (category.id === 'social') {
        warnings = countPlatformsMissingLinks(form);
      }
      status[category.id] = { changes, errors, warnings };
    }
    return status;
  }, [dirtyFields, downloadCatalogCheck, form, homepageWarnings, siteNameError]);

  const dirtyCount = dirtyFields.size;

  const saveSettings = async () => {
    if (siteNameError) {
      setSaveError(siteNameError);
      setSaveSuccess(null);
      return;
    }
    if (!downloadCatalogCheck.ok) {
      // The button is disabled while the catalog is unparseable, so this is the second half of one
      // rule rather than a second rule: whichever path reaches a save, the document is checked.
      setSaveError(t('admin.siteSettings.errors.downloadsInvalid'));
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
      setSavedForm(saved);
      setSaveSuccess(t('admin.siteSettings.messages.saved'));
    } catch (error) {
      setSaveError(errorMessage(error, t('admin.siteSettings.errors.saveFallback'), t));
    } finally {
      setSaving(false);
    }
  };

  const discardChanges = () => {
    setForm(savedForm);
    setSaveError(null);
    setSaveSuccess(null);
  };

  const updateField = (field: keyof SiteSettingsForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const updateBooleanField = (field: keyof SiteSettingsForm, value: boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  /**
   * Writes one language's override for one copy field.
   *
   * A blank value deletes the entry instead of storing an empty string, so the form state stays in
   * the same shape the backend normalizes to: "no override" and "override to nothing" resolve to
   * the base copy either way, and only the first keeps the dirty counter honest.
   */
  const updateI18nField = (
    i18nField: SiteSettingsI18nField,
    locale: SiteSettingsLocale,
    value: string,
  ) => {
    setForm((current) => {
      const map = { ...current[i18nField] };
      if (value.trim().length === 0) {
        delete map[locale];
      } else {
        map[locale] = value;
      }
      return { ...current, [i18nField]: map };
    });
  };
  /** Drops every override for one language, i.e. "publish the base copy here". */
  const clearLocaleTranslations = (locale: SiteSettingsLocale) => {
    setForm((current) => {
      const next = { ...current };
      for (const { i18nField } of SITE_SETTINGS_I18N_FIELDS) {
        const map = { ...next[i18nField] };
        delete map[locale];
        next[i18nField] = map;
      }
      return next;
    });
  };
  const updateMediaField = (field: MediaFieldName, media: CloudRouterMediaResource | undefined) => {
    setForm((current) => ({ ...current, [field]: media }));
  };
  /**
   * Replaces the whole homepage document.
   *
   * The editor hands back a new object every time rather than mutating one, which keeps
   * `DEFAULT_SITE_SETTINGS.homepage` — the object the page starts from — from being edited in
   * place, and keeps the dirty counter's comparison an identity-free value compare.
   */
  const updateHomeContent = (next: HomeContentForm) => {
    setForm((current) => ({ ...current, homepage: next }));
  };
  const updateDownloadCatalog = (next: string) => {
    setForm((current) => ({ ...current, downloads: next }));
  };
  const logoSource = readMediaResourceUrl(form.logo);

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
        retryLabel={t('common.actions.retry')}
        title={t('admin.siteSettings.errors.loadTitle')}
      />
    );
  }

  const activeDefinition =
    SITE_SETTINGS_CATEGORIES.find((category) => category.id === activeCategory)
    ?? SITE_SETTINGS_CATEGORIES[0];

  /**
   * The translated copy fields the active tab owns.
   *
   * Filtered through `CATEGORY_FIELDS` rather than restated: the tab that renders `siteName` is
   * by definition the tab that edits `siteNameI18n`, so the two lists cannot drift apart.
   */
  const translationFields = SITE_SETTINGS_I18N_FIELDS
    .map(({ field }) => field)
    .filter((field) => CATEGORY_FIELDS[activeCategory].includes(field));

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col gap-3 overflow-hidden">
      {/* Sticky action bar: the save affordance stays reachable from any tab, and the badge beside
          it answers "do I need to save?" before the operator has to go looking. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3 dark:border-white/10">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
            dirtyCount > 0
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
          }`}
          data-admin-site-unsaved-count={dirtyCount}
          role="status"
        >
          {dirtyCount > 0 ? (
            <>
              <CircleDot className="h-3.5 w-3.5" />
              {t('admin.siteSettings.status.unsavedChanges', { count: dirtyCount })}
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t('admin.siteSettings.status.allSaved')}
            </>
          )}
        </span>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            disabled={dirtyCount === 0 || saving}
            onClick={discardChanges}
            type="button"
          >
            {t('admin.siteSettings.actions.discardChanges')}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            onClick={() => void loadSettings()}
            type="button"
          >
            <RefreshCw className="h-4 w-4" />
            {t('common.actions.reload')}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-lobster-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-lobster-600 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={saving || Boolean(siteNameError) || !downloadCatalogCheck.ok || dirtyCount === 0}
            onClick={() => void saveSettings()}
            type="button"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('common.actions.save')}
          </button>
        </div>
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

      <div className="flex min-h-0 flex-1 gap-5">
        <nav
          aria-label={t('admin.siteSettings.categories.ariaLabel')}
          aria-orientation="vertical"
          className="flex w-52 shrink-0 flex-col gap-1 overflow-y-auto pr-1 lg:w-56"
          data-admin-site-category-nav
          role="tablist"
        >
          {SITE_SETTINGS_CATEGORIES.map((category) => (
            <CategoryTab
              active={category.id === activeCategory}
              icon={category.icon}
              id={category.id}
              key={category.id}
              label={t(category.labelKey)}
              onSelect={() => setActiveCategory(category.id)}
              status={categoryStatus[category.id]}
            />
          ))}
        </nav>

        <section
          aria-labelledby={`site-settings-tab-${activeCategory}`}
          className="min-h-0 min-w-0 flex-1 overflow-y-auto pr-1"
          data-admin-site-panel={activeCategory}
          data-admin-site-settings-scroll
          id={`site-settings-panel-${activeCategory}`}
          role="tabpanel"
        >
          <header className="mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">
              {t(activeDefinition.labelKey)}
            </h2>
            <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {t(activeDefinition.descriptionKey)}
            </p>
          </header>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1a1a1a]">
            {activeCategory === 'identity' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField error={siteNameError} label={t('admin.siteSettings.fields.siteName')} onChange={(value) => updateField('siteName', value)} required value={form.siteName} />
                <TextField label={t('admin.siteSettings.fields.shortName')} onChange={(value) => updateField('shortName', value)} value={form.shortName} />
                <TextArea className="md:col-span-2" label={t('admin.siteSettings.fields.description')} onChange={(value) => updateField('description', value)} rows={3} value={form.description} />
                <TextField label={t('admin.siteSettings.fields.seoTitle')} onChange={(value) => updateField('seoTitle', value)} value={form.seoTitle} />
                <TextField label={t('admin.siteSettings.fields.seoDescription')} onChange={(value) => updateField('seoDescription', value)} value={form.seoDescription} />
              </div>
            ) : null}

            {activeCategory === 'assets' ? (
              <div className="grid grid-cols-1 gap-4">
                <MediaUploadField
                  label={t('admin.siteSettings.fields.logo')}
                  onChange={(media) => updateMediaField('logo', media)}
                  slot="site-logo"
                  value={form.logo}
                />
                <MediaUploadField
                  label={t('admin.siteSettings.fields.icon')}
                  onChange={(media) => updateMediaField('icon', media)}
                  slot="site-icon"
                  value={form.icon}
                />
                <MediaUploadField
                  label={t('admin.siteSettings.fields.favicon')}
                  onChange={(media) => updateMediaField('favicon', media)}
                  slot="site-favicon"
                  value={form.favicon}
                />
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
            ) : null}

            {activeCategory === 'theme' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <ColorField label={t('admin.siteSettings.fields.brandColor')} onChange={(value) => updateField('brandColor', value)} value={form.brandColor} />
                <ColorField label={t('admin.siteSettings.fields.accentColor')} onChange={(value) => updateField('accentColor', value)} value={form.accentColor} />
                <TextArea className="md:col-span-2" label={t('admin.siteSettings.fields.customCss')} onChange={(value) => updateField('customCss', value)} rows={6} value={form.customCss} />
              </div>
            ) : null}

            {activeCategory === 'homepage' ? (
              <HomeContentFields onChange={updateHomeContent} value={form.homepage} />
            ) : null}

            {activeCategory === 'downloads' ? (
              <DownloadCatalogField
                check={downloadCatalogCheck}
                onChange={updateDownloadCatalog}
                value={form.downloads}
              />
            ) : null}

            {activeCategory === 'social' ? (
              <div className="grid grid-cols-1 gap-3">
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {t('admin.siteSettings.social.intro')}
                </p>
                {SOCIAL_PLATFORMS.map((definition) => {
                  const names = socialPlatformFieldNames(definition.code);
                  return (
                    <SocialPlatformField
                      definition={definition}
                      enabled={form[names.enabled as keyof SiteSettingsForm] === true}
                      key={definition.code}
                      onEnabledChange={(enabled) => updateBooleanField(names.enabled as keyof SiteSettingsForm, enabled)}
                      onUrlChange={(url) => updateField(names.url as keyof SiteSettingsForm, url)}
                      url={String(form[names.url as keyof SiteSettingsForm] ?? '')}
                    />
                  );
                })}
              </div>
            ) : null}

            {activeCategory === 'qrCodes' ? (
              <div className="grid grid-cols-1 gap-4">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('admin.siteSettings.hints.qrCodePlaceholder')}
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  {QR_CODE_SLOTS.map((slot) => (
                    <QrCodeSlotField
                      code={slot.code}
                      description={t(slot.descriptionKey)}
                      enabled={form[slot.visibilityField]}
                      key={slot.mediaField}
                      label={t(slot.labelKey)}
                      onChange={(media) => updateMediaField(slot.mediaField, media)}
                      onEnabledChange={(enabled) => updateBooleanField(slot.visibilityField, enabled)}
                      value={form[slot.mediaField]}
                    />
                  ))}
                </div>
              </div>
            ) : null}

            {activeCategory === 'footerLayout' ? (
              <div className="grid grid-cols-1 gap-3">
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {t('admin.siteSettings.footerSections.intro')}
                </p>
                {FOOTER_SECTIONS.map((section) => (
                  <FooterRegionField
                    definition={section}
                    enabled={form[section.field as keyof SiteSettingsForm] === true}
                    key={section.code}
                    onChange={(enabled) => updateBooleanField(section.field as keyof SiteSettingsForm, enabled)}
                  />
                ))}
              </div>
            ) : null}

            {activeCategory === 'links' ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <TextField className="md:col-span-2" label={t('admin.siteSettings.fields.footerCopyright')} onChange={(value) => updateField('footerCopyright', value)} value={form.footerCopyright} />
                <div className="md:col-span-2">
                  <SectionDivider title={t('admin.siteSettings.sections.links')} />
                </div>
                <TextField label={t('admin.siteSettings.fields.docsUrl')} onChange={(value) => updateField('docsUrl', value)} value={form.docsUrl} />
                <TextField label={t('admin.siteSettings.fields.supportUrl')} onChange={(value) => updateField('supportUrl', value)} value={form.supportUrl} />
                <TextField label={t('admin.siteSettings.fields.privacyUrl')} onChange={(value) => updateField('privacyUrl', value)} value={form.privacyUrl} />
                <TextField label={t('admin.siteSettings.fields.termsUrl')} onChange={(value) => updateField('termsUrl', value)} value={form.termsUrl} />
                <div className="md:col-span-2">
                  <SectionDivider title={t('admin.siteSettings.sections.filings')} />
                </div>
                <TextField label={t('admin.siteSettings.fields.icpRecordNumber')} onChange={(value) => updateField('icpRecordNumber', value)} value={form.icpRecordNumber} />
                <TextField label={t('admin.siteSettings.fields.icpRecordUrl')} onChange={(value) => updateField('icpRecordUrl', value)} value={form.icpRecordUrl} />
                <TextField label={t('admin.siteSettings.fields.policeRecordNumber')} onChange={(value) => updateField('policeRecordNumber', value)} value={form.policeRecordNumber} />
                <TextField label={t('admin.siteSettings.fields.policeRecordUrl')} onChange={(value) => updateField('policeRecordUrl', value)} value={form.policeRecordUrl} />
              </div>
            ) : null}

            {translationFields.length > 0 ? (
              <div className="mt-6">
                <SectionDivider title={t('admin.siteSettings.sections.translations')} />
                <div className="mt-4">
                  <TranslationsPanel
                    copyFields={translationFields}
                    form={form}
                    onClearLocale={clearLocaleTranslations}
                    onChange={updateI18nField}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * One entry in the vertical tab list. The badge answers the two questions an operator has while
 * navigating: "did I change something here?" and "is anything wrong here?".
 */
function CategoryTab({
  active,
  icon: Icon,
  id,
  label,
  onSelect,
  status,
}: {
  active: boolean;
  icon: React.ComponentType<{ className?: string }>;
  id: SiteSettingsCategoryId;
  label: string;
  onSelect: () => void;
  status: { changes: number; errors: number; warnings: number };
}) {
  const { t } = useTranslation();
  return (
    <button
      aria-controls={`site-settings-panel-${id}`}
      aria-selected={active}
      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
        active
          ? 'bg-lobster-500/10 font-semibold text-lobster-600 dark:bg-lobster-500/15 dark:text-lobster-300'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5'
      }`}
      data-admin-site-category={id}
      data-admin-site-category-changes={status.changes}
      data-admin-site-category-errors={status.errors}
      data-admin-site-category-warnings={status.warnings}
      id={`site-settings-tab-${id}`}
      onClick={onSelect}
      role="tab"
      type="button"
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {status.errors > 0 ? (
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-300"
          title={t('admin.siteSettings.status.categoryDirty', { count: status.errors })}
        >
          {status.errors}
        </span>
      ) : null}
      {status.errors === 0 && status.changes > 0 ? (
        <span
          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300"
          title={t('admin.siteSettings.status.categoryDirty', { count: status.changes })}
        >
          {status.changes}
        </span>
      ) : null}
      {status.errors === 0 && status.changes === 0 && status.warnings > 0 ? (
        <span
          className="inline-flex shrink-0 items-center"
          title={t('admin.siteSettings.status.categoryDirty', { count: status.warnings })}
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
        </span>
      ) : null}
    </button>
  );
}

/** A follow-us row: brand tile preview, on/off switch, and the account's link. */
function SocialPlatformField({
  definition,
  enabled,
  url,
  onEnabledChange,
  onUrlChange,
}: {
  definition: SocialPlatformDefinition;
  enabled: boolean;
  url: string;
  onEnabledChange: (enabled: boolean) => void;
  onUrlChange: (url: string) => void;
}) {
  const { t } = useTranslation();
  const label = t(definition.labelKey);
  const missingLink = enabled && url.trim().length === 0;
  return (
    <div
      className="rounded-lg bg-slate-50 p-4 dark:bg-white/5"
      data-admin-site-social-platform={definition.code}
    >
      <div className="flex flex-wrap items-center gap-3">
        <SocialPlatformTile definition={definition} muted={!enabled} title={label} />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
          <VisibilityPill enabled={enabled} />
        </div>
        <ToggleSwitch
          checked={enabled}
          label={label}
          onChange={onEnabledChange}
        />
      </div>
      <div className="mt-3">
        <TextField
          label={t('admin.siteSettings.social.linkLabel')}
          onChange={onUrlChange}
          placeholder={definition.urlPlaceholder}
          value={url}
        />
        {missingLink ? (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {t('admin.siteSettings.social.missingLink')}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** One switchable footer region. */
function FooterRegionField({
  definition,
  enabled,
  onChange,
}: {
  definition: FooterSectionDefinition;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  const { t } = useTranslation();
  const label = t(definition.labelKey);
  return (
    <div
      className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4 dark:bg-white/5"
      data-admin-site-footer-region={definition.code}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
          <VisibilityPill enabled={enabled} />
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {t(definition.descriptionKey)}
        </p>
      </div>
      <ToggleSwitch checked={enabled} label={label} onChange={onChange} />
    </div>
  );
}

/**
 * The homepage editor.
 *
 * Grouped the way the landing page is laid out rather than the way the payload nests: the region
 * switches come first, then one block per region holding only the copy that region renders.
 * `HomeContentForm` is flat, so without that grouping an operator would have to know the shape of
 * the stored document to find a field.
 *
 * Every control writes through `onChange` and builds a new object rather than mutating `value`:
 * the page starts from `DEFAULT_SITE_SETTINGS`, one shared object, so an in-place edit would follow
 * the operator into the next mount.
 */
function HomeContentFields({
  value,
  onChange,
}: {
  value: HomeContentForm;
  onChange: (next: HomeContentForm) => void;
}) {
  const { t } = useTranslation();
  const warnings = findIncompleteHomeContent(value);
  const warned = (code: HomeContentWarningCode) => warnings.includes(code);
  const warningText = (code: HomeContentWarningCode) => (warned(code) ? t(WARNING_LABEL_KEYS[code]) : null);
  const patch = (partial: Partial<HomeContentForm>) => onChange({ ...value, ...partial });

  const patchSection = (code: HomeSectionCode, enabled: boolean) =>
    patch({ sections: { ...value.sections, [code]: enabled } });

  const patchLink = (
    key: 'ctaPrimaryCta' | 'ctaSecondaryCta' | 'heroPrimaryCta' | 'heroSecondaryCta',
    next: HomeLinkFields,
  ) => patch({ [key]: next } as Partial<HomeContentForm>);

  /** Row editors rebuild the array: indexing into it would mutate the array the form state holds. */
  const patchRows = <T,>(rows: readonly T[], index: number, partial: Partial<T>): T[] =>
    rows.map((row, position) => (position === index ? { ...row, ...partial } : row));

  const removeRow = <T,>(rows: readonly T[], index: number): T[] =>
    rows.filter((_, position) => position !== index);

  const canAdd = (rows: readonly unknown[]) => rows.length < HOME_MAX_COLLECTION_ROWS;

  return (
    <div className="grid grid-cols-1 gap-5">
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('admin.siteSettings.homeContent.intro')}
      </p>

      <SectionDivider title={t('admin.siteSettings.homeContent.groups.basics')} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TextField
          label={t('admin.siteSettings.homeContent.fields.productName')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ productName: next })}
          value={value.productName}
        />
        <TextField
          label={t('admin.siteSettings.homeContent.fields.tagline')}
          maxLength={HOME_TEXT_MAX_LENGTH}
          onChange={(next) => patch({ tagline: next })}
          value={value.tagline}
        />
        <TextField
          label={t('admin.siteSettings.homeContent.fields.version')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ version: next })}
          value={value.version}
        />
      </div>

      <SectionDivider title={t('admin.siteSettings.homeContent.groups.sections')} />
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('admin.siteSettings.homeContent.sectionsIntro')}
      </p>
      <div className="grid grid-cols-1 gap-3">
        {HOME_SECTIONS.map((section) => (
          <div
            className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 p-4 dark:bg-white/5"
            data-admin-site-home-section={section.code}
            key={section.code}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t(section.labelKey)}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    value.sections[section.code]
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                  }`}
                >
                  {value.sections[section.code]
                    ? t('admin.siteSettings.hints.homeSectionVisible')
                    : t('admin.siteSettings.hints.homeSectionHidden')}
                </span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {t(section.descriptionKey)}
              </p>
            </div>
            <ToggleSwitch
              checked={value.sections[section.code]}
              label={t(section.labelKey)}
              onChange={(enabled) => patchSection(section.code, enabled)}
            />
          </div>
        ))}
      </div>

      <SectionDivider title={t('admin.siteSettings.homeContent.groups.hero')} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label={t('admin.siteSettings.homeContent.fields.badge')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ heroBadge: next })}
          value={value.heroBadge}
        />
        <TextField
          label={t('admin.siteSettings.homeContent.fields.titleLead')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ heroTitleLead: next })}
          value={value.heroTitleLead}
        />
        <TextField
          label={t('admin.siteSettings.homeContent.fields.titleHighlight')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ heroTitleHighlight: next })}
          value={value.heroTitleHighlight}
        />
        <TextArea
          label={t('admin.siteSettings.homeContent.fields.subtitle')}
          maxLength={HOME_TEXT_MAX_LENGTH}
          onChange={(next) => patch({ heroSubtitle: next })}
          rows={2}
          value={value.heroSubtitle}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LinkPairFields
          label={t('admin.siteSettings.homeContent.fields.primaryCta')}
          onChange={(next) => patchLink('heroPrimaryCta', next)}
          value={value.heroPrimaryCta}
          warning={warningText('hero.primaryCta')}
        />
        <LinkPairFields
          label={t('admin.siteSettings.homeContent.fields.secondaryCta')}
          onChange={(next) => patchLink('heroSecondaryCta', next)}
          value={value.heroSecondaryCta}
          warning={warningText('hero.secondaryCta')}
        />
      </div>
      <CollectionList
        addLabel={t('admin.siteSettings.homeContent.actions.addStat')}
        canAdd={canAdd(value.heroStats)}
        onAdd={() => patch({ heroStats: [...value.heroStats, { label: '', value: '' } satisfies HomeStatFields] })}
        title={t('admin.siteSettings.homeContent.statRows')}
        warning={warningText('hero.stats')}
      >
        {value.heroStats.map((row, index) => (
          <CollectionRow
            key={`hero-stat-${index}`}
            onRemove={() => patch({ heroStats: removeRow(value.heroStats, index) })}
            removeLabel={t('admin.siteSettings.homeContent.actions.removeEntry')}
          >
            <TextField
              label={t('admin.siteSettings.homeContent.fields.statValue')}
              maxLength={HOME_LABEL_MAX_LENGTH}
              onChange={(next) => patch({ heroStats: patchRows(value.heroStats, index, { value: next }) })}
              value={row.value}
            />
            <TextField
              label={t('admin.siteSettings.homeContent.fields.statLabel')}
              maxLength={HOME_LABEL_MAX_LENGTH}
              onChange={(next) => patch({ heroStats: patchRows(value.heroStats, index, { label: next }) })}
              value={row.label}
            />
          </CollectionRow>
        ))}
      </CollectionList>

      <SectionDivider title={t('admin.siteSettings.homeContent.groups.modalities')} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label={t('admin.siteSettings.homeContent.fields.badge')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ modalityBadge: next })}
          value={value.modalityBadge}
        />
        <TextField
          label={t('admin.siteSettings.homeContent.fields.titleLead')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ modalityTitleLead: next })}
          value={value.modalityTitleLead}
        />
        <TextField
          label={t('admin.siteSettings.homeContent.fields.titleHighlight')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ modalityTitleHighlight: next })}
          value={value.modalityTitleHighlight}
        />
        <TextArea
          label={t('admin.siteSettings.homeContent.fields.subtitle')}
          maxLength={HOME_TEXT_MAX_LENGTH}
          onChange={(next) => patch({ modalitySubtitle: next })}
          rows={2}
          value={value.modalitySubtitle}
        />
      </div>
      <CollectionList
        addLabel={t('admin.siteSettings.homeContent.actions.addModality')}
        canAdd={canAdd(value.modalityItems)}
        onAdd={() => patch({ modalityItems: [...value.modalityItems, { icon: '', items: '', title: '' } satisfies HomeModalityFields] })}
        title={t('admin.siteSettings.homeContent.modalityRows')}
        warning={warningText('modalities.items')}
      >
        {value.modalityItems.map((row, index) => (
          <CollectionRow
            key={`modality-${index}`}
            onRemove={() => patch({ modalityItems: removeRow(value.modalityItems, index) })}
            removeLabel={t('admin.siteSettings.homeContent.actions.removeEntry')}
          >
            <TextField
              label={t('admin.siteSettings.homeContent.fields.itemTitle')}
              maxLength={HOME_LABEL_MAX_LENGTH}
              onChange={(next) => patch({ modalityItems: patchRows(value.modalityItems, index, { title: next }) })}
              value={row.title}
            />
            <TextField
              label={t('admin.siteSettings.homeContent.fields.itemIcon')}
              maxLength={HOME_LABEL_MAX_LENGTH}
              onChange={(next) => patch({ modalityItems: patchRows(value.modalityItems, index, { icon: next }) })}
              value={row.icon}
            />
            <TextArea
              className="md:col-span-2"
              label={t('admin.siteSettings.homeContent.fields.itemLines')}
              onChange={(next) => patch({ modalityItems: patchRows(value.modalityItems, index, { items: next }) })}
              placeholder={t('admin.siteSettings.homeContent.fields.itemLinesPlaceholder')}
              rows={4}
              value={row.items}
            />
          </CollectionRow>
        ))}
      </CollectionList>

      <SectionDivider title={t('admin.siteSettings.homeContent.groups.features')} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TextField
          label={t('admin.siteSettings.homeContent.fields.badge')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ featureBadge: next })}
          value={value.featureBadge}
        />
        <TextField
          label={t('admin.siteSettings.homeContent.fields.title')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ featureTitle: next })}
          value={value.featureTitle}
        />
        <TextArea
          label={t('admin.siteSettings.homeContent.fields.subtitle')}
          maxLength={HOME_TEXT_MAX_LENGTH}
          onChange={(next) => patch({ featureSubtitle: next })}
          rows={2}
          value={value.featureSubtitle}
        />
      </div>
      <CollectionList
        addLabel={t('admin.siteSettings.homeContent.actions.addFeature')}
        canAdd={canAdd(value.featureItems)}
        onAdd={() => patch({ featureItems: [...value.featureItems, { description: '', icon: '', title: '' } satisfies HomeFeatureFields] })}
        title={t('admin.siteSettings.homeContent.featureRows')}
        warning={warningText('features.items')}
      >
        {value.featureItems.map((row, index) => (
          <CollectionRow
            key={`feature-${index}`}
            onRemove={() => patch({ featureItems: removeRow(value.featureItems, index) })}
            removeLabel={t('admin.siteSettings.homeContent.actions.removeEntry')}
          >
            <TextField
              label={t('admin.siteSettings.homeContent.fields.itemTitle')}
              maxLength={HOME_LABEL_MAX_LENGTH}
              onChange={(next) => patch({ featureItems: patchRows(value.featureItems, index, { title: next }) })}
              value={row.title}
            />
            <TextField
              label={t('admin.siteSettings.homeContent.fields.itemIcon')}
              maxLength={HOME_LABEL_MAX_LENGTH}
              onChange={(next) => patch({ featureItems: patchRows(value.featureItems, index, { icon: next }) })}
              value={row.icon}
            />
            <TextArea
              className="md:col-span-2"
              label={t('admin.siteSettings.homeContent.fields.itemDescription')}
              maxLength={HOME_TEXT_MAX_LENGTH}
              onChange={(next) => patch({ featureItems: patchRows(value.featureItems, index, { description: next }) })}
              rows={2}
              value={row.description}
            />
          </CollectionRow>
        ))}
      </CollectionList>

      <SectionDivider title={t('admin.siteSettings.homeContent.groups.download')} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TextField
          label={t('admin.siteSettings.homeContent.fields.title')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ downloadTitle: next })}
          value={value.downloadTitle}
        />
        <TextArea
          label={t('admin.siteSettings.homeContent.fields.subtitle')}
          maxLength={HOME_TEXT_MAX_LENGTH}
          onChange={(next) => patch({ downloadSubtitle: next })}
          rows={2}
          value={value.downloadSubtitle}
        />
      </div>

      <SectionDivider title={t('admin.siteSettings.homeContent.groups.cta')} />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <TextField
          label={t('admin.siteSettings.homeContent.fields.badge')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ ctaBadge: next })}
          value={value.ctaBadge}
        />
        <TextField
          label={t('admin.siteSettings.homeContent.fields.title')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => patch({ ctaTitle: next })}
          value={value.ctaTitle}
        />
        <TextArea
          label={t('admin.siteSettings.homeContent.fields.subtitle')}
          maxLength={HOME_TEXT_MAX_LENGTH}
          onChange={(next) => patch({ ctaSubtitle: next })}
          rows={2}
          value={value.ctaSubtitle}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <LinkPairFields
          label={t('admin.siteSettings.homeContent.fields.primaryCta')}
          onChange={(next) => patchLink('ctaPrimaryCta', next)}
          value={value.ctaPrimaryCta}
          warning={warningText('cta.primaryCta')}
        />
        <LinkPairFields
          label={t('admin.siteSettings.homeContent.fields.secondaryCta')}
          onChange={(next) => patchLink('ctaSecondaryCta', next)}
          value={value.ctaSecondaryCta}
          warning={warningText('cta.secondaryCta')}
        />
      </div>
    </div>
  );
}

/**
 * Every authored entry the landing page would skip.
 *
 * The codes come from the form model — which is what decides an entry is incomplete — and the
 * sentences live in the resource bundle, so a new code is a missing key the i18n gate reports
 * rather than a sentence silently falling back to English.
 */
const WARNING_LABEL_KEYS: Record<HomeContentWarningCode, string> = {
  'cta.primaryCta': 'admin.siteSettings.homeContent.warning.ctaPrimaryCta',
  'cta.secondaryCta': 'admin.siteSettings.homeContent.warning.ctaSecondaryCta',
  'features.items': 'admin.siteSettings.homeContent.warning.featureItems',
  'hero.primaryCta': 'admin.siteSettings.homeContent.warning.heroPrimaryCta',
  'hero.secondaryCta': 'admin.siteSettings.homeContent.warning.heroSecondaryCta',
  'hero.stats': 'admin.siteSettings.homeContent.warning.heroStats',
  'modalities.items': 'admin.siteSettings.homeContent.warning.modalityItems',
};

/** The amber note a half-written entry carries. */
function InlineWarning({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
      {children}
    </p>
  );
}

/** One authored button: a caption and where it goes. Both halves or the runtime draws nothing. */
function LinkPairFields({
  label,
  onChange,
  value,
  warning,
}: {
  label: string;
  onChange: (next: HomeLinkFields) => void;
  value: HomeLinkFields;
  warning: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="rounded-lg border border-slate-200 p-3 dark:border-white/10"
      data-admin-site-home-link
    >
      <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <TextField
          label={t('admin.siteSettings.homeContent.fields.linkLabel')}
          maxLength={HOME_LABEL_MAX_LENGTH}
          onChange={(next) => onChange({ ...value, label: next })}
          value={value.label}
        />
        <TextField
          label={t('admin.siteSettings.homeContent.fields.linkHref')}
          maxLength={HOME_TEXT_MAX_LENGTH}
          onChange={(next) => onChange({ ...value, href: next })}
          value={value.href}
        />
      </div>
      {warning ? (
        <div className="mt-1.5">
          <InlineWarning>{warning}</InlineWarning>
        </div>
      ) : null}
    </div>
  );
}

/** A list of authored rows: the rows, the warning they share, and the button that adds one. */
function CollectionList({
  addLabel,
  canAdd,
  children,
  onAdd,
  title,
  warning,
}: {
  addLabel: string;
  canAdd: boolean;
  children: React.ReactNode;
  onAdd: () => void;
  title: string;
  warning: string | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
      {children}
      {warning ? <InlineWarning>{warning}</InlineWarning> : null}
      <button
        className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-lobster-400 hover:text-lobster-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/15 dark:text-slate-300 dark:hover:border-lobster-500/60"
        disabled={!canAdd}
        onClick={onAdd}
        type="button"
      >
        <Plus className="h-3.5 w-3.5" />
        {addLabel}
      </button>
    </div>
  );
}

/** One authored row, with the control that removes it. */
function CollectionRow({
  children,
  onRemove,
  removeLabel,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 md:grid-cols-2">{children}</div>
        <button
          aria-label={removeLabel}
          className="shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
          onClick={onRemove}
          title={removeLabel}
          type="button"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/**
 * The download catalog editor.
 *
 * A JSON document rather than a grid of inputs: every entry carries a file name, a platform, a
 * release tag and a download URL that a release job already computed. Retyping those into fields
 * would replace a copy with a transcription, so the console takes the document the pipeline
 * produced, checks it against the rules the homepage reads it with, and shows what the landing
 * page would draw before it is published.
 */
function DownloadCatalogField({
  check,
  onChange,
  value,
}: {
  check: DownloadCatalogCheck;
  onChange: (next: string) => void;
  value: string;
}) {
  const { t } = useTranslation();
  const summary = check.summary;
  return (
    <div className="grid grid-cols-1 gap-4">
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('admin.siteSettings.downloads.intro')}
      </p>

      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          {t('admin.siteSettings.downloads.fieldLabel')}
        </span>
        <textarea
          className="h-80 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs leading-relaxed text-slate-900 outline-none transition-colors focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
          data-admin-site-download-catalog
          onChange={(event) => onChange(event.target.value)}
          placeholder={t('admin.siteSettings.downloads.placeholder')}
          spellCheck={false}
          value={value}
        />
      </label>

      {check.ok ? (
        summary ? (
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300"
            data-admin-site-download-status="publishable"
            role="status"
          >
            {t('admin.siteSettings.downloads.publishable', {
              actions: summary.actions,
              cards: summary.cards,
              name: summary.productName,
              version: summary.version,
            })}
          </div>
        ) : (
          <div
            className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
            data-admin-site-download-status="unset"
            role="status"
          >
            {t('admin.siteSettings.downloads.unset')}
          </div>
        )
      ) : (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
          data-admin-site-download-status="invalid"
          role="alert"
        >
          <p className="font-medium">{t('admin.siteSettings.downloads.invalidTitle')}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {check.problems.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          disabled={value.trim().length === 0}
          onClick={() => onChange('')}
          type="button"
        >
          {t('admin.siteSettings.downloads.clear')}
        </button>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t('admin.siteSettings.downloads.clearHint')}
        </p>
      </div>
    </div>
  );
}

/** How each translatable copy field is labelled, and whether it needs more than one line. */
const COPY_FIELD_PRESENTATION: Record<SiteSettingsCopyField, { labelKey: string; multiline?: boolean }> = {
  siteName: { labelKey: 'admin.siteSettings.fields.siteName' },
  shortName: { labelKey: 'admin.siteSettings.fields.shortName' },
  description: { labelKey: 'admin.siteSettings.fields.description', multiline: true },
  seoTitle: { labelKey: 'admin.siteSettings.fields.seoTitle' },
  seoDescription: { labelKey: 'admin.siteSettings.fields.seoDescription' },
  footerCopyright: { labelKey: 'admin.siteSettings.fields.footerCopyright' },
};

/**
 * Opens the translation editor on the language the console is currently being read in.
 *
 * Editing the copy you are looking at is the common case, and it makes the relationship between
 * "the console language" and "the published language" obvious. A language with no exact entry
 * falls back to its base language, then to the first supported locale.
 */
function preferredEditorLocale(language: string | undefined): SiteSettingsLocale {
  const tag = (language ?? '').trim();
  const exact = SITE_SETTINGS_LOCALES.find((locale) => locale === tag);
  if (exact) {
    return exact;
  }
  const base = tag.split('-')[0];
  return SITE_SETTINGS_LOCALES.find((locale) => locale.split('-')[0] === base)
    ?? SITE_SETTINGS_LOCALES[0];
}

/**
 * Per-language editor for the translatable copy.
 *
 * One language at a time rather than one column per language: seven locales times five fields is
 * thirty-five inputs on a tab, and the operator is always working in one language anyway. The base
 * value is shown as the placeholder, so every language displays exactly what it publishes today
 * and an empty box means "this language is not translated yet".
 */
function TranslationsPanel({
  copyFields,
  form,
  onChange,
  onClearLocale,
}: {
  copyFields: readonly SiteSettingsCopyField[];
  form: SiteSettingsForm;
  onChange: (i18nField: SiteSettingsI18nField, locale: SiteSettingsLocale, value: string) => void;
  onClearLocale: (locale: SiteSettingsLocale) => void;
}) {
  const { t, i18n } = useTranslation();
  const [locale, setLocale] = useState<SiteSettingsLocale>(() => preferredEditorLocale(i18n.language));
  const localeName = t(`admin.siteSettings.locales.${locale}`, { defaultValue: locale });
  const translatedFields = copyFields.filter((field) => {
    const i18nField = siteSettingsI18nFieldFor(field);
    return i18nField !== undefined && (form[i18nField][locale] ?? '').trim().length > 0;
  });
  const translatedCount = translatedFields.length;

  return (
    <div className="grid grid-cols-1 gap-4" data-admin-site-translations>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('admin.siteSettings.translations.intro')}
      </p>
      <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 p-3 dark:bg-white/5">
        <label className="flex items-center gap-2">
          <Languages className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('admin.siteSettings.translations.localeLabel')}
          </span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none transition-colors focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
            data-admin-site-translation-locale
            onChange={(event) => setLocale(event.target.value as SiteSettingsLocale)}
            value={locale}
          >
            {SITE_SETTINGS_LOCALES.map((tag) => (
              <option key={tag} value={tag}>
                {t(`admin.siteSettings.locales.${tag}`, { defaultValue: tag })}
              </option>
            ))}
          </select>
        </label>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${translatedCount > 0
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
            : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400'
          }`}
          data-admin-site-translation-count={translatedCount}
        >
          {translatedCount > 0
            ? t('admin.siteSettings.translations.translated', { count: translatedCount })
            : t('admin.siteSettings.translations.untranslated')}
        </span>
        <button
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-red-400"
          disabled={translatedCount === 0}
          onClick={() => onClearLocale(locale)}
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
          {t('admin.siteSettings.translations.clearLocale')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {copyFields.map((field) => {
          const i18nField = siteSettingsI18nFieldFor(field);
          if (!i18nField) {
            return null;
          }
          const presentation = COPY_FIELD_PRESENTATION[field];
          const label = `${t(presentation.labelKey)} · ${localeName}`;
          const value = form[i18nField][locale] ?? '';
          const baseValue = String(form[field] ?? '');
          const handleChange = (next: string) => onChange(i18nField, locale, next);
          return (
            <div className={presentation.multiline ? 'md:col-span-2' : undefined} key={i18nField}>
              {presentation.multiline ? (
                <TextArea
                  label={label}
                  onChange={handleChange}
                  placeholder={baseValue}
                  rows={3}
                  value={value}
                />
              ) : (
                <TextField label={label} onChange={handleChange} placeholder={baseValue} value={value} />
              )}
              {value.trim().length === 0 ? (
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  {t('admin.siteSettings.translations.inheritsBase')}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Shared on/off pill. Reads the same wording the QR slots use, so one phrase means one thing. */
function VisibilityPill({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${enabled
        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
        : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400'
      }`}
    >
      {enabled
        ? t('admin.siteSettings.hints.showInFooter')
        : t('admin.siteSettings.hints.hiddenInFooter')}
    </span>
  );
}

/**
 * The switch used by every toggleable row. Extracted so the social row, the QR slots, and the
 * footer regions cannot drift into three different-looking switches for the same action.
 */
function ToggleSwitch({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (next: boolean) => void;
}) {
  const labelId = useId();
  return (
    <button
      aria-checked={checked}
      aria-labelledby={labelId}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-lobster-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#1a1a1a] ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`}
      data-admin-site-switch={checked ? 'on' : 'off'}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span className="sr-only" id={labelId}>{label}</span>
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{title}</span>
      <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
    </div>
  );
}

/**
 * 站点媒体字段：站点资源与二维码统一走共享 Drive 图片上传组件族。
 *
 * 上传声明、体积与 MIME 准入由统一上传目录与 commons 的图片上传服务承担，
 * 本组件只负责把 `CloudRouterMediaResource` 持久化状态桥接为共享组件的受控值。
 */
function MediaUploadField({
  label,
  slot,
  value,
  onChange,
  maxSizeBytes,
}: {
  label: string;
  slot: CloudRouterUploadSlotCode;
  value: CloudRouterMediaResource | undefined;
  onChange: (media: CloudRouterMediaResource | undefined) => void;
  maxSizeBytes?: number;
}) {
  const { t } = useTranslation();
  const catalogSlot = getCloudRouterUploadSlot(slot);
  const [uploadError, setUploadError] = useState<string | null>(null);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-end gap-3">
        {value ? (
          <button
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-600 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-red-400"
            onClick={() => onChange(undefined)}
            type="button"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t('admin.siteSettings.actions.clearQrCode')}
          </button>
        ) : null}
      </div>
      <DriveUploadImage
        appResourceId={catalogSlot.appResourceId}
        copy={{
          pickImage: t('admin.siteSettings.upload.imageTitle'),
          removeImage: '移除图片',
          retryUpload: '重试上传',
          uploading: '上传中…',
          uploadFailed: '上传失败',
        }}
        description={t('admin.siteSettings.upload.imageDescription')}
        label={label}
        maxSizeBytes={maxSizeBytes ?? catalogSlot.maxSizeBytes}
        onChange={(next) => {
          setUploadError(null);
          onChange(driveUploadImageValueToCloudRouterMediaResource(next, catalogSlot.mediaKind));
        }}
        onUploadError={(error) => setUploadError(error.message)}
        service={getCloudRouterDriveImageService(slot)}
        shape="rounded"
        sizePx={96}
        value={cloudRouterMediaResourceToDriveUploadImageValue(value)}
      />
      {uploadError ? (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{uploadError}</p>
      ) : null}
    </div>
  );
}

/**
 * One QR slot: the upload control plus the per-channel visibility switch.
 *
 * The switch is the only thing that decides whether the channel appears in the footer. A
 * slot that is visible but has no artwork still renders — the footer draws a placeholder —
 * so an operator can lay out the footer before the images exist.
 */
function QrCodeSlotField({
  code,
  label,
  description,
  value,
  enabled,
  onChange,
  onEnabledChange,
}: {
  code: string;
  label: string;
  description: string;
  value: CloudRouterMediaResource | undefined;
  enabled: boolean;
  onChange: (media: CloudRouterMediaResource | undefined) => void;
  onEnabledChange: (enabled: boolean) => void;
}) {
  return (
    // Filled surface rather than another outline: the panel already draws a border and the
    // upload control draws a third, so a ring here would stack three frames in one card.
    <div
      className="rounded-lg bg-slate-50 p-4 dark:bg-white/5"
      data-admin-site-qr-slot={code}
    >
      <div className="mb-3 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</p>
            <VisibilityPill enabled={enabled} />
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        </div>
        <ToggleSwitch checked={enabled} label={label} onChange={onEnabledChange} />
      </div>
      <MediaUploadField
        label={label}
        onChange={onChange}
        slot={QR_UPLOAD_SLOT}
        value={value}
      />
    </div>
  );
}

function TextField({ label, value, onChange, className = '', error = null, maxLength, placeholder, required = false }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  error?: string | null;
  /**
   * The bound the *runtime* enforces, so the console cannot author a value that gets truncated
   * on render. Optional because most fields here are not rendered by a bounded reader.
   */
  maxLength?: number;
  placeholder?: string;
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
            : 'border-slate-200 focus:border-lobster-500 focus:ring-lobster-500/20 dark:border-white/10'
        }`}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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

function TextArea({ label, value, onChange, className = '', maxLength, rows = 4, placeholder }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  maxLength?: number;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
      <textarea
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-black/20 dark:text-white"
          onChange={(event) => onChange(event.target.value)}
          value={value}
        />
      </div>
    </label>
  );
}

/** Deep-ish comparison: media fields are objects, everything else is a primitive. */
function fieldValuesEqual(left: unknown, right: unknown): boolean {
  if (left === right) {
    return true;
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return false;
}

/** How many switched-on platforms would be skipped by the footer for having no link. */
function countPlatformsMissingLinks(form: SiteSettingsForm): number {
  let missing = 0;
  for (const platform of SOCIAL_PLATFORMS) {
    const names = socialPlatformFieldNames(platform.code);
    const enabled = form[names.enabled as keyof SiteSettingsForm] === true;
    const url = String(form[names.url as keyof SiteSettingsForm] ?? '').trim();
    if (enabled && url.length === 0) {
      missing += 1;
    }
  }
  return missing;
}

function errorMessage(error: unknown, fallback: string, t?: (key: string, options?: { defaultValue?: string } & Record<string, unknown>) => string): string {
  return getLoadErrorMessage(error, fallback, t);
}
