import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  UpstreamAccountGroup,
  UpstreamAccountGroupResourcePrice,
  UpstreamAccountGroupResourcePriceInput,
  UpstreamResourceCatalogResponse,
} from '@sdkwork/cloudrouter-pc-admin-core/sdk';
import { upstreamService } from './upstreamService';
import { errorMessageI18n, InlineError, inputClass, Modal } from './components';

/** Closed pricing mode set, mirroring the database payload constraint. */
const PRICE_MODES = ['multiplier', 'markup', 'unit_price', 'free'] as const;
type PriceMode = (typeof PRICE_MODES)[number];

/** Closed resource-type set, mirroring the database resource-type constraint. */
const RESOURCE_TYPES = ['model', 'image', 'video', 'api', 'audio', 'other'] as const;
type ResourceType = (typeof RESOURCE_TYPES)[number];

/** One editable row of the group price table. */
interface PriceDraft {
  /** Existing row id, absent for a row the operator just added. */
  id?: string;
  resourceType: ResourceType;
  catalogKey: string;
  operationCode: string;
  meterCode: string;
  regionCode: string;
  providerCode: string;
  priceMode: PriceMode;
  multiplier: string;
  markupAmount: string;
  unitPriceOverride: string;
  currencyCode: string;
  effectiveFrom: string;
  effectiveTo: string;
}

/** A resource the group is entitled to, offered as a quick add. */
interface ResourceOption {
  catalogKey: string;
  label: string;
}

function emptyDraft(): PriceDraft {
  return {
    resourceType: 'model',
    catalogKey: '',
    operationCode: '',
    meterCode: '',
    regionCode: '',
    providerCode: '',
    priceMode: 'multiplier',
    multiplier: '1',
    markupAmount: '0',
    unitPriceOverride: '',
    currencyCode: 'USD',
    effectiveFrom: '',
    effectiveTo: '',
  };
}

function toDraft(price: UpstreamAccountGroupResourcePrice): PriceDraft {
  return {
    id: price.id,
    resourceType: (RESOURCE_TYPES as readonly string[]).includes(price.resourceType)
      ? (price.resourceType as ResourceType)
      : 'other',
    catalogKey: price.catalogKey,
    operationCode: price.operationCode,
    meterCode: price.meterCode,
    regionCode: price.regionCode,
    providerCode: price.providerCode,
    priceMode: (PRICE_MODES as readonly string[]).includes(price.priceMode)
      ? (price.priceMode as PriceMode)
      : 'multiplier',
    multiplier: price.multiplier,
    markupAmount: price.markupAmount,
    unitPriceOverride: price.unitPriceOverride ?? '',
    currencyCode: price.currencyCode,
    effectiveFrom: price.effectiveFrom,
    effectiveTo: price.effectiveTo ?? '',
  };
}

function toInput(draft: PriceDraft): UpstreamAccountGroupResourcePriceInput {
  return {
    ...(draft.id ? { id: draft.id } : {}),
    resourceType: draft.resourceType,
    catalogKey: draft.catalogKey.trim(),
    operationCode: draft.operationCode.trim(),
    meterCode: draft.meterCode.trim(),
    regionCode: draft.regionCode.trim(),
    providerCode: draft.providerCode.trim(),
    priceMode: draft.priceMode,
    ...(draft.priceMode === 'multiplier' ? { multiplier: draft.multiplier.trim() } : {}),
    ...(draft.priceMode === 'markup' ? { markupAmount: draft.markupAmount.trim() } : {}),
    ...(draft.priceMode === 'unit_price'
      ? { unitPriceOverride: draft.unitPriceOverride.trim() }
      : {}),
    currencyCode: draft.currencyCode.trim(),
    effectiveFrom: draft.effectiveFrom.trim(),
    ...(draft.effectiveTo.trim() ? { effectiveTo: draft.effectiveTo.trim() } : {}),
  };
}

/**
 * 账号组按资源定价编辑器。
 *
 * 分组此前只有一个 `sale_multiplier`，对所有模型、所有计量单位生效，
 * 既不能给某个模型单独定价，也不能表达“该分组免费”或限时促销。这张表把
 * 定价下沉到 (分组, 资源, 操作, 计量, 地域, 供应商) 元组：命中即替换分组倍率，
 * 未命中的资源继续继承分组倍率——因此表格必须把“未单独定价”的资源明确
 * 展示为继承状态，而不是让它们从编辑器里消失。
 */
export function GroupResourcePricesModal({
  group,
  onSaved,
  onClose,
}: {
  group: UpstreamAccountGroup;
  onSaved: (group: UpstreamAccountGroup) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [drafts, setDrafts] = useState<PriceDraft[]>([]);
  const [entitled, setEntitled] = useState<ResourceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      upstreamService.accountGroups.listPrices(group.id),
      upstreamService.accountGroups.listResources(group.id).catch(() => []),
      upstreamService.fetchResourceCatalog().catch(() => null),
    ])
      .then(([prices, resources, catalog]) => {
        if (cancelled) return;
        setDrafts(prices.map(toDraft));
        const labeled = buildResourceOptions(resources, catalog);
        setEntitled(labeled);
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t),
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [group.id, t]);

  const pricedKeys = useMemo(
    () => new Set(drafts.map((draft) => draft.catalogKey.toUpperCase())),
    [drafts],
  );
  const inherited = useMemo(
    () => entitled.filter((option) => !pricedKeys.has(option.catalogKey.toUpperCase())),
    [entitled, pricedKeys],
  );

  const updateDraft = (index: number, patch: Partial<PriceDraft>) => {
    setDrafts((current) =>
      current.map((draft, position) =>
        position === index ? { ...draft, ...patch } : draft,
      ),
    );
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await upstreamService.accountGroups.replacePrices(
        group.id,
        { items: drafts.map(toInput) },
        String(group.version ?? ''),
      );
      onSaved(await upstreamService.accountGroups.retrieve(group.id));
    } catch (cause) {
      setError(errorMessageI18n(cause, t('admin.upstream.common.errors.operationFailed'), t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={t('admin.upstream.accountGroup.prices.title')}
      busy={busy}
      submitLabel={t('admin.upstream.accountGroup.prices.save')}
      onSubmit={submit}
      onClose={onClose}
      size="xl"
    >
      <div className="grid gap-3">
        <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          {t('admin.upstream.accountGroup.prices.description')}
        </p>
        <InlineError message={error} />
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">
            {t('admin.upstream.common.status.loading')}
          </p>
        ) : (
          <>
            <div className="grid gap-2">
              {drafts.length === 0 ? (
                <p className="rounded-md border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-600">
                  {t('admin.upstream.accountGroup.prices.empty')}
                </p>
              ) : (
                drafts.map((draft, index) => (
                  <div
                    key={`${draft.id ?? 'new'}-${index}`}
                    className="grid gap-2 rounded-md border border-slate-200 p-3 dark:border-slate-700"
                  >
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      <label className="grid gap-1 text-xs">
                        <span>{t('admin.upstream.accountGroup.prices.fields.resourceType')}</span>
                        <select
                          className={inputClass}
                          value={draft.resourceType}
                          onChange={(event) =>
                            updateDraft(index, { resourceType: event.target.value as ResourceType })
                          }
                        >
                          {RESOURCE_TYPES.map((value) => (
                            <option key={value} value={value}>
                              {t(`admin.upstream.accountGroup.prices.resourceType.${value}`, value)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span>{t('admin.upstream.accountGroup.prices.fields.catalogKey')}</span>
                        <input
                          className={inputClass}
                          value={draft.catalogKey}
                          onChange={(event) => updateDraft(index, { catalogKey: event.target.value })}
                        />
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span>{t('admin.upstream.accountGroup.prices.fields.operationCode')}</span>
                        <input
                          className={inputClass}
                          value={draft.operationCode}
                          onChange={(event) =>
                            updateDraft(index, { operationCode: event.target.value })
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span>{t('admin.upstream.accountGroup.prices.fields.meterCode')}</span>
                        <input
                          className={inputClass}
                          value={draft.meterCode}
                          onChange={(event) => updateDraft(index, { meterCode: event.target.value })}
                        />
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span>{t('admin.upstream.accountGroup.prices.fields.regionCode')}</span>
                        <input
                          className={inputClass}
                          value={draft.regionCode}
                          onChange={(event) => updateDraft(index, { regionCode: event.target.value })}
                        />
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span>{t('admin.upstream.accountGroup.prices.fields.providerCode')}</span>
                        <input
                          className={inputClass}
                          value={draft.providerCode}
                          onChange={(event) =>
                            updateDraft(index, { providerCode: event.target.value })
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span>{t('admin.upstream.accountGroup.prices.fields.priceMode')}</span>
                        <select
                          className={inputClass}
                          value={draft.priceMode}
                          onChange={(event) =>
                            updateDraft(index, { priceMode: event.target.value as PriceMode })
                          }
                        >
                          {PRICE_MODES.map((value) => (
                            <option key={value} value={value}>
                              {t(`admin.upstream.accountGroup.prices.priceMode.${value}`, value)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span>{t('admin.upstream.accountGroup.prices.fields.currencyCode')}</span>
                        <input
                          className={inputClass}
                          value={draft.currencyCode}
                          onChange={(event) =>
                            updateDraft(index, { currencyCode: event.target.value })
                          }
                        />
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                      {draft.priceMode === 'multiplier' ? (
                        <label className="grid gap-1 text-xs">
                          <span>{t('admin.upstream.accountGroup.prices.fields.multiplier')}</span>
                          <input
                            className={inputClass}
                            value={draft.multiplier}
                            onChange={(event) =>
                              updateDraft(index, { multiplier: event.target.value })
                            }
                          />
                        </label>
                      ) : null}
                      {draft.priceMode === 'markup' ? (
                        <label className="grid gap-1 text-xs">
                          <span>{t('admin.upstream.accountGroup.prices.fields.markupAmount')}</span>
                          <input
                            className={inputClass}
                            value={draft.markupAmount}
                            onChange={(event) =>
                              updateDraft(index, { markupAmount: event.target.value })
                            }
                          />
                        </label>
                      ) : null}
                      {draft.priceMode === 'unit_price' ? (
                        <label className="grid gap-1 text-xs">
                          <span>{t('admin.upstream.accountGroup.prices.fields.unitPrice')}</span>
                          <input
                            className={inputClass}
                            value={draft.unitPriceOverride}
                            onChange={(event) =>
                              updateDraft(index, { unitPriceOverride: event.target.value })
                            }
                          />
                        </label>
                      ) : null}
                      <label className="grid gap-1 text-xs">
                        <span>{t('admin.upstream.accountGroup.prices.fields.effectiveFrom')}</span>
                        <input
                          className={inputClass}
                          value={draft.effectiveFrom}
                          onChange={(event) =>
                            updateDraft(index, { effectiveFrom: event.target.value })
                          }
                        />
                      </label>
                      <label className="grid gap-1 text-xs">
                        <span>{t('admin.upstream.accountGroup.prices.fields.effectiveTo')}</span>
                        <input
                          className={inputClass}
                          value={draft.effectiveTo}
                          onChange={(event) =>
                            updateDraft(index, { effectiveTo: event.target.value })
                          }
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          type="button"
                          className="text-xs text-rose-600 hover:underline"
                          onClick={() =>
                            setDrafts((current) => current.filter((_, position) => position !== index))
                          }
                        >
                          {t('admin.upstream.accountGroup.prices.remove')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button
                type="button"
                className="justify-self-start rounded-md border border-slate-300 px-3 py-1.5 text-xs dark:border-slate-600"
                onClick={() => setDrafts((current) => [...current, emptyDraft()])}
              >
                {t('admin.upstream.accountGroup.prices.add')}
              </button>
            </div>

            <div className="grid gap-1">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t('admin.upstream.accountGroup.prices.inheritedTitle')}
              </p>
              {inherited.length === 0 ? (
                <p className="text-xs text-slate-500">
                  {t('admin.upstream.accountGroup.prices.inheritedNone')}
                </p>
              ) : (
                <ul className="flex flex-wrap gap-1">
                  {inherited.map((option) => (
                    <li key={option.catalogKey}>
                      <button
                        type="button"
                        className="rounded border border-slate-300 px-2 py-0.5 text-xs hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800"
                        onClick={() =>
                          setDrafts((current) => [
                            ...current,
                            { ...emptyDraft(), catalogKey: option.catalogKey },
                          ])
                        }
                      >
                        {option.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

/** Builds the quick-add list from the group's entitlements. */
function buildResourceOptions(
  resources: readonly { resourceCode?: string }[],
  catalog: UpstreamResourceCatalogResponse | null,
): ResourceOption[] {
  const known = new Map<string, string>();
  for (const resource of catalog?.resources ?? []) {
    const code = (resource as { resourceCode?: string }).resourceCode;
    if (code) known.set(code.toUpperCase(), code);
  }
  const options = new Map<string, ResourceOption>();
  for (const resource of resources) {
    const code = resource.resourceCode?.trim();
    if (!code) continue;
    options.set(code.toUpperCase(), {
      catalogKey: code,
      label: known.get(code.toUpperCase()) ?? code,
    });
  }
  return [...options.values()].sort((left, right) => left.catalogKey.localeCompare(right.catalogKey));
}
