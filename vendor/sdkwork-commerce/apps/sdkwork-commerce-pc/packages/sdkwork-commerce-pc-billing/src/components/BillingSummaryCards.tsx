import {
  BarChart3,
  Gauge,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { formatSdkworkCommerceCurrencyCny as formatSdkworkCurrencyCny } from "@sdkwork/commerce-service";
import {
  type SdkworkBillingDigest,
  type SdkworkBillingPosture,
} from "../billing";
import {
  createSdkworkBillingPanelStyle,
  createSdkworkBillingToneStyle,
  type SdkworkBillingVisualTone,
} from "../billing-appearance";
import { useSdkworkBillingIntl } from "../billing-intl";

export interface SdkworkBillingSummaryCardsProps {
  digest: SdkworkBillingDigest;
  posture: SdkworkBillingPosture;
}

const CARD_CONFIG = [
  {
    icon: Gauge,
    key: "todaySpendCny",
    labelKey: "todaySpend",
    tone: "brand",
  },
  {
    icon: BarChart3,
    key: "monthSpendCny",
    labelKey: "monthSpend",
    tone: "accent",
  },
  {
    icon: ShieldAlert,
    key: "projectedMonthSpendCny",
    labelKey: "projectedMonth",
    tone: "warning",
  },
  {
    icon: Wallet,
    key: "budgetRemainingCny",
    labelKey: "budgetRemaining",
    tone: "success",
  },
] as const;

function resolvePostureTone(posture: SdkworkBillingPosture): SdkworkBillingVisualTone {
  if (posture === "healthy") {
    return "success";
  }

  if (posture === "watch") {
    return "warning";
  }

  if (posture === "over-budget") {
    return "warning";
  }

  return "danger";
}

export function SdkworkBillingSummaryCards({
  digest,
  posture,
}: SdkworkBillingSummaryCardsProps) {
  const { copy, formatPosture } = useSdkworkBillingIntl();

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {CARD_CONFIG.map((card) => (
        <article
          className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] p-5 shadow-[var(--sdk-shadow-sm)]"
          key={card.key}
          style={createSdkworkBillingPanelStyle(card.tone, {
            backgroundWeight: 8,
            borderWeight: 18,
          })}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
                {copy.cards[card.labelKey]}
              </div>
              <div className="mt-3 text-3xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
                {formatSdkworkCurrencyCny(digest[card.key])}
              </div>
            </div>
            <div
              className="flex h-11 w-11 items-center justify-center rounded-[1rem] border"
              style={createSdkworkBillingToneStyle(card.tone, {
                backgroundWeight: 16,
                borderWeight: 26,
              })}
            >
              <card.icon className="h-5 w-5" />
            </div>
          </div>

          {card.key === "budgetRemainingCny" ? (
            <div
              className="mt-4 inline-flex rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.16em]"
              style={createSdkworkBillingToneStyle(resolvePostureTone(posture), {
                backgroundWeight: 14,
                borderWeight: 22,
              })}
            >
              {formatPosture(posture)}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
