import { Button } from "@sdkwork/ui-pc-react";
import {
  createSdkworkSubscriptionPanelStyle,
  createSdkworkSubscriptionToneStyle,
} from "../subscription-appearance";
import type { SdkworkSubscriptionCoupon } from "../subscription-service";
import { useSdkworkSubscriptionIntl } from "../subscription-intl";

export interface SdkworkSubscriptionCouponListProps {
  coupons: SdkworkSubscriptionCoupon[];
  onClearCoupon: () => void;
  onSelectCoupon: (couponId: string | null) => void;
  selectedCouponId: string | null;
}

export function SdkworkSubscriptionCouponList({
  coupons,
  onClearCoupon,
  onSelectCoupon,
  selectedCouponId,
}: SdkworkSubscriptionCouponListProps) {
  const {
    copy,
    formatCouponAvailability,
    formatCouponMinimumSpend,
    formatCouponOffer,
  } = useSdkworkSubscriptionIntl();

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
            {copy.couponList.eyebrow}
          </div>
          <div className="mt-2 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
            {copy.couponList.description}
          </div>
        </div>

        {selectedCouponId ? (
          <Button onClick={onClearCoupon} type="button" variant="ghost">
            {copy.couponList.removeCoupon}
          </Button>
        ) : null}
      </div>

      <div className="mt-3 space-y-3">
        {coupons.length === 0 ? (
          <div className="rounded-[1.4rem] border border-dashed border-[var(--sdk-color-border-default)] px-4 py-4 text-sm text-[var(--sdk-color-text-secondary)]">
            {copy.couponList.noCoupons}
          </div>
        ) : coupons.map((coupon) => {
          const isSelected = selectedCouponId === coupon.id;

          return (
            <button
              aria-pressed={isSelected}
              className={`w-full rounded-[1.5rem] border px-4 py-4 text-left shadow-[var(--sdk-shadow-soft)] transition-colors ${
                isSelected
                  ? ""
                  : "border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)] hover:bg-[var(--sdk-color-surface-hover)]"
              }`}
              key={coupon.id}
              onClick={() => onSelectCoupon(coupon.id)}
              style={isSelected
                ? createSdkworkSubscriptionPanelStyle("accent", {
                  backgroundWeight: 10,
                  surfaceColor: "var(--sdk-color-surface-panel-muted)",
                  surfaceWeight: 98,
                })
                : undefined}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold text-[var(--sdk-color-text-primary)]">{coupon.name}</div>
                    {coupon.code ? (
                      <span
                        className="rounded-full border px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] shadow-[var(--sdk-shadow-soft)]"
                        style={createSdkworkSubscriptionToneStyle("neutral", {
                          backgroundWeight: 10,
                          borderWeight: 18,
                        })}
                      >
                        {coupon.code}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 text-xs text-[var(--sdk-color-text-secondary)]">
                    {formatCouponMinimumSpend(coupon.minimumSpendCny)}
                  </div>
                  <div className="mt-3 text-xs font-medium uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                    {isSelected ? copy.couponList.selectedOffer : copy.couponList.tapToUse}
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className="text-sm font-semibold"
                    style={createSdkworkSubscriptionToneStyle("accent", {
                      backgroundWeight: 0,
                      borderWeight: 0,
                    })}
                  >
                    {formatCouponOffer(coupon)}
                  </div>
                  <div className="mt-1 text-xs text-[var(--sdk-color-text-secondary)]">
                    {formatCouponAvailability(coupon)}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
