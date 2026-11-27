/**
 * Scrolls a table viewport back to its first row when the page changes.
 *
 * Without this an operator who paged to row 40 of one page keeps that offset on
 * the next page and lands mid-table, which reads as "the next page is broken".
 */

import { useEffect, useRef } from 'react';

export function useDomainTableScrollReset(page: number) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const viewport = ref.current;
    if (!viewport) {
      return;
    }
    viewport.scrollTop = 0;
  }, [page]);

  return ref;
}
