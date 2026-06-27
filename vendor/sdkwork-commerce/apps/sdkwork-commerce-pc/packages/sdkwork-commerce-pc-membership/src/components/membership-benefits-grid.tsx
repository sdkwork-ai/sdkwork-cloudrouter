import {
  CheckCircle2,
  Clock3,
} from "lucide-react";
import {
  createSdkworkMembershipPanelStyle,
  createSdkworkMembershipToneStyle,
} from "../membership-appearance";
import { useSdkworkMembershipIntl } from "../membership-intl";
import type { SdkworkMembershipBenefit } from "../membership-service";

export interface SdkworkMembershipBenefitsGridProps {
  benefits: SdkworkMembershipBenefit[];
}

export function SdkworkMembershipBenefitsGrid({
  benefits,
}: SdkworkMembershipBenefitsGridProps) {
  const { copy, formatUsage } = useSdkworkMembershipIntl();

  return (
    <section className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
      <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.benefits.eyebrow}</div>
        <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.benefits.title}</h2>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
        {benefits.length === 0 ? (
          <div className="col-span-full rounded-[1.25rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-10 text-center">
            <div className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{copy.benefits.emptyTitle}</div>
            <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">{copy.benefits.emptyDescription}</div>
          </div>
        ) : benefits.map((benefit) => (
          <article
            className="rounded-[1.5rem] border bg-[var(--sdk-color-surface-panel-muted)] p-5"
            key={benefit.id}
            style={createSdkworkMembershipPanelStyle(benefit.claimed ? "success" : "warning", {
              backgroundWeight: 8,
              borderWeight: 16,
              surfaceColor: "var(--sdk-color-surface-panel-muted)",
            })}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">{benefit.name}</div>
                <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
                  {benefit.description || copy.benefits.descriptionFallback}
                </div>
              </div>
              <div
                className="flex h-11 w-11 items-center justify-center rounded-[1rem] border"
                style={createSdkworkMembershipToneStyle(benefit.claimed ? "success" : "warning", {
                  backgroundWeight: 12,
                  borderWeight: 22,
                })}
              >
                {benefit.claimed ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Clock3 className="h-5 w-5" />
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-[var(--sdk-color-surface-panel)] px-3 py-1 font-medium text-[var(--sdk-color-text-secondary)]">
                {benefit.type || copy.benefits.typeFallback}
              </span>
              <span
                className="rounded-full border px-3 py-1 font-medium"
                style={createSdkworkMembershipToneStyle(benefit.claimed ? "success" : "warning", {
                  backgroundWeight: 10,
                  borderWeight: 18,
                })}
              >
                {benefit.claimed ? copy.benefits.claimed : copy.benefits.pending}
              </span>
              {benefit.usageLimit !== null ? (
                <span className="rounded-full bg-[var(--sdk-color-surface-panel)] px-3 py-1 font-medium text-[var(--sdk-color-text-secondary)]">
                  {formatUsage(benefit.usedCount, benefit.usageLimit)}
                </span>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
