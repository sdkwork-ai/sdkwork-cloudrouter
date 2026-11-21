import { useMemo } from 'react';
import { Link2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  HOMEPAGE_MENU_CATALOG,
  countHomepageMenuItems,
  createDefaultHomepageMenuSettings,
  homepageMenuEntryShowFrom,
  normalizeHomepageMenuSettings,
  updateHomepageMenuItem,
  type HomepageMenuId,
  type HomepageMenuSettings,
} from '@sdkwork/cloudroutes-pc-commons/homepage-menu';
import { SectionDivider, ToggleSwitch } from './SiteSettingsControls';

/**
 * The operator-facing homepage header menu manager rendered under `/admin/site`.
 *
 * Three ideas drive the layout:
 *   - **Visibility is the only decision.** A hidden link keeps its route, so deep links and
 *     bookmarks still open the page; only the header stops advertising it.
 *   - **The catalog owns the order.** The list is drawn in the order the header draws it, so what
 *     the operator reads here is what a visitor sees; there is no second ordering to reconcile.
 *   - **Nothing blocks saving.** Hiding every link is unusual but valid — a deployment can run a
 *     landing page with no marketing navigation — so a switch flips immediately and the sticky
 *     save bar reports it like any other field.
 */
export function HomepageMenuEditor({
  value,
  onChange,
}: {
  value: HomepageMenuSettings;
  onChange: (next: HomepageMenuSettings) => void;
}) {
  const { t } = useTranslation();
  const settings = useMemo(() => normalizeHomepageMenuSettings(value), [value]);
  const counts = useMemo(() => countHomepageMenuItems(settings), [settings]);
  const visibleItems = HOMEPAGE_MENU_CATALOG.filter((entry) => (
    settings.items.some((item) => item.id === entry.id && item.visible)
  ));

  const toggle = (id: HomepageMenuId, visible: boolean) => {
    onChange(updateHomepageMenuItem(settings, id, visible));
  };

  return (
    <div className="grid grid-cols-1 gap-5" data-admin-site-home-menu-editor>
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('admin.siteSettings.homeMenu.intro')}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t('admin.siteSettings.homeMenu.summary.title')}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('admin.siteSettings.homeMenu.summary.counts', {
              total: counts.total,
              visible: counts.visible,
            })}
          </p>
        </div>
        <button
          className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          onClick={() => onChange(createDefaultHomepageMenuSettings())}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
          {t('admin.siteSettings.homeMenu.actions.reset')}
        </button>
      </div>

      <SectionDivider title={t('admin.siteSettings.homeMenu.listTitle')} />
      <ul
        aria-label={t('admin.siteSettings.homeMenu.listLabel')}
        className="grid grid-cols-1 gap-3"
      >
        {HOMEPAGE_MENU_CATALOG.map((entry) => {
          const item = settings.items.find((candidate) => candidate.id === entry.id);
          const visible = item?.visible ?? true;
          const label = t(entry.labelKey);
          return (
            <li
              className="flex flex-wrap items-start gap-4 rounded-lg bg-slate-50 p-4 dark:bg-white/5"
              data-admin-site-home-menu-item={entry.id}
              data-admin-site-home-menu-item-visible={visible ? 'true' : 'false'}
              key={entry.id}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white/10">
                <Link2 aria-hidden="true" className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{label}</p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      visible
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                        : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400'
                    }`}
                  >
                    {visible
                      ? t('admin.siteSettings.homeMenu.status.visible')
                      : t('admin.siteSettings.homeMenu.status.hidden')}
                  </span>
                  {homepageMenuEntryShowFrom(entry) === '2xl' ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      {t('admin.siteSettings.homeMenu.badges.wideOnly')}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {t(entry.descriptionKey)}
                </p>
                <p className="mt-1 font-mono text-[11px] text-slate-400 dark:text-slate-500">
                  {entry.href}
                </p>
              </div>
              <div className="flex items-center gap-2 md:ml-auto">
                <div className="text-right">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {t('admin.siteSettings.homeMenu.fields.visible')}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {visible
                      ? t('admin.siteSettings.homeMenu.hints.visible')
                      : t('admin.siteSettings.homeMenu.hints.hidden')}
                  </p>
                </div>
                <ToggleSwitch
                  checked={visible}
                  label={`${label} — ${t('admin.siteSettings.homeMenu.fields.visible')}`}
                  onChange={(next) => toggle(entry.id, next)}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <SectionDivider title={t('admin.siteSettings.homeMenu.preview.title')} />
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        {t('admin.siteSettings.homeMenu.preview.hint')}
      </p>
      <div className="flex flex-wrap items-center gap-2" data-admin-site-home-menu-preview>
        {visibleItems.length > 0 ? visibleItems.map((entry) => (
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
            data-admin-site-home-menu-preview-item={entry.id}
            key={entry.id}
          >
            {t(entry.labelKey)}
          </span>
        )) : (
          <span className="text-xs text-amber-700 dark:text-amber-400">
            {t('admin.siteSettings.homeMenu.preview.empty')}
          </span>
        )}
      </div>
    </div>
  );
}
