import { useTranslation } from 'react-i18next';
import type { MembershipsAdminCategory } from '../membershipsService';

/** Category filter value; `all` lists every catalog family. */
export type MembershipCategoryFilterValue = MembershipsAdminCategory | 'all';

interface MembershipCategoryFilterProps {
  value: MembershipCategoryFilterValue;
  onChange: (value: MembershipCategoryFilterValue) => void;
}

const options: { value: MembershipCategoryFilterValue; labelKey: string; fallback: string }[] = [
  { value: 'all', labelKey: 'admin.commerce.memberships.category.all', fallback: 'All' },
  { value: 'token', labelKey: 'admin.commerce.memberships.category.token', fallback: 'Token Plan' },
  { value: 'community', labelKey: 'admin.commerce.memberships.category.community', fallback: 'Community' },
];

export function MembershipCategoryFilter({ value, onChange }: MembershipCategoryFilterProps) {
  const { t } = useTranslation();
  return (
    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5" role="group" aria-label={t('admin.commerce.memberships.category.filterLabel', 'Category filter')}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
            value === option.value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white'
              : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {t(option.labelKey, option.fallback)}
        </button>
      ))}
    </div>
  );
}
