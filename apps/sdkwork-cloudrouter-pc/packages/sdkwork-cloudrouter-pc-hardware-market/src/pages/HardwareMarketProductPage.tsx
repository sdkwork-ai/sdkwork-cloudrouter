import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingBag,
} from 'lucide-react';

import {
  HARDWARE_MARKET_MAX_QUANTITY,
  HARDWARE_MARKET_MIN_QUANTITY,
  clampQuantity,
  describeSkuLabel,
  findCategory,
  formatMarketAmount,
  formatMarketDate,
  isSellableSku,
  productDisplayName,
  resolveCategoryTrail,
  resolveDiscountPercent,
  resolveMarketPrice,
  resolveSkuPrice,
  sortSkusForDisplay,
  type MarketCategoryNode,
} from '../catalog/hardwareMarketCatalog.ts';
import {
  isHardwareMarketAbort,
  loadHardwareMarketCategories,
  loadHardwareMarketProduct,
  type HardwareMarketProductDetail,
} from '../services/hardwareMarketService.ts';
import { HARDWARE_MARKET_ROUTE_PATH } from '../routes/hardwareMarketRoutes.ts';
import { HardwareGlyph } from '../components/HardwareGlyph.tsx';
import { HardwareMarketPurchaseDialog } from '../components/HardwareMarketPurchaseDialog.tsx';
import { HardwareMarketError } from '../components/HardwareMarketStates.tsx';

function toCategoryLink(categoryId: string): string {
  return `${HARDWARE_MARKET_ROUTE_PATH}?category=${encodeURIComponent(categoryId)}`;
}

/**
 * Product detail page of the Smart Hardware Market.
 *
 * The page reads one catalog product and its active SKUs, lets the buyer pick a
 * configuration and quantity, and hands the purchase to the shared order
 * checkout. Configuration options come from the SKU `attributeValues` rows the
 * Product Center publishes, so a variant matrix never drifts from the catalog.
 */
export function HardwareMarketProductPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const { productId = '' } = useParams<{ productId: string }>();

  const [detail, setDetail] = useState<HardwareMarketProductDetail | null>(null);
  const [categories, setCategories] = useState<MarketCategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [selectedSkuId, setSelectedSkuId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(HARDWARE_MARKET_MIN_QUANTITY);
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    loadHardwareMarketCategories({ signal: controller.signal })
      .then((tree) => {
        if (!controller.signal.aborted) {
          setCategories(tree);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isHardwareMarketAbort(error)) {
          setCategories([]);
        }
      });
    return () => controller.abort();
  }, [reloadVersion]);

  useEffect(() => {
    if (!productId) {
      setLoading(false);
      setFailed(true);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    loadHardwareMarketProduct(productId, { signal: controller.signal })
      .then((nextDetail) => {
        if (!controller.signal.aborted) {
          setDetail(nextDetail);
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && !isHardwareMarketAbort(error)) {
          setDetail(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [productId, reloadVersion]);

  useEffect(() => {
    if (!detail) {
      return;
    }
    const sellable = sortSkusForDisplay(detail.skus).filter(isSellableSku);
    setSelectedSkuId((current) => {
      if (current && sellable.some((sku) => sku.id === current)) {
        return current;
      }
      return sellable[0]?.id ?? null;
    });
  }, [detail]);

  const sortedSkus = useMemo(
    () => (detail ? sortSkusForDisplay(detail.skus) : []),
    [detail],
  );
  const selectedSku = detail?.skus.find((sku) => sku.id === selectedSkuId) ?? null;
  const product = detail?.product ?? null;
  const defaultPrice = useMemo(
    () => (detail ? resolveMarketPrice(detail.skus) : null),
    [detail],
  );
  const selectedPrice = selectedSku ? resolveSkuPrice(selectedSku) : defaultPrice;
  const discount = selectedPrice ? resolveDiscountPercent(selectedPrice) : null;
  const priceLabel = selectedPrice
    ? formatMarketAmount(selectedPrice.amountMinor, selectedPrice.currencyCode, selectedPrice.exponent, locale)
    : t('hardwareMarket.card.priceUnavailable', 'Price on request');
  const listPriceLabel = selectedPrice?.listAmountMinor
    ? formatMarketAmount(selectedPrice.listAmountMinor, selectedPrice.currencyCode, selectedPrice.exponent, locale)
    : null;

  const categoryName = product ? findCategory(categories, product.categoryId)?.name ?? null : null;
  const categoryTrail = product ? resolveCategoryTrail(categories, product.categoryId) : [];

  const canBuy =
    product?.status === 'active' &&
    product.salesStatus === 'active' &&
    (selectedSku ? isSellableSku(selectedSku) : false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = product
      ? `${productDisplayName(product)} · ${t('hardwareMarket.meta.title', 'Smart Hardware Market')}`
      : t('hardwareMarket.meta.title', 'Smart Hardware Market');
    return () => {
      document.title = previousTitle;
    };
  }, [product, t]);

  const retry = () => {
    setReloadVersion((current) => current + 1);
  };

  return (
    <main className="min-h-[calc(100vh-var(--sdkwork-portal-navbar-height,4rem))] bg-slate-50 text-slate-950 dark:bg-[#080808] dark:text-white">
      <div className="mx-auto w-full max-w-7xl px-4 pb-16 pt-[calc(var(--sdkwork-portal-navbar-height,4rem)+2rem)] sm:px-6 lg:px-8">
        <Link
          to={HARDWARE_MARKET_ROUTE_PATH}
          className="inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-500 transition-colors hover:text-lobster-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {t('hardwareMarket.detail.back', 'Back to the market')}
        </Link>

        {loading ? (
          <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-24 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t('hardwareMarket.state.loading', 'Loading the hardware catalog...')}
          </div>
        ) : null}

        {!loading && failed ? (
          <div className="pt-8">
            <HardwareMarketError
              title={t('hardwareMarket.detail.notFound', 'This product is no longer available in the market.')}
              hint={t(
                'hardwareMarket.state.errorHint',
                'Check your connection and try again.',
              )}
              retryLabel={t('hardwareMarket.state.retry', 'Try again')}
              onRetry={retry}
            />
          </div>
        ) : null}

        {!loading && !failed && product ? (
          <>
            <nav aria-label={t('hardwareMarket.detail.breadcrumb', 'Breadcrumb')} className="mt-4">
              <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <li>
                  <Link
                    to={HARDWARE_MARKET_ROUTE_PATH}
                    className="rounded transition-colors hover:text-lobster-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:hover:text-white"
                  >
                    {t('hardwareMarket.hero.title', 'Smart Hardware Market')}
                  </Link>
                </li>
                {categoryTrail.map((category) => (
                  <li key={category.id} className="flex items-center gap-1">
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    <Link
                      to={toCategoryLink(category.id)}
                      className="rounded transition-colors hover:text-lobster-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:hover:text-white"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
                <li className="flex items-center gap-1 text-slate-700 dark:text-slate-200">
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="line-clamp-1">{productDisplayName(product)}</span>
                </li>
              </ol>
            </nav>

            <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
              <div>
                <HardwareGlyph
                  seed={product.productNo}
                  name={productDisplayName(product)}
                  categoryName={categoryName}
                  size="hero"
                />
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-lobster-500/10 px-3 py-1 text-xs font-semibold text-lobster-700 dark:text-lobster-300">
                    <Package className="h-3.5 w-3.5" aria-hidden="true" />
                    {t(`hardwareMarket.type.${product.productType}`, product.productType)}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                    {categoryName ?? t('hardwareMarket.common.dash', '—')}
                  </span>
                </div>

                {product.description?.trim() ? (
                  <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0d0d0d]">
                    <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      {t('hardwareMarket.detail.about', 'About this product')}
                    </h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {product.description.trim()}
                    </p>
                  </section>
                ) : null}

                <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0d0d0d]">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('hardwareMarket.detail.specs', 'Specifications')}
                  </h2>
                  {sortedSkus.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                      {t('hardwareMarket.detail.skuEmpty', 'No configuration is on sale right now.')}
                    </p>
                  ) : (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[34rem] border-collapse text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-white/10 dark:text-slate-400">
                            <th scope="col" className="py-2 pr-4 font-semibold">
                              {t('hardwareMarket.detail.skuConfiguration', 'Configuration')}
                            </th>
                            <th scope="col" className="py-2 pr-4 font-semibold">
                              {t('hardwareMarket.detail.skuNo', 'SKU')}
                            </th>
                            <th scope="col" className="py-2 pr-4 font-semibold">
                              {t('hardwareMarket.detail.price', 'Price')}
                            </th>
                            <th scope="col" className="py-2 font-semibold">
                              {t('hardwareMarket.detail.availability', 'Availability')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedSkus.map((sku) => {
                            const sellable = isSellableSku(sku);
                            const price = resolveSkuPrice(sku);
                            return (
                              <tr key={sku.id} className="border-b border-slate-100 last:border-0 dark:border-white/5">
                                <td className="py-2.5 pr-4 font-medium text-slate-900 dark:text-white">
                                  {describeSkuLabel(sku)}
                                </td>
                                <td className="py-2.5 pr-4 font-mono text-xs text-slate-500 dark:text-slate-400">
                                  {sku.skuNo}
                                </td>
                                <td className="py-2.5 pr-4 tabular-nums text-slate-900 dark:text-white">
                                  {sellable && price
                                    ? formatMarketAmount(price.amountMinor, price.currencyCode, price.exponent, locale)
                                    : t('hardwareMarket.detail.skuUnavailable', 'Unavailable')}
                                </td>
                                <td className="py-2.5 text-slate-500 dark:text-slate-400">
                                  {sku.inventoryTracking === 'quantity'
                                    ? t('hardwareMarket.detail.stockTracked', 'Stock tracked')
                                    : t('hardwareMarket.detail.stockUntracked', 'Always available')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-[#0d0d0d]">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {t('hardwareMarket.detail.info', 'Product information')}
                  </h2>
                  <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
                    {[
                      { key: 'productNo', label: t('hardwareMarket.detail.productNo', 'Product no.'), value: product.productNo },
                      { key: 'category', label: t('hardwareMarket.detail.category', 'Category'), value: categoryName ?? t('hardwareMarket.common.dash', '—') },
                      { key: 'type', label: t('hardwareMarket.detail.type', 'Fulfillment type'), value: t(`hardwareMarket.type.${product.productType}`, product.productType) },
                      { key: 'status', label: t('hardwareMarket.detail.status', 'Status'), value: t(`hardwareMarket.detail.statusValue.${product.status}`, product.status) },
                      { key: 'publishedAt', label: t('hardwareMarket.detail.publishedAt', 'Published'), value: formatMarketDate(product.publishedAt, locale) ?? t('hardwareMarket.common.dash', '—') },
                      { key: 'updatedAt', label: t('hardwareMarket.detail.updatedAt', 'Updated'), value: formatMarketDate(product.updatedAt, locale) ?? t('hardwareMarket.common.dash', '—') },
                    ].map((row) => (
                      <div key={row.key} className="flex items-baseline justify-between gap-4 border-b border-slate-100 pb-2 text-sm dark:border-white/5">
                        <dt className="text-slate-500 dark:text-slate-400">{row.label}</dt>
                        <dd className="text-right font-medium text-slate-900 dark:text-white">{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              </div>

              <aside className="lg:sticky lg:top-[calc(var(--sdkwork-portal-navbar-height,4rem)+2rem)] lg:self-start">
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#0d0d0d]">
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {productDisplayName(product)}
                  </h1>
                  {product.subtitle?.trim() ? (
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                      {product.subtitle.trim()}
                    </p>
                  ) : null}

                  <div className="mt-5 flex flex-wrap items-baseline gap-2">
                    <span className="text-3xl font-bold tabular-nums text-lobster-600 dark:text-lobster-400">
                      {priceLabel}
                    </span>
                    {listPriceLabel ? (
                      <span className="text-sm font-medium tabular-nums text-slate-400 line-through dark:text-slate-500">
                        {listPriceLabel}
                      </span>
                    ) : null}
                    {discount ? (
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-600 dark:bg-rose-500/10 dark:text-rose-300">
                        {t('hardwareMarket.card.discount', '{{percent}}% off', { percent: discount })}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-6">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {t('hardwareMarket.detail.skuTitle', 'Choose a configuration')}
                    </h2>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {t('hardwareMarket.detail.skuDescription', 'Every configuration is a sellable SKU of this product.')}
                    </p>

                    {sortedSkus.length === 0 ? (
                      <p className="mt-3 rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">
                        {t('hardwareMarket.detail.skuEmpty', 'No configuration is on sale right now.')}
                      </p>
                    ) : (
                      <div role="radiogroup" aria-label={t('hardwareMarket.detail.skuTitle', 'Choose a configuration')} className="mt-3 flex flex-col gap-2">
                        {sortedSkus.map((sku) => {
                          const sellable = isSellableSku(sku);
                          const price = resolveSkuPrice(sku);
                          const selected = sku.id === selectedSkuId;
                          return (
                            <button
                              key={sku.id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              disabled={!sellable}
                              onClick={() => setSelectedSkuId(sku.id)}
                              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-55 ${
                                selected
                                  ? 'border-lobster-400 bg-lobster-500/5 dark:border-lobster-500/50'
                                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-white/10 dark:bg-[#111111] dark:hover:border-white/20'
                              }`}
                            >
                              <span className="min-w-0">
                                <span className="block truncate font-medium text-slate-900 dark:text-white">
                                  {describeSkuLabel(sku)}
                                </span>
                                <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
                                  {t('hardwareMarket.detail.skuNo', 'SKU')}: {sku.skuNo} ·{' '}
                                  {sku.inventoryTracking === 'quantity'
                                    ? t('hardwareMarket.detail.stockTracked', 'Stock tracked')
                                    : t('hardwareMarket.detail.stockUntracked', 'Always available')}
                                </span>
                              </span>
                              <span className="shrink-0 text-right">
                                {sellable && price ? (
                                  <span className="block font-semibold tabular-nums text-slate-900 dark:text-white">
                                    {formatMarketAmount(price.amountMinor, price.currencyCode, price.exponent, locale)}
                                  </span>
                                ) : (
                                  <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
                                    {t('hardwareMarket.detail.skuUnavailable', 'Unavailable')}
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {t('hardwareMarket.detail.quantity', 'Quantity')}
                    </span>
                    <div className="inline-flex items-center rounded-xl border border-slate-300 dark:border-white/15">
                      <button
                        type="button"
                        aria-label={t('hardwareMarket.detail.decreaseQuantity', 'Decrease quantity')}
                        onClick={() => setQuantity((current) => clampQuantity(current - 1))}
                        disabled={quantity <= HARDWARE_MARKET_MIN_QUANTITY}
                        className="rounded-l-xl px-2.5 py-2 text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500 dark:hover:text-white"
                      >
                        <Minus className="h-4 w-4" aria-hidden="true" />
                      </button>
                      <input
                        type="number"
                        min={HARDWARE_MARKET_MIN_QUANTITY}
                        max={HARDWARE_MARKET_MAX_QUANTITY}
                        aria-label={t('hardwareMarket.detail.quantity', 'Quantity')}
                        value={quantity}
                        onChange={(event) => {
                          const next = Number.parseInt(event.target.value, 10);
                          if (Number.isFinite(next)) {
                            setQuantity(clampQuantity(next));
                          }
                        }}
                        className="w-12 border-x border-slate-300 bg-transparent py-2 text-center text-sm tabular-nums text-slate-900 focus:outline-none dark:border-white/15 dark:text-white"
                      />
                      <button
                        type="button"
                        aria-label={t('hardwareMarket.detail.increaseQuantity', 'Increase quantity')}
                        onClick={() => setQuantity((current) => clampQuantity(current + 1))}
                        disabled={quantity >= HARDWARE_MARKET_MAX_QUANTITY}
                        className="rounded-r-xl px-2.5 py-2 text-slate-500 transition-colors hover:text-slate-900 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-lobster-500 dark:hover:text-white"
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!canBuy}
                    onClick={() => setPurchaseOpen(true)}
                    className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-lobster-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-lobster-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-offset-[#0d0d0d]"
                  >
                    <ShoppingBag className="h-4 w-4" aria-hidden="true" />
                    {selectedSku
                      ? t('hardwareMarket.detail.buy', 'Buy now')
                      : t('hardwareMarket.detail.selectSku', 'Select a configuration to continue')}
                  </button>

                  <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    {t('hardwareMarket.purchase.paymentHint', 'The order is handed to the platform cashier after it is placed.')}
                  </p>
                </div>
              </aside>
            </div>
          </>
        ) : null}
      </div>

      {detail ? (
        <HardwareMarketPurchaseDialog
          isOpen={purchaseOpen}
          product={detail.product}
          sku={selectedSku}
          initialQuantity={quantity}
          onClose={() => setPurchaseOpen(false)}
        />
      ) : null}
    </main>
  );
}
