import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { coursePageLabel, hasNextCoursePage, type CourseTranslate } from './CoursePageControls';
import type { CourseAdminPageInfo } from '../courseService';

interface CoursePaginationProps {
  page: number;
  pageSize: number;
  itemCount: number;
  pageInfo: CourseAdminPageInfo | null;
  onPageChange: (page: number) => void;
}

export function CoursePagination({
  page,
  pageSize,
  itemCount,
  pageInfo,
  onPageChange,
}: CoursePaginationProps) {
  const { t } = useTranslation();
  const canGoNext = hasNextCoursePage(pageInfo, page, itemCount, pageSize);
  const canGoPrevious = page > 1;

  return (
    <div className="flex shrink-0 items-center justify-end gap-3 border-t border-slate-100 px-4 py-2.5 text-xs text-slate-500 dark:border-white/10">
      <span>{coursePageLabel(t as CourseTranslate, page, pageInfo)}</span>
      <button
        type="button"
        disabled={!canGoPrevious}
        onClick={() => onPageChange(page - 1)}
        aria-label={t('admin.course.pagination.previous', 'Previous page')}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={!canGoNext}
        onClick={() => onPageChange(page + 1)}
        aria-label={t('admin.course.pagination.next', 'Next page')}
        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
