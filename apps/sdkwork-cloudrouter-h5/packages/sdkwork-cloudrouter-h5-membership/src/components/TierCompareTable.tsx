import { Check } from 'lucide-react';

import type {
  MembershipComparisonCell,
  MembershipComparisonCategory,
  MembershipTierColumn,
  MembershipTranslate,
} from '../catalog/membershipDefinition.js';

export interface TierCompareTableProps {
  readonly categories: readonly MembershipComparisonCategory[];
  readonly onSelect: (packageId: number) => void;
  readonly t: MembershipTranslate;
  readonly tierColumns: readonly MembershipTierColumn[];
}

function renderCell(value: MembershipComparisonCell) {
  if (value === true) {
    return <Check aria-hidden="true" className="mx-auto h-3.5 w-3.5 text-emerald-500" />;
  }
  if (value === false || value === '-' || value === '') {
    return <span className="text-ink-subtle">—</span>;
  }
  return <span className="text-ink-muted">{value}</span>;
}

/**
 * "哪个计划更适合你" comparison matrix.
 *
 * The PC surface renders a wide four-column table. A phone cannot fit four
 * columns plus the benefit labels, so the same rows are laid out as a sticky
 * benefit column with a horizontally scrollable tier area: the label stays
 * visible while the buyer swipes across levels, and each tier header carries the
 * price and the buy action so the comparison doubles as a second entry point.
 */
export function TierCompareTable({
  categories,
  onSelect,
  t,
  tierColumns,
}: TierCompareTableProps) {
  if (categories.length === 0 || tierColumns.length === 0) {
    return null;
  }

  return (
    <section className="mt-6" data-membership-tier-compare>
      <h2 className="px-3 text-[16px] font-semibold text-ink">
        {t('compare.title', '哪个计划更适合你')}
      </h2>
      <p className="mt-1 px-3 text-[12px] text-ink-subtle">
        {t('compare.subtitle', '横向滑动查看不同等级权益，点击等级即可开通')}
      </p>

      <div className="mt-3 overflow-x-auto px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <table className="w-full min-w-[30rem] border-separate border-spacing-0 text-left text-[12px]">
          <thead>
            <tr>
              <th
                className="sticky left-0 z-10 w-[9rem] min-w-[9rem] border-b border-line bg-surface px-2 py-2 text-[11px] font-medium text-ink-subtle"
                scope="col"
              >
                {t('compare.benefitColumn', '会员权益')}
              </th>
              {tierColumns.map((column) => (
                <th
                  className={`border-b border-line px-1.5 py-2 text-center align-bottom ${
                    column.isCurrentPlan ? 'bg-brand-soft' : 'bg-surface'
                  }`}
                  key={column.packageId}
                  scope="col"
                >
                  <span className="block text-[12px] font-semibold text-ink">{column.name}</span>
                  <span className="mt-1 block text-[15px] font-bold leading-none text-ink">
                    {column.priceLabel}
                  </span>
                  <span className="mt-0.5 block text-[10px] font-normal text-ink-subtle">
                    {column.periodLabel}
                  </span>
                  {column.originalPriceLabel ? (
                    <span className="mt-0.5 block text-[10px] font-normal text-ink-subtle line-through">
                      {column.originalPriceLabel}
                    </span>
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <FragmentRows
                category={category}
                key={category.categoryLabel}
                tierColumns={tierColumns}
              />
            ))}
            <tr>
              <td className="sticky left-0 z-10 border-t border-line bg-surface px-2 py-2" />
              {tierColumns.map((column) => (
                <td className="border-t border-line px-1.5 py-2" key={`cta-${column.packageId}`}>
                  <button
                    className={`min-h-9 w-full rounded-full text-[11px] font-semibold ${
                      column.isCurrentPlan
                        ? 'cursor-not-allowed bg-surface-elevated text-ink-subtle'
                        : 'bg-brand-fill text-on-brand active:bg-brand-fill-strong'
                    }`}
                    disabled={column.isCurrentPlan || column.packageId <= 0}
                    onClick={() => onSelect(column.packageId)}
                    type="button"
                  >
                    {column.isCurrentPlan
                      ? t('cta.currentPlan', '当前计划')
                      : t('cta.subscribe', '立即开通')}
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

interface FragmentRowsProps {
  readonly category: MembershipComparisonCategory;
  readonly tierColumns: readonly MembershipTierColumn[];
}

function FragmentRows({ category, tierColumns }: FragmentRowsProps) {
  return (
    <>
      <tr>
        <th
          className="sticky left-0 z-10 border-b border-line bg-canvas px-2 pb-1 pt-3 text-[11px] font-semibold text-ink-muted"
          colSpan={tierColumns.length + 1}
          scope="rowgroup"
        >
          {category.categoryLabel}
        </th>
      </tr>
      {category.rows.map((row) => (
        <tr key={row.benefitLabel}>
          <th
            className="sticky left-0 z-10 border-b border-line bg-surface px-2 py-2 text-[11px] font-normal text-ink-muted"
            scope="row"
          >
            {row.benefitLabel}
          </th>
          {tierColumns.map((column) => (
            <td
              className="border-b border-line px-1.5 py-2 text-center"
              key={`${row.benefitLabel}-${column.packageId}`}
            >
              {renderCell(row.values[column.planRank] ?? '-')}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
