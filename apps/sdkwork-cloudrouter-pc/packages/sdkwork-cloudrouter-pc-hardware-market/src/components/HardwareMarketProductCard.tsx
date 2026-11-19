import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import {
  formatMarketAmount,
  productDisplayName,
  productTagline,
  resolveDiscountPercent,
} from '../catalog/hardwareMarketCatalog.ts';
import type { HardwareMarketProductSummary } from '../services/hardwareMarketService.ts';
import { buildHardwareMarketProductPath } from '../routes/hardwareMarketRoutes.ts';
import { HardwareGlyph } from './HardwareGlyph.tsx';

export interface HardwareMarketProductCardProps {
  summary: HardwareMarketProductSummary;
  categoryName: string | null;
  locale: string;
}

export function HardwareMarketProductCard({
  summary,
  categoryName,
  locale,
}: HardwareMarketProductCardProps) {
  const { t } = useTranslation();
  const { product, price, skuCount } = summary;
  const name = productDisplayName(product);
  const tagline = productTagline(product);
  const discount = price ? resolveDiscountPercent(price) : null;
  const priceLabel = price
    ? formatMarketAmount(price.amountMinor, price.currencyCode, price.exponent, locale)
    : t('hardwareMarket.card.priceUnavailable', 'Price on request');
  const listPriceLabel = price?.listAmountMinor
    ? formatMarketAmount(price.listAmountMinor, price.currencyCode, price.exponent, locale)
    : null;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-0.5 hover:border-lobster-300 hover:shadow-xl hover:shadow-slate-900/5 dark:border-white/10 dark:bg-[#0d0d0d] dark:hover:border-lobster-500/40">
      <Link
        to={buildHardwareMarketProductPath(product.id)}
        aria-label={`${t('hardwareMarket.card.view', 'View product')}: ${name}`}
        className="absolute inset-0 z-10 rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500"
      />

      <div className="p-3 pb-0">
        <HardwareGlyph
          seed={product.productNo}
          name={name}
          categoryName={categoryName}
          size="card"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="truncate font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {categoryName ?? t('hardwareMarket.common.dash', '—')}
          </span>
          {discount ? (
            <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
              {t('hardwareMarket.card.discount', '{{percent}}% off', { percent: discount })}
            </span>
          ) : null}
        </div>

        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 dark:text-white">
          {name}
        </h3>

        <p className="line-clamp-2 min-h-[2.5rem] text-sm leading-relaxed text-slate-500 dark:text-slate-400">
          {tagline ?? t('hardwareMarket.card.taglineFallback', 'Published from the Cloud Router Product Center')}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/5">
          <div className="min-w-0">
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
              {t('hardwareMarket.card.from', 'From')}
            </div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="truncate text-lg font-semibold tabular-nums text-lobster-600 dark:text-lobster-400">
                {priceLabel}
              </span>
              {listPriceLabel ? (
                <span className="text-xs font-medium tabular-nums text-slate-400 line-through dark:text-slate-500">
                  <span className="sr-only">{t('hardwareMarket.card.originalPrice', 'List price')}: </span>
                  {listPriceLabel}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1 text-xs font-medium text-slate-400 dark:text-slate-500">
            {skuCount > 0 ? (
              <span>
                {t('hardwareMarket.card.skuCount', '{{count}} variants', { count: skuCount })}
              </span>
            ) : null}
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </article>
  );
}
