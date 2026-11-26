// One-cent test payment launch surface contract.
//
// The payment backend reports a normalized `launchKind` for every test payment
// (`qr_code`, `redirect`, `form_redirect`, `card`, `jsapi`, `app`,
// `local_sandbox`, `unsupported`) projected from the channel's provider
// response. The dialog renders exactly one surface per kind — the one the
// operator can actually drive — instead of guessing from whichever optional
// field happens to be present. Keeping the mapping here (not inline in the
// component) is what lets the regression suite pin every service provider and
// product to a real, testable surface.

/** Launch surfaces the backend can report. */
export type TestPaymentLaunchKind =
  | 'qr_code'
  | 'redirect'
  | 'form_redirect'
  | 'card'
  | 'jsapi'
  | 'app'
  | 'local_sandbox'
  | 'unsupported';

const LAUNCH_KINDS: readonly TestPaymentLaunchKind[] = [
  'qr_code',
  'redirect',
  'form_redirect',
  'card',
  'jsapi',
  'app',
  'local_sandbox',
  'unsupported',
];

export function parseTestPaymentLaunchKind(value: unknown): TestPaymentLaunchKind {
  const normalized = String(value ?? '').trim();
  return (LAUNCH_KINDS as readonly string[]).includes(normalized)
    ? (normalized as TestPaymentLaunchKind)
    : 'unsupported';
}

/** Optional payload fields a test payment may carry. */
export interface TestPaymentLaunchSurface {
  launchKind?: string | null;
  qrCodeUrl?: string | null;
  payUrl?: string | null;
  payForm?: string | null;
  clientSecret?: string | null;
  launchPayload?: string | null;
}

const hasText = (value: string | null | undefined): boolean => Boolean(value && value.trim());

/**
 * Resolves the surface to render. The backend's `launchKind` wins; payload
 * presence is only a fallback for responses produced before the field existed,
 * so an old backend never renders an empty dialog for a payable trade.
 */
export function resolveTestPaymentSurface(payment: TestPaymentLaunchSurface): TestPaymentLaunchKind {
  if (hasText(payment.launchKind) && payment.launchKind !== 'unsupported') {
    return parseTestPaymentLaunchKind(payment.launchKind);
  }
  if (hasText(payment.qrCodeUrl)) return 'qr_code';
  if (hasText(payment.payForm)) return 'form_redirect';
  if (hasText(payment.payUrl)) return 'redirect';
  if (hasText(payment.clientSecret)) return 'card';
  if (hasText(payment.launchPayload)) return 'app';
  return 'unsupported';
}

/** Surfaces that display a scan-to-pay QR code. */
export function isQrSurface(kind: TestPaymentLaunchKind): boolean {
  return kind === 'qr_code';
}

/**
 * Surfaces whose payment is completed outside the dialog (provider cashier or
 * client app), so the operator confirms the result with the channel status
 * check rather than reading a client-side success.
 */
export function needsProviderStatusCheck(kind: TestPaymentLaunchKind): boolean {
  return kind === 'qr_code'
    || kind === 'redirect'
    || kind === 'form_redirect'
    || kind === 'card'
    || kind === 'jsapi'
    || kind === 'app';
}
