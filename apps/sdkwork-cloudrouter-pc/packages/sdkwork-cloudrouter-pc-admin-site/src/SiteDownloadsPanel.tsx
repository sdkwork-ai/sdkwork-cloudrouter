import { useTranslation } from 'react-i18next';
import { InlineWarning, TextField } from './SiteSettingsControls';
import type { DownloadsPointerCheck } from './siteContentFields';

export interface SiteDownloadsPanelProps {
  /** Canonical JSON text of the stored `downloads` document. */
  value: string;
  /** Result of `checkDownloadsPointer` for the current text. */
  check: DownloadsPointerCheck;
  /** Deployments console origin; the deep link renders only when configured. */
  adminBaseUrl?: string;
  onChange(next: string): void;
}

function readCatalogKey(value: string): string {
  try {
    const parsed: unknown = JSON.parse(value.trim() === '' ? '{}' : value);
    if (typeof parsed !== 'object' || parsed === null) return '';
    const key = (parsed as { catalogKey?: unknown }).catalogKey;
    return typeof key === 'string' ? key : '';
  } catch {
    return '';
  }
}

function pointerText(catalogKey: string): string {
  const trimmed = catalogKey.trim();
  if (trimmed === '') return '';
  return `${JSON.stringify({ catalogKey: trimmed }, null, 2)}\n`;
}

/**
 * The `/admin/site` body for the `downloads` category after the migration.
 *
 * The catalog itself (cards, installers, per-installer update feeds) is authored
 * in the Deployments console. This panel only keeps the pointer the rendering
 * site resolves, so Cloud Router cannot drift into a second copy of an installer
 * list that the updater would then disagree with.
 */
export function SiteDownloadsPanel({
  value,
  check,
  adminBaseUrl,
  onChange,
}: SiteDownloadsPanelProps) {
  const { t } = useTranslation();
  const catalogKey = readCatalogKey(value);
  const base = adminBaseUrl?.trim().replace(/\/+$/u, '');
  const consoleUrl = base === undefined || base === ''
    ? undefined
    : `${base}/admin/downloads/downloadCatalog`;

  return (
    <div className="grid grid-cols-1 gap-3">
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('admin.siteSettings.downloads.delegated.intro')}
      </p>

      <TextField
        label={t('admin.siteSettings.downloads.delegated.catalogKey')}
        maxLength={64}
        onChange={next => onChange(pointerText(next))}
        placeholder={t('admin.siteSettings.downloads.delegated.catalogKeyPlaceholder')}
        value={catalogKey}
      />

      {check.problems.length > 0 ? (
        <InlineWarning>
          {t('admin.siteSettings.downloads.delegated.invalid')}
        </InlineWarning>
      ) : null}

      {check.legacyCatalog ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <p className="mb-2 leading-relaxed">
            {t('admin.siteSettings.downloads.delegated.legacy')}
          </p>
          <button
            className="rounded border border-amber-300 px-2 py-1 font-medium hover:bg-amber-100 dark:border-amber-400/40 dark:hover:bg-amber-500/20"
            onClick={() => onChange('')}
            type="button"
          >
            {t('admin.siteSettings.downloads.delegated.discardLegacy')}
          </button>
        </div>
      ) : null}

      {consoleUrl === undefined ? (
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {t('admin.siteSettings.downloads.delegated.consoleUnavailable')}
        </p>
      ) : (
        <a
          className="inline-flex w-fit items-center gap-1 rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
          href={consoleUrl}
          rel="noreferrer"
          target="_blank"
        >
          {t('admin.siteSettings.downloads.delegated.openConsole')}
        </a>
      )}
    </div>
  );
}
