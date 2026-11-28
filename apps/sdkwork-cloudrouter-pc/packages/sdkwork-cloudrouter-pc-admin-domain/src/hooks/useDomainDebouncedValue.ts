/**
 * Debounces a search box value before it becomes part of a query key.
 *
 * The Domain Center tables page on the server, so every keystroke would otherwise
 * be its own round trip. The hook keeps the input responsive while the committed
 * value trails it; clearing the box commits immediately because "no filter" is
 * the one change an operator expects to feel instant.
 */

import { useEffect, useState } from 'react';

/** Trailing delay applied to a non-empty search term. */
export const DOMAIN_SEARCH_DEBOUNCE_MS = 300;

export function useDomainDebouncedValue(value: string, delayMs = DOMAIN_SEARCH_DEBOUNCE_MS): string {
  const [committed, setCommitted] = useState(value);

  useEffect(() => {
    if (value.trim().length === 0) {
      setCommitted(value);
      return;
    }
    const timer = setTimeout(() => setCommitted(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return committed;
}
