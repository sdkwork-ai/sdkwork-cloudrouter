import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  AudioLines,
  Boxes,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  Music,
  Route,
  Video,
  type LucideIcon,
} from 'lucide-react';

import type {
  AppRoutingModelGroupCatalog,
  AppRoutingModelGroupCatalogModel,
  AppRoutingModelGroupCatalogVendor,
  AppRoutingModelGroupOption,
} from '@sdkwork/cloudrouter-pc-console-core/sdk';

import {
  fetchModelGroupCatalog,
  setModelGroupDefault,
  type ModelGroupModality,
} from './modelGroupService.ts';

const MODALITIES: ReadonlyArray<{ id: ModelGroupModality; labelKey: string; fallback: string; icon: LucideIcon }> = [
  { id: 'text', labelKey: 'console.defaultGroups.modality.text', fallback: 'Language models', icon: Boxes },
  { id: 'image', labelKey: 'console.defaultGroups.modality.image', fallback: 'Image generation', icon: ImageIcon },
  { id: 'video', labelKey: 'console.defaultGroups.modality.video', fallback: 'Video generation', icon: Video },
  { id: 'audio', labelKey: 'console.defaultGroups.modality.audio', fallback: 'Audio', icon: AudioLines },
  { id: 'music', labelKey: 'console.defaultGroups.modality.music', fallback: 'Music', icon: Music },
];

function groupOptionsForVendor(vendor: AppRoutingModelGroupCatalogVendor): AppRoutingModelGroupOption[] {
  const byCode = new Map<string, AppRoutingModelGroupOption>();
  for (const model of vendor.models) {
    for (const group of model.groups) {
      if (!byCode.has(group.groupCode)) {
        byCode.set(group.groupCode, group);
      }
    }
  }
  return Array.from(byCode.values());
}

function sourceLabel(
  t: (key: string, fallback: string) => string,
  source: string | null,
): string | null {
  if (!source) {
    return null;
  }
  switch (source) {
    case 'user-model-default':
      return t('console.defaultGroups.source.model', 'Model rule');
    case 'user-vendor-default':
      return t('console.defaultGroups.source.vendor', 'Vendor rule');
    case 'user-modality-default':
      return t('console.defaultGroups.source.modality', 'Modality rule');
    case 'header-override':
      return t('console.defaultGroups.source.header', 'Request header');
    default:
      return t('console.defaultGroups.source.account', 'Account default');
  }
}

export function ModelGroupsView() {
  const { t } = useTranslation();
  const [modality, setModality] = useState<ModelGroupModality>('text');
  const [catalog, setCatalog] = useState<AppRoutingModelGroupCatalog | null>(null);
  const [selectedVendorCode, setSelectedVendorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadCatalog = useCallback(
    async (nextModality: ModelGroupModality) => {
      setLoading(true);
      setError(null);
      try {
        const next = await fetchModelGroupCatalog({ modality: nextModality });
        setCatalog(next);
        setSelectedVendorCode((current) => {
          const entry = next.modalities.find((item) => item.modality === nextModality)
            ?? next.modalities[0];
          if (!entry || entry.vendors.length === 0) {
            return null;
          }
          return current && entry.vendors.some((vendor) => vendor.vendorCode === current)
            ? current
            : entry.vendors[0]?.vendorCode ?? null;
        });
      } catch {
        setCatalog(null);
        setError(t('console.defaultGroups.loadFailed', 'Could not load the group catalog.'));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadCatalog(modality);
  }, [loadCatalog, modality]);

  const vendors = useMemo(() => {
    if (!catalog) {
      return [];
    }
    const entry = catalog.modalities.find((item) => item.modality === modality)
      ?? catalog.modalities[0];
    return entry?.vendors ?? [];
  }, [catalog, modality]);

  const selectedVendor = useMemo(
    () => vendors.find((vendor) => vendor.vendorCode === selectedVendorCode) ?? null,
    [selectedVendorCode, vendors],
  );

  const saveDefault = useCallback(
    async (
      key: string,
      input: { scope: 'model' | 'vendor'; vendorCode: string; model?: string; accountGroups: string[] },
    ) => {
      setSavingKey(key);
      setError(null);
      setNotice(null);
      try {
        await setModelGroupDefault({
          scope: input.scope,
          modality,
          vendorCode: input.vendorCode,
          ...(input.model ? { model: input.model } : {}),
          accountGroups: input.accountGroups,
        });
        setNotice(t('console.defaultGroups.saved', 'Default group saved.'));
        await loadCatalog(modality);
      } catch {
        setError(t('console.defaultGroups.saveFailed', 'Could not save the default group.'));
      } finally {
        setSavingKey(null);
      }
    },
    [loadCatalog, modality, t],
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-4" data-console-model-groups>
      <header className="flex flex-col gap-1">
        <h1 className="flex items-center gap-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
          <Route className="h-5 w-5 text-lobster-500" />
          {t('console.defaultGroups.title', 'Default groups')}
        </h1>
        <p className="max-w-3xl text-sm text-slate-500 dark:text-slate-400">
          {t(
            'console.defaultGroups.description',
            'Choose the account group each model routes through. A model rule wins over a vendor rule, and a vendor rule wins over a modality rule; with no rule the account default applies.',
          )}
        </p>
      </header>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left rail: modality, then the vendor list of the selected modality. */}
        <aside className="flex w-64 shrink-0 flex-col gap-3 overflow-y-auto">
          <section className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#171717]">
            <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('console.defaultGroups.modality', 'Modality')}
            </h2>
            <div className="flex flex-col gap-1" role="tablist" aria-label={t('console.defaultGroups.modality', 'Modality')}>
              {MODALITIES.map((item) => {
                const Icon = item.icon;
                const active = item.id === modality;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setModality(item.id)}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active
                        ? 'bg-lobster-50 text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {t(item.labelKey, item.fallback)}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="min-h-0 flex-1 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#171717]">
            <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t('console.defaultGroups.vendors', 'Vendors')}
            </h2>
            {loading ? (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('console.defaultGroups.loading', 'Loading…')}
              </div>
            ) : vendors.length === 0 ? (
              <p className="px-2 py-3 text-sm text-slate-500 dark:text-slate-400">
                {t('console.defaultGroups.empty', 'No model of this vendor is reachable by any group yet.')}
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {vendors.map((vendor) => {
                  const active = vendor.vendorCode === selectedVendorCode;
                  return (
                    <button
                      key={vendor.vendorCode}
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => setSelectedVendorCode(vendor.vendorCode)}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-slate-100 font-medium text-slate-900 dark:bg-white/10 dark:text-slate-100'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5'
                      }`}
                    >
                      <span className="truncate">{vendor.vendorName}</span>
                      <span className="text-xs text-slate-400">{vendor.models.length}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </aside>

        {/* Right pane: the selected vendor's models and their group selects. */}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-[#171717]">
          {selectedVendor ? (
            <>
              <header className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
                <div>
                  <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {selectedVendor.vendorName}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('console.defaultGroups.models', 'Models')} · {selectedVendor.models.length}
                  </p>
                </div>
                <VendorBulkEditor
                  key={selectedVendor.vendorCode}
                  vendor={selectedVendor}
                  initialSelection={
                    selectedVendor.models.find(
                      (model) => model.defaultSource === 'user-vendor-default',
                    )?.defaultGroupCodes ?? []
                  }
                  saving={savingKey !== null}
                  onApply={(accountGroups) =>
                    void saveDefault(`vendor:${selectedVendor.vendorCode}`, {
                      scope: 'vendor',
                      vendorCode: selectedVendor.vendorCode,
                      accountGroups,
                    })
                  }
                />
              </header>

              <div className="min-h-0 flex-1 overflow-y-auto">
                {selectedVendor.models.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
                    {t('console.defaultGroups.empty', 'No model of this vendor is reachable by any group yet.')}
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-white/5">
                    {selectedVendor.models.map((model) => (
                      <ModelRow
                        key={`${model.vendorCode}:${model.model}`}
                        modality={modality}
                        model={model}
                        saving={savingKey === `model:${model.vendorCode}:${model.model}`}
                        onSave={(accountGroups) =>
                          saveDefault(`model:${model.vendorCode}:${model.model}`, {
                            scope: 'model',
                            vendorCode: model.vendorCode,
                            model: model.model,
                            accountGroups,
                          })
                        }
                      />
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 py-10 text-sm text-slate-500 dark:text-slate-400">
              {t('console.defaultGroups.selectVendor', 'Select a vendor to browse its models.')}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ModelRow({
  modality,
  model,
  saving,
  onSave,
}: {
  modality: ModelGroupModality;
  model: AppRoutingModelGroupCatalogModel;
  saving: boolean;
  onSave: (accountGroups: string[]) => void;
}) {
  const { t } = useTranslation();
  const source = sourceLabel(t, model.defaultSource ?? null);
  const selected = model.defaultGroupCodes;
  const toggle = (groupCode: string) => {
    const next = selected.includes(groupCode)
      ? selected.filter((value) => value !== groupCode)
      : [...selected, groupCode];
    onSave(next);
  };
  return (
    <li className="flex flex-col gap-2 px-5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
              {model.displayName || model.model}
            </span>
            {source && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-white/10 dark:text-slate-400">
                {source}
              </span>
            )}
          </div>
          <div className="truncate text-xs text-slate-500 dark:text-slate-400">{model.model}</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          <span>{t('console.defaultGroups.modelDefault', 'Model default groups')}</span>
        </div>
      </div>
      {model.groups.length === 0 ? (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          {t('console.defaultGroups.noGroups', 'No group can serve this model.')}
        </span>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={selected.length === 0}
            disabled={saving}
            onClick={() => onSave([])}
            className={`rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-60 ${
              selected.length === 0
                ? 'border-lobster-300 bg-lobster-50 text-lobster-700 dark:border-lobster-500/40 dark:bg-lobster-500/10 dark:text-lobster-300'
                : 'border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5'
            }`}
          >
            {t('console.defaultGroups.inherit', 'Use account default')}
          </button>
          {model.groups.map((group) => (
            <GroupChip
              key={group.groupCode}
              group={group}
              active={selected.includes(group.groupCode)}
              disabled={saving}
              onToggle={() => toggle(group.groupCode)}
            />
          ))}
        </div>
      )}
      <span className="sr-only">{modality}</span>
    </li>
  );
}

function GroupChip({
  group,
  active,
  disabled,
  onToggle,
}: {
  group: AppRoutingModelGroupOption;
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onToggle}
      title={group.groupCode}
      className={`rounded-full border px-2.5 py-1 text-xs transition-colors disabled:opacity-60 ${
        active
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300'
          : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
      }`}
    >
      {group.groupName || group.groupCode}
    </button>
  );
}

function VendorBulkEditor({
  vendor,
  initialSelection,
  saving,
  onApply,
}: {
  vendor: AppRoutingModelGroupCatalogVendor;
  initialSelection: string[];
  saving: boolean;
  onApply: (accountGroups: string[]) => void;
}) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState<string[]>(initialSelection);
  const groups = groupOptionsForVendor(vendor);
  const toggle = (groupCode: string) => {
    setSelection((current) =>
      current.includes(groupCode)
        ? current.filter((value) => value !== groupCode)
        : [...current, groupCode],
    );
  };
  if (groups.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {t('console.defaultGroups.setVendorDefault', 'Set for every model of this vendor')}
      </span>
      {groups.map((group) => (
        <GroupChip
          key={group.groupCode}
          group={group}
          active={selection.includes(group.groupCode)}
          disabled={saving}
          onToggle={() => toggle(group.groupCode)}
        />
      ))}
      <button
        type="button"
        disabled={saving}
        onClick={() => onApply(selection)}
        className="rounded-full bg-lobster-500 px-3 py-1 text-xs font-medium text-white disabled:opacity-60"
      >
        {t('console.defaultGroups.applyVendor', 'Apply')}
      </button>
      <button
        type="button"
        disabled={saving}
        onClick={() => {
          setSelection([]);
          onApply([]);
        }}
        className="rounded-full border border-slate-200 px-2.5 py-1 text-xs text-slate-500 disabled:opacity-60 dark:border-white/10 dark:text-slate-400"
      >
        {t('console.defaultGroups.clearVendor', 'Clear')}
      </button>
    </div>
  );
}

export default ModelGroupsView;
