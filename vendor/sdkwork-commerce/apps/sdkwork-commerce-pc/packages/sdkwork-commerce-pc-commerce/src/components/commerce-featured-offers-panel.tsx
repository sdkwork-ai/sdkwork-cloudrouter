import { createSdkworkCommercePanelStyle, createSdkworkCommerceToneStyle } from "../commerce-appearance";
import { useSdkworkCommerceIntl } from "../commerce-intl";
import type { SdkworkCommerceFeaturedOffer } from "../commerce-service";

export interface SdkworkCommerceFeaturedOffersPanelProps {
  featuredOffers: SdkworkCommerceFeaturedOffer[];
}

export function SdkworkCommerceFeaturedOffersPanel({
  featuredOffers,
}: SdkworkCommerceFeaturedOffersPanelProps) {
  const {
    copy,
    formatCurrency,
    formatIncludesPoints,
    formatSavings,
  } = useSdkworkCommerceIntl();

  return (
    <section className="rounded-[1.5rem] border border-[var(--sdk-color-border-default)] bg-[var(--sdk-color-surface-panel)] shadow-[var(--sdk-shadow-sm)]">
      <div className="border-b border-[var(--sdk-color-border-subtle)] px-6 py-5">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--sdk-color-text-muted)]">{copy.featuredOffers.eyebrow}</div>
        <h2 className="mt-2 text-xl font-semibold text-[var(--sdk-color-text-primary)]">{copy.featuredOffers.title}</h2>
      </div>

      <div className="grid gap-4 px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
        {featuredOffers.length === 0 ? (
          <div className="col-span-full rounded-[1.25rem] border border-dashed border-[var(--sdk-color-border-default)] px-5 py-10 text-center">
            <div className="text-base font-semibold text-[var(--sdk-color-text-primary)]">{copy.featuredOffers.emptyTitle}</div>
            <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">{copy.featuredOffers.emptyDescription}</div>
          </div>
        ) : featuredOffers.map((offer) => (
          <article
            className="rounded-[1.5rem] border bg-[var(--sdk-color-surface-panel-muted)] p-5"
            key={offer.id}
            style={createSdkworkCommercePanelStyle(offer.recommended ? "accent" : "neutral", {
              backgroundWeight: offer.recommended ? 10 : 6,
              borderWeight: offer.recommended ? 20 : 16,
              surfaceColor: "var(--sdk-color-surface-panel-muted)",
            })}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-lg font-semibold text-[var(--sdk-color-text-primary)]">{offer.title}</div>
              {offer.recommended ? (
                <span
                  className="rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.16em]"
                  style={createSdkworkCommerceToneStyle("accent", {
                    backgroundWeight: 10,
                    borderWeight: 18,
                  })}
                >
                  {copy.featuredOffers.featured}
                </span>
              ) : null}
            </div>
            <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
              {offer.description || copy.featuredOffers.descriptionFallback}
            </div>
            <div className="mt-5 text-3xl font-semibold text-[var(--sdk-color-text-primary)]">
              {offer.priceCny === null ? "--" : formatCurrency(offer.priceCny)}
            </div>
            <div className="mt-2 text-sm text-[var(--sdk-color-text-secondary)]">
              {formatSavings(offer.estimatedSavingsCny)}
            </div>
            {offer.includedPoints ? (
              <div className="mt-1 text-sm text-[var(--sdk-color-text-secondary)]">
                {formatIncludesPoints(offer.includedPoints)}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
