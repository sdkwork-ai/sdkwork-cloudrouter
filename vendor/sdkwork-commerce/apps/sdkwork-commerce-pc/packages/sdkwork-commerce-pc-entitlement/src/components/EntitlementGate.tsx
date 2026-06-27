import type { ReactNode } from "react";
import {
  AlertTriangle,
  Crown,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@sdkwork/ui-pc-react";
import {
  type SdkworkEntitlementDecision,
} from "../entitlement";
import {
  createSdkworkEntitlementPanelStyle,
  createSdkworkEntitlementToneStyle,
} from "../entitlement-appearance";
import {
  resolveSdkworkEntitlementStatusTone,
  useSdkworkEntitlementIntl,
} from "../entitlement-intl";

export interface SdkworkEntitlementGateProps {
  children: ReactNode;
  decision: SdkworkEntitlementDecision;
  onNavigate?: (route: string) => void;
}

function resolveIcon(status: SdkworkEntitlementDecision["status"]) {
  if (status === "ready") {
    return ShieldCheck;
  }

  if (status === "limited") {
    return AlertTriangle;
  }

  return Crown;
}

function interpolate(template: string, values: Record<string, string>): string {
  return Object.entries(values).reduce(
    (output, [key, value]) => output.replaceAll(`{${key}}`, value),
    template,
  );
}

function resolveMessage(
  decision: SdkworkEntitlementDecision,
  copy: ReturnType<typeof useSdkworkEntitlementIntl>["copy"],
): string {
  if (decision.status === "limited" && decision.remainingQuota !== null) {
    return interpolate(copy.gate.limitedMessage, {
      value: String(decision.remainingQuota),
    });
  }

  if (decision.status === "locked") {
    return copy.gate.lockedMessage;
  }

  if (decision.status === "recharge-required") {
    return copy.gate.rechargeRequiredMessage;
  }

  if (decision.status === "upgrade-required") {
    return copy.gate.upgradeRequiredMessage;
  }

  return decision.description || copy.selected.descriptionFallback;
}

export function SdkworkEntitlementGate({
  children,
  decision,
  onNavigate,
}: SdkworkEntitlementGateProps) {
  const { copy, formatStatus } = useSdkworkEntitlementIntl();

  if (decision.status === "ready") {
    return <>{children}</>;
  }

  const Icon = resolveIcon(decision.status);
  const message = resolveMessage(decision, copy);
  const tone = resolveSdkworkEntitlementStatusTone(decision.status);

  return (
    <section
      className="overflow-hidden rounded-[2rem] border p-6 shadow-[var(--sdk-shadow-lg)]"
      style={createSdkworkEntitlementPanelStyle(tone, {
        backgroundWeight: 9,
        borderWeight: 24,
      })}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]"
            style={createSdkworkEntitlementToneStyle(tone, {
              backgroundWeight: 12,
              borderWeight: 22,
            })}
          >
            <Sparkles className="h-3.5 w-3.5" />
            {copy.gate.badge}
          </div>

          <div className="mt-5 flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] border"
              style={createSdkworkEntitlementToneStyle(tone)}
            >
              <Icon className="h-6 w-6" />
            </div>

            <div>
              <div className="text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[var(--sdk-color-text-muted)]">
                {formatStatus(decision.status)}
              </div>
              <h2 className="mt-1 text-3xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
                {decision.title}
              </h2>
            </div>
          </div>

          <p className="mt-5 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
            {decision.description || copy.selected.descriptionFallback}
          </p>
          <p className="mt-3 text-sm font-medium text-[var(--sdk-color-text-primary)]">{message}</p>
        </div>

        <div
          className="min-w-[18rem] rounded-[1.6rem] border p-5 shadow-[var(--sdk-shadow-md)]"
          style={createSdkworkEntitlementPanelStyle("neutral", {
            backgroundWeight: 5,
            borderWeight: 14,
            surfaceColor: "var(--sdk-color-surface-panel-muted)",
          })}
        >
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-[var(--sdk-color-text-muted)]">
            {copy.gate.postureTitle}
          </div>
          <div className="mt-4 space-y-3">
            <div
              className="rounded-[1.1rem] border px-4 py-3"
              style={createSdkworkEntitlementPanelStyle("neutral", {
                backgroundWeight: 5,
                borderWeight: 14,
                surfaceColor: "var(--sdk-color-surface-panel-muted)",
              })}
            >
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                {copy.gate.statusLabel}
              </div>
              <div className="mt-2 text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                {formatStatus(decision.status)}
              </div>
            </div>

            {decision.remainingQuota !== null ? (
              <div
                className="rounded-[1.1rem] border px-4 py-3"
                style={createSdkworkEntitlementPanelStyle("neutral", {
                  backgroundWeight: 5,
                  borderWeight: 14,
                  surfaceColor: "var(--sdk-color-surface-panel-muted)",
                })}
              >
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--sdk-color-text-muted)]">
                  {copy.gate.remainingQuotaLabel}
                </div>
                <div className="mt-2 text-sm font-semibold text-[var(--sdk-color-text-primary)]">
                  {decision.remainingQuota}
                </div>
              </div>
            ) : null}

            {decision.recommendedAction ? (
              <Button
                className="w-full"
                onClick={() => onNavigate?.(decision.recommendedAction!.route)}
                type="button"
              >
                {decision.recommendedAction.label}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
