import { ShieldCheck } from "lucide-react";
import { Button } from "@sdkwork/ui-pc-react/components/ui/button";
import {
  createSdkworkMembershipPanelStyle,
  createSdkworkMembershipToneStyle,
} from "../membership-appearance";
import { useSdkworkMembershipIntl } from "../membership-intl";
import type { SdkworkMembershipLevel } from "../membership-service";

export interface SdkworkMembershipLevelComparisonProps {
  levels: SdkworkMembershipLevel[];
}

export function SdkworkMembershipLevelComparison({
  levels,
}: SdkworkMembershipLevelComparisonProps) {
  const { copy, formatIncludedPoints } = useSdkworkMembershipIntl();

  return (
    <section className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
      <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.levels.eyebrow}</div>
        <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.levels.title}</h2>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-3">
        {levels.length === 0 ? (
          <div className="col-span-full rounded-[1.25rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-10 text-center">
            <div className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{copy.levels.emptyTitle}</div>
            <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">{copy.levels.emptyDescription}</div>
          </div>
        ) : levels.map((level) => (
          <article
            className="rounded-[1.5rem] border bg-[var(--sdk-color-surface-panel-muted)] p-5"
            key={level.id}
            style={createSdkworkMembershipPanelStyle(level.isCurrent ? "brand" : "neutral", {
              backgroundWeight: level.isCurrent ? 10 : 6,
              borderWeight: level.isCurrent ? 20 : 16,
              surfaceColor: "var(--sdk-color-surface-panel-muted)",
            })}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">{level.name}</div>
              {level.isCurrent ? (
                <div
                  className="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em]"
                  style={createSdkworkMembershipToneStyle("success", {
                    backgroundWeight: 10,
                    borderWeight: 18,
                  })}
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {copy.levels.currentLabel}
                </div>
              ) : null}
            </div>
            <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
              {level.description || copy.levels.descriptionFallback}
            </div>
            <div className="mt-5 rounded-[1rem] bg-[var(--sdk-color-surface-panel)] px-4 py-3 text-sm text-[var(--sdk-color-text-secondary)]">
              {copy.levels.requiredPoints}: {level.requiredPoints !== null ? formatIncludedPoints(level.requiredPoints) : copy.common.noValue}
            </div>
            <Button className="mt-5 w-full" disabled={!level.isCurrent} type="button" variant={level.isCurrent ? "secondary" : "ghost"}>
              {level.isCurrent ? copy.levels.currentLevelAction : copy.levels.compareLevel}
            </Button>
          </article>
        ))}
      </div>
    </section>
  );
}
