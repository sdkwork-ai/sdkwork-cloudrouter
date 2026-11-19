import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Loader2, ShieldCheck, X } from 'lucide-react';

import {
  buildPortalAuthLoginRedirect,
  hasStoredPortalSession,
} from '@sdkwork/cloudroutes-pc-commons';
import { getCloudRouterPhysicalPurchaseService } from '@sdkwork/cloudroutes-pc-commons/domain-service-providers';
import type { CatalogProduct, CatalogSku } from '@sdkwork/cloudroutes-pc-commons/sdk-clients';

import {
  EMPTY_SHIPPING_ADDRESS,
  HARDWARE_MARKET_MAX_QUANTITY,
  HARDWARE_MARKET_MIN_QUANTITY,
  clampQuantity,
  createCheckoutAttemptKey,
  describeSkuLabel,
  formatMarketAmount,
  productDisplayName,
  resolveShippingAddressErrors,
  toPhysicalShippingAddress,
  type HardwareMarketShippingAddressField,
  type HardwareMarketShippingAddressInput,
} from '../catalog/hardwareMarketCatalog.ts';
import { HardwareGlyph } from './HardwareGlyph.tsx';

/**
 * Checkout dialog for one physical SKU.
 *
 * The Product Center owns the catalog and the Order module owns checkout, so the
 * dialog only collects a shipping address, asks the server to price the basket
 * (`prepareCheckout`), and then places the order. Payment stays with the shared
 * cashier route the order is handed to.
 */

interface HardwareMarketQuote {
  checkoutSessionId: string;
  currencyCode: string;
  originalAmount: string;
  discountAmount: string;
  payableAmount: string;
}

interface AddressFieldDefinition {
  name: HardwareMarketShippingAddressField;
  labelKey: string;
  required: boolean;
  autoComplete: string;
  inputMode?: 'tel' | 'text';
}

const ADDRESS_FIELDS: readonly AddressFieldDefinition[] = [
  { name: 'receiverName', labelKey: 'hardwareMarket.purchase.receiverName', required: true, autoComplete: 'name' },
  { name: 'receiverPhone', labelKey: 'hardwareMarket.purchase.receiverPhone', required: true, autoComplete: 'tel', inputMode: 'tel' },
  { name: 'countryCode', labelKey: 'hardwareMarket.purchase.countryCode', required: true, autoComplete: 'country' },
  { name: 'province', labelKey: 'hardwareMarket.purchase.province', required: true, autoComplete: 'address-level1' },
  { name: 'city', labelKey: 'hardwareMarket.purchase.city', required: true, autoComplete: 'address-level2' },
  { name: 'district', labelKey: 'hardwareMarket.purchase.district', required: false, autoComplete: 'address-level3' },
  { name: 'detailAddress', labelKey: 'hardwareMarket.purchase.detailAddress', required: true, autoComplete: 'street-address' },
  { name: 'postalCode', labelKey: 'hardwareMarket.purchase.postalCode', required: false, autoComplete: 'postal-code' },
];

const INPUT_CLASSES =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-lobster-400 focus:outline-none focus:ring-2 focus:ring-lobster-500/30 dark:border-white/15 dark:bg-[#141414] dark:text-white';
const INPUT_ERROR_CLASSES =
  'border-rose-400 focus:border-rose-500 focus:ring-rose-500/30 dark:border-rose-500/60';

export interface HardwareMarketPurchaseDialogProps {
  isOpen: boolean;
  product: CatalogProduct;
  sku: CatalogSku | null;
  initialQuantity?: number;
  onClose: () => void;
}

export function HardwareMarketPurchaseDialog({
  isOpen,
  product,
  sku,
  initialQuantity = HARDWARE_MARKET_MIN_QUANTITY,
  onClose,
}: HardwareMarketPurchaseDialogProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en-US';
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState<'address' | 'quote'>('address');
  const [quantity, setQuantity] = useState(() => clampQuantity(initialQuantity));
  const [address, setAddress] = useState<HardwareMarketShippingAddressInput>(EMPTY_SHIPPING_ADDRESS);
  const [missingFields, setMissingFields] = useState<HardwareMarketShippingAddressField[]>([]);
  const [quote, setQuote] = useState<HardwareMarketQuote | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const attemptKeyRef = useRef('');

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setStep('address');
    setQuantity(clampQuantity(initialQuantity));
    setAddress(EMPTY_SHIPPING_ADDRESS);
    setMissingFields([]);
    setQuote(null);
    setBusy(false);
    setFailed(false);
    setHasSession(hasStoredPortalSession());
    attemptKeyRef.current = createCheckoutAttemptKey();
  }, [initialQuantity, isOpen, sku?.id]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !sku) {
    return null;
  }

  // Captured as a local so the async checkout handlers keep the non-null
  // narrowing the guard established (closures do not inherit it from `sku`).
  const activeSku = sku;
  const name = productDisplayName(product);
  const skuLabel = describeSkuLabel(activeSku);
  const unitPrice = formatMarketAmount(
    activeSku.salePriceMinor,
    activeSku.currencyCode,
    activeSku.minorUnitExponent,
    locale,
  );

  function changeField(field: HardwareMarketShippingAddressField, value: string): void {
    setAddress((current) => {
      switch (field) {
        case 'receiverName':
          return { ...current, receiverName: value };
        case 'receiverPhone':
          return { ...current, receiverPhone: value };
        case 'countryCode':
          return { ...current, countryCode: value };
        case 'province':
          return { ...current, province: value };
        case 'city':
          return { ...current, city: value };
        case 'district':
          return { ...current, district: value };
        case 'detailAddress':
          return { ...current, detailAddress: value };
        case 'postalCode':
          return { ...current, postalCode: value };
        default:
          return current;
      }
    });
    setMissingFields((current) => current.filter((item) => item !== field));
  }

  function handleSignIn(): void {
    const redirect = buildPortalAuthLoginRedirect(location);
    onClose();
    navigate(redirect);
  }

  async function prepareQuote(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) {
      return;
    }
    const missing = resolveShippingAddressErrors(address);
    if (missing.length > 0) {
      setMissingFields(missing);
      setFailed(false);
      return;
    }

    setBusy(true);
    setFailed(false);
    // One attempt key per priced basket. Re-pricing after an address edit must
    // not reuse the previous key: the payload changed, so a dedupe hit would
    // return a quote for the old address.
    attemptKeyRef.current = createCheckoutAttemptKey();
    try {
      const service = getCloudRouterPhysicalPurchaseService();
      const nextQuote = await service.prepareCheckout({
        currencyCode: activeSku.currencyCode,
        items: [{ quantity: clampQuantity(quantity), skuId: activeSku.id }],
        shippingAddress: toPhysicalShippingAddress(address),
        idempotencyKey: attemptKeyRef.current,
      });
      setQuote({
        checkoutSessionId: nextQuote.checkoutSessionId,
        currencyCode: nextQuote.currencyCode,
        originalAmount: nextQuote.originalAmount,
        discountAmount: nextQuote.discountAmount,
        payableAmount: nextQuote.payableAmount,
      });
      setStep('quote');
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  async function placeOrder(): Promise<void> {
    if (!quote || busy) {
      return;
    }
    setBusy(true);
    setFailed(false);
    try {
      const service = getCloudRouterPhysicalPurchaseService();
      const order = await service.placeOrder(quote.checkoutSessionId, attemptKeyRef.current);
      onClose();
      navigate(`/me/orders/${encodeURIComponent(order.orderId)}/cashier`);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button
        type="button"
        aria-label={t('hardwareMarket.purchase.close', 'Close checkout')}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hardware-market-purchase-title"
        className="relative z-10 my-auto w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#101010]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
          <div>
            <h2
              id="hardware-market-purchase-title"
              className="text-lg font-semibold text-slate-900 dark:text-white"
            >
              {t('hardwareMarket.purchase.title', 'Checkout')}
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-500 dark:text-slate-400">
              {t('hardwareMarket.purchase.description', 'Confirm the shipping address, review the server quote, then place the order.')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('hardwareMarket.purchase.close', 'Close checkout')}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
            <HardwareGlyph
              seed={product.productNo}
              name={name}
              size="compact"
            />
            <div className="min-w-0 flex-1">
              <span className="sr-only">{t('hardwareMarket.purchase.item', 'Item')}: </span>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{name}</p>
              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                {skuLabel} · {t('hardwareMarket.detail.quantity', 'Quantity')} {clampQuantity(quantity)}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
              {unitPrice}
            </span>
          </div>

          {!hasSession ? (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {t('hardwareMarket.purchase.sessionRequired', 'Sign in to buy')}
              </p>
              <p className="text-sm text-amber-800 dark:text-amber-200/80">
                {t('hardwareMarket.purchase.sessionRequiredHint', 'A signed-in Cloud Router account is required to place an order.')}
              </p>
              <button
                type="button"
                onClick={handleSignIn}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                {t('hardwareMarket.purchase.sessionSignIn', 'Sign in')}
              </button>
            </div>
          ) : step === 'address' ? (
            <form onSubmit={prepareQuote} className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {t('hardwareMarket.purchase.addressTitle', 'Shipping address')}
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ADDRESS_FIELDS.map((field) => {
                  const invalid = missingFields.includes(field.name);
                  return (
                    <label
                      key={field.name}
                      className={`flex flex-col gap-1.5 text-sm ${field.name === 'detailAddress' ? 'sm:col-span-2' : ''}`}
                    >
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {t(field.labelKey, field.name)}
                        <span className="ml-1 text-xs font-normal text-slate-400 dark:text-slate-500">
                          {field.required
                            ? t('hardwareMarket.purchase.required', 'Required')
                            : t('hardwareMarket.purchase.optional', 'Optional')}
                        </span>
                      </span>
                      <input
                        autoComplete={field.autoComplete}
                        autoFocus={field.name === 'receiverName'}
                        className={`${INPUT_CLASSES} ${invalid ? INPUT_ERROR_CLASSES : ''}`}
                        inputMode={field.inputMode}
                        aria-invalid={invalid || undefined}
                        onChange={(event) => changeField(field.name, event.target.value)}
                        value={address[field.name]}
                      />
                    </label>
                  );
                })}
              </div>

              {missingFields.length > 0 ? (
                <p role="alert" className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {t(
                    'hardwareMarket.purchase.requiredMissing',
                    'Complete the required address fields to continue.',
                  )}
                </p>
              ) : null}

              <label className="flex max-w-[12rem] flex-col gap-1.5 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">
                  {t('hardwareMarket.purchase.quantity', 'Quantity')}
                </span>
                <input
                  type="number"
                  min={HARDWARE_MARKET_MIN_QUANTITY}
                  max={HARDWARE_MARKET_MAX_QUANTITY}
                  className={INPUT_CLASSES}
                  onChange={(event) => {
                    const next = Number.parseInt(event.target.value, 10);
                    if (Number.isFinite(next)) {
                      setQuantity(clampQuantity(next));
                    }
                  }}
                  value={quantity}
                />
              </label>

              {failed ? (
                <p role="alert" className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {t('hardwareMarket.purchase.error', 'The checkout step did not complete. Please try again.')}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  {t('hardwareMarket.purchase.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {busy
                    ? t('hardwareMarket.purchase.quoting', 'Calculating...')
                    : t('hardwareMarket.purchase.quote', 'Calculate total')}
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                {t('hardwareMarket.purchase.quoteReady', 'Quote ready')}
              </div>

              <dl className="divide-y divide-slate-200 rounded-2xl border border-slate-200 dark:divide-white/10 dark:border-white/10">
                {quote ? (
                  <>
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <dt className="text-slate-500 dark:text-slate-400">
                        {t('hardwareMarket.purchase.originalAmount', 'Original amount')}
                      </dt>
                      <dd className="font-medium tabular-nums text-slate-900 dark:text-white">
                        {formatMarketAmount(
                          quote.originalAmount,
                          quote.currencyCode,
                          sku.minorUnitExponent,
                          locale,
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <dt className="text-slate-500 dark:text-slate-400">
                        {t('hardwareMarket.purchase.discountAmount', 'Discount')}
                      </dt>
                      <dd className="font-medium tabular-nums text-slate-900 dark:text-white">
                        {formatMarketAmount(
                          quote.discountAmount,
                          quote.currencyCode,
                          sku.minorUnitExponent,
                          locale,
                        )}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between px-4 py-3 text-sm">
                      <dt className="font-semibold text-slate-900 dark:text-white">
                        {t('hardwareMarket.purchase.payableAmount', 'Payable')}
                      </dt>
                      <dd className="text-lg font-semibold tabular-nums text-lobster-600 dark:text-lobster-400">
                        {formatMarketAmount(
                          quote.payableAmount,
                          quote.currencyCode,
                          sku.minorUnitExponent,
                          locale,
                        )}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>

              <p className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {t('hardwareMarket.purchase.paymentHint', 'The order is handed to the platform cashier after it is placed.')}
              </p>

              {failed ? (
                <p role="alert" className="flex items-center gap-2 text-sm text-rose-600 dark:text-rose-400">
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  {t('hardwareMarket.purchase.error', 'The checkout step did not complete. Please try again.')}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end dark:border-white/10">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setStep('address');
                    setQuote(null);
                    setFailed(false);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:opacity-60 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5"
                >
                  {t('hardwareMarket.purchase.editAddress', 'Edit address')}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void placeOrder()}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-lobster-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-lobster-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lobster-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
                  {busy
                    ? t('hardwareMarket.purchase.submitting', 'Placing the order...')
                    : t('hardwareMarket.purchase.submit', 'Place order')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
