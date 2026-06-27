import { Button } from "@sdkwork/ui-pc-react";
import type { SdkworkMembershipSummary } from "@sdkwork/commerce-pc-membership";
import type { SdkworkSubscriptionAction } from "../subscription";
import {
  createSdkworkSubscriptionGlassStyle,
  createSdkworkSubscriptionHeroStyle,
  createSdkworkSubscriptionHeroTextStyle,
  createSdkworkSubscriptionToneStyle,
} from "../subscription-appearance";
import { useSdkworkSubscriptionIntl } from "../subscription-intl";

export interface SdkworkSubscriptionHeroProps {
  activeAction: SdkworkSubscriptionAction;
  couponCount: number;
  onActionChange: (action: SdkworkSubscriptionAction) => void;
  planCount: number;
  summary: SdkworkMembershipSummary;
}

const ACTIONS: SdkworkSubscriptionAction[] = ["purchase", "upgrade", "renew"];

export function SdkworkSubscriptionHero({
  activeAction,
  couponCount,
  onActionChange,
  planCount,
  summary,
}: SdkworkSubscriptionHeroProps) {
  const {
    copy,
    formatCouponCount,
    formatCurrencyCny,
    formatCurrentLevelMeta,
    formatPoints,
    resolveActionLabel,
  } = useSdkworkSubscriptionIntl();
  const balanceValue = summary.totalSpent !== null && summary.totalSpent !== undefined && summary.totalSpent > 0
    ? formatCurrencyCny(summary.totalSpent)
    : `${formatPoints(summary.points ?? summary.pointBalance ?? 0)} ${copy.common.points}`;
  const primaryHeroTextStyle = createSdkworkSubscriptionHeroTextStyle();
  const mutedHeroTextStyle = createSdkworkSubscriptionHeroTextStyle("muted");
  const subtleHeroTextStyle = createSdkworkSubscriptionHeroTextStyle("subtle");

  return (
    <section
      className="relative overflow-hidden rounded-[2rem] border border-[color-mix(in_srgb,var(--sdk-color-border-default)_72%,transparent)] px-6 py-6 text-white shadow-[var(--sdk-shadow-lg)]"
      style={createSdkworkSubscriptionHeroStyle()}
    >
      <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_minmax(22rem,0.82fr)] xl:items-end">
        <div>
          <div
            className="inline-flex rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.22em] shadow-[var(--sdk-shadow-soft)]"
            style={{
              ...createSdkworkSubscriptionGlassStyle("accent", {
                backgroundWeight: 12,
                borderWeight: 24,
                surfaceWeight: 82,
              }),
              ...subtleHeroTextStyle,
            }}
          >
            {copy.hero.eyebrow}
          </div>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-[2.8rem]" style={primaryHeroTextStyle}>
            {copy.hero.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7" style={mutedHeroTextStyle}>
            {copy.hero.description}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            {ACTIONS.map((action) => (
              <Button
                className={`rounded-2xl px-5 py-5 text-sm font-semibold ${
                  activeAction === action
                    ? "shadow-[var(--sdk-shadow-md)]"
                    : "border-[color-mix(in_srgb,var(--sdk-color-border-default)_72%,transparent)] bg-[color-mix(in_srgb,var(--sdk-color-surface-panel)_14%,transparent)] text-white hover:bg-[color-mix(in_srgb,var(--sdk-color-surface-panel)_22%,transparent)]"
                }`}
                key={action}
                onClick={() => onActionChange(action)}
                type="button"
                variant={activeAction === action ? "primary" : "outline"}
              >
                {resolveActionLabel(action)}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          <div
            className="rounded-[1.7rem] border px-5 py-5 shadow-[var(--sdk-shadow-sm)] backdrop-blur-xl"
            style={createSdkworkSubscriptionGlassStyle("brand", {
              backgroundWeight: 12,
              borderWeight: 26,
            })}
          >
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em]" style={subtleHeroTextStyle}>
              {copy.hero.currentLevelLabel}
            </div>
            <div className="mt-3 text-2xl font-semibold" style={primaryHeroTextStyle}>
              {summary.currentLevelName || copy.hero.readyForPremiumActivation}
            </div>
            <div className="mt-1 text-sm" style={mutedHeroTextStyle}>
              {formatCurrentLevelMeta(summary)}
            </div>
          </div>

          <div
            className="rounded-[1.7rem] border px-5 py-5 shadow-[var(--sdk-shadow-sm)] backdrop-blur-xl"
            style={createSdkworkSubscriptionGlassStyle("accent", {
              backgroundWeight: 12,
              borderWeight: 26,
            })}
          >
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em]" style={subtleHeroTextStyle}>
              {copy.hero.availablePlansLabel}
            </div>
            <div className="mt-3 text-2xl font-semibold" style={primaryHeroTextStyle}>{planCount}</div>
            <div className="mt-1 text-sm" style={mutedHeroTextStyle}>
              {formatCouponCount(couponCount)}
            </div>
          </div>

          <div
            className="rounded-[1.7rem] border px-5 py-5 shadow-[var(--sdk-shadow-sm)] backdrop-blur-xl"
            style={createSdkworkSubscriptionGlassStyle("success", {
              backgroundWeight: 12,
              borderWeight: 26,
            })}
          >
            <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em]" style={subtleHeroTextStyle}>
              {copy.hero.membershipBalanceLabel}
            </div>
            <div className="mt-3 text-2xl font-semibold" style={primaryHeroTextStyle}>
              {balanceValue}
            </div>
            <div className="mt-1 text-sm" style={mutedHeroTextStyle}>
              {summary.isMember ? copy.hero.premiumMembershipActive : copy.hero.freeMembershipActive}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
