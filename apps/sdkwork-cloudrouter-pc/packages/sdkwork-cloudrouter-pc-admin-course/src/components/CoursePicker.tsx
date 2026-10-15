import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import {
  fetchCourseAdminCourseOptions,
  type CourseAdminCourseItem,
} from '../courseService';

interface CoursePickerProps {
  value: string;
  onChange: (courseId: string) => void;
  label?: string;
  /** Optional seed list so a page that already loaded courses avoids a second request. */
  courses?: readonly CourseAdminCourseItem[];
}

/**
 * Parent-course selector used by every course-scoped section (offerings,
 * content, live sessions). Loads its own option list when no seed is supplied.
 */
export function CoursePicker({ value, onChange, label, courses }: CoursePickerProps) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<CourseAdminCourseItem[]>(() => [...(courses ?? [])]);
  const [isLoading, setIsLoading] = useState(!courses);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadOptions = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const items = await fetchCourseAdminCourseOptions();
      if (requestId === requestIdRef.current) {
        setOptions(items);
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(resolveProblemMessage(
          loadError,
          t,
          t('admin.course.picker.error', 'Courses could not be loaded'),
        ));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (courses) {
      setOptions([...courses]);
      setIsLoading(false);
      return () => {
        requestIdRef.current += 1;
      };
    }
    void loadOptions();
    return () => {
      requestIdRef.current += 1;
    };
  }, [courses, loadOptions]);

  return (
    <label className="flex items-center gap-2 text-xs text-slate-500">
      <span>{label ?? t('admin.course.picker.label', 'Course')}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isLoading}
        aria-label={label ?? t('admin.course.picker.label', 'Course')}
        className="min-w-[220px] rounded-md border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
      >
        <option value="">
          {isLoading
            ? t('admin.course.picker.loading', 'Loading courses...')
            : t('admin.course.picker.placeholder', 'Select a course')}
        </option>
        {options.map((course) => (
          <option key={course.id} value={course.id}>{course.title}</option>
        ))}
      </select>
      {error ? <span className="text-red-500">{error}</span> : null}
    </label>
  );
}
