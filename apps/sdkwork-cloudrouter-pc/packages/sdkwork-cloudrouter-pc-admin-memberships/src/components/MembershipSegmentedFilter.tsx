import { useTranslation } from 'react-i18next';

export interface MembershipSegmentedOption<TValue extends string> {
  value: TValue;
  labelKey: string;
  fallback: string;
}

interface MembershipSegmentedFilterProps<TValue extends string> {
  label: string;
  value: TValue;
  options: ReadonlyArray<MembershipSegmentedOption<TValue>>;
  onChange: (value: TValue) => void;
}

/**
 * Accessible segmented filter used by the catalog classification controls.
 *
 * Rendered as a radio group so screen readers announce the selected dimension
 * instead of a set of unrelated buttons.
 */
export function MembershipSegmentedFilter<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: MembershipSegmentedFilterProps<TValue>) {
  const { t } = useTranslation();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1 dark:bg-white/5"
    >
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange(option.value)}
            className={[
              'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'bg-white text-slate-900 shadow-sm dark:bg-white/10 dark:text-white'
                : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200',
            ].join(' ')}
          >
            {t(option.labelKey, option.fallback)}
          </button>
        );
      })}
    </div>
  );
}
