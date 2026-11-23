import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { humanizeCode } from '../catalog/dataNames';
import {
  filterPricingGroups,
  pricingGroupHasTags,
  toggleSelectionValue,
  type PricingGroupOption,
  type PricingGroupSelection,
  type PricingGroupTagFacet,
} from '../types/pricingGroup';

interface PricingGroupFilterProps {
  groups: readonly PricingGroupOption[];
  tagFacets: readonly PricingGroupTagFacet[];
  selection: PricingGroupSelection;
  state: 'loading' | 'ready' | 'failed';
  onTagsChange: (tags: string[]) => void;
  onGroupCodesChange: (codes: string[]) => void;
  onClear: () => void;
}

/**
 * 价格页分组筛选：把原来的分组下拉框展开成常驻面板（默认展开，可折叠）,
 * 面板内先给出标签 chips（多选，AND 语义收窄分组），再给出分组列表
 * （多选，支持搜索）。选中项直接影响价格卡片的模型范围。
 */
export function PricingGroupFilter({
  groups,
  tagFacets,
  selection,
  state,
  onTagsChange,
  onGroupCodesChange,
  onClear,
}: PricingGroupFilterProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [groupQuery, setGroupQuery] = useState('');

  const activeCount = selection.tags.length + selection.groupCodes.length;
  const taggedGroups = useMemo(
    () => groups.filter((group) => pricingGroupHasTags(group, selection.tags)),
    [groups, selection.tags],
  );
  const visibleGroups = useMemo(
    () => filterPricingGroups(groups, groupQuery, selection.tags),
    [groups, groupQuery, selection.tags],
  );
  const selectedGroupCodes = useMemo(() => new Set(selection.groupCodes), [selection.groupCodes]);

  const toggleTag = (tag: string) => {
    onTagsChange(toggleSelectionValue(selection.tags, tag));
  };
  const toggleGroup = (code: string) => {
    onGroupCodesChange(toggleSelectionValue(selection.groupCodes, code));
  };

  return (
    <section
      aria-label={t('pricing.filters.group')}
      className="mt-4 rounded-lg border border-slate-200 bg-white dark:border-white/10 dark:bg-[#0d0d0d]"
    >
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="inline-flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 text-sm font-semibold text-slate-900 transition-colors hover:text-lobster-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:text-white dark:hover:text-lobster-400"
        >
          <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <span className="shrink-0">{t('pricing.filters.group')}</span>
          {activeCount > 0 ? (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-lobster-500 px-1.5 text-[10px] font-semibold tabular-nums text-white">
              {activeCount}
            </span>
          ) : null}
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-xs tabular-nums text-slate-500 dark:text-slate-400 sm:inline">
            {t('pricing.groups.summary', {
              groups: taggedGroups.length,
              selected: selection.groupCodes.length,
            })}
          </span>
          {activeCount > 0 ? (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-7 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-950 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              {t('pricing.groups.reset')}
            </button>
          ) : null}
        </div>
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-slate-100 px-3 py-3 dark:border-white/5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-medium text-slate-600 dark:text-slate-300">{t('pricing.groups.tags')}</span>
            <button
              type="button"
              aria-pressed={selection.tags.length === 0}
              onClick={() => onTagsChange([])}
              className={tagChipClass(selection.tags.length === 0)}
            >
              {t('pricing.groups.allTags')}
            </button>
            {tagFacets.map((facet) => {
              const active = selection.tags.includes(facet.code);
              return (
                <button
                  key={facet.code}
                  type="button"
                  aria-pressed={active}
                  onClick={() => toggleTag(facet.code)}
                  className={tagChipClass(active)}
                >
                  {groupTagLabel(facet.code, t)}
                  <span className={`ml-1 tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>{facet.count}</span>
                </button>
              );
            })}
            {tagFacets.length === 0 && state === 'ready' ? (
              <span className="text-xs text-slate-400">{t('pricing.groups.noTags')}</span>
            ) : null}
          </div>

          {state === 'failed' ? (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              {t('pricing.groups.failed')}
            </p>
          ) : null}

          {state !== 'failed' ? (
            <>
              <label className="relative block">
                <span className="sr-only">{t('pricing.groups.search')}</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  value={groupQuery}
                  onChange={(event) => setGroupQuery(event.target.value)}
                  placeholder={t('pricing.groups.search')}
                  className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-[#151515] dark:text-white"
                />
              </label>

              <div className="max-h-64 overflow-y-auto rounded-md border border-slate-100 dark:border-white/5">
                {state === 'loading' ? (
                  <p className="px-3 py-6 text-center text-xs text-slate-400">{t('pricing.groups.loading')}</p>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => onGroupCodesChange([])}
                      aria-pressed={selection.groupCodes.length === 0}
                      className={`flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs transition-colors dark:border-white/5 ${
                        selection.groupCodes.length === 0
                          ? 'bg-lobster-50/70 font-semibold text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300'
                          : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <span>{t('pricing.groups.allGroups')}</span>
                      <span className="tabular-nums text-slate-400">{groups.length}</span>
                    </button>
                    {visibleGroups.length === 0 ? (
                      <p className="px-3 py-6 text-center text-xs text-slate-400">{t('pricing.groups.empty')}</p>
                    ) : (
                      visibleGroups.map((group) => (
                        <label
                          key={group.code}
                          className={`flex cursor-pointer items-start gap-2 border-b border-slate-100 px-3 py-2 transition-colors last:border-b-0 dark:border-white/5 ${
                            selectedGroupCodes.has(group.code)
                              ? 'bg-lobster-50/50 dark:bg-lobster-500/[0.07]'
                              : 'hover:bg-slate-50 dark:hover:bg-white/[0.03]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedGroupCodes.has(group.code)}
                            onChange={() => toggleGroup(group.code)}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-slate-300 accent-lobster-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/20"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                              <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">{group.name}</span>
                              <span className="truncate font-mono text-[10px] text-slate-400">{group.code}</span>
                              {group.saleMultiplier ? (
                                <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-semibold tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">
                                  ×{trimMultiplier(group.saleMultiplier)}
                                </span>
                              ) : null}
                            </span>
                            {group.tags.length > 0 ? (
                              <span className="mt-0.5 flex flex-wrap gap-1">
                                {group.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="inline-flex rounded-full bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-600 dark:bg-white/10 dark:text-slate-300"
                                  >
                                    {groupTagLabel(tag, t)}
                                  </span>
                                ))}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      ))
                    )}
                  </>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/** 分组标签的展示名：价格页自带 `pricing.groupTag.*` 词条，未知标签回退可读化 code。 */
export function groupTagLabel(tag: string, t: (key: string) => string): string {
  const translated = t(`pricing.groupTag.${tag}`);
  return translated.startsWith('pricing.groupTag.') ? humanizeCode(tag) : translated;
}

function tagChipClass(active: boolean): string {
  return `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 ${
    active
      ? 'border-lobster-500 bg-lobster-500 text-white'
      : 'border-slate-200 text-slate-600 hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300'
  }`;
}

function trimMultiplier(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.includes('.')) return trimmed || '1';
  return trimmed.replace(/0+$/u, '').replace(/\.$/u, '') || '0';
}
