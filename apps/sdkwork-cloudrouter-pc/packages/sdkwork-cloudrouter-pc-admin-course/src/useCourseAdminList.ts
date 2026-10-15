import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resolveProblemMessage } from '@sdkwork/cloudroutes-pc-commons';
import type {
  CourseAdminListParams,
  CourseAdminPage,
  CourseAdminPageInfo,
} from './courseService';

export const COURSE_ADMIN_DEFAULT_PAGE_SIZE = 20;

export interface CourseAdminListController<TItem> {
  items: TItem[];
  pageInfo: CourseAdminPageInfo | null;
  page: number;
  pageSize: number;
  query: string;
  status: string;
  isLoading: boolean;
  error: string | null;
  setPage: (page: number) => void;
  setQuery: (query: string) => void;
  setStatus: (status: string) => void;
  reload: () => Promise<void>;
}

/**
 * Shared list controller for course admin list pages: owns the `q` / `status` /
 * `page` query state, the in-flight request guard, and error resolution.
 *
 * `loader` MUST be referentially stable — pass a module-level service function
 * or wrap a course-scoped loader in `useCallback`.
 */
export function useCourseAdminList<TItem>(
  loader: (params: CourseAdminListParams) => Promise<CourseAdminPage<TItem>>,
  errorMessage: string,
  pageSize: number = COURSE_ADMIN_DEFAULT_PAGE_SIZE,
): CourseAdminListController<TItem> {
  const { t } = useTranslation();
  const [items, setItems] = useState<TItem[]>([]);
  const [pageInfo, setPageInfo] = useState<CourseAdminPageInfo | null>(null);
  const [page, setPageState] = useState(1);
  const [query, setQueryState] = useState('');
  const [status, setStatusState] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const reload = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await loader({ q: query, status, page, pageSize });
      if (requestId !== requestIdRef.current) {
        return;
      }
      setItems(result.items);
      setPageInfo(result.pageInfo);
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setError(resolveProblemMessage(loadError, t, errorMessage));
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [errorMessage, loader, page, pageSize, query, status, t]);

  useEffect(() => {
    void reload();
    return () => {
      requestIdRef.current += 1;
    };
  }, [reload]);

  const setQuery = useCallback((next: string) => {
    setPageState(1);
    setQueryState(next);
  }, []);

  const setStatus = useCallback((next: string) => {
    setPageState(1);
    setStatusState(next);
  }, []);

  const setPage = useCallback((next: number) => {
    setPageState(next < 1 ? 1 : next);
  }, []);

  return {
    items,
    pageInfo,
    page,
    pageSize,
    query,
    status,
    isLoading,
    error,
    setPage,
    setQuery,
    setStatus,
    reload,
  };
}
