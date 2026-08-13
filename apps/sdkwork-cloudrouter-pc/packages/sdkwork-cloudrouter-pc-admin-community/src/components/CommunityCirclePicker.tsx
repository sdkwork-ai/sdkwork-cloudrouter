import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  fetchCommunityAdminCategories,
  type CommunityAdminCategoryItem,
} from '../communityService';

interface CommunityCirclePickerProps {
  value: string;
  onChange: (categoryId: string) => void;
}

/** Circle selector shared by circle-scoped admin pages (members/groups/tiers/entries). */
export function CommunityCirclePicker({ value, onChange }: CommunityCirclePickerProps) {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<CommunityAdminCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    fetchCommunityAdminCategories()
      .then((items) => {
        if (cancelled) {
          return;
        }
        setCategories(items);
        if (!value && items.length > 0) {
          onChange(items[0]!.id);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [onChange, value]);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        {t('admin.community.circlePicker.loading', 'Loading circles...')}
      </div>
    );
  }

  if (error) {
    return (
      <span className="text-sm text-red-500">{t('admin.community.circlePicker.error', 'Circles could not be loaded')}</span>
    );
  }

  if (categories.length === 0) {
    return (
      <span className="text-sm text-slate-400">{t('admin.community.circlePicker.empty', 'No circles available')}</span>
    );
  }

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {t('admin.community.circlePicker.label', 'Circle')}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full max-w-xs rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-white/20 dark:bg-white/5 dark:text-white"
      >
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.title}
          </option>
        ))}
      </select>
    </label>
  );
}
