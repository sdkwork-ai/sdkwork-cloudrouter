import { useState } from 'react';
import {
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Info,
  LifeBuoy,
  LogIn,
  LogOut,
  MessageCircle,
  ReceiptText,
  Settings,
  ShieldCheck,
  Ticket,
} from 'lucide-react';

export type ConsoleProfileDestination =
  | 'signIn'
  | 'signOut'
  | 'recharge'
  | 'membership'
  | 'coupons'
  | 'orders'
  | 'help'
  | 'settings'
  | 'privacy'
  | 'about';

export interface ConsoleProfileLabels {
  readonly guestTitle: string;
  readonly guestHint: string;
  readonly accountFallback: string;
  readonly verified: string;
  readonly balance: string;
  readonly recharge: string;
  readonly autoRecharge: string;
  readonly coupons: string;
  readonly invoices: string;
  readonly operationRecords: string;
  readonly helpCenter: string;
  readonly settings: string;
  readonly other: string;
  readonly privacy: string;
  readonly about: string;
  readonly signIn: string;
  readonly signOut: string;
  readonly close: string;
  readonly footer: string;
}

export interface ConsoleProfileScreenProps {
  readonly labels: ConsoleProfileLabels;
  readonly brandName: string;
  readonly accountId: string | null;
  readonly authenticated: boolean;
  /** Wallet figures stay placeholder until the wallet/account API is wired. */
  readonly balanceText: string;
  readonly couponCountText: string;
  readonly invoiceAmountText: string;
  readonly onNavigate: (destination: ConsoleProfileDestination) => void;
}

/**
 * Mobile account/profile tab ("我的"), mounted as the rightmost shell tab.
 *
 * The layout mirrors the mobile cloud-console account page: identity header,
 * a balance card with recharge and auto-recharge entries, coupon/invoice
 * figures, operation/help/settings rows, and a bottom sheet for session actions.
 * Wallet numbers remain explicit placeholders until the wallet API is wired;
 * the page never invents a balance. Appearance lives in the shared settings
 * page reached from the settings row, not in this surface.
 */
export function ConsoleProfileScreen({
  labels,
  brandName,
  accountId,
  authenticated,
  balanceText,
  couponCountText,
  invoiceAmountText,
  onNavigate,
}: ConsoleProfileScreenProps) {
  const [otherOpen, setOtherOpen] = useState(false);
  const accountLabel = authenticated
    ? accountId || labels.accountFallback
    : labels.guestTitle;
  const avatarInitial = (accountId || brandName).trim().slice(0, 1).toUpperCase() || 'C';

  const requireSession = (destination: ConsoleProfileDestination) => {
    onNavigate(authenticated ? destination : 'signIn');
  };

  return (
    <div className="flex flex-col">
      {/* Identity header */}
      <section className="bg-surface px-[0.9rem] pb-4 pt-4">
        <button
          type="button"
          onClick={() => onNavigate(authenticated ? 'membership' : 'signIn')}
          className="flex w-full items-center gap-3 text-left"
        >
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-violet-500 text-xl font-semibold text-white">
            {avatarInitial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[17px] font-semibold text-ink">{accountLabel}</span>
            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-subtle">
              {authenticated ? (
                <>
                  <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    {labels.verified}
                  </span>
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                </>
              ) : (
                <span className="text-brand">{labels.guestHint}</span>
              )}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-ink-subtle" aria-hidden />
        </button>
      </section>

      {/* Balance card */}
      <section className="bg-surface px-[0.9rem] pb-4">
        <div className="rounded-2xl border border-line bg-canvas p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[12px] text-ink-subtle">{labels.balance}</p>
              <p className="mt-1 text-[28px] font-bold leading-none tracking-tight text-ink">
                {balanceText}
              </p>
            </div>
            <button
              type="button"
              onClick={() => requireSession('recharge')}
              className="shrink-0 rounded-lg border border-brand px-3 py-1.5 text-[12px] font-medium text-brand transition-colors active:bg-brand-soft"
            >
              {labels.recharge}
            </button>
          </div>
          <div className="my-4 h-px bg-line" />
          <button
            type="button"
            onClick={() => requireSession('recharge')}
            className="flex w-full items-center gap-1.5 text-[12px] font-medium text-brand"
          >
            <CircleDollarSign className="h-4 w-4" aria-hidden />
            <span className="flex-1 text-left">{labels.autoRecharge}</span>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </button>
          <div className="mt-4 grid grid-cols-2 divide-x divide-line border-t border-line pt-3">
            <button
              type="button"
              onClick={() => requireSession('coupons')}
              className="flex flex-col items-start pr-3 text-left"
            >
              <span className="flex items-center gap-1 text-[11px] text-ink-subtle">
                <Ticket className="h-3.5 w-3.5" aria-hidden />
                {labels.coupons}
              </span>
              <span className="mt-1 text-[18px] font-semibold text-ink">{couponCountText}</span>
            </button>
            <button
              type="button"
              onClick={() => requireSession('orders')}
              className="flex flex-col items-start pl-3 text-left"
            >
              <span className="flex items-center gap-1 text-[11px] text-ink-subtle">
                <ReceiptText className="h-3.5 w-3.5" aria-hidden />
                {labels.invoices}
              </span>
              <span className="mt-1 text-[18px] font-semibold text-ink">{invoiceAmountText}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Account rows */}
      <section className="border-t border-line bg-surface">
        <button
          type="button"
          onClick={() => requireSession('orders')}
          className="flex w-full items-center gap-3 border-b border-line px-[0.9rem] py-3.5 text-left text-[13px] text-ink"
        >
          <Clock3 className="h-4 w-4 text-ink-muted" aria-hidden />
          <span className="flex-1">{labels.operationRecords}</span>
          <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('help')}
          className="flex w-full items-center gap-3 border-b border-line px-[0.9rem] py-3.5 text-left text-[13px] text-ink"
        >
          <LifeBuoy className="h-4 w-4 text-ink-muted" aria-hidden />
          <span className="flex-1">{labels.helpCenter}</span>
          <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('settings')}
          className="flex w-full items-center gap-3 px-[0.9rem] py-3.5 text-left text-[13px] text-ink"
        >
          <Settings className="h-4 w-4 text-ink-muted" aria-hidden />
          <span className="flex-1">{labels.settings}</span>
          <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
        </button>
      </section>

      <section className="mt-2 border-t border-line bg-surface">
        <button
          type="button"
          onClick={() => setOtherOpen(true)}
          className="flex w-full items-center gap-3 border-b border-line px-[0.9rem] py-3.5 text-left text-[13px] text-ink"
        >
          <Info className="h-4 w-4 text-ink-muted" aria-hidden />
          <span className="flex-1">{labels.other}</span>
          <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('privacy')}
          className="flex w-full items-center gap-3 px-[0.9rem] py-3.5 text-left text-[13px] text-ink"
        >
          <ShieldCheck className="h-4 w-4 text-ink-muted" aria-hidden />
          <span className="flex-1">{labels.privacy}</span>
          <ChevronRight className="h-4 w-4 text-ink-subtle" aria-hidden />
        </button>
      </section>

      <footer className="bg-canvas px-[0.9rem] py-6 text-center">
        <p className="text-[10px] leading-4 text-ink-subtle">
          {brandName} · {labels.footer}
        </p>
      </footer>

      {otherOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
          role="dialog"
          aria-modal="true"
          aria-label={labels.other}
          onClick={() => setOtherOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-t-2xl bg-surface px-[0.9rem] pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line" />
            <h3 className="text-[15px] font-semibold text-ink">{labels.other}</h3>
            <div className="mt-2 divide-y divide-line">
              <button
                type="button"
                onClick={() => {
                  setOtherOpen(false);
                  onNavigate(authenticated ? 'signOut' : 'signIn');
                }}
                className="flex w-full items-center gap-3 py-3 text-left text-[13px] text-ink"
              >
                {authenticated ? (
                  <LogOut className="h-4 w-4 text-ink-muted" aria-hidden />
                ) : (
                  <LogIn className="h-4 w-4 text-ink-muted" aria-hidden />
                )}
                <span className="flex-1">{authenticated ? labels.signOut : labels.signIn}</span>
              </button>
              <div className="flex items-center gap-3 py-3 text-[13px] text-ink">
                <Info className="h-4 w-4 text-ink-muted" aria-hidden />
                <span className="flex-1">{labels.about}</span>
                <span className="text-[10px] text-ink-subtle">{brandName}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOtherOpen(false)}
              className="mt-3 w-full rounded-xl border border-line bg-canvas py-2.5 text-[12px] font-medium text-ink-muted"
            >
              {labels.close}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
