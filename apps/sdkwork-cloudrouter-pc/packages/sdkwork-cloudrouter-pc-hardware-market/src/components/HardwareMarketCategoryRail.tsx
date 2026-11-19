import { ChevronRight, LayoutGrid } from 'lucide-react';

import {
  resolveCategoryTrail,
  type MarketCategoryNode,
} from '../catalog/hardwareMarketCatalog.ts';

export interface HardwareMarketCategoryRailProps {
  tree: readonly MarketCategoryNode[];
  activeCategoryId: string | null;
  label: string;
  allLabel: string;
  onChange: (categoryId: string | null) => void;
  variant?: 'sidebar' | 'inline';
}

function buttonClasses(active: boolean, variant: 'sidebar' | 'inline'): string {
  const base =
    'inline-flex items-center gap-2 rounded-xl border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500';
  const sizing = variant === 'sidebar' ? 'w-full px-3 py-2' : 'shrink-0 px-3.5 py-2';
  const tone = active
    ? 'border-lobster-300 bg-lobster-500/10 text-lobster-700 dark:border-lobster-500/40 dark:text-lobster-300'
    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:bg-[#0d0d0d] dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white';
  return `${base} ${sizing} ${tone}`;
}

/**
 * Category filter for the market.
 *
 * The sidebar variant shows the root categories and expands the active root into
 * its children, so a deep tree never turns into an unreadable wall of buttons.
 * The inline variant is the mobile equivalent: a horizontally scrollable rail.
 */
export function HardwareMarketCategoryRail({
  tree,
  activeCategoryId,
  label,
  allLabel,
  onChange,
  variant = 'sidebar',
}: HardwareMarketCategoryRailProps) {
  const activeTrail = resolveCategoryTrail(tree, activeCategoryId);
  const activeRoot = activeTrail[0] ?? null;
  const childLevel = activeRoot?.children ?? [];

  if (variant === 'inline') {
    return (
      <nav aria-label={label} className="flex flex-col gap-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            aria-pressed={activeCategoryId === null}
            className={buttonClasses(activeCategoryId === null, 'inline')}
            onClick={() => onChange(null)}
          >
            <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            {allLabel}
          </button>
          {tree.map((node) => (
            <button
              key={node.id}
              type="button"
              aria-pressed={activeCategoryId === node.id}
              className={buttonClasses(activeCategoryId === node.id, 'inline')}
              onClick={() => onChange(node.id)}
            >
              {node.name}
            </button>
          ))}
        </div>
        {childLevel.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {childLevel.map((node) => (
              <button
                key={node.id}
                type="button"
                aria-pressed={activeCategoryId === node.id}
                className={buttonClasses(activeCategoryId === node.id, 'inline')}
                onClick={() => onChange(node.id)}
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                {node.name}
              </button>
            ))}
          </div>
        ) : null}
      </nav>
    );
  }

  return (
    <nav aria-label={label} className="flex flex-col gap-1.5">
      <button
        type="button"
        aria-pressed={activeCategoryId === null}
        className={buttonClasses(activeCategoryId === null, 'sidebar')}
        onClick={() => onChange(null)}
      >
        <LayoutGrid className="h-4 w-4" aria-hidden="true" />
        <span className="truncate">{allLabel}</span>
      </button>
      {tree.map((node) => {
        const isRootActive = activeRoot?.id === node.id;
        const isExactActive = activeCategoryId === node.id;
        return (
          <div key={node.id} className="flex flex-col gap-1">
            <button
              type="button"
              aria-pressed={isExactActive}
              className={buttonClasses(isExactActive || isRootActive, 'sidebar')}
              onClick={() => onChange(node.id)}
            >
              <span className="truncate">{node.name}</span>
              {node.children.length > 0 ? (
                <ChevronRight
                  className={`ml-auto h-3.5 w-3.5 shrink-0 transition-transform ${isRootActive ? 'rotate-90' : ''}`}
                  aria-hidden="true"
                />
              ) : null}
            </button>
            {isRootActive && node.children.length > 0 ? (
              <div className="ml-3 flex flex-col gap-1 border-l border-slate-200 pl-2 dark:border-white/10">
                {node.children.map((child) => (
                  <button
                    key={child.id}
                    type="button"
                    aria-pressed={activeCategoryId === child.id}
                    className={buttonClasses(activeCategoryId === child.id, 'sidebar')}
                    onClick={() => onChange(child.id)}
                  >
                    <span className="truncate">{child.name}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
