import type { ComponentType } from 'react';
import {
  AudioLines,
  Braces,
  Boxes,
  CircleDollarSign,
  Code2,
  Image,
  MessageSquareText,
  Music2,
  Sparkles,
  Video,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PRICING_CATEGORY_CODES, type PricingCategoryCode } from '../types/pricing';

const CATEGORY_ICONS: Record<PricingCategoryCode, ComponentType<{ className?: string }>> = {
  all: CircleDollarSign,
  llm: MessageSquareText,
  image: Image,
  video: Video,
  audio: AudioLines,
  music: Music2,
  embedding: Braces,
  sound: Sparkles,
  api: Code2,
  other: Boxes,
};

interface PricingCategoryNavProps {
  activeCategory: PricingCategoryCode;
  counts: ReadonlyMap<string, string>;
  mobile?: boolean;
  onChange: (category: PricingCategoryCode) => void;
}

export function PricingCategoryNav({ activeCategory, counts, mobile = false, onChange }: PricingCategoryNavProps) {
  const { t } = useTranslation();

  if (!mobile) {
    return (
      <aside className="hidden w-56 shrink-0 lg:block" aria-label={t('pricing.categories.label')}>
        <div className="sticky top-[calc(var(--sdkwork-portal-navbar-height,4rem)+1.5rem)]">
          <h2 className="mb-3 px-3 text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
            {t('pricing.categories.label')}
          </h2>
          <nav className="space-y-1">
            {PRICING_CATEGORY_CODES.map((category) => {
              const Icon = CATEGORY_ICONS[category];
              const active = category === activeCategory;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => onChange(category)}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 ${
                    active
                      ? 'bg-slate-900 font-medium text-white dark:bg-white dark:text-slate-950'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{t(`pricing.category.${category}`)}</span>
                  <span className={`text-xs tabular-nums ${active ? 'text-white/70 dark:text-slate-500' : 'text-slate-400'}`}>
                    {counts.get(category) ?? '0'}
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    );
  }

  return (
      <div className="lg:hidden">
        <label htmlFor="pricing-category" className="mb-2 block text-xs font-medium text-slate-600 dark:text-slate-300">
          {t('pricing.categories.label')}
        </label>
        <select
          id="pricing-category"
          value={activeCategory}
          onChange={(event) => onChange(event.target.value as PricingCategoryCode)}
          className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-lobster-500 focus:ring-2 focus:ring-lobster-500/20 dark:border-white/10 dark:bg-[#111] dark:text-white"
        >
          {PRICING_CATEGORY_CODES.map((category) => (
            <option key={category} value={category}>
              {t(`pricing.category.${category}`)} ({counts.get(category) ?? '0'})
            </option>
          ))}
        </select>
      </div>
  );
}
