import {
  Coins,
  Crown,
  ReceiptText,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  createSdkworkCommerceGlassStyle,
  createSdkworkCommerceHeroStyle,
  createSdkworkCommerceHeroTextStyle,
  createSdkworkCommercePanelStyle,
  createSdkworkCommerceToneStyle,
} from "../commerce-appearance";
import { useSdkworkCommerceIntl } from "../commerce-intl";
import type { SdkworkCommerceSummary } from "../commerce-service";

export interface SdkworkCommerceHeroPanelProps {
  summary: SdkworkCommerceSummary;
}

export function SdkworkCommerceHeroPanel({
  summary,
}: SdkworkCommerceHeroPanelProps) {
  const {
    copy,
    formatAccountState,
    formatActionRequired,
    formatClaimableExpiring,
    formatCurrency,
    formatPendingIssuance,
    formatPoints,
    formatMembershipTerm,
  } = useSdkworkCommerceIntl();
  const primaryHeroTextStyle = createSdkworkCommerceHeroTextStyle();
  const mutedHeroTextStyle = createSdkworkCommerceHeroTextStyle("muted");
  const subtleHeroTextStyle = createSdkworkCommerceHeroTextStyle("subtle");

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(21rem,0.95fr)]">
      <div
        className="overflow-hidden rounded-[2rem] border border-[color-mix(in_srgb,var(--sdk-color-border-default)_72%,transparent)] px-6 py-7 text-white shadow-[var(--sdk-shadow-lg)]"
        style={createSdkworkCommerceHeroStyle()}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]"
              style={{
                ...createSdkworkCommerceGlassStyle("accent", {
                  backgroundWeight: 12,
                  borderWeight: 22,
                  surfaceWeight: 82,
                }),
                ...mutedHeroTextStyle,
              }}
            >
              <Sparkles className="h-3.5 w-3.5" />
              {copy.hero.eyebrow}
            </div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight" style={primaryHeroTextStyle}>{copy.hero.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7" style={mutedHeroTextStyle}>
              {copy.hero.description}
            </p>
          </div>

          <div className="grid min-w-[16rem] gap-3 sm:grid-cols-2">
            <div
              className="rounded-[1.25rem] border px-4 py-4"
              style={createSdkworkCommerceGlassStyle("brand", {
                backgroundWeight: 10,
                borderWeight: 18,
                surfaceWeight: 78,
              })}
            >
              <div className="text-[0.7rem] uppercase tracking-[0.18em]" style={subtleHeroTextStyle}>{copy.hero.currentLevel}</div>
              <div className="mt-2 text-2xl font-semibold">{summary.currentLevelName}</div>
            </div>
            <div
              className="rounded-[1.25rem] border px-4 py-4"
              style={createSdkworkCommerceGlassStyle("accent", {
                backgroundWeight: 10,
                borderWeight: 18,
                surfaceWeight: 78,
              })}
            >
              <div className="text-[0.7rem] uppercase tracking-[0.18em]" style={subtleHeroTextStyle}>{copy.hero.featuredOffers}</div>
              <div className="mt-2 text-2xl font-semibold">{summary.featuredOffers}</div>
            </div>
            <div
              className="rounded-[1.25rem] border px-4 py-4"
              style={createSdkworkCommerceGlassStyle("warning", {
                backgroundWeight: 10,
                borderWeight: 18,
                surfaceWeight: 78,
              })}
            >
              <div className="text-[0.7rem] uppercase tracking-[0.18em]" style={subtleHeroTextStyle}>{copy.hero.actionablePayments}</div>
              <div className="mt-2 text-2xl font-semibold">{summary.actionablePayments}</div>
            </div>
            <div
              className="rounded-[1.25rem] border px-4 py-4"
              style={createSdkworkCommerceGlassStyle("success", {
                backgroundWeight: 10,
                borderWeight: 18,
                surfaceWeight: 78,
              })}
            >
              <div className="text-[0.7rem] uppercase tracking-[0.18em]" style={subtleHeroTextStyle}>{copy.hero.paymentMethods}</div>
              <div className="mt-2 text-2xl font-semibold">{summary.availablePaymentMethods}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div
            className="rounded-[1.5rem] border p-5"
            style={createSdkworkCommerceGlassStyle("accent", {
              backgroundWeight: 12,
              borderWeight: 24,
              surfaceWeight: 82,
            })}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm" style={mutedHeroTextStyle}>{copy.hero.availablePoints}</div>
                <div className="mt-3 text-4xl font-semibold tracking-tight">
                  {formatPoints(summary.availablePoints)}
                </div>
              </div>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-[1rem] border"
                style={createSdkworkCommerceToneStyle("accent", {
                  backgroundWeight: 16,
                  borderWeight: 24,
                })}
              >
                <Coins className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div
            className="rounded-[1.5rem] border p-5"
            style={createSdkworkCommerceGlassStyle("success", {
              backgroundWeight: 12,
              borderWeight: 24,
              surfaceWeight: 82,
            })}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm" style={mutedHeroTextStyle}>{copy.hero.claimedBenefits}</div>
                <div className="mt-3 text-4xl font-semibold tracking-tight">
                  {summary.claimedBenefits}
                </div>
              </div>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-[1rem] border"
                style={createSdkworkCommerceToneStyle("success", {
                  backgroundWeight: 16,
                  borderWeight: 24,
                })}
              >
                <Crown className="h-5 w-5" />
              </div>
            </div>
          </div>

          <div
            className="rounded-[1.5rem] border p-5"
            style={createSdkworkCommerceGlassStyle("warning", {
              backgroundWeight: 12,
              borderWeight: 24,
              surfaceWeight: 82,
            })}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm" style={mutedHeroTextStyle}>{copy.hero.totalOrders}</div>
                <div className="mt-3 text-4xl font-semibold tracking-tight">
                  {summary.totalOrders}
                </div>
              </div>
              <div
                className="flex h-12 w-12 items-center justify-center rounded-[1rem] border"
                style={createSdkworkCommerceToneStyle("warning", {
                  backgroundWeight: 16,
                  borderWeight: 24,
                })}
              >
                <ReceiptText className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
        <div
          className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]"
          style={createSdkworkCommercePanelStyle("brand", {
            backgroundWeight: 8,
            borderWeight: 18,
          })}
        >
          <div className="flex items-center gap-3">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-[1rem] border"
              style={createSdkworkCommerceToneStyle("brand", {
                backgroundWeight: 12,
                borderWeight: 22,
              })}
            >
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">{copy.hero.membershipTerm}</div>
              <div className="mt-1 text-lg font-semibold text-[var(--sdk-color-text-primary)]">
                {formatMembershipTerm(summary.membershipRemainingDays)}
              </div>
            </div>
          </div>
        </div>

        <div
          className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]"
          style={createSdkworkCommercePanelStyle("neutral", {
            backgroundWeight: 6,
            borderWeight: 14,
          })}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">{copy.hero.accountState}</div>
          <div className="mt-3 text-lg font-semibold text-[var(--sdk-color-text-primary)]">
            {formatAccountState(summary.isAuthenticated)}
          </div>
        </div>

        <div
          className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]"
          style={createSdkworkCommercePanelStyle("warning", {
            backgroundWeight: 8,
            borderWeight: 18,
          })}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">{copy.hero.invoiceQueue}</div>
          <div className="mt-3 text-lg font-semibold text-[var(--sdk-color-text-primary)]">
            {formatActionRequired(summary.invoiceActionRequired)}
          </div>
          <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
            {formatPendingIssuance(summary.invoicePendingCount)}
          </div>
        </div>

        <div
          className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]"
          style={createSdkworkCommercePanelStyle("accent", {
            backgroundWeight: 8,
            borderWeight: 18,
          })}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">{copy.hero.membershipSpending}</div>
          <div className="mt-3 text-lg font-semibold text-[var(--sdk-color-text-primary)]">
            {formatCurrency(summary.totalSpentCny)}
          </div>
        </div>

        <div
          className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]"
          style={createSdkworkCommercePanelStyle("success", {
            backgroundWeight: 8,
            borderWeight: 18,
          })}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">{copy.hero.bestOfferSavings}</div>
          <div className="mt-3 text-lg font-semibold text-[var(--sdk-color-text-primary)]">
            {formatCurrency(summary.bestOfferSavingsCny)}
          </div>
        </div>

        <div
          className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]"
          style={createSdkworkCommercePanelStyle("accent", {
            backgroundWeight: 8,
            borderWeight: 18,
          })}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">{copy.hero.availableCoupons}</div>
          <div className="mt-3 text-lg font-semibold text-[var(--sdk-color-text-primary)]">
            {summary.availableCoupons}
          </div>
          <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
            {formatClaimableExpiring(summary.claimableCoupons, summary.expiringSoonCoupons)}
          </div>
        </div>
      </div>
    </section>
  );
}
