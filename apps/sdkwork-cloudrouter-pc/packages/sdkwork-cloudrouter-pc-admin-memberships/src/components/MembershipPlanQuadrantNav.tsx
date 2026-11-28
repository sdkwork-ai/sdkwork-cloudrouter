import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  MEMBERSHIP_PLAN_QUADRANTS,
  type MembershipsAdminAudienceFilter,
  type MembershipsAdminPurchaseModelFilter,
  type MembershipsQuadrantKey,
} from '../planTaxonomy';

interface MembershipPlanQuadrantNavProps {
  audience: MembershipsAdminAudienceFilter;
  purchaseModel: MembershipsAdminPurchaseModelFilter;
  /**
   * Plan counts per quadrant for the current family/status slice.
   *
   * Omitted when a purchase-model filter is active: the server has already
   * narrowed the result set to one model, so the other quadrants have no
   * meaningful count to show and printing a partial number would mislead.
   */
  counts?: Record<MembershipsQuadrantKey, number>;
  onSelect: (
    audience: MembershipsAdminAudienceFilter,
    purchaseModel: MembershipsAdminPurchaseModelFilter,
  ) => void;
}

/**
 * The four sellable quadrants of the membership catalog.
 *
 * Audience (who buys) crossed with purchase model (how it is billed) is the
 * primary information architecture of this page: an operator picks a quadrant
 * first and then manages the plans inside it. Each card carries its plan count
 * so the operator can see the shape of the catalog before filtering, and the
 * active card mirrors the segmented filters so the two controls never disagree.
 */
export function MembershipPlanQuadrantNav({
  audience,
  purchaseModel,
  counts,
  onSelect,
}: MembershipPlanQuadrantNavProps) {
  const { t } = useTranslation();

  return (
    <div
      className="grid shrink-0 gap-3 sm:grid-cols-2 xl:grid-cols-4"
      role="group"
      aria-label={t('admin.commerce.memberships.quadrant.label', 'Audience and purchase model')}
    >
      {MEMBERSHIP_PLAN_QUADRANTS.map((quadrant) => {
        const isActive = audience === quadrant.audience && purchaseModel === quadrant.purchaseModel;
        const count = counts?.[`${quadrant.audience}:${quadrant.purchaseModel}`];
        return (
          <button
            key={`${quadrant.audience}-${quadrant.purchaseModel}`}
            type="button"
            aria-pressed={isActive}
            onClick={() => onSelect(
              isActive ? 'all' : quadrant.audience,
              isActive ? 'all' : quadrant.purchaseModel,
            )}
            className={[
              'group flex flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors',
              isActive
                ? 'border-lobster-500 bg-lobster-50/70 ring-1 ring-lobster-500/30 dark:border-lobster-400/60 dark:bg-lobster-500/10'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10',
            ].join(' ')}
          >
            <span className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-slate-900 dark:text-white">
                {t(quadrant.labelKey, quadrant.fallback)}
              </span>
              {isActive ? (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-lobster-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  <Check className="h-2.5 w-2.5" aria-hidden="true" />
                  {t('admin.commerce.memberships.quadrant.active', 'Filtering')}
                </span>
              ) : null}
              {count === undefined ? null : (
                <span
                  data-quadrant-count={quadrant.purchaseModel}
                  className="ml-auto text-lg font-semibold tabular-nums text-slate-900 dark:text-white"
                >
                  {count}
                </span>
              )}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {t(quadrant.descriptionKey, quadrant.descriptionFallback)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
