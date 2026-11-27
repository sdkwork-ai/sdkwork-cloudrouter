import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { humanizeCode } from '../catalog/dataNames';
import {
  buildPricingGroupTypeFacets,
  filterPricingGroups,
  pricingGroupType,
  toggleSelectionValue,
  type PricingGroupOption,
  type PricingGroupSelection,
  type PricingGroupTagFacet,
  type PricingGroupTypeCode,
} from '../types/pricingGroup';

interface PricingGroupFilterProps {
  groups: readonly PricingGroupOption[];
  tagFacets: readonly PricingGroupTagFacet[];
  selection: PricingGroupSelection;
  state: 'loading' | 'ready' | 'failed';
  onTypesChange: (types: PricingGroupTypeCode[]) => void;
  onTagsChange: (tags: string[]) => void;
  onGroupCodesChange: (codes: string[]) => void;
  onClear: () => void;
}

const SHOW_DELAY_MILLIS = 120;
const HIDE_DELAY_MILLIS = 180;
const PANEL_GAP = 8;
const VIEWPORT_MARGIN = 12;

interface PanelPlacement {
  top: number;
  left: number;
  /** true 表示下方空间不足，弹层翻转到触发器上方 */
  flip: boolean;
}

/**
 * 价格页分组筛选：与搜索/区域/计量/币种同处一行，鼠标悬停（或点击/键盘聚焦）
 * 弹出浮层。浮层内先按分组类型（全部/LLM/图片/视频/音乐/语音/混合）切换，
 * 再按标签与关键词收窄，最后勾选具体分组——勾选即时生效，浮层不打断操作。
 */
export function PricingGroupFilter({
  groups,
  tagFacets,
  selection,
  state,
  onTypesChange,
  onTagsChange,
  onGroupCodesChange,
  onClear,
}: PricingGroupFilterProps) {
  const { t } = useTranslation();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const showTimerRef = useRef<number | null>(null);
  const hideTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<PanelPlacement | null>(null);
  const [groupQuery, setGroupQuery] = useState('');

  const activeCount = selection.types.length + selection.tags.length + selection.groupCodes.length;
  const [activeType] = selection.types;
  const activeTypeLabel = selection.types.length === 1 && activeType
    ? t(`pricing.groups.type.${activeType}`)
    : null;
  const typeFacets = useMemo(() => buildPricingGroupTypeFacets(groups), [groups]);
  const typeCounts = useMemo(
    () => new Map(typeFacets.map((facet) => [facet.code, facet.count])),
    [typeFacets],
  );
  const visibleGroups = useMemo(
    () => filterPricingGroups(groups, {
      query: groupQuery,
      tags: selection.tags,
      types: selection.types,
    }),
    [groupQuery, groups, selection.tags, selection.types],
  );
  const selectedGroupCodes = useMemo(() => new Set(selection.groupCodes), [selection.groupCodes]);

  const cancelShow = useCallback(() => {
    if (showTimerRef.current !== null) {
      window.clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  const cancelHide = useCallback(() => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      cancelShow();
      cancelHide();
    },
    [cancelHide, cancelShow],
  );

  /** 按触发器实际位置摆放浮层：右对齐触发器，下方空间不足时翻转到上方。 */
  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel) {
      return;
    }
    const triggerRect = trigger.getBoundingClientRect();
    const panelWidth = panel.offsetWidth;
    const panelHeight = panel.offsetHeight;
    const belowTop = triggerRect.bottom + PANEL_GAP;
    const aboveTop = triggerRect.top - PANEL_GAP - panelHeight;
    const fitsBelow = belowTop + panelHeight <= window.innerHeight - VIEWPORT_MARGIN;
    const fitsAbove = aboveTop >= VIEWPORT_MARGIN;
    const flip = !fitsBelow && fitsAbove;
    const top = flip
      ? Math.max(VIEWPORT_MARGIN, aboveTop)
      : Math.min(
          Math.max(VIEWPORT_MARGIN, belowTop),
          Math.max(VIEWPORT_MARGIN, window.innerHeight - panelHeight - VIEWPORT_MARGIN),
        );
    const left = Math.min(
      Math.max(VIEWPORT_MARGIN, triggerRect.right - panelWidth),
      Math.max(VIEWPORT_MARGIN, window.innerWidth - panelWidth - VIEWPORT_MARGIN),
    );
    setPlacement({ top, left, flip });
  }, []);

  const openPanel = useCallback((focusSearch: boolean) => {
    cancelShow();
    cancelHide();
    setOpen(true);
    if (focusSearch) {
      // 浮层是异步挂载的，下一帧再聚焦搜索框，避免焦点丢回文档根节点。
      window.requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [cancelHide, cancelShow]);

  const closePanel = useCallback(() => {
    cancelShow();
    cancelHide();
    setOpen(false);
  }, [cancelHide, cancelShow]);

  const handleTriggerEnter = (_event: ReactPointerEvent<HTMLButtonElement>) => {
    cancelHide();
    if (showTimerRef.current !== null || open) {
      return;
    }
    showTimerRef.current = window.setTimeout(() => {
      showTimerRef.current = null;
      setOpen(true);
    }, SHOW_DELAY_MILLIS);
  };

  const handleTriggerLeave = () => {
    cancelShow();
    if (hideTimerRef.current !== null) {
      return;
    }
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      setOpen(false);
    }, HIDE_DELAY_MILLIS);
  };

  const handleTriggerClick = (event: ReactMouseEvent<HTMLButtonElement>) => {
    if (open) {
      closePanel();
      return;
    }
    // 键盘（Enter/Space）与鼠标点击都展开；键盘激活时把焦点送进搜索框。
    openPanel(event.detail === 0);
  };

  const handlePanelEnter = () => {
    cancelHide();
  };

  const handlePanelLeave = () => {
    cancelShow();
    if (hideTimerRef.current !== null) {
      return;
    }
    hideTimerRef.current = window.setTimeout(() => {
      hideTimerRef.current = null;
      setOpen(false);
    }, HIDE_DELAY_MILLIS);
  };

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    // 先以隐藏态渲染并测量真实尺寸，再定位显示，避免闪烁与错误落点。
    measure();
    const reposition = () => {
      const trigger = triggerRef.current;
      if (!trigger) {
        return;
      }
      const rect = trigger.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        setOpen(false);
        return;
      }
      measure();
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [measure, open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const isInside = (target: EventTarget | null): boolean =>
      target instanceof Node
      && (triggerRef.current?.contains(target) === true || panelRef.current?.contains(target) === true);
    const handlePointerDown = (event: globalThis.PointerEvent) => {
      if (!isInside(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }
      setOpen(false);
      triggerRef.current?.focus();
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (!isInside(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocusIn);
    };
  }, [open]);

  const toggleType = (type: PricingGroupTypeCode) => {
    // 类型是单选作用域：「全部」= 不限类型；再次点击同类型回到全部。
    onTypesChange(selection.types.includes(type) ? [] : [type]);
  };
  const toggleTag = (tag: string) => {
    onTagsChange(toggleSelectionValue(selection.tags, tag));
  };
  const toggleGroup = (code: string) => {
    onGroupCodesChange(toggleSelectionValue(selection.groupCodes, code));
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={activeTypeLabel
          ? t('pricing.groups.openWithType', { type: activeTypeLabel })
          : t('pricing.groups.open')}
        onPointerEnter={handleTriggerEnter}
        onPointerLeave={handleTriggerLeave}
        onClick={handleTriggerClick}
        className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md border bg-white px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:bg-[#151515] ${
          activeCount > 0
            ? 'border-lobster-500/60 text-lobster-600 dark:border-lobster-500/50 dark:text-lobster-300'
            : 'border-slate-300 text-slate-700 hover:border-slate-400 dark:border-white/10 dark:text-slate-200 dark:hover:border-white/20'
        }`}
      >
        <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
        <span className="whitespace-nowrap">{t('pricing.filters.group')}</span>
        {activeTypeLabel ? (
          <span className="max-w-24 truncate text-xs font-normal text-slate-500 dark:text-slate-400">
            · {activeTypeLabel}
          </span>
        ) : null}
        {activeCount > 0 ? (
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-lobster-500 px-1.5 text-[10px] font-semibold tabular-nums text-white">
            {activeCount}
          </span>
        ) : null}
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden="true"
        />
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={panelId}
              role="dialog"
              aria-label={t('pricing.filters.group')}
              className="fixed z-[45] w-[32rem] max-w-[calc(100vw_-_1.5rem)]"
              style={{
                top: placement?.top ?? 0,
                left: placement?.left ?? 0,
                visibility: placement ? 'visible' : 'hidden',
              }}
              onPointerEnter={handlePanelEnter}
              onPointerLeave={handlePanelLeave}
            >
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#141414]">
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 dark:border-white/5">
                  <div className="flex min-w-0 items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {t('pricing.filters.group')}
                    </span>
                    <span className="truncate text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {t('pricing.groups.summary', {
                        groups: visibleGroups.length,
                        selected: selection.groupCodes.length,
                      })}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClear}
                    disabled={activeCount === 0}
                    title={t('pricing.groups.reset')}
                    aria-label={t('pricing.groups.reset')}
                    className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-400 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-35 dark:border-white/10 dark:text-slate-300 dark:hover:text-white"
                  >
                    <RotateCcw className="h-3 w-3" aria-hidden="true" />
                    {t('pricing.groups.reset')}
                  </button>
                </div>

                {groups.length > 0 ? (
                  <div
                    className="flex flex-wrap items-center gap-1 border-b border-slate-100 px-3 py-2 dark:border-white/5"
                    role="group"
                    aria-label={t('pricing.groups.types')}
                  >
                    <button
                      type="button"
                      aria-pressed={selection.types.length === 0}
                      onClick={() => onTypesChange([])}
                      className={typeChipClass(selection.types.length === 0)}
                    >
                      {t('pricing.groups.type.all')}
                      <span className={`ml-1 tabular-nums ${selection.types.length === 0 ? 'text-white/80' : 'text-slate-400'}`}>
                        {groups.length}
                      </span>
                    </button>
                    {typeFacets.map((facet) => {
                      const active = selection.types.includes(facet.code);
                      return (
                        <button
                          key={facet.code}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleType(facet.code)}
                          className={typeChipClass(active)}
                        >
                          {t(`pricing.groups.type.${facet.code}`)}
                          <span className={`ml-1 tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>
                            {typeCounts.get(facet.code) ?? 0}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {state === 'failed' ? (
                  <p className="m-3 rounded-md bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                    {t('pricing.groups.failed')}
                  </p>
                ) : (
                  <>
                    <div className="space-y-2 border-b border-slate-100 px-3 py-2 dark:border-white/5">
                      <label className="relative block">
                        <span className="sr-only">{t('pricing.groups.search')}</span>
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                          aria-hidden="true"
                        />
                        <input
                          ref={searchRef}
                          type="search"
                          value={groupQuery}
                          onChange={(event) => setGroupQuery(event.target.value)}
                          placeholder={t('pricing.groups.search')}
                          className="h-9 w-full rounded-md border border-slate-300 bg-white pl-8 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-[#1b1b1b] dark:text-white"
                        />
                      </label>
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="mr-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                          {t('pricing.groups.tags')}
                        </span>
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
                              <span className={`ml-1 tabular-nums ${active ? 'text-white/80' : 'text-slate-400'}`}>
                                {facet.count}
                              </span>
                            </button>
                          );
                        })}
                        {tagFacets.length === 0 && state === 'ready' ? (
                          <span className="text-xs text-slate-400">{t('pricing.groups.noTags')}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="max-h-64 min-h-0 overflow-y-auto px-1.5 py-1.5">
                      {state === 'loading' ? (
                        <p className="px-3 py-8 text-center text-xs text-slate-400">{t('pricing.groups.loading')}</p>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onGroupCodesChange([])}
                            aria-pressed={selection.groupCodes.length === 0}
                            className={`flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                              selection.groupCodes.length === 0
                                ? 'bg-lobster-50/70 font-semibold text-lobster-700 dark:bg-lobster-500/10 dark:text-lobster-300'
                                : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/[0.03]'
                            }`}
                          >
                            <span>{t('pricing.groups.allGroups')}</span>
                            <span className="tabular-nums text-slate-400">{visibleGroups.length}</span>
                          </button>
                          {visibleGroups.length === 0 ? (
                            <p className="px-3 py-8 text-center text-xs text-slate-400">{t('pricing.groups.empty')}</p>
                          ) : (
                            visibleGroups.map((group) => (
                              <label
                                key={group.code}
                                className={`flex cursor-pointer items-start gap-2 rounded-md px-2.5 py-1.5 transition-colors ${
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
                                    <span className="truncate text-xs font-medium text-slate-800 dark:text-slate-200">
                                      {group.name}
                                    </span>
                                    <span className="truncate font-mono text-[10px] text-slate-400">{group.code}</span>
                                    <span className="inline-flex shrink-0 items-center rounded-full border border-slate-200 px-1.5 py-px text-[10px] font-medium text-slate-500 dark:border-white/10 dark:text-slate-400">
                                      {t(`pricing.groups.type.${pricingGroupType(group)}`)}
                                    </span>
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

                    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 dark:border-white/5">
                      <span className="min-w-0 truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {t('pricing.groups.hint')}
                      </span>
                      <button
                        type="button"
                        onClick={closePanel}
                        className="inline-flex h-7 shrink-0 items-center rounded-md bg-slate-900 px-3 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                      >
                        {t('pricing.groups.done')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

/** 分组标签的展示名：价格页自带 `pricing.groupTag.*` 词条，未知标签回退可读化 code。 */
export function groupTagLabel(tag: string, t: (key: string) => string): string {
  const translated = t(`pricing.groupTag.${tag}`);
  return translated.startsWith('pricing.groupTag.') ? humanizeCode(tag) : translated;
}

function typeChipClass(active: boolean): string {
  return `inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 ${
    active
      ? 'border-lobster-500 bg-lobster-500 text-white'
      : 'border-slate-200 text-slate-600 hover:border-lobster-300 hover:text-lobster-600 dark:border-white/10 dark:text-slate-300 dark:hover:border-lobster-500/40 dark:hover:text-lobster-300'
  }`;
}

function tagChipClass(active: boolean): string {
  return `inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 ${
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
