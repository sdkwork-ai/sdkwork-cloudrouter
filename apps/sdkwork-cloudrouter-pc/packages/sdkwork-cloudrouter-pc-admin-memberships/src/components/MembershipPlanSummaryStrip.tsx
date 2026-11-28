import { useTranslation } from 'react-i18next';
import type { MembershipsPlanSummary } from '../planTaxonomy';

interface MembershipPlanSummaryStripProps {
  summary: MembershipsPlanSummary;
}

interface SummaryChip {
  key: string;
  labelKey: string;
  fallback: string;
  value: number;
  className: string;
}

/**
 * Compact coverage chips shown beside the filter toolbar.
 *
 * Every number is computed from the rows currently in view (after every active
 * filter), so it can never disagree with the table. Kept to three chips on
 * purpose: per-audience totals are already visible in the grouped table header,
 * and repeating them as large KPI cards made the page top-heavy.
 */
export function MembershipPlanSummaryStrip({ summary }: MembershipPlanSummaryStripProps) {
  const { t } = useTranslation();

  const chips: SummaryChip[] = [
    {
      key: 'subscription',
      labelKey: 'admin.commerce.memberships.summary.subscription',
      fallback: 'Subscription',
      value: summary.subscription,
      className: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
    },
    {
      key: 'oneTime',
      labelKey: 'admin.commerce.memberships.summary.oneTime',
      fallback: 'One-time',
      value: summary.oneTime,
      className: 'border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300',
    },
    {
      key: 'unlisted',
      labelKey: 'admin.commerce.memberships.summary.unlisted',
      fallback: 'No package',
      value: summary.unlisted,
      className: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${chip.className}`}
        >
          {t(chip.labelKey, chip.fallback)}
          <span className="tabular-nums font-semibold">{chip.value}</span>
        </span>
      ))}
    </div>
  );
}
