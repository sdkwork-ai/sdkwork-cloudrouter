import { useEffect, useState } from 'react';

export type DataCenterQueryState<T> =
  | { phase: 'loading' }
  | { phase: 'ready'; data: T }
  | { phase: 'error'; message: string };

/**
 * Runs one data-center read on mount.
 *
 * `load` must be stable (wrap it in `useCallback`); a new identity re-runs the
 * read. The state distinguishes a transport/validation failure from an empty
 * result, because "the request failed" and "there is nothing configured yet"
 * must never render the same way.
 */
export function useDataCenterQuery<T>(load: () => Promise<T>): DataCenterQueryState<T> {
  const [state, setState] = useState<DataCenterQueryState<T>>({ phase: 'loading' });

  useEffect(() => {
    let active = true;
    setState({ phase: 'loading' });
    load().then(
      (data) => {
        if (active) {
          setState({ phase: 'ready', data });
        }
      },
      (error: unknown) => {
        if (!active) {
          return;
        }
        setState({
          phase: 'error',
          message: error instanceof Error ? error.message : 'Data center request failed.',
        });
      },
    );

    return () => {
      active = false;
    };
  }, [load]);

  return state;
}
