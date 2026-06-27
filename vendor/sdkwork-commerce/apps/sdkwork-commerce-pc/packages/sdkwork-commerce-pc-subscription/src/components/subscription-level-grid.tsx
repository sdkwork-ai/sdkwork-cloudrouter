import type { SdkworkMembershipLevel } from "@sdkwork/commerce-pc-membership";
import {
  createSdkworkSubscriptionPanelStyle,
  createSdkworkSubscriptionToneStyle,
} from "../subscription-appearance";
import { useSdkworkSubscriptionIntl } from "../subscription-intl";

export interface SdkworkSubscriptionLevelGridProps {
  levels: SdkworkMembershipLevel[];
}

export function SdkworkSubscriptionLevelGrid({
  levels,
}: SdkworkSubscriptionLevelGridProps) {
  const {
    copy,
    formatPoints,
  } = useSdkworkSubscriptionIntl();

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-md)]">
      <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-6">
        <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-[var(--sdk-color-text-muted)]">
          {copy.levelGrid.eyebrow}
        </div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--sdk-color-text-primary)]">
          {copy.levelGrid.title}
        </h2>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-3">
        {levels.length === 0 ? (
          <div className="col-span-full rounded-[1.5rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-8 text-sm text-[var(--sdk-color-text-secondary)]">
            {copy.levelGrid.empty}
          </div>
        ) : levels.map((level) => (
          <article
            className={`rounded-[1.6rem] border px-5 py-5 shadow-[var(--sdk-shadow-soft)] ${
              level.isCurrent
                ? ""
                : "border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel-muted)]"
            }`}
            key={level.id}
            style={level.isCurrent
              ? createSdkworkSubscriptionPanelStyle("accent", {
                backgroundWeight: 10,
                surfaceColor: "var(--sdk-color-surface-panel)",
                surfaceWeight: 96,
              })
              : undefined}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">
                  LV {level.levelValue}
                </div>
                <div className="mt-2 text-lg font-semibold text-[var(--sdk-color-text-primary)]">{level.name}</div>
              </div>

              {level.isCurrent ? (
                <span
                  className="rounded-full border px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em]"
                  style={createSdkworkSubscriptionToneStyle("accent", {
                    backgroundWeight: 12,
                    borderWeight: 22,
                  })}
                >
                  {copy.common.current}
                </span>
              ) : null}
            </div>

            <div className="mt-3 text-sm leading-7 text-[var(--sdk-color-text-secondary)]">
              {level.description || copy.levelGrid.levelFallback}
            </div>

            <div
              className="mt-5 inline-flex rounded-full border px-3 py-1 text-xs font-medium shadow-[var(--sdk-shadow-soft)]"
              style={createSdkworkSubscriptionToneStyle("neutral", {
                backgroundWeight: 10,
                borderWeight: 18,
              })}
            >
              {formatPoints(level.requiredPoints ?? 0)} {copy.common.points}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
