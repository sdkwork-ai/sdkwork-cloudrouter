import { useState } from 'react';
import { Building2, Layers3, UsersRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SupplierTab } from './supplierTab';
import { AccountTab } from './accountTab';
import { AccountGroupTab } from './accountGroupTab';

type UpstreamView = 'suppliers' | 'accounts' | 'accountGroups';

const views: Array<{ id: UpstreamView; labelKey: string; icon: typeof Building2 }> = [
  { id: 'suppliers', labelKey: 'admin.upstream.views.suppliers', icon: Building2 },
  { id: 'accounts', labelKey: 'admin.upstream.views.accounts', icon: UsersRound },
  { id: 'accountGroups', labelKey: 'admin.upstream.views.accountGroups', icon: Layers3 },
];

export function UpstreamAdmin() {
  const { t } = useTranslation();
  const [view, setView] = useState<UpstreamView>('suppliers');

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 sm:p-6" data-admin-upstream>
      <header className="flex shrink-0 flex-col gap-3 border-b border-slate-200 pb-4 dark:border-white/10 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('admin.upstream.title')}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('admin.upstream.subtitle')}</p>
        </div>
        <div role="tablist" aria-label={t('admin.upstream.views.label')} className="inline-flex max-w-full overflow-x-auto rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-black/20">
          {views.map(({ id, labelKey, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={view === id}
              onClick={() => setView(id)}
              className={`inline-flex h-8 shrink-0 items-center gap-2 rounded px-3 text-sm font-semibold transition ${view === id ? 'bg-white text-indigo-700 shadow-sm dark:bg-white/10 dark:text-indigo-200' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}
            >
              <Icon className="h-4 w-4" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col" role="tabpanel">
        {view === 'suppliers' ? <SupplierTab /> : null}
        {view === 'accounts' ? <AccountTab /> : null}
        {view === 'accountGroups' ? <AccountGroupTab /> : null}
      </div>
    </div>
  );
}

export { upstreamService } from './upstreamService';
